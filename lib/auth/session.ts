import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/client';
import crypto from 'crypto';

export interface SessionData {
  userId: string;
  username: string;
  isAdmin: boolean;
  isLoggedIn: boolean;
  loginAt?: number; // Timestamp when user logged in
  lastSeen?: number; // Last activity timestamp
}

const defaultSession: SessionData = {
  userId: '',
  username: '',
  isAdmin: false,
  isLoggedIn: false,
};

// In-memory cache for session secret
let cachedSecret: string | null = null;

async function getSessionSecret(): Promise<string> {
  // Check env vars first (highest priority)
  const envSecret = process.env.SESSION_SECRET || process.env.ENCRYPTION_KEY;
  if (envSecret && envSecret.length >= 32) {
    return envSecret;
  }

  // Check memory cache
  if (cachedSecret) {
    return cachedSecret;
  }

  // Try to get from database
  try {
    let config = await prisma.systemConfig.findUnique({
      where: { key: 'SESSION_SECRET' },
    });

    if (!config || config.value.length < 32) {
      // Generate new secret
      const newSecret = crypto.randomBytes(32).toString('hex');
      config = await prisma.systemConfig.upsert({
        where: { key: 'SESSION_SECRET' },
        create: {
          key: 'SESSION_SECRET',
          value: newSecret,
          encrypted: false,
        },
        update: {
          value: newSecret,
        },
      });
    }

    cachedSecret = config.value;
    return config.value;
  } catch (error) {
    // Fallback for first boot before DB is ready
    // Generate a temporary secret (will be persisted on next successful DB access)
    const tempSecret = crypto.randomBytes(32).toString('hex');
    cachedSecret = tempSecret;
    return tempSecret;
  }
}

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ABSOLUTE_TIMEOUT = 12 * 60 * 60 * 1000; // 12 hours

// Read-only session check for Server Components (no cookie writes)
export async function readSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  const secret = await getSessionSecret();
  
  const session = await getIronSession<SessionData>(cookieStore, {
    password: secret,
    cookieName: 'flowcomments_session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
    },
  });

  // Check expiry but don't write
  if (session.isLoggedIn) {
    const now = Date.now();
    
    if (
      (session.lastSeen && now - session.lastSeen > IDLE_TIMEOUT) ||
      (session.loginAt && now - session.loginAt > ABSOLUTE_TIMEOUT)
    ) {
      // Expired - return logged out (will be cleaned up by requireAuth)
      return {
        ...session,
        userId: defaultSession.userId,
        username: defaultSession.username,
        isAdmin: defaultSession.isAdmin,
        isLoggedIn: defaultSession.isLoggedIn,
      } as IronSession<SessionData>;
    }
  }

  if (!session.isLoggedIn) {
    session.userId = defaultSession.userId;
    session.username = defaultSession.username;
    session.isAdmin = defaultSession.isAdmin;
    session.isLoggedIn = defaultSession.isLoggedIn;
  }

  return session;
}

// Full session with write capability for Route Handlers
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  const secret = await getSessionSecret();
  
  const session = await getIronSession<SessionData>(cookieStore, {
    password: secret,
    cookieName: 'flowcomments_session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
    },
  });

  if (!session.isLoggedIn) {
    session.userId = defaultSession.userId;
    session.username = defaultSession.username;
    session.isAdmin = defaultSession.isAdmin;
    session.isLoggedIn = defaultSession.isLoggedIn;
  }

  return session;
}

export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();

  if (!session.isLoggedIn) {
    throw new AuthError('Authentication required', 401);
  }

  // Check expiry and refresh lastSeen for idle timeout
  const now = Date.now();
  
  if (session.lastSeen && now - session.lastSeen > IDLE_TIMEOUT) {
    await session.destroy();
    throw new AuthError('Session expired (idle timeout)', 401);
  }
  
  if (session.loginAt && now - session.loginAt > ABSOLUTE_TIMEOUT) {
    await session.destroy();
    throw new AuthError('Session expired (absolute timeout)', 401);
  }

  // Refresh lastSeen for sliding window
  session.lastSeen = now;
  await session.save();

  return {
    userId: session.userId,
    username: session.username,
    isAdmin: session.isAdmin,
    isLoggedIn: session.isLoggedIn,
    loginAt: session.loginAt,
    lastSeen: session.lastSeen,
  };
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth();
  if (!session.isAdmin) {
    throw new AuthError('Admin access required', 403);
  }
  return session;
}
