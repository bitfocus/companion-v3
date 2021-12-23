import { createChildLogger } from '../logger.js';
import { generateDocumentId, ICore } from '../core.js';
import { ControlType, IControlAction, IControlFeedback } from '@companion/core-shared/dist/collections/index.js';
import * as Mongo from 'mongodb';
import { literal } from '@companion/module-framework';
import { IDeviceConnectionWorkTask } from '../internal/connection-work.js';

const logger = createChildLogger('services/control-runner');

export class ControlRunner {
	private readonly core: ICore;
	// Note: in a multi-node environment, how will we represent current control state
	// private readonly queue: PQueue;

	constructor(core: ICore) {
		this.core = core;
	}

	public async pressControl(controlId: string, pressed: boolean): Promise<void> {
		const control = await this.core.models.controlDefinitions.findOne({ _id: controlId });
		if (!control) throw new Error(`Unknown control`);

		this.core.models.controlStatus
			.replaceOne(
				{ _id: controlId },
				{
					_id: controlId,
					pressed: pressed,
				},
				{ upsert: true },
			)
			.catch((e) => {
				logger.warn(`Failed to update Status of control ${controlId}: ${e}`);
			});

		let actions: IControlAction[] | undefined;
		if (control.controlType === ControlType.Button) {
			if (pressed) {
				actions = control.downActions;
			} else {
				actions = control.upActions;
			}
		} else {
			throw new Error(`Control type "${control.controlType}" does not support presses (${controlId})`);
		}

		if (!actions) {
			logger.info(`Control ${controlId} cannot do ${pressed ? 'press' : 'release'}`);
			return;
		}

		if (actions.length > 0) {
			const now = Date.now();

			await this.core.models.deviceConnectionWorkTasks.bulkWrite(
				actions.map((action) =>
					literal<Mongo.AnyBulkWriteOperation<IDeviceConnectionWorkTask>>({
						insertOne: {
							document: {
								_id: generateDocumentId(),
								connectionId: action.connectionId,
								task: {
									type: 'action:execute',
									actionId: action.actionId,
									options: action.options,
									// delay: action.delay, // TODO
								},
								queuedTime: now,
							},
						},
					}),
				),
			);
		}
	}

	public async updatedFeedback(controlId: string, feedback: IControlFeedback): Promise<void> {
		await this.core.models.deviceConnectionWorkTasks.insertOne(
			literal<IDeviceConnectionWorkTask>({
				_id: generateDocumentId(),
				connectionId: feedback.connectionId,
				task: {
					type: 'feedback:update',
					controlId: controlId,
					feedback: feedback,
				},
				queuedTime: Date.now(),
			}),
		);
	}

	public async removedFeedback(controlId: string, feedback: IControlFeedback): Promise<void> {
		await this.core.models.deviceConnectionWorkTasks.insertOne(
			literal<IDeviceConnectionWorkTask>({
				_id: generateDocumentId(),
				connectionId: feedback.connectionId,
				task: {
					type: 'feedback:remove',
					controlId: controlId,
					feedbackId: feedback.id,
				},
				queuedTime: Date.now(),
			}),
		);
	}
}

export async function startControlRunner(core: ICore): Promise<ControlRunner> {
	const runner = new ControlRunner(core);
	// await runner.start();
	return runner;
}
