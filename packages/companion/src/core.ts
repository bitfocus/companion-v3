import { ModuleFactory } from './module/module-host';
import { Collection, Db as MongoDb, MongoClient } from 'mongodb';
import {
	IControlDefinition,
	IControlRender,
	IDeviceConnection,
	IModule,
	ISurfaceDevice,
	ISurfaceSpace,
} from '@companion/core-shared/dist/collections';
import SocketIO from 'socket.io';

export interface ICore {
	client: MongoClient;
	db: MongoDb;
	models: {
		controlDefinitions: Collection<IControlDefinition>;
		deviceConnections: Collection<IDeviceConnection>;
		modules: Collection<IModule>;
		surfaceDevices: Collection<ISurfaceDevice>;
		surfaceSpaces: Collection<ISurfaceSpace>;

		controlRenders: Collection<IControlRender>;
	};
	io: SocketIO.Server;
	moduleFactory: ModuleFactory;
}
