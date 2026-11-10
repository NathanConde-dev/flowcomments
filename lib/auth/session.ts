import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/client';
import crypto from 'crypto';

export interface SessionData {
  userId: string;
  username: string;
  isAdmin: boolean;
  isLoggedIn: boolean;
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
      maxAge: 60 * 60 * 24 * 7,
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
    throw new AuthError('Unauthorized', 401);
  }
  return session as SessionData;
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth();
  if (!session.isAdmin) {
    throw new AuthError('Admin access required', 403);
  }
  return session;
}
