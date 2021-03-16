import { Observable, Subject } from 'rxjs';
import shortid from 'shortid';
import { SocketCommand, CollectionSubscribeMessage } from '@companion/core-shared/dist/api';
import { SubscriptionEvent } from '@companion/core-shared/dist/subscription';
import { literal } from '@companion/core-shared/dist/util';
import SocketIOClient from 'socket.io-client';
import { useEffect, useMemo, useState } from 'react';

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
		SocketCommand.CollectionSubscribe,
		literal<CollectionSubscribeMessage>({
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
			socket.emit(SocketCommand.CollectionUnsubscribe, {
				id: subId,
			});
		},
	];
}

export function useCollection<T extends { _id: string }>(
	socket: SocketIOClient.Socket,
	doc: string,
	query?: undefined,
	enable?: boolean,
): Record<string, T> {
	const [docs, setDocs] = useState({});

	// TODO - does query need memoizing?
	useEffect(() => {
		if (enable) {
			const [sub, unsub] = subscribeToCollection<T>(socket, doc, query);

			sub.subscribe((docs) => {
				const obj: Record<string, T> = {};
				for (const m of docs) {
					obj[m._id] = m;
				}
				setDocs(obj);
			});
			return () => {
				unsub();
				setDocs({});
			};
		}
	}, [socket, doc, query, enable]);

	return docs;
}
