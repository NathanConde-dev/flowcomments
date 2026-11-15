import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildOAuthURL,
  testCredentials,
  getErrorHintPtBR,
} from '@/lib/instagram/oauth';

global.fetch = vi.fn();

describe('Instagram OAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildOAuthURL', () => {
    it('should build correct OAuth URL with config_id', () => {
      const url = buildOAuthURL(
        'https://example.com/callback',
        'state123',
        'app_111',
        'config_222'
      );

      expect(url).toContain('https://www.facebook.com/v21.0/dialog/oauth');
      expect(url).toContain('client_id=app_111');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
      expect(url).toContain('state=state123');
      expect(url).toContain('config_id=config_222');
      // Login Configuration owns permissions — do not send scope with config_id.
      expect(url).not.toContain('scope=');
    });

    it('should build OAuth URL without config_id', () => {
      const url = buildOAuthURL('https://example.com/callback', 'state123', 'app_111');

      expect(url).toContain('https://www.facebook.com/v21.0/dialog/oauth');
      expect(url).toContain('client_id=app_111');
      expect(url).toContain('state=state123');
      expect(url).not.toContain('config_id=');
      expect(url).toContain('scope=instagram_basic');
      expect(url).toContain('instagram_manage_messages');
      expect(url).not.toContain('pages_messaging');
    });
  });

  describe('testCredentials', () => {
    it('should return valid for correct credentials', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'app_token_123' }),
      });

      const result = await testCredentials('123456', 'secret');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid credentials', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            message: 'Error validating client secret',
            code: 'invalid_client_secret',
          },
        }),
      });

      const result = await testCredentials('123456', 'wrong_secret');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('client secret');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await testCredentials('123456', 'secret');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getErrorHintPtBR', () => {
    it('should return hint for client secret error', () => {
      const hint = getErrorHintPtBR('Error validating client secret');
      expect(hint).toContain('App Secret incorreto');
    });

    it('should return hint for redirect URI error', () => {
      const hint = getErrorHintPtBR('Invalid redirect_uri');
      expect(hint).toContain('URL de redirecionamento');
    });

    it('should return hint for permission error', () => {
      const hint = getErrorHintPtBR('Permission denied');
      expect(hint).toContain('Permissões insuficientes');
    });

    it('should return hint for development mode error', () => {
      const hint = getErrorHintPtBR('App is in development mode');
      expect(hint).toContain('modo Development');
    });

    it('should return hint for business portfolio error', () => {
      const hint = getErrorHintPtBR('Not in same business portfolio');
      expect(hint).toContain('Business Portfolio');
    });

    it('should return hint for professional account error', () => {
      const hint = getErrorHintPtBR('Not a professional account');
      expect(hint).toContain('Professional');
    });

    it('should return hint for rate limit error', () => {
      const hint = getErrorHintPtBR('Rate limit exceeded');
      expect(hint).toContain('Limite de requisições');
    });

    it('should return hint for invalid token error code', () => {
      const hint = getErrorHintPtBR('Some error', '190');
      expect(hint).toContain('Token inválido');
    });

    it('should return generic hint for unknown error', () => {
      const hint = getErrorHintPtBR('Unknown error');
      expect(hint).toContain('Erro desconhecido');
    });
  });
});
