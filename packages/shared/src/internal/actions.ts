/**
 * WARNING:
 *
 * Modules are allowed to create these actions as part of presets.
 * As such any non backwards-compatible changes to the typings will break some modules.
 * Try to make changes in a way that won't break or change any existing uses.
 * If you need to do a breaking change, then add a new version of the action instead, and expose it for modules to use
 */

import {
	CompanionInputFieldDropdown,
	CompanionInputFieldTextInput,
	InputValue,
	literal,
	SomeCompanionInputField,
} from '@companion/module-framework';
import { IDeviceConnectionAction, IDeviceConnectionProperty } from '../collections/index.js';

// import { IDeviceConnectionAction } from '@companion/core-shared/dist/collections';
// import { getHash } from '../services/module-host-versions/util';

// function wrapToConnectionAction(
// 	action: Omit<IDeviceConnectionAction, '_id' | 'connectionId'>,
// ): IDeviceConnectionAction {
// 	return {
// 		...action,
// 		connectionId: null as any, // TODO - should connectionId allow for null?
// 		_id: getHash(`internal:${action.actionId}`),
// 	};
// }

// export const InternalSetPropertyAction = wrapToConnectionAction({
// 	actionId: 'set-property-v0',
// 	options: [],
// 	// TODO
// });

export const InternalSetPropertyActionId = '__set_property_v0__';
export interface InternalSetPropertyActionOptions {
	connectionId: string;
	propertyId: string;
	instanceId: string | number | null;
	value: any;
}

export function GenerateInternalSetPropertyActionv0(
	property: IDeviceConnectionProperty,
	options: InternalSetPropertyActionOptions,
): Omit<IDeviceConnectionAction, '_id' | 'connectionId' | 'actionId'> | null {
	if (!property.valueInput) return null;

	const fields: SomeCompanionInputField[] = [];

	if (property.instanceIds) {
		fields.push(
			literal<CompanionInputFieldDropdown>({
				id: 'instanceId',
				label: 'Instance',
				type: 'dropdown',
				default: property.instanceIds[0]?.id ?? null,
				choices: property.instanceIds,

				multiple: false,
			}),
		);
	}

	fields.push({
		...property.valueInput,
		id: 'value',
		label: 'Value',
	});

	// // TODO - dynamic field type based on normal props
	// fields.push(
	// 	literal<CompanionInputFieldTextInput>({
	// 		id: 'value',
	// 		label: 'Value',
	// 		type: 'textinput',
	// 	}),
	// );

	return {
		name: property.name,
		options: fields,
	};
}
