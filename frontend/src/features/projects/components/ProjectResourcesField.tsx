import { FileText, Link2 } from 'lucide-react';
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

export interface ProjectResourceItem {
    value: string;
    label: string;
    kind: 'link' | 'document';
}

interface ProjectResourcesFieldProps {
    resourceItems: ProjectResourceItem[];
    resourceKeys: Set<string>;
    onChange: (resourceKeys: Set<string>) => void;
}

export const ProjectResourcesField = ({
    resourceItems,
    resourceKeys,
    onChange,
}: ProjectResourcesFieldProps) => {
    const resourceChipsAnchor = useComboboxAnchor();

    return (
        <div className="grid gap-1.5">
            <Label htmlFor="project-resources">Recursos</Label>
            <Combobox
                items={resourceItems}
                multiple
                value={[...resourceKeys]}
                onValueChange={(keys) => onChange(new Set(keys))}
            >
                <ComboboxChips ref={resourceChipsAnchor} id="project-resources">
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
                                                item?.kind === 'document'
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
                    <ComboboxEmpty>No se encontraron recursos</ComboboxEmpty>
                    <ComboboxList>
                        {(item: ProjectResourceItem) => {
                            const Icon =
                                item.kind === 'document' ? FileText : Link2;

                            return (
                                <ComboboxItem
                                    key={item.value}
                                    value={item.value}
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
    );
};
