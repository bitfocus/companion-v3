import { CompanionAction, ConfigValue } from '@companion/module-framework';

export interface IDeviceConnection {
	_id: string;
	moduleId: string;
	label: string;
	enabled: boolean;

	/** Config blob of structure defined by the module */
	moduleConfig: {[key: string]: ConfigValue}
}

export interface IDeviceConnectionAction {
	_id: string;

	actionId: string;
	connectionId: string;

	// TODO - should this type be better?
	rawAction: CompanionAction;
}
