
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    message: string;
    level: LogLevel;
    timestamp: string;
    context?: Record<string, any>;
    tenantId?: string;
    userId?: string;
    traceId?: string;
}

export class Logger {
    private static instance: Logger;
    private tenantId?: string;
    private userId?: string;
    private traceId?: string;

    private constructor() { }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    setContext(context: { tenantId?: string; userId?: string; traceId?: string }) {
        if (context.tenantId) this.tenantId = context.tenantId;
        if (context.userId) this.userId = context.userId;
        if (context.traceId) this.traceId = context.traceId;
    }

    private log(level: LogLevel, message: string, context?: Record<string, any>) {
        const entry: LogEntry = {
            message,
            level,
            timestamp: new Date().toISOString(),
            context,
            tenantId: this.tenantId,
            userId: this.userId,
            traceId: this.traceId || crypto.randomUUID(), // Ensure traceId exists
        };

        if (import.meta.env.PROD) {
            // In Production: Structured JSON logging
            // This is ideal for LogRocket, Datadog, CloudWatch, etc.
            console[level](JSON.stringify(entry));
        } else {
            // In Development: Pretty print
            const color = this.getColor(level);
            const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
            const meta = [
                entry.tenantId ? `Tenant:${entry.tenantId}` : '',
                entry.userId ? `User:${entry.userId}` : '',
            ].filter(Boolean).join(' ');

            console[level](
                `%c${prefix} ${meta} ${message}`,
                `color: ${color}; font-weight: bold;`,
                context || ''
            );
        }
    }

    private getColor(level: LogLevel): string {
        switch (level) {
            case 'debug': return '#9ca3af'; // gray
            case 'info': return '#3b82f6'; // blue
            case 'warn': return '#f59e0b'; // amber
            case 'error': return '#ef4444'; // red
            default: return 'inherit';
        }
    }

    debug(message: string, context?: Record<string, any>) {
        this.log('debug', message, context);
    }

    info(message: string, context?: Record<string, any>) {
        this.log('info', message, context);
    }

    warn(message: string, context?: Record<string, any>) {
        this.log('warn', message, context);
    }

    error(message: string, context?: Record<string, any>) {
        this.log('error', message, context);
    }
}

export const logger = Logger.getInstance();
