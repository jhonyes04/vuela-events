import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { CategoryPreferencesSection } from '@/features/profile/components/CategoryPreferencesSection';

export interface CategoriesUser {
    id: string;
    name: string;
    lastName: string;
    email: string;
}

interface EditUserCategoriesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = nada que editar (el diálogo no se muestra).
    user: CategoriesUser | null;
}

export const EditUserCategoriesDialog = ({
    open,
    onOpenChange,
    user,
}: EditUserCategoriesDialogProps) => {
    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent key={user.id}>
                <DialogHeader>
                    <DialogTitle>
                        Categorías de {user.name} {user.lastName}
                    </DialogTitle>
                    <DialogDescription>{user.email}</DialogDescription>
                </DialogHeader>

                <CategoryPreferencesSection userId={user.id} />
            </DialogContent>
        </Dialog>
    );
};
