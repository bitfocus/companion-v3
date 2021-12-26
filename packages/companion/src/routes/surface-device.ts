import { SurfaceDeviceAttachMessage, SurfaceDeviceDetachMessage } from '@companion/core-shared/dist/api.js';
import * as SocketIO from 'socket.io';
import { verifyUserSession } from '../auth.js';
import { ICore } from '../core.js';
import { IServices, SocketContext } from './handlers.js';

export async function handleSurfaceDeviceScan(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	_msg: null,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);

	// TODO
	// await services.surfaceManager.scan();
}

export async function handleSurfaceDeviceAttach(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: SurfaceDeviceAttachMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);

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
				adopted: true,
				surfaceSpaceId: space._id,
			},
		},
	);

	if (updated.modifiedCount === 0) {
		throw new Error(`Failed to attach device "${msg.deviceId}" to space "${space._id}"`);
	}

	// TODO
	// await services.surfaceManager.open(msg.deviceId);
}

export async function handleSurfaceDeviceDetach(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: SurfaceDeviceDetachMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);
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

	// TODO
	// await services.surfaceManager.close(msg.deviceId);
}
