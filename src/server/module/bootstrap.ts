import {
	InstanceBase,
	CompanionActionEvent,
	CompanionFeedbackEvent,
	CompanionModuleSystem,
} from '../../shared/module-api';

// Inject asar parsing
require('asar-node').register();

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

	init(config: any) {
		return this.base.init(config);
	}

	destroy() {
		return this.base.destroy();
	}

	configUpdated(config: any) {
		return this.base.configUpdated(config);
	}

	getConfigFields() {
		return this.base.getConfigFields();
	}

	executeAction(event: CompanionActionEvent) {
		return this.base.executeAction(event);
	}

	executeFeedback(event: CompanionFeedbackEvent) {
		return this.base.executeFeedback(event);
	}
}
