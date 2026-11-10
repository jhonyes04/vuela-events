declare module 'clamscan' {
    export interface ClamscanOptions {
        remove_infected?: boolean;
        clamdscan?: {
            host?: string;
            port?: number;
            timeout?: number;
            local_fallback?: boolean;
        };
    }

    export interface ScanResult {
        isInfected: boolean;
        viruses: string[];
    }

    export default class NodeClam {
        init(options: ClamscanOptions): Promise<NodeClam>;
        scanStream(stream: import('node:stream').Readable): Promise<ScanResult>;
    }
}
