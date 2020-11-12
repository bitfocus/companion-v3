import { BankSchema, BankMethods, BankCollectionMethods, BankCollection } from './Bank';
import { WorkspaceCollection, WorkspaceSchema, WorkspaceMethods, WorkspaceCollectionMethods } from './Workspace';
import { RxCollectionCreator } from 'rxdb';
import { ModuleSchema, ModuleMethods, ModuleCollectionMethods, ModuleCollection } from './Module';
import { InstanceSchema, InstanceMethods, InstanceCollectionMethods, InstanceCollection } from './Instance';

export interface ICollections {
	banks: BankCollection;
	workspaces: WorkspaceCollection;
	modules: ModuleCollection;
	instances: InstanceCollection;
}

export const CollectionCreator: RxCollectionCreator[] = [
	{
		name: 'banks',
		schema: BankSchema,
		methods: BankMethods,
		statics: BankCollectionMethods,
	},
	{
		name: 'workspaces',
		schema: WorkspaceSchema,
		methods: WorkspaceMethods,
		statics: WorkspaceCollectionMethods,
	},
	{
		name: 'modules',
		schema: ModuleSchema,
		methods: ModuleMethods,
		statics: ModuleCollectionMethods,
		pouchSettings: {
			// Store it in memory, so that it gets rebuilt every startup
			// adapter: 'memory', // TODO - this doesnt seem to sync, so bypassing for now..
		} as any,
	},
	{
		name: 'instances',
		schema: InstanceSchema,
		methods: InstanceMethods,
		statics: InstanceCollectionMethods,
	},
];
