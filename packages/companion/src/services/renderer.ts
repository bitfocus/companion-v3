import { createChildLogger } from '../logger.js';
import { pngBufferToString } from '@companion/core-shared/dist/collections/index.js';
import { splitColors } from '@companion/core-shared/dist/color.js';
import PQueue from 'p-queue';
import sharp from 'sharp';
import { ICore, watchCollection } from '../core.js';

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
				if (docId) this.queue.add(() => this.renderControl(docId));
			},
			onReplace: (doc) => {
				const docId = (doc.documentKey as any)._id;
				if (docId) this.queue.add(() => this.renderControl(docId));
			},
			onUpdate: (doc) => {
				if (doc.updateDescription && 'renderHash' in doc.updateDescription.updatedFields) {
					const docId = (doc.documentKey as any)._id;
					if (docId) this.queue.add(() => this.renderControl(docId));
				}
			},
			onDelete: (doc) => {
				if (doc.documentKey) this.deleteRender((doc.documentKey as any)._id);
			},
		});
		watchCollection(this.core.models.controlStatus, undefined, {
			onInsert: (doc) => {
				const docId = (doc.documentKey as any)._id;
				if (docId) this.queue.add(() => this.renderControl(docId));
			},
			onReplace: (doc) => {
				const docId = (doc.documentKey as any)._id;
				if (docId) this.queue.add(() => this.renderControl(docId));
			},
			onUpdate: (doc) => {
				const docId = (doc.documentKey as any)._id;
				if (docId) this.queue.add(() => this.renderControl(docId));
			},
			onDelete: (doc) => {
				const docId = (doc.documentKey as any)._id;
				if (docId) this.queue.add(() => this.renderControl(docId));
			},
		});

		// Queue everything for validation
		this.core.models.controlDefinitions.find().forEach((doc) => {
			const docId = doc._id;
			this.queue.add(() => this.renderControl(docId));
		});
	}

	private deleteRender(controlId: string): void {
		this.core.models.controlRenders
			.deleteOne({ _id: controlId })
			.catch((e) => logger.error(`ControlRender "${controlId}" cleanup failed: ${e}`));
	}

	private async renderControl(controlId: string): Promise<void> {
		const [control, render, status] = await Promise.all([
			this.core.models.controlDefinitions.findOne({ _id: controlId }),
			this.core.models.controlRenders.findOne({ _id: controlId }),
			this.core.models.controlStatus.findOne({ _id: controlId }),
		]);
		if (!control) {
			logger.debug(`Skipping render of ${JSON.stringify(controlId)}, as it no longer exists`);
			return;
		}

		if (render && render.renderHash === control.renderHash) {
			// TODO - consider variables
			logger.debug(`Existing render of ${controlId} is still valid`);
			// return;
		}

		logger.debug(`Starting render of ${controlId}`);
		const start = Date.now();

		const rawBg = splitColors(control.defaultLayer.backgroundColor, true);

		const imageDimension = 72; // TODO dynamic
		const imageLayers: Array<sharp.OverlayOptions> = [];
		if (control.defaultLayer.text) {
			let fontsize = control.defaultLayer.textSize;
			if (typeof fontsize === 'string') fontsize = 16;

			let x: number;
			let align: string;
			switch (control.defaultLayer.textAlignment[0]) {
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
			switch (control.defaultLayer.textAlignment[1]) {
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
                            >${control.defaultLayer.text}</text>
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
