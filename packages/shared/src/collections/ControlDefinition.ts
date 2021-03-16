export enum ControlType {
	Button = 'button',
}

export interface IControlDefinition {
	_id: string;
	description: string;
	// x: number;
	// y: number;
	latch?: boolean;
	relativeDelays?: boolean;
	controlType: ControlType;
	// renderProperties: { [key: string]: InputValue };
	// TODO - actions
	// TODO - feedbacks
}

// TODO - presets should be inserted here when referenced. Ideally they should remain linked to the preset, so that duplicates get combined, and they get updated by the module author
