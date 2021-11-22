import { InputValue } from '@companion/module-framework';

export interface IDeviceConnectionWorkTask {
	_id: string;

	connectionId: string;

	task: IDeviceConnectionWorkTaskActionExecute | IDeviceConnectionWorkTaskActionExecute2;

	queuedTime: number;
}

export interface IDeviceConnectionWorkTaskActionExecute {
	type: 'action:execute';
	actionId: string;
	options: { [key: string]: InputValue | undefined };
}

export interface IDeviceConnectionWorkTaskActionExecute2 {
	type: 'action2';
	actionId: string;
	options: { [key: string]: InputValue };
}
