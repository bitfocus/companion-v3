export interface IModule {
	_id: string;
	name: string;
	version: string;
	asarPath: string;
	isSystem: boolean;

	manufacturer: string;
	products: string[];

	keywords: string[];
	hasHelp: boolean;
}
