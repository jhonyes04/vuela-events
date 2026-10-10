import { createCatalogStore } from '@/lib/createCatalogStore';
import { listProjects, type Project } from '@/features/projects/lib/projects';

export const useProjectsStore = createCatalogStore<Project>(listProjects);
