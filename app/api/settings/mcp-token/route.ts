import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import crypto from 'crypto';

// Generate MCP token
export async function POST() {
  try {
    const session = await requireAuth();
    
    if (!session.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    // Store hash in database
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

    // Return token only once
    return NextResponse.json({
      success: true,
      token,
      message: 'Token gerado com sucesso. Guarde-o em local seguro - não será exibido novamente.',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error('Error generating MCP token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

// Revoke MCP token
export async function DELETE() {
  try {
    const session = await requireAuth();
    
    if (!session.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    await prisma.systemConfig.deleteMany({
      where: { key: 'MCP_TOKEN_HASH' },
    });

    return NextResponse.json({
      success: true,
      message: 'Token revogado com sucesso',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error('Error revoking MCP token:', error);
    return NextResponse.json(
      { error: 'Failed to revoke token' },
      { status: 500 }
    );
  }
}

// Check if token exists (without revealing it)
export async function GET() {
  try {
    const session = await requireAuth();
    
    if (!session.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const config = await prisma.systemConfig.findUnique({
      where: { key: 'MCP_TOKEN_HASH' },
    });

    return NextResponse.json({
      hasToken: !!config,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error('Error checking MCP token:', error);
    return NextResponse.json(
      { error: 'Failed to check token' },
      { status: 500 }
    );
  }
}
