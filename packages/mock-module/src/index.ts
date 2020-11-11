import {
	InstanceBase,
	CompanionActionEvent,
	CompanionFeedbackEvent,
	CompanionFeedbackResult,
	LogLevel,
	CompanionInputField,
	rgb,
} from '../../companion/src/shared/module-api';
// TODO This import path is bad and causes the output to be messed up. It still runs happily thouth

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MockConfig {}

export default class MockModule extends InstanceBase<MockConfig> {
	init(config: MockConfig): void | Promise<void> {
		console.log(`module ${this.id} received init: ${JSON.stringify(config)}`);
		this.log(LogLevel.INFO, `received init: ${JSON.stringify(config)}`);

		this.setActionDefinitions({
			fake: {
				label: 'Fake action',
				options: [],
			},
		});
		this.setFeedbackDefinitions({
			fake: {
				label: 'Fake feedback',
				description: 'Fake thing',
				options: [],
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
					color: rgb(255, 255, 255),
					bgcolor: rgb(0, 0, 0),
				},
				feedbacks: [
					{
						type: 'fake',
						options: {
							bg: rgb(0, 255, 0),
							fg: rgb(255, 255, 255),
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
		this.setVariableDefinitions([
			{
				name: 'fake',
				description: 'something fake',
			},
		]);
	}
	destroy(): void | Promise<void> {
		console.log(`module ${this.id} received destroy`);
		this.log(LogLevel.INFO, 'received destroy');
	}
	configUpdated(config: MockConfig): void | Promise<void> {
		console.log(`module ${this.id} received configUpdated: ${JSON.stringify(config)}`);
		this.log(LogLevel.INFO, `received configUpdated: ${JSON.stringify(config)}`);
	}
	getConfigFields(): CompanionInputField[] {
		console.log(`module ${this.id} received getConfigFields`);
		this.log(LogLevel.INFO, 'received getConfigFields');
		return [
			{
				id: 'abc',
				label: 'not yet',
				type: 'text',
			},
		];
	}
	executeAction(action: CompanionActionEvent): void {
		console.log(`module ${this.id} received executeAction: ${action.type}`);
		this.log(LogLevel.INFO, `received executeAction: ${action.type}`);
	}
	executeFeedback(feedback: CompanionFeedbackEvent): CompanionFeedbackResult {
		console.log(`module ${this.id} received executeAction: ${feedback.type}`);
		this.log(LogLevel.INFO, `received executeAction: ${feedback.type}`);
		return {};
	}
}
