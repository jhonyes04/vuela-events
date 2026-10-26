import { api } from '@/lib/api';

export interface OwnerCandidate {
    id: string;
    name: string;
    puntoVuela: string | null;
}

export const listOwnerCandidates = async (): Promise<OwnerCandidate[]> => {
    const { users } = await api.get<{ users: OwnerCandidate[] }>(
        '/users/owner-candidates',
    );

    return users;
};
