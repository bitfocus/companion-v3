import { CompanionModuleSystem, InstanceBase } from './module-api';

/** Run the module entrypoint */
export function runEntrypoint(_factory: new (system: CompanionModuleSystem, id: string) => InstanceBase<any>): void {
	// TODO
}
