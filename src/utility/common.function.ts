import { Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { resolve } from 'path';

export const logMemoryUsage = (context = 'overall') => {
  const memory = process.memoryUsage();
  const megabyte = (byte: number) => (byte / 1024 / 1024).toFixed(2);

  Logger.log(`[${context}] RSS: ${megabyte(memory.rss)} MB`);
  Logger.log(`[${context}] Heap Total: ${megabyte(memory.heapTotal)} MB`);
  Logger.log(`[${context}] Heap Used: ${megabyte(memory.heapUsed)} MB`);
  Logger.log(`[${context}] External: ${megabyte(memory.external)} MB`);
  Logger.log(`[${context}] Array Buffers: ${megabyte(memory.arrayBuffers)} MB`);
};

export async function* batchGenerator<T>(
  items: T[],
  batchSize: number,
): AsyncGenerator<T[]> {
  for (let i = 0; i < items.length; i += batchSize) {
    yield items.slice(i, i + batchSize);
  }
}

export const getEnvFilePath = (env?: string): string => {
  const dockerEnv = resolve(process.cwd(), '.env.docker');
  const localEnv = resolve(process.cwd(), '.env.local');
  const defaultEnv = resolve(process.cwd(), '.env');

  if (env === 'docker' && existsSync(dockerEnv)) {
    return dockerEnv;
  }

  if (existsSync(localEnv)) {
    return localEnv;
  }

  return defaultEnv;
};
