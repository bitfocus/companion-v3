import { assertNever } from '../util.js';

export enum HostApiVersion {
	v0 = 'v0',
}

export type ResultCallback<T> = (err: any, res: T) => void;

export interface ModuleToHostEventsInit {
	register: (apiVersion: HostApiVersion, connectionId: string, socketIoToken: string, cb: () => void) => void;
}
export type HostToModuleEventsInit = Record<never, never>;

/** Check if a HostApiVersion is supported  */
export function isSupportedApiVersion(version: HostApiVersion): boolean {
	switch (version) {
		case HostApiVersion.v0:
			return true;
		// Future:
		// case HostApiVersion.v0:
		//     return false
		default:
			assertNever(version);
			return false;
	}
}
