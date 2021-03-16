import { CollectionSubscribeMessage, CollectionUnsubscribeMessage } from '@companion/core-shared/dist/api';
import { SubscriptionEvent } from '@companion/core-shared/dist/subscription';
import { literal } from '@companion/core-shared/dist/util';
import { ICore } from './core';
import SocketIO from 'socket.io';
import { Collection } from 'mongodb';

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
		case 'modules': {
			return createBasicSubscription(core.models.modules, msg);
		}
		case 'connections': {
			return createBasicSubscription(core.models.deviceConnections, msg);
		}
		case 'controlDefinitions': {
			return createBasicSubscription(core.models.controlDefinitions, msg);
		}
		default:
			throw new Error(`Unknown doc: "${msg.doc}"`);
	}
	// TODO
}

function createBasicSubscription<T extends { _id: string }>(
	collection: Collection<T>,
	msg: CollectionSubscribeMessage,
) {
	if (msg.query !== undefined) {
		// TODO better
		throw new Error(`Can't have query`);
	}

	const stream = collection.watch({
		fullDocument: 'updateLookup',
	});

	const data: SubscriptionData = {
		clients: [],
		destroy: () => {
			stream.close();
			sendToAll({
				event: 'error',
				message: 'Stream closed',
			});
		},
		init: (client: SubscriptionEntry) => {
			collection
				.find()
				.toArray()
				.then((docs) => {
					client.socket.emit(
						client.messageName,
						literal<SubscriptionEvent<T>>({
							event: 'init',
							docs: docs,
						}),
					);
				});
		},
	};

	function sendToAll(msg: SubscriptionEvent<T>): void {
		for (const client of data.clients) {
			client.socket.emit(client.messageName, msg);
		}
	}

	stream.on('end', () => {
		data.destroy();
	});

	stream.on('change', (doc) => {
		switch (doc.operationType) {
			case 'insert':
			case 'replace':
			case 'update':
				sendToAll({
					event: 'change',
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					doc: doc.fullDocument!,
				});
				break;
			case 'delete':
				sendToAll({
					event: 'remove',
					docId: doc.documentKey._id,
				});
				break;
			case 'drop':
			case 'dropDatabase':
			case 'rename':
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
