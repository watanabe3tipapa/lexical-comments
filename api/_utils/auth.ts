import { prisma } from './prisma';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function getSessionToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.substring(7);
  }
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(/session_token=([^;]+)/);
  return match ? match[1] : null;
}

export async function getCurrentUser(request: Request) {
  const token = getSessionToken(request);
  if (!token) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar || undefined,
      email: user.email || undefined,
    };
  } catch (error) {
    console.error('Session error:', error);
    return null;
  }
}

export function createSession(userId: string) {
  const token = generateId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return prisma.session.create({
    data: { token, userId, expiresAt },
  }).then(() => token);
}
