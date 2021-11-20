import * as SocketIOClient from 'socket.io-client';
import { CompanionInputField } from './input.js';
import { CompanionActionEvent, CompanionActions } from './action.js';
import { CompanionUpgradeScript } from './upgrade.js';
import { CompanionFeedbackEvent, CompanionFeedbackResult, CompanionFeedbacks } from './feedback.js';
import { CompanionVariable } from './variable.js';
import { CompanionPreset } from './preset.js';
import { InstanceStatus, LogLevel } from './enums.js';
import { HostToModuleEventsV0, LogMessageMessage, ModuleToHostEventsV0, SetStatusMessage } from '../../host-api/v0.js';
import { literal } from '../../util.js';
import { InstanceBaseShared } from '../../instance-base.js';
import { ResultCallback } from '../../host-api/versions.js';

export abstract class InstanceBaseV0<TConfig> implements InstanceBaseShared<TConfig> {
	#socket: SocketIOClient.Socket;

	public readonly id: string;

	/**
	 * Create an instance of the module.
	 */
	constructor(internal: unknown, id: string) {
		const socket = internal as SocketIOClient.Socket; // TODO - can this be safer?
		if (!socket.connected || typeof id !== 'string')
			throw new Error(
				`Module instance is being constructed incorrectly. Make sure you aren't trying to do this manually`,
			);

		this.#socket = socket;
		this.id = id;

		// TODO - subscribe to socket events

		this.updateStatus(null, 'Initializing');
		this.log(LogLevel.DEBUG, 'Initializing');
	}

	private async _socketEmit<T extends keyof ModuleToHostEventsV0>(
		name: T,
		msg: Parameters<ModuleToHostEventsV0[T]>[0],
	): Promise<ReturnType<ModuleToHostEventsV0[T]>> {
		return new Promise<ReturnType<ModuleToHostEventsV0[T]>>((resolve, reject) => {
			const innerCb: ResultCallback<ReturnType<ModuleToHostEventsV0[T]>> = (
				err: any,
				res: ReturnType<ModuleToHostEventsV0[T]>,
			): void => {
				if (err) reject(err);
				else resolve(res);
			};
			this.#socket.emit(name, msg, innerCb);
		});
	}

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 */
	abstract init(config: TConfig): void | Promise<void>;

	/**
	 * Clean up the instance before it is destroyed.
	 */
	abstract destroy(): void | Promise<void>;

	/**
	 * Process an updated configuration array.
	 */
	abstract configUpdated(config: TConfig): void | Promise<void>;

	/**
	 * Creates the configuration fields for web config.
	 */
	abstract getConfigFields(): CompanionInputField[];

	/**
	 * Executes the provided action.
	 */
	abstract executeAction(event: CompanionActionEvent): void;

	/**
	 * Processes a feedback state.
	 */
	abstract executeFeedback(event: CompanionFeedbackEvent): CompanionFeedbackResult;

	protected addUpgradeScript(_fcn: CompanionUpgradeScript<TConfig>): void {
		// TODO
	}

	setActionDefinitions(actions: CompanionActions): Promise<void> {
		return this._socketEmit('setActionDefinitions', actions);
	}
	setVariableDefinitions(_variables: CompanionVariable[]): Promise<void> {
		// return this.system.setVariableDefinitions(variables);
		return Promise.resolve();
	}
	setFeedbackDefinitions(_feedbacks: CompanionFeedbacks): Promise<void> {
		// return this.system.setFeedbackDefinitions(feedbacks);
		return Promise.resolve();
	}
	setPresetDefinitions(_presets: CompanionPreset[]): Promise<void> {
		// return this.system.setPresetDefinitions(presets);
		return Promise.resolve();
	}

	variableChanged(_variableId: string, _value: string): void {
		// return this.system.variableChanged(variableId, value);
	}
	checkFeedbacks(_feedbackId?: string): void {
		// return this.system.checkFeedbacks(feedbackId);
	}

	updateStatus(status: InstanceStatus | null, message?: string | null): void {
		this._socketEmit(
			'set-status',
			literal<SetStatusMessage>({
				status,
				message: message ?? null,
			}),
		).catch((e) => {
			console.error(`updateStatus failed: ${e}`);
		});
	}

	log(level: LogLevel, message: string): void {
		this._socketEmit(
			'log-message',
			literal<LogMessageMessage>({
				level,
				message,
			}),
		).catch((e) => {
			console.error(`log failed: ${e}`);
		});
	}
}
