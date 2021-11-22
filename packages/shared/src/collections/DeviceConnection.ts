import { CompanionAction, ConfigValue, SomeCompanionInputField } from '@companion/module-framework';

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

	name: string;
	description?: string;
	options: SomeCompanionInputField[]; // TODO - typed better?
}
