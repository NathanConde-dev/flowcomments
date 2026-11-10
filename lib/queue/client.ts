import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

let connection: IORedis | null = null;

function getConnection(): IORedis | null {
  if (!REDIS_URL) {
    return null;
  }
  
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      family: 0,
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

export function createQueue(queueName: QueueName): Queue | null {
  const conn = getConnection();
  if (!conn) {
    console.warn(`⚠️  Queue ${queueName} not available (Redis not configured). Using in-process fallback.`);
    return null;
  }
  
  return new Queue(queueName, {
    connection: conn,
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
  const conn = getConnection();
  if (!conn) {
    throw new Error('Redis connection required for worker');
  }
  
  return new Worker<T>(queueName, processor, {
    connection: conn,
    concurrency: 5,
  });
}

export function createQueueEvents(queueName: QueueName): QueueEvents {
  const conn = getConnection();
  if (!conn) {
    throw new Error('Redis connection required for queue events');
  }
  
  return new QueueEvents(queueName, {
    connection: conn,
  });
}

export async function closeConnection(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
