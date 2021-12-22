import { InputValue, SomeCompanionInputField } from '@companion/module-framework';
import { CFormGroup, CInputGroupText, CLabel } from '@coreui/react';
import React, { ReactElement, useCallback } from 'react';
import {
	CheckboxInputField,
	ColorInputField,
	DropdownInputField,
	NumberInputField,
	TextInputField,
} from '../../Components';

export interface OptionEditorControlProps {
	itemId: string;
	option: SomeCompanionInputField;
	value: InputValue | undefined;
	setValue: (actionId: string, optionId: string, value: InputValue) => void;
}
export function OptionEditorControl({ itemId, option, value, setValue }: OptionEditorControlProps) {
	const setValueForOption = useCallback((val) => setValue(itemId, option.id, val), [itemId, option.id, setValue]);

	if (!option) {
		return <p>Unknown - TODO</p>;
	}

	const value2 = value as any; // TODO - type safety?

	let control: ReactElement | string = '';
	switch (option.type) {
		case 'textinput': {
			control = <TextInputField value={value2} definition={option} setValue={setValueForOption} />;
			break;
		}
		case 'dropdown': {
			control = <DropdownInputField value={value2} definition={option} setValue={setValueForOption} />;
			break;
		}
		// case 'multiselect': {
		// 	control = <DropdownInputField value={value} definition={option} multiple={true} setValue={setValue2} />;
		// 	break;
		// }
		case 'checkbox': {
			control = <CheckboxInputField value={value2} definition={option} setValue={setValueForOption} />;
			break;
		}
		case 'colorpicker': {
			control = <ColorInputField value={value2} definition={option} setValue={setValueForOption} />;
			break;
		}
		case 'number': {
			control = <NumberInputField value={value2} definition={option} setValue={setValueForOption} />;
			break;
		}
		default:
			control = <CInputGroupText>Unknown type "{option.type}"</CInputGroupText>;
			break;
	}

	return (
		<CFormGroup>
			<CLabel>{option.label}</CLabel>
			{control}
		</CFormGroup>
	);
}
