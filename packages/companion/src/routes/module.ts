import { ModuleFetchHelpMessage, ModuleFetchHelpMessageReply } from '@companion/core-shared/dist/api.js';
import * as SocketIO from 'socket.io';
import { verifyUserSession } from '../auth.js';
import { ICore } from '../core.js';
import { IServices, SocketContext } from './handlers.js';
import fsp from 'fs/promises';

export async function handleModuleFetchHelp(
	_socket: SocketIO.Socket,
	socketContext: SocketContext,
	core: ICore,
	_services: IServices,
	msg: ModuleFetchHelpMessage,
): Promise<ModuleFetchHelpMessageReply> {
	await verifyUserSession(core, socketContext.authSessionId);

	const module = await core.models.modules.findOne({ _id: msg.moduleId });

	if (module) {
		if (module.helpPath) {
			try {
				const data = await fsp.readFile(module.helpPath);

				return {
					moduleId: module._id,
					name: module.manifest.name,
					markdown: data.toString(),
					baseUrl: `/int/help/${module._id}/`, // TODO
				};
			} catch (e) {
				console.error(`Failed to load help file: ${e}`);
				throw new Error('Failed to load help file');
			}
		} else {
			throw new Error('Module has no help');
		}
	} else {
		throw new Error('Bad moduleId');
	}
}
