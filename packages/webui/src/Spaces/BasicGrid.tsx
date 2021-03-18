import { ISurfaceSpacePage, SurfaceSpecBasic } from '@companion/core-shared/dist/collections';
import { CSSProperties } from 'react';

export interface SpaceBasicGridProps {
	spec: SurfaceSpecBasic;
	page: ISurfaceSpacePage;
}

export function SpaceBasicGrid({ spec, page }: SpaceBasicGridProps) {
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
						.map((_, x) => <SpaceGridBox x={x} y={y} />);
				})}
		</div>
	);
}

interface SpaceGridBoxProps {
	x: number;
	y: number;
}
function SpaceGridBox({ x, y }: SpaceGridBoxProps) {
	return (
		<div className='space-grid-box'>
			<div>
				{x}.{y}
			</div>
		</div>
	);
}
