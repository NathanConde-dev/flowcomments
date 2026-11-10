import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db/client';

describe('Session Secret Auto-generation', () => {
  beforeAll(async () => {
    // Clean up any existing session secret
    await prisma.systemConfig.deleteMany({
      where: { key: 'SESSION_SECRET' },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should auto-generate session secret when not provided', async () => {
    // Import after cleanup to ensure fresh state
    const { getSession } = await import('@/lib/auth/session');
    
    const session = await getSession();
    expect(session).toBeDefined();

    // Check that secret was persisted
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'SESSION_SECRET' },
    });

    expect(config).toBeDefined();
    expect(config?.value.length).toBeGreaterThanOrEqual(32);
  });
});

describe('API Auth Errors', () => {
  it('should return 401 for unauthenticated MCP token request', async () => {
    const response = await fetch('http://localhost:3000/api/settings/mcp-token');
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toContain('Unauthorized');
  });
});
