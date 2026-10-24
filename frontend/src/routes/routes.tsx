import type { ReactNode } from 'react';
import { EventsPage } from '@/features/events/pages/EventsPage';
import { EventsManagementPage } from '@/features/events/pages/EventsManagementPage';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';
import { MyEventsPage } from '@/features/profile/pages/MyEventsPage';
import { RolesPage } from '@/features/users/pages/RolesPage';
import { UsersPage } from '@/features/users/pages/UsersPage';
import { ProjectsPage } from '@/features/projects/pages/ProjectsPage';
import { ProjectInterestsPage } from '@/features/projects/pages/ProjectInterestsPage';
import { GuidesPage } from '@/features/guides/pages/GuidesPage';
import { EmailTemplatesPage } from '@/features/emailTemplates/pages/EmailTemplatesPage';
import { AuditPage } from '@/features/audit/pages/AuditPage';
import { StatsPage } from '@/features/stats/pages/StatsPage';
import { ResourcesPage } from '@/features/resources/pages/ResourcesPage';
import { ResourcesManagementPage } from '@/features/resources/pages/ResourcesManagementPage';
import { MaterialsPage } from '@/features/materials/pages/MaterialsPage';
import { AppSettingsPage } from '@/features/appSettings/pages/AppSettingsPage';
import { SessionsPage } from '@/features/sessions/pages/SessionsPage';

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
    },
    { path: '/perfil', label: 'Mi perfil', element: <ProfilePage /> },
    // Visibilidad (no admin) se controla donde se usa, no vía permissions: es
    // un rol, no un permiso, igual que /perfil nunca lo ha sido.
    {
        path: '/mis-eventos',
        label: 'Mis eventos',
        element: <MyEventsPage />,
    },
    {
        path: '/gestion/eventos',
        label: 'Eventos',
        element: <EventsManagementPage />,
        permissions: [
            'events:view',
            'events:create',
            'events:edit',
            'events:edit:own',
            'events:delete',
            'events:delete:own',
        ],
        group: 'gestion',
    },
    {
        path: '/gestion/recursos',
        label: 'Recursos',
        element: <ResourcesManagementPage />,
        permissions: [
            'resources:view',
            'resources:create',
            'resources:edit',
            'resources:edit:own',
            'resources:delete',
            'resources:delete:own',
        ],
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
            'guides:edit:own',
            'guides:delete',
            'guides:delete:own',
        ],
        group: 'gestion',
    },
    {
        path: '/gestion/proyectos',
        label: 'Proyectos',
        element: <ProjectsPage />,
        permissions: [
            'projects:view',
            'projects:create',
            'projects:edit',
            'projects:edit:own',
            'projects:delete',
            'projects:delete:own',
        ],
        group: 'gestion',
    },
    {
        path: '/gestion/materiales',
        label: 'Materiales',
        element: <MaterialsPage />,
        permissions: [
            'materials:view',
            'materials:create',
            'materials:edit',
            'materials:edit:own',
            'materials:delete',
            'materials:delete:own',
        ],
        group: 'gestion',
    },
    {
        path: '/gestion/intereses',
        label: 'Usuarios por proyecto',
        element: <ProjectInterestsPage />,
        permissions: ['attendees:interests:view'],
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
        path: '/admin/ajustes',
        label: 'Ajustes de la app',
        element: <AppSettingsPage />,
        permissions: ['settings:manage'],
        group: 'admin',
    },
    {
        path: '/admin/auditoria',
        label: 'Auditoría',
        element: <AuditPage />,
        permissions: ['audit:manage'],
        group: 'admin',
    },
    {
        path: '/admin/sesiones',
        label: 'Sesiones activas',
        element: <SessionsPage />,
        permissions: ['sessions:manage'],
        group: 'admin',
    },
];

export const canAccess = (route: AppRoute, permissions: string[]): boolean =>
    !route.permissions ||
    route.permissions.some((permission) => permissions.includes(permission));
