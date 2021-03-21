import {
	CollectionId,
	IControlRender,
	ISurfaceSpacePage,
	SurfaceSpecBasic,
} from '@companion/core-shared/dist/collections';
import { CSSProperties, useCallback, useContext } from 'react';
import { useCollectionOne } from '../lib/subscription';
import { CompanionContext } from '../util';

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
						.map((_, x) => {
							const slotId = `${x}x${y}`;
							return (
								<SpaceGridBox
									slotId={slotId}
									controlId={page.controls[slotId]}
									onClick={doSelectSlot}
								/>
							);
						});
				})}
		</div>
	);
}

interface SpaceGridBoxProps {
	slotId: string;
	controlId: string | undefined;
	onClick: (slot: string) => void;
}
function SpaceGridBox({ slotId, controlId, onClick }: SpaceGridBoxProps) {
	const context = useContext(CompanionContext);

	const doOnClick = useCallback(() => onClick(slotId), [onClick, slotId]);

	const [render, renderMissing] = useCollectionOne<IControlRender>(
		context.socket,
		CollectionId.ControlRenders,
		controlId ?? null,
	);

	return (
		<div className='space-grid-box' onClick={doOnClick}>
			<div>{render ? <img src={render.pngStr} /> : slotId}</div>
		</div>
	);
}
