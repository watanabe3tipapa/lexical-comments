import { NextResponse } from 'next/server';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export async function GET() {
  const githubId = process.env.GITHUB_ID;
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!githubId) {
    return NextResponse.json(
      { error: 'GitHub OAuth not configured. Set GITHUB_ID in environment variables.' },
      { status: 400 }
    );
  }

  if (!appUrl) {
    return NextResponse.json(
      { error: 'APP_URL is not configured.' },
      { status: 400 }
    );
  }

  const state = generateId();
  const redirectUri = `${appUrl}/api/auth/github-callback`;

  const url = `https://github.com/login/oauth/authorize?client_id=${githubId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,user:email&state=${state}`;

  return NextResponse.json({ url, state });
}
