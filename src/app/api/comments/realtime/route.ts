import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { animeId, episodeNumber, type } = body;

    const channel = `episode-${animeId}-${episodeNumber}`;

    if (type === 'typing') {
      await pusherServer.trigger(channel, 'user-typing', {});
      return NextResponse.json({ ok: true });
    }

    // Broadcast new comment
    const { content, username, episodeId } = body;
    const comment = {
      id: Date.now().toString(),
      content,
      username: username || 'Guest',
      createdAt: 'Just now',
      likes: 0,
    };

    await pusherServer.trigger(channel, 'new-comment', comment);

    return NextResponse.json(comment);
  } catch (error) {
    console.error('[api/comments/realtime]', error);
    return NextResponse.json({ error: 'Failed to broadcast comment' }, { status: 500 });
  }
}
