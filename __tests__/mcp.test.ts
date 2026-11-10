import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db/client';
import crypto from 'crypto';

describe('MCP Server', () => {
  let mcpToken: string;

  beforeAll(async () => {
    // Generate a test MCP token
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    await prisma.systemConfig.upsert({
      where: { key: 'MCP_TOKEN_HASH' },
      create: {
        key: 'MCP_TOKEN_HASH',
        value: hash,
        encrypted: false,
      },
      update: {
        value: hash,
      },
    });

    mcpToken = token;
  });

  it('should handle initialize method', async () => {
    const response = await fetch('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mcpToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
        },
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    
    expect(data.jsonrpc).toBe('2.0');
    expect(data.id).toBe(1);
    expect(data.result).toBeDefined();
    expect(data.result.protocolVersion).toBe('2024-11-05');
    expect(data.result.capabilities).toBeDefined();
    expect(data.result.serverInfo).toBeDefined();
  });

  it('should list available tools', async () => {
    const response = await fetch('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mcpToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    
    expect(data.result.tools).toBeDefined();
    expect(Array.isArray(data.result.tools)).toBe(true);
    expect(data.result.tools.length).toBeGreaterThan(0);

    // Check for required tools
    const toolNames = data.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('get_setup_guide');
    expect(toolNames).toContain('check_setup_status');
    expect(toolNames).toContain('test_meta_credentials');
  });

  it('should execute check_setup_status tool', async () => {
    const response = await fetch('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mcpToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'check_setup_status',
        },
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    
    expect(data.result.content).toBeDefined();
    expect(Array.isArray(data.result.content)).toBe(true);
    expect(data.result.content[0].type).toBe('text');
    
    // Parse the status JSON
    const status = JSON.parse(data.result.content[0].text);
    expect(status).toHaveProperty('adminCreated');
    expect(status).toHaveProperty('credentialsValid');
    expect(status).toHaveProperty('instagramAccounts');
  });

  it('should reject requests without token', async () => {
    const response = await fetch('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/list',
      }),
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain('Bearer');
  });
});
