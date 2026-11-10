import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

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

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET or ENCRYPTION_KEY must be at least 32 characters');
  }
  return secret;
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, {
    password: getSessionSecret(),
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

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    throw new Error('Unauthorized');
  }
  return session as SessionData;
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth();
  if (!session.isAdmin) {
    throw new Error('Admin access required');
  }
  return session;
}
