import type { ReactNode } from 'react';
import { EventsPage } from '@/features/events/pages/EventsPage';
import { EventsManagementPage } from '@/features/events/pages/EventsManagementPage';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';
import { RolesPage } from '@/features/users/pages/RolesPage';
import { UsersPage } from '@/features/users/pages/UsersPage';
import { CategoriesPage } from '@/features/categories/pages/CategoriesPage';
import { CategoryInterestsPage } from '@/features/categories/pages/CategoryInterestsPage';
import { GuidesPage } from '@/features/guides/pages/GuidesPage';
import { EmailTemplatesPage } from '@/features/emailTemplates/pages/EmailTemplatesPage';
import { EmailSettingsPage } from '@/features/emailSettings/pages/EmailSettingsPage';
import { AuditPage } from '@/features/audit/pages/AuditPage';
import { StatsPage } from '@/features/stats/pages/StatsPage';
import { ResourcesPage } from '@/features/resources/pages/ResourcesPage';

export interface AppRoute {
    path: string;
    label: string;
    element: ReactNode;
    permissions?: string[];
    group?: 'admin' | 'gestion' | 'estadisticas';
}

export const appRoutes: AppRoute[] = [
    { path: '/', label: 'Eventos', element: <EventsPage /> },
    {
        path: '/recursos',
        label: 'Recursos',
        element: <ResourcesPage />,
        permissions: [
            'resources:view',
            'resources:create',
            'resources:edit',
            'resources:delete',
        ],
    },
    { path: '/perfil', label: 'Mi perfil', element: <ProfilePage /> },
    {
        path: '/gestion/eventos',
        label: 'Eventos',
        element: <EventsManagementPage />,
        permissions: [
            'events:view',
            'events:create',
            'events:edit',
            'events:delete',
        ],
        group: 'gestion',
    },
    {
        path: '/gestion/categorias',
        label: 'Categorías',
        element: <CategoriesPage />,
        permissions: [
            'categories:view',
            'categories:create',
            'categories:edit',
            'categories:delete',
        ],
        group: 'gestion',
    },
    {
        path: '/gestion/intereses',
        label: 'Usuarios por categoría',
        element: <CategoryInterestsPage />,
        permissions: ['categories:view'],
        group: 'gestion',
    },
    {
        path: '/gestion/guias',
        label: 'Guías',
        element: <GuidesPage />,
        permissions: [
            'guides:view',
            'guides:create',
            'guides:edit',
            'guides:delete',
        ],
        group: 'gestion',
    },
    {
        path: '/gestion/plantillas-correo',
        label: 'Plantillas de correo',
        element: <EmailTemplatesPage />,
        permissions: [
            'email:view',
            'email:create',
            'email:edit',
            'email:delete',
        ],
        group: 'gestion',
    },
    {
        path: '/estadisticas',
        label: 'Estadísticas',
        element: <StatsPage />,
        permissions: ['stats:view'],
        group: 'estadisticas',
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
    {
        path: '/admin/correo',
        label: 'Configuración correo',
        element: <EmailSettingsPage />,
        permissions: ['email:send'],
        group: 'admin',
    },
    {
        path: '/admin/auditoria',
        label: 'Auditoría',
        element: <AuditPage />,
        permissions: ['audit:manage'],
        group: 'admin',
    },
];

export const canAccess = (route: AppRoute, permissions: string[]): boolean =>
    !route.permissions ||
    route.permissions.some((permission) => permissions.includes(permission));
