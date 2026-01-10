export type LogPayload = Record<string, unknown>;

type Logger = {
  info: (payload: LogPayload) => void;
  warn: (payload: LogPayload) => void;
  error: (payload: LogPayload) => void;
};

const logWithLevel = (level: 'info' | 'warn' | 'error', payload: LogPayload) => {
  console.log({ level, ...payload });
};

export const logger: Logger = {
  info: (payload) => logWithLevel('info', payload),
  warn: (payload) => logWithLevel('warn', payload),
  error: (payload) => logWithLevel('error', payload),
};
