import shortid from 'shortid';
import { ICore } from './core';

const authSesions = new Set<string>();

export interface UserSessionInfo {
	name: string;
}

/**
 * This is a hacky temporary authentication backend, to get authentication to be in place, but to be useless
 */
export async function login(username: string, password: string): Promise<string | null> {
	if (username === 'admin' && password === 'password') {
		const sessionId = shortid();
		authSesions.add(sessionId);
		return sessionId;
	} else {
		return null;
	}
}

export async function logout(sessionId: string): Promise<void> {
	authSesions.delete(sessionId);
	// TODO - stop any subscriptions?
}

export async function getUserInfo(_core: ICore, sessionId: string | null): Promise<UserSessionInfo | null> {
	if (sessionId && authSesions.has(sessionId)) {
		return {
			name: 'Test User',
		};
	} else {
		return null;
	}
}

export async function verifyUserSession(core: ICore, sessionId: string | null): Promise<UserSessionInfo> {
	const userSession = await getUserInfo(core, sessionId);
	if (!userSession) {
		throw new Error('Not authorised');
	}
	return userSession;
}
