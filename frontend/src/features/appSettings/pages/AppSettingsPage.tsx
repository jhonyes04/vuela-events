import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { PageTitle } from '@/components/PageTitle';
import { MaintenanceModeCard } from '@/features/appSettings/components/MaintenanceModeCard';
import { MaintenanceNoticeCard } from '@/features/appSettings/components/MaintenanceNoticeCard';
import { UserMenuStyleCard } from '@/features/appSettings/components/UserMenuStyleCard';
import { useAppSettingsStore } from '@/features/appSettings/store';

export const AppSettingsPage = () => {
    const loadStore = useAppSettingsStore((s) => s.load);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void loadStore().finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <section className="mx-auto grid w-full max-w-xl gap-6">
            <PageTitle icon={SlidersHorizontal}>Ajustes de la app</PageTitle>

            <MaintenanceModeCard />
            <MaintenanceNoticeCard />
            <UserMenuStyleCard loading={loading} />
        </section>
    );
};
