import * as SocketIOClient from 'socket.io-client';
import {
	CompanionActions,
	CompanionFeedbacks,
	CompanionModuleSystem,
	CompanionPreset,
	CompanionVariable,
	InstanceBase,
	InstanceStatus,
	LogLevel,
} from './module-api';
import PTimeout from 'p-timeout';

let hasEntrypoint = false;

/** Run the module entrypoint */
export function runEntrypoint(factory: new (system: CompanionModuleSystem, id: string) => InstanceBase<any>): void {
	// Ensure only called once per module
	if (hasEntrypoint) throw new Error(`runEntrypoint can only be called once`);
	hasEntrypoint = true;

	console.log(`Starting up module class: ${factory.name}`);

	const connectionId = process.env.CONNECTION_ID;
	if (typeof connectionId !== 'string' || !connectionId)
		throw new Error('Module initialise is missing CONNECTION_ID');

	const socketIoUrl = process.env.SOCKETIO_URL;
	if (typeof socketIoUrl !== 'string' || !socketIoUrl) throw new Error('Module initialise is missing SOCKETIO_URL');

	const socketIoToken = process.env.SOCKETIO_TOKEN;
	if (typeof socketIoToken !== 'string' || !socketIoToken)
		throw new Error('Module initialise is missing SOCKETIO_TOKEN');

	let module: InstanceBase<any> | undefined;

	const socket = SocketIOClient.io(socketIoUrl, { reconnection: false, timeout: 5000, transports: ['websocket'] });
	socket.on('connect', () => {
		console.log(`Connected to module-host: ${socket.id}`);

		socket.emit('register', connectionId, socketIoToken);
		socket.once('registered', () => {
			console.log(`Module-host accepted registration`);

			const wrapper = new SystemSocketWrapper(socket);

			module = new factory(wrapper, connectionId);

			// TODO - subscribe to socket events
		});
	});
	socket.on('connect_error', (e: any) => {
		console.log(`connection failed to module-host: ${socket.id}`, e.toString());

		process.exit(12);
	});
	socket.on('disconnect', async () => {
		// TODO - does this get fired if the connection times out?
		console.log(`Disconnected from module-host: ${socket.id}`);

		if (module) {
			// Try and de-init the module before killing it
			try {
				const p = module.destroy();
				if (p) await PTimeout(p, 5000);
			} catch (e) {
				// Ignore
			}
		}

		// Kill the process
		process.exit(11);
	});
}

class SystemSocketWrapper implements CompanionModuleSystem {
	#socket: SocketIOClient.Socket;

	constructor(socket: SocketIOClient.Socket) {
		this.#socket = socket;
	}

	setActionDefinitions(actions: CompanionActions): Promise<void> {
		throw new Error('Method not implemented.');
	}
	setVariableDefinitions(variables: CompanionVariable[]): Promise<void> {
		throw new Error('Method not implemented.');
	}
	setFeedbackDefinitions(feedbacks: CompanionFeedbacks): Promise<void> {
		throw new Error('Method not implemented.');
	}
	setPresetDefinitions(presets: CompanionPreset[]): Promise<void> {
		throw new Error('Method not implemented.');
	}
	variableChanged(variableId: string, value: string): void {
		throw new Error('Method not implemented.');
	}
	checkFeedbacks(feedbackId?: string): void {
		throw new Error('Method not implemented.');
	}
	updateStatus(level: InstanceStatus | null, message?: string): void {
		throw new Error('Method not implemented.');
	}
	log(level: LogLevel, message: string): void {
		throw new Error('Method not implemented.');
	}
	//
}
