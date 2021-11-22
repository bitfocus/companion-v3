import { IDeviceConnectionAction } from '@companion/core-shared/src/collections';
import {
	HostToModuleEventsV0,
	LogMessageMessage,
	ModuleToHostEventsV0,
	SetStatusMessage,
} from '@companion/module-framework/dist/host-api/v0';
import * as SocketIO from 'socket.io';
import winston from 'winston';
import { ICore } from '../../core.js';
import { getHash, listenToEvents, RegisterResult } from './util.js';
import Mongo from 'mongodb';
import { ResultCallback } from '@companion/module-framework/dist/host-api/versions';
import PTimeout from 'p-timeout';
import { SetActionDefinitionsMessage } from '@companion/module-framework/src/host-api/v0';
import { IDeviceConnectionWorkTask } from '../../internal/connection-work.js';
import { assertNever } from '@companion/module-framework/src/util.js';

async function socketEmit<T extends keyof HostToModuleEventsV0>(
	socket: SocketIO.Socket,
	name: T,
	msg: Parameters<HostToModuleEventsV0[T]>[0],
): Promise<ReturnType<HostToModuleEventsV0[T]>> {
	const p = new Promise<ReturnType<HostToModuleEventsV0[T]>>((resolve, reject) => {
		const innerCb: ResultCallback<ReturnType<HostToModuleEventsV0[T]>> = (
			err: any,
			res: ReturnType<HostToModuleEventsV0[T]>,
		): void => {
			if (err) reject(err);
			else resolve(res);
		};
		socket.emit(name, msg, innerCb);
	});

	return PTimeout(p, 5000, `Message to module "${name}" timed out`);
}

export function registerEventsV0(
	socket: SocketIO.Socket<ModuleToHostEventsV0, HostToModuleEventsV0>,
	core: ICore,
	connectionId: string,
): RegisterResult {
	const unsubListeners = listenToEvents<ModuleToHostEventsV0>(socket, core, connectionId, {
		'log-message': handleLogMessage,
		'set-status': handleSetStatus,
		setActionDefinitions: handleSetActionDefinitions,
	});

	const doInit = async () => {
		const doc = await core.models.deviceConnections.findOne({ _id: connectionId });
		if (!doc) throw new Error(`Connection "${connectionId}" missing during init`);

		// Send init to the module
		await socketEmit(socket, 'init', doc.moduleConfig);
	};
	const doDestroy = async () => {
		// Cleanup the system once the module is destroyed

		try {
			await socketEmit(socket, 'destroy', {});
		} catch (e) {
			console.warn(`Destroy for "${connectionId}" errored: ${e}`);
		}

		// Stop socket.io commands being received
		unsubListeners();

		// TODO - wait for any in progress commands to be completed?

		// Cleanup any db collections
		await Promise.allSettled([
			core.models.deviceConnectionActions.deleteMany({ connectionId: connectionId }),
			core.models.deviceConnectionStatuses.deleteOne({ _id: connectionId }),
		]);
	};
	const doWorkTask = async (task: IDeviceConnectionWorkTask) => {
		switch (task.task.type) {
			case 'action:execute':
				await socketEmit(socket, 'executeAction', task.task);
				break;
			case 'action2':
				// TMP
				break;
			default:
				assertNever(task.task);
				break;
		}
	};

	return { doInit, doDestroy, doWorkTask };
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
	logger: winston.Logger,
	core: ICore,
	connectionId: string,
	msg: SetStatusMessage,
): Promise<void> {
	logger.debug(`Updating status for  "${connectionId}"`);

	await core.models.deviceConnectionStatuses.replaceOne(
		{ _id: connectionId },
		{
			_id: connectionId,
			status: msg.status,
			message: msg.message,
		},
		{ upsert: true },
	);
}
async function handleSetActionDefinitions(
	_socket: SocketIO.Socket,
	logger: winston.Logger,
	core: ICore,
	connectionId: string,
	msg: SetActionDefinitionsMessage,
): Promise<void> {
	logger.debug(`Updating actions for "${connectionId}"`);

	const writeOps: Array<Mongo.AnyBulkWriteOperation<IDeviceConnectionAction>> = [];
	const knownIds: string[] = [];

	for (const action of msg.actions) {
		const doc: IDeviceConnectionAction = {
			_id: getHash(`${connectionId}:${action.id}`),
			connectionId: connectionId,
			actionId: action.id,

			// TODO - more conversion
			name: action.name,
			description: action.description,
			options: action.options,
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
