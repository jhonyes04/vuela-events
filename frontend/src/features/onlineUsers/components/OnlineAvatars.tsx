import { IconTooltip } from '@/components/IconTooltip';
import {
    Avatar,
    AvatarFallback,
    AvatarGroup,
    AvatarGroupCount,
    AvatarImage,
} from '@/components/ui/avatar';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card';
import { config } from '@/config';
import { useAuth } from '@/features/auth/hooks/context';
import { useOnlineUsers } from '@/features/onlineUsers/hooks/useOnlineUsers';
import type { OnlineUser } from '@/features/onlineUsers/lib/onlineUsers';

const MAX_VISIBLE = 4;

const UserAvatarImage = ({ user }: { user: OnlineUser }) => (
    <>
        {user.avatarConfigured && (
            <AvatarImage
                src={`${config.apiBase}/profile/avatar-image?u=${user.userId}`}
                alt={`${user.name} ${user.lastName}`}
            />
        )}
        <AvatarFallback>
            {user.name[0]}
            {user.lastName[0]}
        </AvatarFallback>
    </>
);

export const OnlineAvatars = () => {
    const { user: currentUser } = useAuth();
    const others = useOnlineUsers().filter(
        (user) => user.userId !== currentUser?.id,
    );
    // const others = useOnlineUsers();

    if (others.length === 0) return null;

    const visible = others.slice(0, MAX_VISIBLE);
    const extra = others.length - visible.length;

    return (
        <AvatarGroup className="bg-yellow-200 border border-yellow-400 rounded-full p-2">
            {visible.map((user) => (
                <IconTooltip
                    key={user.userId}
                    label={`${user.puntoVuela} (${user.name})`}
                >
                    <Avatar size="sm" className="cursor-pointer">
                        <UserAvatarImage user={user} />
                    </Avatar>
                </IconTooltip>
            ))}
            {extra > 0 && (
                <HoverCard>
                    <HoverCardTrigger
                        className="cursor-pointer"
                        render={<AvatarGroupCount>+{extra}</AvatarGroupCount>}
                    />
                    <HoverCardContent className="w-auto bg-yellow-200 border-yellow-400 rounded-full">
                        <ul className="flex flex-col gap-1 text-sm">
                            {others.slice(MAX_VISIBLE).map((user) => (
                                <li
                                    key={user.userId}
                                    className="flex items-center gap-2"
                                >
                                    <IconTooltip
                                        label={`${user.puntoVuela} (${user.name})`}
                                    >
                                        <Avatar
                                            size="sm"
                                            className="cursor-pointer"
                                        >
                                            <UserAvatarImage user={user} />
                                        </Avatar>
                                    </IconTooltip>
                                </li>
                            ))}
                        </ul>
                    </HoverCardContent>
                </HoverCard>
            )}
        </AvatarGroup>
    );
};
