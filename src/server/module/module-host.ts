import { CompanionModuleSystem } from '../../shared/module-api';
import { threadedClass } from 'threadedclass';
import { MockModule } from './mock';
import { readdirSync } from 'fs';
import { join } from 'path';
import { ModuleProxy } from './bootstrap';

// Inject asar parsing
require('asar-node').register()


export function createInstance(moduleSystem: CompanionModuleSystem, id: string) {
	return threadedClass('./mock', MockModule, [moduleSystem, id]);
}

// TODO - this is pretty shitty naming and code
export async function loadModulesFromDirectory() {
    const basePath = join(require('app-root-path').toString(), '/userdata/modules');
    const moduleFiles = readdirSync(basePath);

    for (const filename of moduleFiles) {
        const asarPath = join(basePath, filename)

        const modulePackage = require(join(asarPath, 'package.json'))

        const entryPoint = modulePackage.main ? join(asarPath, modulePackage.main) : asarPath

        console.log(filename, modulePackage)

        // TODO - use the non-hacky bootstrap when not running via ts-node
        const mocked = await threadedClass<ModuleProxy, typeof ModuleProxy>('./bootstrap-ts', ModuleProxy, [{}, 'abc', entryPoint])
        // const mocked2 = await mocked.initModule(asarPath)
        console.log('config', await mocked.getConfigFields())
    }

}
