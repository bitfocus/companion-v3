import {
	SocketCommand,
	SurfaceSpaceCreateMessage,
	SurfaceSpaceCreateMessageReply,
	SurfaceSpaceDeleteMessage,
} from '@companion/core-shared/dist/api';
import { SocketAuthSessionWrapper } from './auth';
import SocketIO from 'socket.io';
import { getUserInfo } from '../auth';
import { ICore } from '../core';
import { registerCommand } from './lib';
import { ObjectID } from 'bson';
import { SurfaceType } from '@companion/core-shared/dist/collections';

export function socketSurfaceSpaceHandler(core: ICore, socket: SocketIO.Socket, authSession: SocketAuthSessionWrapper) {
	registerCommand(
		socket,
		SocketCommand.SurfaceSpaceCreate,
		async (_msg: SurfaceSpaceCreateMessage): Promise<SurfaceSpaceCreateMessageReply> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				const docId = new ObjectID().toHexString();
				const pageId = new ObjectID().toHexString();

				const session = core.client.startSession();
				try {
					const commitResult: any = await session.withTransaction(async () => {
						const page = await core.models.surfaceSpacePages.insertOne(
							{
								_id: pageId,
								spaceId: docId,
								controls: [],
							},
							{ session },
						);
						if (page.insertedId !== pageId) {
							await session.abortTransaction();
							return;
						}

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
								pageIds: [pageId],
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
					await session.endSession();
				}
			} else {
				throw new Error('Not authorised');
			}
		},
	);

	registerCommand(
		socket,
		SocketCommand.SurfaceSpaceDelete,
		async (msg: SurfaceSpaceDeleteMessage): Promise<SurfaceSpaceDeleteMessage> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				const session = core.client.startSession();
				try {
					const commitResult: any = await session.withTransaction(async () => {
						const delPages = core.models.surfaceSpacePages.deleteMany(
							{
								spaceId: msg.id,
							},
							{ session },
						);

						const delSpace = await core.models.surfaceSpaces.deleteOne(
							{
								_id: msg.id,
							},
							{ session },
						);

						if (!delSpace.deletedCount || delSpace.deletedCount === 0) {
							// Nothing deleted
							await session.abortTransaction();
							return;
						}

						await Promise.all([
							delPages,
							// TODO - more
						]);
					});

					if (commitResult) {
						return {
							id: msg.id,
						};
					} else {
						throw new Error('Deletion failed');
					}
				} finally {
					await session.endSession();
				}
			} else {
				throw new Error('Not authorised');
			}
		},
	);

	// registerCommand(
	// 	socket,
	// 	SocketCommand.ControlDefinitionRenderLayerUpdate,
	// 	async (msg: ControlDefinitionRenderLayerUpdateMessage<any>): Promise<void> => {
	// 		const userSession = await getUserInfo(authSession.authSessionId);
	// 		if (userSession) {
	// 			// TODO - target layer
	// 			// TODO - some data validation
	// 			const res = await core.models.controlDefinitions.updateOne(
	// 				{ _id: msg.controlId },
	// 				{
	// 					$set: {
	// 						[`defaultLayer.${msg.key}`]: msg.value,
	// 					},
	// 				},
	// 			);
	// 			if (res.upsertedCount === 0) {
	// 				throw new Error('Not found');
	// 			}
	// 		} else {
	// 			throw new Error('Not authorised');
	// 		}
	// 	},
	// );

	// registerCommand(
	// 	socket,
	// 	SocketCommand.ControlDefinitionNameUpdate,
	// 	async (msg: ControlDefinitionNameUpdateMessage): Promise<void> => {
	// 		const userSession = await getUserInfo(authSession.authSessionId);
	// 		if (userSession) {
	// 			const res = await core.models.controlDefinitions.updateOne(
	// 				{ _id: msg.controlId },
	// 				{
	// 					$set: {
	// 						description: msg.name,
	// 					},
	// 				},
	// 			);
	// 			if (res.upsertedCount === 0) {
	// 				throw new Error('Not found');
	// 			}
	// 		} else {
	// 			throw new Error('Not authorised');
	// 		}
	// 	},
	// );
}
