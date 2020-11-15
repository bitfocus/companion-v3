export type SubscriptionEvent<T> =
	| {
			event: 'init';
			docs: T[];
	  }
	| {
			event: 'change';
			doc: T;
	  }
	| {
			event: 'remove';
			docId: string;
	  }
	| {
			event: 'error';
			message: string;
	  };
