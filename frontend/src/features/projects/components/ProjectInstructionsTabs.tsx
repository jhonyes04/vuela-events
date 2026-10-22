import { ClipboardCheck, ClipboardList } from 'lucide-react';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProjectInstructionsTabsProps {
    openingInstructions: string;
    onOpeningChange: (html: string) => void;
    closingInstructions: string;
    onClosingChange: (html: string) => void;
}

export const ProjectInstructionsTabs = ({
    openingInstructions,
    onOpeningChange,
    closingInstructions,
    onClosingChange,
}: ProjectInstructionsTabsProps) => (
    <Card>
        <CardContent>
            <Tabs defaultValue="opening">
                <TabsList className="flex h-auto w-full gap-2 bg-transparent p-0 sm:w-auto">
                    <TabsTrigger
                        value="opening"
                        className="cursor-pointer h-9 flex-1 gap-2 rounded-lg border bg-card px-4 text-sm font-medium shadow-none data-active:border-transparent data-active:bg-brand-yellow data-active:text-brand-ink sm:flex-none sm:px-5"
                    >
                        <ClipboardList className="size-4 shrink-0" />
                        Dar de alta
                    </TabsTrigger>
                    <TabsTrigger
                        value="closing"
                        className="cursor-pointer h-9 flex-1 gap-2 rounded-lg border bg-card px-4 text-sm font-medium shadow-none data-active:border-transparent data-active:bg-brand-yellow data-active:text-brand-ink sm:flex-none sm:px-5"
                    >
                        <ClipboardCheck className="size-4 shrink-0" />
                        Cerrar actividad
                    </TabsTrigger>
                </TabsList>

                <Separator className="data-horizontal:h-1 bg-yellow-400/30 rounded-full" />

                <TabsContent value="opening" className="mt-2 grid gap-1.5">
                    <Label htmlFor="project-opening-instructions">
                        Cómo dar de alta la actividad en Ágora
                    </Label>
                    <RichTextEditor
                        value={openingInstructions}
                        onChange={onOpeningChange}
                        contentClassName="max-h-100 min-h-100"
                        lockedHeadings
                    />
                </TabsContent>
                <TabsContent value="closing" className="mt-2 grid gap-1.5">
                    <Label htmlFor="project-closing-instructions">
                        Cómo cerrar la actividad en Ágora
                    </Label>
                    <RichTextEditor
                        value={closingInstructions}
                        onChange={onClosingChange}
                        contentClassName="max-h-100 min-h-100"
                        lockedHeadings
                    />
                </TabsContent>
            </Tabs>
        </CardContent>
    </Card>
);
