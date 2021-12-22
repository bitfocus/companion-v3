import {
	InstanceBaseV0,
	LogLevel,
	CompanionInputField,
	combineRgb,
	InstanceStatus,
	literal,
	CompanionInputFieldTextInput,
	// runEntrypointV0,
} from '@companion/module-framework';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MockConfig {}

export default class MockModule extends InstanceBaseV0<MockConfig> {
	init(config: MockConfig): void | Promise<void> {
		console.log(`module ${this.id} received init: ${JSON.stringify(config)}`);
		this.userLog(LogLevel.INFO, `received init: ${JSON.stringify(config)}`);

		this.updateStatus(InstanceStatus.OK, 'something something');

		this.setActionDefinitions({
			fake: {
				name: 'Fake action',
				options: [],
				callback: (e) => {
					console.log(`Execute action in module: ${JSON.stringify(e)}`);
				},
			},
		});
		this.setFeedbackDefinitions({
			fake: {
				name: 'Fake feedback',
				description: 'Fake thing',
				options: [],
				type: 'boolean',
				defaultStyle: {},
				callback: () => false,
			},
			advanced: {
				name: 'Fake advanced feedback',
				description: 'Fake thing',
				options: [
					{
						id: 'test',
						type: 'checkbox',
						label: 'Enable',
						default: true,
					},
				],
				type: 'advanced',
				callback: (fb) => {
					if (fb.options.test) {
						return { text: 'haha!' };
					} else {
						return {};
					}
				},
			},
		});
		this.setPresetDefinitions([
			{
				category: `Category1`,
				description: `Something fun`,
				bank: {
					style: 'text',
					text: `$(fake99:fake)`,
					size: '7',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				feedbacks: [
					{
						type: 'fake',
						options: {
							bg: combineRgb(0, 255, 0),
							fg: combineRgb(255, 255, 255),
							opt1: 9,
						},
					},
				],
				actions: [
					{
						type: 'fake',
						options: {
							opt1: 9,
						},
					},
				],
			},
		]);
		this.setPropertiesDefinitions({
			one: {
				name: 'Prop No instances',
				instanceIds: null,
				setValue: async () => undefined,
				valueField: literal<CompanionInputFieldTextInput>({
					id: '',
					label: 'Thing',
					type: 'textinput',
				}),
			},
			two: {
				name: 'Prop Reaonly',
				instanceIds: null,
			},
			three: {
				name: 'Prop all the options',
				instanceIds: [
					{
						id: '/ch/1',
						label: 'Channel 1',
					},
					{
						id: '/ch/2',
						label: 'Channel 2',
					},
					{
						id: '/ch/3',
						label: 'Channel 3',
					},
				],
				setValue: async () => undefined,
				valueField: literal<CompanionInputFieldTextInput>({
					id: '',
					label: 'Fader %',
					type: 'textinput',
				}),
			},
		});
	}
	destroy(): void | Promise<void> {
		console.log(`module ${this.id} received destroy`);
		this.userLog(LogLevel.INFO, 'received destroy');
	}
	configUpdated(config: MockConfig): void | Promise<void> {
		console.log(`module ${this.id} received configUpdated: ${JSON.stringify(config)}`);
		this.userLog(LogLevel.INFO, `received configUpdated: ${JSON.stringify(config)}`);
	}
	getConfigFields(): CompanionInputField[] {
		console.log(`module ${this.id} received getConfigFields`);
		this.userLog(LogLevel.INFO, 'received getConfigFields');
		return [
			{
				id: 'abc',
				label: 'not yet',
				type: 'text',
			},
		];
	}
}
