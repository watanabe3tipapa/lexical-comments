import { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_FILE = '/tmp/users.json';

interface User {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  createdAt: string;
}

interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

interface DataStore {
  users: User[];
  sessions: Session[];
}

function readData(): DataStore {
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return { users: [], sessions: [] };
  }
}

function writeData(data: DataStore): void {
  writeFileSync(DATA_FILE, JSON.stringify(data));
}

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

      const data = readData();

      const user: User = {
        id: generateId(),
        name: name || 'Anonymous',
        createdAt: new Date().toISOString(),
      };

      data.users.push(user);

      const session: Session = {
        token: generateId(),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      data.sessions.push(session);
      writeData(data);

      return res.json({
        user: { id: user.id, name: user.name, avatar: user.avatar, email: user.email },
        token: session.token
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
