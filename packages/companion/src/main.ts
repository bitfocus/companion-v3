import express from 'express';
import path from 'path';
import { apiRouter, socketHandler } from './routes/api-router';
import { staticsRouter } from './statics-router';
import * as config from './config';
import http from 'http';
import SocketIO from 'socket.io';
import { ICore } from './core';
import { ModuleFactory } from './module/module-host';
import fs from 'fs';
import { MongoClient } from 'mongodb';
import { CollectionId, IModule } from '@companion/core-shared/dist/collections';
import getPort from 'get-port';
import { startMongo } from './mongo';
import { startControlRenderer } from './services/renderer';
import { startSurfaceManager } from './services/surfaces';

// Inject asar parsing
require('asar-node').register();

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

	const client = new MongoClient(mongoUrl, { useUnifiedTopology: true });
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

	const moduleFactory = new ModuleFactory(configPath);

	const core: ICore = {
		db: database,
		client: client,
		models: {
			controlDefinitions: database.collection(CollectionId.ControlDefinitions),
			controlRenders: database.collection(CollectionId.ControlRenders),
			deviceConnections: database.collection(CollectionId.Connections),
			modules: database.collection(CollectionId.Modules),
			surfaceDevices: database.collection(CollectionId.SurfaceDevices),
			surfaceSpaces: database.collection(CollectionId.SurfaceSpaces),
		},
		io,
		moduleFactory,
	};

	// Delete all documents from 'temporary' collections
	// TODO - this is a bit excessive maybe? what about multi-node setups?
	await Promise.all([
		core.models.modules.deleteMany({}),
		core.models.controlRenders.deleteMany({}),
		// TODO add more here
	]);

	const modules = moduleFactory.listModules();
	modules.then(async (modList) => {
		console.log(`Discovered ${modList.length} modules:`);

		const knownModules: IModule[] = [];
		modList.forEach((m) => {
			console.log(` - ${m.name}@${m.version} (${m.asarPath})`);
			knownModules.push({
				_id: m.name,
				name: m.name,
				version: m.version,
				asarPath: m.asarPath,
				isSystem: false, // TODO

				products: [m.name],
				manufacturer: m.name,

				hasHelp: true,
				keywords: [],
			});
		});

		await core.models.modules.insertMany(knownModules);
	});

	// start the various services
	await startControlRenderer(core);
	const surfaceManager = await startSurfaceManager(core);

	app.use(apiRouter(core));
	socketHandler(core, surfaceManager);

	app.use(staticsRouter());

	await new Promise<void>((resolve) => {
		server.listen(config.SERVER_PORT, () => {
			console.log(`App listening on port ${config.SERVER_PORT}!`);

			resolve();
		});
	});
}
