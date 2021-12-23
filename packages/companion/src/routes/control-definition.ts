import {
	ControlDefinitionActionReorderMessage,
	ControlDefinitionActionSetDelayMessage,
	ControlDefinitionActionSetOptionMessage,
	ControlDefinitionCreateMessage,
	ControlDefinitionCreateMessageReply,
	ControlDefinitionDeleteMessage,
	ControlDefinitionNameUpdateMessage,
	ControlDefinitionPropertyActionAddMessage,
	ControlDefinitionRenderLayerAddExpressionMessage,
	ControlDefinitionRenderLayerAddFeedbackMessage,
	ControlDefinitionRenderLayerEnabledUpdateMessage,
	ControlDefinitionRenderLayerFeedbackOptionUpdateMessage,
	ControlDefinitionRenderLayerNameUpdateMessage,
	ControlDefinitionRenderLayerRemoveMessage,
	ControlDefinitionRenderLayerUpdateMessage,
} from '@companion/core-shared/dist/api.js';
import { rgba } from '@companion/core-shared/dist/color.js';
import * as SocketIO from 'socket.io';
import { verifyUserSession } from '../auth.js';
import { generateDocumentId, ICore } from '../core.js';
import {
	ControlType,
	IButtonControlOverlayExpressionLayer,
	IButtonControlOverlayFeedbackLayer,
	IControlDefinition,
	IControlFeedback,
} from '@companion/core-shared/dist/collections/index.js';
import {
	ControlDefinitionActionAddMessage,
	ControlDefinitionActionRemoveMessage,
} from '@companion/core-shared/src/api';
import { IServices, SocketContext } from './handlers.js';
import {
	InternalSetPropertyActionId,
	InternalSetPropertyActionOptions,
} from '@companion/core-shared/dist/internal/actions.js';
import { literal } from '@companion/module-framework';

export function createControlDefaults(type: ControlType): IControlDefinition {
	// TODO - validate type

	return {
		_id: generateDocumentId(),
		description: 'New control',
		controlType: type,
		defaultLayer: {
			text: '',
			textSize: 'auto',
			textAlignment: ['c', 'c'],
			textColor: rgba(255, 255, 255, 255),
			backgroundColor: rgba(0, 0, 0, 255),
		},
		overlayLayers: [],
		renderHash: generateDocumentId(),
		touchedAt: Date.now(),

		downActions: [],
		upActions: [],
	};
}

export async function handleControlDefinitionCreate(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionCreateMessage,
): Promise<ControlDefinitionCreateMessageReply> {
	await verifyUserSession(core, socketContext.authSessionId);
	const conn = await core.models.controlDefinitions.insertOne(createControlDefaults(msg.type));
	return {
		id: conn.insertedId,
	};
}

export async function handleControlDefinitionDelete(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionDeleteMessage,
): Promise<ControlDefinitionDeleteMessage> {
	await verifyUserSession(core, socketContext.authSessionId);
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
}

export async function handleControlDefinitionRenderLayerUpdate(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionRenderLayerUpdateMessage<any>,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);
	// TODO - target layer
	// TODO - some data validation
	const res = await core.models.controlDefinitions.updateOne(
		{ _id: msg.controlId },
		{
			$set: {
				[`defaultLayer.${msg.key}`]: msg.value,
				renderHash: generateDocumentId(),
			},
		},
	);
	if (res.modifiedCount === 0) {
		throw new Error('Not found');
	}
}

export async function handleControlDefinitionRenderLayerAddExpression(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionRenderLayerAddExpressionMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);

	const res = await core.models.controlDefinitions.updateOne(
		{ _id: msg.controlId },
		{
			$push: {
				overlayLayers: literal<IButtonControlOverlayExpressionLayer>({
					id: generateDocumentId(),
					name: 'New Expression Layer',
					type: 'expression',
					disabled: false,

					style: {},
					condition: [],
				}),
			},
			$set: {
				renderHash: generateDocumentId(),
			},
		},
	);
	if (res.modifiedCount === 0) {
		throw new Error('Not found');
	}
}

export async function handleControlDefinitionRenderLayerAddFeedback(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	services: IServices,
	msg: ControlDefinitionRenderLayerAddFeedbackMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);
	// TODO - verify feedback is valid

	const feedback: IControlFeedback = {
		id: generateDocumentId(),
		connectionId: msg.connectionId,
		feedbackId: msg.feedbackId,

		options: {}, // TODO - defaults?
	};

	const res = await core.models.controlDefinitions.updateOne(
		{ _id: msg.controlId },
		{
			$push: {
				overlayLayers: literal<IButtonControlOverlayFeedbackLayer>({
					id: generateDocumentId(),
					name: 'New Feedback Layer', // TODO - use name of validated feedback
					type: 'advanced',
					disabled: false,

					feedback: feedback,
				}),
			},
			$set: {
				renderHash: generateDocumentId(),
			},
		},
	);
	if (res.modifiedCount === 0) {
		throw new Error('Not found');
	}

	await services.controlRunner.updatedFeedback(msg.controlId, feedback);
}

