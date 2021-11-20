import winston from 'winston';

export const logger = winston.createLogger({
	level: 'silly',
	format: winston.format.combine(
		winston.format.colorize(),
		winston.format.timestamp(),
		winston.format.printf((options) => {
			return `${options.timestamp} ${options.level} [${options.moduleName}]: ${options.message}`;
		}),
	),
	// format: winston.format.json(),
	transports: [
		// //
		// // - Write all logs with level `error` and below to `error.log`
		// // - Write all logs with level `info` and below to `combined.log`
		// //
		// new winston.transports.File({ filename: 'error.log', level: 'error' }),
		// new winston.transports.File({ filename: 'combined.log' }),
		new winston.transports.Console(),
	],
});

export function createChildLogger(name: string): winston.Logger {
	return logger.child({ moduleName: name });
}
// TODO - configure this more
