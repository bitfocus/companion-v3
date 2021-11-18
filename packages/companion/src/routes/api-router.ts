import { Router } from 'express';
import { ICore } from '../core.js';
import {
	SocketCommand,
	CollectionSubscribeMessage,
	CollectionUnsubscribeMessage,
	UserInfoMessage,
} from '@companion/core-shared/dist/api.js';
import { literal } from '@companion/core-shared/dist/util.js';
import { SubscriptionEvent } from '@companion/core-shared/dist/subscription.js';
import { socketSubscribe, socketUnsubscribe, unsubscribeAllForSocket } from '../subscriptions.js';
import { getUserInfo } from '../auth.js';
import * as SocketIO from 'socket.io';
import { socketAuthHandler, SocketAuthSessionWrapper } from './auth.js';
import { socketDeviceConnectionHandler } from './connections.js';
import { socketControlDefinitionHandler } from './control-definition.js';
import { socketSurfaceSpaceHandler } from './surface-space.js';
import { SurfaceManager } from '../services/surfaces.js';
import { socketSurfaceDeviceHandler } from './surface-device.js';

export function apiRouter(core: ICore): Router {
	const router = Router();
	// router.use(bodyParser.json());

	router.get('/api/users', async (_req, res) => {
		const items = await core.db.collection('workspaces').find().toArray();
		res.json(items);
	});

	router.get('/api/user/:userId', async (req, res) => {
		const userId = req.params.userId;
		const item = await core.db.collection('workspaces').findOne({ _id: userId });
		res.json(item);
	});

	router.post('/api/set-user', (_req, res) => {
		res.send(`ok`);
	});

	return router;
}

// function assertNever(val: never): void {}

export function socketHandler(core: ICore, surfaceManager: SurfaceManager): void {
	core.io.on('connection', (socket: SocketIO.Socket) => {
		console.log('a user connected');

		let authSession: SocketAuthSessionWrapper = { authSessionId: null };

		// Send userInfo, to ensure the ui is in sync
		getUserInfo(authSession.authSessionId)
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

		socketAuthHandler(socket, authSession);
		socketDeviceConnectionHandler(core, socket, authSession);
		socketControlDefinitionHandler(core, socket, authSession);
		socketSurfaceSpaceHandler(core, socket, authSession);
		socketSurfaceDeviceHandler(core, socket, authSession, surfaceManager);

		socket.on(SocketCommand.CollectionSubscribe, async (msg: CollectionSubscribeMessage) => {
			const userInfo = await getUserInfo(authSession.authSessionId);

			if (userInfo) {
				socketSubscribe(core, socket, msg);
			} else {
				socket.emit(
					msg.id,
					literal<SubscriptionEvent<unknown>>({
						event: 'error',
						message: 'Unauthorised',
					}),
				);
			}
		});
		socket.on(SocketCommand.CollectionUnsubscribe, (msg: CollectionUnsubscribeMessage) => {
			socketUnsubscribe(core, socket, msg);
		});
	});
}
