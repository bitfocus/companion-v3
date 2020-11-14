import { ModuleFactory } from './module/module-host';
import { Db as MongoDb } from 'mongodb';

export interface ICore {
	db: MongoDb;
	io: SocketIO.Server;
	moduleFactory: ModuleFactory;
}
