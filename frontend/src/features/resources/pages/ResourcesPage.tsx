import { FileText, Link2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResourceLinksTab } from '@/features/resources/components/ResourceLinksTab';
import { DocumentsTab } from '@/features/resources/components/DocumentsTab';

export const ResourcesPage = () => (
    <section>
        <h1 className="mb-6 text-2xl font-semibold">Recursos</h1>

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

            <TabsContent value="enlaces" className="mt-6">
                <ResourceLinksTab />
            </TabsContent>

            <TabsContent value="documentos" className="mt-6">
                <DocumentsTab />
            </TabsContent>
        </Tabs>
    </section>
);
