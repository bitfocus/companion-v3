import { RxDatabase, PouchDB, createRxDatabase, addRxPlugin } from 'rxdb';
import * as RxDBServerPlugin from 'rxdb/plugins/server';
import MemoryAdapter from 'pouchdb-adapter-memory';
import LevelDbAdapter from 'pouchdb-adapter-leveldb';
import path from 'path';
import fs from 'fs';

import { CollectionCreator, ICollections } from '../shared/collections';

// eslint-disable-next-line @typescript-eslint/no-var-requires
PouchDB.plugin(require('pouchdb-security'));
addRxPlugin(RxDBServerPlugin);
PouchDB.plugin(MemoryAdapter);
PouchDB.plugin(LevelDbAdapter);

export async function createDb(configPath: string): Promise<RxDatabase<ICollections>> {
	fs.mkdirSync(path.join(configPath, 'db'), {
		recursive: true,
	});

	const dbPath = path.join(configPath, 'db/companion');
	const db = await createRxDatabase<ICollections>({
		name: dbPath,
		adapter: 'leveldb',
	});

	console.log(`DatabaseService: create collections at ${dbPath}`);
	await Promise.all(
		CollectionCreator.map((colData) =>
			db.collection(colData).then((col) =>
				(col.pouch as any).putSecurity({
					admins: { names: ['admin'] },
					members: { roles: ['authenticated'] },
				}),
			),
		),
	);

	// TODO - block user signups.

	return db;
}

export async function setupDefaultUsers(pouchApp: any, db: RxDatabase<ICollections>): Promise<void> {
	// Load in an default admin users
	if (!Object.keys(pouchApp.couchConfig.getSection('admins')).length) {
		console.log('Creating default admin user');

		// const usersDb = db.users.pouch as any;
		const adminDetails = await require('pouchdb-auth').hashAdminPasswords({
			admin: 'admin', // TODO - better/random password
		});

		await Promise.all(
			Object.keys(adminDetails).map(
				(name) =>
					new Promise((resolve) => {
						pouchApp.couchConfig.set('admins', name, adminDetails[name], resolve);
					}),
			),
		);
	}

	// TODO - create default user
}
