export enum ControlType {
	Button = 'button',
}

export interface IControlDefinition {
	_id: string;
	x: number;
	y: number;
	latch?: boolean;
	relativeDelays?: boolean;
	controlType: ControlType;
	// renderProperties: { [key: string]: InputValue };
	// TODO - actions
	// TODO - feedbacks
}
