import React, { useEffect } from 'react';
import classnames from 'classnames';
import { IButtonControlRenderLayer } from '@companion/core-shared/dist/collections/ControlDefinition';

const ALIGMENT_OPTIONS: Array<IButtonControlRenderLayer['textAlignment']> = [
	['l', 't'],
	['c', 't'],
	['r', 't'],
	['l', 'c'],
	['c', 'c'],
	['r', 'c'],
	['l', 'b'],
	['c', 'b'],
	['r', 'b'],
];

export interface AlignmentInputFieldProps {
	definition: any; //TODO
	value: IButtonControlRenderLayer['textAlignment'];
	setValue: (value: IButtonControlRenderLayer['textAlignment']) => void;
}
export function AlignmentInputField({ definition, value, setValue }: AlignmentInputFieldProps) {
	// If the value is undefined, populate with the default. Also inform the parent about the validity
	useEffect(() => {
		if (value === undefined && definition.default !== undefined) {
			setValue(definition.default);
		}
	}, [definition.default, value, setValue]);

	const valueStr = JSON.stringify(value ?? definition.default);
	return (
		<div className='alignmentinput'>
			{ALIGMENT_OPTIONS.map((align) => {
				const alignStr = JSON.stringify(align);
				return (
					<div
						key={alignStr}
						className={classnames({ selected: alignStr === valueStr })}
						onClick={() => setValue(align)}
					>
						&nbsp;
					</div>
				);
			})}
		</div>
	);
}
