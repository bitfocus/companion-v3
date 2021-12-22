import { InputValue } from '@companion/module-framework';
import { CollectionId, ControlType, IButtonControlRenderLayer, SurfaceType } from './collections/index.js';

export enum SocketCommand {
	Login = 'LOGIN',
	Logout = 'LOGOUT',
	UserInfo = 'USER_INFO',

	CollectionSubscribe = 'COLLECTION.SUBSCRIBE',
	CollectionUnsubscribe = 'COLLECTION.UNSUBSCRIBE',

	ModuleFetchHelp = 'MODULE.FETCHHELP',

	ConnectionCreate = 'CONNECTION.CREATE',
	ConnectionDelete = 'CONNECTION.DELETE',
	ConnectionEnabled = 'CONNECTION.ENABLED',

	ControlDefinitionCreate = 'CONTROLDEFINITION.CREATE',
	ControlDefinitionDelete = 'CONTROLDEFINITION.DELETE',
	ControlDefinitionRenderLayerUpdate = 'CONTROLDEFINITION.RENDERLAYER.UPDATE',
	ControlDefinitionRenderLayerAddExpression = 'CONTROLDEFINITION.RENDERLAYER.ADD.EXPRESSION',
	ControlDefinitionRenderLayerAddFeedback = 'CONTROLDEFINITION.RENDERLAYER.ADD.FEEDBACK',
	ControlDefinitionRenderLayerRemove = 'CONTROLDEFINITION.RENDERLAYER.REMOVE',
	ControlDefinitionRenderLayerNameUpdate = 'CONTROLDEFINITION.RENDERLAYER.NAME.UPDATE',
	ControlDefinitionRenderLayerEnabledUpdate = 'CONTROLDEFINITION.RENDERLAYER.ENABLED.UPDATE',
	ControlDefinitionRenderLayerFeedbackOptionUpdate = 'CONTROLDEFINITION.RENDERLAYER.FEEDBACK.OPTION.UPDATE',
	ControlDefinitionNameUpdate = 'CONTROLDEFINITION.NAME.UPDATE',
	ControlDefinitionActionAdd = 'CONTROLDEFINITION.ACTION.ADD',
	ControlDefinitionPropertyActionAdd = 'CONTROLDEFINITION.ACTION.ADD_PROPERTY',
	ControlDefinitionActionRemove = 'CONTROLDEFINITION.ACTION.REMOVE',
	ControlDefinitionActionSetDelay = 'CONTROLDEFINITION.ACTION.SET_DELAY',
	ControlDefinitionActionSetOption = 'CONTROLDEFINITION.ACTION.SET_OPTION',
	ControlDefinitionActionReorder = 'CONTROLDEFINITION.ACTION.REORDER',

	ControlSimulatePress = 'CONTROL.SIMULATE.PRESS',

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

export interface ModuleFetchHelpMessage {
	moduleId: string;
}
export interface ModuleFetchHelpMessageReply {
	moduleId: string;
	name: string;
	markdown: string;
	baseUrl: string;
}

export interface ConnectionCreateMessage {
	moduleId: string;
	product: string | undefined;
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

export interface ControlDefinitionActionAddMessage {
	controlId: string;
	connectionId: string;
	actionId: string;
}
export interface ControlDefinitionPropertyActionAddMessage {
	controlId: string;
	connectionId: string;
	propertyId: string;
}

export interface ControlDefinitionActionRemoveMessage {
	controlId: string;
	actionId: string;
}
export interface ControlDefinitionActionSetDelayMessage {
	controlId: string;
	actionId: string;
	delay: number;
}
export interface ControlDefinitionActionSetOptionMessage {
	controlId: string;
	actionId: string;

	option: string;
	value: InputValue;
}
export interface ControlDefinitionActionReorderMessage {
	controlId: string;
	actionId: string;

	beforeActionId: string;
}

export interface ControlDefinitionRenderLayerUpdateMessage<T extends keyof IButtonControlRenderLayer> {
	controlId: string;
	layerId: 'default' | number;
	key: T;
	value: IButtonControlRenderLayer[T];
}

export interface ControlDefinitionRenderLayerAddFeedbackMessage {
	controlId: string;

	connectionId: string;
	feedbackId: string;
}
export interface ControlDefinitionRenderLayerAddExpressionMessage {
	controlId: string;
}
export interface ControlDefinitionRenderLayerRemoveMessage {
	controlId: string;
	layerId: string;
}
export interface ControlDefinitionRenderLayerNameUpdateMessage {
	controlId: string;
	layerId: string;
	name: string;
}
export interface ControlDefinitionRenderLayerEnabledUpdateMessage {
	controlId: string;
	layerId: string;
	enabled: boolean;
}
export interface ControlDefinitionRenderLayerFeedbackOptionUpdateMessage {
	controlId: string;
	layerId: string;

