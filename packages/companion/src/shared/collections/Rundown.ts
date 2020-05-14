import { RxJsonSchema, RxCollection } from 'rxdb';

export interface IRundown {
	_id: string;
	name: string;
}

export const RundownSchema: RxJsonSchema<IRundown> = {
	title: 'rundowns',
	description: 'rundowns',
	version: 0,
	// keyCompression: true,
	type: 'object',
	properties: {
		_id: {
			type: 'string',
			primary: true,
		},
		name: {
			type: 'string',
		},
	},
	required: ['_id', 'name'],
};

export const RundownMethods = {};
export const RundownCollectionMethods = {};

export type RundownCollection = RxCollection<IRundown, typeof RundownMethods, typeof RundownCollectionMethods>;
