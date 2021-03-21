import { ModuleFactory } from './module/module-host';
import { Collection, Db as MongoDb, MongoClient } from 'mongodb';
import {
	IBank,
	IControlDefinition,
	IControlRender,
	IDeviceConnection,
	IModule,
	ISurfaceSpace,
} from '@companion/core-shared/dist/collections';
import SocketIO from 'socket.io';

export interface ICore {
	client: MongoClient;
	db: MongoDb;
	models: {
		banks: Collection<IBank>;
		controlDefinitions: Collection<IControlDefinition>;
		deviceConnections: Collection<IDeviceConnection>;
		modules: Collection<IModule>;
		surfaceSpaces: Collection<ISurfaceSpace>;

		controlRenders: Collection<IControlRender>;
	};
	io: SocketIO.Server;
	moduleFactory: ModuleFactory;
}
