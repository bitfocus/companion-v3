import { ModuleFactory } from './module/module-host';
import { Collection, Db as MongoDb } from 'mongodb';
import { IBank, IDeviceConnection, IModule, IWorkspace } from '@companion/core-shared/dist/collections';
import SocketIO from 'socket.io';

export interface ICore {
	db: MongoDb;
	models: {
		banks: Collection<IBank>;
		deviceConnections: Collection<IDeviceConnection>;
		modules: Collection<IModule>;
		workspaces: Collection<IWorkspace>;
	};
	io: SocketIO.Server;
	moduleFactory: ModuleFactory;
}
