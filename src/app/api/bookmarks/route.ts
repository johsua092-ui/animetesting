import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: user.id },
      include: {
        anime: {
          select: { id: true, title: true, image: true, status: true, episodes: true, type: true, rating: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(bookmarks);
  } catch (error) {
    console.error('[api/bookmarks GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { animeId } = await req.json();
    if (!animeId) return NextResponse.json({ error: 'Missing animeId' }, { status: 400 });

    const existing = await prisma.bookmark.findUnique({
      where: { userId_animeId: { userId: user.id, animeId } },
    });

    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      return NextResponse.json({ bookmarked: false });
    } else {
      await prisma.bookmark.create({ data: { userId: user.id, animeId } });
      return NextResponse.json({ bookmarked: true });
    }
  } catch (error) {
    console.error('[api/bookmarks POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
