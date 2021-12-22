import {
	ControlDefinitionNameUpdateMessage,
	ControlDefinitionRenderLayerAddExpressionMessage,
	ControlDefinitionRenderLayerAddFeedbackMessage,
	SocketCommand,
} from '@companion/core-shared/dist/api';
import {
	CollectionId,
	ControlType,
	IButtonControlOverlayLayer,
	IControlDefinition,
} from '@companion/core-shared/dist/collections';
import { literal } from '@companion/core-shared/dist/util';
import {
	CButton,
	CRow,
	CCol,
	CTabs,
	CNav,
	CNavItem,
	CNavLink,
	CTabContent,
	CTabPane,
	CButtonGroup,
} from '@coreui/react';
import { RefObject, useCallback, useContext, useMemo, useRef } from 'react';
import { FeedbackOverlayLayerPanel, ExpressionOverlayLayerPanel } from './FeedbacksPanel';
import { TextInputField } from '../../Components';
//   import { BankPreview, dataToButtonImage } from "../../Components/BankButton";
import { GenericConfirmModal, IGenericConfirmModalHandle } from '../../Components/GenericConfirmModal';
import { useCollectionOne } from '../../lib/subscription';
import { CompanionContext, KeyReceiver, LoadingRetryOrError, socketEmit2 } from '../../util';
import { ActionsPanel } from './ActionsPanel';
import { ButtonStyleConfig } from './ButtonStyleConfig';
import Select from 'react-select';
import { assertNever } from '@companion/module-framework';
import { faEye, faEyeSlash, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
//   import { ActionsPanel } from "./ActionsPanel";
//   import { ButtonStyleConfig } from "./ButtonStyleConfig";
//   import { FeedbacksPanel } from "./FeedbackPanel";

export interface EditControlProps {
	controlId: string;
}
export function EditControl({ controlId }: EditControlProps) {
	const context = useContext(CompanionContext);

	const confirmModal = useRef<IGenericConfirmModalHandle>(null);

	// const [config, setConfig] = useState(null);
	// const [configError, setConfigError] = useState(null);
	// const [tableLoadStatus, setTableLoadStatus] = useState({});

	// const [reloadConfigToken, setReloadConfigToken] = useState(shortid());
	// const [reloadTablesToken, setReloadTablesToken] = useState(shortid());

	const [control, loadFailed] = useCollectionOne<IControlDefinition>(
		context.socket,
		CollectionId.ControlDefinitions,
		controlId,
		5000,
	);

	// const loadConfig = useCallback(() => {
	// 	socketEmit(context.socket, 'get_bank', [page, bank])
	// 		.then(([page, bank, config, fields]) => {
	// 			setConfig(config);
	// 			setConfigError(null);
	// 		})
	// 		.catch((e) => {
	// 			console.error('Failed to load bank config', e);
	// 			setConfig(null);
	// 			setConfigError('Failed to load bank config');
	// 		});
	// }, [context.socket, page, bank]);

	// // Keep config loaded
	// useEffect(() => {
	// 	setConfig(null);
	// 	setConfigError(null);

	// 	loadConfig();

	// 	// reload tables too
	// 	setTableLoadStatus({});
	// 	setReloadTablesToken(shortid());
	// }, [loadConfig, reloadConfigToken]);

	// const addLoadStatus = useCallback((key, value) => {
	// 	setTableLoadStatus((oldStatus) => ({ ...oldStatus, [key]: value }));
	// }, []);

	// const setButtonType = useCallback(
	// 	(newStyle) => {
	// 		let show_warning = false;

	// 		const currentStyle = config?.style;
	// 		if (currentStyle === newStyle) {
	// 			// No point changing style to itself
	// 			return;
	// 		}

	// 		if (
	// 			currentStyle &&
	// 			currentStyle !== 'pageup' &&
	// 			currentStyle !== 'pagedown' &&
	// 			currentStyle !== 'pagenum'
	// 		) {
	// 			if (newStyle === 'pageup' || newStyle === 'pagedown' || newStyle === 'pagenum') {
	// 				show_warning = true;
	// 			}
	// 		}

	// 		const doChange = () => {
	// 			socketEmit(context.socket, 'bank_style', [page, bank, newStyle])
	// 				.then(([p, b, config]) => {
	// 					setConfig(config);
	// 					setTableLoadStatus({});
	// 					setReloadTablesToken(shortid());
	// 				})
	// 				.catch((e) => {
	// 					console.error('Failed to set bank style', e);
	// 				});
	// 		};

	// 		if (show_warning) {
	// 			resetModalRef.current.show(
	// 				`Change style`,
	// 				`Changing to this button style will erase actions and feedbacks configured for this button - continue?`,
	// 				'OK',
	// 				() => {
	// 					doChange();
	// 				},
	// 			);
	// 		} else {
	// 			doChange();
	// 		}
	// 	},
	// 	[context.socket, page, bank, config?.style],
	// );

	// const doRetryLoad = useCallback(() => setReloadConfigToken(shortid()), []);
	// const resetBank = useCallback(() => {
	// 	resetModalRef.current.show(
	// 		`Clear button ${page}.${bank}`,
	// 		`This will clear the style, feedbacks and all actions`,
	// 		'Clear',
	// 		() => {
	// 			context.socket.emit('bank_reset', page, bank);
	// 			setReloadConfigToken(shortid());
	// 		},
	// 	);
	// }, [context.socket, page, bank]);

	// const errors = Object.values(tableLoadStatus).filter((s) => typeof s === 'string');
	// if (configError) errors.push(configError);
	// const loadError = errors.length > 0 ? errors.join(', ') : null;
	// const dataReady = !loadError && !!config && Object.values(tableLoadStatus).filter((s) => s !== true).length === 0;

	const setName = useCallback(
		(value: string) => {
			if (control && control.description !== value) {
				socketEmit2(
					context.socket,
					SocketCommand.ControlDefinitionNameUpdate,
					literal<ControlDefinitionNameUpdateMessage>({
						controlId,
						name: value,
					}),
				);
			}
		},
		[context.socket, control, controlId],
	);

	const addFeedbackLayer = useCallback(
		(val: AdvancedFeedbackSelectId) => {
			socketEmit2(
				context.socket,
				SocketCommand.ControlDefinitionRenderLayerAddFeedback,
				literal<ControlDefinitionRenderLayerAddFeedbackMessage>({
					controlId,
					connectionId: val.connectionId,
					feedbackId: val.feedbackId,
				}),
			);
		},
		[context.socket, controlId],
	);
	const addExpressionLayer = useCallback(() => {
		socketEmit2(
			context.socket,
			SocketCommand.ControlDefinitionRenderLayerAddExpression,
			literal<ControlDefinitionRenderLayerAddExpressionMessage>({
				controlId,
			}),
		);
	}, [context.socket, controlId]);

	const dataReady = !loadFailed && !!control;

	return (
		<KeyReceiver onKeyUp={() => null} tabIndex={0} className='edit-button-panel'>
			<GenericConfirmModal ref={confirmModal} />

			<LoadingRetryOrError dataReady={dataReady} error={loadFailed ? 'Control not found' : null} />
			{control ? (
				<div style={{ display: dataReady ? '' : 'none' }}>
					<div>
						<CRow form>
							<CCol className='fieldtype-textinput' sm={6}>
								<label>Control name</label>
								<TextInputField
									definition={{ default: '', tooltip: 'Control description' }}
									setValue={setName}
									setValid={undefined}
									value={control.description}
								/>
							</CCol>
						</CRow>
						{/* <ButtonEditPreview page={page} bank={bank} /> */}
						{/* <CDropdown className='mt-2' style={{ display: 'inline-block' }}>
							<CButtonGroup> */}
						{/* This could be simplified to use the split property on CDropdownToggle, but then onClick doesnt work https://github.com/coreui/coreui-react/issues/179 */}
						{/* <CButton color='success' onClick={() => setButtonType('png')}>
									Regular button
								</CButton>
								<CDropdownToggle
									caret
									color='success'
									style={{ opacity: 0.8, paddingLeft: 6 }}
									className='dropdown-toggle dropdown-toggle-split'
								>
									<span class='sr-only'>Toggle Dropdown</span>
								</CDropdownToggle>
							</CButtonGroup>
							<CDropdownMenu>
								<CDropdownItem>Regular button</CDropdownItem>
								<CDropdownItem onClick={() => setButtonType('pageup')}>Page up</CDropdownItem>
								<CDropdownItem onClick={() => setButtonType('pagenum')}>Page number</CDropdownItem>
								<CDropdownItem onClick={() => setButtonType('pagedown')}>Page down</CDropdownItem>
							</CDropdownMenu>
						</CDropdown>
						&nbsp;
						<CButton color='danger' hidden={!config.style} onClick={resetBank}>
							Erase
						</CButton>*/}
						&nbsp;
						<CButton
							color='warning'
							hidden={control.controlType !== ControlType.Button}
							onMouseDown={() =>
								socketEmit2(context.socket, SocketCommand.ControlSimulatePress, {
									controlId: control._id,
									pressed: true,
								}).catch((e) => {
									console.error(`Press failed: ${e}`);
								})
							}
							onMouseUp={() =>
								socketEmit2(context.socket, SocketCommand.ControlSimulatePress, {
									controlId: control._id,
									pressed: false,
								}).catch((e) => {
									console.error(`Press failed: ${e}`);
								})
							}
						>
							Test actions
						</CButton>
					</div>

					<hr />

					<ButtonStyleConfig controlId={controlId} layerId={'default'} layer={control.defaultLayer} />

					{/* TODO - use CAccordion once newer CoreUI */}
					<CTabs activeTab='actions'>
						<CNav variant='tabs'>
							<CNavItem>
								<CNavLink data-tab='actions'>Actions</CNavLink>
							</CNavItem>
							<CNavItem>
								<CNavLink data-tab='feedback'>Feedback</CNavLink>
							</CNavItem>
						</CNav>
						<CTabContent fade={false}>
							<CTabPane data-tab='actions'>
								<h4 className='mt-3'>Down actions</h4>
								<ActionsPanel
									controlId={controlId}
									actions={control.downActions ?? []}
									dragId={'downAction'}
									addPlaceholder='+ Add key down action'
								/>
							</CTabPane>
							<CTabPane data-tab='feedback'>
								<h4 className='mt-3'>Draw layers</h4>

								<table className='table render-layer-table'>
									<tbody>
										{(control.overlayLayers || []).map((layer, i) => (
											<tr key={layer.id}>
												<td>
													<OverlayLayerPanelHeader
														layer={layer}
														confirmModal={confirmModal}
														controlId={controlId}
													/>
													{OverlayLayerPanel(controlId, i, layer)}
												</td>
											</tr>
										))}
									</tbody>
								</table>

								<AddAdvancedFeedbackDropdown onSelect={addFeedbackLayer} />
								<CButton color='primary' onClick={addExpressionLayer}>
									Add expression layer
								</CButton>
							</CTabPane>
						</CTabContent>
					</CTabs>

					<hr />

					<p>
						<b>Hint:</b> Control buttons with OSC or HTTP: /press/bank/{'page'}/{'bank'} to press this
						button remotely. OSC port 12321!
					</p>
				</div>
			) : (
				''
			)}
		</KeyReceiver>
	);
}

interface OverlayLayerPanelHeaderProps {
	controlId: string;
	layer: IButtonControlOverlayLayer;
	confirmModal: RefObject<IGenericConfirmModalHandle>;
}

function OverlayLayerPanelHeader({ controlId, layer, confirmModal }: OverlayLayerPanelHeaderProps) {
	const context = useContext(CompanionContext);
	const doDelete = useCallback(() => {
		confirmModal.current?.show(
			'Delete layer',
			`Are you sure you want to delete the layer "${layer.name}"?`,
			'Delete',
			() => {
				socketEmit2(context.socket, SocketCommand.ControlDefinitionRenderLayerRemove, {
					controlId: controlId,
					layerId: layer.id,
				}).catch((e) => {
					console.error(`Failed to remove layer`, e);
				});
			},
		);
	}, [context.socket, confirmModal, controlId, layer.name, layer.id]);
	const setName = useCallback(
		(value: string) => {
			socketEmit2(context.socket, SocketCommand.ControlDefinitionRenderLayerNameUpdate, {
				controlId: controlId,
				layerId: layer.id,
				name: value,
			}).catch((e) => {
				console.error(`Failed to update layer`, e);
			});
		},
		[context.socket, controlId, layer.id],
	);
	const setEnableDisable = useCallback(() => {
		socketEmit2(context.socket, SocketCommand.ControlDefinitionRenderLayerEnabledUpdate, {
			controlId: controlId,
			layerId: layer.id,
			enabled: !!layer.disabled,
		}).catch((e) => {
			console.error(`Failed to update layer`, e);
		});
	}, [context.socket, controlId, layer.id, layer.disabled]);

	return (
		<div>
			<CRow form>
				<CCol className='fieldtype-textinput' xs={10}>
					<TextInputField
						definition={{ default: '', tooltip: 'Layer name' }}
						setValue={setName}
						setValid={undefined}
						value={layer.name}
					/>
				</CCol>
				<CCol xs={2}>
					<CButtonGroup>
						<CButton
							color='warning'
							onClick={setEnableDisable}
							title={layer.disabled ? 'Enable layer' : 'Disable layer'}
						>
							<FontAwesomeIcon icon={layer.disabled ? faEyeSlash : faEye} />
						</CButton>
						<CButton color='danger' onClick={doDelete} title='Remove layer'>
							<FontAwesomeIcon icon={faTrash} />
						</CButton>
					</CButtonGroup>
				</CCol>
			</CRow>
		</div>
	);
}

function OverlayLayerPanel(controlId: string, index: number, layer: IButtonControlOverlayLayer) {
	switch (layer.type) {
		case 'advanced':
			return <FeedbackOverlayLayerPanel key={layer.id} controlId={controlId} layer={layer} index={index} />;
		case 'expression':
			return <ExpressionOverlayLayerPanel key={layer.id} controlId={controlId} layer={layer} index={index} />;
		default:
			assertNever(layer);
			return <div>Not supported..</div>;
	}
}

//   function ButtonEditPreview({ page, bank }) {
//     const context = useContext(CompanionContext);
//     const [previewImage, setPreviewImage] = useState(null);

//     // On unmount
//     useEffect(() => {
//       return () => {
//         context.socket.emit("bank_preview", false);
//       };
//     }, [context.socket]);

//     // on bank change
//     useEffect(() => {
//       context.socket.emit("bank_preview", page, bank);

//       const cb = (p, b, img) => {
//         // eslint-disable-next-line eqeqeq
//         if (p == page && b == bank) {
//           setPreviewImage(dataToButtonImage(img));
//         }
//       };
//       context.socket.on("preview_bank_data", cb);

//       return () => {
//         context.socket.off("preview_bank_data", cb);
//       };
//     }, [context.socket, page, bank]);

//     return <BankPreview fixedSize preview={previewImage} right={true} />;
//   }

interface AdvancedFeedbackSelectId {
	connectionId: string;
	feedbackId: string;
}
interface AddAdvancedFeedbackDropdownProps {
	onSelect: (val: AdvancedFeedbackSelectId) => void;
}
interface AdvancedFeedbackOption {
	label: string;
	value: AdvancedFeedbackSelectId;
}

function AddAdvancedFeedbackDropdown({ onSelect }: AddAdvancedFeedbackDropdownProps) {
	const context = useContext(CompanionContext);

	const options = useMemo(() => {
		const feedbacks: AdvancedFeedbackOption[] = [];
		for (const feedback of context.feedbacks) {
			if (feedback.type === 'advanced') {
				const connectionLabel = context.connections[feedback.connectionId]?.label ?? feedback.connectionId;

				const value: AdvancedFeedbackSelectId = {
					connectionId: feedback.connectionId,
					feedbackId: feedback.feedbackId,
				};
				feedbacks.push({
					value: value,
					label: `${connectionLabel}: ${feedback.name}`,
				});
			}
		}
		return feedbacks;
	}, [context.feedbacks, context.connections]);

	const innerChange = useCallback(
		(e: AdvancedFeedbackOption | null) => {
			if (e && e.value) {
				onSelect(e.value);
			}
		},
		[onSelect],
	);

	return (
		<Select<AdvancedFeedbackOption>
			menuPlacement='auto'
			isClearable={false}
			isSearchable={true}
			isMulti={false}
			options={options}
			placeholder='+ Add feedback layer'
			value={null}
			onChange={innerChange}
		/>
	);
}
