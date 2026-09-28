import type { ReactNode } from 'react';
import type { Role } from '@/lib/api';
import { EventsPage } from '@/pages/EventsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { UsersPage } from '@/pages/UsersPage';

export interface AppRoute {
    path: string;
    label: string;
    element: ReactNode;
    roles?: Role[];
}

export const appRoutes: AppRoute[] = [
    { path: '/', label: 'Eventos', element: <EventsPage /> },
    { path: '/perfil', label: 'Mi perfil', element: <ProfilePage /> },
    {
        path: '/admin/usuarios',
        label: 'Usuarios',
        element: <UsersPage />,
        roles: ['admin'],
    },
];

export const canAccess = (route: AppRoute, role: Role): boolean =>
    !route.roles || route.roles.includes(role);
