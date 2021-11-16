import {
	ControlDefinitionActionSetOptionMessage,
	ControlDefinitionCreateMessage,
	ControlDefinitionCreateMessageReply,
	ControlDefinitionDeleteMessage,
	ControlDefinitionNameUpdateMessage,
	ControlDefinitionRenderLayerUpdateMessage,
	SocketCommand,
} from '@companion/core-shared/dist/api';
import { rgba } from '@companion/core-shared/dist/color';
import { SocketAuthSessionWrapper } from './auth';
import SocketIO from 'socket.io';
import { getUserInfo } from '../auth';
import { ICore } from '../core';
import { registerCommand } from './lib';
import { ObjectID } from 'bson';
import { ControlType, IControlDefinition } from '@companion/core-shared/dist/collections';
import {
	ControlDefinitionActionAddMessage,
	ControlDefinitionActionRemoveMessage,
} from '@companion/core-shared/src/api';
import { ControlDefinitionActionSetDelayMessage } from '@companion/core-shared/src/api';

export function createControlDefaults(type: ControlType): IControlDefinition {
	// TODO - validate type

	return {
		_id: new ObjectID().toHexString(),
		description: 'New control',
		controlType: type,
		defaultLayer: {
			text: '',
			textSize: 'auto',
			textAlignment: ['c', 'c'],
			textColor: rgba(255, 255, 255, 255),
			backgroundColor: rgba(0, 0, 0, 255),
		},
		renderHash: new ObjectID().toHexString(),
		touchedAt: Date.now(),

		downActions: [],
	};
}

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
				const conn = await core.models.controlDefinitions.insertOne(createControlDefaults(msg.type));
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
				await core.models.controlRenders.deleteOne({ _id: msg.id });
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
							renderHash: new ObjectID().toHexString(),
						},
					},
				);
				if (res.modifiedCount === 0) {
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
				if (res.modifiedCount === 0) {
					throw new Error('Not found');
				}
			} else {
				throw new Error('Not authorised');
			}
		},
	);

	registerCommand(
		socket,
		SocketCommand.ControlDefinitionActionAdd,
		async (msg: ControlDefinitionActionAddMessage): Promise<void> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				// TODO - verify action is valid

				const res = await core.models.controlDefinitions.updateOne(
					{ _id: msg.controlId },
					{
						$push: {
							downActions: {
								id: new ObjectID().toHexString(),

								connectionId: msg.connectionId,
								actionId: msg.actionId,
								delay: 0,
								options: {}, // TODO - defaults
							},
						},
					},
				);
				if (res.modifiedCount === 0) {
					throw new Error('Not found');
				}
			} else {
				throw new Error('Not authorised');
			}
		},
	);

	registerCommand(
		socket,
		SocketCommand.ControlDefinitionActionRemove,
		async (msg: ControlDefinitionActionRemoveMessage): Promise<void> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				const res = await core.models.controlDefinitions.updateOne(
					{ _id: msg.controlId },
					{
						$pull: {
							downActions: {
								id: msg.actionId,
							},
						},
					},
				);
				if (res.modifiedCount === 0) {
					throw new Error('Not found');
				}
			} else {
				throw new Error('Not authorised');
			}
		},
	);

	registerCommand(
		socket,
		SocketCommand.ControlDefinitionActionSetDelay,
		async (msg: ControlDefinitionActionSetDelayMessage): Promise<void> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				// TODO data sanity checking

				const res = await core.models.controlDefinitions.updateOne(
					{ _id: msg.controlId, 'downActions.id': msg.actionId },
					{
						$set: {
							'downActions.$.delay': msg.delay,
						},
					},
				);
				if (res.modifiedCount === 0) {
					throw new Error('Not found');
				}
			} else {
				throw new Error('Not authorised');
			}
		},
	);

	registerCommand(
		socket,
		SocketCommand.ControlDefinitionActionSetOption,
		async (msg: ControlDefinitionActionSetOptionMessage): Promise<void> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				// TODO data sanity checking

				const res = await core.models.controlDefinitions.updateOne(
					{ _id: msg.controlId, 'downActions.id': msg.actionId },
					{
						$set: {
							[`downActions.$.options.${msg.option}`]: msg.value,
						},
					},
				);
				if (res.modifiedCount === 0) {
					throw new Error('Not found');
				}
			} else {
				throw new Error('Not authorised');
			}
		},
	);

	registerCommand(
		socket,
		SocketCommand.ControlDefinitionActionRemove,
		async (msg: ControlDefinitionActionRemoveMessage): Promise<void> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				// TODO
				// const res = await core.models.controlDefinitions.updateOne(
				// 	{ _id: msg.controlId, 'downActions.id': msg.actionId },
				// 	{
				// 		$set: {
				// 			[`downActions.$.options.${msg.option}`]: msg.value,
				// 		},
				// 	},
				// );
				// if (res.modifiedCount === 0) {
				// 	throw new Error('Not found');
				// }
			} else {
				throw new Error('Not authorised');
			}
		},
	);
}
