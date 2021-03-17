import {
	ControlDefinitionCreateMessage,
	ControlDefinitionCreateMessageReply,
	ControlDefinitionDeleteMessage,
	ControlDefinitionNameUpdateMessage,
	ControlDefinitionRenderLayerUpdateMessage,
	SocketCommand,
} from '@companion/core-shared/dist/api';
import { SocketAuthSessionWrapper } from './auth';
import SocketIO from 'socket.io';
import { getUserInfo } from '../auth';
import { ICore } from '../core';
import { registerCommand } from './lib';
import { ObjectID } from 'bson';

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
					_id: new ObjectID().toHexString(),
					description: 'New control',
					controlType: msg.type,
					defaultLayer: {
						text: '',
						textSize: 'auto',
						textAlignment: ['c', 'c'],
					},
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

	registerCommand(
		socket,
		SocketCommand.ControlDefinitionRenderLayerUpdate,
		async (msg: ControlDefinitionRenderLayerUpdateMessage<any>): Promise<void> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				// TODO - target layer
				// TODO - some data validation
				const res = await core.models.controlDefinitions.updateOne(
					{ _id: msg.controlId },
					{
						$set: {
							[`defaultLayer.${msg.key}`]: msg.value,
						},
					},
				);
				if (res.upsertedCount === 0) {
					throw new Error('Not found');
				}
			} else {
				throw new Error('Not authorised');
			}
		},
	);

	registerCommand(
		socket,
		SocketCommand.ControlDefinitionNameUpdate,
		async (msg: ControlDefinitionNameUpdateMessage): Promise<void> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				const res = await core.models.controlDefinitions.updateOne(
					{ _id: msg.controlId },
					{
						$set: {
							description: msg.name,
						},
					},
				);
				if (res.upsertedCount === 0) {
					throw new Error('Not found');
				}
			} else {
				throw new Error('Not authorised');
			}
		},
	);
}
