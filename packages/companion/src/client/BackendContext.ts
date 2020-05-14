import React from 'react';

import io from 'socket.io-client';
import { DatabaseManager } from './database';

export interface BackendLink {
	socket: SocketIOClient.Socket;
	db: DatabaseManager;
}

export const BackendLinkContext = React.createContext<BackendLink>({
	socket: io({ autoConnect: false }),
	db: new DatabaseManager(),
});
