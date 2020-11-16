import bodyParser from 'body-parser';
import { Router } from 'express';
import { ICore } from '../core';
import { SocketCommand, SubscribeMessage, UnsubscribeMessage } from '../../shared/api';
import { IModule } from '../../shared/collections';
import { literal } from '../../shared/util';
import { SubscriptionEvent } from '../../shared/subscription';

export function apiRouter(core: ICore): Router {
	const router = Router();
	router.use(bodyParser.json());

	router.get('/api/users', async (req, res) => {
		const items = await core.db.collection('workspaces').find().toArray();
		res.json(items);
	});

	router.get('/api/user/:userId', async (req, res) => {
		const userId = req.params.userId;
		const item = await core.db.collection('workspaces').findOne({ _id: userId });
		res.json(item);
	});

	router.post('/api/set-user', (req, res) => {
		res.send(`ok`);
	});

	return router;
}

interface SubscriptionEntry {
	socket: SocketIO.Socket;
	messageName: string;
}

interface SubscriptionData {
	clients: SubscriptionEntry[];
	init: (sub: SubscriptionEntry) => void;
	destroy: () => void;
}

const dbSubscriptions = new Map<string, SubscriptionData>();

function getSubscriptionId(msg: SubscribeMessage): string {
	return msg.doc + '_' + JSON.stringify(msg.query ?? {});
}

function assertNever(val: never): void {}

function createSubscription(core: ICore, msg: SubscribeMessage): SubscriptionData {
	switch (msg.doc) {
		case 'modules': {
			if (msg.query !== undefined) {
				// TODO better
				throw new Error(`Can't have query`);
			}

			const collection = core.db.collection<IModule>('modules');
			const stream = collection.watch({
				fullDocument: 'updateLookup',
			});

			const data: SubscriptionData = {
				clients: [],
				destroy: () => {
					stream.close();
					sendToAll({
						event: 'error',
						message: 'Stream closed',
					});
				},
				init: (client: SubscriptionEntry) => {
					collection
						.find()
						.toArray()
						.then((docs) => {
							client.socket.emit(
								client.messageName,
								literal<SubscriptionEvent<IModule>>({
									event: 'init',
									docs: docs,
								}),
							);
						});
				},
			};

			function sendToAll(msg: SubscriptionEvent<IModule>): void {
				for (const client of data.clients) {
					client.socket.emit(client.messageName, msg);
				}
			}

			stream.on('end', () => {
				data.destroy();
			});

			stream.on('change', (doc) => {
				switch (doc.operationType) {
					case 'insert':
					case 'replace':
					case 'update':
						sendToAll({
							event: 'change',
							// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
							doc: doc.fullDocument!,
						});
						break;
					case 'delete':
						sendToAll({
							event: 'remove',
							docId: doc.documentKey._id,
						});
						break;
					case 'drop':
					case 'dropDatabase':
					case 'rename':
						sendToAll({
							event: 'error',
							message: 'Collection dropped',
						});
					case 'invalidate':
						data.destroy();
						break;
					// TODO
					// default:
					// 	assertNever(doc.operationType);
				}
			});

			return data;
		}
		default:
			throw new Error(`Unknown doc: "${msg.doc}"`);
	}
	// TODO
}

export function socketHandler(core: ICore): void {
	core.io.on('connection', (socket) => {
		console.log('a user connected');

		socket.on('close', () => {
			for (const [subId, data] of dbSubscriptions) {
				data.clients = data.clients.filter((c) => c.socket !== socket);
				if (data.clients.length === 0) {
					dbSubscriptions.delete(subId);
					data.destroy();
				}
			}
		});

		socket.on(SocketCommand.Subscribe, (msg: SubscribeMessage) => {
			console.log('got message', msg);
			const subId = getSubscriptionId(msg);
			let sub = dbSubscriptions.get(subId);
			if (!sub) {
				sub = createSubscription(core, msg);
				dbSubscriptions.set(subId, sub);
			}
			const entry: SubscriptionEntry = {
				messageName: msg.id,
				socket: socket,
			};
			sub.clients.push(entry);
			sub.init(entry);
		});
		socket.on(SocketCommand.Unsubscribe, (msg: UnsubscribeMessage) => {
			for (const [subId, data] of dbSubscriptions) {
				data.clients = data.clients.filter((c) => c.socket !== socket || c.messageName !== msg.id);
				if (data.clients.length === 0) {
					dbSubscriptions.delete(subId);
					data.destroy();
				}
			}
		});

		// socket.on(SocketCommand.ExecuteCommand, ({ action, cmd }: { action: ExecuteAction; cmd: IRundownItem }) => {
		// 	try {
		// 		console.log('exec cmd', action, cmd);

		// 		// TODO
		// 	} catch (err) {
		// 		console.error(`ExecuteCommand failed: ${err}`);
		// 	}
		// });
	});
}
