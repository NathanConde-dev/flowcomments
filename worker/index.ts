import { createWorker, QUEUE_NAMES } from '@/lib/queue/client';
import {
  executeAutomation,
  executeButtonPostback,
  executeFollowGatePostback,
} from '@/lib/automation/engine';
import { processWebhookEvent } from '@/lib/instagram/webhook';

if (!process.env.REDIS_URL) {
  console.log('⚠️  REDIS_URL not set. Worker will not start (using in-process queue fallback).');
  process.exit(0);
}

const automationWorker = createWorker(QUEUE_NAMES.AUTOMATION, async (job) => {
  if (job.data?.type === 'follow_gate_postback') {
    await executeFollowGatePostback({
      automationId: job.data.automationId,
      senderId: job.data.senderId,
      kind: job.data.kind,
    });
    return;
  }

  if (job.data?.type === 'button_postback') {
    await executeButtonPostback({
      automationId: job.data.automationId,
      senderId: job.data.senderId,
      index: job.data.index,
    });
    return;
  }

  const { automationId, context } = job.data;
  await executeAutomation(automationId, context);
});

const webhookWorker = createWorker(QUEUE_NAMES.WEBHOOK, async (job) => {
  await processWebhookEvent(job.data);
});

automationWorker.on('completed', (job) => {
  console.log(`[AUTOMATION] Job ${job.id} completed`);
});

automationWorker.on('failed', (job, err) => {
  console.error(`[AUTOMATION] Job ${job?.id} failed:`, err.message);
});

webhookWorker.on('completed', (job) => {
  console.log(`[WEBHOOK] Job ${job.id} completed`);
});

webhookWorker.on('failed', (job, err) => {
  console.error(`[WEBHOOK] Job ${job?.id} failed:`, err.message);
});

console.log('✅ Workers started successfully');

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing workers...');
  await automationWorker.close();
  await webhookWorker.close();
  process.exit(0);
});
