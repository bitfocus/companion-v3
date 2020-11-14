import { InputValue } from '../fields';

export enum ButtonType {
	Inactive = 'inactive',
	Text = 'text',
}

export interface IBank {
	id: string;
	x: number;
	y: number;
	latch?: boolean;
	relativeDelays?: boolean;
	buttonType: ButtonType;
	renderProperties: { [key: string]: InputValue };
	// TODO - actions
	// TODO - feedbacks
}
