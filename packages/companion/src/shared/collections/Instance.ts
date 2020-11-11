import { RxJsonSchema, RxCollection } from 'rxdb';

export interface IInstance {
	_id: string;
	name: string;
	version: string;
	asarPath: string;
	isSystem: boolean;
}

export const InstanceSchema: RxJsonSchema<IInstance> = {
	title: 'instances',
	description: 'instances',
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

export const InstanceMethods = {};
export const InstanceCollectionMethods = {};

export type InstanceCollection = RxCollection<IInstance, typeof InstanceMethods, typeof InstanceCollectionMethods>;
