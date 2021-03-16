import {
	ControlDefinitionCreateMessage,
	ControlDefinitionCreateMessageReply,
	ControlDefinitionDeleteMessage,
	SocketCommand,
} from '@companion/core-shared/dist/api';
import { SocketAuthSessionWrapper } from './auth';
import SocketIO from 'socket.io';
import { getUserInfo } from '../auth';
import { ICore } from '../core';
import shortid from 'shortid';
import { registerCommand } from './lib';

export function socketControlDefinitionHandler(
	core: ICore,
	socket: SocketIO.Socket,
	authSession: SocketAuthSessionWrapper,
) {
	registerCommand(
		socket,
		SocketCommand.ControlDefinitionCreate,
		async (msg: ControlDefinitionCreateMessage): Promise<ControlDefinitionCreateMessageReply> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				// TODO - validate type

				const conn = await core.models.controlDefinitions.insertOne({
					_id: shortid(),
					description: 'New control',
					controlType: msg.type,
				});
				return {
					id: conn.insertedId,
				};
			} else {
				throw new Error('Not authorised');
			}
		},
	);

	registerCommand(
		socket,
		SocketCommand.ControlDefinitionDelete,
		async (msg: ControlDefinitionDeleteMessage): Promise<ControlDefinitionDeleteMessage> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				const res = await core.models.controlDefinitions.deleteOne({ _id: msg.id });
				if (res.deletedCount !== undefined && res.deletedCount > 0) {
					// TODO - transaction?
					// TODO - remove from assignments too

					return {
						id: msg.id,
					};
				} else {
					throw new Error('Not found');
				}
			} else {
				throw new Error('Not authorised');
			}
		},
	);
}
