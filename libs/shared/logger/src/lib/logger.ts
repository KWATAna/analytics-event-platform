import pino from 'pino';
import type { Logger } from 'pino';
import type { Options as PinoHttpOptions } from 'pino-http';
import { getTraceId, resolveTraceId, TRACE_ID_HEADER } from './trace-context';

const redactPaths = ['data.user.name', 'data.user.email', 'data.user.location'];

export type LogPayload = Record<string, unknown>;

const buildLoggerOptions = (): pino.LoggerOptions => ({
  level: process.env.LOG_LEVEL?.trim() || 'info',
  messageKey: 'msg',
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },

  mixin() {
    const traceId = getTraceId();
    return traceId ? { traceId } : {};
  },
});

export const logger: Logger = pino(buildLoggerOptions());

export const createPinoHttpOptions = (): PinoHttpOptions => ({
  logger,
  genReqId: (req) => {
    return getTraceId() ?? resolveTraceId(req.headers[TRACE_ID_HEADER]);
  },
  customProps: (req) => ({
    traceId: (req as { id?: string }).id ?? getTraceId(),
  }),
});

export const createLoggerModuleOptions = () => ({
  pinoHttp: createPinoHttpOptions(),
});
