import { createCatalogStore } from '@/lib/createCatalogStore';
import {
    listMaterials,
    type Material,
} from '@/features/materials/lib/materials';

export const useMaterialsStore = createCatalogStore<Material>(listMaterials);
