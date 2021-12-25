import {
	IButtonControlRenderLayer,
	IControlDefinition,
} from '@companion/core-shared/dist/collections/ControlDefinition.js';
import { Filter } from 'mongodb';

export interface IControlFeedbackValue {
	// Id is the same as IControlDefinition._id
	_id: string;

	values: { [feedbackId: string]: boolean | Partial<IButtonControlRenderLayer> | undefined };
}

export function getQueryForControlDefinitionUsingFeedbacksWithConnectionId(
	connectionId: string,
): Filter<IControlDefinition> {
	// TODO - this is incomplete
	return {
		$or: [
			{
				'overlayLayers.type': 'advanced',
				'overlayLayers.feedback.connectionId': connectionId,
			},
			{
				'overlayLayers.type': 'expression',
				'overlayLayers.feedbacks.connectionId': connectionId,
			},
		],
	};
}
