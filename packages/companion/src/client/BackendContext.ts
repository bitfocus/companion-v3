import React from 'react';

import io from 'socket.io-client';

export interface BackendLink {
	socket: SocketIOClient.Socket;
}
export interface AuthStatusLink {
	userInfo: { name: string } | undefined;
	authError: string | undefined;
	doLogin(username: string, password: string): void;
	doLogout(): void;
}

export const AuthStatusContext = React.createContext<AuthStatusLink>({
	userInfo: undefined,
	authError: undefined,
	doLogin: () => null,
	doLogout: () => null,
});

export const BackendLinkContext = React.createContext<BackendLink>({
	socket: io({ autoConnect: false }),
});
