import { NextRequest, NextResponse } from 'next/server';
import { prisma, createSession } from '@/app/api/_utils/auth';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const id = generateId();

    const user = await prisma.user.upsert({
      where: { id },
      update: { name },
      create: { id, name },
    });

    const token = await createSession(user.id);

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        email: user.email,
      },
      token,
    });

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
