import { api } from '@/lib/api';

export type UserMenuStyle = 'dropdown' | 'sheet';

export interface AppSettingsData {
    userMenuStyle: UserMenuStyle;
    maintenanceMode: boolean;
}

export const getAppSettings = (): Promise<AppSettingsData> =>
    api.get('/app-settings');

export const setUserMenuStyle = (
    userMenuStyle: UserMenuStyle,
): Promise<{ userMenuStyle: UserMenuStyle }> =>
    api.patch('/app-settings/user-menu-style', { userMenuStyle });

export const setMaintenanceMode = (
    maintenanceMode: boolean,
): Promise<{ maintenanceMode: boolean }> =>
    api.patch('/app-settings/maintenance-mode', { maintenanceMode });

export const startMaintenanceNotice = async (input: {
    from: string;
    to: string;
    reason: string;
}): Promise<string> => {
    const { jobId } = await api.post<{ jobId: string }>(
        '/app-settings/maintenance-notice',
        input,
    );

    return jobId;
};

export interface MaintenanceNoticeResult {
    email: string;
    ok: boolean;
    error?: string;
    label: string;
}

export interface MaintenanceNoticeRecipient {
    email: string;
    label: string;
}

export interface MaintenanceNoticeJobStatus {
    id: string;
    total: number;
    sent: number;
    failed: number;
    done: boolean;
    recipients: MaintenanceNoticeRecipient[];
    results: MaintenanceNoticeResult[];
}

export const getMaintenanceNoticeJobStatus = async (
    jobId: string,
): Promise<MaintenanceNoticeJobStatus> => {
    const { job } = await api.get<{ job: MaintenanceNoticeJobStatus }>(
        `/app-settings/maintenance-notice/${jobId}`,
    );

    return job;
};

// Sin autenticar: lo consulta App.tsx antes de saber quién es el usuario.
export const getMaintenanceStatus = (): Promise<{ maintenanceMode: boolean }> =>
    api.get('/maintenance-status');
