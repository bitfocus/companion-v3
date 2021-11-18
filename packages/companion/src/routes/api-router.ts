import { ICore } from '../core.js';
import { SocketCommand, UserInfoMessage } from '@companion/core-shared/dist/api.js';
import { literal } from '@companion/core-shared/dist/util.js';
import { unsubscribeAllForSocket } from '../subscriptions.js';
import { getUserInfo } from '../auth.js';
import * as SocketIO from 'socket.io';
import { SurfaceManager } from '../services/surfaces.js';
import { IServices, SocketContext, SocketHandlers } from './handlers.js';

// export function apiRouter(core: ICore): Router {
// 	const router = Router();
// 	// router.use(bodyParser.json());

// 	router.get('/api/users', async (_req, res) => {
// 		const items = await core.db.collection('workspaces').find().toArray();
// 		res.json(items);
// 	});

// 	router.get('/api/user/:userId', async (req, res) => {
// 		const userId = req.params.userId;
// 		const item = await core.db.collection('workspaces').findOne({ _id: userId });
// 		res.json(item);
// 	});

// 	router.post('/api/set-user', (_req, res) => {
// 		res.send(`ok`);
// 	});

// 	return router;
// }

export function socketHandler(core: ICore, surfaceManager: SurfaceManager): void {
	const services: IServices = {
		surfaceManager,
	};

	core.io.on('connection', (socket: SocketIO.Socket) => {
		console.log('a user connected');

		let socketContext: SocketContext = { authSessionId: null };

		// Send userInfo, to ensure the ui is in sync
		getUserInfo(socketContext.authSessionId)
			.then((info) => {
				socket.emit(
					SocketCommand.UserInfo,
					literal<UserInfoMessage>({
						info: info ?? undefined,
					}),
				);
			})
			.catch((_e) => {
				// TODO
			});

		socket.on('close', () => {
			unsubscribeAllForSocket(socket);
		});

		// Register command handlers
		for (const [id, handler] of Object.entries(SocketHandlers)) {
			if (handler) {
				socket.on(id, async (msg, cb) => {
					// console.log('got cmd', id, msg, cb);
					if (!msg || !cb) return; // Ignore messages without correct structure

					try {
						const res = await handler(socket, socketContext, core, services, msg as never);
						cb(null, res);
					} catch (e) {
						console.error(`Command "${id}" errored: ${e}`);
						cb(e, null);
					}
				});
			}
		}
	});
}
