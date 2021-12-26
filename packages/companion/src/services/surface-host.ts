import { generateDocumentId, ICore, watchCollection } from '../core.js';
import {
	IButtonControlRenderLayer,
	IControlRender,
	ISurfaceSpacePage,
	SurfaceDeviceStatus,
} from '@companion/core-shared/dist/collections/index.js';
import { createChildLogger } from '../logger.js';
import PQueue from 'p-queue';
import { DEFAULT_STYLE } from '../routes/control-definition.js';
import { ControlRunner } from './control-runner.js';

const logger = createChildLogger('services/surfaces');

export enum IConnectedSurfaceState {
	Pending = 'pending',
	Unassigned = 'assigned',
}

export interface IConnectedSurface {
	readonly moduleName: string;
	readonly uid: string;

	/** Set the brightness of displays/backlights on the surface */
	setBrightness(percent: number): void;
	/** Clear all displays/buttons on the surface */
	clearSurface(state: IConnectedSurfaceState): void;
	/** 'Draw' a control. Bitmap is passed if they were requested at the point the device was registered */
	drawControl(slotId: string, style: IButtonControlRenderLayer, pngString: string | null): void;
}

interface SlotIdsWrapped {
	slotIds: string[];
	/** Whether a 'render' has been sent for this control since it was loaded (ie, has a subscription fired before the initial draw completed) */
	sent: boolean;
}

interface WrappedSurface {
	queue: PQueue;
	surface: IConnectedSurface | null;
	surfaceSpaceId: string | null;
	surfacePageId: string | null;
	currentControlIds: Record<string, SlotIdsWrapped | undefined>; // ControlId, SlotId
	slotToControlIds: Record<string, string | undefined>;
}

/**
 * Manage the connected surfaces.
 * Note: This currently expects to be a singleton. Some work will be needed to split the connected surfaces across multiple instances
 */
export class SurfaceHost {
	private readonly surfaceHostId = generateDocumentId();
	private readonly core: ICore;
	private readonly controlRunner: ControlRunner;
	private readonly surfaces = new Map<string, WrappedSurface>();

	constructor(core: ICore, controlRunner: ControlRunner) {
		this.core = core;
		this.controlRunner = controlRunner;
	}

	async start(): Promise<void> {
		// watchCollection(this.core.models.surfaceDevices, undefined, {
		// 	onInsert: null, // Must have come from this class instance
		// 	onReplace: (doc) => this.recheckSurface(doc._id),
		// 	onUpdate: (doc) => this.recheckSurface(doc._id),
		// 	onDelete: (doc) => this.recheckSurface(doc._id),
		// });
		watchCollection(this.core.models.controlRenders, undefined, {
			onInsert: (doc) => {
				if (doc.documentKey) {
					this.renderUpdated(doc.documentKey);
				}
			},
			onReplace: (doc) => {
				if (doc.documentKey) {
					this.renderUpdated(doc.documentKey);
				}
			},
			onUpdate: (doc) => {
				if (doc.documentKey) {
					this.renderUpdated(doc.documentKey);
				}
			},
			onDelete: (doc) => {
				if (doc.documentKey) {
					this.renderDeleted(doc.documentKey);
				}
			},
		});
	}

	private renderToAll(controlId: string, doc: IControlRender | null): void {
		for (const surface of this.surfaces.values()) {
			const wrappedSlots = surface.currentControlIds[controlId];
			if (wrappedSlots && surface.surface) {
				wrappedSlots.sent = true;

				for (const slotId of wrappedSlots.slotIds) {
					surface.surface.drawControl(slotId, doc ? doc.cachedStyle : DEFAULT_STYLE, doc ? doc.pngStr : null);
				}
			}
		}
	}

	private renderUpdated(controlId: string): void {
		// TODO - this needs to be run so that it ensures order
		this.core.models.controlRenders
			.findOne({ _id: controlId })
			.then((render) => {
				if (render) {
					this.renderToAll(controlId, render);
				}
			})
			.catch((e) => {
				console.error(`Failed to fetch render: ${e}`);
			});
	}
	private renderDeleted(controlId: string): void {
		// TODO - this needs to be run so that it ensures order
		this.renderToAll(controlId, null);
	}

	private getWrappedSurface(deviceId: string): WrappedSurface {
		let wrapped = this.surfaces.get(deviceId);
		if (!wrapped) {
			const queue = new PQueue({ concurrency: 1 });
			wrapped = {
				queue: queue,
				surface: null,
				surfaceSpaceId: null,
				surfacePageId: null,
				currentControlIds: {},
				slotToControlIds: {},
			};

			// When the queue runs idle, try to do some cleanup to avoid a forever growing this.surfaces
			const onIdle = () => {
				const wrapped2 = this.surfaces.get(deviceId);
				if (wrapped2) {
					if (!wrapped2.surface) {
						// Sanity check that this hasnt been replaced
						if (wrapped2 === wrapped) {
							// No surface, and no jobs so cleanup
							this.surfaces.delete(deviceId);
						}

						// Remove self
						queue.off('idle', onIdle);
					}
				} else {
					// Remove self
					queue.off('idle', onIdle);
				}
			};

			queue.on('idle', onIdle);
			this.surfaces.set(deviceId, wrapped);
		}
		return wrapped;
	}

