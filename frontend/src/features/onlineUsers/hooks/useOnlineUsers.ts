import { useEffect, useState } from 'react';
import {
    listOnlineUsers,
    type OnlineUser,
} from '@/features/onlineUsers/lib/onlineUsers';

const POLL_INTERVAL_MS = 30_000;

export const useOnlineUsers = (): OnlineUser[] => {
    const [users, setUsers] = useState<OnlineUser[]>([]);

    useEffect(() => {
        let cancelled = false;

        const load = () => {
            listOnlineUsers()
                .then((res) => {
                    if (!cancelled) setUsers(res);
                })
                .catch(() => {
                    // Si falla, se mantiene la última lista conocida.
                });
        };

        load();
        const id = setInterval(load, POLL_INTERVAL_MS);

        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    return users;
};
