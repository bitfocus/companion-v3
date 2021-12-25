import { SocketCommand } from '@companion/core-shared/dist/api';
import {
	IButtonControlOverlayFeedbackLayer,
	IButtonControlOverlayExpressionLayer,
	IButtonControlRenderLayer,
} from '@companion/core-shared/dist/collections';
import { ConfigValue, InputValue } from '@companion/module-framework';
import { CCol, CForm, CFormGroup } from '@coreui/react';
import { useCallback, useContext, useRef } from 'react';
import { DropdownInputField } from '../../Components';
import { GenericConfirmModal, IGenericConfirmModalHandle } from '../../Components/GenericConfirmModal';
import { CompanionContext, MyErrorBoundary, socketEmit2 } from '../../util';
import { ButtonStyleConfigFields } from './ButtonStyleConfig';
import { OptionEditorControl } from './Table';

const StyleChoiceLabels: { [key in keyof IButtonControlRenderLayer]: string } = {
	// Note: Order denotes the order in the UI
	backgroundColor: 'Background Color',
	textColor: 'Text Color',
	text: 'Text',
	textSize: 'Text Size',
	textAlignment: 'Text Alignment',
};
const StyleChoices = Object.entries(StyleChoiceLabels).map(([id, label]) => ({ id, label }));

interface FeedbackManageStylesProps {
	style: Partial<IButtonControlRenderLayer>;
	setSelectedStyleProps: (selected: ConfigValue[] | ConfigValue) => void;
}
function FeedbackManageStyles({ style, setSelectedStyleProps }: FeedbackManageStylesProps) {
	const currentValue = Object.keys(style || {});

	const defaultVals: Array<keyof IButtonControlRenderLayer> = ['textColor', 'backgroundColor'];

	return (
		<div className='cell-styles-manage'>
			<CForm>
				<MyErrorBoundary>
					<CFormGroup>
						<label>Change affected style properties</label>
						<DropdownInputField
							definition={{ default: defaultVals, choices: StyleChoices, multiple: true }}
							setValue={setSelectedStyleProps}
							value={currentValue}
						/>
					</CFormGroup>
				</MyErrorBoundary>
			</CForm>
		</div>
	);
}

function ControlWrapper(_colProps: CCol, contents: React.ReactElement) {
	return (
		<MyErrorBoundary>
			<CFormGroup>{contents}</CFormGroup>
		</MyErrorBoundary>
	);
}

export interface ExpressionOverlayLayerPanelProps {
	controlId: string;
	index: number;
	layer: IButtonControlOverlayExpressionLayer;
}

export function ExpressionOverlayLayerPanel({ controlId, layer }: ExpressionOverlayLayerPanelProps) {
	const context = useContext(CompanionContext);

	const confirmModal = useRef<IGenericConfirmModalHandle>(null);

	const setSelectedStyleProps = useCallback(
		(selected: ConfigValue | ConfigValue[]) => {
			if (Array.isArray(selected)) {
				socketEmit2(context.socket, SocketCommand.ControlDefinitionRenderLayerExpressionSelectedStyleUpdate, {
					controlId: controlId,
					layerId: layer.id,

					selected: selected as Array<keyof IButtonControlRenderLayer>,
				}).catch((e) => {
					console.error(`Failed to update layer`, e);
				});
			}
		},
		[context.socket, controlId, layer.id],
	);

	const setValueInner = useCallback(
		(key: keyof IButtonControlRenderLayer, value: ConfigValue) => {
			socketEmit2(context.socket, SocketCommand.ControlDefinitionRenderLayerExpressionStylePropertyUpdate, {
				controlId: controlId,
				layerId: layer.id,

				option: key,
				value: value,
			}).catch((e) => {
				console.error(`Failed to update layer`, e);
			});
		},
		[context.socket, controlId, layer.id],
	);

	return (
		<>
			<GenericConfirmModal ref={confirmModal} />

			<CForm className='button-style-form'>
				<legend>Style</legend>
				<FeedbackManageStyles style={layer.style} setSelectedStyleProps={setSelectedStyleProps} />

				{/* {pngError ? (
					<CAlert color='warning' closeButton>
						{pngError}
					</CAlert>
				) : (
					''
				)} */}

				<ButtonStyleConfigFields
					values={layer.style}
					setValueInner={setValueInner}
					controlTemplate={ControlWrapper}
				/>
				{Object.keys(layer.style).length === 0
					? 'Expression has no effect. Try adding a property to override'
					: ''}

				<legend>Condition</legend>
				<p>TODO</p>
			</CForm>
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
