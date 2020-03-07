import RxDB, { RxDatabase } from 'rxdb';
import RxDBServerPlugin from 'rxdb/plugins/server';
import MemoryAdapter from 'pouchdb-adapter-memory';

import { CollectionCreator, ICollections } from '../shared/collections';

RxDB.plugin(RxDBServerPlugin);
RxDB.plugin(MemoryAdapter);

export async function createDb() {
	const db = await RxDB.create<ICollections>({
		name: 'companion3',
		adapter: 'memory',
	});

	console.log('DatabaseService: create collections');
	await Promise.all(CollectionCreator.map(colData => db.collection(colData)));

	return db;
}
