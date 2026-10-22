import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadEventAttachment, type EventItem } from '@/features/events/lib/events';

interface EventAttachmentsSectionProps {
    eventId: string;
    attachments: EventItem['attachments'];
}

export const EventAttachmentsSection = ({
    eventId,
    attachments,
}: EventAttachmentsSectionProps) => {
    if (attachments.length === 0) return null;

    return (
        <fieldset className="grid grid-cols-1 items-start gap-x-3 gap-y-2 rounded-xl border p-3 text-sm text-muted-foreground sm:grid-cols-[auto_1fr]">
            <legend className="flex items-center gap-1.5 whitespace-nowrap px-1 font-bold">
                <Download className="size-4 shrink-0 text-brand-green" />
                Documentos
            </legend>

            <div className="flex flex-wrap items-center gap-2">
                {attachments.map((attachment) => (
                    <Button
                        key={attachment.id}
                        type="button"
                        variant="default"
                        size="xs"
                        className="gap-1 bg-blue-300 text-black hover:bg-blue-400"
                        onClick={() => {
                            void downloadEventAttachment(
                                eventId,
                                attachment.id,
                                attachment.fileName,
                            );
                        }}
                    >
                        <Download className="size-3.5 text-blue-600" />
                        {attachment.fileName}
                    </Button>
                ))}
            </div>
        </fieldset>
    );
};
