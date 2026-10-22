import { ComboboxField } from '@/components/ComboboxField';
import { Label } from '@/components/ui/label';
import type {
    SlotId,
    TemplateAssignment,
} from '@/features/emailSettings/lib/emailSettings';
import { SenderBadge, type SmtpSender } from './SenderBadge';

interface TemplateOption {
    id: string;
    name: string;
}

interface TemplateAssignmentCardProps {
    title: string;
    description: string;
    sender: SmtpSender;
    assignments: TemplateAssignment[];
    slotLabels: Record<SlotId, string>;
    activeTemplates: TemplateOption[];
    savingSlot: SlotId | null;
    onAssignmentChange: (slot: SlotId, templateId: string) => void;
}

export const TemplateAssignmentCard = ({
    title,
    description,
    sender,
    assignments,
    slotLabels,
    activeTemplates,
    savingSlot,
    onAssignmentChange,
}: TemplateAssignmentCardProps) => (
    <div className="rounded-xl border bg-card p-4">
        <div className="mb-1 flex items-center gap-2">
            <h2 className="font-medium">{title}</h2>
            <SenderBadge sender={sender} />
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{description}</p>

        <div className="grid gap-4">
            {assignments.map(({ slot, templateId }) => (
                <div key={slot} className="grid gap-1.5">
                    <Label htmlFor={`slot-${slot}`}>{slotLabels[slot]}</Label>
                    <ComboboxField
                        id={`slot-${slot}`}
                        className="w-full"
                        disabled={savingSlot === slot}
                        items={
                            [
                                { id: '', name: 'Sin asignar' },
                                ...activeTemplates,
                            ] satisfies TemplateOption[]
                        }
                        getValue={(t) => t.id}
                        getLabel={(t) => t.name}
                        value={templateId ?? ''}
                        onValueChange={(v) => onAssignmentChange(slot, v)}
                        placeholder="Sin asignar"
                    />
                </div>
            ))}
        </div>
    </div>
);
