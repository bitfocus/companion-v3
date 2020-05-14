import { SomeCompanionInputField, InputValue } from './input';

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
