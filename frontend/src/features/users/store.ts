import { createCatalogStore } from '@/lib/createCatalogStore';
import { listRoles, type Role } from '@/features/users/lib/roles';

export const useRolesStore = createCatalogStore<Role>(listRoles);
