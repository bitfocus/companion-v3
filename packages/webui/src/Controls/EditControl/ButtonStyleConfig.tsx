import { CButton, CRow, CCol, CButtonGroup, CLabel, CForm, CAlert } from '@coreui/react';
import React, { useCallback, useContext, useState } from 'react';
import { CompanionContext, socketEmit, socketEmit2 } from '../../util';
import {
	AlignmentInputField,
	CheckboxInputField,
	ColorInputField,
	DropdownInputField,
	PNGInputField,
	TextWithVariablesInputField,
} from '../../Components';
import { FONT_SIZES } from '../../Constants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { IButtonControlRenderLayer } from '@companion/core-shared/dist/collections';
import { ControlDefinitionRenderLayerUpdateMessage, SocketCommand } from '@companion/core-shared/dist/api';
import { literal } from '@companion/core-shared/dist/util';
import { rgba } from '@companion/core-shared/dist/color';

export interface ButtonStyleConfigProps {
	controlId: string;
	layerId: 'default';
	layer: IButtonControlRenderLayer;
}

export function ButtonStyleConfig({ controlId, layerId, layer }: ButtonStyleConfigProps) {
	const context = useContext(CompanionContext);

	const [pngError, setPngError] = useState<string | null>(null);
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
			console.log('set', controlId, layerId, key, value);
			if (!layer || value !== layer[key]) {
				socketEmit2(
					context.socket,
					SocketCommand.ControlDefinitionRenderLayerUpdate,
					literal<ControlDefinitionRenderLayerUpdateMessage<T>>({
						controlId,
						layerId,
						key,
						value,
					}),
				);
				// valueChanged();
			}
		},
		[context.socket, layer, controlId, layerId],
	);

	const setTextValue = useCallback((val) => setValueInner('text', val), [setValueInner]);
	// const setSizeValue = useCallback((val) => setValueInner('size', val), [setValueInner]);
	const setTextAlignmentValue = useCallback((val) => setValueInner('textAlignment', val), [setValueInner]);
	// const setPngAlignmentValue = useCallback((val) => setValueInner('pngalignment', val), [setValueInner]);
	const setTextColorValue = useCallback((val) => setValueInner('textColor', val), [setValueInner]);
	const setBackgroundColorValue = useCallback((val) => setValueInner('backgroundColor', val), [setValueInner]);
	// const setLatchValue = useCallback((val) => setValueInner('latch', val), [setValueInner]);
	// const setRelativeDelayValue = useCallback((val) => setValueInner('relative_delay', val), [setValueInner]);

	return (
		<CCol sm={12} className='p-0 mt-5'>
			<h4>Button style</h4>

			{pngError ? (
				<CAlert color='warning' closeButton>
					{pngError}
				</CAlert>
			) : (
				''
			)}

			<CForm inline>
				<CRow form className='button-style-form'>
					<CCol className='fieldtype-textinput' sm={6}>
						<label>Button text</label>
						<TextWithVariablesInputField
							definition={{ default: '', tooltip: 'Button text' }}
							setValue={setTextValue}
							value={layer.text}
						/>
					</CCol>

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

					<CCol className='fieldtype-alignment' sm={2} xs={3}>
						<label>Text Alignment</label>
						<AlignmentInputField
							definition={{ default: 'center:center' }}
							setValue={setTextAlignmentValue}
							value={layer.textAlignment}
						/>
					</CCol>
					{/* 
					<CCol className='fieldtype-alignment' sm={2} xs={3}>
						<label>PNG Alignment</label>
						<AlignmentInputField
							definition={{ default: 'center:center' }}
							setValue={setPngAlignmentValue}
							value={config.pngalignment}
						/>
					</CCol>*/}

					<CCol className='fieldtype-colorpicker' sm={2} xs={3}>
						<label>Text Color</label>
						<ColorInputField
							definition={{ default: rgba(255, 255, 255, 255) }}
							alpha={true}
							setValue={setTextColorValue}
							value={layer.textColor}
						/>
					</CCol>
					<CCol className='fieldtype-colorpicker' sm={2} xs={3}>
						<label>Background Color</label>
						<ColorInputField
							definition={{ default: rgba(0, 0, 0, 255) }}
							alpha={true}
							setValue={setBackgroundColorValue}
							value={layer.backgroundColor}
						/>
					</CCol>
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
				</CRow>
			</CForm>
		</CCol>
	);
}
