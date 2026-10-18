import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import {
    wrapNoReplyEmailHtml,
    NOREPLY_LOGO_CID,
} from '../lib/noReplyEmailTemplate.js';
import { recordAudit } from './audit.js';
import { logger } from '../lib/logger.js';
import { VUELA_EVENTS_LOGO } from '../assets/vuelaEventsLogo.js';

const NOREPLY_CONFIG_ID = 'default';

const noReplyConfigSelect = {
    host: true,
    port: true,
    secure: true,
    user: true,
    fromName: true,
} as const;

export const getNoReplySmtpConfig = () =>
    prisma.noReplySmtpConfig.findUnique({
        where: { id: NOREPLY_CONFIG_ID },
        select: noReplyConfigSelect,
    });

export interface NoReplySmtpInput {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    fromName: string;
    password?: string;
}

export const setNoReplyStmpConfig = async (
    actorId: string,
    input: NoReplySmtpInput,
) => {
    const { password, ...rest } = input;

    const config = await prisma.noReplySmtpConfig.upsert({
        where: { id: NOREPLY_CONFIG_ID },
        create: {
            id: NOREPLY_CONFIG_ID,
            ...rest,
            password: encrypt(password ?? ''),
        },
        update: { ...rest, ...(password && { password: encrypt(password) }) },
        select: noReplyConfigSelect,
    });

    await recordAudit({
        action: 'noreply_smtp_config_updated',
        actorId,
        newValue: `${rest.host}:${rest.port}`.slice(0, 100),
    });

    return config;
};

// Nunca se envía al frontend, solo se usa en servidor para enviar correo
const getDecryptedNoReplyPassword = async (): Promise<string | null> => {
    const row = await prisma.noReplySmtpConfig.findUnique({
        where: { id: NOREPLY_CONFIG_ID },
        select: { password: true },
    });

    return row?.password ? decrypt(row.password) : null;
};

export interface NoReplySendResult {
    email: string;
    ok: boolean;
    error?: string;
}

export const sendNoReplyEmail = async (input: {
    to: string[];
    subject: string;
    html: string;
    onProgress?: (result: NoReplySendResult) => void;
}): Promise<void> => {
    const config = await prisma.noReplySmtpConfig.findUnique({
        where: { id: NOREPLY_CONFIG_ID },
    });
    const password = await getDecryptedNoReplyPassword();

    if (!config || !password) {
        throw new Error('SMTP de reply no configurado');
    }

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.user, pass: password },
    });

    try {
        for (const to of input.to) {
            try {
                await transporter.sendMail({
                    from: { name: config.fromName, address: config.user },
                    to,
                    subject: input.subject,
                    html: wrapNoReplyEmailHtml(input.html),
                    attachments: [
                        {
                            cid: NOREPLY_LOGO_CID,
                            filename: 'vuela-events-logo.png',
                            content: VUELA_EVENTS_LOGO,
                            contentType: 'image/png',
                        },
                    ],
                });

                input.onProgress?.({ email: to, ok: true });
            } catch (e) {
                logger.error(
                    { err: e, to },
                    'No se pudo enviar a un destinatario',
                );
                input.onProgress?.({
                    email: to,
                    ok: false,
                    error:
                        e instanceof Error ? e.message : 'Error desconocido',
                });
            }
        }
    } finally {
        transporter.close();
    }
};
