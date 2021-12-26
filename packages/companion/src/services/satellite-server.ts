/*
 * This file is part of the Companion project
 * Copyright (c) 2018 Bitfocus AS
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
import net from 'net';
import { createChildLogger } from '../logger.js';
import { SatelliteDevice } from './satellite-device.js';
import { SurfaceHost } from './surface-host.js';

const logger = createChildLogger('service/satellite-server');

/** TODO - these need removing */
const MAX_BUTTONS = 32;
const MAX_BUTTONS_PER_ROW = 8;

/**
 * Version of this API. This follows semver, to allow for clients to check their compatability
 * 1.0.0 - Initial release
 * 1.1.0 - Add KEY-STATE TYPE property
 */
const API_VERSION = '2.0.0';

function isFalsey(val: any) {
	return (typeof val === 'string' && val.toLowerCase() == 'false') || val == '0';
}

type ParsedParams = Record<string, string | boolean | undefined>;

function parseLineParameters(line: string) {
	// https://newbedev.com/javascript-split-string-by-space-but-ignore-space-in-quotes-notice-not-to-split-by-the-colon-too
	const fragments = line.match(/\\?.|^$/g)?.reduce(
		(p, c) => {
			if (c === '"') {
				p.quote ^= 1;
			} else if (!p.quote && c === ' ') {
				p.a.push('');
			} else {
				p.a[p.a.length - 1] += c.replace(/\\(.)/, '$1');
			}
			return p;
		},
		{ a: [''], quote: 0 },
	).a;

	const res: ParsedParams = {};

	for (const fragment of fragments || []) {
		const [key, value] = fragment.split('=');
		res[key] = value === undefined ? true : value;
	}

	return res;
}

interface ConnectedDevice {
	id: string;
	socket: net.Socket;
}

class SatelliteServer {
	private readonly surfaceHost: SurfaceHost;

	private readonly devices: Record<string, ConnectedDevice | undefined> = {};
	private readonly server: net.Server;

	private readonly buildNumber: string;

	constructor(surfaceHost: SurfaceHost) {
		this.surfaceHost = surfaceHost;

		this.buildNumber = 'Unknown';
		// this.system.emit('skeleton-info-info', (info) => {
		// 	// Assume this happens synchronously
		// 	this.buildNumber = info.appBuild;
		// });

		this.server = net.createServer((socket) => {
			this.initSocket(socket);
		});
		this.server.on('error', function (e) {
			logger.debug('listen-socket error: ', e);
		});

		try {
			this.server.listen(16622);
		} catch (e) {
			logger.debug('ERROR opening port 16622 for companion satellite devices');
		}
	}

	initSocket(socket: net.Socket) {
		const socketName = socket.remoteAddress + ':' + socket.remotePort;
		logger.debug(`new connection from ${socketName}`);

		let receivebuffer = '';
		socket.on('data', (data) => {
			receivebuffer += data.toString();

			var i = 0,
				line = '',
				offset = 0;
			while ((i = receivebuffer.indexOf('\n', offset)) !== -1) {
				line = receivebuffer.substr(offset, i - offset);
				offset = i + 1;
				this.handleCommand(socket, socketName, line.toString().replace(/\r/, ''));
			}
			receivebuffer = receivebuffer.substr(offset);
		});

		socket.on('error', (e) => {
			logger.debug('socket error:', e);
		});

		socket.on('close', () => {
			for (const [key, device] of Object.entries(this.devices)) {
				if (device?.socket === socket) {
					this.surfaceHost.surfaceDisonnected(device.id);
					delete this.devices[key];
				}
			}

			socket.removeAllListeners('data');
			socket.removeAllListeners('close');
		});

		socket.write(`BEGIN CompanionVersion=${this.buildNumber} ApiVersion=${API_VERSION}\n`);
	}

	handleCommand(socket: net.Socket, socketName: string, line: string) {
		if (!line.trim().toUpperCase().startsWith('PING')) {
			logger.debug(`received "${line}" from ${socketName}`);
		}

		const i = line.indexOf(' ');
		const cmd = i === -1 ? line : line.slice(0, i);
		const body = i === -1 ? '' : line.slice(i + 1);
		const params = parseLineParameters(body);
		switch (cmd.toUpperCase()) {
			case 'ADD-DEVICE':
				this.addDevice(socket, params);
				break;
			case 'REMOVE-DEVICE':
				this.removeDevice(socket, params);
				break;
			case 'KEY-PRESS':
				this.keyPress(socket, params);
				break;
			case 'PING':
				socket.write(`PONG ${body}\n`);
				break;
			case 'PONG':
				// Nothing to do
				// TODO - track timeouts?
				break;
			case 'QUIT':
				socket.destroy();
				break;
			default:
				socket.write(`ERROR MESSAGE="Unknown command: ${cmd.toUpperCase()}"\n`);
		}
	}

