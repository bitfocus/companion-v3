import RxDB, { RxDatabase } from 'rxdb';
import RxDBServerPlugin from 'rxdb/plugins/server';
// import MemoryAdapter from 'pouchdb-adapter-memory';
import LevelDbAdapter from 'pouchdb-adapter-leveldb';
import path from 'path';
import fs from 'fs';

import { CollectionCreator, ICollections } from '../shared/collections';

// eslint-disable-next-line @typescript-eslint/no-var-requires
RxDB.PouchDB.plugin(require('pouchdb-security'));
RxDB.plugin(RxDBServerPlugin);
// RxDB.plugin(MemoryAdapter);
RxDB.plugin(LevelDbAdapter);

export async function createDb(configPath: string) {
	fs.mkdirSync(path.join(configPath, 'db'), {
		recursive: true,
	});

	const dbPath = path.join(configPath, 'db/companion');
	const db = await RxDB.create<ICollections>({
		name: dbPath,
		adapter: 'leveldb',
	});

	console.log(`DatabaseService: create collections at ${dbPath}`);
	await Promise.all(
		CollectionCreator.map(colData =>
			db
				.collection(colData)
				.then(col => (col.pouch as any).putSecurity({ admins: { names: ['admin'] }, members: { roles: ['authenticated'] } })),
		),
	);

	return db;
}
