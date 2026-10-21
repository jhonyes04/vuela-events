import { useState } from 'react';
import { toast } from 'sonner';
import {
    ChevronDown,
    ChevronUp,
    ClipboardCheck,
    ClipboardList,
    Plus,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError } from '@/lib/api';
import { setProjectSections as saveProjectSections } from '@/features/appSettings/lib/appSettings';
import { useAppSettingsStore } from '@/features/appSettings/store';

interface SectionListProps {
    sections: string[];
    onChange: (sections: string[]) => void;
}

const SectionList = ({ sections, onChange }: SectionListProps) => {
    const move = (index: number, dir: -1 | 1) => {
        const next = [...sections];
        const target = index + dir;

        if (target < 0 || target >= next.length) return;

        [next[index], next[target]] = [next[target], next[index]];

        onChange(next);
    };

    return (
        <div className="grid gap-2">
            <div className="grid gap-2">
                {sections.map((section, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                        <Input
                            value={section}
                            onChange={(e) => {
                                const next = [...sections];

                                next[index] = e.target.value;
                                onChange(next);
                            }}
                        />

                        <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Subir"
                            disabled={index === 0}
                            onClick={() => move(index, -1)}
                        >
                            <ChevronUp className="size-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Bajar"
                            disabled={index === sections.length - 1}
                            onClick={() => move(index, 1)}
                        >
                            <ChevronDown className="size-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            aria-label="Quitar"
                            disabled={sections.length <= 1}
                            onClick={() =>
                                onChange(sections.filter((_, i) => i !== index))
                            }
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                ))}
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-self-start"
                onClick={() => onChange([...sections, ''])}
            >
                <Plus className="size-4" />
            </Button>
        </div>
    );
};

// Encabezados fijos de la plantilla de ProjectFormDialog (nodo lockedHeading en RichTextEditor): se editan aquí, no en el editor.
export const ProjectSectionsCard = () => {
    const storeOpening = useAppSettingsStore((s) => s.projectOpeningSections);
    const storeClosing = useAppSettingsStore((s) => s.projectClosingSections);
    const applySections = useAppSettingsStore((s) => s.setProjectSections);
    const [opening, setOpening] = useState(storeOpening);
    const [closing, setClosing] = useState(storeClosing);
    const [prevStoreOpening, setPrevStoreOpening] = useState(storeOpening);
    const [prevStoreClosing, setPrevStoreClosing] = useState(storeClosing);
    const [saving, setSaving] = useState(false);

    // Ajusta el estado local durante el render cuando cambia el store (tras
    // load()), en vez de useEffect: evita el render en cascada.
    if (storeOpening !== prevStoreOpening) {
        setPrevStoreOpening(storeOpening);
        setOpening(storeOpening);
    }

    if (storeClosing !== prevStoreClosing) {
        setPrevStoreClosing(storeClosing);
        setClosing(storeClosing);
    }

    const handleSave = async () => {
        const cleanedOpening = opening.map((s) => s.trim()).filter(Boolean);
        const cleanedClosing = closing.map((s) => s.trim()).filter(Boolean);

        if (cleanedOpening.length === 0 || cleanedClosing.length === 0) {
            toast.error('Cada lista necesita al menos un apartado');
            return;
        }

        setSaving(true);

        try {
            const saved = await saveProjectSections(
                cleanedOpening,
                cleanedClosing,
            );

            applySections(
                saved.projectOpeningSections,
                saved.projectClosingSections,
            );
            toast.success('Apartados guardados.');
        } catch (e) {
            toast.error(
                e instanceof ApiError ? e.message : 'No se pudo guardar',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid gap-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="grid gap-1">
                <h2 className="text-sm font-medium">
                    Apartados de la plantilla de proyectos
                </h2>
                <p className="text-sm text-muted-foreground">
                    Encabezados fijos al crear un proyecto, en "Dar de alta" y
                    "Cerrar actividad". No se pueden borrar desde el editor,
                    solo cambiar aquí.
                </p>
            </div>

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
                    <SectionList sections={opening} onChange={setOpening} />
                </TabsContent>
                <TabsContent value="closing" className="mt-2 grid gap-1.5">
                    <SectionList sections={closing} onChange={setClosing} />
                </TabsContent>
            </Tabs>

            <div className="flex justify-end">
                <Button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave()}
                >
                    {saving ? 'Guardando…' : 'Guardar'}
                </Button>
            </div>
        </div>
    );
};
