import { Logger } from '@nestjs/common';
import { existsSync } from 'fs';

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

export const envPath = (env: string | undefined): string => {
  if (env === 'docker' && existsSync('.env.docker')) return '.env.docker';
  else if (existsSync('.env.local')) return '.env.local';

  return '.env';
};
