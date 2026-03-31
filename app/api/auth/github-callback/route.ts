import { NextRequest, NextResponse } from 'next/server';
import { prisma, createSession } from '@/app/api/_utils/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const githubId = process.env.GITHUB_ID;
  const githubSecret = process.env.GITHUB_SECRET;

  if (!code || !githubId || !githubSecret) {
    return new NextResponse(`
      <html>
        <head><title>Error</title></head>
        <body>
          <h1>OAuth Error</h1>
          <p>Missing required parameters.</p>
          <script>
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
    `, { status: 400, headers: { 'Content-Type': 'text/html' } });
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
      throw new Error('Failed to get access token');
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

    const token = await createSession(user.id);

    const userData = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      email: user.email,
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Login Success</title>
        </head>
        <body>
          <h1>Login successful!</h1>
          <p>You can close this window.</p>
          <script>
            localStorage.setItem('gh_token', '${token}');
            localStorage.setItem('gh_user', JSON.stringify(${JSON.stringify(userData)}));
            window.close();
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Set-Cookie': `session_token=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; Path=/`,
      },
    });
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return new NextResponse(`
      <html>
        <head><title>Error</title></head>
        <body>
          <h1>OAuth Error</h1>
          <p>Authentication failed. Please try again.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `, { status: 500, headers: { 'Content-Type': 'text/html' } });
  }
}
