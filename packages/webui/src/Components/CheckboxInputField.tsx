import { useEffect, useCallback } from 'react';
import { CInputCheckbox } from '@coreui/react';
import { CompanionInputFieldCheckbox } from '@companion/module-framework';

export interface CheckboxInputFieldProps {
	definition: CompanionInputFieldCheckbox;
	value: boolean;
	setValue: (value: boolean) => void;
	setValid?: (valid: boolean) => void;
}
export function CheckboxInputField({ definition, value, setValue, setValid }: CheckboxInputFieldProps) {
	// If the value is undefined, populate with the default. Also inform the parent about the validity
	useEffect(() => {
		if (value === undefined && definition.default !== undefined) {
			setValue(definition.default);
		}
		setValid?.(true);
	}, [definition.default, value, setValue, setValid]);

	const onChange = useCallback(
		(e) => {
			setValue(!!e.currentTarget.checked);
			setValid?.(true);
		},
		[setValue, setValid],
	);

	return (
		<CInputCheckbox
			type='checkbox'
			checked={!!value}
			value={true ? 1 : 0}
			title={definition.tooltip}
			onChange={onChange}
		/>
	);
}
