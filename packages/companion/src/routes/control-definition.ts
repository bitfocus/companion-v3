import {
	ControlDefinitionActionReorderMessage,
	ControlDefinitionActionSetDelayMessage,
	ControlDefinitionActionSetOptionMessage,
	ControlDefinitionCreateMessage,
	ControlDefinitionCreateMessageReply,
	ControlDefinitionDeleteMessage,
	ControlDefinitionNameUpdateMessage,
	ControlDefinitionRenderLayerUpdateMessage,
} from '@companion/core-shared/dist/api.js';
import { rgba } from '@companion/core-shared/dist/color.js';
import * as SocketIO from 'socket.io';
import { getUserInfo } from '../auth.js';
import { ICore } from '../core.js';
import Bson from 'bson';
import { ControlType, IControlDefinition } from '@companion/core-shared/dist/collections/index.js';
import {
	ControlDefinitionActionAddMessage,
	ControlDefinitionActionRemoveMessage,
} from '@companion/core-shared/src/api';
import { IServices, SocketContext } from './handlers.js';

export function createControlDefaults(type: ControlType): IControlDefinition {
	// TODO - validate type

	return {
		_id: new Bson.ObjectID().toHexString(),
		description: 'New control',
		controlType: type,
		defaultLayer: {
			text: '',
			textSize: 'auto',
			textAlignment: ['c', 'c'],
			textColor: rgba(255, 255, 255, 255),
			backgroundColor: rgba(0, 0, 0, 255),
		},
		renderHash: new Bson.ObjectID().toHexString(),
		touchedAt: Date.now(),

		downActions: [],
	};
}

export async function handleControlDefinitionCreate(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionCreateMessage,
): Promise<ControlDefinitionCreateMessageReply> {
	const userSession = await getUserInfo(socketContext.authSessionId);
	if (userSession) {
		const conn = await core.models.controlDefinitions.insertOne(createControlDefaults(msg.type));
		return {
			id: conn.insertedId,
		};
	} else {
		throw new Error('Not authorised');
	}
}

export async function handleControlDefinitionDelete(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionDeleteMessage,
): Promise<ControlDefinitionDeleteMessage> {
	const userSession = await getUserInfo(socketContext.authSessionId);
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
}

export async function handleControlDefinitionRenderLayerUpdate(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionRenderLayerUpdateMessage<any>,
): Promise<void> {
	const userSession = await getUserInfo(socketContext.authSessionId);
	if (userSession) {
		// TODO - target layer
		// TODO - some data validation
		const res = await core.models.controlDefinitions.updateOne(
			{ _id: msg.controlId },
			{
				$set: {
					[`defaultLayer.${msg.key}`]: msg.value,
					renderHash: new Bson.ObjectID().toHexString(),
				},
			},
		);
		if (res.modifiedCount === 0) {
			throw new Error('Not found');
		}
	} else {
		throw new Error('Not authorised');
	}
}

export async function handleControlDefinitionNameUpdate(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionNameUpdateMessage,
): Promise<void> {
	const userSession = await getUserInfo(socketContext.authSessionId);
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
}

export async function handleControlDefinitionActionAdd(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionActionAddMessage,
): Promise<void> {
	const userSession = await getUserInfo(socketContext.authSessionId);
	if (userSession) {
		// TODO - verify action is valid

		const res = await core.models.controlDefinitions.updateOne(
			{ _id: msg.controlId },
			{
				$push: {
					downActions: {
						id: new Bson.ObjectID().toHexString(),

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
}

export async function handleControlDefinitionActionRemove(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionActionRemoveMessage,
): Promise<void> {
	const userSession = await getUserInfo(socketContext.authSessionId);
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
}

export async function handleControlDefinitionActionSetDelay(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionActionSetDelayMessage,
): Promise<void> {
	const userSession = await getUserInfo(socketContext.authSessionId);
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
}

export async function handleControlDefinitionActionSetOption(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionActionSetOptionMessage,
): Promise<void> {
	const userSession = await getUserInfo(socketContext.authSessionId);
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
}

export async function handleControlDefinitionActionReorder(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	_core: ICore,
	_services: IServices,
	_msg: ControlDefinitionActionReorderMessage,
): Promise<void> {
	const userSession = await getUserInfo(socketContext.authSessionId);
	if (userSession) {
		// TODO implement
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
}
