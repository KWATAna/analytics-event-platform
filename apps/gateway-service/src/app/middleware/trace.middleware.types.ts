export type TraceRequest = {
  headers?: Record<string, string | string[] | undefined>;
  id?: string;
};

export type TraceReply = {
  header?: (key: string, value: string) => void;
  setHeader?: (key: string, value: string) => void;
};
