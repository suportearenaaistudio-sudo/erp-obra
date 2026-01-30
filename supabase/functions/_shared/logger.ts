export class Logger {
    constructor(private context: string) { }

    info(msg: string, meta?: any) {
        console.log(JSON.stringify({ level: 'INFO', context: this.context, msg, ...meta }));
    }

    error(msg: string, meta?: any) {
        console.error(JSON.stringify({ level: 'ERROR', context: this.context, msg, ...meta }));
    }

    warn(msg: string, meta?: any) {
        console.warn(JSON.stringify({ level: 'WARN', context: this.context, msg, ...meta }));
    }

    debug(msg: string, meta?: any) {
        console.debug(JSON.stringify({ level: 'DEBUG', context: this.context, msg, ...meta }));
    }
}
