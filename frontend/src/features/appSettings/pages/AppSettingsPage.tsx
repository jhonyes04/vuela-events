import { useEffect, useState } from 'react';
import {
    SlidersHorizontal,
    Wrench,
    LayoutPanelLeft,
    ClipboardList,
} from 'lucide-react';
import { PageTitle } from '@/components/PageTitle';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from '@/components/ui/sidebar';
import { MaintenanceModeCard } from '@/features/appSettings/components/MaintenanceModeCard';
import { MaintenanceNoticeCard } from '@/features/appSettings/components/MaintenanceNoticeCard';
import { ProjectSectionsCard } from '@/features/appSettings/components/ProjectSectionsCard';
import { UserMenuStyleCard } from '@/features/appSettings/components/UserMenuStyleCard';
import { useAppSettingsStore } from '@/features/appSettings/store';
import { useAuth } from '@/features/auth/hooks/context';

type SettingsSectionId = 'maintenance' | 'projects' | 'interface';

interface SettingsSectionDef {
    id: SettingsSectionId;
    icon: typeof Wrench;
    title: string;
}

export const AppSettingsPage = () => {
    const { user } = useAuth();
    const loadStore = useAppSettingsStore((s) => s.load);
    const [loading, setLoading] = useState(true);

    const sections: SettingsSectionDef[] = [
        ...(user?.isSuperadmin
            ? [
                  {
                      id: 'maintenance' as const,
                      icon: Wrench,
                      title: 'Mantenimiento',
                  },
              ]
            : []),
        {
            id: 'projects' as const,
            icon: ClipboardList,
            title: 'Campos de Proyectos',
        },
        { id: 'interface' as const, icon: LayoutPanelLeft, title: 'Interfaz' },
    ];
    const [activeSection, setActiveSection] = useState<SettingsSectionId>(
        sections[0].id,
    );

    useEffect(() => {
        void loadStore().finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Si la sección activa deja de existir (p. ej. se pierde isSuperadmin),
    // cae a la primera disponible. Ajuste en render, no useEffect: evita el
    // render en cascada.
    if (!sections.some((s) => s.id === activeSection)) {
        setActiveSection(sections[0].id);
    }

    return (
        <section className="mx-auto grid w-full max-w-4xl gap-6">
            <PageTitle icon={SlidersHorizontal}>Ajustes de la app</PageTitle>

            <SidebarProvider className="min-h-0 w-full flex-col items-start gap-4 sm:flex-row sm:gap-6">
                <Sidebar
                    collapsible="none"
                    className="h-auto w-full flex-row gap-1 overflow-x-auto bg-transparent p-0 sm:h-fit sm:w-48 sm:shrink-0 sm:flex-col sm:gap-0 sm:overflow-visible sm:rounded-xl sm:border sm:bg-card sm:p-2"
                >
                    <SidebarContent className="overflow-visible">
                        <SidebarGroup className="p-0">
                            <SidebarGroupContent>
                                <SidebarMenu className="flex-row gap-1 sm:flex-col sm:gap-0">
                                    {sections.map((section) => (
                                        <SidebarMenuItem
                                            key={section.id}
                                            className="shrink-0"
                                        >
                                            <SidebarMenuButton
                                                className="cursor-pointer data-active:bg-brand-yellow data-active:text-brand-ink"
                                                isActive={
                                                    activeSection === section.id
                                                }
                                                onClick={() =>
                                                    setActiveSection(section.id)
                                                }
                                            >
                                                <section.icon />
                                                <span>{section.title}</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>
                </Sidebar>

                <div className="grid w-full min-w-0 gap-4">
                    {activeSection === 'maintenance' && user?.isSuperadmin && (
                        <>
                            <MaintenanceModeCard />
                            <MaintenanceNoticeCard />
                        </>
                    )}
                    {activeSection === 'projects' && <ProjectSectionsCard />}
                    {activeSection === 'interface' && (
                        <UserMenuStyleCard loading={loading} />
                    )}
                </div>
            </SidebarProvider>
        </section>
    );
};
