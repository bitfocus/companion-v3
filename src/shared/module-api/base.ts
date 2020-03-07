import { CompanionInputField } from "./input";
import { CompanionActionEvent, CompanionActions } from "./action";
import { CompanionUpgradeScript } from "./upgrade";
import { CompanionFeedbackEvent, CompanionFeedbackResult, CompanionFeedbacks } from "./feedback";
import { CompanionVariable } from "./variable";
import { CompanionPreset } from "./preset";
import { InstanceStatus, LogLevel } from "./enums";

export interface CompanionModuleSystem {

}

export abstract class InstanceBase<TConfig> {
    private readonly system: CompanionModuleSystem;

    public readonly id: string;

	/**
	 * Create an instance of the module.
	 */
	constructor(system: CompanionModuleSystem, id: string) {
        this.system = system
        this.id = id;
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
	abstract executeAction(action: CompanionActionEvent): void;

	/**
	 * Processes a feedback state.
	 */
	abstract executeFeedback(feedback: CompanionFeedbackEvent): CompanionFeedbackResult;

	protected addUpgradeScript(fcn: CompanionUpgradeScript<TConfig>): void {
        // TODO
    }

	setActionDefinitions(actions: CompanionActions): Promise<void> {
        // TODO
        return Promise.resolve()
    }
	setVariableDefinitions(variables: CompanionVariable[]): Promise<void> {
        // TODO
        return Promise.resolve()
    }
	setFeedbackDefinitions(feedbacks: CompanionFeedbacks): Promise<void> {
        // TODO
        return Promise.resolve()
    }
	setPresetDefinitions(presets: CompanionPreset[]): Promise<void> {
        // TODO
        return Promise.resolve()
    }

	variableChanged(variableId: string, value: string): void {
        // TODO
    }
	checkFeedbacks(feedbackId?: string): void {
        // TODO
    }

    updateStatus(level: InstanceStatus | null, message?: string): void {
        // TODO
    }

	log(level: LogLevel, message: string): void {
        // TODO
    }
}
