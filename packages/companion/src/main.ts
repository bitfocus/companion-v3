import express from 'express';
import path from 'path';
import { apiRouter, socketHandler } from './routes/api-router.js';
import { staticsRouter } from './statics-router.js';
import * as config from './config.js';
import http from 'http';
import * as SocketIO from 'socket.io';
import { ICore } from './core.js';
import { ModuleRegistry } from './services/module-registry.js';
import fs from 'fs';
import Mongo from 'mongodb';
import { CollectionId } from '@companion/core-shared/dist/collections/index.js';
import getPort from 'get-port';
import { startMongo } from './mongo.js';
import { startControlRenderer } from './services/renderer.js';
import { startSurfaceManager } from './services/surfaces.js';
import { startModuleHost } from './services/module-host.js';

console.log(`*******************************************`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`config: ${JSON.stringify(config, null, 2)}`);
console.log(`*******************************************`);

export async function startup(configPath: string, appPath: string): Promise<void> {
	console.log('loading config from:', configPath);

	// Ensure the config directory exists
	fs.mkdirSync(configPath, { recursive: true });

	let mongoUrl = process.env.MONGO_URL;
	if (!mongoUrl) {
		console.log('Starting embedded mongo server');

		const mongoPort = await getPort({ port: getPort.makeRange(27017, 28000) });
		mongoUrl = await startMongo(configPath, path.join(appPath, '../..'), '127.0.0.1', mongoPort);
	}

	const client = new Mongo.MongoClient(mongoUrl, { useUnifiedTopology: true, w: 'majority', j: false });
	await client.connect();

	const database = client.db(process.env.MONGO_DB ?? 'companion3');

	const app = express();
	const server = http.createServer(app);
	const io = new SocketIO.Server(server, {
		cors: {
			origin: 'http://localhost:3000',
			methods: ['GET', 'POST'],
		},
	});

	const moduleFactory = new ModuleRegistry(configPath);

	const core: ICore = {
		db: database,
		client: client,
		models: {
			controlDefinitions: database.collection(CollectionId.ControlDefinitions),
			controlRenders: database.collection(CollectionId.ControlRenders),
			deviceConnections: database.collection(CollectionId.Connections),
			deviceConnectionActions: database.collection(CollectionId.ConnectionActions),
			modules: database.collection(CollectionId.Modules),
			surfaceDevices: database.collection(CollectionId.SurfaceDevices),
			surfaceSpaces: database.collection(CollectionId.SurfaceSpaces),
		},
		io,
	};

	// Delete all documents from 'temporary' collections
	// TODO - this is a bit excessive maybe? what about multi-node setups?
	await Promise.all([
		core.models.modules.deleteMany({}),
		core.models.controlRenders.deleteMany({}),
		core.models.deviceConnectionActions.deleteMany({}),
		// TODO add more here
	]);

	// Update the list of modules
	await moduleFactory.rescanModules(core.models.modules).catch((e) => {
		console.error(`Module scan failed: ${e}`);
	});

	// Hack: temporarily fake some actions
	core.models.deviceConnections
		.find()
		.forEach(async (connection) => {
			await core.models.deviceConnectionActions.replaceOne(
				{ _id: 'test1' },
				{
					_id: 'test1',
					connectionId: connection._id,
					actionId: 'test1',
					rawAction: {
						label: 'Test 1',
						options: [],
					},
				},
				{ upsert: true },
			);
			await core.models.deviceConnectionActions.replaceOne(
				{ _id: 'test2' },
				{
					_id: 'test2',
					connectionId: connection._id,
					actionId: 'test2',
					rawAction: {
						label: 'Test 2',
						options: [
							{
								id: 'one',
								label: 'One',
								type: 'textinput',
								default: 'abc',
							},
						],
					},
				},
				{ upsert: true },
			);
		})
		.catch((e) => console.error(e));

	// start the various services
	await startControlRenderer(core);
	const surfaceManager = await startSurfaceManager(core);
	await startModuleHost(core);

	app.use(apiRouter(core));
	socketHandler(core, surfaceManager);

	app.use(await staticsRouter());

	await new Promise<void>((resolve) => {
		server.listen(config.SERVER_PORT, () => {
			console.log(`App listening on port ${config.SERVER_PORT}!`);

			resolve();
		});
	});
}
