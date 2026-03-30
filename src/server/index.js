import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { prisma } from './db.js';
import 'dotenv/config';
const app = new Hono();
app.use('*', cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
}));
app.get('/api/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}
function getSessionToken(c) {
    const auth = c.req.header('Authorization');
    if (auth && auth.startsWith('Bearer ')) {
        return auth.substring(7);
    }
    const cookie = c.req.header('Cookie') || '';
    const match = cookie.match(/session_token=([^;]+)/);
    return match ? match[1] : null;
}
async function getCurrentUser(c) {
    const token = getSessionToken(c);
    if (!token)
        return null;
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
        if (!user)
            return null;
        return {
            id: user.id,
            name: user.name,
            avatar: user.avatar || undefined,
            email: user.email || undefined,
        };
    }
    catch (error) {
        console.error('Session error:', error);
        return null;
    }
}
app.post('/api/auth/login', async (c) => {
    const body = await c.req.json();
    const { name } = body;
    const id = generateId();
    const user = await prisma.user.upsert({
        where: { id },
        update: { name },
        create: {
            id,
            name,
        },
    });
    const token = generateId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
        data: { token, userId: user.id, expiresAt },
    });
    return c.json({
        user: {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            email: user.email,
        },
        token
    });
});
app.get('/api/auth/github', (c) => {
    const githubId = process.env.GITHUB_ID;
    const redirectUri = `http://localhost:3001/api/auth/github/callback`;
    if (!githubId) {
        return c.json({ error: 'GitHub OAuth not configured. Set GITHUB_ID in .env' }, 400);
    }
    const state = generateId();
    const url = `https://github.com/login/oauth/authorize?client_id=${githubId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,user:email&state=${state}`;
    return c.json({ url, state });
});
app.get('/api/auth/github/callback', async (c) => {
    const code = c.req.query('code');
    const githubId = process.env.GITHUB_ID;
    const githubSecret = process.env.GITHUB_SECRET;
    if (!code || !githubId || !githubSecret) {
        return c.json({ error: 'Missing parameters' }, 400);
    }
    try {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: githubId,
                client_secret: githubSecret,
                code,
            }),
        });
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) {
            return c.json({ error: 'Failed to get access token' }, 400);
        }
        const userRes = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
            },
        });
        const githubUser = await userRes.json();
        const user = await prisma.user.upsert({
            where: { id: githubUser.id.toString() },
            update: {
                name: githubUser.name || githubUser.login,
                avatar: githubUser.avatar_url,
                email: githubUser.email,
            },
            create: {
                id: githubUser.id.toString(),
                name: githubUser.name || githubUser.login,
                avatar: githubUser.avatar_url,
                email: githubUser.email,
            },
        });
        const token = generateId();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await prisma.session.create({
            data: { token, userId: user.id, expiresAt },
        });
        return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GitHub OAuth Success</title>
          <script>
            localStorage.setItem('gh_token', '${token}');
            localStorage.setItem('gh_user', JSON.stringify(${JSON.stringify({
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            email: user.email,
        })}));
            window.close();
          </script>
        </head>
        <body>
          <p>Login successful! You can close this window.</p>
        </body>
      </html>
    `);
    }
    catch (error) {
        console.error('GitHub OAuth error:', error);
        return c.json({ error: 'OAuth failed' }, 500);
    }
});
app.get('/api/auth/session', async (c) => {
    const user = await getCurrentUser(c);
    if (user) {
        return c.json({ user });
    }
    return c.json({ user: null });
});
app.post('/api/auth/logout', async (c) => {
    const token = getSessionToken(c);
    if (token) {
        await prisma.session.deleteMany({ where: { token } });
    }
    return c.json({ success: true });
});
app.get('/api/comments', async (c) => {
    const documentId = c.req.query('documentId') || 'default';
    const comments = await prisma.comment.findMany({
        where: { documentId },
        include: {
            replies: {
                orderBy: { createdAt: 'asc' },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    return c.json(comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        selectedText: comment.selectedText,
        userId: comment.userId,
        userName: comment.userName,
        userImage: comment.userImage,
        resolved: comment.resolved,
        createdAt: comment.createdAt.toISOString(),
        replies: comment.replies.map(reply => ({
            id: reply.id,
            content: reply.content,
            userId: reply.userId,
            userName: reply.userName,
            userImage: reply.userImage,
            createdAt: reply.createdAt.toISOString(),
        })),
    })));
});
app.post('/api/comments', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const body = await c.req.json();
    const { content, selectedText, documentId = 'default' } = body;
    const newComment = await prisma.comment.create({
        data: {
            content,
            selectedText,
            userId: user.id,
            userName: user.name,
            userImage: user.avatar,
            documentId,
        },
        include: {
            replies: true,
        },
    });
    return c.json({
        id: newComment.id,
        content: newComment.content,
        selectedText: newComment.selectedText,
        userId: newComment.userId,
        userName: newComment.userName,
        userImage: newComment.userImage,
        resolved: newComment.resolved,
        createdAt: newComment.createdAt.toISOString(),
        replies: [],
    }, 201);
});
app.patch('/api/comments/:id/resolve', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const id = c.req.param('id');
    const { resolved } = await c.req.json();
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
        return c.json({ error: 'Comment not found' }, 404);
    }
    const updated = await prisma.comment.update({
        where: { id },
        data: { resolved },
    });
    return c.json({
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        replies: [],
    });
});
app.delete('/api/comments/:id', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const id = c.req.param('id');
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
        return c.json({ error: 'Comment not found' }, 404);
    }
    if (comment.userId !== user.id) {
        return c.json({ error: 'Cannot delete other user\'s comment' }, 403);
    }
    await prisma.comment.delete({ where: { id } });
    return c.json({ success: true });
});
app.post('/api/comments/:id/replies', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const id = c.req.param('id');
    const body = await c.req.json();
    const { content } = body;
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
        return c.json({ error: 'Comment not found' }, 404);
    }
    const newReply = await prisma.reply.create({
        data: {
            content,
            userId: user.id,
            userName: user.name,
            userImage: user.avatar,
            commentId: id,
        },
    });
    return c.json({
        id: newReply.id,
        content: newReply.content,
        userId: newReply.userId,
        userName: newReply.userName,
        userImage: newReply.userImage,
        createdAt: newReply.createdAt.toISOString(),
    }, 201);
});
app.delete('/api/replies/:id', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const id = c.req.param('id');
    const reply = await prisma.reply.findUnique({ where: { id } });
    if (!reply) {
        return c.json({ error: 'Reply not found' }, 404);
    }
    if (reply.userId !== user.id) {
        return c.json({ error: 'Cannot delete other user\'s reply' }, 403);
    }
    await prisma.reply.delete({ where: { id } });
    return c.json({ success: true });
});
const port = 3001;
console.log(`API Server running on http://localhost:${port}`);
serve({
    fetch: app.fetch,
    port,
});
export default app;
