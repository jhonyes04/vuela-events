import type { ReactNode } from 'react';
import { EventsPage } from '@/features/events/pages/EventsPage';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';
import { RolesPage } from '@/features/users/pages/RolesPage';
import { UsersPage } from '@/features/users/pages/UsersPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export interface AppRoute {
    path: string;
    label: string;
    element: ReactNode;
    permissions?: string[];
    group?: 'admin' | 'gestion';
}

export const appRoutes: AppRoute[] = [
    { path: '/', label: 'Eventos', element: <EventsPage /> },
    { path: '/perfil', label: 'Mi perfil', element: <ProfilePage /> },
    {
        path: '/gestion/eventos',
        label: 'Eventos',
        element: <PlaceholderPage title="Gestión de eventos" />,
        permissions: ['events:create'],
        group: 'gestion',
    },
    {
        path: '/gestion/categorias',
        label: 'Categorías',
        element: <PlaceholderPage title="Categorías" />,
        permissions: ['events:create'],
        group: 'gestion',
    },
    {
        path: '/gestion/guias',
        label: 'Guías',
        element: <PlaceholderPage title="Guías" />,
        permissions: ['events:create'],
        group: 'gestion',
    },
    {
        path: '/admin/usuarios',
        label: 'Usuarios',
        element: <UsersPage />,
        permissions: ['users:manage'],
        group: 'admin',
    },
    {
        path: '/admin/roles',
        label: 'Roles',
        element: <RolesPage />,
        permissions: ['roles:manage'],
        group: 'admin',
    },
];

export const canAccess = (route: AppRoute, permissions: string[]): boolean =>
    !route.permissions ||
    route.permissions.some((permission) => permissions.includes(permission));
