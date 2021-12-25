import { CRow, CCol, CForm } from '@coreui/react';
import React, { useCallback, useContext } from 'react';
import { CompanionContext, socketEmit2 } from '../../util';
import { AlignmentInputField, ColorInputField, TextWithVariablesInputField } from '../../Components';
import { IButtonControlRenderLayer } from '@companion/core-shared/dist/collections';
import { ControlDefinitionRenderLayerUpdateMessage, SocketCommand } from '@companion/core-shared/dist/api';
import { literal } from '@companion/core-shared/dist/util';
import { rgba } from '@companion/core-shared/dist/color';
import { ConfigValue } from '@companion/module-framework';

export interface ButtonStyleConfigProps {
	controlId: string;
	layer: IButtonControlRenderLayer;
}

function ControlWrapper(colProps: CCol, contents: React.ReactElement) {
	return <CCol {...colProps}>{contents}</CCol>;
}

export function ButtonStyleConfig({ controlId, layer }: ButtonStyleConfigProps) {
	const context = useContext(CompanionContext);

	// const [pngError, setPngError] = useState<string | null>(null);
	// const clearPng = useCallback(() => context.socket.emit('bank_clear_png', page, bank), [context.socket, page, bank]);
	// const setPng = useCallback(
	// 	(data) => {
	// 		setPngError(null);
	// 		socketEmit(context.socket, 'bank_set_png', [page, bank, data])
	// 			.then(([res]) => {
	// 				if (res !== 'ok') {
	// 					setPngError('An error occured while uploading image');
	// 				} else {
	// 					setPngError(null);
	// 					// bank_preview_page(p);
	// 				}
	// 			})
	// 			.catch((e) => {
	// 				console.error('Failed to upload png', e);
	// 				setPngError('Failed to set png');
	// 			});
	// 	},
	// 	[context.socket, page, bank],
	// );

	const setValueInner = useCallback(
		<T extends keyof IButtonControlRenderLayer>(key: T, value: IButtonControlRenderLayer[T]) => {
			console.log('set', controlId, key, value);
			if (!layer || value !== layer[key]) {
				socketEmit2(
					context.socket,
					SocketCommand.ControlDefinitionRenderLayerUpdate,
					literal<ControlDefinitionRenderLayerUpdateMessage<T>>({
						controlId,
						key,
						value,
					}),
				);
				// valueChanged();
			}
		},
		[context.socket, layer, controlId],
	);

	return (
		<CCol sm={12} className='p-0 mt-5'>
			<h4>Button style</h4>

			{/* {pngError ? (
				<CAlert color='warning' closeButton>
					{pngError}
				</CAlert>
			) : (
				''
			)} */}

			<CForm inline>
				<CRow form className='button-style-form'>
					<ButtonStyleConfigFields
						values={layer}
						setValueInner={setValueInner}
						controlTemplate={ControlWrapper}
					/>
				</CRow>
			</CForm>
		</CCol>
	);
}

export interface ButtonStyleConfigFieldsProps {
	values: Partial<IButtonControlRenderLayer>;
	setValueInner: (key: keyof IButtonControlRenderLayer, val: ConfigValue) => void;
	controlTemplate: (colProps: CCol, children: React.ReactElement) => React.ReactElement;
}

export function ButtonStyleConfigFields({
	values,
	setValueInner,
	// setPng,
	// setPngError,
	// clearPng,
	controlTemplate,
}: ButtonStyleConfigFieldsProps) {
	const setTextValue = useCallback((val) => setValueInner('text', val), [setValueInner]);
	const setTextAlignmentValue = useCallback((val) => setValueInner('textAlignment', val), [setValueInner]);
	const setTextColorValue = useCallback((val) => setValueInner('textColor', val), [setValueInner]);
	const setBackgroundColorValue = useCallback((val) => setValueInner('backgroundColor', val), [setValueInner]);

	return (
		<>
			{values.text !== undefined
				? controlTemplate(
						{ sm: 6 },
						<>
							<label>Button text</label>
							<TextWithVariablesInputField
								definition={{ default: '', tooltip: 'Button text' }}
								setValue={setTextValue}
								value={values.text}
							/>
						</>,
				  )
				: ''}

			{/* <CCol className='fieldtype-dropdown' sm={3} xs={6}>
						<label>Font size</label>
						<DropdownInputField
							definition={{ default: 'auto', choices: FONT_SIZES }}
							setValue={setSizeValue}
							multiple={false}
							value={config.size}
						/>
					</CCol>

					<CCol sm={3} xs={6}>
						<label>72x58 PNG</label>
						<CButtonGroup className='png-browse'>
							<PNGInputField
								onSelect={setPng}
								onError={setPngError}
								definition={{ min: { width: 72, height: 58 }, max: { width: 72, height: 58 } }}
							/>
							<CButton color='danger' disabled={!config.png64} onClick={clearPng}>
								<FontAwesomeIcon icon={faTrash} />
							</CButton>
						</CButtonGroup>
					</CCol>*/}

			{values.textAlignment !== undefined
				? controlTemplate(
						{ sm: 2, xs: 3 },
						<>
							<label>Text Alignment</label>
							<AlignmentInputField
								definition={{ default: 'center:center' }}
								setValue={setTextAlignmentValue}
								value={values.textAlignment}
							/>
						</>,
				  )
				: ''}

			{/* 
					<CCol className='fieldtype-alignment' sm={2} xs={3}>
						<label>PNG Alignment</label>
						<AlignmentInputField
							definition={{ default: 'center:center' }}
							setValue={setPngAlignmentValue}
							value={config.pngalignment}
						/>
					</CCol>*/}

			{values.textColor !== undefined
				? controlTemplate(
						{ sm: 2, xs: 3 },
						<>
							<label>Text Color</label>
							<ColorInputField
								definition={{ default: rgba(255, 255, 255, 255) }}
								alpha={true}
								setValue={setTextColorValue}
								value={values.textColor}
							/>
						</>,
				  )
				: ''}
			{values.backgroundColor !== undefined
				? controlTemplate(
						{ sm: 2, xs: 3 },
						<>
							<label>Background Color</label>
							<ColorInputField
								definition={{ default: rgba(0, 0, 0, 255) }}
								alpha={true}
								setValue={setBackgroundColorValue}
								value={values.backgroundColor}
							/>
						</>,
				  )
				: ''}

			{/* 

					<CCol className='fieldtype-checkbox' sm={2} xs={3}>
						<label>Latch/Toggle</label>
						<p>
							<CheckboxInputField
								definition={{ default: false, id: 'latch' }}
								setValue={setLatchValue}
								value={config.latch}
							/>
						</p>
					</CCol>
					<CCol className='fieldtype-checkbox' sm={2} xs={3}>
						<CLabel>Relative Delays</CLabel>
						<p>
							<CheckboxInputField
								definition={{ default: false }}
								setValue={setRelativeDelayValue}
								value={config.relative_delay}
							/>
						</p>
					</CCol> */}
		</>
	);
}
