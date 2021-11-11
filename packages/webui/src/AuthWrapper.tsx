import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LoginMessage, LogoutMessage, SocketCommand, UserInfoMessage } from '@companion/core-shared/dist/api';
import { literal } from '@companion/core-shared/dist/util';
import { AuthStatusContext, AuthStatusLink } from './BackendContext';
import SocketIOClient from 'socket.io-client';
import { CompanionContext, ICompanionContext } from './util';
import {
	CollectionId,
	IControlDefinition,
	IDeviceConnection,
	IDeviceConnectionAction,
	IModule,
	ISurfaceSpace,
} from '@companion/core-shared/dist/collections';
import { useCollection } from './lib/subscription';

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

	const modules = useCollection<IModule>(props.socket, CollectionId.Modules, !!userInfo);
	const connections = useCollection<IDeviceConnection>(props.socket, CollectionId.Connections, !!userInfo);
	const actions = useCollection<IDeviceConnectionAction>(props.socket, CollectionId.ConnectionActions, !!userInfo);
	const controls = useCollection<IControlDefinition>(props.socket, CollectionId.ControlDefinitions, !!userInfo);
	const spaces = useCollection<ISurfaceSpace>(props.socket, CollectionId.SurfaceSpaces, !!userInfo);

	const actions2 = useMemo(() => {
		return Object.values(actions);
	}, [actions]);

	const contextValue: ICompanionContext = {
		socket: props.socket,
		notifier: undefined,
		instances: {},
		controls: controls,
		spaces: spaces,
		connections: connections,
		modules: modules,
		variableDefinitions: {},
		variableValues: {},
		actions: actions2,
		feedbacks: undefined,
	};

	return (
		<CompanionContext.Provider value={contextValue}>
			<AuthStatusContext.Provider value={authValue}>{props.children}</AuthStatusContext.Provider>
		</CompanionContext.Provider>
	);
}
