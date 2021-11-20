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
import { registerEventsV0 } from './module-host-versions/v0.js';

const logger = createChildLogger('services/module-host');

interface ChildProcessInfo {
	monitor: Respawn.RespawnMonitor;

	authToken: string;

	socket?: SocketIO.Socket;
}

export class ModuleHost {
	private readonly core: ICore;
	// Note: in a multi-node environment, this queue will need to be replaced with a proper distributed work queue
	private readonly queue: PQueue;
	private readonly socketServer: SocketIO.Server<ModuleToHostEventsInit, HostToModuleEventsInit>;
	private readonly socketPort: number;

	private readonly children: Map<string, ChildProcessInfo>;

	constructor(core: ICore, socketPort: number) {
		this.core = core;
		this.queue = new PQueue({
			// TODO - is a PQueue appropriate?
			concurrency: 4,
		});
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
			logger.warn('Connections stream closed');
		});

		stream.on('change', (doc) => {
			switch (doc.operationType) {
				case 'insert':
				case 'replace': {
					const docId = doc.documentKey._id;
					this.queue.add(() => this.restartConnection(docId));
					break;
				}
				case 'update': {
					const docId = doc.documentKey._id;
					this.queue.add(() => this.restartConnection(docId));
					break;
				}
				case 'delete':
					this.queue.add(() => this.stopConnection(doc.documentKey._id));
					break;
				case 'drop':
				case 'dropDatabase':
				case 'rename':
				case 'invalidate':
					logger.warn('Connections stream closed');
					break;
				// TODO
				// default:
				// 	assertNever(doc.operationType);
			}
		});

		// Queue everything for validation
		this.core.models.deviceConnections.find().forEach((doc) => {
			const docId = doc._id;
			this.queue.add(() => this.restartConnection(docId));
		});
	}

	private async stopConnection(connectionId: string): Promise<void> {
		const child = this.children.get(connectionId);
		if (child) {
			if (child.socket) {
				child.socket.disconnect(true);
				delete child.socket;
			}

			// TODO - race safety
			child.monitor.stop(() => {
				// cleanup
				this.children.delete(connectionId);
			});
		}
	}

	private listenToModuleSocket(socket: SocketIO.Socket<ModuleToHostEventsInit, HostToModuleEventsInit>): void {
		socket.once('register', (apiVersion: HostApiVersion, connectionId: string, token: string, cb: () => void) => {
			if (!isSupportedApiVersion(apiVersion)) {
				logger.warn(`Got register for unsupported api version "${apiVersion}" connectionId: "${connectionId}"`);
				socket.disconnect(true);
				return;
			}

			if (apiVersion !== HostApiVersion.v0) {
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
			switch (apiVersion) {
				case HostApiVersion.v0:
					registerEventsV0(socket, this.core, connectionId);
					break;
				default:
					throw new Error('Supported, yet unsupported api version..');
			}

			// Register successful
			child.socket = socket;

			// TODO - more params?

			logger.info(`Registered module client "${connectionId}"`);

			// report success
			cb();

			// TODO - start pings
		});
	}

	private async restartConnection(connectionId: string): Promise<void> {
		const connection = await this.core.models.deviceConnections.findOne({ _id: connectionId });
		if (connection) {
			logger.info(`Starting connection: "${connection.label}"(${connectionId})`);

			const module = await this.core.models.modules.findOne({ _id: connection.moduleId });
			if (!module) {
				logger.error(`Cannot restart connection of unknown module: "${connectionId}"`);
				await this.stopConnection(connectionId);
				return;
			}

			// TODO - look at the runtime and api fields to figure out how to handle this

			let child = this.children.get(connection._id);
			if (child) {
				const child2 = child;
				await new Promise<void>((resolve) => child2.monitor.stop(resolve));

				// Cleanup
				delete child.socket;

				// TODO - regenerate the monitor
			} else {
				const token = shortid();
				const cmd = ['node', path.join(module.modulePath, module.manifest.entrypoint)];
				logger.debug(`Connection "${connection.label}" command: ${JSON.stringify(cmd)}`);

				const monitor = Respawn(cmd, {
					name: `Connection "${connection.label}"(${connection._id})`,
					env: {
						CONNECTION_ID: connection._id,
						SOCKETIO_URL: `ws://localhost:${this.socketPort}`,
						SOCKETIO_TOKEN: token,
					},
					maxRestarts: -1,
					kill: 5000,
					// cwd: '', // TODO
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

				child = {
					monitor: monitor,
					authToken: token,
				};
				this.children.set(connection._id, child);
			}

			// Start the child
			child.monitor.start();

			// TODO - timeout for first contact
		} else {
			logger.warn(`Attempting to start missing connection: "${connectionId}"`);
			await this.stopConnection(connectionId);
		}
	}
}

export async function startModuleHost(core: ICore): Promise<ModuleHost> {
	const socketPort = await getPort();

	const host = new ModuleHost(core, socketPort);
	await host.start();
	return host;
}
