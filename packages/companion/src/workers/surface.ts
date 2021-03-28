import { expose } from 'threads/worker';
import { listStreamDecks, openStreamDeck, StreamDeck } from '@elgato-stream-deck/node';

export interface DetectedSurfaceInfo {
	id: string;
	path: string;
	deviceName: string;
	// surfaceSpec: SomeSurfaceSpec;
}

export type SurfaceWorker = {
	listDevices(): DetectedSurfaceInfo[];
	open(path: string): Promise<void>;
	close(): Promise<void>;
};

let device: StreamDeck | undefined;

const counter: SurfaceWorker = {
	listDevices() {
		if (device) throw new Error('Cannot scan on a thread that is being used to run a device');

		const devices: DetectedSurfaceInfo[] = [];

		const streamdecks = listStreamDecks();
		for (const streamdeck of streamdecks) {
			devices.push({
				id: streamdeck.serialNumber ?? streamdeck.path,
				path: streamdeck.path,
				deviceName: `StreamDeck ${streamdeck.model}`,
				// surfaceSpec: literal<SurfaceSpecBasic>({
				// 	type: SurfaceType.ButtonGrid,
				// 	width: 0,
				// 	height: 0,
				// }),
			});
		}

		return devices;
	},

	async open(path: string): Promise<void> {
		if (device) throw new Error('A device has already been opened on this thread');

		device = openStreamDeck(path, {
			resetToLogoOnClose: true,
		});
		await device.clearPanel();

		// TODO - close on process exit etc
	},

	async close(): Promise<void> {
		if (!device) return;

		await device.close();

		device = undefined;
	},
};

expose(counter);
