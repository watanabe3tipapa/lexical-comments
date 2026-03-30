import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: VercelResponse | undefined;
}

const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function getSessionToken(request: VercelRequest): string | null {
  const auth = request.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.substring(7);
  const match = request.headers.cookie?.match(/session_token=([^;]+)/);
  return match ? match[1] : null;
}

async function getCurrentUser(request: VercelRequest) {
  const token = getSessionToken(request);
  if (!token) return null;
  try {
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) return null;
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return null;
    return { id: user.id, name: user.name, avatar: user.avatar, email: user.email };
  } catch { return null; }
}

function corsHeaders(origin: string = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const { method, path, query, body } = request;
  const url = new URL(path || '/', `https://${request.headers.host}`);
  const pathStr = url.pathname;

  const origin = request.headers.origin || 'https://lexical-comments.vercel.app';
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    // GET /api/health
    if (pathStr === '/api/health' && method === 'GET') {
      return response.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // POST /api/auth/login
    if (pathStr === '/api/auth/login' && method === 'POST') {
      const { name } = body;
      const id = generateId();

      const user = await prisma.user.upsert({
        where: { id },
        update: { name },
        create: { id, name },
      });

      const token = generateId();
      await prisma.session.create({
        data: { token, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      });

      return response.json({
        user: { id: user.id, name: user.name, avatar: user.avatar, email: user.email },
        token
      });
    }

    // GET /api/auth/session
    if (pathStr === '/api/auth/session' && method === 'GET') {
      const user = await getCurrentUser(request);
      return response.json({ user: user || null });
    }

    // POST /api/auth/logout
    if (pathStr === '/api/auth/logout' && method === 'POST') {
      const token = getSessionToken(request);
      if (token) await prisma.session.deleteMany({ where: { token } });
      return response.json({ success: true });
    }

    // GET /api/auth/github
    if (pathStr === '/api/auth/github' && method === 'GET') {
      const githubId = process.env.GITHUB_ID;
      const appUrl = process.env.APP_URL || 'https://lexical-comments.vercel.app';
      const redirectUri = `${appUrl}/api/auth/github`;

      if (!githubId) {
        return response.status(400).json({ error: 'GitHub OAuth not configured' });
      }

      const authUrl = `https://github.com/login/oauth/authorize?client_id=${githubId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,user:email`;
      return response.json({ url: authUrl });
    }

    // GET /api/comments
    if (pathStr === '/api/comments' && method === 'GET') {
      const documentId = query?.documentId || 'default';
      const comments = await prisma.comment.findMany({
        where: { documentId: documentId as string },
        include: { replies: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      });
      return response.json(comments.map(c => ({
        id: c.id, content: c.content, selectedText: c.selectedText,
        userId: c.userId, userName: c.userName, userImage: c.userImage,
        resolved: c.resolved, createdAt: c.createdAt.toISOString(),
        replies: c.replies.map(r => ({
          id: r.id, content: r.content, userId: r.userId, userName: r.userName,
          userImage: r.userImage, createdAt: r.createdAt.toISOString(),
        })),
      })));
    }

    // POST /api/comments
    if (pathStr === '/api/comments' && method === 'POST') {
      const user = await getCurrentUser(request);
      if (!user) {
        return response.status(401).json({ error: 'Unauthorized' });
      }

      const { content, selectedText, documentId = 'default' } = body;

      const comment = await prisma.comment.create({
        data: { content, selectedText, userId: user.id, userName: user.name, userImage: user.avatar, documentId },
        include: { replies: true },
      });

      return response.status(201).json({
        id: comment.id, content: comment.content, selectedText: comment.selectedText,
        userId: comment.userId, userName: comment.userName, userImage: comment.userImage,
        resolved: comment.resolved, createdAt: comment.createdAt.toISOString(), replies: [],
      });
    }

    // PATCH /api/comments/:id/resolve
    if (pathStr.match(/^\/api\/comments\/[^/]+\/resolve$/) && method === 'PATCH') {
      const user = await getCurrentUser(request);
      if (!user) {
        return response.status(401).json({ error: 'Unauthorized' });
      }

      const id = pathStr.split('/')[3];
      const { resolved } = body;

      const comment = await prisma.comment.findUnique({ where: { id } });
      if (!comment) {
        return response.status(404).json({ error: 'Comment not found' });
      }

      const updated = await prisma.comment.update({ where: { id }, data: { resolved } });
      return response.json({ ...updated, createdAt: updated.createdAt.toISOString(), replies: [] });
    }

    // DELETE /api/comments/:id
    if (pathStr.match(/^\/api\/comments\/[^/]+$/) && !pathStr.includes('/replies') && method === 'DELETE') {
      const user = await getCurrentUser(request);
      if (!user) {
        return response.status(401).json({ error: 'Unauthorized' });
      }

      const id = pathStr.split('/')[3];
      const comment = await prisma.comment.findUnique({ where: { id } });

      if (!comment) {
        return response.status(404).json({ error: 'Comment not found' });
      }

      if (comment.userId !== user.id) {
        return response.status(403).json({ error: 'Forbidden' });
      }

      await prisma.comment.delete({ where: { id } });
      return response.json({ success: true });
    }

    // POST /api/comments/:id/replies
    if (pathStr.match(/^\/api\/comments\/[^/]+\/replies$/) && method === 'POST') {
      const user = await getCurrentUser(request);
      if (!user) {
        return response.status(401).json({ error: 'Unauthorized' });
      }

      const id = pathStr.split('/')[3];
      const { content } = body;

      const comment = await prisma.comment.findUnique({ where: { id } });
      if (!comment) {
        return response.status(404).json({ error: 'Comment not found' });
      }

      const reply = await prisma.reply.create({
        data: { content, userId: user.id, userName: user.name, userImage: user.avatar, commentId: id },
      });

      return response.status(201).json({
        id: reply.id, content: reply.content, userId: reply.userId,
        userName: reply.userName, userImage: reply.userImage, createdAt: reply.createdAt.toISOString(),
      });
    }

    // DELETE /api/replies/:id
    if (pathStr.match(/^\/api\/replies\/[^/]+$/) && method === 'DELETE') {
      const user = await getCurrentUser(request);
      if (!user) {
        return response.status(401).json({ error: 'Unauthorized' });
      }

      const id = pathStr.split('/')[3];
      const reply = await prisma.reply.findUnique({ where: { id } });

      if (!reply) {
        return response.status(404).json({ error: 'Reply not found' });
      }

      if (reply.userId !== user.id) {
        return response.status(403).json({ error: 'Forbidden' });
      }

      await prisma.reply.delete({ where: { id } });
      return response.json({ success: true });
    }

    return response.status(404).json({ error: 'Not Found' });

  } catch (error) {
    console.error('API Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
