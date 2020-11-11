import bodyParser from 'body-parser';
import { Router } from 'express';
import { ICore } from '../core';
import { SocketCommand } from '../../shared/api';

export function apiRouter(core: ICore): Router {
	const router = Router();
	router.use(bodyParser.json());

	router.get('/api/users', async (req, res) => {
		const items = await core.db.workspaces.find().exec();
		res.json(items);
	});

	router.get('/api/user/:userId', async (req, res) => {
		const userId = req.params.userId;
		const item = await core.db.workspaces.findOne({ selector: { _id: userId } }).exec();
		res.json(item);
	});

	router.post('/api/set-user', (req, res) => {
		res.send(`ok`);
	});

	return router;
}

export function socketHandler(core: ICore): void {
	core.io.on('connection', (socket) => {
		console.log('a user connected');

		// socket.on(SocketCommand.ExecuteCommand, ({ action, cmd }: { action: ExecuteAction; cmd: IRundownItem }) => {
		// 	try {
		// 		console.log('exec cmd', action, cmd);

		// 		// TODO
		// 	} catch (err) {
		// 		console.error(`ExecuteCommand failed: ${err}`);
		// 	}
		// });
	});
}
