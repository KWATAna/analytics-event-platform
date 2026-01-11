import { Injectable, NestMiddleware } from '@nestjs/common';
import { logger } from '@analytics-event-platform/observability';

type RequestWithBody = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

@Injectable()
export class RequestSizeLogger implements NestMiddleware {
  use(req: RequestWithBody, _res: unknown, next: () => void): void {
    if (req.method !== 'POST') {
      next();
      return;
    }

    const contentLengthHeader = req.headers?.['content-length'];
    const headerValue = Array.isArray(contentLengthHeader)
      ? contentLengthHeader[0]
      : contentLengthHeader;
    let sizeBytes = headerValue ? Number.parseInt(headerValue, 10) : NaN;

    if (!Number.isFinite(sizeBytes)) {
      sizeBytes = this.estimateBodySize(req.body);
    }

    const source = this.getSource(req);

    logger.info({
      message: 'request_size',
      source,
      sizeBytes,
      path: req.url,
    });

    next();
  }

  private estimateBodySize(body: unknown): number {
    console.log(typeof body);
    if (typeof body === 'string') {
      return Buffer.byteLength(body);
    }

    if (Buffer.isBuffer(body)) {
      return body.length;
    }

    if (body && typeof body === 'object') {
      return Buffer.byteLength(JSON.stringify(body));
    }

    return 0;
  }

  private getSource(req: RequestWithBody): string {
    const headerSource = req.headers?.['x-event-source'];
    const headerValue = Array.isArray(headerSource)
      ? headerSource[0]
      : headerSource;

    if (headerValue) {
      return headerValue;
    }

    if (req.body && typeof req.body === 'object') {
      const source = (req.body as { source?: string }).source;
      if (typeof source === 'string' && source.length > 0) {
        return source;
      }
    }

    return 'unknown';
  }
}
