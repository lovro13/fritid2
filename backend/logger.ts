import fs from 'fs';
import path from 'path';
import winston from 'winston';

// Create a logs directory if it doesn't exist
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Function to get caller information including function name
function getCallerInfo(): string {
  const stack = new Error().stack;
  if (!stack) return 'unknown';
  const stackLines = stack.split('\n');

  // Find the first line that's not from winston, this logger file, or Node.js internals
  for (let i = 1; i < stackLines.length; i += 1) {
    const line = stackLines[i];
    if (
      line &&
      !line.includes('node_modules') &&
      !line.includes('logger.ts') &&
      !line.includes('logger.js') &&
      !line.includes('_stream_writable.js') &&
      !line.includes('internal/') &&
      !line.includes('combine.js')
    ) {
      // Try different regex patterns for different stack formats
      const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):\d+\)/) ||
        line.match(/at\s+(.+):(\d+):\d+/);

      if (match) {
        if (match.length === 4) {
          // Format: "at functionName (/path/file.js:123:45)"
          const functionName = match[1];
          const filePath = match[2];
          const fileName = path.basename(filePath);
          const lineNumber = match[3];
          return `${fileName}:${lineNumber}:${functionName}`;
        }
        // Format: "at /path/file.js:123:45" (no function name)
        const filePath = match[1];
        const fileName = path.basename(filePath);
        const lineNumber = match[2];
        return `${fileName}:${lineNumber}`;
      }
    }
  }
  return 'unknown';
}

const baseLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'fritid-backend' },
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
  ]
});

function formatArg(arg: unknown): unknown {
  if (arg instanceof Error) {
    return { message: arg.message, stack: arg.stack };
  }
  return arg;
}

function normalizeMeta(args: unknown[]): Record<string, unknown> {
  if (!args || args.length === 0) return {};

  if (args.length === 1) {
    const arg = args[0];
    if (arg instanceof Error) {
      return { error: formatArg(arg) };
    }
    if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
      return arg as Record<string, unknown>;
    }
    return { args: [arg] };
  }

  return { args: args.map(formatArg) };
}

type LoggerFn = (message: string, ...args: unknown[]) => void;

interface Logger {
  info: LoggerFn;
  error: LoggerFn;
  warn: LoggerFn;
  debug: LoggerFn;
}

// Create a wrapper logger that adds caller info before logging
const logger: Logger = {
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
  baseLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, caller, service, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}] ${caller ? `[${caller}] ` : ''}${message}${metaStr}`;
      })
    )
  }));
}

export default logger;
