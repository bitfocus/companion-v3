import { SomeCompanionInputField, InputValue } from './input.js';

export interface CompanionAction {
	name: string;
	description?: string;
	options: SomeCompanionInputField[];
	callback?: (action: CompanionActionEvent, info: CompanionActionEventInfo | null) => void;
	subscribe?: (action: CompanionActionEvent) => void;
	unsubscribe?: (action: CompanionActionEvent) => void;
}
export interface CompanionActionEvent {
	actionId: string;
	options: { [key: string]: InputValue | undefined };
}

export interface CompanionActionEventInfo {
	// TODO
	// deviceId: string | undefined;
	// page: number;
	// bank: number;
}

export interface CompanionActions {
	[actionId: string]: CompanionAction | undefined;
}
