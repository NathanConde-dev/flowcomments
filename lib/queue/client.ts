import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let connection: IORedis | null = null;

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return connection;
}

export const QUEUE_NAMES = {
  AUTOMATION: 'automation',
  DM: 'dm',
  WEBHOOK: 'webhook',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export function createQueue(queueName: QueueName): Queue {
  return new Queue(queueName, {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        count: 100,
        age: 24 * 3600,
      },
      removeOnFail: {
        count: 500,
        age: 7 * 24 * 3600,
      },
    },
  });
}

export function createWorker<T = any>(
  queueName: QueueName,
  processor: (job: Job<T>) => Promise<any>
): Worker<T> {
  return new Worker<T>(queueName, processor, {
    connection: getConnection(),
    concurrency: 5,
  });
}

export function createQueueEvents(queueName: QueueName): QueueEvents {
  return new QueueEvents(queueName, {
    connection: getConnection(),
  });
}

export async function closeConnection(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
