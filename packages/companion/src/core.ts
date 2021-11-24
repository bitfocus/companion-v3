import Mongo from 'mongodb';
import {
	IControlDefinition,
	IControlRender,
	IDeviceConnection,
	IDeviceConnectionAction,
	IDeviceConnectionFeedback,
	IDeviceConnectionProperty,
	IDeviceConnectionStatus,
	IModule,
	ISurfaceDevice,
	ISurfaceSpace,
} from '@companion/core-shared/dist/collections/index.js';
import * as SocketIO from 'socket.io';
import { IDeviceConnectionWorkTask } from './internal/connection-work.js';
import { assertNever } from '@companion/module-framework';
import Bson from 'bson';
import { IControlStatus } from './internal/control-status.js';

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
		controlStatus: Mongo.Collection<IControlStatus>;
		deviceConnectionStatuses: Mongo.Collection<IDeviceConnectionStatus>;
		deviceConnectionActions: Mongo.Collection<IDeviceConnectionAction>;
		deviceConnectionFeedbacks: Mongo.Collection<IDeviceConnectionFeedback>;
		deviceConnectionProperties: Mongo.Collection<IDeviceConnectionProperty>;
		deviceConnectionWorkTasks: Mongo.Collection<IDeviceConnectionWorkTask>;
	};
	io: SocketIO.Server;
	// moduleFactory: ModuleRegistry;
}

interface WatchCollectionCallbacks<T> {
	onInsert: ((evt: Mongo.ChangeStreamDocument<T>) => void) | null;
	onReplace: ((evt: Mongo.ChangeStreamDocument<T>) => void) | null;
	onUpdate: ((evt: Mongo.ChangeStreamDocument<T>) => void) | null;
	onDelete: ((evt: Mongo.ChangeStreamDocument<T>) => void) | null;
}

export function watchCollection<T extends object>(
	collection: Mongo.Collection<T>,
	pipeline: undefined,
	cbs: WatchCollectionCallbacks<T>,
): void {
	const stream = collection.watch(pipeline);

	stream.on('end', () => {
		console.warn('Connections stream closed. Aborting');
		process.exit(9);
	});

	stream.on('change', (doc) => {
		switch (doc.operationType) {
			case 'insert':
				cbs.onInsert?.(doc);
				break;
			case 'replace':
				cbs.onReplace?.(doc);
				break;
			case 'update':
				cbs.onUpdate?.(doc);
				break;
			case 'delete':
				cbs.onDelete?.(doc);
				break;
			case 'drop':
			case 'dropDatabase':
			case 'rename':
			case 'invalidate':
				console.error('Change stream lost database or collection. Aborting');
				process.exit(9);
				break;
			default:
				assertNever(doc.operationType);
		}
	});
}

export function generateDocumentId(): string {
	return new Bson.ObjectID().toHexString();
}
