import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q');
    if (!q || q.trim().length === 0) {
      return NextResponse.json([]);
    }

    const results = await prisma.anime.findMany({
      where: {
        title: { contains: q.trim(), mode: 'insensitive' },
      },
      take: 10,
      select: {
        id: true,
        title: true,
        image: true,
        type: true,
        year: true,
        status: true,
      },
      orderBy: { rating: 'desc' },
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('[api/anime/search]', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
