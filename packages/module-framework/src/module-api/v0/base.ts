import * as SocketIOClient from 'socket.io-client';
import { CompanionInputField } from './input';
import { CompanionActionEvent, CompanionActions } from './action';
import { CompanionUpgradeScript } from './upgrade';
import { CompanionFeedbackEvent, CompanionFeedbackResult, CompanionFeedbacks } from './feedback';
import { CompanionVariable } from './variable';
import { CompanionPreset } from './preset';
import { InstanceStatus, LogLevel } from './enums';
import { HostApiCommands, LogMessageMessage, SetStatusMessage } from '../../host-api/v0';
import { literal } from '../../util';
import { InstanceBaseShared } from '../../instance-base';

export abstract class InstanceBaseV0<TConfig> implements InstanceBaseShared<TConfig> {
	#socket: SocketIOClient.Socket;

	public readonly id: string;

	/**
	 * Create an instance of the module.
	 */
	constructor(internal: unknown, id: string) {
		if (!(internal instanceof SocketIOClient.Socket) || typeof id !== 'string')
			throw new Error(
				`Module instance is being constructed incorrectly. Make sure you aren't trying to do this manually`,
			);

		this.#socket = internal;
		this.id = id;

		// TODO - subscribe to socket events

		this.updateStatus(null, 'Initializing');
		this.log(LogLevel.DEBUG, 'Initializing');
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
		// return this.system.setActionDefinitions(actions);
		return Promise.resolve();
	}
	setVariableDefinitions(variables: CompanionVariable[]): Promise<void> {
		// return this.system.setVariableDefinitions(variables);
		return Promise.resolve();
	}
	setFeedbackDefinitions(feedbacks: CompanionFeedbacks): Promise<void> {
		// return this.system.setFeedbackDefinitions(feedbacks);
		return Promise.resolve();
	}
	setPresetDefinitions(presets: CompanionPreset[]): Promise<void> {
		// return this.system.setPresetDefinitions(presets);
		return Promise.resolve();
	}

	variableChanged(variableId: string, value: string): void {
		// return this.system.variableChanged(variableId, value);
	}
	checkFeedbacks(feedbackId?: string): void {
		// return this.system.checkFeedbacks(feedbackId);
	}

	updateStatus(status: InstanceStatus | null, message?: string | null): void {
		// return this.system.updateStatus(level, message);
		this.#socket.emit(
			HostApiCommands.SetStatus,
			literal<SetStatusMessage>({
				status,
				message: message ?? null,
			}),
		);
	}

	log(level: LogLevel, message: string): void {
		// return this.system.log(level, message);
		this.#socket.emit(
			HostApiCommands.LogMessage,
			literal<LogMessageMessage>({
				level,
				message,
			}),
		);
	}
}
