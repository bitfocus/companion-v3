import { CompanionInputField } from './input';
import { CompanionActionEvent, CompanionActions } from './action';
import { CompanionUpgradeScript } from './upgrade';
import { CompanionFeedbackEvent, CompanionFeedbackResult, CompanionFeedbacks } from './feedback';
import { CompanionVariable } from './variable';
import { CompanionPreset } from './preset';
import { InstanceStatus, LogLevel } from './enums';

export interface CompanionModuleSystem {
	setActionDefinitions(actions: CompanionActions): Promise<void>;
	setVariableDefinitions(variables: CompanionVariable[]): Promise<void>;
	setFeedbackDefinitions(feedbacks: CompanionFeedbacks): Promise<void>;
	setPresetDefinitions(presets: CompanionPreset[]): Promise<void>;

	variableChanged(variableId: string, value: string): void;
	checkFeedbacks(feedbackId?: string): void;

	updateStatus(level: InstanceStatus | null, message?: string): void;
	log(level: LogLevel, message: string): void;
}

export abstract class InstanceBase<TConfig> {
	private readonly system: CompanionModuleSystem;

	public readonly id: string;

	/**
	 * Create an instance of the module.
	 */
	constructor(system: CompanionModuleSystem, id: string) {
		this.system = system;
		this.id = id;

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

	protected addUpgradeScript(fcn: CompanionUpgradeScript<TConfig>): void {
		// TODO
	}

	setActionDefinitions(actions: CompanionActions): Promise<void> {
		return this.system.setActionDefinitions(actions);
	}
	setVariableDefinitions(variables: CompanionVariable[]): Promise<void> {
		return this.system.setVariableDefinitions(variables);
	}
	setFeedbackDefinitions(feedbacks: CompanionFeedbacks): Promise<void> {
		return this.system.setFeedbackDefinitions(feedbacks);
	}
	setPresetDefinitions(presets: CompanionPreset[]): Promise<void> {
		return this.system.setPresetDefinitions(presets);
	}

	variableChanged(variableId: string, value: string): void {
		return this.system.variableChanged(variableId, value);
	}
	checkFeedbacks(feedbackId?: string): void {
		return this.system.checkFeedbacks(feedbackId);
	}

	updateStatus(level: InstanceStatus | null, message?: string): void {
		return this.system.updateStatus(level, message);
	}

	log(level: LogLevel, message: string): void {
		return this.system.log(level, message);
	}
}
