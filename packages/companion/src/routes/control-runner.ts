import { ControlSimulatePressMessage } from '@companion/core-shared/dist/api';
import { verifyUserSession } from '../auth.js';
import { ICore } from '../core.js';
import { SocketContext, IServices } from './handlers.js';
import * as SocketIO from 'socket.io';

export async function handleControlSimulatePress(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	services: IServices,
	msg: ControlSimulatePressMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);

	await services.controlRunner.pressControl(msg.controlId, msg.pressed);
}
