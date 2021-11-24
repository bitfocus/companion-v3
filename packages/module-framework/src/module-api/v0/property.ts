export type CompanionPropertyInstanceId = string | number;
export type CompanionPropertyValue = string | number | boolean;

export interface CompanionProperty {
	name: string;
	description?: string;
	/**
	 * Instances of this property.
	 * eg, channel number of the audio fader
	 * null if no instances
	 */
	instanceIds: Array<{ id: CompanionPropertyInstanceId; label: string }> | null;

	setValue?: (info: CompanionPropertyEvent) => Promise<void> | void;
	subscribe?: (info: CompanionPropertySubscribeInfo) => Promise<void> | void;
	unsubscribe?: (info: CompanionPropertySubscribeInfo) => Promise<void> | void;
}

export interface CompanionPropertySubscribeInfo {
	propertyId: string;
	instanceIds: CompanionPropertyInstanceId[] | null;
}

export interface CompanionPropertyEvent {
	propertyId: string;
	instanceId: CompanionPropertyInstanceId | null;

	// TODO
	// deviceId: string | undefined;
	// page: number;
	// bank: number;
}

export interface CompanionProperties {
	[actionId: string]: CompanionProperty | undefined;
}
