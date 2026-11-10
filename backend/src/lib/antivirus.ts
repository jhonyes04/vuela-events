import { Readable } from 'node:stream';
import NodeClam from 'clamscan';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let clamscanPromise: Promise<NodeClam> | null = null;

const getClamscan = (): Promise<NodeClam> => {
    clamscanPromise ??= new NodeClam().init({
        remove_infected: false,
        clamdscan: {
            host: env.CLAMAV_HOST,
            port: env.CLAMAV_PORT,
            timeout: 60_000,
            local_fallback: false,
        },
    });

    return clamscanPromise;
};

// true si el archivo está limpio o si ClamAV no está disponible (fail-open);
// false solo cuando ClamAV responde y lo marca como infectado.
export const isFileSafe = async (data: Buffer): Promise<boolean> => {
    try {
        const clamscan = await getClamscan();
        const { isInfected, viruses } = await clamscan.scanStream(
            Readable.from(data),
        );

        if (isInfected) {
            logger.warn({ viruses }, 'Archivo rechazado por ClamAV');
        }

        return !isInfected;
    } catch (e) {
        logger.error({ err: e }, 'ClamAV no disponible, se permite la subida');
        return true;
    }
};
