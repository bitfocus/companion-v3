declare module 'respawn' {
	namespace Respawn {
		export class TypedEventEmitter<T> {
			addListener<E extends keyof T>(event: E, listener: T[E]): this;

			on<E extends keyof T>(event: E, listener: T[E]): this;

			once<E extends keyof T>(event: E, listener: T[E]): this;

			removeListener<E extends keyof T>(event: E, listener: T[E]): this;

			removeAllListeners(event?: keyof T): this;

			setMaxListeners(n: number): this;

			getMaxListeners(): number;

			listeners<E extends keyof T>(event: E): T[E][];

			emit(event: string | symbol, ...args: any[]): boolean;
			listenerCount(type: keyof T): number;

			// Added in Node 6...
			prependListener<E extends keyof T>(event: E, listener: T[E]): this;

			prependOnceListener<E extends keyof T>(event: E, listener: T[E]): this;

			eventNames(): Array<keyof T>;
		}

		export interface RespawnOptions {
			name?: string; // set monitor name
			env?: { [key: string]: string }; // set env vars
			cwd?: string; // set cwd
			maxRestarts?: number; // how many restarts are allowed within 60s
			// or -1 for infinite restarts
			sleep?: number; // time to sleep between restarts,
			kill?: number; // wait 30s before force killing after stopping
			//   stdio: [...],          // forward stdio options
			fork?: boolean; // fork instead of spawn
		}

		export enum RespawnStatus {
			'running',
			'stopping',
			'stopped',
			'crashed',
			'sleeping',
		}

		export interface RespawnEvents {
			start: () => void;
			stop: () => void;
			crash: () => void;
			sleep: () => void;
			spawn: (process: any) => void;
			exit: (code: number, signal: any) => void;
			stdout: (data: any) => void;
			stderr: (data: any) => void;
			warn: (err: any) => void;
		}

		export class RespawnMonitor extends TypedEventEmitter<RespawnEvents> {
			readonly status: RespawnStatus;

			start(): void;
			stop(cb?: () => void): void;
		}
	}

	function Respawn(command: string[], options?: Respawn.RespawnOptions): Respawn.RespawnMonitor;

	export = Respawn;
}
