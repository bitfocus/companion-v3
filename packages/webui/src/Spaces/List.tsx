import {
	SocketCommand,
	SurfaceSpaceCreateMessage,
	SurfaceSpaceCreateMessageReply,
	SurfaceSpaceDeleteMessage,
} from '@companion/core-shared/dist/api';
import { ISurfaceSpace, SurfaceType } from '@companion/core-shared/dist/collections';
import { literal } from '@companion/core-shared/dist/util';
import { CButton } from '@coreui/react';
import { useCallback, useContext, useRef } from 'react';
import { GenericConfirmModal, IGenericConfirmModalHandle } from '../Components/GenericConfirmModal';
import { CompanionContext, socketEmit2 } from '../util';

export function SpacesList({ selectSpace }: { selectSpace: (id: string) => void }) {
	const context = useContext(CompanionContext);

	const confirmModalRef = useRef<IGenericConfirmModalHandle>(null);

	const addSpace = useCallback(() => {
		socketEmit2(
			context.socket,
			SocketCommand.SurfaceSpaceCreate,
			literal<SurfaceSpaceCreateMessage>({
				type: SurfaceType.ButtonGrid,
			}),
		).then((msg: SurfaceSpaceCreateMessageReply) => {
			selectSpace(msg.id);
		});
	}, [context.socket, selectSpace]);

	return (
		<div>
			<h4>Spaces</h4>
			<p>
				This is a list of all the spaces you have. These operate independently of each other and have their own
				controls mappings, and their own devices.
			</p>

			<p>
				<CButton color='primary' onClick={addSpace}>
					add
				</CButton>
			</p>

			<GenericConfirmModal ref={confirmModalRef} />

			<table className='table table-responsive-sm'>
				<thead>
					<tr>
						<th>Name</th>
						<th>Device</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{Object.values(context.spaces).map((space) => {
						return (
							<SpacesTableRow
								key={space._id}
								space={space}
								confirmModalRef={confirmModalRef}
								selectSpace={selectSpace}
							/>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

interface SpacesTableRowProps {
	space: ISurfaceSpace;
	confirmModalRef: any;
	selectSpace: (id: string) => void;
}
function SpacesTableRow({ space, confirmModalRef, selectSpace }: SpacesTableRowProps) {
	const context = useContext(CompanionContext);

	const doSelect = useCallback(() => selectSpace(space._id), [selectSpace, space._id]);

	const doDelete = useCallback(() => {
		confirmModalRef.current?.show(
			'Delete space',
			`Are you sure you want to delete this space? This will remove all its pages, and release any assigned surfaces.`,
			'Delete',
			() => {
				socketEmit2(
					context.socket,
					SocketCommand.SurfaceSpaceDelete,
					literal<SurfaceSpaceDeleteMessage>({
						id: space._id,
					}),
				);
			},
		);
	}, [confirmModalRef, context.socket, space._id]);

	return (
		<tr>
			<td>{space.name || 'Unnamed space'}</td>
			<td>{space.cachedSpec.deviceName}</td>
			<td className='action-buttons'>
				<CButton onClick={doSelect} color='primary' size='sm'>
					select
				</CButton>
				<CButton onClick={doDelete} variant='ghost' color='danger' size='sm'>
					delete
				</CButton>
			</td>
		</tr>
	);
}
