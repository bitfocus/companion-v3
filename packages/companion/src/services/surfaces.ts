import { ICore } from '../core';
import { ModuleThread, spawn, Thread, Worker } from 'threads';
import { SurfaceWorker } from '../workers/surface';
import { SurfaceDeviceStatus } from '@companion/core-shared/dist/collections';
import { ObjectID } from 'bson';

interface WrappedSurface {
	readonly worker: ModuleThread<SurfaceWorker>;
}

/**
 * Manage the connected surfaces.
 * It is expecting to have only a single instance of this running. Having multiple will cause some fighting over the devices
 */
export class SurfaceManager {
	private readonly core: ICore;
	private scanner!: ModuleThread<SurfaceWorker>;
	private readonly devices = new Map<string, WrappedSurface>();

	constructor(core: ICore) {
		this.core = core;
	}

	async start(): Promise<void> {
		this.scanner = await spawn<SurfaceWorker>(new Worker('../workers/surface'));

		// Set all the surfaces as being offline, as we don't yet know if they are there
		await this.core.models.surfaceDevices.updateMany(
			{},
			{
				$set: {
					status: SurfaceDeviceStatus.OFFLINE,
				},
			},
		);
		// Remove any devices which are offline and have not been adopted
		await this.core.models.surfaceDevices.deleteMany({
			status: SurfaceDeviceStatus.OFFLINE,
			adopted: false,
		});

		// Do a scan in the background, but dont worry if it fails
		setTimeout(() => {
			this.scan().catch(() => null);
		}, 1000);
	}

	async destroy(): Promise<void> {
		await Thread.terminate(this.scanner);
	}

	async scan(): Promise<void> {
		const surfaces = await this.scanner.listDevices();
		console.log(`Found ${surfaces.length} surfaces`);
		const moduleName = 'elgato-stream-deck'; // TODO - dynamic

		const session = this.core.client.startSession();
		try {
			await session.withTransaction(async () => {
				const allExisting = await this.core.models.surfaceDevices.find({}, { session }).toArray();

				const updatedIds = new Set<string>();
				for (const surface of surfaces) {
					const existing = allExisting.find((e) => e.module === moduleName && e.uid === surface.id);

					if (!existing) {
						// Create the new surface
						const newId = new ObjectID().toHexString();
						updatedIds.add(newId);
						await this.core.models.surfaceDevices.insertOne({
							_id: newId,
							name: surface.deviceName,
							status: SurfaceDeviceStatus.DETECTED,
							adopted: false,

							module: moduleName,
							uid: surface.id,
						});
					} else {
						updatedIds.add(existing._id);
						let newStatus = existing.status;
						if (newStatus === SurfaceDeviceStatus.OFFLINE) {
							newStatus = SurfaceDeviceStatus.DETECTED;
						}
						// Surface exists
						await this.core.models.surfaceDevices.updateOne(
							{
								_id: existing._id,
							},
							{
								name: surface.deviceName,
								status: newStatus,
							},
						);
					}
				}

				// Any unadopted devices that were not updated above are no longer detected and so should be forgotten
				await this.core.models.surfaceDevices.deleteMany({
					_id: { $nin: Array.from(updatedIds) },
					adopted: false,
				});
			});
		} finally {
			await session.endSession({});
		}
	}

	async open(_deviceId: string): Promise<void> {
		// TODO
		this.devices;
	}
}

export async function startSurfaceManager(core: ICore): Promise<SurfaceManager> {
	const renderer = new SurfaceManager(core);
	await renderer.start();
	return renderer;
}
