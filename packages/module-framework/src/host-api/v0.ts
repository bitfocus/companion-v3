import { CompanionActions, InstanceStatus, LogLevel, SomeCompanionInputField } from '../module-api/v0/index.js';

export interface ModuleToHostEventsV0 {
	'log-message': (msg: LogMessageMessage) => void;
	'set-status': (msg: SetStatusMessage) => void;
	setActionDefinitions: (msg: SetActionDefinitionsMessage) => void;
}

export interface HostToModuleEventsV0 {
	init: (config: unknown) => void;
	destroy: () => void;
	updateConfig: (config: unknown) => void;
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
