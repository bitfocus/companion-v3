import { CButton, CForm, CInputGroup, CInputGroupAppend, CInputGroupText } from '@coreui/react';
import { faSort, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useContext, useMemo, useRef } from 'react';
import { NumberInputField } from '../../Components';
import { CompanionContext, MyErrorBoundary, socketEmit2 } from '../../util';
import Select from 'react-select';
import { ActionTableRowOption } from './Table';
import { useDrag, useDrop } from 'react-dnd';
import { GenericConfirmModal, IGenericConfirmModalHandle } from '../../Components/GenericConfirmModal';
import { IControlAction } from '@companion/core-shared/dist/collections';
import { InputValue } from '@companion/module-framework';
import { literal } from '@companion/core-shared/dist/util';
import {
	ControlDefinitionActionAddMessage,
	ControlDefinitionActionRemoveMessage,
	ControlDefinitionActionReorderMessage,
	ControlDefinitionActionSetDelayMessage,
	ControlDefinitionActionSetOptionMessage,
	SocketCommand,
} from '@companion/core-shared/dist/api';

export interface ActionsPanelProps {
	controlId: string;
	dragId: string;
	addPlaceholder: string;
	actions: IControlAction[];
}

export function ActionsPanel({ controlId, dragId, addPlaceholder, actions }: ActionsPanelProps) {
	const context = useContext(CompanionContext);

	const confirmModal = useRef<IGenericConfirmModalHandle>(null);

	const setValue = useCallback(
		(actionId, key, val) => {
			socketEmit2(
				context.socket,
				SocketCommand.ControlDefinitionActionSetOption,
				literal<ControlDefinitionActionSetOptionMessage>({
					controlId,
					actionId,
					option: key,
					value: val,
				}),
			);
		},
		[context.socket, controlId],
	);

	const doDelay = useCallback(
		(actionId, delay) => {
			socketEmit2(
				context.socket,
				SocketCommand.ControlDefinitionActionSetDelay,
				literal<ControlDefinitionActionSetDelayMessage>({
					controlId,
					actionId,
					delay,
				}),
			);
		},
		[context.socket, controlId],
	);

	const deleteAction = useCallback(
		(actionId: string) => {
			socketEmit2(
				context.socket,
				SocketCommand.ControlDefinitionActionRemove,
				literal<ControlDefinitionActionRemoveMessage>({
					controlId,
					actionId: actionId,
				}),
			);
		},
		[context.socket, controlId],
	);
	const doDelete = useCallback(
		(actionId: string) => {
			confirmModal.current?.show('Delete action', 'Delete action?', 'Delete', () => {
				deleteAction(actionId);
			});
		},
		[deleteAction],
	);

	const addAction = useCallback(
		(connectionId: string, actionId: string) => {
			socketEmit2(
				context.socket,
				SocketCommand.ControlDefinitionActionAdd,
				literal<ControlDefinitionActionAddMessage>({
					controlId,
					connectionId: connectionId,
					actionId: actionId,
				}),
			);
		},
		[context.socket, controlId],
	);

	const moveCard = useCallback(
		(dragActionId: string, hoverActionId: string) => {
			socketEmit2(
				context.socket,
				SocketCommand.ControlDefinitionActionReorder,
				literal<ControlDefinitionActionReorderMessage>({
					controlId,
					actionId: dragActionId,

					beforeActionId: hoverActionId,
				}),
			);
		},
		[context.socket, controlId],
	);

	return (
		<>
			<GenericConfirmModal ref={confirmModal} />

			<table className='table action-table'>
				<tbody>
					{actions.map((a, i) => (
						<ActionTableRow
							key={a?.id ?? i}
							action={a}
							index={i}
							dragId={dragId}
							setValue={setValue}
							doDelete={doDelete}
							doDelay={doDelay}
							moveCard={moveCard}
						/>
					))}
				</tbody>
			</table>

			<AddActionDropdown onSelect={addAction} placeholder={addPlaceholder} />
		</>
	);
}

interface ActionTableRowProps {
	action: IControlAction;
	index: number;
	dragId: string;
	setValue: (actionId: string, key: string, val: InputValue) => void;
	doDelete: (actionId: string) => void;
	doDelay: (actionId: string, delay: number) => void;
	moveCard: (dragActionId: string, hoverActionId: string) => void;
}

interface DragItem {
	type: string;
	actionId: string;
	index: number;
}

