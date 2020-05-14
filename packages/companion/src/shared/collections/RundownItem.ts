import { RxJsonSchema, RxCollection } from 'rxdb';

export interface IRundownItem {
	_id: string;
	rundownId: string;
	serverId: string;
	label?: string;
	channel: number;
	layer: number;

	content: IRundownItemContentBase;
}

export enum RundownItemType {
	Media = 'MEDIA',
	HTML = 'HTML',
}

export type SomeRundownItemContent = IRundownItemContentMedia | IRundownItemContentHtml;
export interface IRundownItemContentBase {
	type: RundownItemType;
}
export interface IRundownItemContentMedia extends IRundownItemContentBase {
	type: RundownItemType.Media;
	file: string;
}
export interface IRundownItemContentHtml extends IRundownItemContentBase {
	type: RundownItemType.HTML;
	url: string;
}

export const RundownItemSchema: RxJsonSchema<IRundownItem> = {
	title: 'rundownItems',
	description: 'rundown items',
	version: 0,
	// keyCompression: true,
	type: 'object',
	properties: {
		_id: {
			type: 'string',
			primary: true,
		},
		rundownId: {
			type: 'string',
			index: true,
		},
		serverId: {
			type: 'string',
		},
		label: {
			type: 'string',
		},
		channel: {
			type: 'integer',
		},
		layer: {
			type: 'integer',
		},
		content: {
			type: 'object',
		},
	},
	required: ['_id', 'rundownId', 'serverId', 'channel', 'layer'],
};

export const RundownItemMethods = {};
export const RundownItemCollectionMethods = {};

export type RundownItemCollection = RxCollection<
	IRundownItem,
	typeof RundownItemMethods,
	typeof RundownItemCollectionMethods
>;
