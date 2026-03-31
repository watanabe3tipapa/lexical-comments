import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/api/_utils/auth';

export async function GET() {
  const user = await getCurrentUser(new Request('http://localhost'));
  return NextResponse.json({ user });
}
