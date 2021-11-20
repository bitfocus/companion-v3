import SocketIO from 'socket.io';
import { createChildLogger } from '../../logger.js';
import { ICore } from '../../core.js';
import { ResultCallback } from '@companion/module-framework/dist/host-api/versions.js';
import winston from 'winston';
import crypto from 'crypto';

export interface RegisterResult {
	doInit: () => Promise<void>;
	doDestroy: () => Promise<void>;
}

/**
 * Signature for the handler functions
 */
type HandlerFunction<T extends (...args: any) => any> = (
	socket: SocketIO.Socket,
	logger: winston.Logger,
	// socketContext: SocketContext,
	core: ICore,
	// services: IServices,
	connectionId: string,
	data: Parameters<T>[0],
) => Promise<ReturnType<T>>;

type HandlerFunctionOrNever<T> = T extends (...args: any) => any ? HandlerFunction<T> : never;

/** Map of handler functions */
export type EventHandlers<T extends object> = {
	[K in keyof T]: HandlerFunctionOrNever<T[K]>;
};

/** Subscribe to all the events defined in the handlers, and wrap with safety and logging */
export function listenToEvents<T extends object>(
	socket: SocketIO.Socket<T>,
	core: ICore,
	connectionId: string,
	handlers: EventHandlers<T>,
): () => void {
	const logger = createChildLogger(`module/${connectionId}`);

	const registeredListeners: { [key: string]: (...args: any[]) => any } = {};

	for (const [event, handler] of Object.entries(handlers)) {
		const func = async (msg: any, cb: ResultCallback<any>) => {
			if (!msg || typeof msg !== 'object') {
				logger.warn(`Received malformed message object "${event}"`);
				return; // Ignore messages without correct structure
			}
			if (cb && typeof cb !== 'function') {
				logger.warn(`Received malformed callback "${event}"`);
				return; // Ignore messages without correct structure
			}

			try {
				// Run it
				const handler2 = handler as HandlerFunction<(msg: any) => any>;
				const result = await handler2(socket, logger, core, connectionId, msg);

				if (cb) cb(null, result);
			} catch (e: any) {
				logger.error(`Command failed: ${e}`);
				if (cb) cb(e?.toString() ?? JSON.stringify(e), undefined);
			}
		};
		socket.on(event as any, func);
		registeredListeners[event] = func;
	}

	return () => {
		// unsubscribe
		for (const [event, func] of Object.entries(registeredListeners)) {
			socket.off(event, func);
		}
	};
}

export function getHash(str: string): string {
	return crypto.createHash('sha1').update(str).digest('hex');
}
