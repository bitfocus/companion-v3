import { ControlType, IControlDefinition } from './collections';

export enum SocketCommand {
	Login = 'LOGIN',
	Logout = 'LOGOUT',
	UserInfo = 'USER_INFO',
	CollectionSubscribe = 'COLLECTION.SUBSCRIBE',
	CollectionUnsubscribe = 'COLLECTION.UNSUBSCRIBE',
	ConnectionCreate = 'CONNECTION.CREATE',
	ConnectionDelete = 'CONNECTION.DELETE',
	ConnectionEnabled = 'CONNECTION.ENABLED',
	ControlDefinitionCreate = 'CONTROLDEFINITION.CREATE',
	ControlDefinitionDelete = 'CONTROLDEFINITION.DELETE',
}

// export type CommandTypes =
// 	| [SocketCommand.Subscribe, SubscribeMessage, void]
// 	| [SocketCommand.Unsubscribe, UnsubscribeMessage, void];

// export interface CommandTypeMap {
// 	[SocketCommand.CollectionSubscribe]: SubscribeMessage;
// 	[SocketCommand.CollectionUnsubscribe]: UnsubscribeMessage;
// 	[SocketCommand.Login]: LoginMessage;
// 	[SocketCommand.Logout]: LogoutMessage;
// 	[SocketCommand.UserInfo]: UserInfoMessage;
// 	[SocketCommand.ConnectionCreate]: ConnectionCreateMessage;
// }
// export interface CommandReplyTypeMap {
// 	[SocketCommand.CollectionSubscribe]: void;
// 	[SocketCommand.CollectionUnsubscribe]: void;
// 	[SocketCommand.Login]: void;
// 	[SocketCommand.Logout]: void;
// 	[SocketCommand.UserInfo]: void;
// 	[SocketCommand.ConnectionCreate]: ConnectionCreateMessageReply;
// }

export interface CollectionSubscribeMessage {
	id: string;

	doc: string;
	query?: never;
}

export interface CollectionUnsubscribeMessage {
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

export interface ControlDefinitionCreateMessage {
	type: ControlType;
}
export interface ControlDefinitionCreateMessageReply {
	// control: IControlDefinition;
	id: string;
}
export interface ControlDefinitionDeleteMessage {
	id: string;
}
