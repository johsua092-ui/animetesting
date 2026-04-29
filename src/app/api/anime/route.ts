import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const genre = searchParams.get('genre');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const yearParam = searchParams.get('year');
    const q = searchParams.get('q');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const where: Record<string, unknown> = {};
    if (genre) where.genres = { has: genre };
    if (status) where.status = status;
    if (type) where.type = type;
    if (yearParam) where.year = parseInt(yearParam);
    if (q) where.title = { contains: q, mode: 'insensitive' };

    const [anime, total] = await Promise.all([
      prisma.anime.findMany({
        where,
        orderBy: { rating: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          image: true,
          rating: true,
          episodes: true,
          type: true,
          status: true,
          year: true,
          genres: true,
          slug: true,
        },
      }),
      prisma.anime.count({ where }),
    ]);

    return NextResponse.json({
      data: anime,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[api/anime GET]', error);
    return NextResponse.json({ error: 'Failed to fetch anime' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const anime = await prisma.anime.create({
      data: { ...body, slug: body.title.toLowerCase().replace(/\s+/g, '-') },
    });
    return NextResponse.json(anime, { status: 201 });
  } catch (error) {
    console.error('[api/anime POST]', error);
    return NextResponse.json({ error: 'Failed to create anime' }, { status: 500 });
  }
}
