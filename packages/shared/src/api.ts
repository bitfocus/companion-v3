import { CollectionId, ControlType, IButtonControlRenderLayer, SurfaceType } from './collections';

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
	ControlDefinitionRenderLayerUpdate = 'CONTROLDEFINITION.RENDERLAYER.UPDATE',
	ControlDefinitionNameUpdate = 'CONTROLDEFINITION.NAME.UPDATE',
	SurfaceSpaceCreate = 'SURFACESPACE.CREATE',
	SurfaceSpaceDelete = 'SURFACESPACE.DELETE',
	SurfaceSpacePageCreate = 'SURFACESPACEPAGE.CREATE',
	SurfaceSpacePageDelete = 'SURFACESPACEPAGE.DELETE',
	SurfaceSpacePageSlotCreate = 'SURFACESPACEPAGESLOT.CREATE',
	SurfaceSpacePageSlotClear = 'SURFACESPACEPAGESLOT.CLEAR',
	SurfaceSpacePageSlotUseControl = 'SURFACESPACEPAGESLOT.USECONTROL',
	SurfaceDeviceScan = 'SURFACEDEVICE.SCAN',
	SurfaceDeviceAttach = 'SURFACEDEVICE.ATTACH',
	SurfaceDeviceDetach = 'SURFACEDEVICE.DETACH',
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

	doc: CollectionId;
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

export interface ControlDefinitionRenderLayerUpdateMessage<T extends keyof IButtonControlRenderLayer> {
	controlId: string;
	layerId: 'default' | number;
	key: T;
	value: IButtonControlRenderLayer[T];
}

export interface ControlDefinitionNameUpdateMessage {
	controlId: string;
	name: string;
}

export interface SurfaceSpaceCreateMessage {
	// TODO - make this much more complex..
	type: SurfaceType;
}
export interface SurfaceSpaceCreateMessageReply {
	id: string;
}

export interface SurfaceSpaceDeleteMessage {
	id: string;
}

export interface SurfaceSpacePageCreateMessage {
	spaceId: string;
	// afterId: string | null;
}
export interface SurfaceSpacePageCreateMessageReply {
	id: string;
}

export interface SurfaceSpacePageDeleteMessage {
	id: string;
	spaceId: string;
}

export interface SurfaceSpacePageSlotCreateMessage {
	spaceId: string;
	pageId: string;
	slotId: string;

	type: ControlType;
}
export interface SurfaceSpacePageSlotCreateMessageReply {
	id: string;
}

export interface SurfaceSpacePageSlotClearMessage {
	spaceId: string;
	pageId: string;
	slotId: string;
}
export interface SurfaceSpacePageSlotUseControlMessage {
	spaceId: string;
	pageId: string;
	slotId: string;
	controlId: string;
}

export interface SurfaceDeviceAttachMessage {
	spaceId: string;
	deviceId: string;
}

export interface SurfaceDeviceDetachMessage {
	spaceId: string;
	deviceId: string;
}
