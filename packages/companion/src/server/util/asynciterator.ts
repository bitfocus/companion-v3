import { $$asyncIterator } from 'iterall';
import * as objectPath from 'object-path';

export function withFirstValue<T>(
	asyncIterator: AsyncIterator<T>,
	prefix: string,
	firstValue: T,
): AsyncIterator<unknown> {
	let sendFirst = false;
	return {
		async next() {
			if (!sendFirst) {
				sendFirst = true;
				const val2 = {};
				objectPath.set(val2, prefix, firstValue);
				return Promise.resolve({
					value: val2,
					done: false,
				});
			} else {
				const { value, done } = await asyncIterator.next();
				const val2_1 = {};
				objectPath.set(val2_1, prefix, value);
				return {
					value: val2_1,
					done,
				};
			}
		},
		return() {
			return Promise.resolve({ value: undefined, done: true });
		},
		throw(error) {
			return Promise.reject(error);
		},
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		[$$asyncIterator]() {
			return this;
		},
	};
}
