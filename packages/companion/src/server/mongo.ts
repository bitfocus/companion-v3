import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import concurrently = require('concurrently');
import { IS_PACKAGED } from './config';

export async function startMongo(configPath: string, rootPath: string, host: string, port: number): Promise<string> {
	const mongoDir = IS_PACKAGED
		? path.join(rootPath, 'mongodb/bin')
		: path.join(rootPath, 'tools/mongodb', `${process.platform}-${process.arch}`, 'bin');

	let mongoPath = path.join(mongoDir, 'mongod');
	let mongoClientPath = path.join(mongoDir, 'mongo');
	if (process.platform === 'win32') {
		mongoPath += '.exe';
		mongoClientPath += '.exe';
	}

	if (!fs.existsSync(mongoPath)) {
		throw `Could not find mongod at: ${mongoPath}`;
	}
	if (!fs.existsSync(mongoClientPath)) {
		throw `Could not find mongo at: ${mongoClientPath}`;
	}
	console.log('found mongod executable:', mongoPath);

	const dataPath = path.join(configPath, 'mongodb');
	console.log('Using mongod data directory: ' + dataPath);
	fs.mkdirSync(dataPath, { recursive: true });

	const mongoProcess = spawn(mongoPath, [
		'--dbpath',
		dataPath,
		'--bind_ip',
		host,
		'--replSet',
		'rs0',
		'--port',
		`${port}`,
	]);
	mongoProcess.stdout.on('data', (data) => {
		console.log('[MONGOD-STDOUT]', data.toString());
	});
	mongoProcess.stderr.on('data', (data) => {
		console.error('[MONGOD-STDERR]', data.toString());
	});
	mongoProcess.on('exit', (code) => {
		console.log('[MONGOD-EXIT]', code?.toString());
		process.exit(code ?? 1);
	});
	process.on('exit', () => {
		mongoProcess.kill();
	});

	await concurrently(
		[
			{
				command: `${mongoClientPath} --eval "rs.initiate()" --port ${port}`,
				name: 'MONGO-INIT',
			},
		],
		{
			prefix: 'name',
			killOthers: ['failure', 'success'],
			restartTries: 5,
			restartDelay: 1000,
		},
	);

	return `mongodb://${host}:${port}?retryWrites=true&w=majority`;
}
