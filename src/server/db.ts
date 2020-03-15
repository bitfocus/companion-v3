import RxDB, { RxDatabase } from 'rxdb';
import RxDBServerPlugin from 'rxdb/plugins/server';
// import MemoryAdapter from 'pouchdb-adapter-memory';
import LevelDbAdapter from 'pouchdb-adapter-leveldb'
import path from 'path'
import fs from 'fs'

import { CollectionCreator, ICollections } from '../shared/collections';

RxDB.plugin(RxDBServerPlugin);
// RxDB.plugin(MemoryAdapter);
RxDB.plugin(LevelDbAdapter);

export async function createDb(configPath: string) {
	fs.mkdirSync(path.join(configPath, 'db'), {
		recursive: true
	})

	const db = await RxDB.create<ICollections>({
		name: path.join(configPath, 'db/companion'),
		adapter: 'leveldb',
	});

	console.log('DatabaseService: create collections');
	await Promise.all(CollectionCreator.map(colData => db.collection(colData)));

	return db;
}
