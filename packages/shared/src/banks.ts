import { ButtonType } from './collections';
import { SomeCompanionInputField } from './fields';

export const BANK_TYPES: { [key in ButtonType]: SomeCompanionInputField[] } = {
	[ButtonType.Inactive]: [],
	[ButtonType.Text]: [
		{
			type: 'textinput',
			id: 'text',
			label: 'Button text',
			width: 9,
			default: 'Label',
		},
	],
};
