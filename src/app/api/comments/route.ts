import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const episodeId = req.nextUrl.searchParams.get('episodeId');
    const animeId = req.nextUrl.searchParams.get('animeId');

    const where: Record<string, unknown> = {};
    if (episodeId) where.episodeId = episodeId;
    if (animeId) where.animeId = animeId;

    const comments = await prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { username: true, image: true } },
      },
    });

    const mapped = comments.map((c) => ({
      id: c.id,
      content: c.content,
      username: c.user.username,
      createdAt: c.createdAt.toISOString(),
      likes: c.likes,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('[api/comments GET]', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { content, userId, animeId, episodeId } = await req.json();

    if (!content || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: { content, userId, animeId, episodeId },
      include: { user: { select: { username: true } } },
    });

    return NextResponse.json({
      id: comment.id,
      content: comment.content,
      username: comment.user.username,
      createdAt: comment.createdAt.toISOString(),
      likes: comment.likes,
    }, { status: 201 });
  } catch (error) {
    console.error('[api/comments POST]', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
