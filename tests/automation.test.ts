import { describe, it, expect } from 'vitest';
import { evaluateCommentTrigger } from '@/lib/automation/engine';
import type { CommentTriggerConfig } from '@/lib/automation/engine';
import {
  interpolateTemplate,
  isDirectWebUrlButton,
  mapButtonsForMeta,
  pickActionText,
  buildTemplateVars,
} from '@/lib/automation/types';

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

  describe('pickActionText', () => {
    it('uses text when no variants', () => {
      expect(pickActionText({ text: 'olá' }).text).toBe('olá');
    });

    it('picks from texts pool', () => {
      const pool = ['a', 'b', 'c'];
      const picked = pickActionText({ text: 'a', texts: pool });
      expect(pool).toContain(picked.text);
    });

    it('rotates sequentially', () => {
      const action = {
        text: 'a',
        texts: ['a', 'b', 'c'],
        textPickMode: 'sequential' as const,
      };
      expect(pickActionText(action, { sequence: 0 }).text).toBe('a');
      expect(pickActionText(action, { sequence: 1 }).text).toBe('b');
      expect(pickActionText(action, { sequence: 2 }).nextSequence).toBe(3);
    });
  });

  describe('interpolateTemplate', () => {
    it('replaces known vars', () => {
      const vars = buildTemplateVars({
        fullName: 'Ana Silva',
        igUsername: 'ana.s',
        commentText: 'quero',
      });
      expect(
        interpolateTemplate('Oi {{primeiro_nome}} (@{{username}}) — {{comentario}}', vars)
      ).toBe('Oi Ana (@ana.s) — quero');
    });

    it('falls back nome to username when fullName is missing', () => {
      const vars = buildTemplateVars({
        fullName: null,
        igUsername: 'joao.ig',
      });
      expect(interpolateTemplate('Oi {{nome}}!', vars)).toBe('Oi joao.ig!');
      expect(interpolateTemplate('Oi {{primeiro_nome}}!', vars)).toBe('Oi joao.ig!');
    });
  });

  describe('DM buttons', () => {
    it('treats url-only as direct web_url', () => {
      expect(
        isDirectWebUrlButton({ title: 'Comprar', url: 'https://pay.example/x' })
      ).toBe(true);
    });

    it('keeps postback when url + requireFollow', () => {
      expect(
        isDirectWebUrlButton({
          title: 'Comprar',
          url: 'https://pay.example/x',
          requireFollow: true,
        })
      ).toBe(false);
    });

    it('maps mixed buttons for Meta', () => {
      const mapped = mapButtonsForMeta(
        [
          { title: 'Checkout', url: 'https://pay.example/x' },
          {
            title: 'Liberar',
            url: 'https://pay.example/y',
            requireFollow: true,
            responseText: 'ok',
          },
        ],
        'auto-1'
      );
      expect(mapped[0]).toEqual({ title: 'Checkout', url: 'https://pay.example/x' });
      expect(mapped[1]).toEqual({ title: 'Liberar', payload: 'fc:btn:auto-1:1' });
    });
  });
});
