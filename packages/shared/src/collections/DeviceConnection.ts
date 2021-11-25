import { ConfigValue, InstanceStatus, SomeCompanionInputField } from '@companion/module-framework';

export interface IDeviceConnection {
	_id: string;
	moduleId: string;
	label: string;
	enabled: boolean;

	/** Config blob of structure defined by the module */
	moduleConfig: { [key: string]: ConfigValue };
}

export interface IDeviceConnectionStatus {
	_id: string; // connectionId

	status: InstanceStatus | null; // TODO - decouple type
	message: string | null;
}

export interface IDeviceConnectionAction {
	_id: string;

	actionId: string;
	connectionId: string;

	name: string;
	description?: string;
	options: SomeCompanionInputField[]; // TODO - typed better?
}

export interface IDeviceConnectionFeedback {
	_id: string;

	feedbackId: string;
	connectionId: string;

	name: string;
	description?: string;
	options: SomeCompanionInputField[]; // TODO - typed better?

	// TODO - more properties
}

export type IDeviceConnectionPropertyInstanceId = string | number;
export interface IDeviceConnectionProperty {
	_id: string;

	propertyId: string;
	connectionId: string;

	name: string;
	description?: string;

	instanceIds: Array<{ id: IDeviceConnectionPropertyInstanceId; label: string }> | null; // TODO - typed better?

	valueInput: SomeCompanionInputField | null;

	hasSubscribe: boolean;
}
