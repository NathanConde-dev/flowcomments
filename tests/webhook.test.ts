import { describe, it, expect } from 'vitest';
import { verifyWebhook } from '@/lib/instagram/webhook';

describe('Webhook', () => {
  describe('verifyWebhook', () => {
    it('should return challenge on valid verification', async () => {
      const originalToken = process.env.WEBHOOK_VERIFY_TOKEN;
      process.env.WEBHOOK_VERIFY_TOKEN = 'test-token';

      const result = await verifyWebhook('subscribe', 'test-token', 'challenge-123');
      expect(result).toBe('challenge-123');

      process.env.WEBHOOK_VERIFY_TOKEN = originalToken;
    });

    it('should return null on invalid token', async () => {
      const originalToken = process.env.WEBHOOK_VERIFY_TOKEN;
      process.env.WEBHOOK_VERIFY_TOKEN = 'test-token';

      const result = await verifyWebhook('subscribe', 'wrong-token', 'challenge-123');
      expect(result).toBeNull();

      process.env.WEBHOOK_VERIFY_TOKEN = originalToken;
    });

    it('should return null on invalid mode', async () => {
      const originalToken = process.env.WEBHOOK_VERIFY_TOKEN;
      process.env.WEBHOOK_VERIFY_TOKEN = 'test-token';

      const result = await verifyWebhook('invalid-mode', 'test-token', 'challenge-123');
      expect(result).toBeNull();

      process.env.WEBHOOK_VERIFY_TOKEN = originalToken;
    });
  });
});
