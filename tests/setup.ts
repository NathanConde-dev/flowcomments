import { beforeAll, afterAll } from 'vitest';

// Mock environment variables for tests
Object.assign(process.env, {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  SESSION_SECRET: 'test-session-secret-min-32-chars-long',
});

beforeAll(() => {
  // Setup test environment
});

afterAll(() => {
  // Cleanup
});
