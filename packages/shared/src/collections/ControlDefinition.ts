export enum ControlType {
	Button = 'button',
}

export interface IControlDefinition {
	_id: string;
	description: string;
	// x: number;
	// y: number;
	// latch?: boolean;
	// relativeDelays?: boolean;
	controlType: ControlType;

	// Rendering
	defaultLayer: IButtonControlRenderLayer;

	// Interaction
	// TODO - actions
	// TODO - feedbacks
}

export interface IButtonControlRenderLayer {
	text: string;
	textSize: number | 'auto';
	textAlignment: ['l' | 'c' | 'r', 't' | 'c' | 'b'];
	textColor: number; // rgba

	backgroundColor: number; // rgba
}

// TODO - presets should be inserted here when referenced. Ideally they should remain linked to the preset, so that duplicates get combined, and they get updated by the module author
