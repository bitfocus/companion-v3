export function clampComponent(v: number): number {
	return Math.max(0, Math.min(v, 255));
}

export function rgba(r: number, g: number, b: number, a: number): number {
	return (clampComponent(r) << 24) | (clampComponent(g) << 16) | (clampComponent(b) << 8) | clampComponent(a);
}
