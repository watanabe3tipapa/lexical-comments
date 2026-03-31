import { NextRequest, NextResponse } from 'next/server';
import { prisma, getCurrentUser } from '@/api/_utils/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { resolved } = await request.json();

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { resolved },
    });

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to update comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}
