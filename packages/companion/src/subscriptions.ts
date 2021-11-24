import { CollectionSubscribeMessage, CollectionUnsubscribeMessage } from '@companion/core-shared/dist/api.js';
import { SubscriptionEvent } from '@companion/core-shared/dist/subscription.js';
import { literal } from '@companion/core-shared/dist/util.js';
import { ICore } from './core.js';
import * as SocketIO from 'socket.io';
import Mongo from 'mongodb';
import { CollectionId } from '@companion/core-shared/dist/collections/index.js';
import { Observable, Subject } from 'rxjs';

interface SubscriptionEntry {
	socket: SocketIO.Socket;
	messageName: string;
}

interface SubscriptionData {
	clients: SubscriptionEntry[];
	init: (sub: SubscriptionEntry) => void;
	destroy: () => void;
}

const dbSubscriptions = new Map<string, SubscriptionData>();
const deleteSubscriptions = new Map<string, Observable<string>>();

function getSubscriptionId(msg: CollectionSubscribeMessage): string {
	return msg.doc + '_' + JSON.stringify(msg.query ?? {});
}

export function unsubscribeAllForSocket(socket: SocketIO.Socket): void {
	for (const [subId, data] of dbSubscriptions) {
		data.clients = data.clients.filter((c) => c.socket !== socket);
		if (data.clients.length === 0) {
			dbSubscriptions.delete(subId);
			data.destroy();
		}
	}
}

export function socketSubscribe(core: ICore, socket: SocketIO.Socket, msg: CollectionSubscribeMessage): void {
	const subId = getSubscriptionId(msg);
	let sub = dbSubscriptions.get(subId);
	if (!sub) {
		sub = createSubscription(core, msg);
		dbSubscriptions.set(subId, sub);
	}
	const entry: SubscriptionEntry = {
		messageName: msg.id,
		socket: socket,
	};
	sub.clients.push(entry);
	sub.init(entry);
}

function subscribeToDeletes<T extends { _id: string }>(collection: Mongo.Collection<T>): Observable<string> {
	const subId = collection.collectionName;
	let sub = deleteSubscriptions.get(subId);
	if (!sub) {
		const sub2 = new Subject<string>();

		const stream = collection.watch();

		stream.on('end', () => {
			// TODO
			// data.destroy();
		});

		stream.on('change', (doc) => {
			switch (doc.operationType) {
				// case 'insert':
				// case 'replace':
				// case 'update':
				// 	sendToAll({
				// 		event: 'change',
				// 		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				// 		doc: doc.fullDocument!,
				// 	});
				// 	break;
				case 'delete':
					sub2.next((doc.documentKey as any)._id);
					break;
				case 'drop':
				case 'dropDatabase':
				case 'rename':
					// TODO
					// sendToAll({
					// 	event: 'error',
					// 	message: 'Collection dropped',
					// });
					// data.destroy();
					break;
				case 'invalidate':
					// TODO
					// data.destroy();
					break;
				// TODO
				// default:
				// 	assertNever(doc.operationType);
			}
		});

		sub = sub2.asObservable();
		deleteSubscriptions.set(subId, sub);
	}
	return sub;
}

export function socketUnsubscribe(_core: ICore, socket: SocketIO.Socket, msg: CollectionUnsubscribeMessage): void {
	for (const [subId, data] of dbSubscriptions) {
		data.clients = data.clients.filter((c) => c.socket !== socket || c.messageName !== msg.id);
		if (data.clients.length === 0) {
			dbSubscriptions.delete(subId);
			data.destroy();
		}
	}
}

export function createSubscription(core: ICore, msg: CollectionSubscribeMessage): SubscriptionData {
	switch (msg.doc) {
		case CollectionId.Modules: {
			return createBasicSubscription(core.models.modules, msg);
		}
		case CollectionId.Connections: {
			return createBasicSubscription(core.models.deviceConnections, msg);
		}
		case CollectionId.ConnectionActions: {
			return createBasicSubscription(core.models.deviceConnectionActions, msg);
		}
		case CollectionId.ConnectionFeedbacks: {
			return createBasicSubscription(core.models.deviceConnectionFeedbacks, msg);
		}
		case CollectionId.ConnectionProperties: {
			return createBasicSubscription(core.models.deviceConnectionProperties, msg);
		}
		case CollectionId.ConnectionStatuses: {
			return createBasicSubscription(core.models.deviceConnectionStatuses, msg);
		}
		case CollectionId.ControlDefinitions: {
			return createBasicSubscription(core.models.controlDefinitions, msg);
		}
		case CollectionId.SurfaceSpaces: {
			return createBasicSubscription(core.models.surfaceSpaces, msg);
		}
		case CollectionId.ControlRenders: {
			return createBasicSubscription(core.models.controlRenders, msg);
		}
		case CollectionId.SurfaceDevices: {
			return createBasicSubscription(core.models.surfaceDevices, msg);
		}
		default:
			// TODO ensure unreachable
			throw new Error(`Unknown doc: "${msg.doc}"`);
	}
}

function createBasicSubscription<T extends { _id: string }>(
	collection: Mongo.Collection<T>,
	msg: CollectionSubscribeMessage,
) {
	if (msg.query !== undefined && typeof msg.query !== 'string') {
		// TODO better
		// This will be necessary, but will become quite complex and needs some good testing to ensure all the right events are detected in the change stream
		throw new Error(`Can't have query`);
	}

	const stream = collection.watch(undefined, {
		fullDocument: 'updateLookup',
	});

	function sendToAll(newMsg: SubscriptionEvent<T>): void {
		for (const client of data.clients) {
			client.socket.emit(client.messageName, newMsg);
		}
	}

	const subscriptionDocIds = new Set<string>();

	let deleteUnsub: (() => void) | undefined;
	if (typeof msg.query === 'string') {
		const sub = subscribeToDeletes(collection);
		sub.subscribe((docId) => {
			// TODO - how to unsub
			if (subscriptionDocIds.delete(docId)) {
				sendToAll({
					event: 'remove',
					docId: docId,
				});
			}
		});
	}

	const data: SubscriptionData = {
		clients: [],
		destroy: () => {
			if (deleteUnsub) {
				deleteUnsub();
			}

			stream.close();
			sendToAll({
				event: 'error',
				message: 'Stream closed',
			});
		},
		init: (client: SubscriptionEntry) => {
			collection
				.find(typeof msg.query === 'string' ? { _id: msg.query } : {})
				.toArray()
				.then((docs) => {
					for (const doc of docs) {
						subscriptionDocIds.add(doc._id);
					}

					client.socket.emit(
						client.messageName,
						literal<SubscriptionEvent<T>>({
							event: 'init',
							docs: docs as T[],
						}),
					);
				});
		},
	};

	stream.on('end', () => {
		data.destroy();
	});

	stream.on('change', (doc) => {
		switch (doc.operationType) {
			case 'insert':
			case 'replace':
			case 'update':
				subscriptionDocIds.add((doc.documentKey as any)._id);
				sendToAll({
					event: 'change',
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					doc: doc.fullDocument!,
				});
				break;
			case 'delete':
				subscriptionDocIds.delete((doc.documentKey as any)._id);
				sendToAll({
					event: 'remove',
					docId: (doc.documentKey as any)._id,
				});
				break;
			case 'drop':
			case 'dropDatabase':
			case 'rename':
				subscriptionDocIds.clear();
				sendToAll({
					event: 'error',
					message: 'Collection dropped',
				});
				data.destroy();
				break;
			case 'invalidate':
				data.destroy();
				break;
			// TODO
			// default:
			// 	assertNever(doc.operationType);
		}
	});

	return data;
}
