import { generateDocumentId, ICore } from '../core.js';
import { ModuleThread, spawn, Thread, Worker } from 'threads';
import { SurfaceWorker } from '../workers/surface.js';
import { IButtonControlRenderLayer, SurfaceDeviceStatus } from '@companion/core-shared/dist/collections/index.js';
import { createChildLogger } from '../logger.js';

const logger = createChildLogger('services/surfaces');

interface WrappedSurface {
	readonly worker: ModuleThread<SurfaceWorker>;
	surfaceSpaceId: string;
}

/**
 * Manage the connected surfaces.
 * It is expecting to have only a single instance of this running. Having multiple will cause some fighting over the devices
 */
export class SurfaceManager {
	private readonly core: ICore;
	private scanner!: ModuleThread<SurfaceWorker>;
	private readonly devices = new Map<string, WrappedSurface>();
	private readonly devicesInProgress = new Set<string>();

	constructor(core: ICore) {
		this.core = core;
	}

	async start(): Promise<void> {
		// this.scanner = await spawn<SurfaceWorker>(new Worker('../workers/surface'));
		// // Set all the surfaces as being offline, as we don't yet know if they are there
		// await this.core.models.surfaceDevices.updateMany(
		// 	{},
		// 	{
		// 		$set: {
		// 			status: SurfaceDeviceStatus.OFFLINE,
		// 		},
		// 	},
		// );
		// // Remove any devices which are offline and have not been adopted
		// await this.core.models.surfaceDevices.deleteMany({
		// 	status: SurfaceDeviceStatus.OFFLINE,
		// 	adopted: false,
		// });
		// // Do a scan in the background, but dont worry if it fails
		// setTimeout(() => {
		// 	this.scan().catch(() => null);
		// }, 1000);
	}

	async destroy(): Promise<void> {
		await Thread.terminate(this.scanner);
	}

	async scan(): Promise<void> {
		const surfaces = await this.scanner.listDevices();
		logger.info(`Found ${surfaces.length} surfaces`);
		const moduleName = 'elgato-stream-deck'; // TODO - dynamic

		const session = this.core.client.startSession();
		try {
			await session.withTransaction(async () => {
				const allExisting = await this.core.models.surfaceDevices.find({}, { session }).toArray();

				const updatedIds = new Set<string>();
				const surfacesToOpen: Array<{ id: string; path: string }> = [];
				const updates: Array<Promise<any>> = [];
				for (const surface of surfaces) {
					const existing = allExisting.find((e) => e.module === moduleName && e.uid === surface.id);

					if (!existing) {
						// Create the new surface
						const newId = generateDocumentId();
						updatedIds.add(newId);
						updates.push(
							this.core.models.surfaceDevices.insertOne({
								_id: newId,
								name: surface.deviceName,
								status: SurfaceDeviceStatus.DETECTED,
								surfaceHostId: '',
								adopted: false,

								module: moduleName,
								uid: surface.id,
							}),
						);
					} else {
						updatedIds.add(existing._id);
						let newStatus = existing.status;
						if (newStatus === SurfaceDeviceStatus.OFFLINE) {
							newStatus = SurfaceDeviceStatus.DETECTED;
							surfacesToOpen.push({
								id: existing._id,
								path: surface.path,
							});
						}
						// Surface exists
						updates.push(
							this.core.models.surfaceDevices.updateOne(
								{
									_id: existing._id,
								},
								{
									name: surface.deviceName,
									status: newStatus,
								},
							),
						);
					}
				}

				// Any unadopted devices that were not updated above are no longer detected and so should be forgotten
				await Promise.all([
					...updates,
					this.core.models.surfaceDevices.deleteMany({
						_id: { $nin: Array.from(updatedIds) },
						adopted: false,
					}),
				]);

				setImmediate(() => {
					this.openExisting(surfacesToOpen).catch((e) => {
						logger.error(`Open existing devices failed: ${e}`);
					});
				});
			});
		} finally {
			await session.endSession({});
		}
	}

	async openExisting(surfaces: Array<{ id: string; path: string }>): Promise<void> {
		await Promise.all(
			surfaces.map(async (surface) => {
				try {
					await this.open(surface.id, surface.path);
				} catch (e) {
					logger.error(`Failed to open device: ${e}`);
				}
			}),
		);
	}

	async close(deviceId: string): Promise<void> {
		const device = this.devices.get(deviceId);
		if (device) {
			await device.worker.close();
			this.devices.delete(deviceId);

			await this.core.models.surfaceDevices.updateOne(
				{
					_id: deviceId,
					status: SurfaceDeviceStatus.READY,
				},
				{
					status: SurfaceDeviceStatus.DETECTED,
				},
			);

			await Thread.terminate(device.worker);
		}

		// TODO - what if device is opening?
	}

	async open(deviceId: string, path0?: string): Promise<void> {
		if (this.devices.get(deviceId)) {
			throw new Error(`Device "${deviceId}" is already opened`);
		}
		if (this.devicesInProgress.has(deviceId)) {
			throw new Error(`Device "${deviceId}" is already opening`);
		}

		let worker: ModuleThread<SurfaceWorker> | undefined;
		try {
			this.devicesInProgress.add(deviceId);

			const deviceInfo = await this.core.models.surfaceDevices.findOne({ _id: deviceId });
			if (!deviceInfo) {
				throw new Error(`Device "${deviceId}" is not known`);
			}

			if (!deviceInfo.surfaceSpaceId) {
				throw new Error(`Device "${deviceId}" does not belong to a space`);
			}

			let path: string;
			if (path0) {
				path = path0;
			} else {
				const surfaces = await this.scanner.listDevices();
				const surface = surfaces.find((s) => s.id === deviceInfo.uid);
				if (!surface) {
					throw new Error(`Device "${deviceId}" was not found`);
				}

				path = surface.path;
			}

			// open the device in the worker
			// worker = await spawn<SurfaceWorker>(new Worker('../workers/surface'));
			// await worker.open(path);

			// const wrappedDevice: WrappedSurface = {
			// 	worker,
			// 	surfaceSpaceId: deviceInfo.surfaceSpaceId,
			// };
			// this.devices.set(deviceId, wrappedDevice);

			// // TODO - subscribe to events

			// await this.core.models.surfaceDevices.updateOne(
			// 	{
			// 		_id: deviceId,
			// 	},
			// 	{
			// 		status: SurfaceDeviceStatus.READY,
			// 	},
			// );
		} catch (e) {
			logger.error(`Failed to open device: ${e}`);

			if (worker) {
				try {
					await Thread.terminate(worker);
				} catch (e) {
					logger.error(`Failed to close worker for Device "${deviceId}": ${e}`);
				}
			}

			await this.core.models.surfaceDevices.updateOne(
				{
					_id: deviceId,
				},
				{
					status: SurfaceDeviceStatus.ERROR,
				},
			);
		} finally {
			// ensure we unmark the opening when complete/failed
			this.devicesInProgress.delete(deviceId);
		}
	}
}

export async function startSurfaceManager(core: ICore): Promise<SurfaceManager> {
	const manager = new SurfaceManager(core);
	await manager.start();
	return manager;
}
