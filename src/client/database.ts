import RxDB, { RxDatabase, RxCollection } from 'rxdb';
import { ICollections, CollectionCreator } from '../shared/collections';
import IdbAdapter from 'pouchdb-adapter-idb';
import HttpAdapter from 'pouchdb-adapter-http';

// RxDB.QueryChangeDetector.enableDebugging();

RxDB.plugin(IdbAdapter);
RxDB.plugin(HttpAdapter); //enable syncing over http
// eslint-disable-next-line @typescript-eslint/no-var-requires
RxDB.PouchDB.plugin(require('pouchdb-auth'));

const syncURL = `${window.location.protocol}//${window.location.host}/db/`;
console.log('host: ' + syncURL);

let authDbPromise: Promise<RxDatabase<ICollections>> | null = null;
const _createAuthDb = async () => {
	const authDb: any = new RxDB.PouchDB(`${syncURL}_users`, {
		// eslint-disable-next-line @typescript-eslint/camelcase
		skip_setup: true,
	});

	await authDb.useAsAuthenticationDB({
		isOnlineAuthDB: true,
		timeout: 0,
	});

	return authDb;
};

export const getAuthDb = () => {
	if (!authDbPromise) authDbPromise = _createAuthDb();
	return authDbPromise;
};

let dbPromise: Promise<RxDatabase<ICollections>> | null = null;

const _create = async () => {
	// cleanup old data on connect, to ensure we dont try to push anything
	console.log('DatabaseService: purging old');
	await RxDB.removeDatabase('companion3', 'idb');

	console.log('DatabaseService: creating database..');
	const db = await RxDB.create<ICollections>({
		name: 'companion3',
		adapter: 'idb',
		pouchSettings: {
			// eslint-disable-next-line @typescript-eslint/camelcase
			skip_setup: true,
		},
	});
	console.log('DatabaseService: created database');
	(window as any)['db'] = db; // write to window for debugging

	// show leadership in title
	db.waitForLeadership().then(() => {
		console.log('isLeader now');
		document.title = '♛ ' + document.title;
	});

	// create collections
	console.log('DatabaseService: create collections');
	await Promise.all(CollectionCreator.map(colData => db.collection(colData)));

	// // hooks
	// console.log('DatabaseService: add hooks');
	// db.collections.heroes.preInsert(docObj => {
	//     const { color } = docObj;
	//     return db.collections.heroes.findOne({color}).exec().then(has => {
	//         if (has != null) {
	//             alert('another hero already has the color ' + color);
	//             throw new Error('color already there');
	//         }
	//         return db;
	//     });
	// }, false);

	// sync
	console.log('DatabaseService: sync');
	CollectionCreator
		// .filter(col => col.sync)
		.map(col => col.name)
		.map(collectionName =>
			((db as any)[collectionName] as RxCollection).sync({
				remote: syncURL + collectionName + '/',
			}),
		);

	(window as any).db = db;
	return db;
};

export const get = () => {
	if (!dbPromise) dbPromise = _create();
	return dbPromise;
};
