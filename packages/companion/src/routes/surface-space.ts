import {
	SurfaceSpaceCreateMessage,
	SurfaceSpaceCreateMessageReply,
	SurfaceSpaceDeleteMessage,
	SurfaceSpacePageCreateMessage,
	SurfaceSpacePageCreateMessageReply,
	SurfaceSpacePageDeleteMessage,
	SurfaceSpacePageSlotClearMessage,
	SurfaceSpacePageSlotCreateMessage,
	SurfaceSpacePageSlotCreateMessageReply,
	SurfaceSpacePageSlotUseControlMessage,
} from '@companion/core-shared/dist/api.js';
import * as SocketIO from 'socket.io';
import { verifyUserSession } from '../auth.js';
import { generateDocumentId, ICore } from '../core.js';
import { SurfaceType } from '@companion/core-shared/dist/collections/index.js';
import { createControlDefaults } from './control-definition.js';
import { IServices, SocketContext } from './handlers.js';
import * as Mongo from 'mongodb';

export async function handleSurfaceSpaceCreate(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	_msg: SurfaceSpaceCreateMessage,
): Promise<SurfaceSpaceCreateMessageReply> {
	await verifyUserSession(core, socketContext.authSessionId);

	const docId = generateDocumentId();
	const pageId = generateDocumentId();

	const session = core.client.startSession();
	try {
		const commitResult: any = await session.withTransaction(async () => {
			const res = await core.models.surfaceSpaces.insertOne(
				{
					_id: docId,
					name: 'New space',
					cachedSpec: {
						// TODO - dynamic
						type: SurfaceType.ButtonGrid,
						deviceName: 'Button Grid',
						width: 8,
						height: 4,
					},
					pages: [
						{
							_id: pageId,

							name: 'New page',
							controls: {},
						},
					],
				},
				{ session },
			);

			if (res.insertedId !== docId) {
				await session.abortTransaction();
				return;
			}
		});

		if (commitResult) {
			return {
				id: docId,
			};
		} else {
			throw new Error('Creation failed');
		}
	} finally {
		await session.endSession({});
	}
}

export async function handleSurfaceSpaceDelete(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: SurfaceSpaceDeleteMessage,
): Promise<SurfaceSpaceDeleteMessage> {
	await verifyUserSession(core, socketContext.authSessionId);

	const session = core.client.startSession();
	try {
		const commitResult: any = await session.withTransaction(async () => {
			const delSpace = await core.models.surfaceSpaces.deleteOne(
				{
					_id: msg.id,
				},
				{ session },
			);

			// Detach any devices
			const updatedDevices = await core.models.surfaceDevices.updateMany(
				{
					surfaceSpaceId: msg.id,
				},
				{
					$unset: {
						surfaceSpaceId: 1,
					},
				},
			);

			if ((updatedDevices as Mongo.UpdateResult).modifiedCount === 0) {
				if (!delSpace.deletedCount || delSpace.deletedCount === 0) {
					// Nothing deleted
					await session.abortTransaction();
					return;
				}
			}

			// await Promise.all([
			// 	delPages,
			// 	// TODO - more
			// ]);
		});

		if (commitResult) {
			return {
				id: msg.id,
			};
		} else {
			throw new Error('Deletion failed');
		}
	} finally {
		await session.endSession({});
	}
}

export async function handleSurfaceSpacePageCreate(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: SurfaceSpacePageCreateMessage,
): Promise<SurfaceSpacePageCreateMessageReply> {
	await verifyUserSession(core, socketContext.authSessionId);

	const pageId = generateDocumentId();

	const session = core.client.startSession();
	try {
		const commitResult: any = await session.withTransaction(async () => {
			const ok = await core.models.surfaceSpaces.updateOne(
				{ _id: msg.spaceId },
				{
					$push: {
						pages: {
							_id: pageId,

							name: 'New page',
							controls: {},
						},
					},
				},
				{ session },
			);
			if (ok.modifiedCount !== 1) {
				// Didn't find the space to update
				await session.abortTransaction();
				return;
			}
		});

		if (commitResult) {
			return {
				id: pageId,
			};
		} else {
			throw new Error('Creation failed');
		}
	} finally {
		await session.endSession({});
	}
}

