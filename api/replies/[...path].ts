import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const app = new Hono();
const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

app.use('*', cors({
  origin: ['https://lexical-comments.vercel.app', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

function getSessionToken(c: any): string | null {
  const auth = c.req.header('Authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.substring(7);
  return null;
}

async function getCurrentUser(c: any) {
  const token = getSessionToken(c);
  if (!token) return null;
  try {
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) return null;
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return null;
    return { id: user.id, name: user.name, avatar: user.avatar, email: user.email };
  } catch { return null; }
}

app.delete('/:id', async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  
  const { id } = c.req.param();
  const reply = await prisma.reply.findUnique({ where: { id } });
  
  if (!reply) return c.json({ error: 'Reply not found' }, 404);
  if (reply.userId !== user.id) return c.json({ error: 'Forbidden' }, 403);
  
  await prisma.reply.delete({ where: { id } });
  return c.json({ success: true });
});

export default app;
