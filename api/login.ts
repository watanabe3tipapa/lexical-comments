import { VercelRequest, VercelResponse } from '@vercel/node';

const users: Map<string, { id: string; name: string }> = new Map();
const sessions: Map<string, string> = new Map();

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method;
  const path = (req.url || '').split('?')[0];

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (path === '/api/login' && method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { name } = body || {};

      const user = {
        id: generateId(),
        name: name || 'Anonymous',
      };

      users.set(user.id, user);

      const token = generateId();
      sessions.set(token, user.id);

      return res.json({
        user: { id: user.id, name: user.name },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
