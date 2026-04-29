import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: NextRequest) {
  try {
    const { animeId, episodeId, action, socketId } = await req.json();

    if (!animeId || !episodeId || !action || !socketId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const channel = `episode-${animeId}-${episodeId}`;

    if (action === 'join') {
      await prisma.liveViewer.upsert({
        where: { socketId },
        update: { animeId, episodeId, lastPing: new Date() },
        create: { socketId, animeId, episodeId },
      });
    } else if (action === 'leave') {
      await prisma.liveViewer.deleteMany({ where: { socketId } });
    }

    const count = await prisma.liveViewer.count({
      where: { animeId, episodeId },
    });

    await pusherServer.trigger(channel, 'viewer-count', { count });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('[api/pusher/presence]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