	/** A surface has connected */
	async surfaceConnected(deviceId: string, surface: IConnectedSurface): Promise<void> {
		await this.getWrappedSurface(deviceId).queue.add(async () => {
			// Ensure the device exists in the db
			const deviceInfo = await this.core.models.surfaceDevices.findOne({ _id: deviceId });
			if (!deviceInfo) {
				await this.core.models.surfaceDevices.insertOne({
					_id: deviceId,
					name: '',
					status: SurfaceDeviceStatus.DETECTED,
					surfaceHostId: this.surfaceHostId,
					adopted: false,
					module: surface.moduleName,
					uid: surface.uid,
				});
			} else {
				await this.core.models.surfaceDevices.updateOne(
					{
						_id: deviceId,
					},
					{
						status: SurfaceDeviceStatus.DETECTED,
						surfaceHostId: this.surfaceHostId,
						module: surface.moduleName,
						uid: surface.uid,
					},
				);
			}

			// Setup space info for the surface
			await this.setupSurfaceForSpaceInner(deviceId, deviceInfo?.surfaceSpaceId ?? null);
		});
	}

	private setupSurfaceForSpace(deviceId: string, surfaceSpaceId: string | null): void {
		this.getWrappedSurface(deviceId)
			.queue.add(async () => {
				this.setupSurfaceForSpaceInner(deviceId, surfaceSpaceId);
			})
			.catch((e) => {
				console.error(`Failed to setup surface for space: ${e}`);
			});
	}

	private async setupSurfaceForSpaceInner(deviceId: string, surfaceSpaceId: string | null): Promise<void> {
		const device = this.surfaces.get(deviceId);
		if (!device || !device.surface) {
			throw new Error('Device not running');
		}

		if (device.surfaceSpaceId === surfaceSpaceId) {
			// Nothing changed
			return;
		}

		// Update ids on the entry
		device.surfaceSpaceId = surfaceSpaceId;
		device.surfacePageId = null;
		device.currentControlIds = {};
		device.slotToControlIds = {};

		// Clear in preparation for the change
		device.surface.clearSurface(
			surfaceSpaceId ? IConnectedSurfaceState.Pending : IConnectedSurfaceState.Unassigned,
		);

		if (surfaceSpaceId) {
			// If we have a space selected
			const space = await this.core.models.surfaceSpaces.findOne({ _id: surfaceSpaceId });
			if (!space) {
				device.surfaceSpaceId = null;
				device.surfacePageId = null;
				device.currentControlIds = {};
				device.slotToControlIds = {};

				device.surface.clearSurface(IConnectedSurfaceState.Unassigned);

				// Space isn't valid, update the doc
				await this.core.models.surfaceDevices.updateOne(
					{
						_id: deviceId,
						surfaceHostId: this.surfaceHostId,
					},
					{
						$unset: {
							surfaceSpaceId: 1,
						},
					},
				);
			} else {
				// Space is valid

				const page: ISurfaceSpacePage | undefined = space.pages[0];
				// Start on the first page
				device.surfacePageId = page?._id ?? null;
				device.currentControlIds = {};
				device.slotToControlIds = {};

				if (page) {
					// Update the list of controls for the page
					for (const [slotId, controlId] of Object.entries(page)) {
						const wrappedSlotIds: SlotIdsWrapped = (device.currentControlIds[controlId] = device
							.currentControlIds[controlId] || {
							slotIds: [],
							sent: false,
						});

						wrappedSlotIds.slotIds.push(slotId);
					}

					device.slotToControlIds = page.controls;

					// Perform the 'initial' renders
					const controlIds = Object.keys(device.currentControlIds);
					if (controlIds.length > 0) {
						this.core.models.controlRenders
							.find({ _id: { $in: controlIds } })
							.toArray()
							.then((renders) => {
								this.surfaceDrawRenders(deviceId, renders, true);
							})
							.catch((e) => {
								//
							});
					}
				}
			}
		}
	}

	private surfaceDrawRenders(deviceId: string, renders: IControlRender[], onlyIfUnsent: boolean): void {
		const device = this.surfaces.get(deviceId);
		if (!device || !device.surface) {
			// TODO - log?
			return;
		}

		// Send out the new renders
		for (const render of renders) {
			const controlInfo = device.currentControlIds[render._id];
			if (controlInfo) {
				if (onlyIfUnsent && controlInfo.sent) continue;
				controlInfo.sent = true;

				// Draw each controls
				for (const slotId of controlInfo.slotIds) {
					device.surface.drawControl(slotId, render.cachedStyle, render.pngStr);
				}
			}
		}
	}

	/** A surface has disconnected */
	async surfaceDisonnected(deviceId: string): Promise<void> {
		const wrapped = this.getWrappedSurface(deviceId);
		await wrapped.queue.add(async () => {
			// Clear space info for the surface
			await this.setupSurfaceForSpaceInner(deviceId, null);

			wrapped.surface = null;

			await Promise.all([
				this.core.models.surfaceDevices.updateOne(
					{
						// Mark offline if adopted
						_id: deviceId,
						adopted: true,
						surfaceHostId: this.surfaceHostId,
					},
					{
						$set: {
							status: SurfaceDeviceStatus.OFFLINE,
							surfaceHostId: null,
						},
					},
				),
				this.core.models.surfaceDevices.deleteOne({
					// Delete if not adopted
					_id: deviceId,
					adopted: false,
					surfaceHostId: this.surfaceHostId,
				}),
			]);
		});
	}

	/** Surface 'control' value changed. ie pressed, or fader moved */
	async surfaceControlInput(deviceId: string, slotId: string, pressed: boolean): Promise<void> {
		const surface = this.surfaces.get(deviceId);
		if (surface) {
			const controlId = surface.slotToControlIds[slotId];
			if (controlId) {
				await this.controlRunner.pressControl(controlId, pressed);
			}
		}
	}
}

export async function startSurfaceHost(core: ICore, controlRunner: ControlRunner): Promise<SurfaceHost> {
	const host = new SurfaceHost(core, controlRunner);
	await host.start();
	return host;
}
