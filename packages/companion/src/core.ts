import { ModuleFactory } from './module/module-host';
import { Collection, Db as MongoDb, MongoClient } from 'mongodb';
import {
	IBank,
	IControlDefinition,
	IDeviceConnection,
	IModule,
	ISurfaceSpace,
	ISurfaceSpacePage,
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
		surfaceSpacePages: Collection<ISurfaceSpacePage>;
	};
	io: SocketIO.Server;
	moduleFactory: ModuleFactory;
}
