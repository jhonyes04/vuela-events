import { useEffect, useState } from 'react';
import {
    listOnlineUsers,
    openOnlineUsersStream,
    type OnlineUser,
} from '@/features/onlineUsers/lib/onlineUsers';

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
                    // Si falla, se mantiene la última lista conocida
                });
        };

        load();

        const source = openOnlineUsersStream(load);

        return () => {
            cancelled = true;
            source.close();
        };
    }, []);

    return users;
};
