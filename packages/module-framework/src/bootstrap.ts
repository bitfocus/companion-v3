import * as SocketIOClient from 'socket.io-client';
import { ModuleApiV0 } from './module-api/index.js';
import PTimeout from 'p-timeout';
import { HostApiVersion, HostToModuleEventsInit, ModuleToHostEventsInit } from './host-api/versions.js';
import { InstanceBaseShared } from './instance-base.js';

let hasEntrypoint = false;

/** Run the module entrypoint */
export function runEntrypointV0(factory: new (internal: unknown, id: string) => ModuleApiV0.InstanceBaseV0<any>): void {
	runEntrypointInner(factory, HostApiVersion.v0);
}

function runEntrypointInner(
	factory: new (internal: unknown, id: string) => InstanceBaseShared<any>,
	apiVersion: HostApiVersion,
): void {
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

	let module: InstanceBaseShared<any> | undefined;

	const socket: SocketIOClient.Socket<HostToModuleEventsInit, ModuleToHostEventsInit> = SocketIOClient.io(
		socketIoUrl,
		{
			reconnection: false,
			timeout: 5000,
			transports: ['websocket'],
		},
	);
	socket.on('connect', () => {
		console.log(`Connected to module-host: ${socket.id}`);

		socket.emit('register', apiVersion, connectionId, socketIoToken, () => {
			console.log(`Module-host accepted registration`);

			module = new factory(socket, connectionId);
		});
	});
	socket.on('connect_error', (e: any) => {
		console.log(`connection failed to module-host: ${socket.id}`, e.toString());

		process.exit(12);
	});
	socket.on('disconnect', async () => {
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
