export enum SocketCommand {
	Login = 'LOGIN',
	Logout = 'LOGOUT',
	UserInfo = 'USER_INFO',
	Subscribe = 'SUBSCRIBE',
	Unsubscribe = 'UNSUBSCRIBE',
	ExecuteCommand = 'EXEC_COMMAND',
}

export interface CommandTypeMap {
	[SocketCommand.Subscribe]: SubscribeMessage;
	[SocketCommand.Unsubscribe]: UnsubscribeMessage;
	[SocketCommand.Login]: LoginMessage;
	[SocketCommand.Logout]: LogoutMessage;
	[SocketCommand.UserInfo]: UserInfoMessage;
}

export interface SubscribeMessage {
	id: string;

	doc: string;
	query?: never;
}

export interface UnsubscribeMessage {
	id: string;
}

export interface LoginMessage {
	username: string;
	password: string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogoutMessage {}
export interface UserInfoMessage {
	error?: string;
	info?: {
		name: string;
	};
}
