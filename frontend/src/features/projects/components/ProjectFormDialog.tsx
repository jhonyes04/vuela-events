import { useEffect, useState, type SubmitEvent } from 'react';
import { toast } from 'sonner';
import { ClipboardCheck, ClipboardList, FileText, Link2 } from 'lucide-react';
import { RichTextEditor } from '@/components/RichTextEditor';
import { FullScreenSpinner } from '@/components/FullScreenSpinner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
    ComboboxValue,
    useComboboxAnchor,
} from '@/components/ui/combobox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
    createProject,
    updateProject,
    type Project,
} from '@/features/projects/lib/projects';
import {
    PROJECT_COLORS,
    PROJECT_COLOR_STYLES,
    isCustomProjectColor,
} from '@/features/projects/lib/colors';
import { ColorPicker } from '@/components/ColorPicker';
import { useGuidesStore } from '@/features/guides/store';
import { useResourceLinksStore } from '@/features/resources/store';
import { useDocumentsStore } from '@/features/resources/documentsStore';
import { useAppSettingsStore } from '@/features/appSettings/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

const EMPTY_EDITOR_HTML = '<p></p>';

const boldSection = (text: string) =>
    `<p data-locked-heading="true"><strong>${text}</strong></p>`;

const buildTemplateHtml = (sections: string[]) =>
    sections.map((section) => `${boldSection(section)}<p></p>`).join('');

interface ProjectFormBodyProps {
    project: Project | null;
    onSaved: (project: Project) => void;
    onClose: () => void;
}

