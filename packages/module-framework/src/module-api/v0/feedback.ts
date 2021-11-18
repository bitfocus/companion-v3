import { SomeCompanionInputField, InputValue } from './input.js';

export interface CompanionFeedbackEvent {
	type: string;
	options: { [key: string]: InputValue | undefined };
}
export interface CompanionFeedbackResult {
	color?: number;
	bgcolor?: number;
}

export interface CompanionFeedback {
	label: string;
	description: string;
	options: SomeCompanionInputField[];
}

export interface CompanionFeedbacks {
	[id: string]: CompanionFeedback | undefined;
}
