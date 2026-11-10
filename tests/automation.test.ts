import { describe, it, expect } from 'vitest';
import { evaluateCommentTrigger } from '@/lib/automation/engine';
import type { CommentTriggerConfig } from '@/lib/automation/engine';

describe('Automation Engine', () => {
  describe('evaluateCommentTrigger', () => {
    it('should match exact keyword', async () => {
      const config: CommentTriggerConfig = {
        keywords: ['preço', 'valor'],
        matchType: 'exact',
        caseSensitive: false,
      };

      expect(await evaluateCommentTrigger({ text: 'preço' }, config)).toBe(true);
      expect(await evaluateCommentTrigger({ text: 'valor' }, config)).toBe(true);
      expect(await evaluateCommentTrigger({ text: 'qual o preço' }, config)).toBe(false);
    });

    it('should match contains keyword', async () => {
      const config: CommentTriggerConfig = {
        keywords: ['preço', 'valor'],
        matchType: 'contains',
        caseSensitive: false,
      };

      expect(await evaluateCommentTrigger({ text: 'qual o preço?' }, config)).toBe(true);
      expect(await evaluateCommentTrigger({ text: 'quanto custa' }, config)).toBe(false);
    });

    it('should match starts_with keyword', async () => {
      const config: CommentTriggerConfig = {
        keywords: ['oi', 'olá'],
        matchType: 'starts_with',
        caseSensitive: false,
      };

      expect(await evaluateCommentTrigger({ text: 'oi, tudo bem?' }, config)).toBe(true);
      expect(await evaluateCommentTrigger({ text: 'tudo bem? oi' }, config)).toBe(false);
    });

    it('should respect case sensitivity', async () => {
      const configSensitive: CommentTriggerConfig = {
        keywords: ['PROMOÇÃO'],
        matchType: 'contains',
        caseSensitive: true,
      };

      expect(await evaluateCommentTrigger({ text: 'PROMOÇÃO aqui' }, configSensitive)).toBe(true);
      expect(await evaluateCommentTrigger({ text: 'promoção aqui' }, configSensitive)).toBe(false);

      const configInsensitive: CommentTriggerConfig = {
        keywords: ['PROMOÇÃO'],
        matchType: 'contains',
        caseSensitive: false,
      };

      expect(await evaluateCommentTrigger({ text: 'promoção aqui' }, configInsensitive)).toBe(true);
    });
  });
});
