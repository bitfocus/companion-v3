import { SocketCommand, LoginMessage, UserInfoMessage, LogoutMessage } from '@companion/core-shared/dist/api.js';
import { literal } from '@companion/core-shared/dist/util.js';
import { login, getUserInfo, logout } from '../auth.js';
import { unsubscribeAllForSocket } from '../subscriptions.js';
import * as SocketIO from 'socket.io';

export interface SocketAuthSessionWrapper {
	authSessionId: string | null;
}

export function socketAuthHandler(socket: SocketIO.Socket, authSession: SocketAuthSessionWrapper) {
	socket.on(SocketCommand.Login, async (msg: LoginMessage) => {
		if (!authSession.authSessionId) {
			try {
				// TODO - race condition around authSession?
				authSession.authSessionId = await login(msg.username, msg.password);
				if (authSession) {
					const userInfo = await getUserInfo(authSession.authSessionId);
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
		if (authSession.authSessionId) {
			// Clear the value
			const oldAuthSessionId = authSession.authSessionId;
			authSession.authSessionId = null;
			// Then do the logout
			await logout(oldAuthSessionId);
		}

		socket.emit(SocketCommand.UserInfo, literal<UserInfoMessage>({}));

		// Remove subscriptions
		unsubscribeAllForSocket(socket);
	});
}
