import { RxJsonSchema, RxCollection } from 'rxdb';

export const DEFAULT_WORKSPACE_WIDTH = 8;
export const DEFAULT_WORKSPACE_HEIGHT = 396;

export interface IWorkspace {
	_id: string;
	// TODO - name
	width: number;
	height: number;
}

export const WorkspaceSchema: RxJsonSchema<IWorkspace> = {
	title: 'workspaces',
	description: 'workspaces',
	version: 0,
	// keyCompression: true,
	type: 'object',
	properties: {
		_id: {
			type: 'string',
			primary: true,
		},
		width: {
			type: 'number',
		},
		height: {
			type: 'number',
		},
	},
	required: ['_id', 'width', 'height'],
};

export const WorkspaceMethods = {};
export const WorkspaceCollectionMethods = {};

export type WorkspaceCollection = RxCollection<IWorkspace, typeof WorkspaceMethods, typeof WorkspaceCollectionMethods>;
