import { IDeviceConnectionAction } from '@companion/core-shared/src/collections';
import { CompanionActions } from '@companion/module-framework';
import {
	HostToModuleEventsV0,
	LogMessageMessage,
	ModuleToHostEventsV0,
	SetStatusMessage,
} from '@companion/module-framework/dist/host-api/v0';
import * as SocketIO from 'socket.io';
import winston from 'winston';
import { ICore } from '../../core.js';
import { getHash, listenToEvents } from './util.js';
import Mongo from 'mongodb';

export function registerEventsV0(
	socket: SocketIO.Socket<ModuleToHostEventsV0, HostToModuleEventsV0>,
	core: ICore,
	connectionId: string,
): void {
	listenToEvents<ModuleToHostEventsV0>(socket, core, connectionId, {
		'log-message': handleLogMessage,
		'set-status': handleSetStatus,
		setActionDefinitions: handleSetActionDefinitions,
	});
}

async function handleLogMessage(
	_socket: SocketIO.Socket,
	_logger: winston.Logger,
	_core: ICore,
	_connectionId: string,
	_msg: LogMessageMessage,
): Promise<void> {
	// TODO
}
async function handleSetStatus(
	_socket: SocketIO.Socket,
	_logger: winston.Logger,
	_core: ICore,
	_connectionId: string,
	_msg: SetStatusMessage,
): Promise<void> {
	// TODO
}
async function handleSetActionDefinitions(
	_socket: SocketIO.Socket,
	logger: winston.Logger,
	core: ICore,
	connectionId: string,
	actions: CompanionActions,
): Promise<void> {
	logger.debug(`Updating actions`);

	const writeOps: Array<Mongo.BulkWriteReplaceOneOperation<IDeviceConnectionAction>> = [];
	const knownIds: string[] = [];

	for (const [actionId, action] of Object.entries(actions)) {
		if (action) {
			const doc: IDeviceConnectionAction = {
				_id: getHash(`${connectionId}:${actionId}`),
				connectionId: connectionId,
				actionId: actionId,

				// TODO - more conversion
				rawAction: action,
			};
			knownIds.push(doc._id);

			writeOps.push({
				replaceOne: {
					filter: {
						_id: doc._id,
					},
					replacement: doc,
					upsert: true,
				},
			});
		}
	}

	logger.debug(`Got ${writeOps.length} actions`);

	// TODO - block concurrent operations?
	await core.models.deviceConnectionActions.bulkWrite([
		...writeOps,
		{
			deleteMany: {
				filter: {
					connectionId: connectionId,
					_id: {
						$nin: knownIds,
					},
				},
			},
		},
	]);

	logger.debug(`Updated actions`);
}
