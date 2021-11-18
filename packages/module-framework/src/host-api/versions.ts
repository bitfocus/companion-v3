import { assertNever } from '../util';

export enum HostApiVersion {
	v0 = 'v0',
}

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
