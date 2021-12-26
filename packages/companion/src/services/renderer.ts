import { createChildLogger } from '../logger.js';
import { pngBufferToString } from '@companion/core-shared/dist/collections/index.js';
import { splitColors } from '@companion/core-shared/dist/color.js';
import PQueue from 'p-queue';
import sharp from 'sharp';
import { ICore, watchCollection } from '../core.js';
import { assertNever } from '@companion/module-framework';

const logger = createChildLogger('services/renderer');

class ControlRenderer {
	private readonly core: ICore;
	// Note: in a multi-node environment, this queue will need to be replaced with a proper distributed work queue
	private readonly queue: PQueue;

	constructor(core: ICore) {
		this.core = core;
		this.queue = new PQueue({
			concurrency: 4,
		});
	}

	async start(): Promise<void> {
		watchCollection(this.core.models.controlDefinitions, undefined, {
			onInsert: (doc) => {
				const docId = (doc.documentKey as any)._id;
				if (docId) this.queue.add(() => this.renderControl(docId, true));
			},
			onReplace: (doc) => {
				const docId = (doc.documentKey as any)._id;
				if (docId) this.queue.add(() => this.renderControl(docId, false));
			},
			onUpdate: (doc) => {
				if (doc.updateDescription && 'renderHash' in doc.updateDescription.updatedFields) {
					const docId = (doc.documentKey as any)._id;
					if (docId) this.queue.add(() => this.renderControl(docId, false));
				}
			},
			onDelete: (doc) => {
				if (doc.documentKey) this.deleteRender((doc.documentKey as any)._id);
			},
		});
		watchCollection(this.core.models.controlStatus, undefined, {
			onInsert: (doc) => {
				const docId = (doc.documentKey as any)._id;
				if (docId) this.queue.add(() => this.renderControl(docId, true));
			},
			onReplace: (doc) => {
				const docId = (doc.documentKey as any)._id;
				if (docId) this.queue.add(() => this.renderControl(docId, true));
			},
			onUpdate: (doc) => {
				const docId = (doc.documentKey as any)._id;
				if (docId) this.queue.add(() => this.renderControl(docId, true));
			},
			onDelete: (doc) => {
				const docId = (doc.documentKey as any)._id;
				if (docId) this.queue.add(() => this.renderControl(docId, true));
			},
		});
		watchCollection(this.core.models.controlFeedbackValues, undefined, {
			onInsert: (doc) => {
				const docId = (doc.documentKey as any)._id;
				if (docId) this.queue.add(() => this.renderControl(docId, true));
			},
			onReplace: (doc) => {
				const docId = (doc.documentKey as any)._id;
				if (docId) this.queue.add(() => this.renderControl(docId, true));
			},
			onUpdate: (doc) => {
				const docId = (doc.documentKey as any)._id;
				if (docId) this.queue.add(() => this.renderControl(docId, true));
			},
			onDelete: (doc) => {
				const docId = (doc.documentKey as any)._id;
				if (docId) this.queue.add(() => this.renderControl(docId, true));
			},
		});

		// Queue everything for validation
		this.core.models.controlDefinitions.find().forEach((doc) => {
			const docId = doc._id;
			this.queue.add(() => this.renderControl(docId, false));
		});
	}

	private deleteRender(controlId: string): void {
		this.core.models.controlRenders
			.deleteOne({ _id: controlId })
			.catch((e) => logger.error(`ControlRender "${controlId}" cleanup failed: ${e}`));
	}

