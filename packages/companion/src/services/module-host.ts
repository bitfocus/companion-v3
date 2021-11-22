import PQueue from 'p-queue';
import { ICore } from '../core.js';
import Respawn from 'respawn';
import * as SocketIO from 'socket.io';
import getPort from 'get-port';
import shortid from 'shortid';
import path from 'path';
import {
	HostApiVersion,
	isSupportedApiVersion,
	ModuleToHostEventsInit,
	HostToModuleEventsInit,
} from '@companion/module-framework/dist/host-api/versions.js';
import { createChildLogger } from '../logger.js';
import { registerEventsV0 as setupSocketClientV0 } from './module-host-versions/v0.js';
import { RegisterResult } from './module-host-versions/util.js';
import { assertNever } from '@companion/module-framework';

const logger = createChildLogger('services/module-host');

interface ChildProcessInfo {
	readonly lifeCycleQueue: PQueue;

	monitor?: Respawn.RespawnMonitor;
	authToken?: string;

	socket?: SocketIO.Socket;
	doDestroy?: () => Promise<void>;
}

export class ModuleHost {
	private readonly core: ICore;
	private readonly socketServer: SocketIO.Server<ModuleToHostEventsInit, HostToModuleEventsInit>;
	private readonly socketPort: number;

	private readonly children: Map<string, ChildProcessInfo>;

	constructor(core: ICore, socketPort: number) {
		this.core = core;
		this.children = new Map();

		this.socketPort = socketPort;
		this.socketServer = new SocketIO.Server({
			transports: ['websocket'],
			allowEIO3: true,
			cors: {
				origin: `http://localhost:${this.socketPort}`,
				methods: ['GET', 'POST'],
			},
		});
		this.socketServer.listen(this.socketPort);
		logger.debug(`Module host listening on port: ${this.socketPort}`);
	}

	async start(): Promise<void> {
		const stream = this.core.models.deviceConnections.watch();

		this.socketServer.on('connection', (socket: SocketIO.Socket) => {
			logger.info('A module connected');
			this.listenToModuleSocket(socket);
		});

		stream.on('end', () => {
			logger.warn('Connections stream closed. Aborting');
			process.exit(9);
		});

		stream.on('change', (doc) => {
			switch (doc.operationType) {
				case 'insert':
				case 'replace': {
					const docId = doc.documentKey._id;
					this.queueRestartConnection(docId);
					break;
				}
				case 'update': {
					// TODO - avoid a restart depending on keys of changes
					const docId = doc.documentKey._id;
					this.queueRestartConnection(docId);
					break;
				}
				case 'delete':
					this.queueStopConnection(doc.documentKey._id);
					break;
				case 'drop':
				case 'dropDatabase':
				case 'rename':
				case 'invalidate':
					logger.error('Change stream lost database or collection. Aborting');
					process.exit(9);
					break;
				default:
					assertNever(doc);
			}
		});

		// Queue everything for validation
		this.core.models.deviceConnections.find().forEach((doc) => {
			const docId = doc._id;

			this.queueRestartConnection(docId);
		});
	}

	private async queueStopConnection(connectionId: string): Promise<void> {
		const child = this.children.get(connectionId);
		if (child) {
			await child.lifeCycleQueue.add(async () => this.doStopConnectionInner(connectionId, true));
		}
	}

	private async doStopConnectionInner(connectionId: string, allowDeleteIfEmpty: boolean): Promise<void> {
		const child = this.children.get(connectionId);
		if (child) {
			// Ensure a new child cant register
			delete child.authToken;

			if (child.doDestroy) {
				// Perform cleanup of the module and event listeners
				try {
					await child.doDestroy();
				} catch (e) {
					logger.error(`Destroy failed: ${e}`);
				}
			}

			if (child.socket) {
				// Stop the child connection
				child.socket.disconnect(true);
				delete child.socket;
			}

			if (child.monitor) {
				// Stop the child process
				const monitor = child.monitor;
				await new Promise<void>((resolve) => monitor.stop(resolve));
			}

			if (allowDeleteIfEmpty && child.lifeCycleQueue.size === 0) {
				// Delete the queue now that it is empty
				this.children.delete(connectionId);
			}
		}
	}

