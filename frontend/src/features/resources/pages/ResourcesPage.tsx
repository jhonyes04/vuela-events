import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResourceLinksTab } from '@/features/resources/components/ResourceLinksTab';
import { DocumentsTab } from '@/features/resources/components/DocumentsTab';

export const ResourcesPage = () => (
    <section>
        <h1 className="mb-6 text-2xl font-semibold">Recursos</h1>

        <Tabs defaultValue="enlaces">
            <TabsList>
                <TabsTrigger value="enlaces">Enlaces</TabsTrigger>
                <TabsTrigger value="documentos">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="enlaces">
                <ResourceLinksTab />
            </TabsContent>

            <TabsContent value="documentos">
                <DocumentsTab />
            </TabsContent>
        </Tabs>
    </section>
);
