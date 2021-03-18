import { CCol, CNav, CNavItem, CNavLink, CRow, CTabContent, CTabPane, CTabs } from '@coreui/react';
import {
	faCalculator,
	faCalendar,
	faDollarSign,
	faFileImport,
	faGamepad,
	faGift,
	faList,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import shortid from 'shortid';
// import { InstancePresets } from "./Presets";
import { CompanionContext, MyErrorBoundary } from '../util';
// import { ButtonsGridPanel } from "./ButtonGrid";
// import { ImportExport } from "./ImportExport";
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { GenericConfirmModal } from '../Components/GenericConfirmModal';
import { SpacesList } from './List';
import { useCollection } from '../lib/subscription';
import {
	CollectionId,
	IControlDefinition,
	ISurfaceSpace,
	ISurfaceSpacePage,
	SurfaceType,
} from '@companion/core-shared/dist/collections';
import { SpacePages } from './Pages';
import { SpaceBasicGrid, SpaceBasicGridProps } from './BasicGrid';
// import { InstanceVariables } from "./Variables";

export function SpacesPage() {
	const context = useContext(CompanionContext);

	const clearModalRef = useRef();

	const [tabResetToken, setTabResetToken] = useState(shortid());
	const [activeTab, setActiveTab] = useState('list');

	const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null);
	const allSpaces = useCollection<ISurfaceSpace>(context.socket, CollectionId.SurfaceSpaces, true);
	const spacePagesRaw = useCollection<ISurfaceSpacePage>(
		context.socket,
		CollectionId.SurfaceSpacePages,
		!!currentSpaceId,
	); // TODO - filter properly...
	const spacePages: Record<string, ISurfaceSpacePage> = {};
	for (const [k, v] of Object.entries(spacePagesRaw)) {
		if (v.spaceId === currentSpaceId) {
			spacePages[k] = v;
		}
	}

	useEffect(() => {
		// Ensure the current space is a valid id
		const knownSpaces = Object.keys(allSpaces);
		if (!currentSpaceId || !knownSpaces.includes(currentSpaceId)) {
			setCurrentSpaceId(knownSpaces[0] ?? null);
			setActiveTab('list');
		}
	}, [allSpaces, currentSpaceId]);

	const currentSpace = currentSpaceId ? allSpaces[currentSpaceId] : undefined;
	const currentPage = Object.values(spacePages)[0];

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
			const knownSpaces = Object.keys(allSpaces);
			if (id === null || knownSpaces.includes(id)) {
				setCurrentSpaceId(id);
			}
		},
		[allSpaces],
	);
	const selectPage = useCallback(
		(id) => {
			// const knownSpaces = Object.keys(allSpaces);
			// if (id === null || knownSpaces.includes(id)) {
			// 	setCurrentSpaceId(id);
			// }
		},
		[spacePages],
	);

	return (
		<CRow className='controls-page split-panels'>
			<GenericConfirmModal ref={clearModalRef} />

			<CCol xs={12} xl={6} className='primary-panel'>
				<MyErrorBoundary>
					{currentSpace && currentPage ? (
						<>
							<h3>Space - {currentSpace.name}</h3>
							<SpacePageRender space={currentSpace} page={currentPage} />
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
						</CNav>
						<CTabContent fade={false}>
							<CTabPane data-tab='list'>
								<MyErrorBoundary>
									<SpacesList spaces={allSpaces} selectSpace={selectSpace} />
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
}
function SpacePageRender({ space, page }: SpacePageRenderProps) {
	switch (space.cachedSpec.type) {
		case SurfaceType.ButtonGrid:
			return <SpaceBasicGrid spec={space.cachedSpec} page={page} />;
		case SurfaceType.Advanced:
			return <p>Advanced - TODO</p>;
		default:
			return <p>Unknown space type</p>;
	}
}
