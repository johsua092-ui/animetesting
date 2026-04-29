import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const episodes = await prisma.episode.findMany({
      where: { animeId: id },
      orderBy: { number: 'asc' }
    });
    return NextResponse.json(episodes);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const episode = await prisma.episode.create({
      data: { ...body, animeId: id }
    });
    return NextResponse.json(episode, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create episode' }, { status: 500 });
  }
}
