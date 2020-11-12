import React from 'react';
import { RxDatabase } from 'rxdb';

import io from 'socket.io-client';
import { ICollections } from '../shared/collections';

export interface BackendLink {
	socket: SocketIOClient.Socket;
	db: RxDatabase<ICollections> | null;
}
export interface AuthStatusLink {
	pendingLogin: boolean;
	pendingLogout: boolean;
	isLoggedIn: boolean;
	doLogin(username: string, password: string): Promise<void> | null;
	doLogout(): Promise<void> | null;
}

export const AuthStatusContext = React.createContext<AuthStatusLink>({
	pendingLogin: false,
	pendingLogout: false,
	isLoggedIn: false,
	doLogin: () => null,
	doLogout: () => null,
});

export const BackendLinkContext = React.createContext<BackendLink>({
	socket: io({ autoConnect: false }),
	db: null,
});
