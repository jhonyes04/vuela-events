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
import { Field } from '@/features/events/components/EventBasicFields';

interface EventMaterialsFieldProps {
    fieldId: (name: string) => string;
    activeMaterials: { id: string; name: string }[];
    materialIds: string[];
    onChange: (materialIds: string[]) => void;
}

export const EventMaterialsField = ({
    fieldId,
    activeMaterials,
    materialIds,
    onChange,
}: EventMaterialsFieldProps) => {
    const materialsChipsAnchor = useComboboxAnchor();

    return (
        <Field id={fieldId('materials')} label="Materiales (opcional)">
            <Combobox
                items={activeMaterials.map((material) => ({
                    value: material.id,
                    label: material.name,
                }))}
                multiple
                value={materialIds}
                onValueChange={onChange}
            >
                <ComboboxChips
                    ref={materialsChipsAnchor}
                    id={fieldId('materials')}
                >
                    <ComboboxValue>
                        {(value: string[]) =>
                            value.map((id) => (
                                <ComboboxChip
                                    key={id}
                                    className="bg-orange-300"
                                    removeClassName="hover:bg-transparent hover:text-black"
                                >
                                    {activeMaterials.find(
                                        (material) => material.id === id,
                                    )?.name ?? id}
                                </ComboboxChip>
                            ))
                        }
                    </ComboboxValue>
                    <ComboboxChipsInput
                        placeholder={
                            materialIds.length === 0
                                ? 'Buscar un material…'
                                : undefined
                        }
                    />
                </ComboboxChips>
                <ComboboxContent anchor={materialsChipsAnchor}>
                    <ComboboxEmpty>No se encontraron materiales</ComboboxEmpty>
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
        </Field>
    );
};
