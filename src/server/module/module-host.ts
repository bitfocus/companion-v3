import { threadedClass, Promisify } from 'threadedclass';
import fs from 'fs';
import path from 'path';
import { ModuleProxy } from './bootstrap';
import { promisify } from 'util'
import { literal } from '../../shared/util'
import _ from 'underscore';

const readdirProm = promisify(fs.readdir)

// Inject asar parsing
require('asar-node').register();

export interface ModuleInfo {
	name: string
	version: string
	asarPath: string
}

export class ModuleFactory {
	public readonly modulePath: string

	constructor(configPath: string) {
		this.modulePath = path.join(configPath, 'modules');
	}

	async listModules(): Promise<Array<ModuleInfo>> {
		// TODO - this needs to handle that there could be multiple versions of a module in the folder
		// TODO - handle loading from system and user folders
		const moduleFiles = await readdirProm(this.modulePath)
		const res = moduleFiles.map(filename => {
			try {
				const asarPath = path.join(this.modulePath, filename);
				const modulePackage = require(path.join(asarPath, 'package.json'))

				return literal<ModuleInfo>({
					name: modulePackage.name,
					version: modulePackage.version,
					asarPath
				})
			} catch (e) {
				console.error(`Failed to read module info: ${e}`)
				return undefined
			}
		})
		return _.compact(res)
	}

	async initModule(info: ModuleInfo): Promise<Promisify<ModuleProxy>> {
		try {
			const modulePackage = require(path.join(info.asarPath, 'package.json'))
			const entryPoint = modulePackage.main ? path.join(info.asarPath, modulePackage.main) : info.asarPath;

			// TODO - use the non-hacky bootstrap when not running via ts-node
			const mocked = await threadedClass<ModuleProxy, typeof ModuleProxy>('./bootstrap-ts', ModuleProxy, [
				entryPoint,
				'abc',
				() => Promise.resolve(),
				() => Promise.resolve(),
				() => Promise.resolve(),
				() => Promise.resolve(),
				() => Promise.resolve(),
				() => Promise.resolve(),
				(level, msg) => console.log('status', level, msg),
				(level, msg) => console.log(level, 'abc', msg)
			]);

			mocked.init({})
			console.log('config', await mocked.getConfigFields());

			return mocked
		} catch (e) {
			return Promise.reject(`Init module failed: ${e}`)
		}
	}
}
