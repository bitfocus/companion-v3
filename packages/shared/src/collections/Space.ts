export interface ISpace {
	_id: string;
	surfaceType: string; // Type of the hardware surface
    pagesOrder: string[]
}

export interface ISpacePage {
	_id: string;
    spaceId: string;
    buttons: never // TODO
}
