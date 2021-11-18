import shortid from 'shortid';
import { SocketCommand, CollectionSubscribeMessage } from '@companion/core-shared/dist/api';
import { SubscriptionEvent } from '@companion/core-shared/dist/subscription';
import { literal } from '@companion/core-shared/dist/util';
import { Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';
import { CollectionId } from '@companion/core-shared/dist/collections';

export type unsub = () => void;

// TODO - how can the query be typed?
export interface SubscribeQuery {
	doc: string;
	query?: never;
}
function subscribeToCollection<T extends { _id: string }>(
	socket: Socket,
	collection: CollectionId,
	query: any,
	options: any, // TODO - type
	onChange: (docs: T[]) => void,
): unsub {
	const subId = shortid();
	socket.emit(
		SocketCommand.CollectionSubscribe,
		literal<CollectionSubscribeMessage>({
			id: subId,
			doc: collection,
			query,
			// TODO - forward options
		}),
	);

	const fullData = new Map<string, T>();
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
		onChange(Array.from(fullData.values()));
	});

	return () => {
		socket.off(subId);
		socket.emit(SocketCommand.CollectionUnsubscribe, {
			id: subId,
		});
	};
}

export function useCollection<T extends { _id: string }>(
	socket: Socket,
	collection: CollectionId,
	enable: boolean,
	query?: undefined,
	options?: any, // TODO - type this
): Record<string, T> {
	const [docs, setDocs] = useState({});

	// TODO - does query need memoizing?
	useEffect(() => {
		setDocs({});

		if (enable) {
			const unsub = subscribeToCollection<T>(socket, collection, query, options, (docs) => {
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
	}, [socket, collection, query, options, enable]);

	return docs;
}

export function useCollectionOne<T extends { _id: string }>(
	socket: Socket,
	collection: CollectionId,
	docId: string | null,
	timeout: number = 0,
): [T | null, boolean] {
	const [doc, setDoc] = useState<T | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		setDoc(null);
		setFailed(false);

		if (docId !== null) {
			let timeoutHandle = timeout > 0 ? setTimeout(() => setFailed(true), timeout) : null;

			const clearTimeoutHandle = () => {
				if (timeoutHandle) {
					clearTimeout(timeoutHandle);
					timeoutHandle = null;
				}
			};

			// TODO - limit to one?
			const unsub = subscribeToCollection<T>(socket, collection, docId, undefined, (docs) => {
				const newDoc = docs.find((d) => d._id === docId) ?? null;
				console.log(newDoc, docs.length);
				setDoc(newDoc);
				clearTimeoutHandle();
				setFailed(!newDoc);
			});

			return () => {
				unsub();
				setDoc(null);
				clearTimeoutHandle();
				setFailed(false);
			};
		}
	}, [socket, collection, docId, timeout]);

	return [doc, failed];
}
