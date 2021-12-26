export enum SurfaceType {
	ButtonGrid = 'BUTTONGRID',
	Advanced = 'ADVANCED',
}
/**
 * An advanced surface. These are custom ones with more controls or in a unique shape.
 * They can define controls and coordinates for them for the ui, as well as a type for each control so that faders and encoders etc can be used.
 */
export interface SurfaceSpecAdvanced {
	type: SurfaceType.Advanced;
	deviceGuid: string;

	deviceName: string;
	// TODO
	todo: never;
}

/**
 * A basic grid surface. Any surfaces which conform to this will allow for sharing the grid between surfaces.
 * SlotId is dynamically generated as `${x}x${y}`
 */
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

	pages: ISurfaceSpacePage[];
}

export interface ISurfaceSpacePage {
	_id: string;
	// spaceId: string;

	name: string;
	/** SlotId to ControlId */
	controls: Record<string, string>;
}
