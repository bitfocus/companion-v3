import { CCol, CNav, CNavItem, CNavLink, CRow, CTabContent, CTabPane, CTabs } from '@coreui/react';
import { faCalculator, faDollarSign, faFileImport, faGift, faList } from '@fortawesome/free-solid-svg-icons';
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
import { CollectionId, IControlDefinition, ISurfaceSpace } from '@companion/core-shared/dist/collections';
// import { InstanceVariables } from "./Variables";

export function SpacesPage() {
	const context = useContext(CompanionContext);

	const clearModalRef = useRef();

	const [tabResetToken, setTabResetToken] = useState(shortid());
	const [activeTab, setActiveTab] = useState('list');
	const [selectedControlId, setSelectedControlId] = useState<string | null>(null);

	const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null);
	const allSpaces = useCollection<ISurfaceSpace>(context.socket, CollectionId.SurfaceSpaces, true);

	useEffect(() => {
		// Ensure the current space is a valid id
		const knownSpaces = Object.keys(allSpaces);
		if (!currentSpaceId || !knownSpaces.includes(currentSpaceId)) {
			setCurrentSpaceId(knownSpaces[0] ?? null);
		}
	}, [allSpaces, currentSpaceId]);

	const currentSpace = currentSpaceId ? allSpaces[currentSpaceId] : undefined;

	const doChangeTab = useCallback((newTab) => {
		setActiveTab((oldTab) => {
			if (oldTab !== newTab) {
				setSelectedControlId(null);
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

	return (
		<CRow className='controls-page split-panels'>
			<GenericConfirmModal ref={clearModalRef} />

			<CCol xs={12} xl={6} className='primary-panel'>
				<MyErrorBoundary>
					<h3>Space - {currentSpace?.name}</h3>
					{/* <ControlsList controls={controls} editControl={editControl} /> */}
					<p>Main</p>
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
							<CNavItem hidden={!selectedControlId}>
								<CNavLink data-tab='edit'>
									<FontAwesomeIcon icon={faCalculator} /> Edit Control{' '}
									{/* {selectedButton ? `${selectedButton[0]}.${selectedButton[1]}` : '?'} */}
								</CNavLink>
							</CNavItem>
							{/* 
							<CNavItem>
								<CNavLink data-tab='variables'>
									<FontAwesomeIcon icon={faDollarSign} /> Variables
								</CNavLink>
							</CNavItem> */}
						</CNav>
						<CTabContent fade={false}>
							<CTabPane data-tab='list'>
								<MyErrorBoundary>
									<SpacesList spaces={allSpaces} selectSpace={selectSpace} />
								</MyErrorBoundary>
							</CTabPane>
							<CTabPane data-tab='edit'>
								<MyErrorBoundary>
									{/* {selectedControlId ? (
										<EditControl
											controlId={selectedControlId}
											// 	key={`${selectedButton[0]}.${selectedButton[1]}.${tabResetToken}`}
											// 	page={selectedButton[0]}
											// 	bank={selectedButton[1]}
											// 	onKeyUp={handleKeyUpInButtons}
										/>
									) : (
										''
									)} */}
									<p>Edit</p>
								</MyErrorBoundary>
							</CTabPane>
							<CTabPane data-tab='variables'>
								<MyErrorBoundary>
									{/* <InstanceVariables resetToken={tabResetToken} /> */}
									<p>Veriables</p>
								</MyErrorBoundary>
							</CTabPane>
						</CTabContent>
					</CTabs>
				</div>
			</CCol>
		</CRow>
	);
}
