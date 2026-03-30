import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.path || '/';
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', 'https://lexical-comments.vercel.app');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (path === '/api/health' && method === 'GET') {
      return res.json({ status: 'ok' });
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const { name } = req.body;
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

      return res.json({
        user: { id: user.id, name: user.name, avatar: user.avatar, email: user.email },
        token
      });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
