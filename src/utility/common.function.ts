import { Logger } from '@nestjs/common';

export const logMemoryUsage = (context = 'overall') => {
  const memory = process.memoryUsage();
  const megabyte = (byte: number) => (byte / 1024 / 1024).toFixed(2);

  Logger.log(`[${context}] RSS: ${megabyte(memory.rss)} MB`);
  Logger.log(`[${context}] Heap Total: ${megabyte(memory.heapTotal)} MB`);
  Logger.log(`[${context}] Heap Used: ${megabyte(memory.heapUsed)} MB`);
  Logger.log(`[${context}] External: ${megabyte(memory.external)} MB`);
  Logger.log(`[${context}] Array Buffers: ${megabyte(memory.arrayBuffers)} MB`);
};
