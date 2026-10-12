import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { BookOpen, ClipboardList } from 'lucide-react';

interface ProjectInfoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project: {
        name: string;
        description: string | null;
        guide: { name: string; url: string };
    };
}

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

            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="size-4 shrink-0 text-brand-green" />
                <span className="p-0 font-bold">Guía Ágora:</span>
                <a
                    href={project.guide.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                        buttonVariants({
                            variant: 'default',
                            size: 'xs',
                            className: 'bg-green-800',
                        }),
                    )}
                >
                    {project.guide.name}
                </a>
            </p>

            {project.description && (
                <div className="grid gap-1.5">
                    <h4 className="flex items-center gap-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                        <ClipboardList className="size-4 shrink-0 text-brand-green" />
                        Cómo dar de alta la actividad en Ágora
                    </h4>
                    <Card size="default">
                        <CardContent
                            className={cn(
                                'min-w-0 text-sm break-words',
                                '[&_p:empty]:min-h-[1em]',
                                '[&_h2]:text-lg [&_h2]:font-semibold',
                                '[&_h3]:text-base [&_h3]:font-semibold',
                                '[&_ul]:list-disc [&_ul]:pl-5',
                                '[&_ol]:list-decimal [&_ol]:pl-5',
                                '[&_a]:text-primary [&_a]:underline',
                                '[&_img]:my-2 [&_img]:h-auto [&_img]:max-w-full',
                            )}
                            dangerouslySetInnerHTML={{
                                __html: project.description,
                            }}
                        />
                    </Card>
                </div>
            )}
        </DialogContent>
    </Dialog>
);
