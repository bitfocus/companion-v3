import React from 'react';
import { AuthStatusContext, BackendLinkContext } from './BackendContext';

// export const syncURL = `${window.location.protocol}//${window.location.host}/db/`;
// console.log('host: ' + syncURL);

interface AuthComponentProps {
	socket: SocketIOClient.Socket;
}
interface AuthComponentState {
	loginPromise: Promise<void> | null;
	logoutPromise: Promise<void> | null;
	isLoggedIn: boolean;
	database: /*RxDatabase<ICollections> |*/ null;
}

export class AuthComponentWrapper extends React.Component<AuthComponentProps, AuthComponentState> {
	// private readonly authDb = new PouchDB(`${syncURL}_users`, {
	// 	skip_setup: true,
	// });

	constructor(props: AuthComponentProps) {
		super(props);

		this.state = {
			loginPromise: null,
			logoutPromise: null,
			isLoggedIn: false,
			database: null,
		};

		// this.authDb
		// 	.useAsAuthenticationDB({
		// 		isOnlineAuthDB: true,
		// 		timeout: 0,
		// 	})
		// 	.catch((e: any) => {
		// 		console.error(`Failed to setup authdb: ${e}`);
		// 	});

		(window as any).db = this; // TODO - temporary

		this.login = this.login.bind(this);
		this.logout = this.logout.bind(this);
	}

	public login(username: string, password: string): Promise<void> | null {
		if (this.state.loginPromise) {
			// 'fail' in case username/password are different
			return null;
		} else if (this.state.logoutPromise) {
			return null;
		} else {
			// TODO - reimplement
			this.setState({
				isLoggedIn: true,
			});
			return Promise.resolve();
			// const prom = this.authDb.logIn(username, password).then(async (v: any) => {
			// 	// Cleanup

			// 	const name: string = v.name;
			// 	const db = await this.createDatabase();
			// 	this.setState({
			// 		loginPromise: null,
			// 		isLoggedIn: true,
			// 		database: db,
			// 	});

			// 	return {
			// 		name,
			// 		db,
			// 	};
			// });
			// this.setState({
			// 	loginPromise: prom,
			// 	// database: null,
			// });
			// return prom;
		}
	}

	public logout(): Promise<void> | null {
		if (this.state.logoutPromise) {
			return this.state.logoutPromise;
		} else if (this.state.loginPromise) {
			return null;
		} else {
			// TODO - reimplement
			this.setState({
				isLoggedIn: false,
			});
			return Promise.resolve();
			// const prom = this.authDb.logOut().then(async () => {
			// 	// Cleanup
			// 	this.setState({
			// 		logoutPromise: null,
			// 	});
			// 	await removeRxDatabase('companion3', 'idb');
			// });
			// this.setState({
			// 	logoutPromise: prom,
			// 	isLoggedIn: false,
			// 	database: null,
			// });
			// return prom;
		}
	}

	// private async createDatabase() {
	// 	// cleanup old data on connect, to ensure we dont try to push anything
	// 	console.log('DatabaseService: purging old');
	// 	// await removeRxDatabase('companion3', 'idb');
	// 	// TODO - fix this, but only if not another tab open/causing the sync

	// 	console.log('DatabaseService: creating database..');
	// 	const db = await createRxDatabase<ICollections>({
	// 		name: 'companion3',
	// 		adapter: 'idb',
	// 		multiInstance: true,
	// 		pouchSettings: {
	// 			skip_setup: true,
	// 		},
	// 	});
	// 	console.log('DatabaseService: created database');

	// 	// show leadership in title
	// 	db.waitForLeadership().then(() => {
	// 		console.log('isLeader now');
	// 		document.title = '♛ ' + document.title;
	// 	});

	// 	// create collections
	// 	console.log('DatabaseService: create collections');
	// 	await Promise.all(
	// 		CollectionCreator.map((colData) => {
	// 			const pouchSettings = colData.pouchSettings as any;
	// 			if (pouchSettings && pouchSettings.adapter) {
	// 				// We should always use idb on the client
	// 				delete pouchSettings.adapter;
	// 			}
	// 			return db.collection(colData);
	// 		}),
	// 	);

	// 	// // hooks
	// 	// console.log('DatabaseService: add hooks');
	// 	// db.collections.heroes.preInsert(docObj => {
	// 	//     const { color } = docObj;
	// 	//     return db.collections.heroes.findOne({color}).exec().then(has => {
	// 	//         if (has != null) {
	// 	//             alert('another hero already has the color ' + color);
	// 	//             throw new Error('color already there');
	// 	//         }
	// 	//         return db;
	// 	//     });
	// 	// }, false);

	// 	// sync
	// 	console.log('DatabaseService: sync');
	// 	CollectionCreator
	// 		// .filter(col => col.sync)
	// 		.map((col) => col.name)
	// 		.map((collectionName) =>
	// 			((db as any)[collectionName] as RxCollection).sync({
	// 				remote: syncURL + collectionName + '/',
	// 			}),
	// 		);

	// 	return db;
	// }

	render(): React.ReactElement {
		return (
			<BackendLinkContext.Provider value={{ socket: this.props.socket, db: this.state.database }}>
				<AuthStatusContext.Provider
					value={{
						pendingLogin: !!this.state.loginPromise,
						pendingLogout: !!this.state.logoutPromise,
						isLoggedIn: this.state.isLoggedIn,
						doLogin: this.login,
						doLogout: this.logout,
					}}
				>
					{this.props.children}
				</AuthStatusContext.Provider>
			</BackendLinkContext.Provider>
		);
	}
}
