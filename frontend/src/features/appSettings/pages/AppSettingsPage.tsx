import { useEffect, useState } from 'react';
import {
    Menu,
    SlidersHorizontal,
    Wrench,
    LayoutPanelLeft,
    ClipboardList,
    Mail,
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
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { MaintenanceModeCard } from '@/features/appSettings/components/MaintenanceModeCard';
import { MaintenanceNoticeCard } from '@/features/appSettings/components/MaintenanceNoticeCard';
import { ProjectSectionsCard } from '@/features/appSettings/components/ProjectSectionsCard';
import { UserMenuStyleCard } from '@/features/appSettings/components/UserMenuStyleCard';
import { EmailSettingsCard } from '@/features/appSettings/components/EmailSettingsCard';
import { useAppSettingsStore } from '@/features/appSettings/store';
import { useAuth } from '@/features/auth/hooks/context';
import { Button } from '@/components/ui/button';

type SettingsSectionId = 'maintenance' | 'projects' | 'email' | 'interface';

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
        { id: 'email' as const, icon: Mail, title: 'Correo' },
        { id: 'interface' as const, icon: LayoutPanelLeft, title: 'Interfaz' },
    ];
    const [activeSection, setActiveSection] = useState<SettingsSectionId>(
        sections[0].id,
    );
    const [menuOpen, setMenuOpen] = useState(false);

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

    const renderMenuItems = (onSelect: (id: SettingsSectionId) => void) =>
        sections.map((section) => (
            <SidebarMenuItem key={section.id} className="shrink-0">
                <SidebarMenuButton
                    className="min-h-10 cursor-pointer data-active:bg-brand-yellow data-active:text-brand-ink"
                    isActive={activeSection === section.id}
                    onClick={() => onSelect(section.id)}
                >
                    <section.icon />
                    <span>{section.title}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        ));

    return (
        <section className="mx-auto grid w-full">
            <PageTitle icon={SlidersHorizontal}>Ajustes de la app</PageTitle>
            <Button
                type="button"
                size="icon-sm"
                className="fixed top-30 right-4 z-40 size-10 shrink-0 rounded-full shadow-lg sm:hidden"
                aria-label="Abrir menú de ajustes"
                onClick={() => setMenuOpen(true)}
            >
                <Menu />
            </Button>

            <SidebarProvider className="min-h-0 w-full sm:flex-row sm:gap-4">
                <Sidebar
                    collapsible="none"
                    className="hidden sm:flex sm:h-fit sm:w-50 sm:shrink-0 sm:flex-col sm:rounded-xl sm:border sm:bg-card sm:p-2"
                >
                    <SidebarContent>
                        <SidebarGroup className="p-0">
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {renderMenuItems(setActiveSection)}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>
                </Sidebar>

                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                    <SheetContent side="top" className="sm:hidden">
                        <SheetHeader>
                            <SheetTitle>Ajustes de la app</SheetTitle>
                        </SheetHeader>
                        <SidebarMenu className="gap-1 p-4 pt-0">
                            {renderMenuItems((id) => {
                                setActiveSection(id);
                                setMenuOpen(false);
                            })}
                        </SidebarMenu>
                    </SheetContent>
                </Sheet>

                <div className="grid w-full min-w-0 gap-4">
                    {activeSection === 'maintenance' && user?.isSuperadmin && (
                        <>
                            <MaintenanceModeCard />
                            <MaintenanceNoticeCard />
                        </>
                    )}
                    {activeSection === 'projects' && <ProjectSectionsCard />}
                    {activeSection === 'email' && <EmailSettingsCard />}
                    {activeSection === 'interface' && (
                        <UserMenuStyleCard loading={loading} />
                    )}
                </div>
            </SidebarProvider>
        </section>
    );
};
