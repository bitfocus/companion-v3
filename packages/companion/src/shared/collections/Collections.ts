import { RundownCollection, RundownSchema, RundownMethods, RundownCollectionMethods } from './Rundown';
import {
	RundownItemCollection,
	RundownItemSchema,
	RundownItemMethods,
	RundownItemCollectionMethods,
} from './RundownItem';
import { RxCollectionCreator } from 'rxdb';

export interface ICollections {
	rundowns: RundownCollection;
	rundown_items: RundownItemCollection;
}

export const CollectionCreator: RxCollectionCreator[] = [
	{
		name: 'rundowns',
		schema: RundownSchema,
		methods: RundownMethods,
		statics: RundownCollectionMethods,
		// sync: true
	},
	{
		name: 'rundown_items',
		schema: RundownItemSchema,
		methods: RundownItemMethods,
		statics: RundownItemCollectionMethods,
		// sync: true
	},
];
