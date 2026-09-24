const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (
    !googleClientId ||
    !googleClientId.endsWith('.apps.googleusercontent.com')
) {
    throw new Error(
        'Falta VITE_GOOGLE_CLIENT_ID o no es válido. Revisa frontend/.env',
    );
}

export const config = {
    googleClientId,
} as const;
