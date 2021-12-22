import React, {
	forwardRef,
	memo,
	useCallback,
	useContext,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from 'react';
import {
	CAlert,
	CButton,
	CForm,
	CFormGroup,
	CLabel,
	CModal,
	CModalBody,
	CModalFooter,
	CModalHeader,
	CSelect,
} from '@coreui/react';
import { CompanionContext, socketEmit2 } from './util';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSync, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useCollection } from './lib/subscription';
import { CollectionId, ISurfaceDevice } from '@companion/core-shared/dist/collections';
import { SocketCommand, SurfaceDeviceAttachMessage } from '@companion/core-shared/dist/api';
import { literal } from '@companion/core-shared/dist/util';

export const SurfacesPage = memo(function SurfacesPage() {
	const context = useContext(CompanionContext);

	const editModalRef = useRef<any>();
	const attachModalRef = useRef<any>();

	const [scanning, setScanning] = useState(false);
	const [scanError, setScanError] = useState<string | null>(null);

	const devices = useCollection<ISurfaceDevice>(context.socket, CollectionId.SurfaceDevices, true);

	useEffect(() => {
		// If device disappears, hide the edit modal
		if (editModalRef.current) {
			editModalRef.current.ensureIdIsValid(Object.keys(devices));
		}
	}, [devices]);

	const refreshUSB = useCallback(() => {
		setScanning(true);
		setScanError(null);

		socketEmit2(context.socket, SocketCommand.SurfaceDeviceScan, null)
			.then(() => {
				// setScanError(errorMsg || null);
				setScanError(null);
				setScanning(false);
			})
			.catch((err) => {
				console.error('Refresh USB failed', err);

				setScanning(false);
			});
	}, [context.socket]);

	// const configureDevice = useCallback((device) => {
	// 	editModalRef.current.show(device);
	// }, []);
	const attachDevice = useCallback((device: ISurfaceDevice) => {
		attachModalRef.current?.show(device);
	}, []);
	const detachDevice = useCallback((device: ISurfaceDevice) => {
		// TODO
	}, []);

	return (
		<div>
			<h4>Surfaces</h4>
			<p>
				These are the surfaces available to companion. If your streamdeck is missing from this list, you might
				need to close the Elgato Streamdeck application and click the Rescan button below. Devices must be added
				to a space before they can be used
			</p>
			<CAlert color='warning' role='alert' style={{ display: scanError ? '' : 'none' }}>
				{scanError}
			</CAlert>

			<SurfaceAttachModal ref={attachModalRef} />
			{/* <SurfaceEditModal ref={editModalRef} /> */}

			<table className='table table-responsive-sm'>
				<thead>
					<tr>
						<th>ID</th>
						<th>Type</th>
						<th>Space</th>
						<th>Status</th>
						<th>&nbsp;</th>
					</tr>
				</thead>
				<tbody>
					{Object.values(devices).map((dev) => {
						return (
							<tr key={dev._id}>
								<td>{dev.uid}</td>
								<td>{dev.name}</td>
								<td>{dev.adopted ? dev.surfaceSpaceId ?? 'Pending' : ''}</td>
								<td>{dev.status}</td>
								<td>
									<CButton color='success' onClick={() => attachDevice(dev)}>
										<FontAwesomeIcon icon={faPlus} /> Assign space
									</CButton>
									{dev.adopted ? (
										<CButton color='danger' onClick={() => detachDevice(dev)}>
											<FontAwesomeIcon icon={faTrash} /> Remove
										</CButton>
									) : (
										''
									)}
									{/* {dev?.config && dev.config.length > 0 ? (
										<CButton color='success' onClick={() => configureDevice(dev)}>
											<FontAwesomeIcon icon={faCog} /> Settings
										</CButton>
									) : (
										''
									)} */}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>

			<CButton color='warning' onClick={refreshUSB}>
				<FontAwesomeIcon icon={faSync} spin={scanning} />
				{scanning ? ' Checking for new devices...' : ' Rescan USB'}
			</CButton>
		</div>
	);
});

interface ISuraceAttachProps {}

export interface ISuraceAttachHandle {
	show(deviceId: ISurfaceDevice): void;
}

const SurfaceAttachModal = forwardRef<ISuraceAttachHandle, ISuraceAttachProps>(function SurfaceAttachModal(
	_props,
	ref,
) {
	const context = useContext(CompanionContext);

	const [deviceInfo, setDeviceInfo] = useState<ISurfaceDevice | null>(null);
	const [show, setShow] = useState(false);

	const doClose = useCallback(() => setShow(false), []);
	const onClosed = useCallback(() => {
		setDeviceInfo(null);
	}, []);

	useImperativeHandle(
		ref,
		() => ({
			show(device) {
				setDeviceInfo(device);
				setShow(true);
			},
		}),
		[],
	);

	const [spaceId, setSpaceId] = useState<string | undefined>(undefined);
	useEffect(() => {
		setSpaceId((oldSpaceId) => {
			if (oldSpaceId && context.spaces[oldSpaceId]) {
				return oldSpaceId;
			} else {
				return Object.keys(context.spaces)[0];
			}
		});
	}, [context.spaces]);

	const doAttach = useCallback(() => {
		if (deviceInfo && spaceId) {
			socketEmit2(
				context.socket,
				SocketCommand.SurfaceDeviceAttach,
				literal<SurfaceDeviceAttachMessage>({
					deviceId: deviceInfo._id,
					spaceId,
				}),
			)
				.then(() => {
					doClose();
				})
				.catch((err) => {
					console.error('Device attach failed', err);

					// TODO - present to user
				});
		}
	}, [context.socket, deviceInfo, spaceId, doClose]);

	return (
		<CModal show={show} onClose={doClose} onClosed={onClosed}>
			<CModalHeader closeButton>
				<h5>Attach {deviceInfo?.name} to Space</h5>
			</CModalHeader>
			<CModalBody>
				{deviceInfo ? (
					<CForm>
						<CFormGroup>
							<CLabel htmlFor='spaceId'>Button rotation</CLabel>
							<CSelect
								name='spaceId'
								value={spaceId ?? undefined}
								onChange={(e) => setSpaceId(e.currentTarget.value)}
							>
								{Object.entries(context.spaces).map(([id, space]) => (
									<option key={id} value={id}>
										{space.name}
									</option>
								))}
							</CSelect>
						</CFormGroup>
					</CForm>
				) : (
					''
				)}
			</CModalBody>
			<CModalFooter>
				<CButton color='secondary' onClick={doClose}>
					Cancel
				</CButton>
				<CButton color='primary' onClick={doAttach}>
					Attach
				</CButton>
			</CModalFooter>
		</CModal>
	);
});

// const SurfaceEditModal = forwardRef(function SurfaceEditModal(_props, ref) {
// 	const context = useContext(CompanionContext);

// 	const [deviceInfo, setDeviceInfo] = useState(null);
// 	const [show, setShow] = useState(false);

// 	const [deviceConfig, setDeviceConfig] = useState(null);
// 	const [deviceConfigError, setDeviceConfigError] = useState(null);
// 	const [reloadToken, setReloadToken] = useState(shortid());

// 	const doClose = useCallback(() => setShow(false), []);
// 	const onClosed = useCallback(() => {
// 		setDeviceInfo(null);
// 		setDeviceConfig(null);
// 		setDeviceConfigError(null);
// 	}, []);

// 	const doRetryConfigLoad = useCallback(() => setReloadToken(shortid()), []);

// 	useEffect(() => {
// 		setDeviceConfigError(null);
// 		setDeviceConfig(null);

// 		if (deviceInfo?.id) {
// 			socketEmit(context.socket, 'device_config_get', [deviceInfo.id])
// 				.then(([err, config]) => {
// 					setDeviceConfig(config);
// 				})
// 				.catch((err) => {
// 					console.error('Failed to load device config');
// 					setDeviceConfigError(`Failed to load device config`);
// 				});
// 		}
// 	}, [context.socket, deviceInfo?.id, reloadToken]);

// 	useImperativeHandle(
// 		ref,
// 		() => ({
// 			show(device) {
// 				setDeviceInfo(device);
// 				setShow(true);
// 			},
// 			ensureIdIsValid(deviceIds) {
// 				setDeviceInfo((oldDevice) => {
// 					if (oldDevice && deviceIds.indexOf(oldDevice.id) === -1) {
// 						setShow(false);
// 					}
// 					return oldDevice;
// 				});
// 			},
// 		}),
// 		[],
// 	);

// 	const updateConfig = useCallback(
// 		(key, value) => {
// 			console.log('update', key, value);
// 			if (deviceInfo?.id) {
// 				setDeviceConfig((oldConfig) => {
// 					const newConfig = {
// 						...oldConfig,
// 						[key]: value,
// 					};

// 					context.socket.emit('device_config_set', deviceInfo.id, newConfig);
// 					return newConfig;
// 				});
// 			}
// 		},
// 		[context.socket, deviceInfo?.id],
// 	);

// 	return (
// 		<CModal show={show} onClose={doClose} onClosed={onClosed}>
// 			<CModalHeader closeButton>
// 				<h5>Settings for {deviceInfo?.type}</h5>
// 			</CModalHeader>
// 			<CModalBody>
// 				<LoadingRetryOrError error={deviceConfigError} dataReady={deviceConfig} doRetry={doRetryConfigLoad} />
// 				{deviceConfig && deviceInfo ? (
// 					<CForm>
// 						{deviceInfo.config?.includes('brightness') ? (
// 							<CFormGroup>
// 								<CLabel htmlFor='brightness'>Brightness</CLabel>
// 								<CInput
// 									name='brightness'
// 									type='range'
// 									min={0}
// 									max={100}
// 									step={1}
// 									value={deviceConfig.brightness}
// 									onChange={(e) => updateConfig('brightness', parseInt(e.currentTarget.value))}
// 								/>
// 							</CFormGroup>
// 						) : (
// 							''
// 						)}

// 						{deviceInfo.config?.includes('orientation') ? (
// 							<CFormGroup>
// 								<CLabel htmlFor='orientation'>Button rotation</CLabel>
// 								<CSelect
// 									name='orientation'
// 									value={deviceConfig.rotation}
// 									onChange={(e) => updateConfig('rotation', parseInt(e.currentTarget.value))}
// 								>
// 									<option value='0'>Normal</option>
// 									<option value='-90'>90 CCW</option>
// 									<option value='90'>90 CW</option>
// 									<option value='180'>180</option>
// 								</CSelect>
// 							</CFormGroup>
// 						) : (
// 							''
// 						)}

// 						{deviceInfo.config?.includes('page') ? (
// 							<CFormGroup>
// 								<CLabel htmlFor='page'>Page</CLabel>
// 								<CInput
// 									name='page'
// 									type='range'
// 									min={1}
// 									max={99}
// 									step={1}
// 									value={deviceConfig.page}
// 									onChange={(e) => updateConfig('page', parseInt(e.currentTarget.value))}
// 								/>
// 								<span>{deviceConfig.page}</span>
// 							</CFormGroup>
// 						) : (
// 							''
// 						)}

// 						{deviceInfo.config?.includes('keysPerRow') ? (
// 							<CFormGroup>
// 								<CLabel htmlFor='keysPerRow'>Keys per row</CLabel>
// 								<CInput
// 									name='keysPerRow'
// 									type='range'
// 									min={1}
// 									max={99}
// 									step={1}
// 									value={deviceConfig.keysPerRow}
// 									onChange={(e) => updateConfig('keysPerRow', parseInt(e.currentTarget.value))}
// 								/>
// 								<span>{deviceConfig.keysPerRow}</span>
// 							</CFormGroup>
// 						) : (
// 							''
// 						)}

// 						{deviceInfo.config?.includes('keysPerColumn') ? (
// 							<CFormGroup>
// 								<CLabel htmlFor='keysPerColumn'>Keys per column</CLabel>
// 								<CInput
// 									name='keysPerColumn'
// 									type='range'
// 									min={1}
// 									max={99}
// 									step={1}
// 									value={deviceConfig.keysPerColumn}
// 									onChange={(e) => updateConfig('keysPerColumn', parseInt(e.currentTarget.value))}
// 								/>
// 								<span>{deviceConfig.keysPerColumn}</span>
// 							</CFormGroup>
// 						) : (
// 							''
// 						)}
// 					</CForm>
// 				) : (
// 					''
// 				)}
// 			</CModalBody>
// 			<CModalFooter>
// 				<CButton color='secondary' onClick={doClose}>
// 					Close
// 				</CButton>
// 			</CModalFooter>
// 		</CModal>
// 	);
// });
