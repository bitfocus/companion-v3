import { SocketCommand, SurfaceDeviceAttachMessage, SurfaceDeviceDetachMessage } from '@companion/core-shared/dist/api';
import { SocketAuthSessionWrapper } from './auth';
import SocketIO from 'socket.io';
import { getUserInfo } from '../auth';
import { ICore } from '../core';
import { registerCommand } from './lib';
import { SurfaceManager } from '../services/surfaces';

export function socketSurfaceDeviceHandler(
	core: ICore,
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

	registerCommand(
		socket,
		SocketCommand.SurfaceDeviceAttach,
		async (msg: SurfaceDeviceAttachMessage): Promise<void> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				const space = await core.models.surfaceSpaces.findOne({ _id: msg.spaceId });
				if (!space) {
					throw new Error(`Space "${msg.spaceId}" does not exist`);
				}

				const updated = await core.models.surfaceDevices.updateOne(
					{
						_id: msg.deviceId,
						surfaceSpaceId: { $exists: false },
					},
					{
						$set: {
							// adopted: true,
							surfaceSpaceId: space._id,
						},
					},
				);

				if (updated.modifiedCount === 0) {
					throw new Error(`Failed to attach device "${msg.deviceId}" to space "${space._id}"`);
				}

				await surfaceManager.open(msg.deviceId);
			} else {
				throw new Error('Not authorised');
			}
		},
	);

	registerCommand(
		socket,
		SocketCommand.SurfaceDeviceDetach,
		async (msg: SurfaceDeviceDetachMessage): Promise<void> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				const updated = await core.models.surfaceDevices.updateOne(
					{
						_id: msg.deviceId,
						surfaceSpaceId: msg.spaceId,
					},
					{
						$unset: {
							// adopted: 1,
							surfaceSpaceId: 1,
						},
					},
				);

				if (updated.modifiedCount === 0) {
					throw new Error(`Failed to detach device "${msg.deviceId}" from space "${msg.spaceId}"`);
				}

				await surfaceManager.close(msg.deviceId);
			} else {
				throw new Error('Not authorised');
			}
		},
	);
}
