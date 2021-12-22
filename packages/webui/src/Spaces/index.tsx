import { CCol, CNav, CNavItem, CNavLink, CRow, CTabContent, CTabPane, CTabs } from '@coreui/react';
import { faCalendar, faGamepad, faList } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import shortid from 'shortid';
import { CompanionContext, MyErrorBoundary } from '../util';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { GenericConfirmModal, IGenericConfirmModalHandle } from '../Components/GenericConfirmModal';
import { SpacesList } from './List';
import { ISurfaceSpace, ISurfaceSpacePage, SurfaceType } from '@companion/core-shared/dist/collections';
import { SpacePages } from './Pages';
import { SpaceBasicGrid } from './BasicGrid';
import { SlotEditor } from './SlotEditor';

export function SpacesPage() {
	const context = useContext(CompanionContext);

	const clearModalRef = useRef<IGenericConfirmModalHandle>(null);

	const [tabResetToken, setTabResetToken] = useState(shortid());
	const [activeTab, setActiveTab] = useState('list');

	console.log(tabResetToken); // HACK

	const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null);

	useEffect(() => {
		// Ensure the current space is a valid id
		const knownSpaces = Object.keys(context.spaces);
		if (!currentSpaceId || !knownSpaces.includes(currentSpaceId)) {
			setCurrentSpaceId(knownSpaces[0] ?? null);
			setActiveTab('list');
		}
	}, [context.spaces, currentSpaceId]);

	const currentSpace = currentSpaceId ? context.spaces[currentSpaceId] : undefined;
	const spacePages: Record<string, ISurfaceSpacePage> = {};
	for (const page of currentSpace?.pages || []) {
		spacePages[page._id] = page;
	}

	const currentPage = Object.values(spacePages)[0];

	const [currentSlot, setCurrentSlot] = useState<string | null>(null);

	const doChangeTab = useCallback((newTab) => {
		setActiveTab((oldTab) => {
			if (oldTab !== newTab) {
				// setSelectedControlId(null);
				setTabResetToken(shortid());
			}
			return newTab;
		});
	}, []);

	const selectSpace = useCallback(
		(id) => {
			const knownSpaces = Object.keys(context.spaces);
			if (id === null || knownSpaces.includes(id)) {
				setCurrentSpaceId(id);
			}
		},
		[context.spaces],
	);
	const doSelectSlot = useCallback(
		(slotId: string | null) => {
			// TODO - validate slotId

			doChangeTab(slotId === null ? 'pages' : 'control');
			setCurrentSlot(slotId);
		},
		[doChangeTab],
	);
	const selectPage = useCallback(
		(id) => {
			// clear the current editor
			doSelectSlot(null);
			setCurrentSlot(null);
			setActiveTab((oldTab) => {
				if (oldTab === 'control') {
					return 'pages';
				} else {
					return oldTab;
				}
			});

			// const knownSpaces = Object.keys(allSpaces);
			// if (id === null || knownSpaces.includes(id)) {
			// 	setCurrentSpaceId(id);
			// }
		},
		[doSelectSlot],
	);

	return (
		<CRow className='controls-page split-panels'>
			<GenericConfirmModal ref={clearModalRef} />

			<CCol xs={12} xl={6} className='primary-panel'>
				<MyErrorBoundary>
					{currentSpace && currentPage ? (
						<>
							<h3>Space - {currentSpace.name}</h3>
							<SpacePageRender space={currentSpace} page={currentPage} doSelectSlot={doSelectSlot} />
						</>
					) : (
						''
					)}
				</MyErrorBoundary>
			</CCol>

			<CCol xs={12} xl={6} className='secondary-panel'>
				<div className='secondary-panel-inner'>
					<CTabs activeTab={activeTab} onActiveTabChange={doChangeTab}>
						<CNav variant='tabs'>
							<CNavItem>
								<CNavLink data-tab='list'>
									<FontAwesomeIcon icon={faList} /> All Spaces
								</CNavLink>
							</CNavItem>
							<CNavItem>
								<CNavLink data-tab='pages' disabled={!currentSpace}>
									<FontAwesomeIcon icon={faCalendar} /> Pages
								</CNavLink>
							</CNavItem>
							<CNavItem>
								<CNavLink data-tab='devices' disabled={!currentSpace}>
									<FontAwesomeIcon icon={faGamepad} /> Attached Devices
								</CNavLink>
							</CNavItem>
							<CNavItem>
								<CNavLink data-tab='control' disabled={!currentSlot}>
									<FontAwesomeIcon icon={faGamepad} /> Edit Control
								</CNavLink>
							</CNavItem>
						</CNav>
						<CTabContent fade={false}>
							<CTabPane data-tab='list'>
								<MyErrorBoundary>
									<SpacesList selectSpace={selectSpace} />
								</MyErrorBoundary>
							</CTabPane>
							<CTabPane data-tab='pages'>
								<MyErrorBoundary>
									{currentSpace ? (
										<SpacePages space={currentSpace} pages={spacePages} selectPage={selectPage} />
									) : (
										<p>No space selected</p>
									)}
								</MyErrorBoundary>
							</CTabPane>
							<CTabPane data-tab='devices'>
								<MyErrorBoundary>
									{/* <InstanceVariables resetToken={tabResetToken} /> */}
									<p>Devices</p>
								</MyErrorBoundary>
							</CTabPane>
							<CTabPane data-tab='control'>
								<MyErrorBoundary>
									{currentSpace && currentPage && currentSlot ? (
										<SlotEditor
											spaceId={currentSpace._id}
											pageId={currentPage._id}
											slotId={currentSlot}
											controlId={currentPage.controls[currentSlot]}
										/>
									) : (
										''
									)}
								</MyErrorBoundary>
							</CTabPane>
						</CTabContent>
					</CTabs>
				</div>
			</CCol>
		</CRow>
	);
}

interface SpacePageRenderProps {
	space: ISurfaceSpace;
	page: ISurfaceSpacePage;
	doSelectSlot: (slotId: string) => void;
}
function SpacePageRender({ space, page, doSelectSlot }: SpacePageRenderProps) {
	switch (space.cachedSpec.type) {
		case SurfaceType.ButtonGrid:
			return <SpaceBasicGrid spec={space.cachedSpec} page={page} doSelectSlot={doSelectSlot} />;
		case SurfaceType.Advanced:
			return <p>Advanced - TODO</p>;
		default:
			return <p>Unknown space type</p>;
	}
}
