const concurrently = require('concurrently');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

/** Startup mongo */
const mongoDir = path.join(__dirname, '../tools/mongodb/', `${process.platform}-${process.arch}`, 'bin');
let mongoPath = path.join(mongoDir, 'mongod');
let mongoClientPath = path.join(mongoDir, 'mongo');
if (process.platform === 'win32') {
	mongoPath += '.exe';
	mongoClientPath += '.exe';
}

if (!fs.existsSync(mongoPath)) {
	throw `Could not find mongod at: ${mongoPath}`;
}
console.log('found mongod executable:', mongoPath);

const dataPath = path.join(__dirname, '../packages/companion/userdata/mongodb');
console.log('Using mongod data directory: ' + dataPath);
fs.mkdirSync(dataPath, { recursive: true });

const mongoProcess = spawn(mongoPath, ['--dbpath', dataPath, '--bind_ip', '127.0.0.1', '--replSet', 'rs0']);
mongoProcess.stdout.on('data', (data) => {
	console.log('[MONGOD-STDOUT]', data.toString());
});
mongoProcess.stderr.on('data', (data) => {
	console.error('[MONGOD-STDERR]', data.toString());
});
mongoProcess.on('exit', (code) => {
	console.log('[MONGOD-EXIT]', code.toString());
	process.exit(code);
});
process.on('exit', () => {
	mongoProcess.kill();
});

/** The rest */
(async () => {
	try {
		console.log('Running preparation steps');
		await concurrently(
			[
				{
					command: 'yarn workspace @companion/module-framework bundle',
					name: 'FRAMEWORK',
				},
			],
			{
				prefix: 'name',
				killOthers: ['failure', 'success'],
				restartTries: 3,
			},
		);

		console.log('Configure mongo');
		await concurrently(
			[
				{
					command: `${mongoClientPath} --eval "rs.initiate()"`,
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

		console.log('Starting application');
		// Now run everything
		await concurrently(
			[
				{
					command: 'yarn workspace @companion/module-framework watch',
					name: 'FRAMEWORK',
				},
				{
					command: `yarn workspace companion3 ${process.env.ELECTRON ? 'dev-electron' : 'dev-server'}`,
					name: 'SERVER',
					prefixColor: 'bgBlue.bold',
					env: {
						MONGO_URL: `mongodb://127.0.0.1:27017?retryWrites=true&w=majority`,
						DEVELOPER: 1,
					},
				},
				{
					command: 'yarn workspace companion3 dev-client',
					name: 'CLIENT',
					prefixColor: 'bgGreen.bold',
				},
			],
			{
				prefix: 'name',
				killOthers: ['failure', 'success'],
				restartTries: 3,
			},
		);
		console.log('Done!');
		process.exit();
	} catch (err) {
		console.error(`Failure: ${err}`);
		process.exit(1);
	}
})();
