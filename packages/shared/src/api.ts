export enum SocketCommand {
	Login = 'LOGIN',
	Logout = 'LOGOUT',
	UserInfo = 'USER_INFO',
	Subscribe = 'SUBSCRIBE',
	Unsubscribe = 'UNSUBSCRIBE',
	ExecuteCommand = 'EXEC_COMMAND',
	ConnectionCreate = 'CONECTION.CREATE',
	ConnectionDelete = 'CONECTION.DELETE',
	ConnectionEnabled = 'CONECTION.ENABLED',
}

// export type CommandTypes =
// 	| [SocketCommand.Subscribe, SubscribeMessage, void]
// 	| [SocketCommand.Unsubscribe, UnsubscribeMessage, void];

export interface CommandTypeMap {
	[SocketCommand.Subscribe]: SubscribeMessage;
	[SocketCommand.Unsubscribe]: UnsubscribeMessage;
	[SocketCommand.Login]: LoginMessage;
	[SocketCommand.Logout]: LogoutMessage;
	[SocketCommand.UserInfo]: UserInfoMessage;
	[SocketCommand.ExecuteCommand]: null;
	[SocketCommand.ConnectionCreate]: ConnectionCreateMessage;
}
export interface CommandReplyTypeMap {
	[SocketCommand.Subscribe]: void;
	[SocketCommand.Unsubscribe]: void;
	[SocketCommand.Login]: void;
	[SocketCommand.Logout]: void;
	[SocketCommand.UserInfo]: void;
	[SocketCommand.ExecuteCommand]: void;
	[SocketCommand.ConnectionCreate]: ConnectionCreateMessageReply;
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

export interface ConnectionCreateMessage {
	moduleId: string;
	product: string;
}
export interface ConnectionCreateMessageReply {
	connectionId: string;
}

export interface ConnectionDeleteMessage {
	connectionId: string;
}

export interface ConnectionEnabledMessage {
	connectionId: string;
	enabled: boolean;
}
