import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LoginMessage, LogoutMessage, SocketCommand, UserInfoMessage } from '@companion/core-shared/dist/api';
import { literal } from '@companion/core-shared/dist/util';
import { AuthStatusContext, AuthStatusLink } from './BackendContext';
import SocketIOClient from 'socket.io-client';
import { CompanionContext, ICompanionContext } from './util';
import { IDeviceConnection, IModule } from '@companion/core-shared/dist/collections';
import { subscribeToCollection } from './lib/subscription';

interface AuthComponentProps {
	socket: SocketIOClient.Socket;
}

export function AuthComponentWrapper(props: React.PropsWithChildren<AuthComponentProps>) {
	const [userInfo, setUserInfo] = useState<AuthStatusLink['userInfo']>();
	const [authError, setAuthError] = useState<string | undefined>();

	useEffect(() => {
		const handle = (msg: UserInfoMessage) => {
			setUserInfo(msg.info);
			setAuthError(msg.error);
		};
		props.socket.on(SocketCommand.UserInfo, handle);

		return () => {
			props.socket.off(SocketCommand.UserInfo, handle);
		};
	}, [props.socket]);

	const doLogin = useCallback(
		(username: string, password: string): void => {
			if (!userInfo) {
				props.socket.emit(
					SocketCommand.Login,
					literal<LoginMessage>({
						username,
						password,
					}),
				);
			}
		},
		[userInfo, props.socket],
	);

	const doLogout = useCallback((): void => {
		props.socket.emit(SocketCommand.Logout, literal<LogoutMessage>({}));
	}, [props.socket]);

	const authValue = useMemo(() => {
		return {
			userInfo: userInfo,
			authError: authError,
			doLogin: doLogin,
			doLogout: doLogout,
		};
	}, [userInfo, authError, doLogin, doLogout]);

	const [modules, setModules] = useState<Record<string, IModule>>({});
	const [connections, setConnections] = useState<Record<string, IDeviceConnection>>({});

	useEffect(() => {
		if (userInfo) {
			const [sub, unsub] = subscribeToCollection<IModule>(props.socket, 'modules');
			sub.subscribe((modules) => {
				const obj: Record<string, IModule> = {};
				for (const m of modules) {
					obj[m._id] = m;
				}
				setModules(obj);
			});
			return () => {
				unsub();
				setModules({});
			};
		}
	}, [props.socket, userInfo]);

	useEffect(() => {
		if (userInfo) {
			const [sub, unsub] = subscribeToCollection<IDeviceConnection>(props.socket, 'connections');
			sub.subscribe((connections) => {
				const obj: Record<string, IDeviceConnection> = {};
				for (const c of connections) {
					obj[c._id] = c;
				}
				setConnections(obj);
			});
			return () => {
				unsub();
				setConnections({});
			};
		}
	}, [props.socket, userInfo]);

	const contextValue: ICompanionContext = {
		socket: props.socket,
		notifier: undefined,
		instances: {},
		connections: connections,
		modules: modules,
		variableDefinitions: {},
		variableValues: {},
		actions: undefined,
		feedbacks: undefined,
	};

	return (
		<CompanionContext.Provider value={contextValue}>
			<AuthStatusContext.Provider value={authValue}>{props.children}</AuthStatusContext.Provider>
		</CompanionContext.Provider>
	);
}
