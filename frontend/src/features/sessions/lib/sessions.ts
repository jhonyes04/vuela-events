import { api } from '@/lib/api';
export interface ActiveSession {
    sid: string;
    userId: string;
    userName: string;
    name: string;
    puntoVuela: string | null;
    userEmail: string;
    expire: string;
    current: boolean;
}

export const listActiveSessions = async (): Promise<ActiveSession[]> => {
    const { sessions } = await api.get<{ sessions: ActiveSession[] }>(
        '/sessions',
    );

    return sessions;
};

export const revokeSession = (sid: string): Promise<void> =>
    api.delete(`/sessions/${encodeURIComponent(sid)}`);
