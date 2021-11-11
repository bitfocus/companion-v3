import { CompanionAction } from '@companion/module-framework';

export interface IDeviceConnection {
	_id: string;
	moduleId: string;
	label: string;
	enabled: boolean;
}

export interface IDeviceConnectionAction {
	_id: string;

	actionId: string;
	connectionId: string;

	// TODO - should this type be better?
	rawAction: CompanionAction;
}