export async function handleSurfaceSpacePageDelete(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: SurfaceSpacePageDeleteMessage,
): Promise<SurfaceSpacePageDeleteMessage> {
	await verifyUserSession(core, socketContext.authSessionId);

	const session = core.client.startSession();
	try {
		const commitResult: any = await session.withTransaction(async () => {
			await core.models.surfaceSpaces.updateOne(
				{ _id: msg.spaceId },
				{
					$pull: {
						pages: { _id: msg.id },
					},
				},
				{ session },
			);
		});

		if (commitResult) {
			return {
				id: msg.id,
				spaceId: msg.spaceId,
			};
		} else {
			throw new Error('Creation failed');
		}
	} finally {
		await session.endSession({});
	}
}

export async function handleSurfaceSpacePageSlotCreate(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: SurfaceSpacePageSlotCreateMessage,
): Promise<SurfaceSpacePageSlotCreateMessageReply> {
	await verifyUserSession(core, socketContext.authSessionId);

	const controlDefaults = createControlDefaults(msg.type);

	const session = core.client.startSession();
	try {
		const commitResult: any = await session.withTransaction(async () => {
			const control = await core.models.controlDefinitions.insertOne(controlDefaults, { session });

			await core.models.surfaceSpaces.updateOne(
				{
					_id: msg.spaceId,
					'pages._id': msg.pageId,
				},
				{
					$set: {
						[`pages.$.controls.${msg.slotId}`]: control.insertedId,
					},
				},
				{ session },
			);
		});

		if (commitResult) {
			return {
				id: controlDefaults._id,
			};
		} else {
			throw new Error('Creation failed');
		}
	} finally {
		await session.endSession({});
	}
}

export async function handleSurfaceSpacePageSlotClear(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: SurfaceSpacePageSlotClearMessage,
): Promise<SurfaceSpacePageSlotClearMessage> {
	await verifyUserSession(core, socketContext.authSessionId);

	const session = core.client.startSession();
	try {
		const commitResult: any = await session.withTransaction(async () => {
			await core.models.surfaceSpaces.updateOne(
				{
					_id: msg.spaceId,
					'pages._id': msg.pageId,
				},
				{
					$unset: {
						[`pages.$.controls.${msg.slotId}`]: 1,
					},
				},
				{ session },
			);

			// TODO - delete the control if unused and the user oks it
		});

		if (commitResult) {
			return {
				...msg,
			};
		} else {
			throw new Error('Clearing failed');
		}
	} finally {
		await session.endSession({});
	}
}

export async function handleSurfaceSpacePageSlotUseControl(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: SurfaceSpacePageSlotUseControlMessage,
): Promise<SurfaceSpacePageSlotUseControlMessage> {
	await verifyUserSession(core, socketContext.authSessionId);

	const session = core.client.startSession();
	try {
		const commitResult: any = await session.withTransaction(async () => {
			// Update the control to ensure it exists
			const control = await core.models.controlDefinitions.updateOne(
				{
					_id: msg.controlId,
				},
				{
					$set: {
						touchedAt: Date.now(),
					},
				},
				{ session },
			);
			if (control.modifiedCount === 0) {
				await session.abortTransaction();
				return;
			}

			await core.models.surfaceSpaces.updateOne(
				{
					_id: msg.spaceId,
					'pages._id': msg.pageId,
				},
				{
					$set: {
						[`pages.$.controls.${msg.slotId}`]: msg.controlId,
					},
				},
				{ session },
			);
		});

		if (commitResult) {
			return {
				...msg,
			};
		} else {
			throw new Error('Clearing failed');
		}
	} finally {
		await session.endSession({});
	}
}
