import React, { useEffect } from 'react';
import pTimeout from 'p-timeout';
import { CAlert, CButton, CCol } from '@coreui/react';
import { ErrorBoundary } from 'react-error-boundary';
import { PRIMARY_COLOR } from './Constants';
import { BarLoader } from 'react-spinners';
import SocketIOClient from 'socket.io-client';
import { IModule } from '@companion/core-shared/dist/collections';

export interface ICompanionContext {
	socket: SocketIOClient.Socket;
	notifier: any | undefined;
	instances: unknown | undefined;
	modules: IModule[] | null;
	variableDefinitions: unknown | undefined;
	variableValues: unknown | undefined;
	actions: unknown | undefined;
	feedbacks: unknown | undefined;
}
export const CompanionContext = React.createContext<ICompanionContext>({
	socket: SocketIOClient.io({ autoConnect: false }),
	notifier: undefined,
	instances: undefined,
	modules: null,
	variableDefinitions: undefined,
	variableValues: undefined,
	actions: undefined,
	feedbacks: undefined,
});

export function socketEmit<T>(
	socket: SocketIOClient.Socket,
	name: string,
	args: any[],
	timeout?: number,
	timeoutMessage?: string,
): Promise<T> {
	const p = new Promise<T>((resolve, reject) => {
		console.log('send', name, ...args);

		socket.emit(name, ...args, (...res: any[]) => resolve(res as any));
	});

	timeout = timeout ?? 5000;
	return pTimeout(p, timeout, timeoutMessage ?? `Timed out after ${timeout / 1000}s`);
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
	return (
		<CAlert color='danger'>
			<p>Something went wrong:</p>
			<pre>{error.message}</pre>
			<CButton color='primary' size='sm' onClick={resetErrorBoundary}>
				Try again
			</CButton>
		</CAlert>
	);
}

export function MyErrorBoundary({ children }: React.PropsWithChildren<{}>) {
	return <ErrorBoundary FallbackComponent={ErrorFallback}>{children}</ErrorBoundary>;
}

export function KeyReceiver({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) {
	return (
		<div {...props} style={{ ...props.style, outline: 'none' }}>
			{children}
		</div>
	);
}

// eslint-disable-next-line react-hooks/exhaustive-deps
export const useMountEffect = (fun: React.EffectCallback) => useEffect(fun, []);

export function LoadingBar(props: any) {
	return (
		<BarLoader
			loading={true}
			height={4}
			width='50%'
			css={{ margin: '0 auto', display: 'inherit' }}
			color={PRIMARY_COLOR}
			{...props}
		/>
	);
}

export function LoadingRetryOrError({
	error,
	dataReady,
	doRetry,
}: {
	error: string | null;
	dataReady: boolean;
	doRetry: () => void;
}) {
	return (
		<>
			{error ? (
				<CCol sm={12}>
					<CAlert color='danger' role='alert'>
						<p>{error}</p>
						{!dataReady ? (
							<CButton color='primary' onClick={doRetry}>
								Retry
							</CButton>
						) : (
							''
						)}
					</CAlert>
				</CCol>
			) : (
				''
			)}
			{!dataReady && !error ? (
				<CCol sm={12}>
					<LoadingBar />
				</CCol>
			) : (
				''
			)}
		</>
	);
}
