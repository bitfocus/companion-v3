import { ModuleFactory } from './module/module-host';
import { Collection, Db as MongoDb } from 'mongodb';
import { IBank, IInstance, IModule, IWorkspace } from '../shared/collections';

export interface ICore {
	db: MongoDb;
	models: {
		banks: Collection<IBank>;
		instances: Collection<IInstance>;
		modules: Collection<IModule>;
		workspaces: Collection<IWorkspace>;
	};
	io: SocketIO.Server;
	moduleFactory: ModuleFactory;
}
