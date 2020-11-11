import { RxJsonSchema, RxCollection } from 'rxdb';
import { InputValue } from '../fields';

export enum ButtonType {
	Inactive = 'inactive',
	Text = 'text',
}

export interface IBank {
	_id: string;
	x: number;
	y: number;
	latch?: boolean;
	relativeDelays?: boolean;
	buttonType: ButtonType;
	renderProperties: { [key: string]: InputValue };
	// TODO - actions
	// TODO - feedbacks
}

export const BankSchema: RxJsonSchema<IBank> = {
	title: 'banks',
	description: 'banks',
	version: 0,
	// keyCompression: true,
	type: 'object',
	properties: {
		_id: {
			type: 'string',
			primary: true,
		},
		x: {
			type: 'number',
			minimum: 0,
		},
		y: {
			type: 'number',
			minimum: 0,
		},
		latch: {
			type: 'boolean',
		},
		relativeDelays: {
			type: 'boolean',
		},
		buttonType: {
			type: 'string',
		},
		renderProperties: {
			type: 'object',
		},
	},
	required: ['_id', 'x', 'y', 'renderProperties', 'buttonType'],
};

export const BankMethods = {};
export const BankCollectionMethods = {};

export type BankCollection = RxCollection<IBank, typeof BankMethods, typeof BankCollectionMethods>;
