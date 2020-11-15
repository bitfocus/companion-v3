export enum SocketCommand {
	Subscribe = 'SUBSCRIBE',
	Unsubscribe = 'UNSUBSCRIBE',
	ExecuteCommand = 'EXEC_COMMAND',
}

export interface CommandTypeMap {
	[SocketCommand.Subscribe]: SubscribeMessage;
	[SocketCommand.Unsubscribe]: UnsubscribeMessage;
}

export interface SubscribeMessage {
	id: string;

	doc: string;
	query?: never;
}

export interface UnsubscribeMessage {
	id: string;
}
