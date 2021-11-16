import { CompanionInputFieldDropdown, ConfigValue } from '@companion/module-framework';
import { useMemo, useEffect, useCallback } from 'react';
import Select from 'react-select';

interface DropdownOption {
	label: string;
	value: ConfigValue;
}

export interface DropdownInputFieldProps {
	definition: CompanionInputFieldDropdown;
	value: ConfigValue | ConfigValue[];
	setValue: (value: ConfigValue | ConfigValue[]) => void;
	setValid?: (valid: boolean) => void;
}
export function DropdownInputField({ definition, value, setValue, setValid }: DropdownInputFieldProps) {
	const options = useMemo(() => {
		return (definition.choices || []).map((choice) => ({ value: choice.id, label: choice.label }));
	}, [definition.choices]);

	const isMultiple = !!definition.multiple;

	const currentValue = useMemo(() => {
		const selectedValue = Array.isArray(value) ? value : [value];
		let res = [];
		for (const val of selectedValue) {
			// eslint-disable-next-line eqeqeq
			const entry = options.find((o) => o.value == val); // Intentionally loose for compatability
			if (entry) {
				res.push(entry);
			} else {
				res.push({ value: val, label: `?? (${val})` });
			}
		}
		return res;
	}, [value, options]);

	// If the value is undefined, populate with the default. Also inform the parent about the validity
	useEffect(() => {
		if (value === undefined && definition.default !== undefined) {
			setValue(definition.default);
		}
		setValid?.(true);
	}, [definition.default, value, setValue, setValid]);

	const valueLength = Array.isArray(value) ? value.length : 0;
	const onChange = useCallback(
		(e: any) => {
			let isValid = true;

			if (isMultiple) {
				const newValue: ConfigValue[] = Array.isArray(e) ? e.map((v: DropdownOption) => v.value) : [];

				for (const val of newValue) {
					// Require the selected choices to be valid
					if (!definition.choices.find((c) => c.id === val)) {
						isValid = false;
					}
				}

				if (
					typeof definition.minSelection === 'number' &&
					newValue.length < definition.minSelection &&
					newValue.length <= valueLength
				) {
					// Block change if too few are selected
					return;
				}

				if (
					typeof definition.maximumSelectionLength === 'number' &&
					newValue.length > definition.maximumSelectionLength &&
					newValue.length >= valueLength
				) {
					// Block change if too many are selected
					return;
				}

				setValue(newValue);
				setValid?.(isValid);
			} else {
				const newValue: ConfigValue = !Array.isArray(e) ? e.value : undefined;

				// Require the selected choice to be valid
				if (!definition.choices.find((c) => c.id === newValue)) {
					isValid = false;
				}

				setValue(newValue);
				setValid?.(isValid);
			}
		},
		[
			setValue,
			setValid,
			isMultiple,
			valueLength,
			definition.minSelection,
			definition.maximumSelectionLength,
			definition.choices,
		],
	);

	return (
		<Select
			menuPlacement='auto'
			isClearable={false}
			isSearchable={
				typeof definition.minChoicesForSearch === 'number' && definition.minChoicesForSearch <= options.length
			}
			isMulti={isMultiple}
			tooltip={definition.tooltip}
			options={options}
			value={isMultiple ? currentValue : currentValue[0]}
			onChange={onChange}
		/>
	);
}
