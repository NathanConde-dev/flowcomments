import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { hashPassword } from '@/lib/crypto/password';

export async function POST(request: Request) {
  try {
    const adminCount = await prisma.user.count({
      where: { isAdmin: true },
    });

    if (adminCount > 0) {
      return NextResponse.json(
        { error: 'Setup já foi concluído' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { username, password, email } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email: email || null,
        isAdmin: true,
      },
    });

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
