import { ModuleManifest } from '@companion/module-framework';

export interface IModule {
	_id: string;

	manifest: ModuleManifest;

	modulePath: string;
	helpPath: string | undefined;
	isSystem: boolean;
}
