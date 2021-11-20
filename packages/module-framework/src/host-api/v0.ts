import { CompanionActions, InstanceStatus, LogLevel } from '../module-api/v0/index.js';
import { ResultCallback } from './versions.js';

export interface ModuleToHostEventsV0 {
	'log-message': (msg: LogMessageMessage) => void;
	'set-status': (msg: SetStatusMessage) => void;
	setActionDefinitions: (actions: CompanionActions) => void;
}

export interface HostToModuleEventsV0 {
	registered2: () => void;
}

export interface LogMessageMessage {
	level: LogLevel;
	message: string;
}

export interface SetStatusMessage {
	status: InstanceStatus | null;
	message: string | null;
}
