import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import * as fs from 'node:fs';
import * as os from 'node:os';

type MemoryHealthOptions = {
  threshold?: number;
};

type MemoryLimit = {
  limitBytes: number;
  source: 'cgroup-v2' | 'cgroup-v1' | 'os.totalmem';
};

const DEFAULT_THRESHOLD = 0.8;

const readFile = (path: string): string | null => {
  try {
    return fs.readFileSync(path, 'utf8').trim();
  } catch {
    return null;
  }
};

const parseLimit = (value: string | null): number | null => {
  if (!value || value === 'max') {
    return null;
  }

  try {
    const limit = BigInt(value);
    if (limit <= 0n) {
      return null;
    }
    if (limit >= BigInt(Number.MAX_SAFE_INTEGER)) {
      return null;
    }
    return Number(limit);
  } catch {
    return null;
  }
};

const getMemoryLimit = (): MemoryLimit => {
  const v2Limit = parseLimit(readFile('/sys/fs/cgroup/memory.max'));
  if (v2Limit) {
    return { limitBytes: v2Limit, source: 'cgroup-v2' };
  }

  const v1Limit = parseLimit(
    readFile('/sys/fs/cgroup/memory/memory.limit_in_bytes'),
  );
  if (v1Limit) {
    return { limitBytes: v1Limit, source: 'cgroup-v1' };
  }

  return { limitBytes: os.totalmem(), source: 'os.totalmem' };
};

@Injectable()
export class MemoryBackpressureIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(
    key: string,
    options: MemoryHealthOptions = {},
  ): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const threshold = options.threshold ?? DEFAULT_THRESHOLD;
    const { limitBytes, source } = getMemoryLimit();
    const heapUsed = process.memoryUsage().heapUsed;
    const usageRatio = limitBytes > 0 ? heapUsed / limitBytes : 0;
    const isHealthy = usageRatio < threshold;

    if (isHealthy) {
      return indicator.up({
        heapUsed,
        limitBytes,
        usageRatio,
        threshold,
        source,
      });
    }

    return indicator.down({
      heapUsed,
      limitBytes,
      usageRatio,
      threshold,
      source,
    });
  }
}
