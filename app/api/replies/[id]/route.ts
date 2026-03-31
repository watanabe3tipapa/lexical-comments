import { NextRequest, NextResponse } from 'next/server';
import { prisma, getCurrentUser } from '@/app/api/_utils/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const reply = await prisma.reply.findUnique({ where: { id } });

    if (!reply) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    }

    if (reply.userId !== user.id) {
      return NextResponse.json({ error: 'Cannot delete other user\'s reply' }, { status: 403 });
    }

    await prisma.reply.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete reply:', error);
    return NextResponse.json({ error: 'Failed to delete reply' }, { status: 500 });
  }
}
