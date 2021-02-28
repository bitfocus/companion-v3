import { threadedClass, Promisify } from 'threadedclass';
import fs from 'fs';
import path from 'path';
import { ModuleProxy } from './bootstrap';
import { promisify } from 'util';
import { literal } from '@shared/dist/util';
import _ from 'underscore';
import semver from 'semver';
import { IS_PACKAGED } from '../config';

const readdirProm = promisify(fs.readdir);

export interface ModuleInfo {
	name: string;
	version: string;
	asarPath: string;
	isSystem: boolean;
}

function readModuleInfo(modulePath: string, filename: string, isSystem: boolean) {
	try {
		if (!filename.endsWith('.asar')) {
			return undefined;
		}

		const asarPath = path.join(modulePath, filename);

		const modulePackageStr = fs.readFileSync(path.join(asarPath, 'package.json'));
		const modulePackage = JSON.parse(modulePackageStr.toString());

		return literal<ModuleInfo>({
			name: modulePackage.name,
			version: modulePackage.version,
			asarPath,
			isSystem,
		});
	} catch (e) {
		console.error(`Failed to read module info: ${e}`);
		return undefined;
	}
}

export class ModuleFactory {
	public readonly modulePath: string;

	constructor(configPath: string) {
		this.modulePath = path.join(configPath, 'modules');
		fs.mkdirSync(this.modulePath, { recursive: true });
	}

	async listModules(): Promise<Array<ModuleInfo>> {
		const systemModulePath = IS_PACKAGED
			? path.join(__dirname, '../../../../../bundled-modules')
			: path.join(__dirname, '../../../bundled-modules');

		const [userModuleFiles, systemModuleFiles] = await Promise.all([
			readdirProm(this.modulePath),
			readdirProm(systemModulePath),
		]);
		const rawUserModules = userModuleFiles.map((filename) => readModuleInfo(this.modulePath, filename, false));
		const rawSystemModules = systemModuleFiles.map((filename) => readModuleInfo(systemModulePath, filename, true));

		const groupedModules = _.groupBy(_.compact([...rawUserModules, ...rawSystemModules]), (mod) =>
			mod.name.toLowerCase(),
		);

		const res: ModuleInfo[] = [];

		_.each(groupedModules, (options, id) => {
			// Sort by version, then asarPath (just to be safe)
			const sortedOptions = _.sortBy(
				options.sort((a, b) => {
					if (semver.lt(a.version, b.version)) {
						return -1;
					}
					if (semver.gt(a.version, b.version)) {
						return 1;
					}
					return 0;
				}),
				(opt) => opt.asarPath,
			);
			res.push(sortedOptions[0]);
		});

		return _.compact(res);
	}

	async initModule(info: ModuleInfo): Promise<Promisify<ModuleProxy>> {
		try {
			const modulePackageStr = fs.readFileSync(path.join(info.asarPath, 'package.json'));
			const modulePackage = JSON.parse(modulePackageStr.toString());
			const entryPoint = modulePackage.main ? path.join(info.asarPath, modulePackage.main) : info.asarPath;

			// TODO - use the non-hacky bootstrap when not running via ts-node
			const mocked = await threadedClass<ModuleProxy, typeof ModuleProxy>('./bootstrap-ts', 'ModuleProxy', [
				entryPoint,
				'abc',
				() => Promise.resolve(),
				() => Promise.resolve(),
				() => Promise.resolve(),
				() => Promise.resolve(),
				() => Promise.resolve(),
				() => Promise.resolve(),
				(level, msg) => console.log('status', level, msg),
				(level, msg) => console.log(level, 'abc', msg),
			]);

			mocked.init({});
			console.log('config', await mocked.getConfigFields());

			return mocked;
		} catch (e) {
			return Promise.reject(`Init module failed: ${e}`);
		}
	}
}