	private listenToModuleSocket(socket: SocketIO.Socket<ModuleToHostEventsInit, HostToModuleEventsInit>): void {
		socket.once('register', (apiVersion: HostApiVersion, connectionId: string, token: string, cb: () => void) => {
			if (!isSupportedApiVersion(apiVersion)) {
				logger.warn(`Got register for unsupported api version "${apiVersion}" connectionId: "${connectionId}"`);
				socket.disconnect(true);
				return;
			}

			if (apiVersion !== HostApiVersion.SocketIOv0) {
				// Future: Temporary until version selection is implemented
				logger.warn(`Got register for unsupported api version "${apiVersion}" connectionId: "${connectionId}"`);
				socket.disconnect(true);
				return;
			}

			const child = this.children.get(connectionId);
			if (!child) {
				logger.warn(`Got register for bad connectionId: "${connectionId}"`);
				socket.disconnect(true);
				return;
			}

			if (child.socket) {
				logger.warn(`Got register for already registered connectionId: "${connectionId}"`);
				socket.disconnect(true);
				return;
			}

			if (child.authToken !== token) {
				logger.warn(`Got register with bad auth token for connectionId: "${connectionId}"`);
				socket.disconnect(true);
				return;
			}

			socket.on('disconnect', () => {
				const child2 = this.children.get(connectionId);
				if (child2 && child2.socket === socket) {
					// If this socket is the one for a connection, then cleanup on close
					delete child2.socket;
				}
			});

			// Bind the event listeners
			let registerResult: RegisterResult;
			switch (apiVersion) {
				case HostApiVersion.SocketIOv0:
					registerResult = setupSocketClientV0(socket, this.core, connectionId);
					break;
				default:
					throw new Error('Supported, yet unsupported api version..');
			}

			// Register successful
			child.socket = socket;
			child.doDestroy = registerResult.doDestroy;
			logger.info(`Registered module client "${connectionId}"`);

			// report success
			cb();

			// TODO - start pings

			// Init module
			registerResult.doInit().catch((e) => {
				// TODO - log error?

				// Force restart the connetion, as it failed to initialise and will be broken
				this.queueRestartConnection(connectionId);
			});
		});
	}

	private async queueRestartConnection(connectionId: string): Promise<void> {
		let child = this.children.get(connectionId);
		if (!child) {
			// Create a new child entry
			child = { lifeCycleQueue: new PQueue({ concurrency: 1 }) };
			this.children.set(connectionId, child);
		}

		await child.lifeCycleQueue.add(async () => {
			const connection = await this.core.models.deviceConnections.findOne({ _id: connectionId });
			if (connection && connection.enabled) {
				logger.info(`Starting connection: "${connection.label}"(${connectionId})`);

				const module = await this.core.models.modules.findOne({ _id: connection.moduleId });
				if (!module) {
					logger.error(`Cannot restart connection of unknown module: "${connectionId}"`);
					await this.doStopConnectionInner(connectionId, true);
					return;
				}

				// TODO - look at the runtime and api fields to figure out how to handle this

				const child = this.children.get(connection._id);
				if (!child) {
					logger.error(`Lost tracking object for connection : "${connectionId}"`);
					return;
				}

				// stop any existing child process
				await this.doStopConnectionInner(connectionId, false);

				child.authToken = shortid();
				const cmd = [
					'node',
					// TODO - vary depending on module version
					path.join(module.modulePath, 'node_modules/@companion/module-framework/dist/entrypoint/v0.js'),
				];
				logger.debug(`Connection "${connection.label}" command: ${JSON.stringify(cmd)}`);

				const monitor = Respawn(cmd, {
					name: `Connection "${connection.label}"(${connection._id})`,
					env: {
						CONNECTION_ID: connection._id,
						SOCKETIO_URL: `ws://localhost:${this.socketPort}`,
						SOCKETIO_TOKEN: child.authToken,
						MODULE_FILE: path.join(module.modulePath, module.manifest.entrypoint),
						MODULE_MANIFEST: path.join(module.modulePath, 'companion/manifest.json'),
					},
					maxRestarts: -1,
					kill: 5000,
					cwd: module.modulePath,
				});

				// TODO - better event listeners
				monitor.on('start', () => {
					logger.info(`Connection "${connection.label}" started`);
				});
				monitor.on('stop', () => {
					logger.info(`Connection "${connection.label}" stopped`);
				});
				monitor.on('crash', () => {
					logger.warn(`Connection "${connection.label}" crashed`);
				});
				monitor.on('stdout', (data) => {
					logger.info(`Connection "${connection.label}" stdout: ${data.toString()}`);
				});
				monitor.on('stderr', (data) => {
					logger.info(`Connection "${connection.label}" stderr: ${data.toString()}`);
				});

				child.monitor = monitor;

				// Start the child
				child.monitor.start();

				// TODO - timeout for first contact
			} else {
				logger.warn(`Attempting to start missing connection: "${connectionId}"`);
				await this.doStopConnectionInner(connectionId, true);
			}
		});
	}
}

export async function startModuleHost(core: ICore): Promise<ModuleHost> {
	const socketPort = await getPort();

	const host = new ModuleHost(core, socketPort);
	await host.start();
	return host;
}
