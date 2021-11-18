import * as SocketIO from 'socket.io';
import { socketSubscribe, socketUnsubscribe } from '../subscriptions.js';
import { getUserInfo } from '../auth.js';
import { IServices, SocketContext } from './handlers.js';
import { ICore } from '../core.js';
import { CollectionSubscribeMessage, CollectionUnsubscribeMessage } from '@companion/core-shared/dist/api.js';
import { literal } from '@companion/module-framework';
import { SubscriptionEvent } from '@companion/core-shared/dist/subscription.js';

export async function handleCollectionSubscribe(
	socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: CollectionSubscribeMessage,
): Promise<void> {
	const userInfo = await getUserInfo(core, socketContext.authSessionId);

	if (userInfo) {
		socketSubscribe(core, socket, msg);
	} else {
		socket.emit(
			msg.id,
			literal<SubscriptionEvent<unknown>>({
				event: 'error',
				message: 'Unauthorised',
			}),
		);
	}
}

export async function handleCollectionUnsubscribe(
	socket: SocketIO.Socket,
	_socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: CollectionUnsubscribeMessage,
): Promise<void> {
	socketUnsubscribe(core, socket, msg);
}
