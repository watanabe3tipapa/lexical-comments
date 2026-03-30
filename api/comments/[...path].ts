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
  const match = (c.req.header('Cookie') || '').match(/session_token=([^;]+)/);
  return match ? match[1] : null;
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

app.get('/', async (c) => {
  const documentId = c.req.query('documentId') || 'default';
  const comments = await prisma.comment.findMany({
    where: { documentId },
    include: { replies: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  return c.json(comments.map(c => ({
    id: c.id, content: c.content, selectedText: c.selectedText,
    userId: c.userId, userName: c.userName, userImage: c.userImage,
    resolved: c.resolved, createdAt: c.createdAt.toISOString(),
    replies: c.replies.map(r => ({
      id: r.id, content: r.content, userId: r.userId, userName: r.userName,
      userImage: r.userImage, createdAt: r.createdAt.toISOString(),
    })),
  })));
});

app.post('/', async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  
  const { content, selectedText, documentId = 'default' } = await c.req.json();
  
  const comment = await prisma.comment.create({
    data: { content, selectedText, userId: user.id, userName: user.name, userImage: user.avatar, documentId },
    include: { replies: true },
  });
  
  return c.json({
    id: comment.id, content: comment.content, selectedText: comment.selectedText,
    userId: comment.userId, userName: comment.userName, userImage: comment.userImage,
    resolved: comment.resolved, createdAt: comment.createdAt.toISOString(), replies: [],
  }, 201);
});

app.patch('/:id/resolve', async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  
  const { id } = c.req.param();
  const { resolved } = await c.req.json();
  
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return c.json({ error: 'Comment not found' }, 404);
  
  const updated = await prisma.comment.update({ where: { id }, data: { resolved } });
  return c.json({ ...updated, createdAt: updated.createdAt.toISOString(), replies: [] });
});

app.delete('/:id', async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  
  const { id } = c.req.param();
  const comment = await prisma.comment.findUnique({ where: { id } });
  
  if (!comment) return c.json({ error: 'Comment not found' }, 404);
  if (comment.userId !== user.id) return c.json({ error: 'Forbidden' }, 403);
  
  await prisma.comment.delete({ where: { id } });
  return c.json({ success: true });
});

app.post('/:id/replies', async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  
  const { id } = c.req.param();
  const { content } = await c.req.json();
  
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return c.json({ error: 'Comment not found' }, 404);
  
  const reply = await prisma.reply.create({
    data: { content, userId: user.id, userName: user.name, userImage: user.avatar, commentId: id },
  });
  
  return c.json({
    id: reply.id, content: reply.content, userId: reply.userId,
    userName: reply.userName, userImage: reply.userImage, createdAt: reply.createdAt.toISOString(),
  }, 201);
});

export default app;
