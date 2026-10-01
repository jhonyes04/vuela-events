import { createCatalogStore } from '@/lib/createCatalogStore';
import { listGuides, type Guide } from '@/features/guides/lib/guides';

export const useGuidesStore = createCatalogStore<Guide>(listGuides);
