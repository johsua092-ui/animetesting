import { NextRequest, NextResponse } from 'next/server';
import { searchAnime, getAnimeInfo, getEpisodeStreams, findBestStreamUrl } from '@/lib/consumet';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  
  if (action === 'search') {
    const query = searchParams.get('query');
    if (!query) {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
    }
    const results = await searchAnime(query);
    return NextResponse.json(results);
  }
  
  if (action === 'episodes') {
    const animeId = searchParams.get('animeId');
    if (!animeId) {
      return NextResponse.json({ error: 'Missing animeId parameter' }, { status: 400 });
    }
    const info = await getAnimeInfo(animeId);
    if (!info) {
      return NextResponse.json({ error: 'Anime not found' }, { status: 404 });
    }
    return NextResponse.json(info);
  }
  
  if (action === 'watch') {
    const episodeId = searchParams.get('episodeId');
    if (!episodeId) {
      return NextResponse.json({ error: 'Missing episodeId parameter' }, { status: 400 });
    }
    const stream = await getEpisodeStreams(episodeId);
    const videoUrl = findBestStreamUrl(stream);
    if (!videoUrl) {
      return NextResponse.json({ error: 'No stream available' }, { status: 404 });
    }
    return NextResponse.json({ 
      videoUrl,
      headers: stream?.headers || { Referer: 'https://gogoanime.com' },
    });
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, animeTitle, animeId } = body;
  
  if (action === 'sync') {
    if (!animeTitle || !animeId) {
      return NextResponse.json({ error: 'Missing animeTitle or animeId' }, { status: 400 });
    }
    
    const results = await searchAnime(animeTitle);
    if (results.length === 0) {
      return NextResponse.json({ error: 'No results from Consumet' }, { status: 404 });
    }
    
    const consumetId = results[0].id;
    const info = await getAnimeInfo(consumetId);
    
    if (!info) {
      return NextResponse.json({ error: 'Failed to get anime info' }, { status: 500 });
    }
    
    const episodes = await Promise.all(
      info.episodes.map(async (ep) => {
        const existing = await prisma.episode.findFirst({
          where: { animeId, number: ep.number },
        });
        
        if (existing) {
          return await prisma.episode.update({
            where: { id: existing.id },
            data: {
              consumetId: ep.id,
              title: ep.title || existing.title,
              thumbnail: ep.image || existing.thumbnail,
            },
          });
        }
        
        return await prisma.episode.create({
          data: {
            animeId,
            number: ep.number,
            title: ep.title || `Episode ${ep.number}`,
            thumbnail: ep.image,
            consumetId: ep.id,
          },
        });
      })
    );
    
    return NextResponse.json({ 
      message: 'Episodes synced', 
      count: episodes.length,
      consumetId,
    });
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