function ActionTableRow({ action, index, dragId, setValue, doDelete, doDelay, moveCard }: ActionTableRowProps) {
	const context = useContext(CompanionContext);

	const innerDelete = useCallback(() => doDelete(action.id), [action.id, doDelete]);
	const innerDelay = useCallback((delay) => doDelay(action.id, delay), [doDelay, action.id]);

	const ref = useRef<HTMLTableRowElement>(null);
	const [, drop] = useDrop({
		accept: dragId,
		hover(item: DragItem, monitor) {
			if (!ref.current) {
				return;
			}
			const dragIndex = item.index;
			const hoverIndex = index;
			// Don't replace items with themselves
			if (dragIndex === hoverIndex) {
				return;
			}
			// Determine rectangle on screen
			const hoverBoundingRect = ref.current?.getBoundingClientRect();
			// Get vertical middle
			const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
			// Determine mouse position
			const clientOffset = monitor.getClientOffset();
			if (!clientOffset) {
				return;
			}

			// Get pixels to the top
			const hoverClientY = clientOffset.y - hoverBoundingRect.top;
			// Only perform the move when the mouse has crossed half of the items height
			// When dragging downwards, only move when the cursor is below 50%
			// When dragging upwards, only move when the cursor is above 50%
			// Dragging downwards
			if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
				return;
			}
			// Dragging upwards
			if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
				return;
			}
			// Time to actually perform the action
			moveCard(item.actionId, action.id);
			// Note: we're mutating the monitor item here!
			// Generally it's better to avoid mutations,
			// but it's good here for the sake of performance
			// to avoid expensive index searches.
			item.index = hoverIndex;
		},
	});
	const [{ isDragging }, drag, preview] = useDrag({
		item: literal<DragItem>({
			type: dragId,
			actionId: action.id,
			index: index,
		}),
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	});
	preview(drop(ref));

	const connection = context.connections[action.connectionId];
	const connectionLabel = connection?.label ?? action.connectionId;

	const actionSpec = useMemo(() => {
		return context.actions.find((a) => a.actionId === action.actionId && a.connectionId === action.connectionId);
	}, [context.actions, action.actionId, action.connectionId]);

	const options = actionSpec?.options ?? [];

	let name = '';
	if (actionSpec) {
		name = `${connectionLabel}: ${actionSpec.name}`;
	} else {
		name = `${connectionLabel}: Unknown action (${action.actionId})`;
	}

	return (
		<tr ref={ref} className={isDragging ? 'actionlist-dragging' : ''}>
			<td ref={drag} className='td-reorder'>
				<FontAwesomeIcon icon={faSort} />
			</td>
			<td>
				<div className='editor-grid'>
					<div className='cell-name'>{name}</div>

					<div className='cell-delay'>
						<CForm>
							<label>Delay</label>
							<CInputGroup>
								<NumberInputField
									definition={{ type: 'number', default: 0, min: 0, max: Number.POSITIVE_INFINITY }}
									value={action.delay}
									setValue={innerDelay}
								/>
								<CInputGroupAppend>
									<CInputGroupText>ms</CInputGroupText>
								</CInputGroupAppend>
							</CInputGroup>
						</CForm>
					</div>

					<div className='cell-actions'>
						<CButton color='danger' size='sm' onClick={innerDelete} title='Remove action'>
							<FontAwesomeIcon icon={faTrash} />
						</CButton>
					</div>

					<div className='cell-option'>
						<CForm>
							{options.map((opt, i) => (
								<MyErrorBoundary key={i}>
									<ActionTableRowOption
										option={opt}
										actionId={action.id}
										value={(action.options || {})[opt.id]}
										setValue={setValue}
									/>
								</MyErrorBoundary>
							))}
							{options.length === 0 ? 'Nothing to configure' : ''}
						</CForm>
					</div>
				</div>
			</td>
		</tr>
	);
}

type ActionId = [connectionId: string, actionId: string];
interface ActionOption {
	label: string;
	value: ActionId;
}
interface AddActionDropdownProps {
	onSelect: (connectionId: string, actionId: string) => void;
	placeholder: string;
}
function AddActionDropdown({ onSelect, placeholder }: AddActionDropdownProps) {
	const context = useContext(CompanionContext);

	const options = useMemo(() => {
		return context.actions.map((action) => {
			const connectionLabel = context.connections[action.connectionId]?.label ?? action.connectionId;
			const value: ActionId = [action.connectionId, action.actionId];
			return { value, label: `${connectionLabel}: ${action.name}` };
		});
	}, [context.actions, context.connections]);

	const innerChange = useCallback(
		(e: ActionOption | null) => {
			if (e?.value) {
				onSelect(e.value[0], e.value[1]);
			}
		},
		[onSelect],
	);

	return (
		<Select<ActionOption>
			isClearable={false}
			isSearchable={true}
			isMulti={false}
			options={options}
			placeholder={placeholder}
			value={null}
			onChange={innerChange}
		/>
	);
}
