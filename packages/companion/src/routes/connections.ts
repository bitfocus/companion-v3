import {
	ConnectionDeleteMessage,
	ConnectionEnabledMessage,
	ConnectionCreateMessage,
	ConnectionCreateMessageReply,
} from '@companion/core-shared/dist/api.js';
import * as SocketIO from 'socket.io';
import { getUserInfo } from '../auth.js';
import { ICore } from '../core.js';
import shortid from 'shortid';
import { IServices, SocketContext } from './handlers.js';

export async function handleConnectionCreate(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ConnectionCreateMessage,
): Promise<ConnectionCreateMessageReply> {
	const userSession = await getUserInfo(socketContext.authSessionId);
	if (userSession) {
		const module = await core.models.modules.findOne({ _id: msg.moduleId });
		if (module && (!module.manifest.products || !msg.product || module.manifest.products.includes(msg.product))) {
			const conn = await core.models.deviceConnections.insertOne({
				_id: shortid(),
				moduleId: msg.moduleId,
				label: 'new', // TODO
				enabled: false,
				// TODO - product?
			});
			return {
				connectionId: conn.insertedId,
			};
		} else {
			throw new Error('Bad moduleId');
		}
	} else {
		throw new Error('Not authorised');
	}
}

export async function handleConnectionDelete(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ConnectionDeleteMessage,
): Promise<ConnectionDeleteMessage> {
	const userSession = await getUserInfo(socketContext.authSessionId);
	if (userSession) {
		const res = await core.models.deviceConnections.deleteOne({ _id: msg.connectionId });
		if (res.deletedCount !== undefined && res.deletedCount > 0) {
			return {
				connectionId: msg.connectionId,
			};
		} else {
			throw new Error('Not found');
		}
	} else {
		throw new Error('Not authorised');
	}
}

export async function handleConnectionEnabled(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ConnectionEnabledMessage,
): Promise<ConnectionEnabledMessage> {
	const userSession = await getUserInfo(socketContext.authSessionId);
	if (userSession) {
		await core.models.deviceConnections.updateOne(
			{ _id: msg.connectionId },
			{
				$set: { enabled: msg.enabled },
			},
		);

		// Assume it was ok
		return msg;
	} else {
		throw new Error('Not authorised');
	}
}
