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

export const GET = (c: any) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
};

export default app;
