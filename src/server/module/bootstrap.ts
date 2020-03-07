import { InstanceBase, CompanionActionEvent, CompanionFeedbackEvent, CompanionModuleSystem } from '../../shared/module-api';

// Inject asar parsing
require('asar-node').register()


export class ModuleProxy {
    private readonly base: InstanceBase<any>;

	/**
	 * Create an instance of the module.
	 */
	constructor(system: CompanionModuleSystem, id: string, asarPath: string) {
        const modulePackage = require(asarPath).default
        this.base = new modulePackage(system, id)
    }

	init(config: any) {
        return this.base.init(config)
    }

	destroy() {
        return this.base.destroy()
    }

	configUpdated(config: any) {
        return this.base.configUpdated(config)
    }

	getConfigFields() {
        return this.base.getConfigFields()
    }

	executeAction(event: CompanionActionEvent) {
        return this.base.executeAction(event)
    }

	executeFeedback(event: CompanionFeedbackEvent) {
        return this.base.executeFeedback(event)
    }
}

// export class ModuleBootStrap {
//     constructor() {

//     }

//     initModule(asarPath: string): InstanceBase<any> {
//         // TODO - improve type safety?
//         const modulePackage = require(asarPath).default
//         return new modulePackage({}, 'abc')
//     }
// }

// export class ModuleBootStrap extends InstanceBase<any> {
//     constructor()
//     init(config: any): void | Promise<void> {
//         throw new Error("Method not implemented.");
//     }
//     destroy(): void | Promise<void> {
//         throw new Error("Method not implemented.");
//     }
//     configUpdated(config: any): void | Promise<void> {
//         throw new Error("Method not implemented.");
//     }
//     getConfigFields(): import("../../shared/module-api").CompanionInputField[] {
//         throw new Error("Method not implemented.");
//     }
//     executeAction(action: CompanionActionEvent): void {
//         throw new Error("Method not implemented.");
//     }
//     executeFeedback(feedback: CompanionFeedbackEvent): CompanionFeedbackResult {
//         throw new Error("Method not implemented.");
//     }

// }