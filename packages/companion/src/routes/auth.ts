import { SocketCommand, LoginMessage, UserInfoMessage, LogoutMessage } from '@companion/core-shared/dist/api.js';
import { literal } from '@companion/core-shared/dist/util.js';
import { login, getUserInfo, logout } from '../auth.js';
import { unsubscribeAllForSocket } from '../subscriptions.js';
import * as SocketIO from 'socket.io';
import { IServices, SocketContext } from './handlers.js';
import { ICore } from '../core.js';

export async function handleLoginCommand(
	socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: LoginMessage,
): Promise<void> {
	if (!socketContext.authSessionId) {
		try {
			// TODO - race condition around authSession?
			socketContext.authSessionId = await login(msg.username, msg.password);
			if (socketContext) {
				const userInfo = await getUserInfo(core, socketContext.authSessionId);
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
}
export async function handleLogoutCommand(
	socket: SocketIO.Socket,
	socketContext: SocketContext,
	_core: ICore,
	_services: IServices,
	_msg: LogoutMessage,
): Promise<void> {
	if (socketContext.authSessionId) {
		// Clear the value
		const oldAuthSessionId = socketContext.authSessionId;
		socketContext.authSessionId = null;
		// Then do the logout
		await logout(oldAuthSessionId);
	}

	socket.emit(SocketCommand.UserInfo, literal<UserInfoMessage>({}));

	// Remove subscriptions
	unsubscribeAllForSocket(socket);
}
