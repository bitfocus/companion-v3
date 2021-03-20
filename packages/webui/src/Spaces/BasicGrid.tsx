import { ISurfaceSpacePage, SurfaceSpecBasic } from '@companion/core-shared/dist/collections';
import { CSSProperties, useCallback } from 'react';

export interface SpaceBasicGridProps {
	spec: SurfaceSpecBasic;
	page: ISurfaceSpacePage;
	doSelectSlot: (slotId: string) => void;
}

export function SpaceBasicGrid({ spec, page, doSelectSlot }: SpaceBasicGridProps) {
	const dim = 72; // pixels

	const style: CSSProperties = {
		//
		gridTemplateColumns: `repeat(${spec.width}, ${dim}px)`,
		width: '100%',
	};

	return (
		<div className='space-basic-grid' style={style}>
			{Array(spec.height)
				.fill(0)
				.map((_, y) => {
					return Array(spec.width)
						.fill(0)
						.map((_, x) => <SpaceGridBox x={x} y={y} onClick={doSelectSlot} />);
				})}
		</div>
	);
}

interface SpaceGridBoxProps {
	x: number;
	y: number;
	onClick: (slot: string) => void;
}
function SpaceGridBox({ x, y, onClick }: SpaceGridBoxProps) {
	const doOnClick = useCallback(() => onClick(`${x}x${y}`), [onClick, x, y]);
	return (
		<div className='space-grid-box' onClick={doOnClick}>
			<div>
				{x}.{y}
			</div>
		</div>
	);
}
