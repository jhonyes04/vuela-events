import { cn } from 'cn';
import type { User } from '@/lib/api';

interface UserAvatarProps {
    user: User;
    className?: string;
}

export const UserAvatar = ({ user, className }: UserAvatarProps) =>
    user.avatarConfigured ? (
        <img
            src={`/api/profile/avatar-image?u=${user.id}`}
            alt=""
            className={cn(
                'size-9 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm',
                className,
            )}
        />
    ) : (
        <span
            className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-ink text-sm font-semibold text-white ring-2 ring-white shadow-sm',
                className,
            )}
        >
            {user.name[0]}
            {user.lastName[0]}
        </span>
    );
