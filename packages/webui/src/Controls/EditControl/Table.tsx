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

export interface ActionTableRowOptionProps {
	actionId: string;
	option: SomeCompanionInputField;
	value: InputValue;
	setValue: (actionId: string, optionId: string, value: InputValue) => void;
}
export function ActionTableRowOption({ actionId, option, value, setValue }: ActionTableRowOptionProps) {
	const setValue2 = useCallback((val) => setValue(actionId, option.id, val), [actionId, option.id, setValue]);

	if (!option) {
		return <p>Unknown - TODO</p>;
	}

	const value2 = value as any; // TODO - type safety?

	let control: ReactElement | string = '';
	switch (option.type) {
		case 'textinput': {
			control = <TextInputField value={value2} definition={option} setValue={setValue2} />;
			break;
		}
		case 'dropdown': {
			control = <DropdownInputField value={value2} definition={option} setValue={setValue2} />;
			break;
		}
		// case 'multiselect': {
		// 	control = <DropdownInputField value={value} definition={option} multiple={true} setValue={setValue2} />;
		// 	break;
		// }
		case 'checkbox': {
			control = <CheckboxInputField value={value2} definition={option} setValue={setValue2} />;
			break;
		}
		case 'colorpicker': {
			control = <ColorInputField value={value2} definition={option} setValue={setValue2} />;
			break;
		}
		case 'number': {
			control = <NumberInputField value={value2} definition={option} setValue={setValue2} />;
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
