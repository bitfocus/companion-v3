import { SocketCommand } from '@companion/core-shared/dist/api';
import { SocketAuthSessionWrapper } from './auth';
import SocketIO from 'socket.io';
import { getUserInfo } from '../auth';
import { ICore } from '../core';
import { registerCommand } from './lib';
import { SurfaceManager } from '../services/surfaces';

export function socketSurfaceDeviceHandler(
	_core: ICore,
	socket: SocketIO.Socket,
	authSession: SocketAuthSessionWrapper,
	surfaceManager: SurfaceManager,
) {
	registerCommand(
		socket,
		SocketCommand.SurfaceDeviceScan,
		async (_msg: unknown): Promise<void> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				await surfaceManager.scan();
			} else {
				throw new Error('Not authorised');
			}
		},
	);
}