export async function handleControlDefinitionRenderLayerRemove(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	services: IServices,
	msg: ControlDefinitionRenderLayerRemoveMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);

	const existing = await core.models.controlDefinitions.findOne({ _id: msg.controlId });
	if (!existing) {
		throw new Error('Not found');
	}

	const layerToRemove = existing.overlayLayers.find((l) => l.id === msg.layerId);
	if (!layerToRemove) {
		throw new Error('Not found');
	}

	const res = await core.models.controlDefinitions.updateOne(
		{ _id: msg.controlId },
		{
			$pull: {
				overlayLayers: literal<Partial<IButtonControlOverlayFeedbackLayer>>({
					id: msg.layerId,
				}),
			},
			$set: {
				renderHash: generateDocumentId(),
			},
		},
	);
	if (res.modifiedCount === 0) {
		throw new Error('Not found');
	}

	if (layerToRemove.type === 'advanced') {
		await services.controlRunner.removedFeedback(msg.controlId, layerToRemove.feedback);
	}
}

export async function handleControlDefinitionRenderLayerNameUpdate(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionRenderLayerNameUpdateMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);

	const res = await core.models.controlDefinitions.updateOne(
		{ _id: msg.controlId, 'overlayLayers.id': msg.layerId },
		{
			$set: {
				'overlayLayers.$.name': msg.name,
			},
		},
	);
	if (res.modifiedCount === 0) {
		throw new Error('Not found');
	}
}

export async function handleControlDefinitionRenderLayerEnabledUpdate(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionRenderLayerEnabledUpdateMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);

	const res = await core.models.controlDefinitions.updateOne(
		{ _id: msg.controlId, 'overlayLayers.id': msg.layerId },
		{
			$set: {
				'overlayLayers.$.disabled': !msg.enabled,
				renderHash: generateDocumentId(),
			},
		},
	);
	if (res.modifiedCount === 0) {
		throw new Error('Not found');
	}
}

export async function handleControlDefinitionRenderLayerFeedbackOptionUpdate(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	services: IServices,
	msg: ControlDefinitionRenderLayerFeedbackOptionUpdateMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);

	// TODO - validate option is a valid key

	const res = await core.models.controlDefinitions.updateOne(
		{
			_id: msg.controlId,
			'overlayLayers.id': msg.layerId,
			'overlayLayers.type': 'advanced',
		},
		{
			$set: {
				[`overlayLayers.$.feedback.options.${msg.option}`]: msg.value,
				renderHash: generateDocumentId(),
			},
		},
	);
	if (res.modifiedCount === 0) {
		throw new Error('Not found');
	}

	const doc = await core.models.controlDefinitions.findOne({ _id: msg.controlId });
	if (!doc) {
		throw new Error('Not found');
	}

	const updatedLayer = doc.overlayLayers.find((l) => l.id === msg.layerId);
	if (!updatedLayer) {
		throw new Error('Not found');
	}

	if (updatedLayer.type === 'advanced') {
		await services.controlRunner.updatedFeedback(msg.controlId, updatedLayer.feedback);
	}
}

export async function handleControlDefinitionNameUpdate(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionNameUpdateMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);
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
}

export async function handleControlDefinitionActionAdd(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionActionAddMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);
	// TODO - verify action is valid

	const res = await core.models.controlDefinitions.updateOne(
		{ _id: msg.controlId },
		{
			$push: {
				downActions: {
					id: generateDocumentId(),

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
}

export async function handleControlDefinitionPropertyActionAdd(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionPropertyActionAddMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);
	// TODO - verify action is valid

	const property = await core.models.deviceConnectionProperties.findOne({
		connectionId: msg.connectionId,
		propertyId: msg.propertyId,
	});
	if (!property) {
		throw new Error('Property not found');
	}
	if (!property.valueInput) {
		throw new Error('Property is not writable');
	}

	const res = await core.models.controlDefinitions.updateOne(
		{ _id: msg.controlId },
		{
			$push: {
				downActions: {
					id: generateDocumentId(),

					connectionId: null as any, // TODO
					actionId: InternalSetPropertyActionId,
					delay: 0,
					options: literal<InternalSetPropertyActionOptions>({
						connectionId: msg.connectionId,
						propertyId: msg.propertyId,
						instanceId: property.instanceIds ? property.instanceIds[0].id : null,
						value: 'default' in property.valueInput ? property.valueInput.default : null,
					}) as any, // TODO
				},
			},
		},
	);
	if (res.modifiedCount === 0) {
		throw new Error('Control not found');
	}
}

export async function handleControlDefinitionActionRemove(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	services: IServices,
	msg: ControlDefinitionActionRemoveMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);
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
}

export async function handleControlDefinitionActionSetDelay(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionActionSetDelayMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);
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
}

export async function handleControlDefinitionActionSetOption(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ControlDefinitionActionSetOptionMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);
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
}

export async function handleControlDefinitionActionReorder(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	_msg: ControlDefinitionActionReorderMessage,
): Promise<void> {
	await verifyUserSession(core, socketContext.authSessionId);
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
}
