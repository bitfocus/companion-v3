import { ControlType } from '@companion/core-shared/dist/collections';
import {
	SocketCommand,
	SurfaceSpacePageSlotClearMessage,
	SurfaceSpacePageSlotCreateMessage,
	SurfaceSpacePageSlotUseControlMessage,
} from '@companion/core-shared/dist/api';
import { CButton, CSelect } from '@coreui/react';
import { useCallback, useContext, useRef } from 'react';
import { CompanionContext, socketEmit2 } from '../util';
import { literal } from '@companion/core-shared/dist/util';
import { EditControl } from '../Controls/EditControl';
import { GenericConfirmModal, IGenericConfirmModalHandle } from '../Components/GenericConfirmModal';

export interface SlotEditorProps {
	spaceId: string;
	pageId: string;
	slotId: string;
	controlId: string;
}

export function SlotEditor({ spaceId, pageId, slotId, controlId }: SlotEditorProps) {
	const context = useContext(CompanionContext);

	const confirmRef = useRef<IGenericConfirmModalHandle>(null);

	const doCreateControl = useCallback(() => {
		socketEmit2(
			context.socket,
			SocketCommand.SurfaceSpacePageSlotCreate,
			literal<SurfaceSpacePageSlotCreateMessage>({
				spaceId,
				pageId,
				slotId,
				// TODO - dynamic below
				type: ControlType.Button,
			}),
		);
	}, [context.socket, spaceId, pageId, slotId]);

	const doSelectControl = useCallback(
		(e) => {
			const newControlId = e.target.value;
			if (newControlId && context.controls[newControlId]) {
				socketEmit2(
					context.socket,
					SocketCommand.SurfaceSpacePageSlotUseControl,
					literal<SurfaceSpacePageSlotUseControlMessage>({
						spaceId: spaceId,
						pageId: pageId,
						slotId: slotId,
						controlId: newControlId,
					}),
				);
			}
		},
		[context.socket, context.controls, spaceId, pageId, slotId],
	);

	const doClearControl = useCallback(() => {
		confirmRef.current?.show('Clear slot', `Are you sure you wish to clear the slot ${slotId}?`, 'Clear', () => {
			socketEmit2(
				context.socket,
				SocketCommand.SurfaceSpacePageSlotClear,
				literal<SurfaceSpacePageSlotClearMessage>({
					spaceId,
					pageId,
					slotId,
				}),
			);
		});
	}, [context.socket, spaceId, pageId, slotId]);

	return (
		<div>
			<p>Space {spaceId}</p>
			<p>Page {pageId}</p>
			<p>Slot {slotId}</p>
			<p>Control {controlId}</p>

			<GenericConfirmModal ref={confirmRef} />

			<div>
				{!controlId ? (
					<>
						<CButton onClick={doCreateControl} color='success'>
							Create
						</CButton>
						<CSelect onChange={doSelectControl} value=''>
							<option value=''>Select an existing control</option>
							{Object.values(context.controls).map((control) => (
								<option key={control._id} value={control._id}>
									{control.description}
								</option>
							))}
						</CSelect>
					</>
				) : (
					<CButton onClick={doClearControl} color='danger'>
						Clear
					</CButton>
				)}

				<hr />

				{controlId ? <EditControl controlId={controlId} /> : ''}
			</div>
		</div>
	);
}
