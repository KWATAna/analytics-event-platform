import { Injectable } from '@nestjs/common';
import { JsMsg } from 'nats';
import { Observable, defer } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  runWithTraceId,
  traceIdFromNatsHeaders,
} from '@analytics-event-platform/shared/logger';

type NatsHandler<T> = {
  handle: () => Observable<T>;
};

@Injectable()
export class NatsTraceInterceptor {
  intercept<T>(
    msg: JsMsg,
    next: NatsHandler<T>,
    traceIdOverride?: string,
  ): Observable<T> {
    const traceId = traceIdOverride ?? traceIdFromNatsHeaders(msg.headers);
    return defer(() =>
      runWithTraceId(traceId, () => next.handle().pipe(map((value) => value))),
    );
  }
}
