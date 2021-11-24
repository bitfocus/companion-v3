import * as SocketIOClient from 'socket.io-client';
import { CompanionInputField } from './input.js';
import { CompanionAction, CompanionActions } from './action.js';
import { CompanionFeedbacks, CompanionFeedback } from './feedback.js';
import { CompanionVariable } from './variable.js';
import { CompanionPreset } from './preset.js';
import { InstanceStatus, LogLevel } from './enums.js';
import {
	ExecuteActionMessage,
	HostToModuleEventsV0,
	LogMessageMessage,
	ModuleToHostEventsV0,
	SetActionDefinitionsMessage,
	SetFeedbackDefinitionsMessage,
	SetPropertyDefinitionsMessage,
	SetStatusMessage,
} from '../../host-api/v0.js';
import { literal } from '../../util.js';
import { InstanceBaseShared } from '../../instance-base.js';
import { ResultCallback } from '../../host-api/versions.js';
import PQueue from 'p-queue';
import { CompanionProperties, CompanionProperty, CompanionPropertyValue } from './property.js';

/**
 * Signature for the handler functions
 */
type HandlerFunction<T extends (...args: any) => any> = (
	// socket: SocketIOClient.Socket,
	// logger: winston.Logger,
	// socketContext: SocketContext,
	data: Parameters<T>[0],
) => Promise<ReturnType<T>>;

type HandlerFunctionOrNever<T> = T extends (...args: any) => any ? HandlerFunction<T> : never;

/** Map of handler functions */
export type EventHandlers<T extends object> = {
	[K in keyof T]: HandlerFunctionOrNever<T[K]>;
};

/** Subscribe to all the events defined in the handlers, and wrap with safety and logging */
export function listenToEvents<T extends object>(
	// self: InstanceBaseV0<any>,
	socket: SocketIOClient.Socket<T>,
	// core: ICore,
	// connectionId: string,
	handlers: EventHandlers<T>,
): void {
	// const logger = createChildLogger(`module/${connectionId}`);

	for (const [event, handler] of Object.entries(handlers)) {
		socket.on(event as any, async (msg: any, cb: ResultCallback<any>) => {
			if (!msg || typeof msg !== 'object') {
				console.warn(`Received malformed message object "${event}"`);
				return; // Ignore messages without correct structure
			}
			if (cb && typeof cb !== 'function') {
				console.warn(`Received malformed callback "${event}"`);
				return; // Ignore messages without correct structure
			}

			try {
				// Run it
				const handler2 = handler as HandlerFunction<(msg: any) => any>;
				const result = await handler2(msg);

				if (cb) cb(null, result);
			} catch (e: any) {
				console.error(`Command failed: ${e}`);
				if (cb) cb(e?.toString() ?? JSON.stringify(e), undefined);
			}
		});
	}
}

export abstract class InstanceBaseV0<TConfig> implements InstanceBaseShared<TConfig> {
	readonly #socket: SocketIOClient.Socket;
	public readonly id: string;

	readonly #lifecycleQueue: PQueue;
	#initialized: boolean;

	readonly #actionDefinitions: Map<string, CompanionAction>;
	readonly #feedbackDefinitions: Map<string, CompanionFeedback>;
	readonly #propertyDefinitions: Map<string, CompanionProperty>;

	/**
	 * Create an instance of the module.
	 */
	constructor(internal: unknown, id: string) {
		const socket = internal as SocketIOClient.Socket; // TODO - can this be safer?
		if (!socket.connected || typeof id !== 'string')
			throw new Error(
				`Module instance is being constructed incorrectly. Make sure you aren't trying to do this manually`,
			);

		this.#socket = socket;
		this.id = id;

		this.#lifecycleQueue = new PQueue({ concurrency: 1 });
		this.#initialized = false;

		this.#actionDefinitions = new Map();
		this.#feedbackDefinitions = new Map();
		this.#propertyDefinitions = new Map();

		// subscribe to socket events from host
		listenToEvents<HostToModuleEventsV0>(socket, {
			init: this._handleInit.bind(this),
			destroy: this._handleDestroy.bind(this),
			updateConfig: this._handleConfigUpdate.bind(this),
			executeAction: this._handleExecuteAction.bind(this),
		});

		this.updateStatus(null, 'Initializing');
		this.userLog(LogLevel.DEBUG, 'Initializing');
	}

	private async _socketEmit<T extends keyof ModuleToHostEventsV0>(
		name: T,
		msg: Parameters<ModuleToHostEventsV0[T]>[0],
	): Promise<ReturnType<ModuleToHostEventsV0[T]>> {
		return new Promise<ReturnType<ModuleToHostEventsV0[T]>>((resolve, reject) => {
			const innerCb: ResultCallback<ReturnType<ModuleToHostEventsV0[T]>> = (
				err: any,
				res: ReturnType<ModuleToHostEventsV0[T]>,
			): void => {
				if (err) reject(err);
				else resolve(res);
			};
			this.#socket.emit(name, msg, innerCb);
		});
	}

