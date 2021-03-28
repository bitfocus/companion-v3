import {
	SocketCommand,
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
} from '@companion/core-shared/dist/api';
import { SocketAuthSessionWrapper } from './auth';
import SocketIO from 'socket.io';
import { getUserInfo } from '../auth';
import { ICore } from '../core';
import { registerCommand } from './lib';
import { ObjectID } from 'bson';
import { SurfaceType } from '@companion/core-shared/dist/collections';
import { createControlDefaults } from './control-definition';

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

						if (updatedDevices.result.nModified === 0) {
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
			} else {
				throw new Error('Not authorised');
			}
		},
	);

	registerCommand(
		socket,
		SocketCommand.SurfaceSpacePageCreate,
		async (msg: SurfaceSpacePageCreateMessage): Promise<SurfaceSpacePageCreateMessageReply> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
				const pageId = new ObjectID().toHexString();

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
			} else {
				throw new Error('Not authorised');
			}
		},
	);

	registerCommand(
		socket,
		SocketCommand.SurfaceSpacePageDelete,
		async (msg: SurfaceSpacePageDeleteMessage): Promise<SurfaceSpacePageDeleteMessage> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
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
			} else {
				throw new Error('Not authorised');
			}
		},
	);

	registerCommand(
		socket,
		SocketCommand.SurfaceSpacePageSlotCreate,
		async (msg: SurfaceSpacePageSlotCreateMessage): Promise<SurfaceSpacePageSlotCreateMessageReply> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
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
			} else {
				throw new Error('Not authorised');
			}
		},
	);

	registerCommand(
		socket,
		SocketCommand.SurfaceSpacePageSlotClear,
		async (msg: SurfaceSpacePageSlotClearMessage): Promise<SurfaceSpacePageSlotClearMessage> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
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
			} else {
				throw new Error('Not authorised');
			}
		},
	);

	registerCommand(
		socket,
		SocketCommand.SurfaceSpacePageSlotUseControl,
		async (msg: SurfaceSpacePageSlotUseControlMessage): Promise<SurfaceSpacePageSlotUseControlMessage> => {
			const userSession = await getUserInfo(authSession.authSessionId);
			if (userSession) {
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
			} else {
				throw new Error('Not authorised');
			}
		},
	);
}
