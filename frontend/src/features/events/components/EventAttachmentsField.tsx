import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconTooltip } from '@/components/IconTooltip';
import { Field } from '@/features/events/components/EventBasicFields';
import type { EventItem } from '@/features/events/lib/events';

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 1 * 1024 * 1024;
const ACCEPTED_ATTACHMENT_TYPES =
    'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.spreadsheet,application/vnd.oasis.opendocument.presentation';

type KeptAttachment = EventItem['attachments'][number];

interface EventAttachmentsFieldProps {
    fieldId: (name: string) => string;
    keptAttachments: KeptAttachment[];
    setKeptAttachments: (
        update: (prev: KeptAttachment[]) => KeptAttachment[],
    ) => void;
    attachmentFiles: File[];
    setAttachmentFiles: (update: (prev: File[]) => File[]) => void;
}

export const EventAttachmentsField = ({
    fieldId,
    keptAttachments,
    setKeptAttachments,
    attachmentFiles,
    setAttachmentFiles,
}: EventAttachmentsFieldProps) => {
    const items = [
        ...keptAttachments.map((attachment) => ({
            key: attachment.id,
            label: attachment.fileName,
            onRemove: () =>
                setKeptAttachments((prev) =>
                    prev.filter((a) => a.id !== attachment.id),
                ),
        })),
        ...attachmentFiles.map((file, index) => ({
            key: `${file.name}-${index}`,
            label: file.name,
            onRemove: () =>
                setAttachmentFiles((prev) =>
                    prev.filter((_, i) => i !== index),
                ),
        })),
    ];

    return (
        <Field
            id={fieldId('attachments')}
            label="Adjuntar documentos (opcional)"
        >
            {keptAttachments.length + attachmentFiles.length <
                MAX_ATTACHMENTS && (
                <Input
                    id={fieldId('attachments')}
                    type="file"
                    accept={ACCEPTED_ATTACHMENT_TYPES}
                    onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);

                        if (files.length === 0) return;

                        const oversized = files.filter(
                            (file) => file.size > MAX_ATTACHMENT_BYTES,
                        );

                        if (oversized.length > 0) {
                            toast.error(
                                'Cada documento debe pesar menos de 1MB',
                            );
                        }

                        const sizeValidFiles = files.filter(
                            (file) => file.size <= MAX_ATTACHMENT_BYTES,
                        );

                        const existingNames = new Set([
                            ...keptAttachments.map((a) => a.fileName),
                            ...attachmentFiles.map((f) => f.name),
                        ]);
                        const validFiles: File[] = [];
                        let hasDuplicate = false;

                        for (const file of sizeValidFiles) {
                            if (existingNames.has(file.name)) {
                                hasDuplicate = true;
                                continue;
                            }

                            existingNames.add(file.name);
                            validFiles.push(file);
                        }

                        if (hasDuplicate) {
                            toast.error('Ya hay un documento con ese nombre');
                        }

                        const room =
                            MAX_ATTACHMENTS -
                            keptAttachments.length -
                            attachmentFiles.length;

                        setAttachmentFiles((prev) => [
                            ...prev,
                            ...validFiles.slice(0, room),
                        ]);

                        e.target.value = '';
                    }}
                />
            )}

            {items.length > 0 && (
                <div className="flex flex-col gap-1 border rounded-xl p-2">
                    {items.map((item) => (
                        <span
                            key={item.key}
                            className="flex items-center justify-between bg-blue-300 text-xs border rounded-xl px-2 py-1"
                        >
                            {item.label}
                            <IconTooltip label="Quitar">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    aria-label={`Quitar ${item.label}`}
                                    onClick={item.onRemove}
                                >
                                    <X className="size-3.5" />
                                </Button>
                            </IconTooltip>
                        </span>
                    ))}
                </div>
            )}
        </Field>
    );
};
