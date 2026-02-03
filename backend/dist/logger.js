"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const winston_1 = __importDefault(require("winston"));
// Create a logs directory if it doesn't exist
const logDir = 'logs';
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir);
}
// Function to get caller information including function name
function getCallerInfo() {
    const stack = new Error().stack;
    if (!stack)
        return 'unknown';
    const stackLines = stack.split('\n');
    // Find the first line that's not from winston, this logger file, or Node.js internals
    for (let i = 1; i < stackLines.length; i += 1) {
        const line = stackLines[i];
        if (line &&
            !line.includes('node_modules') &&
            !line.includes('logger.ts') &&
            !line.includes('logger.js') &&
            !line.includes('_stream_writable.js') &&
            !line.includes('internal/') &&
            !line.includes('combine.js')) {
            // Try different regex patterns for different stack formats
            const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):\d+\)/) ||
                line.match(/at\s+(.+):(\d+):\d+/);
            if (match) {
                if (match.length === 4) {
                    // Format: "at functionName (/path/file.js:123:45)"
                    const functionName = match[1];
                    const filePath = match[2];
                    const fileName = path_1.default.basename(filePath);
                    const lineNumber = match[3];
                    return `${fileName}:${lineNumber}:${functionName}`;
                }
                // Format: "at /path/file.js:123:45" (no function name)
                const filePath = match[1];
                const fileName = path_1.default.basename(filePath);
                const lineNumber = match[2];
                return `${fileName}:${lineNumber}`;
            }
        }
    }
    return 'unknown';
}
const baseLogger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json()),
    defaultMeta: { service: 'fritid-backend' },
    transports: [
        //
        // - Write to all logs with level `info` and below to `combined.log`
        // - Write all logs error (and below) to `error.log`.
        //
        new winston_1.default.transports.File({ filename: path_1.default.join(logDir, 'error.log'), level: 'error' }),
        new winston_1.default.transports.File({ filename: path_1.default.join(logDir, 'combined.log') })
    ]
});
function formatArg(arg) {
    if (arg instanceof Error) {
        return { message: arg.message, stack: arg.stack };
    }
    return arg;
}
function normalizeMeta(args) {
    if (!args || args.length === 0)
        return {};
    if (args.length === 1) {
        const arg = args[0];
        if (arg instanceof Error) {
            return { error: formatArg(arg) };
        }
        if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
            return arg;
        }
        return { args: [arg] };
    }
    return { args: args.map(formatArg) };
}
// Create a wrapper logger that adds caller info before logging
const logger = {
    info: (message, ...args) => {
        const caller = getCallerInfo();
        const meta = normalizeMeta(args);
        baseLogger.info(message, { caller, ...meta });
    },
    error: (message, ...args) => {
        const caller = getCallerInfo();
        const meta = normalizeMeta(args);
        baseLogger.error(message, { caller, ...meta });
    },
    warn: (message, ...args) => {
        const caller = getCallerInfo();
        const meta = normalizeMeta(args);
        baseLogger.warn(message, { caller, ...meta });
    },
    debug: (message, ...args) => {
        const caller = getCallerInfo();
        const meta = normalizeMeta(args);
        baseLogger.debug(message, { caller, ...meta });
    }
};
//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
    baseLogger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ level, message, timestamp, caller, service, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${level}] ${caller ? `[${caller}] ` : ''}${message}${metaStr}`;
        }))
    }));
}
exports.default = logger;
