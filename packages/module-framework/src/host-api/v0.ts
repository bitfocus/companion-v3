import { InstanceStatus, LogLevel } from '../module-api/v0/index.js';

// TODO fill out more
export enum HostApiCommands {
	LogMessage = 'LOGMESSAGE',
	SetStatus = 'STATUS',
}

export interface LogMessageMessage {
	level: LogLevel;
	message: string;
}

export interface SetStatusMessage {
	status: InstanceStatus | null;
	message: string | null;
}
