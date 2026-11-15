import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { hashPassword } from '@/lib/crypto/password';
import { getSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const adminCount = await prisma.user.count({
      where: { isAdmin: true },
    });

    if (adminCount > 0) {
      return NextResponse.json(
        { error: 'Setup já foi concluído' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, email } = body;

    if (!username || !password || !email) {
      return NextResponse.json(
        { error: 'Username, senha e email são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Check if username is taken
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username já está em uso' },
        { status: 400 }
      );
    }

    // Check if email is taken (case-insensitive)
    const existingEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email já está em uso' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
        isAdmin: true,
      },
    });

    // Auto-login so the next setup step (/api/setup/meta) has an admin session
    const session = await getSession();
    const now = Date.now();
    session.userId = user.id;
    session.username = user.username;
    session.isAdmin = true;
    session.isLoggedIn = true;
    session.loginAt = now;
    session.lastSeen = now;
    await session.save();

    return NextResponse.json({
      success: true,
      userId: user.id,
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    return NextResponse.json(
      { error: 'Erro ao criar administrador' },
      { status: 500 }
    );
  }
}
