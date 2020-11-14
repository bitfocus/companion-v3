import { createClient, SubscribePayload } from 'graphql-ws';
import { Subject, Observable } from 'rxjs';
import * as objectPath from 'object-path';

const apiURL = `${window.location.protocol.replace('http', 'ws')}//${window.location.host}/graphql`;
export const graphqlClient = createClient({
	url: apiURL,
	lazy: false,
});

export type gqlUnsub = () => void;

export interface PubSubEvent<T> {
	type: 'init' | 'add' | 'change' | 'remove';
	data: T[];
}

export function gqlSubscribeArray<T extends { id: string }>(
	payload: SubscribePayload,
	path: string,
): [Observable<T[]>, gqlUnsub] {
	const sub = new Subject<T[]>();
	const fullData = new Map<string, T>();
	sub.next(Array.from(fullData.values()));

	const unsub = graphqlClient.subscribe<PubSubEvent<T>>(payload, {
		next: (rawData) => {
			const data = objectPath.get(rawData, `data.${path}`);
			switch (data.type) {
				case 'init':
					fullData.clear();
					for (const d of data.data) {
						fullData.set(d.id, d);
					}
					// fullData = data.data;
					break;
				case 'add':
				case 'change':
					for (const d of data.data) {
						fullData.set(d.id, d);
					}
					// fullData.push(...data.data);
					break;
				case 'remove':
					for (const d of data.data) {
						fullData.delete(d.id);
					}
					// const removedIds = data.data.map((d) => d.id);
					// fullData = fullData.filter((d) => !removedIds.includes(d.id));
					break;
			}
			sub.next(Array.from(fullData.values()));
		},
		error: (e) => sub.error(`GraphQL Failed: ${e}`),
		complete: () => sub.complete(),
	});

	return [sub, unsub];
}
