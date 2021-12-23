import { IControlFeedback } from '@companion/core-shared/dist/collections';
import { InputValue } from '@companion/module-framework';

export interface IDeviceConnectionWorkTask {
	_id: string;

	connectionId: string;

	task:
		| IDeviceConnectionWorkTaskActionExecute
		| IDeviceConnectionWorkTaskFeedbackUpdate
		| IDeviceConnectionWorkTaskFeedbackRemove;

	queuedTime: number;
}

export interface IDeviceConnectionWorkTaskActionExecute {
	type: 'action:execute';
	actionId: string;
	options: { [key: string]: InputValue | undefined };
}

export interface IDeviceConnectionWorkTaskFeedbackUpdate {
	type: 'feedback:update';
	controlId: string;
	feedback: IControlFeedback;
}

export interface IDeviceConnectionWorkTaskFeedbackRemove {
	type: 'feedback:remove';
	controlId: string;
	feedbackId: string;
}
