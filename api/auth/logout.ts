import { NextResponse } from 'next/server';
import { prisma, getSessionToken } from '@/api/_utils/prisma';

export async function POST(request: Request) {
  const token = getSessionToken(request);
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
