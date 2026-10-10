import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ProjectPreferencesSection } from '@/features/profile/components/ProjectPreferencesSection';

export interface ProjectsUser {
    id: string;
    name: string;
    lastName: string;
    email: string;
}

interface EditUserProjectsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = nada que editar (el diálogo no se muestra).
    user: ProjectsUser | null;
}

export const EditUserProjectsDialog = ({
    open,
    onOpenChange,
    user,
}: EditUserProjectsDialogProps) => {
    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent key={user.id} className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        Proyectos de {user.name} {user.lastName}
                    </DialogTitle>
                    <DialogDescription>{user.email}</DialogDescription>
                </DialogHeader>

                <ProjectPreferencesSection userId={user.id} />
            </DialogContent>
        </Dialog>
    );
};
