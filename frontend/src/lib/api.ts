export interface User {
    id: string;
    email: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
    profileCompleted: boolean;
    roleId: string;
    roleName: string;
    permissions: string[];
    smtpAppPasswordConfigured: boolean;
    signatureConfigured: boolean;
    avatarConfigured: boolean;
}

export class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

// Lo registra la capa de sesión: se llama ante cualquier 401.
let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
    unauthorizedHandler = handler;
};

const errorMessageFrom = (data: unknown): string => {
    if (
        typeof data === 'object' &&
        data !== null &&
        'error' in data &&
        typeof data.error === 'string'
    ) {
        return data.error;
    }

    return 'Error inesperado del servidor';
};

const request = async <T>(
    method: Method,
    path: string,
    body?: unknown,
): Promise<T> => {
    let res: Response;

    try {
        res = await fetch(`/api${path}`, {
            method,
            headers:
                body === undefined
                    ? undefined
                    : { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
            credentials: 'same-origin',
            signal: AbortSignal.timeout(15_000),
        });
    } catch {
        throw new ApiError(0, 'No se pudo conectar con el servidor');
    }

    if (res.status === 204) {
        return undefined as T;
    }

    // Si el cuerpo no es JSON (p. ej. un 502 del proxy) se trata como error genérico.
    const data: unknown = await res.json().catch(() => null);

    if (!res.ok) {
        if (res.status === 401) {
            unauthorizedHandler?.();
        }

        throw new ApiError(res.status, errorMessageFrom(data));
    }

    return data as T;
};

export const api = {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
    delete: <T = void>(path: string) => request<T>('DELETE', path),
};
