import bodyParser from 'body-parser';
import { Router } from 'express';
import { ICore } from '../core';
import { SocketCommand, ExecuteAction } from '../../shared/api';
import { IRundownItem, RundownItemType, SomeRundownItemContent } from '../../shared/collections';

export function apiRouter(core: ICore) {
	const router = Router();
	router.use(bodyParser.json());

	router.get('/api/users', async (req, res) => {
		const items = await core.db.rundown_items.find().exec();
		res.json(items);
	});

	router.get('/api/user/:userId', async (req, res) => {
		const userId = req.params.userId;
		const item = await core.db.rundown_items.findOne({ _id: userId }).exec();
		res.json(item);
	});

	router.post('/api/set-user', (req, res) => {
		res.send(`ok`);
	});

	return router;
}

export function socketHandler(core: ICore) {
	core.io.on('connection', function(socket) {
		console.log('a user connected');

		socket.on(SocketCommand.ExecuteCommand, ({ action, cmd }: { action: ExecuteAction; cmd: IRundownItem }) => {
			try {
				console.log('exec cmd', action, cmd);

				// TODO
			} catch (err) {
				console.error(`ExecuteCommand failed: ${err}`);
			}
		});
	});
}
