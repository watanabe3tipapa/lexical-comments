import { NextRequest, NextResponse } from 'next/server';
import { prisma, getCurrentUser } from '@/app/api/_utils/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const documentId = searchParams.get('documentId') || 'default';

  try {
    const comments = await prisma.comment.findMany({
      where: { documentId },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(comments.map(comment => ({
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
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { content, selectedText, documentId = 'default' } = await request.json();

    if (!content || !selectedText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newComment = await prisma.comment.create({
      data: {
        content,
        selectedText,
        userId: user.id,
        userName: user.name,
        userImage: user.avatar,
        documentId,
      },
    });

    return NextResponse.json({
      id: newComment.id,
      content: newComment.content,
      selectedText: newComment.selectedText,
      userId: newComment.userId,
      userName: newComment.userName,
      userImage: newComment.userImage,
      resolved: newComment.resolved,
      createdAt: newComment.createdAt.toISOString(),
      replies: [],
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
