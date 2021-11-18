import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LoginMessage, LogoutMessage, SocketCommand, UserInfoMessage } from '@companion/core-shared/dist/api';
import { literal } from '@companion/core-shared/dist/util';
import { AuthStatusContext, AuthStatusLink } from './BackendContext';
import { Socket } from 'socket.io-client';
import { CompanionContext, ICompanionContext, socketEmit2 } from './util';
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
	socket: Socket;
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
				socketEmit2(
					props.socket,
					SocketCommand.Login,
					literal<LoginMessage>({
						username,
						password,
					}),
				).catch((e) => {
					console.error(e);
				});
			}
		},
		[userInfo, props.socket],
	);

	const doLogout = useCallback((): void => {
		socketEmit2(props.socket, SocketCommand.Logout, literal<LogoutMessage>({})).catch((e) => {
			console.error(e);
		});
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
