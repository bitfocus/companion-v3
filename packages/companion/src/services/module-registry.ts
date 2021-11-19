import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { literal } from '@companion/core-shared/dist/util.js';
import { ModuleManifest } from '@companion/module-framework';
import _ from 'underscore';
import semver from 'semver';
import { IS_PACKAGED } from '../config.js';
import { IModule } from '@companion/core-shared/dist/collections/index.js';
import Mongo from 'mongodb';
import { fileURLToPath } from 'url';
import { createChildLogger } from '../logger.js';

const logger = createChildLogger('services/module-registry');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ModuleInfo {
	manifest: ModuleManifest;
	modulePath: string;
	isSystem: boolean;
}

async function readModuleInfo(modulePath: string, dirname: string, isSystem: boolean): Promise<ModuleInfo | undefined> {
	try {
		const rootPath = path.join(modulePath, dirname);
		const statInfo = await fsp.stat(rootPath);
		if (!statInfo.isDirectory()) {
			logger.error(`Module not a directory: ${rootPath}`);
			return undefined;
		}

		const manifestPath = path.join(rootPath, 'companion/manifest.json');
		const manifestInfo = await fsp.stat(manifestPath);
		if (!manifestInfo.isFile()) {
			logger.error(`Module missing manifest: ${rootPath}`);
			return undefined;
		}

		const manifestBuffer = await fsp.readFile(manifestPath);
		const manifestJson: ModuleManifest = JSON.parse(manifestBuffer.toString());

		// TODO - validate manifest against some json schema

		return literal<ModuleInfo>({
			manifest: manifestJson,
			modulePath: rootPath,
			isSystem,
		});
	} catch (e) {
		logger.error(`Failed to read module info: ${e}`);
		return undefined;
	}
}

export class ModuleRegistry {
	public readonly modulePath: string;

	constructor(configPath: string) {
		this.modulePath = path.join(configPath, 'modules');
		fs.mkdirSync(this.modulePath, { recursive: true });
	}

	async rescanModules(db: Mongo.Collection<IModule>): Promise<void> {
		const modules = await this.listModules();

		logger.info(`Discovered ${modules.length} modules:`);

		const writeOps: Array<Mongo.BulkWriteReplaceOneOperation<IModule>> = [];
		const knownIds: string[] = [];

		for (const m of modules) {
			logger.info(` - ${m.manifest.name}@${m.manifest.version} (${m.modulePath})`);
			const doc: IModule = {
				_id: m.manifest.id, // TODO - ensure some uniqueness or something

				manifest: m.manifest,

				modulePath: m.modulePath,
				isSystem: m.isSystem,

				hasHelp: true,
			};
			knownIds.push(doc._id);

			writeOps.push({
				replaceOne: {
					filter: {
						_id: doc._id,
					},
					replacement: doc,
					upsert: true,
				},
			});
		}

		await db.bulkWrite([
			...writeOps,
			{
				deleteMany: {
					filter: {
						_id: {
							$nin: knownIds,
						},
					},
				},
			},
		]);
	}

	async listModules(): Promise<Array<ModuleInfo>> {
		const systemModulePath = IS_PACKAGED
			? path.join(__dirname, '../../../../bundled-modules')
			: path.join(__dirname, '../../bundled-modules');

		const [userModuleFiles, systemModuleFiles] = await Promise.all([
			fsp.readdir(this.modulePath),
			fsp.readdir(systemModulePath),
		]);
		const rawUserModules = userModuleFiles.map((dirname) => readModuleInfo(this.modulePath, dirname, false));
		const rawSystemModules = systemModuleFiles.map((dirname) => readModuleInfo(systemModulePath, dirname, true));
		const rawAllModules = await Promise.all([...rawUserModules, ...rawSystemModules]);

		const groupedModules = _.groupBy(_.compact(rawAllModules), (mod) => mod.manifest.name.toLowerCase());

		const res: ModuleInfo[] = [];

		_.each(groupedModules, (options, _id) => {
			// Sort by version, then modulePath (just to be safe)
			const sortedOptions = _.sortBy(
				options.sort((a, b) => {
					if (semver.lt(a.manifest.version, b.manifest.version)) {
						return -1;
					}
					if (semver.gt(a.manifest.version, b.manifest.version)) {
						return 1;
					}
					return 0;
				}),
				(opt) => opt.modulePath,
			);
			res.push(sortedOptions[0]);
		});

		return _.compact(res);
	}
}
