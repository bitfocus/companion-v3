import bodyParser from 'body-parser';
import { Router } from 'express';
import { ICore } from '../core';
import {
	LoginMessage,
	LogoutMessage,
	SocketCommand,
	SubscribeMessage,
	UnsubscribeMessage,
	UserInfoMessage,
} from '@companion/core-shared/dist/api';
import { literal } from '@companion/core-shared/dist/util';
import { SubscriptionEvent } from '@companion/core-shared/dist/subscription';
import { socketSubscribe, socketUnsubscribe, unsubscribeAllForSocket } from '../subscriptions';
import { getUserInfo, login, logout } from '../auth';

export function apiRouter(core: ICore): Router {
	const router = Router();
	router.use(bodyParser.json());

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

export function socketHandler(core: ICore): void {
	core.io.on('connection', (socket) => {
		console.log('a user connected');

		let authSession: string | null = null;

		// Send userInfo, to ensure the ui is in sync
		getUserInfo(authSession)
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

		socket.on(SocketCommand.Login, async (msg: LoginMessage) => {
			if (!authSession) {
				try {
					// TODO - race condition around authSession?
					authSession = await login(msg.username, msg.password);
					if (authSession) {
						const userInfo = await getUserInfo(authSession);
						if (userInfo) {
							socket.emit(
								SocketCommand.UserInfo,
								literal<UserInfoMessage>({
									info: userInfo,
								}),
							);
						} else {
							socket.emit(
								SocketCommand.UserInfo,
								literal<UserInfoMessage>({
									info: {
										name: 'Unknown',
									},
								}),
							);
						}
					} else {
						socket.emit(
							SocketCommand.UserInfo,
							literal<UserInfoMessage>({
								error: 'Login failed',
							}),
						);
					}
				} catch (e) {
					console.log('auth failed');
					socket.emit(
						SocketCommand.UserInfo,
						literal<UserInfoMessage>({
							error: 'Login failed',
						}),
					);
				}
			}
		});
		socket.on(SocketCommand.Logout, async (_msg: LogoutMessage) => {
			if (authSession) {
				// Clear the value
				const oldAuthSession = authSession;
				authSession = null;
				// Then do the logout
				await logout(oldAuthSession);
			}

			socket.emit(SocketCommand.UserInfo, literal<UserInfoMessage>({}));

			// Remove subscriptions
			unsubscribeAllForSocket(socket);
		});

		socket.on(SocketCommand.Subscribe, async (msg: SubscribeMessage) => {
			const userInfo = await getUserInfo(authSession);

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
		socket.on(SocketCommand.Unsubscribe, (msg: UnsubscribeMessage) => {
			socketUnsubscribe(core, socket, msg);
		});
	});
}
