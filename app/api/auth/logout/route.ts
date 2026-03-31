import { NextResponse } from 'next/server';
import { prisma, getSessionToken } from '@/app/api/_utils/auth';

export async function POST() {
  const token = getSessionToken(new Request('http://localhost'));
  if (token) {
    try {
      await prisma.session.deleteMany({ where: { token } });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('session_token');
  return response;
}
