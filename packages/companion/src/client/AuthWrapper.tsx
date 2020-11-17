import React from 'react';
import { LoginMessage, LogoutMessage, SocketCommand, UserInfoMessage } from '../shared/api';
import { literal } from '../shared/util';
import { AuthStatusContext, AuthStatusLink, BackendLinkContext } from './BackendContext';

interface AuthComponentProps {
	socket: SocketIOClient.Socket;
}
interface AuthComponentState {
	userInfo: AuthStatusLink['userInfo'];
	authError: string | undefined;
}

export class AuthComponentWrapper extends React.Component<AuthComponentProps, AuthComponentState> {
	constructor(props: AuthComponentProps) {
		super(props);

		this.state = {
			userInfo: undefined,
			authError: undefined,
		};

		// TODO - this is bad..
		this.props.socket.on(SocketCommand.UserInfo, (msg: UserInfoMessage) => {
			this.setState({
				userInfo: msg.info,
				authError: msg.error,
			});
		});

		this.login = this.login.bind(this);
		this.logout = this.logout.bind(this);
	}

	public login(username: string, password: string): void {
		if (!this.state.userInfo) {
			this.props.socket.emit(
				SocketCommand.Login,
				literal<LoginMessage>({
					username,
					password,
				}),
			);
		}
	}

	public logout(): void {
		this.props.socket.emit(SocketCommand.Logout, literal<LogoutMessage>({}));
	}

	render(): React.ReactElement {
		return (
			<BackendLinkContext.Provider value={{ socket: this.props.socket }}>
				<AuthStatusContext.Provider
					value={{
						userInfo: this.state.userInfo,
						authError: this.state.authError,
						doLogin: this.login,
						doLogout: this.logout,
					}}
				>
					{this.props.children}
				</AuthStatusContext.Provider>
			</BackendLinkContext.Provider>
		);
	}
}
