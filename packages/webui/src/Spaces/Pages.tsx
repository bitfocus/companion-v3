import {
	SocketCommand,
	SurfaceSpaceCreateMessageReply,
	SurfaceSpacePageCreateMessage,
	SurfaceSpacePageDeleteMessage,
} from '@companion/core-shared/dist/api';
import { ISurfaceSpace, ISurfaceSpacePage } from '@companion/core-shared/dist/collections';
import { literal } from '@companion/core-shared/dist/util';
import { CButton } from '@coreui/react';
import { useCallback, useContext, useRef } from 'react';
import { GenericConfirmModal } from '../Components/GenericConfirmModal';
import { CompanionContext, socketEmit2 } from '../util';

export function SpacePages({
	space,
	pages,
	selectPage,
}: {
	space: ISurfaceSpace;
	pages: Record<string, ISurfaceSpacePage>;
	selectPage: (id: string) => void;
}) {
	const context = useContext(CompanionContext);

	const confirmModalRef = useRef<any>(null);

	const addPage = useCallback(() => {
		socketEmit2(
			context.socket,
			SocketCommand.SurfaceSpaceCreate,
			literal<SurfaceSpacePageCreateMessage>({
				spaceId: space._id,
			}),
		).then((msg: SurfaceSpaceCreateMessageReply) => {
			selectPage(msg.id);
		});
	}, [context.socket, selectPage]);

	// TODO - sort by the defined order
	const pagesList = Object.values(pages ?? {});
	return (
		<div>
			<h4>Pages</h4>
			<p>
				This is a list of all the pages in this space. Devices can switch between these pages to change their
				controls during use.
			</p>

			<p>
				<CButton color='primary' onClick={addPage}>
					add
				</CButton>
			</p>

			<GenericConfirmModal ref={confirmModalRef} />

			<table className='table table-responsive-sm'>
				<thead>
					<tr>
						<th>Name</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{pagesList.map((page) => {
						return (
							<PagesTableRow
								key={page._id}
								page={page}
								allowDelete={pagesList.length > 1}
								confirmModalRef={confirmModalRef}
								selectPage={selectPage}
							/>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

interface PagesTableRowProps {
	page: ISurfaceSpacePage;
	allowDelete: boolean;
	confirmModalRef: any;
	selectPage: (id: string) => void;
}
function PagesTableRow({ page, confirmModalRef, selectPage }: PagesTableRowProps) {
	const context = useContext(CompanionContext);

	const doSelect = useCallback(() => selectPage(page._id), [selectPage, page._id]);

	const doDelete = useCallback(() => {
		confirmModalRef.current?.show(
			'Delete page',
			`Are you sure you want to delete this page? This will remove all its controls, and any surfaces viewing it will be switched to the first page.`,
			'Delete',
			() => {
				socketEmit2(
					context.socket,
					SocketCommand.SurfaceSpacePageDelete,
					literal<SurfaceSpacePageDeleteMessage>({
						id: page._id,
						spaceId: page.spaceId,
					}),
				);
			},
		);
	}, [confirmModalRef, context.socket, page._id]);

	return (
		<tr>
			<td>{page.name || 'Unnamed page'}</td>
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
