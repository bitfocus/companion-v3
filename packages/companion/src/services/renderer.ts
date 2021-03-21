import { splitColors } from '@companion/core-shared/dist/color';
import PQueue from 'p-queue';
import sharp from 'sharp';
import { ICore } from '../core';

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
		const stream = this.core.models.controlDefinitions.watch();

		stream.on('end', () => {
			console.log('Renderer stream closed');
		});

		stream.on('change', (doc) => {
			switch (doc.operationType) {
				case 'insert':
				case 'replace': {
					const docId = doc.documentKey._id;
					this.queue.add(() => this.renderControl(docId));
					break;
				}
				case 'update': {
					if ('renderHash' in doc.updateDescription.updatedFields) {
						const docId = doc.documentKey._id;
						this.queue.add(() => this.renderControl(docId));
					}
					break;
				}
				case 'delete':
					this.core.models.controlRenders
						.deleteOne({ _id: doc.documentKey._id })
						.catch((e) => console.error(`ControlRender "${doc.documentKey._id}" cleanup failed: ${e}`));
					break;
				case 'drop':
				case 'dropDatabase':
				case 'rename':
				case 'invalidate':
					console.log('Renderer stream closed');
					break;
				// TODO
				// default:
				// 	assertNever(doc.operationType);
			}
		});

		// Queue everything for validation
		this.core.models.controlDefinitions.find().forEach((doc) => {
			const docId = doc._id;
			this.queue.add(() => this.renderControl(docId));
		});
	}

	async renderControl(controlId: string): Promise<void> {
		const [control, render] = await Promise.all([
			this.core.models.controlDefinitions.findOne({ _id: controlId }),
			this.core.models.controlRenders.findOne({ _id: controlId }),
		]);
		if (!control) {
			console.warn(`Skipping render of ${controlId}, as it no longer exists`);
			return;
		}

		if (render && render.renderHash === control.renderHash) {
			// TODO - consider variables
			console.log(`Existing render of ${controlId} is still valid`);
			// return;
		}

		console.log(`Starting render of ${controlId}`);

		const rawBg = splitColors(control.defaultLayer.backgroundColor, true);

		const imageDimension = 72; // TODO dynamic
		const img = sharp({
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
		});

		const buffer = await img.toFormat('png').toBuffer();
		const pngStr = `data:image/png;base64,${buffer.toString('base64')}`;

		// save the png
		const session = this.core.client.startSession();
		try {
			const commitResult: any = await session.withTransaction(async () => {
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
					await session.abortTransaction();
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
					{ upsert: true },
				);
			});

			if (!commitResult) {
				console.error(`Saving render of ${controlId} failed`);
			} else {
				console.error(`Completed render of ${controlId}`);
			}
		} finally {
			await session.endSession();
		}
	}
}

export async function startControlRenderer(core: ICore): Promise<ControlRenderer> {
	const renderer = new ControlRenderer(core);
	await renderer.start();
	return renderer;
}
