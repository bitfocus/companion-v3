import PQueue from 'p-queue';
import { ICore } from '../core';
import Respawn from 'respawn';
import SocketIO from 'socket.io';
import getPort from 'get-port';
import shortid from 'shortid';
import path from 'path';

interface ChildProcessInfo {
	monitor: Respawn.RespawnMonitor;

	authToken: string;

	socket?: SocketIO.Socket;
}

export class ModuleHost {
	private readonly core: ICore;
	// Note: in a multi-node environment, this queue will need to be replaced with a proper distributed work queue
	private readonly queue: PQueue;
	private readonly socketServer: SocketIO.Server;
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
		this.socketServer = new SocketIO.Server(socketPort, {
			transports: ['websocket'],
		});
	}

	async start(): Promise<void> {
		const stream = this.core.models.deviceConnections.watch();

		this.socketServer.on('connection', (socket: SocketIO.Socket) => {
			console.log('A module connected');
			this.listenToModuleSocket(socket);
		});

		stream.on('end', () => {
			console.log('Connections stream closed');
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
					console.log('Connections stream closed');
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
			// TODO - race safety
			child.monitor.stop(() => {
				// cleanup
				this.children.delete(connectionId);
			});
		}
	}

	private listenToModuleSocket(_socket: SocketIO.Socket): void {
		// TODO - listen for close
		// socket.on('register', () => {
		// })
	}

	private async restartConnection(connectionId: string): Promise<void> {
		const connection = await this.core.models.deviceConnections.findOne({ _id: connectionId });
		if (connection) {
			console.log(`Starting connection: "${connection.label}"(${connectionId})`);

			const module = await this.core.models.modules.findOne({ _id: connection.moduleId });
			if (!module) {
				console.error(`Cannot restart connection of unknown module: "${connectionId}"`);
				await this.stopConnection(connectionId);
				return;
			}

			let child = this.children.get(connection._id);
			if (child) {
				const child2 = child;
				await new Promise<void>((resolve) => child2.monitor.stop(resolve));

				// Cleanup
				delete child.socket;
			} else {
				const token = shortid();
				const monitor = Respawn(['node', path.join(module.modulePath, module.manifest.entrypoint)], {
					name: `Connection "${connection.label}"(${connection._id})`,
					env: {
						CONNECTION_ID: connection._id,
						SOCKETIO_URL: `https://localhost:${this.socketPort}`,
						SOCKETIO_TOKEN: token,
					},
					maxRestarts: -1,
					kill: 5000,
					// cwd: '', // TODO
				});

				// TODO - better event listeners
				monitor.on('start', () => {
					console.log(`Connection "${connection.label}" started`);
				});
				monitor.on('stop', () => {
					console.log(`Connection "${connection.label}" stopped`);
				});
				monitor.on('crash', () => {
					console.log(`Connection "${connection.label}" crashed`);
				});
				monitor.on('stdout', (data) => {
					console.log(`Connection "${connection.label}" stdout`, data.toString());
				});
				monitor.on('stderr', (data) => {
					console.log(`Connection "${connection.label}" stderr`, data.toString());
				});

				child = {
					monitor: monitor,
					authToken: token,
				};
			}

			// Start the child
			child.monitor.start();

			// TODO - timeout for first contact
		} else {
			console.warn(`Attempting to start missing connection: "${connectionId}"`);
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
