import { ICore } from '../core.js';
import { SocketCommand, UserInfoMessage } from '@companion/core-shared/dist/api.js';
import { literal } from '@companion/core-shared/dist/util.js';
import { unsubscribeAllForSocket } from '../subscriptions.js';
import { getUserInfo } from '../auth.js';
import * as SocketIO from 'socket.io';
import { IServices, SocketContext, SocketHandlers } from './handlers.js';
import { createChildLogger } from '../logger.js';
import { ControlRunner } from '../services/control-runner.js';
import { SurfaceHost } from '../services/surface-host.js';

const logger = createChildLogger('routes/api-router');

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

export function socketHandler(core: ICore, surfaceHost: SurfaceHost, controlRunner: ControlRunner): void {
	const services: IServices = {
		surfaceHost,
		controlRunner,
	};

	core.io.on('connection', (socket: SocketIO.Socket) => {
		logger.info('a user connected');

		let socketContext: SocketContext = { authSessionId: null };

		// Send userInfo, to ensure the ui is in sync
		getUserInfo(core, socketContext.authSessionId)
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
						logger.error(`Command "${id}" errored: ${e}`);
						cb(e, null);
					}
				});
			}
		}
	});
}
