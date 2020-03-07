import { ICollections } from '../shared/collections';
import { RxDatabase } from 'rxdb';

export interface ICore {
	db: RxDatabase<ICollections>;
	io: SocketIO.Server;
	// connections: ConnectionStore;
}
