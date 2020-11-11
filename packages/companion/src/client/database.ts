import { RxDatabase, RxCollection, PouchDB, removeRxDatabase, createRxDatabase } from 'rxdb';
import { ICollections, CollectionCreator } from '../shared/collections';
import IdbAdapter from 'pouchdb-adapter-idb';
import HttpAdapter from 'pouchdb-adapter-http';

// RxDB.QueryChangeDetector.enableDebugging();

PouchDB.plugin(IdbAdapter);
PouchDB.plugin(HttpAdapter); //enable syncing over http
// eslint-disable-next-line @typescript-eslint/no-var-requires
PouchDB.plugin(require('pouchdb-auth'));

const syncURL = `${window.location.protocol}//${window.location.host}/db/`;
console.log('host: ' + syncURL);

export class DatabaseManager {
	private authDb: any | null;
	private mainDb: RxDatabase<ICollections> | null = null;
	private loginPromise: Promise<void> | null = null;
	private logoutPromise: Promise<void> | null = null;
	private _isLoggedIn: boolean = false;

	constructor() {
		this.authDb = new PouchDB(`${syncURL}_users`, {
			skip_setup: true,
		});

		this.authDb
			.useAsAuthenticationDB({
				isOnlineAuthDB: true,
				timeout: 0,
			})
			.catch((e: any) => {
				console.error(`Failed to setup authdb: ${e}`);
			});
	}

	public pendingLogin(): boolean {
		return !!this.loginPromise;
	}
	public pendingLogout(): boolean {
		return !!this.logoutPromise;
	}
	public isLoggedIn(): boolean {
		return this._isLoggedIn;
	}

	public async sessionName(): Promise<string | null> {
		const session = await this.authDb.session();
		return session.userCtx.name;
	}

	public login(username: string, password: string): Promise<void> | null {
		if (this.loginPromise) {
			// 'fail' in case username/password are different
			return null;
		} else if (this.logoutPromise) {
			return null;
		} else {
			this.mainDb = null;
			this.loginPromise = this.authDb.logIn(username, password).then(async (v: any) => {
				// Cleanup
				this.loginPromise = null;
				this._isLoggedIn = true;
				const name: string = v.name;
				const db = (this.mainDb = await this.createDatabase());

				return {
					name,
					db,
				};
			});
			return this.loginPromise;
		}
	}

	public logout(): Promise<void> | null {
		if (this.logoutPromise) {
			return this.logoutPromise;
		} else if (this.loginPromise) {
			return null;
		} else {
			this.mainDb = null;
			this._isLoggedIn = false;
			this.logoutPromise = this.authDb.logOut().then(async () => {
				// Cleanup
				this.logoutPromise = null;
				await removeRxDatabase('companion3', 'idb');
			});
			return this.logoutPromise;
		}
	}

	public getDatabase(): RxDatabase<ICollections> | null {
		return this.mainDb;
	}

	private async createDatabase() {
		// cleanup old data on connect, to ensure we dont try to push anything
		console.log('DatabaseService: purging old');
		await removeRxDatabase('companion3', 'idb');

		console.log('DatabaseService: creating database..');
		const db = await createRxDatabase<ICollections>({
			name: 'companion3',
			adapter: 'idb',
			pouchSettings: {
				skip_setup: true,
			},
		});
		console.log('DatabaseService: created database');

		// show leadership in title
		db.waitForLeadership().then(() => {
			console.log('isLeader now');
			document.title = '♛ ' + document.title;
		});

		// create collections
		console.log('DatabaseService: create collections');
		await Promise.all(CollectionCreator.map((colData) => db.collection(colData)));

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
			.map((col) => col.name)
			.map((collectionName) =>
				((db as any)[collectionName] as RxCollection).sync({
					remote: syncURL + collectionName + '/',
				}),
			);

		return db;
	}
}
