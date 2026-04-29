import { NextRequest, NextResponse } from 'next/server';
import { searchAnime, getAnimeInfo, ConsumetEpisode } from '@/lib/consumet';
import prisma from '@/lib/prisma';

const JIKAN_BASE = 'https://api.jikan.moe/v4';

export async function GET() {
  return POST();
}

export async function POST(req?: NextRequest) {
  try {
    const result = { animeSynced: 0, episodeSynced: 0, errors: 0 };

    // 1. Fetch top anime from Jikan (only 10 for speed)
    const jikanRes = await fetch(`${JIKAN_BASE}/top/anime?limit=10&filter=airing`);
    const jikanJson = await jikanRes.json();
    const items = jikanJson.data ?? [];

    for (const item of items) {
      try {
        const title = item.title || 'Unknown';
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        let status = 'Completed';
        if (item.status === 'Currently Airing') status = 'Ongoing';
        else if (item.status === 'Not yet aired') status = 'Upcoming';

        const image = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '';

        const anime = await prisma.anime.upsert({
          where: { malId: item.mal_id },
          update: {
            title, slug, image,
            rating: item.score ?? 0,
            year: item.year ?? 0,
            episodes: item.episodes ?? 0,
            duration: item.duration ?? null,
            status,
            studio: item.studios?.[0]?.name ?? null,
            description: item.synopsis ?? '',
            genres: item.genres?.map((g: { name: string }) => g.name) ?? [],
            type: item.type ?? 'TV',
          },
          create: {
            malId: item.mal_id, title, slug, image,
            rating: item.score ?? 0, year: item.year ?? 0,
            episodes: item.episodes ?? 0, duration: item.duration ?? null,
            status, studio: item.studios?.[0]?.name ?? null,
            description: item.synopsis ?? '',
            genres: item.genres?.map((g: { name: string }) => g.name) ?? [],
            type: item.type ?? 'TV',
          },
        });
        result.animeSynced++;

        // 2. Sync episodes from Consumet
        try {
          const searchResults = await searchAnime(title);
          if (searchResults.length > 0) {
            const info = await getAnimeInfo(searchResults[0].id);
            if (info?.episodes) {
              const epCount = Math.min(info.episodes.length, 24); // Limit to 24 eps for speed
              for (let i = 0; i < epCount; i++) {
                const ep = info.episodes[i];
                await prisma.episode.upsert({
                  where: { animeId_number: { animeId: anime.id, number: ep.number } },
                  update: { title: ep.title || `Episode ${ep.number}`, thumbnail: ep.image, consumetId: ep.id },
                  create: { animeId: anime.id, number: ep.number, title: ep.title || `Episode ${ep.number}`, thumbnail: ep.image, consumetId: ep.id },
                });
                result.episodeSynced++;
              }
            }
          }
        } catch {
          result.errors++;
        }
      } catch {
        result.errors++;
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
