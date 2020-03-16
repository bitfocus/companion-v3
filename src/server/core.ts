import { ICollections } from '../shared/collections';
import { RxDatabase } from 'rxdb';
import { ModuleFactory } from './module/module-host';

export interface ICore {
	db: RxDatabase<ICollections>;
	io: SocketIO.Server;
	moduleFactory: ModuleFactory;
}
