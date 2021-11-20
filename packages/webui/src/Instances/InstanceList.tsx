import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader } from '@coreui/react';
import { CompanionContext, socketEmit2 } from '../util';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDollarSign, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';

import { InstanceVariablesModal } from './InstanceVariablesModal';
import { InstanceStatus } from '@companion/module-framework';
import { IDeviceConnection } from '@companion/core-shared/dist/collections';
import { SocketCommand } from '@companion/core-shared/dist/api';

export function InstancesList({
	showHelp,
	doConfigureInstance,
}: {
	showHelp: (moduleId: string) => void;
	doConfigureInstance: (id: string) => void;
}) {
	const context = useContext(CompanionContext);
	const [instanceStatus, setInstanceStatus] = useState<Record<string, [InstanceStatus, string]>>({});

	const deleteModalRef = useRef<ConfirmDeleteModalHandle>(null);
	const variablesModalRef = useRef<any>();

	useEffect(() => {
		context.socket.on('instance_status', setInstanceStatus);
		context.socket.emit('instance_status_get');

		return () => {
			context.socket.off('instance_status', setInstanceStatus);
		};
	}, [context.socket]);

	const doShowVariables = useCallback((instanceId) => {
		variablesModalRef.current.show(instanceId);
	}, []);

	return (
		<div>
			<h4>Connections</h4>
			<p>
				When you want to control devices or software with Companion, you need to add a connection to let
				Companion know how to communicate with whatever you want to control.
			</p>

			<ConfirmDeleteModal ref={deleteModalRef} />
			<InstanceVariablesModal ref={variablesModalRef} />

			<table className='table table-responsive-sm'>
				<thead>
					<tr>
						<th>Module</th>
						<th>Label</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{Object.values(context.connections ?? {}).map((connecion) => {
						return (
							<InstancesTableRow
								key={connecion._id}
								id={connecion._id}
								connection={connecion}
								instanceStatus={instanceStatus[connecion._id]}
								showHelp={showHelp}
								showVariables={doShowVariables}
								deleteModalRef={deleteModalRef}
								configureInstance={doConfigureInstance}
							/>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

interface InstanceTableRowProps {
	id: string;
	connection: IDeviceConnection;
	instanceStatus: [InstanceStatus, string];
	showVariables: (connectionId: string) => void;
	showHelp: (moduleId: string) => void;
	configureInstance: (connectionId: string) => void;
	deleteModalRef: React.RefObject<ConfirmDeleteModalHandle>;
}
function InstancesTableRow({
	id,
	connection,
	instanceStatus,
	showHelp,
	showVariables,
	configureInstance,
	deleteModalRef,
}: InstanceTableRowProps) {
	const context = useContext(CompanionContext);

	const moduleInfo = context.modules[connection.moduleId];

	const status = processModuleStatus(instanceStatus);

	const doDelete = useCallback(() => {
		deleteModalRef.current?.show(id, connection.label);
	}, [deleteModalRef, id, connection.label]);

	const doToggleEnabled = useCallback(() => {
		socketEmit2(context.socket, SocketCommand.ConnectionEnabled, {
			connectionId: id,
			enabled: !connection.enabled,
		}).catch((e) => {
			context.notifier.current.show(`Failed to enable/disable connection`, e);
			console.error('Failed to  enable/disable connection:', e);
		});
	}, [context.socket, context.notifier, id, connection.enabled]);

	const doShowHelp = useCallback(() => showHelp(connection.moduleId), [showHelp, connection.moduleId]);

	const doShowVariables = useCallback(() => showVariables(connection.label), [showVariables, connection.label]);

	const instanceVariables = (context.variableDefinitions ?? {})[connection.label];

	return (
		<tr>
			<td>
				{moduleInfo ? (
					<>
						{moduleInfo?.helpPath ? (
							<div className='instance_help' onClick={doShowHelp} title='Help'>
								<FontAwesomeIcon icon={faQuestionCircle} />
							</div>
						) : (
							''
						)}
						<b>{moduleInfo?.manifest?.name ?? ''}</b>
						<br />
						{moduleInfo?.manifest?.manufacturer ?? ''}
					</>
				) : (
					connection.moduleId
				)}
			</td>
			<td>
				{instanceVariables && instanceVariables.length > 0 ? (
					<div className='instance_variables' onClick={doShowVariables} title='Variables'>
						<FontAwesomeIcon icon={faDollarSign} />
					</div>
				) : (
					''
				)}
				{connection.label}
			</td>
			<td className={status.className} title={status.title}>
				{status.text}
			</td>
			<td className='action-buttons'>
				<CButton onClick={doDelete} variant='ghost' color='danger' size='sm'>
					delete
				</CButton>
				{connection.enabled ? (
					<CButton onClick={doToggleEnabled} variant='ghost' color='warning' size='sm' disabled={!moduleInfo}>
						disable
					</CButton>
				) : (
					<CButton onClick={doToggleEnabled} variant='ghost' color='success' size='sm' disabled={!moduleInfo}>
						enable
					</CButton>
				)}
				<CButton
					onClick={() => configureInstance(id)}
					color='primary'
					size='sm'
					disabled={!moduleInfo || !connection.enabled}
				>
					edit
				</CButton>
			</td>
		</tr>
	);
}

function processModuleStatus(status: [InstanceStatus | -1, string]) {
	if (status) {
		switch (status[0]) {
			case -1:
				return {
					title: '',
					text: 'Disabled',
					className: 'instance-status-disabled',
				};
			case 0:
				return {
					title: status[1] ?? '',
					text: 'OK',
					className: 'instance-status-ok',
				};
			case 1:
				return {
					title: status[1] ?? '',
					text: status[1] ?? '',
					className: 'instance-status-warn',
				};
			case 2:
				return {
					title: status[1] ?? '',
					text: 'ERROR',
					className: 'instance-status-error',
				};
			case null:
				return {
					title: status[1] ?? '',
					text: status[1] ?? '',
					className: '',
				};
			default:
				break;
		}
	}

	return {
		title: '',
		text: '',
		className: '',
	};
}

interface ConfirmDeleteModalHandle {
	show(id: string, name: string): void;
}

const ConfirmDeleteModal = forwardRef<ConfirmDeleteModalHandle>(function ConfirmDeleteModal(_props, ref) {
	const context = useContext(CompanionContext);

	const [data, setData] = useState<[string, string] | null>(null);
	const [show, setShow] = useState(false);

	const doClose = useCallback(() => setShow(false), []);
	const onClosed = useCallback(() => setData(null), []);
	const doDelete = useCallback(() => {
		setData(null);
		setShow(false);

		if (data) {
			// Perform the delete
			socketEmit2(context.socket, SocketCommand.ConnectionDelete, { connectionId: data[0] }).catch((e) => {
				context.notifier.current.show(`Failed to delete connection`, e);
				console.error('Failed to delete connection:', e);
			});
		}
	}, [data, context.socket, context.notifier]);

	useImperativeHandle(
		ref,
		() => ({
			show(id, name) {
				setData([id, name]);
				setShow(true);
			},
		}),
		[],
	);

	return (
		<CModal show={show} onClose={doClose} onClosed={onClosed}>
			<CModalHeader closeButton>
				<h5>Delete instance</h5>
			</CModalHeader>
			<CModalBody>
				<p>Are you sure you want to delete "{data?.[1]}"?</p>
			</CModalBody>
			<CModalFooter>
				<CButton color='secondary' onClick={doClose}>
					Cancel
				</CButton>
				<CButton color='primary' onClick={doDelete}>
					Delete
				</CButton>
			</CModalFooter>
		</CModal>
	);
});
