export enum SurfaceType {
	ButtonGrid = 'BUTTONGRID',
	Advanced = 'ADVANCED',
}
export interface SurfaceSpecAdvanced {
	type: SurfaceType.Advanced;
	deviceGuid: string;

	deviceName: string;
	// TODO
	todo: never;
}

export interface SurfaceSpecBasic {
	type: SurfaceType.ButtonGrid;
	deviceName: string;

	width: number;
	height: number;
}

export type SomeSurfaceSpec = SurfaceSpecBasic | SurfaceSpecAdvanced;

export interface ISurfaceSpace {
	_id: string;
	name: string;

	// We aim to get the spec from the device plugin, but we need something once they are removed
	cachedSpec: SomeSurfaceSpec;

	pageIds: string[];
}

export interface ISurfaceSpacePage {
	_id: string;
	spaceId: string;
	controls: never[];
}
