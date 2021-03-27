import { literal } from '@companion/core-shared/dist/util';
import { expose } from 'threads/worker';

let currentCount = 0;

export type Counter = {
	getCount: () => number;
	increment: () => number;
	decrement: () => number;
};

const counter: Counter = {
	getCount() {
		return currentCount;
	},
	increment() {
		return ++currentCount;
	},
	decrement() {
		return --currentCount;
	},
};

// export type Counter = typeof counter;

expose(counter);
