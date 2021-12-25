export function literal<T>(v: T): T {
	return v;
}

export function pick<T, K extends keyof T>(obj: T, ensureMissing: boolean, ...keys: Array<K>): Pick<T, K> {
	const res: any = {};
	for (const k of keys) {
		if (ensureMissing || k in obj) {
			res[k] = obj[k];
		}
	}
	return res;
}
