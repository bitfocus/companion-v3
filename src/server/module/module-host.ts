import { CompanionModuleSystem } from '../../shared/module-api';
import { threadedClass } from 'threadedclass';
import { MockModule } from './mock';

export function createInstance(moduleSystem: CompanionModuleSystem, id: string) {
	return threadedClass('./mock', MockModule, [moduleSystem, id]);
}
