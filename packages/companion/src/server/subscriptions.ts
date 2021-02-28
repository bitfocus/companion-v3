import { SubscribeMessage, UnsubscribeMessage } from '../shared/api';
import { IModule } from '../shared/collections';
import { SubscriptionEvent } from '../shared/subscription';
import { literal } from '../shared/util';
import { ICore } from './core';
import SocketIO from 'socket.io';

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

function getSubscriptionId(msg: SubscribeMessage): string {
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

export function socketSubscribe(core: ICore, socket: SocketIO.Socket, msg: SubscribeMessage): void {
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

export function socketUnsubscribe(core: ICore, socket: SocketIO.Socket, msg: UnsubscribeMessage): void {
	for (const [subId, data] of dbSubscriptions) {
		data.clients = data.clients.filter((c) => c.socket !== socket || c.messageName !== msg.id);
		if (data.clients.length === 0) {
			dbSubscriptions.delete(subId);
			data.destroy();
		}
	}
}

export function createSubscription(core: ICore, msg: SubscribeMessage): SubscriptionData {
	switch (msg.doc) {
		case 'modules': {
			if (msg.query !== undefined) {
				// TODO better
				throw new Error(`Can't have query`);
			}

			const stream = core.models.modules.watch({
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
					core.models.modules
						.find()
						.toArray()
						.then((docs) => {
							client.socket.emit(
								client.messageName,
								literal<SubscriptionEvent<IModule>>({
									event: 'init',
									docs: docs,
								}),
							);
						});
				},
			};

			function sendToAll(msg: SubscriptionEvent<IModule>): void {
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
		default:
			throw new Error(`Unknown doc: "${msg.doc}"`);
	}
	// TODO
}
