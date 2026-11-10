import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
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

// In-memory cache for session secret (env-derived only; never persist in DB)
let cachedSecret: string | null = null;

async function getSessionSecret(): Promise<string> {
  if (cachedSecret) {
    return cachedSecret;
  }

  const envSecret = process.env.SESSION_SECRET || process.env.ENCRYPTION_KEY;
  if (envSecret && envSecret.length >= 32) {
    cachedSecret = envSecret;
    return envSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET (or ENCRYPTION_KEY) must be set in production (min 32 chars). Do not store session secrets in the database.'
    );
  }

  // Dev-only ephemeral secret; sessions reset on process restart
  const tempSecret = crypto.randomBytes(32).toString('hex');
  cachedSecret = tempSecret;
  console.warn(
    '[security] SESSION_SECRET missing; using ephemeral runtime secret (dev only). Set SESSION_SECRET for stable sessions.'
  );
  return tempSecret;
}

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ABSOLUTE_TIMEOUT = 12 * 60 * 60 * 1000; // 12 hours

// Read-only session check for Server Components (no cookie writes)
export async function readSession(): Promise<SessionData> {
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

  // Check expiry but don't write - just return plain data
  if (session.isLoggedIn) {
    const now = Date.now();
    
    if (
      (session.lastSeen && now - session.lastSeen > IDLE_TIMEOUT) ||
      (session.loginAt && now - session.loginAt > ABSOLUTE_TIMEOUT)
    ) {
      // Expired - return logged out
      return {
        ...defaultSession,
      };
    }
  }

  if (!session.isLoggedIn) {
    return {
      ...defaultSession,
    };
  }

  // Return plain data object, not iron-session proxy
  return {
    userId: session.userId,
    username: session.username,
    isAdmin: session.isAdmin,
    isLoggedIn: session.isLoggedIn,
    loginAt: session.loginAt,
    lastSeen: session.lastSeen,
  };
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
      // Session cookie - no maxAge means browser session only
      // Will be cleared when browser closes
    },
  });

  if (!session.isLoggedIn) {
    session.userId = defaultSession.userId;
    session.username = defaultSession.username;
    session.isAdmin = defaultSession.isAdmin;
    session.isLoggedIn = defaultSession.isLoggedIn;
  } else {
    // Check idle timeout and absolute expiry
    const now = Date.now();
    
    if (session.lastSeen && now - session.lastSeen > IDLE_TIMEOUT) {
      // Idle timeout exceeded - destroy and reset
      await session.destroy();
      return session;
    } else if (session.loginAt && now - session.loginAt > ABSOLUTE_TIMEOUT) {
      // Absolute expiry exceeded - destroy and reset
      await session.destroy();
      return session;
    } else {
      // Update last seen for sliding window
      session.lastSeen = now;
      await session.save();
    }
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
