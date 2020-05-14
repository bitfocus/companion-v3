import express from 'express';
import path from 'path';
import { apiRouter, socketHandler } from './routes/api-router';
import { pagesRouter } from './routes/pages-router';
import { staticsRouter } from './routes/statics-router';
import * as config from './config';
import { createDb, setupDefaultUsers } from './db';
import RxDBServerPlugin from 'rxdb/plugins/server';
import http from 'http';
import createSocketIO from 'socket.io';
import { ICore } from './core';
import { ModuleFactory } from './module/module-host';
import fs from 'fs';

// Inject asar parsing
require('asar-node').register();

console.log(`*******************************************`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`config: ${JSON.stringify(config, null, 2)}`);
console.log(`*******************************************`);

export async function startup(configPath: string) {
	console.log('loading config from:', configPath);

	// Ensure the config directory exists
	fs.mkdirSync(configPath, { recursive: true });

	// Note: rxdb uses pouchdb-all-dbs which creates a folder in the working directory. This forces that to be done where we want it
	process.chdir(configPath);

	const db = await createDb(configPath);

	const { app: dbApp, pouchApp } = RxDBServerPlugin.spawnServer.bind(db as any)({ startServer: false });

	await setupDefaultUsers(pouchApp, db);

	const app2 = express();
	app2.use('/', dbApp);
	app2.listen(Number(config.SERVER_PORT) + 1, () => {
		console.log(`Fauxton listening on port ${Number(config.SERVER_PORT) + 1}!`);
	});

	const app = express();
	const server = http.createServer(app);
	const io = createSocketIO(server);

	const moduleFactory = new ModuleFactory(configPath);

	const modules = moduleFactory.listModules();
	modules.then(modList => {
		console.log(`Discovered ${modList.length} modules:`);
		modList.forEach(m => {
			console.log(` - ${m.name}@${m.version} (${m.asarPath})`);
		});
	});

	const core: ICore = {
		db,
		io,
		moduleFactory,
	};

	app.set('view engine', 'ejs');
	app.set('views', path.join(__dirname, '../../views'));

	app.use('/assets', express.static(path.join(__dirname, '../../assets')));
	app.use('/db', dbApp);

	app.use(apiRouter(core));
	socketHandler(core);

	app.use(staticsRouter());
	app.use(pagesRouter());

	server.listen(config.SERVER_PORT, () => {
		console.log(`App listening on port ${config.SERVER_PORT}!`);
	});
}
