/*
 * This file is part of the Companion project
 * Copyright (c) 2019 Bitfocus AS
 * Authors: Håkon Nessjøen <haakon@bitfocus.io>, William Viker <william@bitfocus.io>
 *
 * This program is free software.
 * You should have received a copy of the MIT licence as well as the Bitfocus
 * Individual Contributor License Agreement for companion along with
 * this program.
 *
 * You can be released from the requirements of the license by purchasing
 * a commercial license. Buying such a license is mandatory as soon as you
 * develop commercial activities involving the Companion software without
 * disclosing the source code of your own applications.
 *
 */
import { IButtonControlRenderLayer, SomeSurfaceSpec } from '@companion/core-shared/dist/collections';
import net from 'net';
import { createChildLogger } from '../logger.js';
import { IConnectedSurface } from './surface-host.js';

const logger = createChildLogger('services/satellite-device');

export interface SatelliteOptions {
	streamBitmaps: boolean;
	streamColors: boolean;
	streamText: boolean;
}

export class SatelliteDevice implements IConnectedSurface {
	constructor(
		private readonly socket: net.Socket,
		private readonly deviceId: string,
		private readonly options: SatelliteOptions,
		public readonly surfaceSpec: SomeSurfaceSpec,
	) {}

	public get uid(): string {
		return this.deviceId;
	}

	setBrightness(percent: number): void {
		logger.debug('brightness: ' + percent);
		this.socket.write(`SURFACE-BRIGHTNESS DEVICEID=${this.deviceId} VALUE=${percent}\n`);
	}
	clearSurface(): void {
		logger.debug('elgato.prototype.clearDeck()');
		this.socket.write(`SURFACE-CLEAR DEVICEID=${this.deviceId}\n`);
	}
	drawControl(slotId: string, style: IButtonControlRenderLayer, pngStr: string | null): void {
		let params = ``;
		if (this.options.streamColors) {
			// convert color to hex
			const bgcolor = style && typeof style.backgroundColor === 'number' ? style.backgroundColor : 0;
			const color = bgcolor.toString(16).padStart(6, '0');

			params += ` COLOR=#${color}`;
		}
		if (this.options.streamBitmaps) {
			params += ` BITMAP=${pngStr ?? `""`}`;
		}
		if (this.options.streamText) {
			let text = '';
			if (style && style.text) {
				text = style.text;
			}
			params += ` TEXT=${Buffer.from(text).toString('base64')}`;
		}

		this.socket.write(`CONTROL-STATE DEVICEID=${this.deviceId} SLOT=${slotId} ${params}\n`);
	}
}
