import { Observable, Subject } from 'rxjs';
import shortid from 'shortid';
import { SocketCommand, SubscribeMessage } from '@shared/dist/api';
import { SubscriptionEvent } from '@shared/dist/subscription';
import { literal } from '@shared/dist/util';
import SocketIOClient from 'socket.io-client';

export type unsub = () => void;

// TODO - how can the query be typed?
export interface SubscribeQuery {
	doc: string;
	query?: never;
}
export function subscribeToCollection<T extends { _id: string }>(
	socket: SocketIOClient.Socket,
	doc: string,
	query?: never,
): [Observable<T[]>, unsub] {
	const subId = shortid();
	socket.emit(
		SocketCommand.Subscribe,
		literal<SubscribeMessage>({
			id: subId,
			doc,
			query,
		}),
	);

	const sub = new Subject<T[]>();
	const fullData = new Map<string, T>();
	sub.next(Array.from(fullData.values()));

	socket.on(subId, (msg: SubscriptionEvent<T>) => {
		switch (msg.event) {
			case 'init':
				fullData.clear();
				for (const d of msg.docs) {
					fullData.set(d._id, d);
				}
				break;
			case 'change':
				fullData.set(msg.doc._id, msg.doc);
				break;
			case 'remove':
				fullData.delete(msg.docId);
				break;
			case 'error':
				// TODO
				console.error('got error', msg.message);
				break;
		}
		sub.next(Array.from(fullData.values()));
	});

	return [
		sub,
		() => {
			socket.off(subId);
			socket.emit(SocketCommand.Unsubscribe, {
				id: subId,
			});
		},
	];
}
