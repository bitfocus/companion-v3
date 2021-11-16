export interface IControlRender {
	// Id is the same as IControlDefinition._id
	_id: string;

	renderHash: string;

	pngStr: string;
}

export function pngBufferToString(buffer: Buffer): string {
	return `data:image/png;base64,${buffer.toString('base64')}`;
}