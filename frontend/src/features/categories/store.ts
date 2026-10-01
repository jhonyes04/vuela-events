import { createCatalogStore } from '@/lib/createCatalogStore';
import { listCategories, type Category } from '@/features/categories/lib/categories';

export const useCategoriesStore = createCatalogStore<Category>(listCategories);
