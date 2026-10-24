export type SmtpSender = 'gmail' | 'noreply';

const SENDER_BADGE: Record<SmtpSender, string> = {
    gmail: 'Gmail',
    noreply: 'noreply',
};

interface SenderBadgeProps {
    sender: SmtpSender;
}

export const SenderBadge = ({ sender }: SenderBadgeProps) => (
    <span
        className={
            sender === 'gmail'
                ? 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                : 'rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-300'
        }
    >
        {SENDER_BADGE[sender]}
    </span>
);
