import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const JIKAN_BASE = 'https://api.jikan.moe/v4';

export async function POST() {
  try {
    const [airingRes, upcomingRes] = await Promise.all([
      fetch(`${JIKAN_BASE}/top/anime?limit=10`),
      fetch(`${JIKAN_BASE}/seasons/now?limit=10`),
    ]);

    const [airingJson, upcomingJson] = await Promise.all([
      airingRes.json(),
      upcomingRes.json(),
    ]);

    const allItems = [
      ...(airingJson.data || []),
      ...(upcomingJson.data || []),
    ];

    // Deduplicate by mal_id
    const uniqueMap = new Map();
    for (const item of allItems) {
      if (!uniqueMap.has(item.mal_id)) {
        uniqueMap.set(item.mal_id, item);
      }
    }

    const items = Array.from(uniqueMap.values());
    let synced = 0;
    let errors = 0;

    for (const item of items) {
      try {
        const title = item.title || 'Unknown';
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        let status = 'Completed';
        if (item.status === 'Currently Airing') status = 'Ongoing';
        else if (item.status === 'Not yet aired') status = 'Upcoming';

        const image = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '';

        await prisma.anime.upsert({
          where: { malId: item.mal_id },
          update: {
            title, slug, image,
            rating: item.score ?? 0,
            year: item.year ?? new Date().getFullYear(),
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
            rating: item.score ?? 0, year: item.year ?? new Date().getFullYear(),
            episodes: item.episodes ?? 0, duration: item.duration ?? null,
            status, studio: item.studios?.[0]?.name ?? null,
            description: item.synopsis ?? '',
            genres: item.genres?.map((g: { name: string }) => g.name) ?? [],
            type: item.type ?? 'TV',
          },
        });
        synced++;
      } catch {
        errors++;
      }
    }

    return NextResponse.json({ animeSynced: synced, errors, message: 'Seeded successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
