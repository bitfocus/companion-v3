import { ConnectionDeleteMessage, ConnectionEnabledMessage, SocketCommand } from '@companion/core-shared/dist/api.js';
import { SocketAuthSessionWrapper } from './auth.js';
import * as SocketIO from 'socket.io';
import { ConnectionCreateMessage, ConnectionCreateMessageReply } from '@companion/core-shared/dist/api.js';
import { getUserInfo } from '../auth.js';
import { ICore } from '../core.js';
import shortid from 'shortid';
import { registerCommand } from './lib.js';

export function socketDeviceConnectionHandler(
	core: ICore,
	socket: SocketIO.Socket,
	authSession: SocketAuthSessionWrapper,
) {
	registerCommand(
		socket,
		SocketCommand.ConnectionCreate,
		async (msg: ConnectionCreateMessage): Promise<ConnectionCreateMessageReply> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				const module = await core.models.modules.findOne({ _id: msg.moduleId });
				if (module && (!module.manifest.products || module.manifest.products.includes(msg.product))) {
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
		},
	);

	registerCommand(
		socket,
		SocketCommand.ConnectionDelete,
		async (msg: ConnectionDeleteMessage): Promise<ConnectionDeleteMessage> => {
			const userSession = await getUserInfo(authSession.authSessionId);
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
		},
	);

	registerCommand(
		socket,
		SocketCommand.ConnectionEnabled,
		async (msg: ConnectionEnabledMessage): Promise<ConnectionEnabledMessage> => {
			const userSession = await getUserInfo(authSession.authSessionId);
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
		},
	);
	// socket.on(SocketCommand.Logout, async (_msg: LogoutMessage) => {
	// 	if (authSession.authSessionId) {
	// 		// Clear the value
	// 		const oldAuthSessionId = authSession.authSessionId;
	// 		authSession.authSessionId = null;
	// 		// Then do the logout
	// 		await logout(oldAuthSessionId);
	// 	}

	// 	socket.emit(SocketCommand.UserInfo, literal<UserInfoMessage>({}));

	// 	// Remove subscriptions
	// 	unsubscribeAllForSocket(socket);
	// });
}
