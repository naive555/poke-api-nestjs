import { ConfigService, registerAs } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import pino from 'pino';

const DEFAULT_LEVEL_BY_ENVIRONMENT: Record<string, string> = {
  production: 'info',
  test: 'silent',
};

export default registerAs('logger', () => {
  const environment = process.env.NODE_ENV || 'development';

  return {
    level:
      process.env.LOG_LEVEL ||
      DEFAULT_LEVEL_BY_ENVIRONMENT[environment] ||
      'debug',
    pretty: process.env.LOG_PRETTY
      ? process.env.LOG_PRETTY === 'true'
      : environment !== 'production',
  };
});

// Values that must never reach the log stream, whatever nesting they arrive in.
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  '*.password',
  'accessToken',
  '*.accessToken',
];

// Endpoints that would otherwise flood the stream without telling us anything.
const UNLOGGED_PATHS = ['/api/docs'];

const MAX_ERROR_CAUSE_DEPTH = 3;

/**
 * Keeps only the fields worth reading from an error and follows its cause
 * chain. Deliberately not pino's built-in serializer: that one copies every own
 * property, which for an AxiosError or a TypeORM error means dumping the whole
 * request config or the failed query - noisy, and a way for credentials to leak
 * into the log stream.
 */
const serializeError = (input: unknown, depth = 0): Record<string, unknown> => {
  // pino-http wraps custom serializers around pino's standard one, so `input`
  // arrives already serialized - with the untouched error kept on `raw`.
  const error = (input as { raw?: unknown })?.raw ?? input;

  if (!(error instanceof Error)) return { message: String(error) };

  // `cause` is ES2022, the compilation target is ES2021.
  const { cause } = error as Error & { cause?: unknown };

  return {
    type: error.name,
    message: error.message,
    stack: error.stack,
    ...(cause && depth < MAX_ERROR_CAUSE_DEPTH
      ? { cause: serializeError(cause, depth + 1) }
      : {}),
  };
};

export const loggerModuleFactory = (configService: ConfigService): Params => ({
  // Lets the interceptor attach request context to the access log line.
  assignResponse: true,
  pinoHttp: {
    level: configService.get<string>('logger.level'),
    base: {
      service: configService.get<string>('common.name'),
      version: configService.get<string>('common.version'),
      environment: configService.get<string>('common.environment'),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' },
    serializers: {
      err: (error) => serializeError(error),
      req: (request) => ({
        id: request.id,
        method: request.method,
        url: request.url,
        ip: request.remoteAddress,
      }),
      res: (response) => ({ statusCode: response.statusCode }),
    },
    // No genReqId here on purpose: Fastify assigns the id (see main.ts) and
    // @fastify/middie copies it onto the raw request before pino-http runs.
    customLogLevel: (_request, response, error) => {
      if (error || response.statusCode >= 500) return 'error';
      if (response.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (request, response) =>
      `${request.method} ${request.url} ${response.statusCode}`,
    customErrorMessage: (request, response) =>
      `${request.method} ${request.url} ${response.statusCode}`,
    autoLogging: {
      ignore: (request) =>
        UNLOGGED_PATHS.some((path) => request.url?.startsWith(path)),
    },
    transport: configService.get<boolean>('logger.pretty')
      ? {
          target: 'pino-pretty',
          options: {
            singleLine: true,
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname,service,version,environment',
            messageKey: 'msg',
          },
        }
      : undefined,
  },
});
