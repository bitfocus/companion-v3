import express from 'express';
import path from 'path';
import { apiRouter, socketHandler } from './routes/api-router';
import { pagesRouter } from './routes/pages-router';
import { staticsRouter } from './routes/statics-router';
import * as config from './config';
import { createDb } from './db';
import RxDBServerPlugin from 'rxdb/plugins/server';
import http from 'http';
import createSocketIO from 'socket.io';
import { ICore } from './core';
import { loadModulesFromDirectory } from './module/module-host';

console.log(`*******************************************`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`config: ${JSON.stringify(config, null, 2)}`);
console.log(`*******************************************`);

export async function startup(configPath: string) {
	console.log('loading config from:', configPath)

	// Note: rxdb uses pouchdb-all-dbs which creates a folder in the working directory. This forces that to be done where we want it
	process.chdir(configPath)

	const db = await createDb(configPath);
	// const connections = new ConnectionStore();

	const { app: dbApp } = RxDBServerPlugin.spawnServer.bind(db as any)({ startServer: false });

	const app = express();
	const server = http.createServer(app);
	const io = createSocketIO(server);

	// loadModulesFromDirectory()

	const core: ICore = {
		db: db,
		io: io,
		// connections: connections,
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
