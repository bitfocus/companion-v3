import { ICore } from '../core';
import { spawn, Thread, Worker } from 'threads';
import { Counter } from '../workers/surface';

class SurfaceManager {
	private readonly core: ICore;

	constructor(core: ICore) {
		this.core = core;
	}

	async start(): Promise<void> {
		// master.js

		const auth = await spawn<Counter>(new Worker('../workers/surface'));
		const hashed = await auth.getCount();

		console.log('count:', hashed);

		await Thread.terminate(auth);
	}

	// async start(): Promise<void> {
	// 	const stream = this.core.models.controlDefinitions.watch();

	// 	stream.on('end', () => {
	// 		console.log('Renderer stream closed');
	// 	});

	// 	stream.on('change', (doc) => {
	// 		switch (doc.operationType) {
	// 			case 'insert':
	// 			case 'replace': {
	// 				const docId = doc.documentKey._id;
	// 				this.queue.add(() => this.renderControl(docId));
	// 				break;
	// 			}
	// 			case 'update': {
	// 				if ('renderHash' in doc.updateDescription.updatedFields) {
	// 					const docId = doc.documentKey._id;
	// 					this.queue.add(() => this.renderControl(docId));
	// 				}
	// 				break;
	// 			}
	// 			case 'delete':
	// 				this.core.models.controlRenders
	// 					.deleteOne({ _id: doc.documentKey._id })
	// 					.catch((e) => console.error(`ControlRender "${doc.documentKey._id}" cleanup failed: ${e}`));
	// 				break;
	// 			case 'drop':
	// 			case 'dropDatabase':
	// 			case 'rename':
	// 			case 'invalidate':
	// 				console.log('Renderer stream closed');
	// 				break;
	// 			// TODO
	// 			// default:
	// 			// 	assertNever(doc.operationType);
	// 		}
	// 	});

	// 	// Queue everything for validation
	// 	this.core.models.controlDefinitions.find().forEach((doc) => {
	// 		const docId = doc._id;
	// 		this.queue.add(() => this.renderControl(docId));
	// 	});
	// }

	// async renderControl(controlId: string): Promise<void> {

	// }
}

export async function startSurfaceManager(core: ICore): Promise<SurfaceManager> {
	const renderer = new SurfaceManager(core);
	// await renderer.start();
	return renderer;
}
