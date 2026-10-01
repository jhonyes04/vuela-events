import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
    scryptSync,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 12;
const SALT = 'vuela-events-app-password';

const getKey = (): Buffer => {
    const secret = process.env.APP_PASSWORD_ENC_KEY;

    if (!secret) {
        throw new Error('APP_PASSWORD_ENC_KEY no configurada');
    }

    return scryptSync(secret, SALT, 32);
};

// Formato de almacenamiento: iv:authTag:ciphertext, en hexadecimal.
export const encrypt = (plain: string): string => {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, getKey(), iv);
    const ciphertext = Buffer.concat([
        cipher.update(plain, 'utf-8'),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [iv, authTag, ciphertext].map((b) => b.toString('hex')).join(':');
};

export const decrypt = (encoded: string): string => {
    const [ivHex, authTagHex, ciphertextHex] = encoded.split(':');

    if (!ivHex || !authTagHex || !ciphertextHex) {
        throw new Error('Formato de dato cifrado inválido');
    }

    const decipher = createDecipheriv(
        ALGORITHM,
        getKey(),
        Buffer.from(ivHex, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    const plain = Buffer.concat([
        decipher.update(Buffer.from(ciphertextHex, 'hex')),
        decipher.final(),
    ]);

    return plain.toString('utf8');
};
