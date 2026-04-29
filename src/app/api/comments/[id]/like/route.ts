import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const comment = await prisma.comment.update({
      where: { id },
      data: { likes: { increment: 1 } },
      select: { likes: true },
    });
    return NextResponse.json(comment);
  } catch (error) {
    console.error('[api/comments/like]', error);
    return NextResponse.json({ error: 'Failed to like comment' }, { status: 500 });
  }
}
