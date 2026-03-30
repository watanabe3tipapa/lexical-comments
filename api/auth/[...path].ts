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

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function getSessionToken(c: any): string | null {
  const auth = c.req.header('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return auth.substring(7);
  }
  const cookie = c.req.header('Cookie') || '';
  const match = cookie.match(/session_token=([^;]+)/);
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
  } catch {
    return null;
  }
}

app.post('/login', async (c) => {
  const { name } = await c.req.json();
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
  
  return c.json({ user: { id: user.id, name: user.name, avatar: user.avatar, email: user.email }, token });
});

app.get('/session', async (c) => {
  const user = await getCurrentUser(c);
  return c.json({ user: user || null });
});

app.post('/logout', async (c) => {
  const token = getSessionToken(c);
  if (token) await prisma.session.deleteMany({ where: { token } });
  return c.json({ success: true });
});

app.get('/github', (c) => {
  const githubId = process.env.GITHUB_ID;
  const redirectUri = `${process.env.APP_URL || 'https://lexical-comments.vercel.app'}/api/auth/github`;
  
  if (!githubId) return c.json({ error: 'GitHub OAuth not configured' }, 400);
  
  const url = `https://github.com/login/oauth/authorize?client_id=${githubId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,user:email`;
  return c.json({ url });
});

app.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  const { GITHUB_ID, GITHUB_SECRET } = process.env;
  
  if (!code || !GITHUB_ID || !GITHUB_SECRET) {
    return c.json({ error: 'Missing parameters' }, 400);
  }
  
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: GITHUB_ID, client_secret: GITHUB_SECRET, code }),
    });
    
    const { access_token } = await tokenRes.json();
    if (!access_token) return c.json({ error: 'Failed to get token' }, 400);
    
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
    
    return c.json({ user: { id: user.id, name: user.name, avatar: user.avatar, email: user.email }, token });
  } catch (err) {
    console.error(err);
    return c.json({ error: 'OAuth failed' }, 500);
  }
});

export default app;
