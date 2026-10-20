import { FileText, FolderOpen, Link2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ResourceLinksTab } from '@/features/resources/components/ResourceLinksTab';
import { DocumentsTab } from '@/features/resources/components/DocumentsTab';
import { PageTitle } from '@/components/PageTitle';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export const ResourcesPage = () => {
    const [search, setSearch] = useState<string>('');

    return (
        <section>
            <PageTitle icon={FolderOpen}>Recursos</PageTitle>

            <div className="mb-4">
                <Input
                    placeholder="Buscar…"
                    className="bg-card w-full sm:w-56"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <Tabs defaultValue="enlaces">
                <TabsList className="flex h-auto w-full gap-2 bg-transparent p-0 sm:w-auto">
                    <TabsTrigger
                        value="enlaces"
                        className="h-9 flex-1 gap-2 rounded-lg border bg-card px-4 text-sm font-medium shadow-none data-active:border-transparent data-active:bg-brand-yellow data-active:text-brand-ink sm:flex-none sm:px-5"
                    >
                        <Link2 className="size-4 shrink-0" />
                        Enlaces
                    </TabsTrigger>
                    <TabsTrigger
                        value="documentos"
                        className="h-9 flex-1 gap-2 rounded-lg border bg-card px-4 text-sm font-medium shadow-none data-active:border-transparent data-active:bg-brand-yellow data-active:text-brand-ink sm:flex-none sm:px-5"
                    >
                        <FileText className="size-4 shrink-0" />
                        Documentos
                    </TabsTrigger>
                </TabsList>

                <Separator className="data-horizontal:h-1 bg-yellow-400/30 rounded-full" />

                <TabsContent value="enlaces" className="mt-2">
                    <ResourceLinksTab search={search} />
                </TabsContent>

                <TabsContent value="documentos" className="mt-2">
                    <DocumentsTab search={search} />
                </TabsContent>
            </Tabs>
        </section>
    );
};
