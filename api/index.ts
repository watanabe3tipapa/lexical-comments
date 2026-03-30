import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function getSessionToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.substring(7);
  const match = request.headers.get('Cookie')?.match(/session_token=([^;]+)/);
  return match ? match[1] : null;
}

async function getCurrentUser(request: Request) {
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

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': 'https://lexical-comments.vercel.app',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const cors = corsHeaders();

  if (method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    // GET /api/health
    if (path === '/api/health' && method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // POST /api/auth/login
    if (path === '/api/auth/login' && method === 'POST') {
      const { name } = await request.json();
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

      return new Response(JSON.stringify({
        user: { id: user.id, name: user.name, avatar: user.avatar, email: user.email },
        token
      }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // GET /api/auth/session
    if (path === '/api/auth/session' && method === 'GET') {
      const user = await getCurrentUser(request);
      return new Response(JSON.stringify({ user: user || null }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // POST /api/auth/logout
    if (path === '/api/auth/logout' && method === 'POST') {
      const token = getSessionToken(request);
      if (token) await prisma.session.deleteMany({ where: { token } });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // GET /api/auth/github
    if (path === '/api/auth/github' && method === 'GET') {
      const githubId = process.env.GITHUB_ID;
      const appUrl = process.env.APP_URL || 'https://lexical-comments.vercel.app';
      const redirectUri = `${appUrl}/api/auth/github`;

      if (!githubId) {
        return new Response(JSON.stringify({ error: 'GitHub OAuth not configured' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const url = `https://github.com/login/oauth/authorize?client_id=${githubId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,user:email`;
      return new Response(JSON.stringify({ url }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // GET /api/auth/github/callback
    if (path === '/api/auth/github' && method === 'GET' && url.searchParams.has('code')) {
      const code = url.searchParams.get('code')!;
      const { GITHUB_ID, GITHUB_SECRET } = process.env;

      if (!GITHUB_ID || !GITHUB_SECRET) {
        return new Response(JSON.stringify({ error: 'OAuth not configured' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ client_id: GITHUB_ID, client_secret: GITHUB_SECRET, code }),
      });

      const { access_token } = await tokenRes.json();
      if (!access_token) {
        return new Response(JSON.stringify({ error: 'Failed to get token' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' },
      });

      const ghUser = await userRes.json();

      const user = await prisma.user.upsert({
        where: { id: ghUser.id.toString() },
        update: { name: ghUser.name || ghUser.login, avatar: ghUser.avatar_url, email: ghUser.email },
        create: { id: ghUser.id.toString(), name: ghUser.name || ghUser.login, avatar: ghUser.avatar_url, email: ghUser.email },
      });

      const token = generateId();
      await prisma.session.create({
        data: { token, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      });

      return new Response(JSON.stringify({
        user: { id: user.id, name: user.name, avatar: user.avatar, email: user.email },
        token
      }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // GET /api/comments
    if (path === '/api/comments' && method === 'GET') {
      const documentId = url.searchParams.get('documentId') || 'default';
      const comments = await prisma.comment.findMany({
        where: { documentId },
        include: { replies: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      });
      return new Response(JSON.stringify(comments.map(c => ({
        id: c.id, content: c.content, selectedText: c.selectedText,
        userId: c.userId, userName: c.userName, userImage: c.userImage,
        resolved: c.resolved, createdAt: c.createdAt.toISOString(),
        replies: c.replies.map(r => ({
          id: r.id, content: r.content, userId: r.userId, userName: r.userName,
          userImage: r.userImage, createdAt: r.createdAt.toISOString(),
        })),
      }))), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // POST /api/comments
    if (path === '/api/comments' && method === 'POST') {
      const user = await getCurrentUser(request);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const { content, selectedText, documentId = 'default' } = await request.json();

      const comment = await prisma.comment.create({
        data: { content, selectedText, userId: user.id, userName: user.name, userImage: user.avatar, documentId },
        include: { replies: true },
      });

      return new Response(JSON.stringify({
        id: comment.id, content: comment.content, selectedText: comment.selectedText,
        userId: comment.userId, userName: comment.userName, userImage: comment.userImage,
        resolved: comment.resolved, createdAt: comment.createdAt.toISOString(), replies: [],
      }), { status: 201, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // PATCH /api/comments/:id/resolve
    if (path.match(/^\/api\/comments\/[^/]+\/resolve$/) && method === 'PATCH') {
      const user = await getCurrentUser(request);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const id = path.split('/')[3];
      const { resolved } = await request.json();

      const comment = await prisma.comment.findUnique({ where: { id } });
      if (!comment) {
        return new Response(JSON.stringify({ error: 'Comment not found' }), {
          status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const updated = await prisma.comment.update({ where: { id }, data: { resolved } });
      return new Response(JSON.stringify({ ...updated, createdAt: updated.createdAt.toISOString(), replies: [] }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /api/comments/:id
    if (path.match(/^\/api\/comments\/[^/]+$/) && !path.includes('/replies') && method === 'DELETE') {
      const user = await getCurrentUser(request);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const id = path.split('/')[3];
      const comment = await prisma.comment.findUnique({ where: { id } });

      if (!comment) {
        return new Response(JSON.stringify({ error: 'Comment not found' }), {
          status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      if (comment.userId !== user.id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      await prisma.comment.delete({ where: { id } });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // POST /api/comments/:id/replies
    if (path.match(/^\/api\/comments\/[^/]+\/replies$/) && method === 'POST') {
      const user = await getCurrentUser(request);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const id = path.split('/')[3];
      const { content } = await request.json();

      const comment = await prisma.comment.findUnique({ where: { id } });
      if (!comment) {
        return new Response(JSON.stringify({ error: 'Comment not found' }), {
          status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const reply = await prisma.reply.create({
        data: { content, userId: user.id, userName: user.name, userImage: user.avatar, commentId: id },
      });

      return new Response(JSON.stringify({
        id: reply.id, content: reply.content, userId: reply.userId,
        userName: reply.userName, userImage: reply.userImage, createdAt: reply.createdAt.toISOString(),
      }), { status: 201, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // DELETE /api/replies/:id
    if (path.match(/^\/api\/replies\/[^/]+$/) && method === 'DELETE') {
      const user = await getCurrentUser(request);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const id = path.split('/')[3];
      const reply = await prisma.reply.findUnique({ where: { id } });

      if (!reply) {
        return new Response(JSON.stringify({ error: 'Reply not found' }), {
          status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      if (reply.userId !== user.id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      await prisma.reply.delete({ where: { id } });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404, headers: { ...cors } });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const OPTIONS = handleRequest;
