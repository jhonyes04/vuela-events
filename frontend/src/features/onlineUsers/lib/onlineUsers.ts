import { api } from '@/lib/api';
import { config } from '@/config';

export interface OnlineUser {
    userId: string;
    puntoVuela: string | null;
    name: string;
    lastName: string;
    avatarConfigured: boolean;
}

const MAX_CONSECUTIVE_ERRORS = 5;

export const listOnlineUsers = async (): Promise<OnlineUser[]> => {
    const { users } = await api.get<{ users: OnlineUser[] }>(
        '/sessions/online',
    );

    return users;
};

export const openOnlineUsersStream = (onChange: () => void): EventSource => {
    const source = new EventSource(`${config.apiBase}/sessions/online/stream`, {
        withCredentials: true,
    });

    let consecutiveErrors = 0;

    source.onopen = () => (consecutiveErrors = 0);

    source.onmessage = () => onChange();

    source.onerror = () => {
        consecutiveErrors += 1;

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) source.close();
    };

    return source;
};
