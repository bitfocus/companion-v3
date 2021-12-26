import { SomeSurfaceSpec } from './SurfaceSpace';

export enum SurfaceDeviceStatus {
	OFFLINE = 'offline',
	DETECTED = 'detected',
	READY = 'ready',
	ERROR = 'error',
}

export interface ISurfaceDevice {
	_id: string;
	name: string;

	/** Current status of the device */
	status: SurfaceDeviceStatus;
	/** The SurfaceHost the device is currently attached to */
	surfaceHostId: string | null;

	/** Layout/topology of the surface */
	surfaceSpec: SomeSurfaceSpec;

	// /** The module which interfaces with the hardware */
	// module: string;
	/** Unique id of the hardware within the module */
	uid: string;

	/** This tells companion to open the device, it should be linked to a surface, but at points can become unlinked */
	adopted: boolean;
	/** Once the device is adopted it can be linked to a surface */
	surfaceSpaceId?: string;

	/** When the device was last seen */
	lastSeen: number;
}
