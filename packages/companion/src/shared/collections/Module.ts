import { RxJsonSchema, RxCollection } from 'rxdb';

export interface IModule {
	_id: string;
	name: string;
	version: string;
	asarPath: string;
	isSystem: boolean;
}

export const ModuleSchema: RxJsonSchema<IModule> = {
	title: 'modules',
	description: 'modules',
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
		version: {
			type: 'string',
		},
		asarPath: {
			type: 'string',
		},
		isSystem: {
			type: 'boolean',
		},
	},
	required: ['_id', 'name', 'version', 'asarPath', 'isSystem'],
};

export const ModuleMethods = {};
export const ModuleCollectionMethods = {};

export type ModuleCollection = RxCollection<IModule, typeof ModuleMethods, typeof ModuleCollectionMethods>;
