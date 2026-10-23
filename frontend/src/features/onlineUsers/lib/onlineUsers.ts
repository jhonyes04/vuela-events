import { api } from '@/lib/api';

export interface OnlineUser {
    userId: string;
    name: string;
    lastName: string;
    avatarConfigured: boolean;
}

export const listOnlineUsers = async (): Promise<OnlineUser[]> => {
    const { users } = await api.get<{ users: OnlineUser[] }>(
        '/sessions/online',
    );

    return users;
};
