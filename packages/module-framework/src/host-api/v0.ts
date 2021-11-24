import {
	CompanionActions,
	CompanionFeedbackButtonStyleResult,
	InputValue,
	InstanceStatus,
	LogLevel,
	SomeCompanionInputField,
} from '../module-api/v0/index.js';

export interface ModuleToHostEventsV0 {
	'log-message': (msg: LogMessageMessage) => void;
	'set-status': (msg: SetStatusMessage) => void;
	setActionDefinitions: (msg: SetActionDefinitionsMessage) => void;
	setFeedbackDefinitions: (msg: SetFeedbackDefinitionsMessage) => void;
	setPropertyDefinitions: (msg: SetPropertyDefinitionsMessage) => void;
}

export interface HostToModuleEventsV0 {
	init: (config: unknown) => void;
	destroy: (msg: Record<string, never>) => void;
	updateConfig: (config: unknown) => void;
	executeAction: (msg: ExecuteActionMessage) => void;
}

export interface LogMessageMessage {
	level: LogLevel;
	message: string;
}

export interface SetStatusMessage {
	status: InstanceStatus | null;
	message: string | null;
}

export interface SetActionDefinitionsMessage {
	actions: Array<{
		id: string;
		name: string;
		description?: string;
		options: SomeCompanionInputField[]; // TODO - versioned types?
	}>;
}

export interface SetFeedbackDefinitionsMessage {
	feedbacks: Array<{
		id: string;
		name: string;
		description?: string;
		options: SomeCompanionInputField[]; // TODO - versioned types?
		type: 'boolean' | 'advanced';
		defaultStyle?: Partial<CompanionFeedbackButtonStyleResult>; // TODO - better
	}>;
}

export interface SetPropertyDefinitionsMessage {
	properties: Array<{
		id: string;
		name: string;
		description?: string;
		instanceIds: Array<{ id: string | number; label: string }> | null;

		hasSubscribe: boolean;
		readonly: boolean;
	}>;
}

export interface ExecuteActionMessage {
	actionId: string;
	options: { [key: string]: InputValue | undefined };

	// TODO more over time
}