	option: string;
	value: InputValue;
}

export interface ControlDefinitionNameUpdateMessage {
	controlId: string;
	name: string;
}

export interface ControlSimulatePressMessage {
	controlId: string;
	pressed: boolean;
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

export type SocketCommandFunc = {
	[SocketCommand.Login]: (data: LoginMessage) => void;
	[SocketCommand.Logout]: (data: LogoutMessage) => void;
	[SocketCommand.UserInfo]: (data: UserInfoMessage) => void;

	[SocketCommand.CollectionSubscribe]: (data: CollectionSubscribeMessage) => void;
	[SocketCommand.CollectionUnsubscribe]: (data: CollectionUnsubscribeMessage) => void;

	[SocketCommand.ModuleFetchHelp]: (data: ModuleFetchHelpMessage) => ModuleFetchHelpMessageReply;

	[SocketCommand.ConnectionCreate]: (data: ConnectionCreateMessage) => ConnectionCreateMessageReply;
	[SocketCommand.ConnectionDelete]: (data: ConnectionDeleteMessage) => ConnectionDeleteMessage;
	[SocketCommand.ConnectionEnabled]: (data: ConnectionEnabledMessage) => ConnectionEnabledMessage;

	[SocketCommand.ControlDefinitionCreate]: (
		data: ControlDefinitionCreateMessage,
	) => ControlDefinitionCreateMessageReply;
	[SocketCommand.ControlDefinitionDelete]: (data: ControlDefinitionDeleteMessage) => ControlDefinitionDeleteMessage;
	[SocketCommand.ControlDefinitionRenderLayerUpdate]: (data: ControlDefinitionRenderLayerUpdateMessage<any>) => void;
	[SocketCommand.ControlDefinitionRenderLayerAddExpression]: (
		data: ControlDefinitionRenderLayerAddExpressionMessage,
	) => void;
	[SocketCommand.ControlDefinitionRenderLayerAddFeedback]: (
		data: ControlDefinitionRenderLayerAddFeedbackMessage,
	) => void;
	[SocketCommand.ControlDefinitionRenderLayerRemove]: (data: ControlDefinitionRenderLayerRemoveMessage) => void;
	[SocketCommand.ControlDefinitionRenderLayerNameUpdate]: (
		data: ControlDefinitionRenderLayerNameUpdateMessage,
	) => void;
	[SocketCommand.ControlDefinitionRenderLayerEnabledUpdate]: (
		data: ControlDefinitionRenderLayerEnabledUpdateMessage,
	) => void;
	[SocketCommand.ControlDefinitionRenderLayerFeedbackOptionUpdate]: (
		data: ControlDefinitionRenderLayerFeedbackOptionUpdateMessage,
	) => void;
	[SocketCommand.ControlDefinitionNameUpdate]: (data: ControlDefinitionNameUpdateMessage) => void;
	[SocketCommand.ControlDefinitionActionAdd]: (data: ControlDefinitionActionAddMessage) => void;
	[SocketCommand.ControlDefinitionPropertyActionAdd]: (data: ControlDefinitionPropertyActionAddMessage) => void;
	[SocketCommand.ControlDefinitionActionRemove]: (data: ControlDefinitionActionRemoveMessage) => void;
	[SocketCommand.ControlDefinitionActionSetDelay]: (data: ControlDefinitionActionSetDelayMessage) => void;
	[SocketCommand.ControlDefinitionActionSetOption]: (data: ControlDefinitionActionSetOptionMessage) => void;
	[SocketCommand.ControlDefinitionActionReorder]: (data: ControlDefinitionActionReorderMessage) => void;

	[SocketCommand.ControlSimulatePress]: (data: ControlSimulatePressMessage) => void;

	[SocketCommand.SurfaceSpaceCreate]: (data: SurfaceSpaceCreateMessage) => SurfaceSpaceCreateMessageReply;
	[SocketCommand.SurfaceSpaceDelete]: (data: SurfaceSpaceDeleteMessage) => SurfaceSpaceDeleteMessage;
	[SocketCommand.SurfaceSpacePageCreate]: (data: SurfaceSpacePageCreateMessage) => SurfaceSpacePageCreateMessageReply;
	[SocketCommand.SurfaceSpacePageDelete]: (data: SurfaceSpacePageDeleteMessage) => SurfaceSpacePageDeleteMessage;
	[SocketCommand.SurfaceSpacePageSlotCreate]: (
		data: SurfaceSpacePageSlotCreateMessage,
	) => SurfaceSpacePageSlotCreateMessageReply;
	[SocketCommand.SurfaceSpacePageSlotClear]: (
		data: SurfaceSpacePageSlotClearMessage,
	) => SurfaceSpacePageSlotClearMessage;
	[SocketCommand.SurfaceSpacePageSlotUseControl]: (
		data: SurfaceSpacePageSlotUseControlMessage,
	) => SurfaceSpacePageSlotUseControlMessage;

	[SocketCommand.SurfaceDeviceScan]: (data: null) => void;
	[SocketCommand.SurfaceDeviceAttach]: (data: SurfaceDeviceAttachMessage) => void;
	[SocketCommand.SurfaceDeviceDetach]: (data: SurfaceDeviceDetachMessage) => void;
};