	private async renderControl(controlId: string, force: boolean): Promise<void> {
		const [control, render, status, feedbackValues0] = await Promise.all([
			this.core.models.controlDefinitions.findOne({ _id: controlId }),
			this.core.models.controlRenders.findOne({ _id: controlId }),
			this.core.models.controlStatus.findOne({ _id: controlId }),
			this.core.models.controlFeedbackValues.findOne({ _id: controlId }),
		]);
		if (!control) {
			logger.debug(`Skipping render of ${JSON.stringify(controlId)}, as it no longer exists`);
			return;
		}

		const feedbackValues = new Map(feedbackValues0 ? Object.entries(feedbackValues0.values) : []);

		if (!force && render && render.renderHash === control.renderHash) {
			// TODO - consider variables/status
			logger.debug(`Existing render of ${controlId} is still valid`);
			// return;
		}

		let controlStyle = { ...control.defaultLayer };
		for (const layer of control.overlayLayers || []) {
			if (!layer.disabled) {
				switch (layer.type) {
					case 'advanced':
						// combine the styles
						const value = feedbackValues.get(layer.feedback.id);
						if (value && typeof value === 'object') {
							controlStyle = {
								...controlStyle,
								...value,
							};
						}
						break;
					case 'expression':
						let combinedValue = false;
						for (const feedback of layer.feedbacks || []) {
							const value = feedbackValues.get(feedback.id);
							if (value) {
								// For now treat as an OR operation
								combinedValue = true;
								break;
							}
						}

						if (combinedValue) {
							controlStyle = {
								...controlStyle,
								...layer.style,
							};
						}
						break;
					default:
						assertNever(layer);
				}
			}
		}

		logger.debug(`Starting render of ${controlId}`);
		const start = Date.now();

		const rawBg = splitColors(controlStyle.backgroundColor, true);

		const imageDimension = 72; // TODO dynamic
		const imageLayers: Array<sharp.OverlayOptions> = [];
		if (controlStyle.text) {
			let fontsize = controlStyle.textSize;
			if (typeof fontsize === 'string') fontsize = 16;

			let x: number;
			let align: string;
			switch (controlStyle.textAlignment[0]) {
				case 'l':
					x = 0;
					align = 'start';
					break;
				case 'c':
					x = imageDimension / 2;
					align = 'middle';
					break;
				case 'r':
					x = imageDimension;
					align = 'end';
					break;
			}
			let y: number;
			// TODO - refine
			switch (controlStyle.textAlignment[1]) {
				case 't':
					y = fontsize;
					break;
				case 'c':
					y = (imageDimension + fontsize) / 2;
					break;
				case 'b':
					y = imageDimension;
					break;
			}

			// alignment-baseline="middle" // TODO - once this works then use it
			imageLayers.push({
				input: Buffer.from(
					`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imageDimension} ${imageDimension}" version="1.1">
                        <text
                            font-family="'sans-serif'"
                            font-size="${fontsize}px" 
                            x="${x}" 
                            y="${y}"
                            fill="#fff"
                            text-anchor="${align}" 
                            >${controlStyle.text}</text>
                    </svg>`,
				),
				top: imageDimension - 20,
				left: 10,
			});
		}

		let img = sharp({
			create: {
				width: imageDimension,
				height: imageDimension,
				channels: 3,
				background: {
					r: rawBg.r,
					g: rawBg.g,
					b: rawBg.b,
					alpha: rawBg.a / 255,
				},
			},
		}).composite(imageLayers);

		if (status?.pressed) {
			const borderSize = 2;

			const tmpImg = await img.toBuffer();
			img = sharp(tmpImg, {
				raw: {
					width: imageDimension,
					height: imageDimension,
					channels: 4,
				},
			})
				.extract({
					left: borderSize,
					top: borderSize,
					width: imageDimension - borderSize * 2,
					height: imageDimension - borderSize * 2,
				})
				.extend({
					top: borderSize,
					bottom: borderSize,
					left: borderSize,
					right: borderSize,
					background: '#FFC600',
				});
		}

		const buffer = await img.toFormat('png').toBuffer();
		const pngStr = pngBufferToString(buffer);

		// save the png
		const session = this.core.client.startSession();
		try {
			// Update the control to ensure it exists
			const updated = await this.core.models.controlDefinitions.updateOne(
				{
					_id: controlId,
				},
				{
					$set: {
						touchedAt: Date.now(),
					},
				},
				{ session },
			);
			if (updated.modifiedCount === 0) {
				return;
			}

			await this.core.models.controlRenders.replaceOne(
				{
					_id: controlId,
				},
				{
					_id: controlId,
					renderHash: control.renderHash,
					pngStr: pngStr,
					cachedStyle: controlStyle,
				},
				{
					upsert: true,
					session,
				},
			);

			logger.debug(`Completed render of ${controlId} in ${Date.now() - start}ms`);
		} catch (e) {
			logger.error(`Saving render of ${controlId} failed`);
		} finally {
			await session.endSession({});
		}
	}
}

export async function startControlRenderer(core: ICore): Promise<ControlRenderer> {
	const renderer = new ControlRenderer(core);
	await renderer.start();
	return renderer;
}
