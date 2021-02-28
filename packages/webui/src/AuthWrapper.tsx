import React from 'react';
import { LoginMessage, LogoutMessage, SocketCommand, UserInfoMessage } from '@shared/dist/api';
import { literal } from '@shared/dist/util';
import { AuthStatusContext, AuthStatusLink } from './BackendContext';
import SocketIOClient from 'socket.io-client';
import { CompanionContext, ICompanionContext } from './util';

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
	}

	public login = (username: string, password: string): void => {
		if (!this.state.userInfo) {
			this.props.socket.emit(
				SocketCommand.Login,
				literal<LoginMessage>({
					username,
					password,
				}),
			);
		}
	};

	public logout = (): void => {
		this.props.socket.emit(SocketCommand.Logout, literal<LogoutMessage>({}));
	};

	render(): React.ReactElement {
		const contextValue: ICompanionContext = {
			socket: this.props.socket,
			notifier: undefined,
			instances: undefined,
			modules: undefined,
			variableDefinitions: undefined,
			variableValues: undefined,
			actions: undefined,
			feedbacks: undefined,
		};

		return (
			<CompanionContext.Provider value={contextValue}>
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
			</CompanionContext.Provider>
		);
	}
}