	addDevice(socket: net.Socket, params: ParsedParams) {
		if (!params.DEVICEID || typeof params.DEVICEID !== 'string') {
			socket.write(`ADD-DEVICE ERROR MESSAGE="Missing DEVICEID"\n`);
			return;
		}
		if (!params.PRODUCT_NAME || typeof params.PRODUCT_NAME !== 'string') {
			socket.write(`ADD-DEVICE ERROR MESSAGE="Missing PRODUCT_NAME"\n`);
			return;
		}

		const id = `satellite-${params.DEVICEID}`;
		logger.debug(`add device "${id}" for ${socket.remoteAddress}`);

		const existing = Object.entries(this.devices).find(([internalId, dev]) => dev && dev.id === id);
		if (existing) {
			if (existing[1]?.socket === socket) {
				socket.write(`ADD-DEVICE ERROR MESSAGE="Device already added"\n`);
				return;
			} else {
				// // Reuse the existing, to avoid duplicates issues
				// setImmediate(() => {
				// 	system.emit('elgato_ready', id)
				// })
				// return existing[0]
				socket.write(`ADD-DEVICE ERROR MESSAGE="Device exists elsewhere"\n`);
				return;
			}
		}

		this.devices[id] = {
			id: id,
			socket: socket,
		};

		const keysTotal = params.KEYS_TOTAL ? parseInt(params.KEYS_TOTAL + '') : MAX_BUTTONS;
		if (isNaN(keysTotal) || keysTotal > MAX_BUTTONS || keysTotal <= 0) {
			socket.write(`ADD-DEVICE ERROR MESSAGE="Invalid KEYS_TOTAL"\n`);
			return;
		}

		const keysPerRow = params.KEYS_PER_ROW ? parseInt(params.KEYS_PER_ROW + '') : MAX_BUTTONS_PER_ROW;
		if (isNaN(keysPerRow) || keysPerRow > MAX_BUTTONS || keysPerRow <= 0) {
			socket.write(`ADD-DEVICE ERROR MESSAGE="Invalid KEYS_PER_ROW"\n`);
			return;
		}

		const streamBitmaps = params.BITMAPS === undefined || !isFalsey(params.BITMAPS);
		const streamColors = params.COLORS !== undefined && !isFalsey(params.COLORS);
		const streamText = params.TEXT !== undefined && !isFalsey(params.TEXT);

		const dev = new SatelliteDevice(
			socket,
			params.DEVICEID,
			{
				streamBitmaps,
				streamColors,
				streamText,
			},
			params.PRODUCT_NAME,
		);

		this.surfaceHost.surfaceConnected(id, dev).catch((e) => {
			logger.error(`Connect failed: ${e}`);
		});

		socket.write(`ADD-DEVICE OK DEVICEID=${params.DEVICEID}\n`);
	}

	removeDevice(socket: net.Socket, params: ParsedParams) {
		if (!params.DEVICEID) {
			socket.write(`REMOVE-DEVICE ERROR MESSAGE="Missing DEVICEID"\n`);
			return;
		}

		const id = `satellite-${params.DEVICEID}`;
		const device = this.devices[id];
		if (device && device.socket === socket) {
			this.surfaceHost.surfaceDisonnected(device.id);
			delete this.devices[id];
			socket.write(`REMOVE-DEVICE OK DEVICEID=${params.DEVICEID}\n`);
		} else {
			socket.write(`REMOVE-DEVICE ERROR MESSAGE="Device not found"\n`);
		}
	}

	keyPress(socket: net.Socket, params: ParsedParams) {
		if (!params.DEVICEID || typeof params.DEVICEID !== 'string') {
			socket.write(`KEY-PRESS ERROR MESSAGE="Missing DEVICEID"\n`);
			return;
		}
		if (!params.SLOT || typeof params.SLOT !== 'string') {
			socket.write(`KEY-PRESS ERROR MESSAGE="Missing SLOT"\n`);
			return;
		}
		if (!params.PRESSED) {
			socket.write(`KEY-PRESS ERROR MESSAGE="Missing PRESSED"\n`);
			return;
		}

		const key = parseInt(params.KEY + '');
		if (isNaN(key) || key > MAX_BUTTONS || key < 0) {
			socket.write(`KEY-PRESS ERROR MESSAGE="Invalid KEY"\n`);
			return;
		}

		const pressed = !isFalsey(params.PRESSED);

		const id = `satellite-${params.DEVICEID}`;
		const device = this.devices[id];
		if (device && device.socket === socket) {
			this.surfaceHost.surfaceControlInput(params.DEVICEID, params.SLOT, pressed);
			// this.system.emit(id + '_button', key, pressed);
			socket.write(`KEY-PRESS OK\n`);
		} else {
			socket.write(`KEY-PRESS ERROR MESSAGE="Device not found"\n`);
		}
	}
}

export async function startSatelliteServer(surfaceHost: SurfaceHost): Promise<SatelliteServer> {
	const server = new SatelliteServer(surfaceHost);
	// await server.start();
	return server;
}
