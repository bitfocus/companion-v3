import {
	InstanceBase,
	CompanionActionEvent,
	CompanionFeedbackEvent,
	CompanionModuleSystem,
	CompanionInputField,
	CompanionFeedbackResult,
} from '@companion/module-framework';
import asar from 'asar-node';

// Inject asar parsing
asar.register();

export class ModuleProxy {
	private readonly base: InstanceBase<any>;

	/**
	 * Create an instance of the module.
	 * Note: ThreadedClass does not support passing CompanionModuleSystem into a constructor currently, so we hack around it by spreading it out
	 */
	constructor(
		entrypoint: string,
		id: string,

		setActionDefinitions: CompanionModuleSystem['setActionDefinitions'],
		setVariableDefinitions: CompanionModuleSystem['setVariableDefinitions'],
		setFeedbackDefinitions: CompanionModuleSystem['setFeedbackDefinitions'],
		setPresetDefinitions: CompanionModuleSystem['setPresetDefinitions'],
		variableChanged: CompanionModuleSystem['variableChanged'],
		checkFeedbacks: CompanionModuleSystem['checkFeedbacks'],
		updateStatus: CompanionModuleSystem['updateStatus'],
		log: CompanionModuleSystem['log'],
	) {
		const modulePackage = require(entrypoint).default;

		const system: CompanionModuleSystem = {
			setActionDefinitions,
			setVariableDefinitions,
			setFeedbackDefinitions,
			setPresetDefinitions,
			variableChanged,
			checkFeedbacks,
			log,
			updateStatus,
		};
		this.base = new modulePackage(system, id);
	}

	/**
	 * The same user methods from InstanceBase, exposed for core to call
	 */

	init(config: any): Promise<void> | void {
		return this.base.init(config);
	}

	destroy(): Promise<void> | void {
		return this.base.destroy();
	}

	configUpdated(config: any): Promise<void> | void {
		return this.base.configUpdated(config);
	}

	getConfigFields(): CompanionInputField[] {
		return this.base.getConfigFields();
	}

	executeAction(event: CompanionActionEvent): void {
		return this.base.executeAction(event);
	}

	executeFeedback(event: CompanionFeedbackEvent): CompanionFeedbackResult {
		return this.base.executeFeedback(event);
	}
}
