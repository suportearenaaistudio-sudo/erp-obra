export class Logger {
    constructor(private context: string) { }

    debug(message: string, meta?: any) {
        console.log(`[DEBUG] [${this.context}]`, message, meta || '');
    }

    info(message: string, meta?: any) {
        console.log(`[INFO] [${this.context}]`, message, meta || '');
    }

    warn(message: string, meta?: any) {
        console.warn(`[WARN] [${this.context}]`, message, meta || '');
    }

    error(message: string, error?: any) {
        console.error(`[ERROR] [${this.context}]`, message, error || '');
    }
}

export function generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
