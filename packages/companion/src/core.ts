import Mongo from 'mongodb';
import {
	IControlDefinition,
	IControlRender,
	IDeviceConnection,
	IDeviceConnectionAction,
	IModule,
	ISurfaceDevice,
	ISurfaceSpace,
} from '@companion/core-shared/dist/collections/index.js';
import * as SocketIO from 'socket.io';

export interface ICore {
	client: Mongo.MongoClient;
	db: Mongo.Db;
	models: {
		controlDefinitions: Mongo.Collection<IControlDefinition>;
		deviceConnections: Mongo.Collection<IDeviceConnection>;
		modules: Mongo.Collection<IModule>;
		surfaceDevices: Mongo.Collection<ISurfaceDevice>;
		surfaceSpaces: Mongo.Collection<ISurfaceSpace>;

		controlRenders: Mongo.Collection<IControlRender>;
		deviceConnectionActions: Mongo.Collection<IDeviceConnectionAction>;
	};
	io: SocketIO.Server;
	// moduleFactory: ModuleRegistry;
}
