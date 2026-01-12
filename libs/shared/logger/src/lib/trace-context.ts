import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { headers, type MsgHdrs } from 'nats';

export const TRACE_ID_HEADER = 'x-trace-id';

type TraceContext = {
  traceId: string;
};

const storage = new AsyncLocalStorage<TraceContext>();

const normalizeHeaderValue = (
  value: string | string[] | undefined | null,
): string | null => {
  if (Array.isArray(value)) value = value[0];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const resolveTraceId = (value?: string | string[] | null): string =>
  normalizeHeaderValue(value ?? null) ?? randomUUID();

export const runWithTraceId = <T>(traceId: string, fn: () => T): T =>
  storage.run({ traceId }, fn);

export const getTraceId = (): string | undefined => storage.getStore()?.traceId;


export const traceIdFromHeaders = (
  headers?: Record<string, string | string[] | undefined>,
): string => resolveTraceId(headers?.[TRACE_ID_HEADER]);

export const traceIdFromNatsHeaders = (natsHeaders?: MsgHdrs): string => {
  const value = natsHeaders?.get(TRACE_ID_HEADER);
  return resolveTraceId(value);
};

export const injectTraceIntoNatsHeaders = (
  existingHeaders?: MsgHdrs,
): MsgHdrs => {
  const h = existingHeaders || headers();
  const traceId = getTraceId();
  if (traceId) {
    h.set(TRACE_ID_HEADER, traceId);
  }
  return h;
};
