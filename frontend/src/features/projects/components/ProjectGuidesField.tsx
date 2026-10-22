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
import { Label } from '@/components/ui/label';

interface ProjectGuidesFieldProps {
    guides: { id: string; name: string }[];
    guideIds: Set<string>;
    onChange: (guideIds: Set<string>) => void;
}

export const ProjectGuidesField = ({
    guides,
    guideIds,
    onChange,
}: ProjectGuidesFieldProps) => {
    const chipsAnchor = useComboboxAnchor();

    return (
        <div className="grid gap-1.5">
            <Label htmlFor="project-guides">Guías *</Label>
            <Combobox
                items={guides.map((guide) => ({
                    value: guide.id,
                    label: guide.name,
                }))}
                multiple
                value={[...guideIds]}
                onValueChange={(ids) => onChange(new Set(ids))}
            >
                <ComboboxChips ref={chipsAnchor} id="project-guides">
                    <ComboboxValue>
                        {(value: string[]) =>
                            value.map((id) => (
                                <ComboboxChip
                                    key={id}
                                    className="text-black bg-amber-200"
                                    removeClassName="hover:bg-transparent hover:text-black"
                                >
                                    {guides.find((guide) => guide.id === id)
                                        ?.name ?? id}
                                </ComboboxChip>
                            ))
                        }
                    </ComboboxValue>
                    <ComboboxChipsInput
                        placeholder={
                            guideIds.size === 0 ? 'Buscar una guía…' : undefined
                        }
                    />
                </ComboboxChips>
                <ComboboxContent anchor={chipsAnchor}>
                    <ComboboxEmpty>No se encontraron guías</ComboboxEmpty>
                    <ComboboxList>
                        {(item: { value: string; label: string }) => (
                            <ComboboxItem
                                key={item.value}
                                value={item.value}
                                className="cursor-pointer text-sm"
                            >
                                {item.label}
                            </ComboboxItem>
                        )}
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
        </div>
    );
};
