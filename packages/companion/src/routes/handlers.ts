import { SocketCommand, SocketCommandFunc } from '@companion/core-shared/dist/api.js';
import { handleLoginCommand, handleLogoutCommand } from './auth.js';
import * as SocketIO from 'socket.io';
import { ICore } from '../core.js';
import { handleCollectionSubscribe, handleCollectionUnsubscribe } from './subscriptions.js';
import {
	handleSurfaceSpaceCreate,
	handleSurfaceSpaceDelete,
	handleSurfaceSpacePageCreate,
	handleSurfaceSpacePageDelete,
	handleSurfaceSpacePageSlotClear,
	handleSurfaceSpacePageSlotCreate,
	handleSurfaceSpacePageSlotUseControl,
} from './surface-space.js';
import { handleConnectionCreate, handleConnectionDelete, handleConnectionEnabled } from './connections.js';
import { handleSurfaceDeviceAttach, handleSurfaceDeviceDetach, handleSurfaceDeviceScan } from './surface-device.js';
import {
	handleControlDefinitionActionAdd,
	handleControlDefinitionActionRemove,
	handleControlDefinitionActionReorder,
	handleControlDefinitionActionSetDelay,
	handleControlDefinitionActionSetOption,
	handleControlDefinitionCreate,
	handleControlDefinitionDelete,
	handleControlDefinitionNameUpdate,
	handleControlDefinitionPropertyActionAdd,
	handleControlDefinitionRenderLayerAddExpression,
	handleControlDefinitionRenderLayerAddFeedback,
	handleControlDefinitionRenderLayerEnabledUpdate,
	handleControlDefinitionRenderLayerExpressionSelectedStyleUpdate,
	handleControlDefinitionRenderLayerExpressionStylePropertyUpdate,
	handleControlDefinitionRenderLayerFeedbackOptionUpdate,
	handleControlDefinitionRenderLayerNameUpdate,
	handleControlDefinitionRenderLayerRemove,
	handleControlDefinitionRenderLayerUpdate,
} from './control-definition.js';
import { handleModuleFetchHelp } from './module.js';
import { ControlRunner } from '../services/control-runner.js';
import { handleControlSimulatePress } from './control-runner.js';
import { SurfaceHost } from '../services/surface-host.js';

export interface SocketContext {
	authSessionId: string | null;
}

export interface IServices {
	surfaceHost: SurfaceHost;
	controlRunner: ControlRunner;
}

type HandlerFunction<T extends keyof SocketCommandFunc> = (
	socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	services: IServices,
	data: Parameters<SocketCommandFunc[T]>[0],
) => Promise<ReturnType<SocketCommandFunc[T]>>;

export type SocketCommandHandlers = {
	[T in keyof SocketCommandFunc]: HandlerFunction<T> | null;
};

export const SocketHandlers: SocketCommandHandlers = {
	[SocketCommand.Login]: handleLoginCommand,
	[SocketCommand.Logout]: handleLogoutCommand,
	[SocketCommand.UserInfo]: null, // Server to Client 'event'

	[SocketCommand.CollectionSubscribe]: handleCollectionSubscribe,
	[SocketCommand.CollectionUnsubscribe]: handleCollectionUnsubscribe,

	[SocketCommand.ModuleFetchHelp]: handleModuleFetchHelp,

	[SocketCommand.ConnectionCreate]: handleConnectionCreate,
	[SocketCommand.ConnectionDelete]: handleConnectionDelete,
	[SocketCommand.ConnectionEnabled]: handleConnectionEnabled,

	[SocketCommand.ControlDefinitionCreate]: handleControlDefinitionCreate,
	[SocketCommand.ControlDefinitionDelete]: handleControlDefinitionDelete,
	[SocketCommand.ControlDefinitionRenderLayerUpdate]: handleControlDefinitionRenderLayerUpdate,
	[SocketCommand.ControlDefinitionRenderLayerAddExpression]: handleControlDefinitionRenderLayerAddExpression,
	[SocketCommand.ControlDefinitionRenderLayerAddFeedback]: handleControlDefinitionRenderLayerAddFeedback,
	[SocketCommand.ControlDefinitionRenderLayerRemove]: handleControlDefinitionRenderLayerRemove,
	[SocketCommand.ControlDefinitionRenderLayerNameUpdate]: handleControlDefinitionRenderLayerNameUpdate,
	[SocketCommand.ControlDefinitionRenderLayerEnabledUpdate]: handleControlDefinitionRenderLayerEnabledUpdate,
	[SocketCommand.ControlDefinitionRenderLayerFeedbackOptionUpdate]: handleControlDefinitionRenderLayerFeedbackOptionUpdate,
	[SocketCommand.ControlDefinitionRenderLayerExpressionSelectedStyleUpdate]: handleControlDefinitionRenderLayerExpressionSelectedStyleUpdate,
	[SocketCommand.ControlDefinitionRenderLayerExpressionStylePropertyUpdate]: handleControlDefinitionRenderLayerExpressionStylePropertyUpdate,
	[SocketCommand.ControlDefinitionNameUpdate]: handleControlDefinitionNameUpdate,
	[SocketCommand.ControlDefinitionActionAdd]: handleControlDefinitionActionAdd,
	[SocketCommand.ControlDefinitionPropertyActionAdd]: handleControlDefinitionPropertyActionAdd,
	[SocketCommand.ControlDefinitionActionRemove]: handleControlDefinitionActionRemove,
	[SocketCommand.ControlDefinitionActionSetDelay]: handleControlDefinitionActionSetDelay,
	[SocketCommand.ControlDefinitionActionSetOption]: handleControlDefinitionActionSetOption,
	[SocketCommand.ControlDefinitionActionReorder]: handleControlDefinitionActionReorder,

	[SocketCommand.ControlSimulatePress]: handleControlSimulatePress,

	[SocketCommand.SurfaceSpaceCreate]: handleSurfaceSpaceCreate,
	[SocketCommand.SurfaceSpaceDelete]: handleSurfaceSpaceDelete,
	[SocketCommand.SurfaceSpacePageCreate]: handleSurfaceSpacePageCreate,
	[SocketCommand.SurfaceSpacePageDelete]: handleSurfaceSpacePageDelete,
	[SocketCommand.SurfaceSpacePageSlotCreate]: handleSurfaceSpacePageSlotCreate,
	[SocketCommand.SurfaceSpacePageSlotClear]: handleSurfaceSpacePageSlotClear,
	[SocketCommand.SurfaceSpacePageSlotUseControl]: handleSurfaceSpacePageSlotUseControl,

	[SocketCommand.SurfaceDeviceScan]: handleSurfaceDeviceScan,
	[SocketCommand.SurfaceDeviceAttach]: handleSurfaceDeviceAttach,
	[SocketCommand.SurfaceDeviceDetach]: handleSurfaceDeviceDetach,
};
