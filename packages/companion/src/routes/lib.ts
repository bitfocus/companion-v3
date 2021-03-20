import { SocketCommand } from '@companion/core-shared/dist/api';
import SocketIO from 'socket.io';

export function registerCommand<T, T2 = void>(
	socket: SocketIO.Socket,
	cmd: SocketCommand,
	execCb: (msg: T) => Promise<T2>,
): void {
	socket.on(cmd, async (msg, cb) => {
		if (!msg || !cb) return; // Ignore messages without correct structure

		try {
			const res = await execCb(msg);
			cb(null, res);
		} catch (e) {
			console.error(`Command "${cmd}" errored: ${e}`);
			cb(e, null);
		}
	});
}
