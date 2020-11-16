import express from 'express';
import path from 'path';
import { apiRouter, socketHandler } from './routes/api-router';
import { pagesRouter } from './routes/pages-router';
import { staticsRouter } from './routes/statics-router';
import * as config from './config';
import http from 'http';
import createSocketIO from 'socket.io';
import { ICore } from './core';
import { ModuleFactory } from './module/module-host';
import fs from 'fs';
import { MongoClient } from 'mongodb';
import { IBank, IInstance, IModule, IWorkspace } from '../shared/collections';

// Inject asar parsing
require('asar-node').register();

console.log(`*******************************************`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`config: ${JSON.stringify(config, null, 2)}`);
console.log(`*******************************************`);

export async function startup(configPath: string): Promise<void> {
	console.log('loading config from:', configPath);

	// Ensure the config directory exists
	fs.mkdirSync(configPath, { recursive: true });

	const mongoUrl = process.env.MONGO_URL;
	if (!mongoUrl) {
		// TODO - host the mongo server here..
		console.error('Embedded mongo not yet supported');
		process.exit(9);
	}

	const client = new MongoClient(mongoUrl, { useUnifiedTopology: true });
	await client.connect();

	const database = client.db(process.env.MONGO_DB ?? 'companion3');

	const app = express();
	const server = http.createServer(app);
	const io = createSocketIO(server);

	const moduleFactory = new ModuleFactory(configPath);

	const core: ICore = {
		db: database,
		models: {
			banks: database.collection<IBank>('banks'),
			instances: database.collection<IInstance>('instances'),
			modules: database.collection<IModule>('modules'),
			workspaces: database.collection<IWorkspace>('workspaces'),
		},
		io,
		moduleFactory,
	};

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
			});
		});

		await core.models.modules.insertMany(knownModules);
	});

	// setInterval(() => {
	// 	pubsub.publish('instances', {
	// 			type: 'add',
	// 			data: [{ id: Date.now(), name: 'no' + Date.now(), version: 'ob' }],
	// 	});
	// }, 1000);

	app.set('view engine', 'ejs');
	app.set('views', path.join(__dirname, '../../views'));

	app.use('/assets', express.static(path.join(__dirname, '../../assets')));

	app.use(apiRouter(core));
	socketHandler(core);

	app.use(staticsRouter());
	app.use(pagesRouter());

	await new Promise((resolve) => {
		server.listen(config.SERVER_PORT, () => {
			console.log(`App listening on port ${config.SERVER_PORT}!`);

			resolve();
		});
	});
}
