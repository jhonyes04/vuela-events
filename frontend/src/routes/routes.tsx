import type { ReactNode } from 'react';
import { EventsPage } from '@/pages/EventsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RolesPage } from '@/pages/RolesPage';
import { UsersPage } from '@/pages/UsersPage';

export interface AppRoute {
    path: string;
    label: string;
    element: ReactNode;
    permissions?: string[];
}

export const appRoutes: AppRoute[] = [
    { path: '/', label: 'Eventos', element: <EventsPage /> },
    { path: '/perfil', label: 'Mi perfil', element: <ProfilePage /> },
    {
        path: '/admin/usuarios',
        label: 'Usuarios',
        element: <UsersPage />,
        permissions: ['users:manage'],
    },
    {
        path: '/admin/roles',
        label: 'Roles',
        element: <RolesPage />,
        permissions: ['roles:manage'],
    },
];

export const canAccess = (route: AppRoute, permissions: string[]): boolean =>
    !route.permissions ||
    route.permissions.some((permission) => permissions.includes(permission));
