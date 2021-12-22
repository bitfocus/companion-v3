import { SocketCommand } from '@companion/core-shared/dist/api';
import {
	IButtonControlOverlayFeedbackLayer,
	IButtonControlOverlayExpressionLayer,
} from '@companion/core-shared/dist/collections';
import { InputValue } from '@companion/module-framework';
import { CForm } from '@coreui/react';
import { useCallback, useContext, useRef } from 'react';
import { GenericConfirmModal, IGenericConfirmModalHandle } from '../../Components/GenericConfirmModal';
import { CompanionContext, MyErrorBoundary, socketEmit2 } from '../../util';
import { OptionEditorControl } from './Table';

export interface ExpressionOverlayLayerPanelProps {
	controlId: string;
	index: number;
	layer: IButtonControlOverlayExpressionLayer;
}

export function ExpressionOverlayLayerPanel({ controlId }: ExpressionOverlayLayerPanelProps) {
	// const context = useContext(CompanionContext);

	const confirmModal = useRef<IGenericConfirmModalHandle>(null);

	return (
		<>
			<GenericConfirmModal ref={confirmModal} />

			<p>TODO</p>
		</>
	);
}

export interface FeedbackOverlayLayerPanelProps {
	controlId: string;
	index: number;
	layer: IButtonControlOverlayFeedbackLayer;
}

export function FeedbackOverlayLayerPanel({
	controlId,
	layer: { feedback, id: layerId },
}: FeedbackOverlayLayerPanelProps) {
	const context = useContext(CompanionContext);

	const connection = context.connections[feedback.connectionId];
	// const module = instance ? context.modules[instance.instance_type] : undefined
	const instanceLabel = connection?.label ?? feedback.connectionId;

	const feedbackSpec = context.feedbacks.find(
		(fb) => fb.connectionId === feedback.connectionId && fb.feedbackId === feedback.feedbackId,
	);
	const options = feedbackSpec?.options ?? [];

	let name = '';
	if (feedbackSpec) {
		name = `${instanceLabel}: ${feedbackSpec.name}`;
	} else {
		name = `${instanceLabel}: ${feedback.feedbackId} (undefined)`;
	}

	const setValue = useCallback(
		(_feedbackId: string, optionId: string, value: InputValue) => {
			socketEmit2(context.socket, SocketCommand.ControlDefinitionRenderLayerFeedbackOptionUpdate, {
				controlId: controlId,
				layerId: layerId,

				option: optionId,
				value: value,
			}).catch((e) => {
				console.error(`Failed to update layer`, e);
			});
		},
		[context.socket, controlId, layerId],
	);

	return (
		<div className='feedback-grid'>
			<div className='cell-name'>{name}</div>

			<div className='cell-option'>
				<CForm>
					{options.map((opt, i) => (
						<MyErrorBoundary key={i}>
							<OptionEditorControl
								option={opt}
								itemId={feedback.id}
								value={(feedback.options || {})[opt.id]}
								setValue={setValue}
							/>
						</MyErrorBoundary>
					))}
					{options.length === 0 ? 'Nothing to configure' : ''}
				</CForm>
			</div>
		</div>
	);
}
