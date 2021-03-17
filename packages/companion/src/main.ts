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
import {
	CollectionId,
	IBank,
	IControlDefinition,
	IDeviceConnection,
	IModule,
	ISurfaceSpace,
	ISurfaceSpacePage,
} from '@companion/core-shared/dist/collections';
import getPort from 'get-port';
import { startMongo } from './mongo';

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
			banks: database.collection<IBank>('banks'),
			controlDefinitions: database.collection<IControlDefinition>(CollectionId.ControlDefinitions),
			deviceConnections: database.collection<IDeviceConnection>(CollectionId.Connections),
			modules: database.collection<IModule>(CollectionId.Modules),
			surfaceSpaces: database.collection<ISurfaceSpace>(CollectionId.SurfaceSpaces),
			surfaceSpacePages: database.collection<ISurfaceSpacePage>(CollectionId.SurfaceSpacePages),
		},
		io,
		moduleFactory,
	};

	// Delete all documents from 'temporary' collections
	await Promise.all([
		core.models.modules.deleteMany({}),
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

	app.use(apiRouter(core));
	socketHandler(core);

	app.use(staticsRouter());

	await new Promise<void>((resolve) => {
		server.listen(config.SERVER_PORT, () => {
			console.log(`App listening on port ${config.SERVER_PORT}!`);

			resolve();
		});
	});
}
