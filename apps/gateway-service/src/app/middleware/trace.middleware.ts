import { Injectable, NestMiddleware } from '@nestjs/common';
import {
  runWithTraceId,
  traceIdFromHeaders,
  TRACE_ID_HEADER,
} from '@analytics-event-platform/shared/logger';
import { TraceReply, TraceRequest } from './trace.middleware.types';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: TraceRequest, res: TraceReply, next: () => void): void {
    const headers = req.headers ?? {};

    if (!headers[TRACE_ID_HEADER] && typeof req.id === 'string' && req.id) {
      headers[TRACE_ID_HEADER] = req.id;
    }

    const traceId = traceIdFromHeaders(headers);

    runWithTraceId(traceId, () => {
      req.headers = headers;
      req.headers[TRACE_ID_HEADER] = traceId;
      if (!req.id || req.id !== traceId) {
        req.id = traceId;
      }
      if (res?.header) {
        res.header(TRACE_ID_HEADER, traceId);
      } else if (res?.setHeader) {
        res.setHeader(TRACE_ID_HEADER, traceId);
      }
      next();
    });
  }
}
