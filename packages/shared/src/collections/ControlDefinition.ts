import { InputValue } from '@companion/module-framework';

export enum ControlType {
	Button = 'button',
}

export interface IControlDefinition {
	_id: string;
	description: string;
	// latch?: boolean;
	// relativeDelays?: boolean;
	controlType: ControlType;

	// Rendering
	defaultLayer: IButtonControlRenderLayer;

	// Changed when the render is invalidated, to trigger a re-render
	renderHash: string;

	// A field that can be arbitrarily changed to ensure it exists throughout a transaction
	touchedAt: number;

	// Interaction

	// TODO - this needs to vary based on controlType
	// TODO - this is the wrong placement for this. needs to be actionSets
	downActions: IControlAction[];
	upActions: IControlAction[];
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

export interface IControlAction {
	id: string;

	connectionId: string;
	actionId: string;

	delay: number;
	options: { [key: string]: InputValue | undefined };
}
