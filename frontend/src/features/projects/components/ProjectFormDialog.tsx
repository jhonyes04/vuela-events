import { useEffect, useState, type SubmitEvent } from 'react';
import { toast } from 'sonner';
import { FullScreenSpinner } from '@/components/FullScreenSpinner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { OwnerField } from '@/components/OwnerField';
import { useAuth } from '@/features/auth/hooks/context';
import { ApiError } from '@/lib/api';
import {
    createProject,
    updateProject,
    type Project,
} from '@/features/projects/lib/projects';
import { PROJECT_COLORS } from '@/features/projects/lib/colors';
import { useGuidesStore } from '@/features/guides/store';
import { useResourceLinksStore } from '@/features/resources/store';
import { useDocumentsStore } from '@/features/resources/documentsStore';
import { useAppSettingsStore } from '@/features/appSettings/store';
import { ProjectGuidesField } from './ProjectGuidesField';
import {
    ProjectResourcesField,
    type ProjectResourceItem,
} from './ProjectResourcesField';
import { ProjectColorField } from './ProjectColorField';
import { ProjectInstructionsTabs } from './ProjectInstructionsTabs';

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
    const { user } = useAuth();
    const canManageOwner = user?.permissions.includes('ownership:manage') ?? false;
    const openingSections = useAppSettingsStore(
        (s) => s.projectOpeningSections,
    );
    const closingSections = useAppSettingsStore(
        (s) => s.projectClosingSections,
    );
    const [name, setName] = useState(project?.name ?? '');
    const [openingInstructions, setOpeningInstructions] = useState(
        project?.openingInstructions || buildTemplateHtml(openingSections),
    );
    const [closingInstructions, setClosingInstructions] = useState(
        project?.closingInstructions || buildTemplateHtml(closingSections),
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
    const [ownerId, setOwnerId] = useState(
        project?.createdById ?? user?.id ?? '',
    );
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

    const resourceItems: ProjectResourceItem[] = [
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
                ...(canManageOwner && { ownerId: ownerId || undefined }),
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

                    <ProjectGuidesField
                        guides={activeGuides}
                        guideIds={guideIds}
                        onChange={setGuideIds}
                    />

                    <ProjectResourcesField
                        resourceItems={resourceItems}
                        resourceKeys={resourceKeys}
                        onChange={setResourceKeys}
                    />

                    <ProjectColorField color={color} onChange={setColor} />

                    <ProjectInstructionsTabs
                        openingInstructions={openingInstructions}
                        onOpeningChange={setOpeningInstructions}
                        closingInstructions={closingInstructions}
                        onClosingChange={setClosingInstructions}
                    />

                    {canManageOwner && (
                        <OwnerField
                            value={ownerId}
                            onValueChange={setOwnerId}
                            disabled={submitting}
                            currentOwner={project?.createdBy ?? null}
                        />
                    )}

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
}: ProjectFormDialogProps) => {
    const appSettingsLoaded = useAppSettingsStore((s) => s.loaded);
    const loadAppSettings = useAppSettingsStore((s) => s.load);

    useEffect(() => {
        if (open) void loadAppSettings();
    }, [open, loadAppSettings]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {open && !appSettingsLoaded && (
                <FullScreenSpinner label="Cargando…" />
            )}
            {open && appSettingsLoaded && (
                <ProjectFormBody
                    key={project?.id ?? 'new'}
                    project={project}
                    onSaved={onSaved}
                    onClose={() => onOpenChange(false)}
                />
            )}
        </Dialog>
    );
};
