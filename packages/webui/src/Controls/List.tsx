import {
	ControlDefinitionCreateMessage,
	ControlDefinitionCreateMessageReply,
	ControlDefinitionDeleteMessage,
	SocketCommand,
} from '@companion/core-shared/dist/api';
import { CollectionId, ControlType, IControlDefinition, IControlRender } from '@companion/core-shared/dist/collections';
import { literal } from '@companion/core-shared/dist/util';
import { CButton } from '@coreui/react';
import { ReactElement, useCallback, useContext, useRef } from 'react';
import { GenericConfirmModal, IGenericConfirmModalHandle } from '../Components/GenericConfirmModal';
import { useCollectionOne } from '../lib/subscription';
import { CompanionContext, socketEmit2 } from '../util';

export function ControlsList({ editControl }: { editControl: (id: string) => void }) {
	const context = useContext(CompanionContext);

	const confirmModalRef = useRef<IGenericConfirmModalHandle>(null);

	const addControl = useCallback(() => {
		socketEmit2(
			context.socket,
			SocketCommand.ControlDefinitionCreate,
			literal<ControlDefinitionCreateMessage>({
				type: ControlType.Button,
			}),
		).then((msg: ControlDefinitionCreateMessageReply) => {
			editControl(msg.id);
		});
	}, [context.socket, editControl]);

	return (
		<div>
			<h4>Controls</h4>
			<p>
				This is a list of all the controls you have defined. These can be assigned to multiple slots across
				different spaces and pages.
			</p>

			<p>
				<CButton color='primary' onClick={addControl}>
					add (button)
				</CButton>
			</p>

			<GenericConfirmModal ref={confirmModalRef} />

			<table className='table table-responsive-sm'>
				<thead>
					<tr>
						<th>Name</th>
						<th>Preview</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{Object.values(context.controls).map((control) => {
						return (
							<ControlsTableRow
								key={control._id}
								control={control}
								confirmModalRef={confirmModalRef}
								editControl={editControl}
							/>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

interface ControlsTableRowProps {
	control: IControlDefinition;
	confirmModalRef: any;
	editControl: (id: string) => void;
}
function ControlsTableRow({ control, confirmModalRef, editControl }: ControlsTableRowProps) {
	const context = useContext(CompanionContext);

	const doEdit = useCallback(() => editControl(control._id), [editControl, control._id]);

	const doDelete = useCallback(() => {
		confirmModalRef.current?.show(
			'Delete control',
			`Are you sure you want to delete this control? This will remove it from anywhere it is assigned`,
			'Delete',
			() => {
				socketEmit2(
					context.socket,
					SocketCommand.ControlDefinitionDelete,
					literal<ControlDefinitionDeleteMessage>({
						id: control._id,
					}),
				);
			},
		);
	}, [confirmModalRef, context.socket, control._id]);

	const [render] = useCollectionOne<IControlRender>(context.socket, CollectionId.ControlRenders, control._id);

	let controlPreview: ReactElement | string = 'Unsupported control type';
	switch (control.controlType) {
		case ControlType.Button:
			controlPreview = render ? <img src={render.pngStr} alt='' /> : 'Loading';
			break;
		default:
		// TODO - ensure unreachable
	}

	return (
		<tr>
			<td>{control.description || 'Unnamed control'}</td>
			<td>{controlPreview}</td>
			<td className='action-buttons'>
				<CButton onClick={doEdit} color='primary' size='sm'>
					edit
				</CButton>
				<CButton onClick={doDelete} variant='ghost' color='danger' size='sm'>
					delete
				</CButton>
			</td>
		</tr>
	);
}
