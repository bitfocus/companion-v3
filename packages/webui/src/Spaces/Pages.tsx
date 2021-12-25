import {
	SocketCommand,
	SurfaceSpaceCreateMessageReply,
	SurfaceSpacePageCreateMessage,
	SurfaceSpacePageDeleteMessage,
} from '@companion/core-shared/dist/api';
import { ISurfaceSpace, ISurfaceSpacePage } from '@companion/core-shared/dist/collections';
import { literal } from '@companion/core-shared/dist/util';
import { CButton } from '@coreui/react';
import classNames from 'classnames';
import { useCallback, useContext, useRef } from 'react';
import { GenericConfirmModal, IGenericConfirmModalHandle } from '../Components/GenericConfirmModal';
import { CompanionContext, socketEmit2 } from '../util';

export function SpacePages({
	space,
	pages,
	selectPage,
	currentPageId,
}: {
	space: ISurfaceSpace;
	pages: Record<string, ISurfaceSpacePage>;
	selectPage: (id: string) => void;
	currentPageId: string | null;
}) {
	const context = useContext(CompanionContext);

	const confirmModalRef = useRef<IGenericConfirmModalHandle>(null);

	const addPage = useCallback(() => {
		socketEmit2(
			context.socket,
			SocketCommand.SurfaceSpacePageCreate,
			literal<SurfaceSpacePageCreateMessage>({
				spaceId: space._id,
			}),
		).then((msg: SurfaceSpaceCreateMessageReply) => {
			selectPage(msg.id);
		});
	}, [context.socket, selectPage, space._id]);

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
								spaceId={space._id}
								page={page}
								allowDelete={pagesList.length > 1}
								confirmModalRef={confirmModalRef}
								selectPage={selectPage}
								isCurrent={currentPageId === page._id}
							/>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

interface PagesTableRowProps {
	spaceId: string;
	page: ISurfaceSpacePage;
	allowDelete: boolean;
	confirmModalRef: any;
	selectPage: (id: string) => void;
	isCurrent: boolean;
}
function PagesTableRow({ spaceId, page, confirmModalRef, selectPage, isCurrent }: PagesTableRowProps) {
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
						spaceId: spaceId,
					}),
				);
			},
		);
	}, [confirmModalRef, context.socket, spaceId, page._id]);

	return (
		<tr className={classNames({ 'is-current': isCurrent })}>
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