	private async _handleInit(config: unknown): Promise<void> {
		await this.#lifecycleQueue.add(async () => {
			if (this.#initialized) throw new Error('Already initialized');

			await this.init(config as TConfig);

			this.#initialized = true;
		});
	}
	private async _handleDestroy(): Promise<void> {
		await this.#lifecycleQueue.add(async () => {
			if (!this.#initialized) throw new Error('Not initialized');

			await this.destroy();

			this.#initialized = false;
		});
	}
	private async _handleConfigUpdate(config: unknown): Promise<void> {
		await this.#lifecycleQueue.add(async () => {
			if (!this.#initialized) throw new Error('Not initialized');

			await this.configUpdated(config as TConfig);
		});
	}
	private async _handleExecuteAction(msg: ExecuteActionMessage): Promise<void> {
		const actionDefinition = this.#actionDefinitions.get(msg.actionId);
		if (!actionDefinition) throw new Error(`Unknown action`);

		await actionDefinition.callback({
			actionId: msg.actionId,
			options: msg.options,
		});
	}

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 */
	abstract init(config: TConfig): void | Promise<void>;

	/**
	 * Clean up the instance before it is destroyed.
	 */
	abstract destroy(): void | Promise<void>;

	/**
	 * Process an updated configuration array.
	 */
	abstract configUpdated(config: TConfig): void | Promise<void>;

	/**
	 * Creates the configuration fields for web config.
	 */
	abstract getConfigFields(): CompanionInputField[];

	// /**
	//  * Executes the provided action.
	//  */
	// abstract executeAction(event: CompanionActionEvent): void;

	// /**
	//  * Processes a feedback state.
	//  */
	// abstract executeFeedback(event: CompanionFeedbackEvent): CompanionFeedbackResult;

	setActionDefinitions(actions: CompanionActions): Promise<void> {
		const hostActions: SetActionDefinitionsMessage['actions'] = [];

		this.#actionDefinitions.clear();

		for (const [actionId, action] of Object.entries(actions)) {
			if (action) {
				hostActions.push({
					id: actionId,
					name: action.name,
					description: action.description,
					options: action.options,
				});

				// Remember the definition locally
				this.#actionDefinitions.set(actionId, action);
			}
		}

		return this._socketEmit('setActionDefinitions', { actions: hostActions });
	}
	setVariableDefinitions(_variables: CompanionVariable[]): Promise<void> {
		// return this.system.setVariableDefinitions(variables);
		return Promise.resolve();
	}
	setFeedbackDefinitions(feedbacks: CompanionFeedbacks): Promise<void> {
		const hostFeedbacks: SetFeedbackDefinitionsMessage['feedbacks'] = [];

		this.#feedbackDefinitions.clear();

		for (const [feedbackId, feedback] of Object.entries(feedbacks)) {
			if (feedback) {
				hostFeedbacks.push({
					id: feedbackId,
					name: feedback.name,
					description: feedback.description,
					options: feedback.options,
					type: feedback.type,
					defaultStyle: 'defaultStyle' in feedback ? feedback.defaultStyle : undefined,
				});

				// Remember the definition locally
				this.#feedbackDefinitions.set(feedbackId, feedback);
			}
		}

		return this._socketEmit('setFeedbackDefinitions', { feedbacks: hostFeedbacks });
	}
	setPresetDefinitions(_presets: CompanionPreset[]): Promise<void> {
		// return this.system.setPresetDefinitions(presets);
		return Promise.resolve();
	}
	setPropertiesDefinitions(properties: CompanionProperties): Promise<void> {
		const hostProperties: SetPropertyDefinitionsMessage['properties'] = [];

		this.#propertyDefinitions.clear();

		for (const [propertyId, property] of Object.entries(properties)) {
			if (property) {
				hostProperties.push({
					id: propertyId,
					name: property.name,
					description: property.description,
					instanceIds: property.instanceIds,

					hasSubscribe: !!property.subscribe,
					readonly: !property.setValue,
				});

				// Remember the definition locally
				this.#propertyDefinitions.set(propertyId, property);
			}
		}

		return this._socketEmit('setPropertyDefinitions', { properties: hostProperties });
	}

	updatePropertyValues(
		_values: Array<{ propertyId: string; instanceId: string | null; value: CompanionPropertyValue }>,
	): Promise<void> {
		return Promise.resolve();
	}

	variableChanged(_variableId: string, _value: string): void {
		// return this.system.variableChanged(variableId, value);
	}
	checkFeedbacks(_feedbackId?: string): void {
		// return this.system.checkFeedbacks(feedbackId);
	}

	updateStatus(status: InstanceStatus | null, message?: string | null): void {
		this._socketEmit(
			'set-status',
			literal<SetStatusMessage>({
				status,
				message: message ?? null,
			}),
		).catch((e) => {
			console.error(`updateStatus failed: ${e}`);
		});
	}

	userLog(level: LogLevel, message: string): void {
		this._socketEmit(
			'log-message',
			literal<LogMessageMessage>({
				level,
				message,
			}),
		).catch((e) => {
			console.error(`log failed: ${e}`);
		});
	}
}
