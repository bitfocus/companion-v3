const concurrently = require('concurrently');
const path = require('path');

require('ts-node').register({
	project: './packages/companion/src/server/tsconfig.json',
});

const { startMongo } = require('../packages/companion/src/server/mongo');

(async () => {
	try {
		/** Startup mongo */
		const dataPath = path.join(__dirname, '../packages/companion/userdata/');
		const mongoUrl = await startMongo(dataPath, path.join(__dirname, '..'), '127.0.0.1', 27017);

		/** The rest */

		console.log('Running preparation steps');
		await concurrently(
			[
				{
					command: 'yarn workspace @companion/module-framework bundle',
					name: 'FRAMEWORK',
				},
				{
					command: 'yarn workspace @companion/core-shared build',
					name: 'CORE-SHARED',
				},
			],
			{
				prefix: 'name',
				killOthers: ['failure', 'success'],
				restartTries: 3,
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
					command: 'yarn workspace @companion/core-shared watch',
					name: 'CORE-SHARED',
				},
				{
					command: `yarn workspace companion3 ${process.env.ELECTRON ? 'dev-electron' : 'dev-server'}`,
					name: 'SERVER',
					prefixColor: 'bgBlue.bold',
					env: {
						MONGO_URL: mongoUrl,
						DEVELOPER: 1,
					},
				},
				{
					command: 'yarn workspace @companion/webui start',
					name: 'CLIENT',
					prefixColor: 'bgGreen.bold',
					env: {
						BROWSER: 'none',
						PORT: 8085,
						// REACT_APP_SERVER_URL: 'http://localhost:3001',
					},
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
