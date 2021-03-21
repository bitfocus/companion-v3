export function clampComponent(v: number): number {
	return Math.max(0, Math.min(v, 255));
}

export function rgba(r: number, g: number, b: number, a: number): number {
	return (clampComponent(r) << 24) | (clampComponent(g) << 16) | (clampComponent(b) << 8) | clampComponent(a);
}

export function splitColors(number: number, alpha: boolean): { r: number; g: number; b: number; a: number } {
	if (alpha) {
		return {
			r: (number >> 24) & 0xff,
			g: (number >> 16) & 0xff,
			b: (number >> 8) & 0xff,
			a: number & 0xff,
		};
	} else {
		return {
			r: (number >> 16) & 0xff,
			g: (number >> 8) & 0xff,
			b: number & 0xff,
			a: 0xff,
		};
	}
}
