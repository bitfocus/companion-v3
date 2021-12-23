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
	overlayLayers: IButtonControlOverlayLayer[];

	// Changed when the render is invalidated, to trigger a re-render
	renderHash: string;

	// A field that can be arbitrarily changed to ensure it exists throughout a transaction
	touchedAt: number;

	// Interaction

	// TODO - this needs to vary based on controlType
	// TODO - this is the wrong placement for this. needs to be actionSets
	downActions: IControlAction[];
	upActions: IControlAction[];
}

export interface IButtonControlOverlayBaseLayer {
	id: string;
	name: string;
	disabled: boolean;
}
export type IButtonControlOverlayLayer = IButtonControlOverlayFeedbackLayer | IButtonControlOverlayExpressionLayer;
export interface IButtonControlOverlayFeedbackLayer extends IButtonControlOverlayBaseLayer {
	type: 'advanced';

	feedback: IControlFeedback;
}
export interface IButtonControlOverlayExpressionLayer extends IButtonControlOverlayBaseLayer {
	type: 'expression';

	style: Partial<IButtonControlRenderLayer>;

	// TODO - AND/OR expressions
	condition: IControlFeedback[];
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

export interface IControlFeedback {
	id: string;

	connectionId: string;
	feedbackId: string;

	options: { [key: string]: InputValue | undefined };
}

/** Get all the feedbacks in use on this control */
export function getAllControlDefinitionFeedbacks(control: IControlDefinition): IControlFeedback[] {
	const feedbacks: IControlFeedback[] = [];

	for (const layer of control.overlayLayers) {
		if (layer.type === 'advanced') {
			feedbacks.push(layer.feedback);
		}
	}

	return feedbacks;
}
