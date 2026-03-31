import { NextRequest, NextResponse } from 'next/server';
import { prisma, getCurrentUser } from '@/app/api/_utils/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { content } = await request.json();

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
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

    return NextResponse.json({
      id: newReply.id,
      content: newReply.content,
      userId: newReply.userId,
      userName: newReply.userName,
      userImage: newReply.userImage,
      createdAt: newReply.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create reply:', error);
    return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
  }
}