// Con su propio estado: el padre la remonta (key) cada vez que abre el diálogo.
const ProjectFormBody = ({
    project,
    onSaved,
    onClose,
}: ProjectFormBodyProps) => {
    const chipsAnchor = useComboboxAnchor();
    const resourceChipsAnchor = useComboboxAnchor();
    const openingSections = useAppSettingsStore(
        (s) => s.projectOpeningSections,
    );
    const closingSections = useAppSettingsStore(
        (s) => s.projectClosingSections,
    );
    const loadAppSettings = useAppSettingsStore((s) => s.load);
    const [name, setName] = useState(project?.name ?? '');
    const [openingInstructions, setOpeningInstructions] = useState(
        project?.openingInstructions ??
            (project ? EMPTY_EDITOR_HTML : buildTemplateHtml(openingSections)),
    );
    const [closingInstructions, setClosingInstructions] = useState(
        project?.closingInstructions ??
            (project ? EMPTY_EDITOR_HTML : buildTemplateHtml(closingSections)),
    );
    const [color, setColor] = useState<string>(
        project?.color ?? PROJECT_COLORS[0],
    );
    const [guideIds, setGuideIds] = useState<Set<string>>(
        new Set(project?.guides.map((guide) => guide.id) ?? []),
    );
    const [resourceKeys, setResourceKeys] = useState<Set<string>>(
        new Set([
            ...(project?.resourceLinks.map(
                (resource) => `link:${resource.id}`,
            ) ?? []),
            ...(project?.documents.map(
                (document) => `document:${document.id}`,
            ) ?? []),
        ]),
    );
    const [active, setActive] = useState(project?.active ?? true);
    const [submitting, setSubmitting] = useState(false);

    const guides = useGuidesStore((s) => s.items);
    const loadGuides = useGuidesStore((s) => s.load);
    const resourceLinks = useResourceLinksStore((s) => s.items);
    const loadResourceLinks = useResourceLinksStore((s) => s.load);
    const documents = useDocumentsStore((s) => s.items);
    const loadDocuments = useDocumentsStore((s) => s.load);

    useEffect(() => {
        void loadGuides();
    }, [loadGuides]);

    useEffect(() => {
        void loadResourceLinks();
    }, [loadResourceLinks]);

    useEffect(() => {
        void loadDocuments();
    }, [loadDocuments]);

    useEffect(() => {
        void loadAppSettings();
    }, [loadAppSettings]);

    // La guía actual del proyecto sigue disponible aunque se haya
    // desactivado después de asignarla.
    const activeGuides = guides.filter(
        (guide) => guide.active || guideIds.has(guide.id),
    );

    const activeResourceLinks = resourceLinks.filter(
        (resource) =>
            resource.active || resourceKeys.has(`link:${resource.id}`),
    );

    const activeDocuments = documents.filter(
        (document) =>
            document.active || resourceKeys.has(`document:${document.id}`),
    );

    const resourceItems = [
        ...activeResourceLinks.map((resource) => ({
            value: `link:${resource.id}`,
            label: resource.title,
            kind: 'link' as const,
        })),
        ...activeDocuments.map((document) => ({
            value: `document:${document.id}`,
            label: document.title,
            kind: 'document' as const,
        })),
    ];

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();

        if (guideIds.size === 0) {
            toast.error('Selecciona al menos una guía');
            return;
        }

        setSubmitting(true);

        try {
            const resourceLinkIds = [...resourceKeys]
                .filter((key) => key.startsWith('link:'))
                .map((key) => key.slice('link:'.length));
            const documentIds = [...resourceKeys]
                .filter((key) => key.startsWith('document:'))
                .map((key) => key.slice('document:'.length));

            const payload = {
                name,
                openingInstructions:
                    openingInstructions === EMPTY_EDITOR_HTML
                        ? null
                        : openingInstructions,
                closingInstructions:
                    closingInstructions === EMPTY_EDITOR_HTML
                        ? null
                        : closingInstructions,
                color,
                guideIds: [...guideIds],
                resourceLinkIds,
                documentIds,
            };

            const saved = project
                ? await updateProject(project.id, { ...payload, active })
                : await createProject(payload);

            toast.success(
                project ? 'Proyecto actualizado.' : 'Proyecto creado.',
            );
            onSaved(saved);
            onClose();
        } catch (err) {
            toast.error(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo guardar el proyecto',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>
                        {project ? 'Editar proyecto' : 'Nuevo proyecto'}
                    </DialogTitle>
                    <DialogDescription>
                        El color se usa para diferenciarlo en el calendario.
                    </DialogDescription>
                </DialogHeader>

                <form
                    id="project-form"
                    onSubmit={(e) => void handleSubmit(e)}
                    className="grid gap-4"
                >
                    <div className="grid gap-1.5">
                        <Label htmlFor="project-name">Nombre *</Label>
                        <Input
                            id="project-name"
                            required
                            minLength={2}
                            maxLength={80}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="project-guides">Guías *</Label>
                        <Combobox
                            items={activeGuides.map((guide) => ({
                                value: guide.id,
                                label: guide.name,
                            }))}
                            multiple
                            value={[...guideIds]}
                            onValueChange={(ids) => setGuideIds(new Set(ids))}
                        >
                            <ComboboxChips
                                ref={chipsAnchor}
                                id="project-guides"
                            >
                                <ComboboxValue>
                                    {(value: string[]) =>
                                        value.map((id) => (
                                            <ComboboxChip
                                                key={id}
                                                className="text-black bg-amber-200"
                                                removeClassName="hover:bg-transparent hover:text-black"
                                            >
                                                {activeGuides.find(
                                                    (guide) => guide.id === id,
                                                )?.name ?? id}
                                            </ComboboxChip>
                                        ))
                                    }
                                </ComboboxValue>
                                <ComboboxChipsInput
                                    placeholder={
                                        guideIds.size === 0
                                            ? 'Buscar una guía…'
                                            : undefined
                                    }
                                />
                            </ComboboxChips>
                            <ComboboxContent anchor={chipsAnchor}>
                                <ComboboxEmpty>
                                    No se encontraron guías
                                </ComboboxEmpty>
                                <ComboboxList>
                                    {(item: {
                                        value: string;
                                        label: string;
                                    }) => (
                                        <ComboboxItem
                                            key={item.value}
                                            value={item.value}
                                            // disabled={guideIds.has(item.value)}
                                            className="cursor-pointer text-sm"
                                        >
                                            {item.label}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="project-resources">Recursos</Label>
                        <Combobox
                            items={resourceItems}
                            multiple
                            value={[...resourceKeys]}
                            onValueChange={(keys) =>
                                setResourceKeys(new Set(keys))
                            }
                        >
                            <ComboboxChips
                                ref={resourceChipsAnchor}
                                id="project-resources"
                            >
                                <ComboboxValue>
                                    {(value: string[]) =>
                                        value.map((key) => {
                                            const item = resourceItems.find(
                                                (i) => i.value === key,
                                            );
                                            const Icon =
                                                item?.kind === 'document'
                                                    ? FileText
                                                    : Link2;

                                            return (
                                                <ComboboxChip
                                                    key={key}
                                                    className={`gap-1 ${item?.kind === 'document' ? 'bg-blue-300' : 'bg-green-300'}`}
                                                    removeClassName="hover:bg-transparent hover:text-black"
                                                >
                                                    <Icon
                                                        className={
                                                            item?.kind ===
                                                            'document'
                                                                ? 'size-3.5 text-blue-600'
                                                                : 'size-3.5 text-green-600'
                                                        }
                                                    />
                                                    {item?.label ?? key}
                                                </ComboboxChip>
                                            );
                                        })
                                    }
                                </ComboboxValue>
                                <ComboboxChipsInput
                                    placeholder={
                                        resourceKeys.size === 0
                                            ? 'Buscar un recurso…'
                                            : undefined
                                    }
                                />
                            </ComboboxChips>
                            <ComboboxContent anchor={resourceChipsAnchor}>
                                <ComboboxEmpty>
                                    No se encontraron recursos
                                </ComboboxEmpty>
                                <ComboboxList>
                                    {(item: {
                                        value: string;
                                        label: string;
                                        kind: 'link' | 'document';
                                    }) => {
                                        const Icon =
                                            item.kind === 'document'
                                                ? FileText
                                                : Link2;

                                        return (
                                            <ComboboxItem
                                                key={item.value}
                                                value={item.value}
                                                // disabled={resourceKeys.has(
                                                //     item.value,
                                                // )}
                                                className={`cursor-pointer gap-1.5 text-sm border ${item.kind === 'document' ? 'bg-blue-300' : 'bg-green-300'}`}
                                            >
                                                <Icon
                                                    className={
                                                        item.kind === 'document'
                                                            ? 'size-3.5 text-blue-900'
                                                            : 'size-3.5 text-green-900'
                                                    }
                                                />
                                                {item.label}
                                            </ComboboxItem>
                                        );
                                    }}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>

                    <fieldset className="grid gap-1.5">
                        <legend className="mb-1.5 text-sm font-medium">
                            Color
                        </legend>
                        <div className="flex flex-wrap items-center border rounded-xl p-3 gap-2">
                            {PROJECT_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    aria-label={PROJECT_COLOR_STYLES[c].label}
                                    aria-pressed={color === c}
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        'cursor-pointer size-8 rounded-full ring-offset-2 ring-offset-background',
                                        PROJECT_COLOR_STYLES[c].swatch,
                                        color === c
                                            ? 'ring-2 ring-ring'
                                            : 'hover:ring-2 hover:ring-border',
                                    )}
                                />
                            ))}
                            <ColorPicker
                                aria-label="Color personalizado"
                                value={
                                    isCustomProjectColor(color)
                                        ? color
                                        : '#999999'
                                }
                                onChange={setColor}
                                className={cn(
                                    'rounded-lg ring-offset-2 ring-offset-background',
                                    isCustomProjectColor(color)
                                        ? 'ring-2 ring-ring'
                                        : 'hover:ring-2 hover:ring-border',
                                )}
                            />
                        </div>
                    </fieldset>

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

                                <TabsContent
                                    value="opening"
                                    className="mt-2 grid gap-1.5"
                                >
                                    <Label htmlFor="project-opening-instructions">
                                        Cómo dar de alta la actividad en Ágora
                                    </Label>
                                    <RichTextEditor
                                        value={openingInstructions}
                                        onChange={setOpeningInstructions}
                                        contentClassName="max-h-100 min-h-100"
                                        lockedHeadings
                                    />
                                </TabsContent>
                                <TabsContent
                                    value="closing"
                                    className="mt-2 grid gap-1.5"
                                >
                                    <Label htmlFor="project-closing-instructions">
                                        Cómo cerrar la actividad en Ágora
                                    </Label>
                                    <RichTextEditor
                                        value={closingInstructions}
                                        onChange={setClosingInstructions}
                                        contentClassName="max-h-100 min-h-100"
                                        lockedHeadings
                                    />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {project && (
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={active}
                                disabled={submitting}
                                onCheckedChange={setActive}
                            />
                            {active ? 'Activo' : 'Desactivado'}
                        </label>
                    )}
                </form>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="project-form"
                        disabled={submitting}
                    >
                        {submitting ? 'Guardando…' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>

            {submitting && <FullScreenSpinner label="Guardando proyecto…" />}
        </>
    );
};

interface ProjectFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = crear, proyecto = editar.
    project: Project | null;
    onSaved: (project: Project) => void;
}

export const ProjectFormDialog = ({
    open,
    onOpenChange,
    project,
    onSaved,
}: ProjectFormDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        {open && (
            <ProjectFormBody
                key={project?.id ?? 'new'}
                project={project}
                onSaved={onSaved}
                onClose={() => onOpenChange(false)}
            />
        )}
    </Dialog>
);
