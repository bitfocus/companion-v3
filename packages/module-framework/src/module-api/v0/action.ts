import { SomeCompanionInputField, InputValue } from './input.js';

export interface CompanionAction {
	label: string;
	options: SomeCompanionInputField[];
}
export interface CompanionActionEvent {
	type: string;
	options: { [key: string]: InputValue | undefined };
}

export interface CompanionActions {
	[id: string]: CompanionAction | undefined;
}
