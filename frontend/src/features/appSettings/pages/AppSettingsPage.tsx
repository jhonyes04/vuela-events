import { useEffect, useState } from 'react';
import { SlidersHorizontal, Wrench, LayoutPanelLeft } from 'lucide-react';
import { PageTitle } from '@/components/PageTitle';
import { MaintenanceModeCard } from '@/features/appSettings/components/MaintenanceModeCard';
import { MaintenanceNoticeCard } from '@/features/appSettings/components/MaintenanceNoticeCard';
import { UserMenuStyleCard } from '@/features/appSettings/components/UserMenuStyleCard';
import { useAppSettingsStore } from '@/features/appSettings/store';
import { useAuth } from '@/features/auth/hooks/context';

interface SettingsSectionProps {
    icon: typeof Wrench;
    title: string;
    children: React.ReactNode;
}

const SettingsSection = ({
    icon: Icon,
    title,
    children,
}: SettingsSectionProps) => (
    <div className="grid gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="size-4 shrink-0" />
            <h2 className="text-xs font-semibold uppercase tracking-wide">
                {title}
            </h2>
        </div>
        <div className="grid gap-4">{children}</div>
    </div>
);

export const AppSettingsPage = () => {
    const { user } = useAuth();
    const loadStore = useAppSettingsStore((s) => s.load);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void loadStore().finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <section className="mx-auto grid w-full max-w-2xl gap-8">
            <PageTitle icon={SlidersHorizontal}>Ajustes de la app</PageTitle>

            {user?.isSuperadmin && (
                <SettingsSection icon={Wrench} title="Mantenimiento">
                    <MaintenanceModeCard />
                    <MaintenanceNoticeCard />
                </SettingsSection>
            )}

            <SettingsSection icon={LayoutPanelLeft} title="Interfaz">
                <UserMenuStyleCard loading={loading} />
            </SettingsSection>
        </section>
    );
};
