import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    BookOpen,
    ClipboardCheck,
    ClipboardList,
    Link2,
    FolderOpen,
    Download,
} from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { downloadDocument } from '@/features/resources/lib/documents';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';

interface ProjectInfoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project: {
        name: string;
        openingInstructions: string | null;
        closingInstructions: string | null;
        guides: { name: string; url: string }[];
        resourceLinks: { id: string; title: string; url: string }[];
        documents: { id: string; title: string }[];
    };
}

const instructionsContentClassName = cn(
    'min-w-0 text-sm break-words',
    '[&_p:empty]:min-h-[1em]',
    '[&_h2]:text-lg [&_h2]:font-semibold',
    '[&_h3]:text-base [&_h3]:font-semibold',
    '[&_ul]:list-disc [&_ul]:pl-5',
    '[&_ol]:list-decimal [&_ol]:pl-5',
    '[&_a]:text-primary [&_a]:underline',
    '[&_img]:my-2 [&_img]:h-auto [&_img]:max-w-full',
);

export const ProjectInfoDialog = ({
    open,
    onOpenChange,
    project,
}: ProjectInfoDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>{project.name}</DialogTitle>
                <DialogDescription>Información del proyecto</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
                <fieldset className="grid grid-cols-1 items-start gap-x-3 gap-y-2 rounded-xl border p-3 text-sm text-muted-foreground sm:grid-cols-[auto_1fr]">
                    <legend className="flex items-center gap-1.5 whitespace-nowrap px-1 font-bold">
                        <BookOpen className="size-4 shrink-0 text-brand-green" />
                        Guías Ágora:
                    </legend>
                    <div className="flex flex-wrap items-center gap-2">
                        {project.guides.map((guide) => (
                            <a
                                key={guide.url}
                                href={guide.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                    buttonVariants({
                                        variant: 'default',
                                        size: 'xs',
                                        className:
                                            'bg-amber-200 text-black hover:bg-amber-300',
                                    }),
                                )}
                            >
                                {guide.name}
                            </a>
                        ))}
                    </div>
                </fieldset>

                {(project.resourceLinks.length > 0 ||
                    project.documents.length > 0) && (
                    <fieldset className="grid grid-cols-1 items-start gap-x-3 gap-y-2 rounded-xl border p-3 text-sm text-muted-foreground sm:grid-cols-[auto_1fr]">
                        <legend className="flex items-center gap-1.5 whitespace-nowrap px-1 font-bold">
                            <FolderOpen className="size-4 shrink-0 text-brand-green" />
                            Recursos:
                        </legend>
                        <div className="flex flex-wrap items-center gap-2">
                            {project.resourceLinks.map((resource) => (
                                <a
                                    key={resource.id}
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                        buttonVariants({
                                            variant: 'default',
                                            size: 'xs',
                                            className:
                                                'gap-1 bg-green-300 text-black hover:bg-green-400',
                                        }),
                                    )}
                                >
                                    <Link2 className="size-3.5 text-green-600" />
                                    {resource.title}
                                </a>
                            ))}

                            {project.documents.map((document) => (
                                <Button
                                    key={document.id}
                                    type="button"
                                    variant="default"
                                    size="xs"
                                    className="gap-1 bg-blue-300 text-black hover:bg-blue-400"
                                    onClick={() => {
                                        void downloadDocument(
                                            document.id,
                                            document.title,
                                        );
                                    }}
                                >
                                    <Download className="size-3.5 text-blue-600" />
                                    {document.title}
                                </Button>
                            ))}
                        </div>
                    </fieldset>
                )}
            </div>
            <Card>
                <CardContent>
                    {(project.openingInstructions ||
                        project.closingInstructions) && (
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

                            <TabsContent
                                value="opening"
                                className="mt-2 grid gap-1.5"
                            >
                                <span className="font-bold">
                                    Cómo dar de alta la actividad en Ágora
                                </span>
                                {project.openingInstructions && (
                                    <Card
                                        size="default"
                                        className="max-h-100 min-h-100 overflow-hidden"
                                    >
                                        <OverlayScrollbarsComponent
                                            className="h-full"
                                            options={scrollbarOptions}
                                            defer
                                        >
                                            <CardContent
                                                className={
                                                    instructionsContentClassName
                                                }
                                                dangerouslySetInnerHTML={{
                                                    __html: project.openingInstructions,
                                                }}
                                            />
                                        </OverlayScrollbarsComponent>
                                    </Card>
                                )}
                            </TabsContent>
                            <TabsContent
                                value="closing"
                                className="mt-2 grid gap-1.5"
                            >
                                <span className="font-bold">
                                    Cómo cerrar la actividad en Ágora
                                </span>
                                {project.closingInstructions && (
                                    <Card
                                        size="default"
                                        className="max-h-100 min-h-100 overflow-hidden"
                                    >
                                        <OverlayScrollbarsComponent
                                            className="h-full"
                                            options={scrollbarOptions}
                                            defer
                                        >
                                            <CardContent
                                                className={
                                                    instructionsContentClassName
                                                }
                                                dangerouslySetInnerHTML={{
                                                    __html: project.closingInstructions,
                                                }}
                                            />
                                        </OverlayScrollbarsComponent>
                                    </Card>
                                )}
                            </TabsContent>
                        </Tabs>
                    )}
                </CardContent>
            </Card>
        </DialogContent>
    </Dialog>
);
