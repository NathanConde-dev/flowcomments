import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { verifyPassword } from '@/lib/crypto/password';
import { getSession } from '@/lib/auth/session';
import { checkRateLimit, clientIpFromRequest } from '@/lib/crypto/security';

export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request);
    const rate = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente mais tarde.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rate.retryAfterSec) },
        }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'E-mail ou usuário e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Lookup by username OR email (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username, mode: 'insensitive' } },
          { email: { equals: username, mode: 'insensitive' } },
        ],
      },
    });

    // Dummy bcrypt hash so missing-user path still pays hashing cost
    const DUMMY_HASH =
      '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    const isValid = await verifyPassword(password, user?.password || DUMMY_HASH);

    if (!user || !isValid) {
      return NextResponse.json(
        { error: 'Usuário ou senha incorretos' },
        { status: 401 }
      );
    }

    const session = await getSession();
    const now = Date.now();
    session.userId = user.id;
    session.username = user.username;
    session.isAdmin = user.isAdmin;
    session.isLoggedIn = true;
    session.loginAt = now;
    session.lastSeen = now;
    await session.save();

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    );
  }
}
