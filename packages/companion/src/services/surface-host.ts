import { generateDocumentId, ICore, watchCollection } from '../core.js';
import {
	IButtonControlRenderLayer,
	IControlRender,
	ISurfaceSpacePage,
	SomeSurfaceSpec,
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
	readonly surfaceSpec: SomeSurfaceSpec;
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
	readonly queue: PQueue;
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
		watchCollection(this.core.models.surfaceDevices, undefined, {
			onInsert: null,
			onReplace: null,
			onUpdate: (doc) => {
				if (
					doc.documentKey &&
					doc.updateDescription &&
					'surfaceSpaceId' in doc.updateDescription.updatedFields
				) {
					// If surfaceSpaceId changed, re-setup
					this.setupSurfaceForSpace((doc.documentKey as any)._id);
				}
			},
			onDelete: null,
		});
		watchCollection(this.core.models.controlRenders, undefined, {
			onInsert: (doc) => {
				if (doc.documentKey) {
					this.renderUpdated((doc.documentKey as any)._id);
				}
			},
			onReplace: (doc) => {
				if (doc.documentKey) {
					this.renderUpdated((doc.documentKey as any)._id);
				}
			},
			onUpdate: (doc) => {
				if (doc.documentKey) {
					this.renderUpdated((doc.documentKey as any)._id);
				}
			},
			onDelete: (doc) => {
				if (doc.documentKey) {
					this.renderDeleted((doc.documentKey as any)._id);
				}
			},
		});

		setInterval(() => {
			// Update lastSeen of active devices
			this.core.models.surfaceDevices
				.deleteMany({
					surfaceHostId: this.surfaceHostId,
					_id: { $in: Object.keys(this.surfaces) },
				})
				.catch((e) => {
					logger.error(`Failed to update lastSeen of active devices: ${e}`);
				});

			// Delete any devices which havent been seen in a while
			const tolerance = 1 * 60 * 1000; // 1 minute
			this.core.models.surfaceDevices
				.deleteMany({
					adopted: false,
					lastSeen: { $lt: Date.now() - tolerance },
				})
				.catch((e) => {
					logger.error(`Failed to cleanup devices not seen in a while: ${e}`);
				});
		}, 15000);
	}

	private renderToAll(controlId: string, doc: IControlRender | null): void {
		for (const [deviceId, surface] of this.surfaces.entries()) {
			const wrappedSlots = surface.currentControlIds[controlId];
			if (wrappedSlots && surface.surface) {
				wrappedSlots.sent = true;

				logger.debug(`New render for "${deviceId}" "${wrappedSlots.slotIds.join(', ')}"`);

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
				logger.debug(`New render of "${controlId}"`);
				if (render) {
					this.renderToAll(controlId, render);
				}
			})
			.catch((e) => {
				logger.error(`Failed to fetch render: ${e}`);
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
			const surface2 = this.surfaces.get(deviceId);
			if (!surface2) {
				// Already cleaned up
				logger.error(`Skipping init of "${deviceId}" as it has been cleaned up unexpectedly`);
				return;
			}

			// Ensure the device exists in the db
			const deviceInfo = await this.core.models.surfaceDevices.findOne({ _id: deviceId });
			if (!deviceInfo) {
				logger.info(`Discovered new surface "${deviceId}"`);
				await this.core.models.surfaceDevices.insertOne({
					_id: deviceId,
					name: '',
					status: SurfaceDeviceStatus.DETECTED,
					surfaceHostId: this.surfaceHostId,
					adopted: false,
					surfaceSpec: surface.surfaceSpec,
					uid: surface.uid,
					lastSeen: Date.now(),
				});
			} else {
				// TODO - ensure the spec is similar enough to work, and update the cached copy

				logger.info(`Claimed existing surface "${deviceId}"`);
				await this.core.models.surfaceDevices.updateOne(
					{
						_id: deviceId,
					},
					{
						$set: {
							status: SurfaceDeviceStatus.DETECTED,
							surfaceHostId: this.surfaceHostId,
							// module: surface.moduleName,
							uid: surface.uid,
							lastSeen: Date.now(),
						},
					},
				);
			}

			surface2.surface = surface;

			// Setup space info for the surface
			await this.setupSurfaceForSpaceInner(deviceId, surface2, deviceInfo?.surfaceSpaceId ?? null);
		});
	}

	private setupSurfaceForSpace(deviceId: string): void {
		const surface = this.surfaces.get(deviceId);
		if (surface) {
			surface.queue
				.add(async () => {
					const device = await this.core.models.surfaceDevices.findOne({
						// Find the device if it is for this host
						_id: deviceId,
						surfaceHostId: this.surfaceHostId,
					});
					if (device) {
						this.setupSurfaceForSpaceInner(deviceId, surface, device.surfaceSpaceId ?? null);
					}
				})
				.catch((e) => {
					logger.error(`Failed to setup surface for space: ${e}`);
				});
		}
	}

	private async setupSurfaceForSpaceInner(
		deviceId: string,
		device: WrappedSurface,
		surfaceSpaceId: string | null,
	): Promise<void> {
		if (device.surfaceSpaceId === surfaceSpaceId) {
			// Nothing changed
			return;
		}

		logger.info(`Updating surface "${deviceId}" for space "${surfaceSpaceId}"`);

		// Update ids on the entry
		device.surfaceSpaceId = surfaceSpaceId;
		device.surfacePageId = null;
		device.currentControlIds = {};
		device.slotToControlIds = {};

		if (device.surface) {
			logger.info(`Preparing surface "${deviceId}" for space change`);

			// Clear in preparation for the change
			device.surface.clearSurface(
				surfaceSpaceId ? IConnectedSurfaceState.Pending : IConnectedSurfaceState.Unassigned,
			);

			// If we have a space selected
			const space = surfaceSpaceId
				? await this.core.models.surfaceSpaces.findOne({ _id: surfaceSpaceId })
				: undefined;
			if (!space) {
				logger.info(`Surface "${deviceId}" is attached to missing space`);

				await this.core.models.surfaceDevices.updateOne(
					{ _id: deviceId },
					{
						$set: {
							status: SurfaceDeviceStatus.DETECTED,
						},
					},
				);

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

				logger.info(`Surface "${deviceId}" is attached to space`);

				await this.core.models.surfaceDevices.updateOne(
					{ _id: deviceId },
					{
						$set: {
							status: SurfaceDeviceStatus.READY,
						},
					},
				);

				const page: ISurfaceSpacePage | undefined = space.pages[0];
				// Start on the first page
				device.surfacePageId = page?._id ?? null;
				device.currentControlIds = {};
				device.slotToControlIds = {};

				if (page) {
					// Update the list of controls for the page
					for (const [slotId, controlId] of Object.entries(page.controls)) {
						const wrappedSlotIds: SlotIdsWrapped = (device.currentControlIds[controlId] = device
							.currentControlIds[controlId] || {
							slotIds: [],
							sent: false,
						});

						// TODO - ensure slotId is valid for the attached device (eg, in a grid it is not)
						// TODO - perhaps this is where some xy translation should be applied?
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
								logger.info(
									`Surface "${deviceId}" has ${renders.length} renders to use (from ${controlIds.length} controls)`,
								);
								this.surfaceDrawRenders(deviceId, renders, true);
							})
							.catch((e) => {
								logger.error(`Surface "${deviceId}" failed to draw renders: ${e}`);
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
		await this.getWrappedSurface(deviceId).queue.add(async () => {
			const surface = this.surfaces.get(deviceId);
			if (!surface) {
				// Already disconnected
				return;
			}

			logger.info(`Removing device: "${deviceId}"`);

			surface.surface = null;

			// Clear space info for the surface
			await this.setupSurfaceForSpaceInner(deviceId, surface, null);

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
				logger.debug(`Doing press for "${controlId}" "${pressed}"`);
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
