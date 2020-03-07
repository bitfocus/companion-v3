import RxDB, { RxDatabase } from 'rxdb';
import { ICollections, CollectionCreator } from '../shared/collections';
import IdbAdapter from 'pouchdb-adapter-idb';
import HttpAdapter from 'pouchdb-adapter-http';

// RxDB.QueryChangeDetector.enableDebugging();

RxDB.plugin(IdbAdapter);
RxDB.plugin(HttpAdapter); //enable syncing over http

(window as any).resetDatabase = function() {
	RxDB.removeDatabase('companion3', 'idb');
};

const syncURL = `${window.location.protocol}//${window.location.host}/db/`;
console.log('host: ' + syncURL);

let dbPromise: Promise<RxDatabase<ICollections>> | null = null;

const _create = async () => {
	console.log('DatabaseService: creating database..');
	const db = await RxDB.create<ICollections>({ name: 'companion3', adapter: 'idb' });
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
		.map(colName =>
			(db as any)[colName].sync({
				remote: syncURL + colName + '/',
			}),
		);

	return db;
};

export const get = () => {
	if (!dbPromise) dbPromise = _create();
	return dbPromise;
};
