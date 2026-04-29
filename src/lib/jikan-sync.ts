import prisma from '@/lib/prisma';
import { searchAnime, getAnimeInfo, ConsumetEpisode } from '@/lib/consumet';

const JIKAN_BASE = 'https://api.jikan.moe/v4';

export interface JikanAnimeResponse {
  mal_id: number;
  title: string;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
  score: number | null;
  year: number | null;
  episodes: number | null;
  duration: string | null;
  status: string;
  studios: Array<{ name: string }>;
  synopsis: string | null;
  genres: Array<{ name: string }>;
  type: string | null;
}

export interface SyncResult {
  synced: number;
  errors: number;
  total: number;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRateLimit(url: string): Promise<Response> {
  const res = await fetch(url);
  if (res.status === 429) {
    await delay(1000);
    return fetch(url);
  }
  return res;
}

export function mapJikanToAnime(data: JikanAnimeResponse) {
  const title = data.title || 'Unknown';
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Map Jikan status to our status
  let status = 'Completed';
  if (data.status === 'Currently Airing') status = 'Ongoing';
  else if (data.status === 'Not yet aired') status = 'Upcoming';

  return {
    malId: data.mal_id,
    title,
    slug,
    image: data.images?.jpg?.large_image_url || data.images?.jpg?.image_url || '',
    rating: data.score ?? 0,
    year: data.year ?? 0,
    episodes: data.episodes ?? 0,
    duration: data.duration ?? null,
    status,
    studio: data.studios?.[0]?.name ?? null,
    description: data.synopsis ?? '',
    genres: data.genres?.map((g) => g.name) ?? [],
    type: data.type ?? 'TV',
  };
}

async function syncFromEndpoint(endpoint: string, syncEpisodes: boolean = false): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, errors: 0, total: 0 };

  try {
    const res = await fetchWithRateLimit(`${JIKAN_BASE}${endpoint}`);
    if (!res.ok) {
      console.error(`[jikan-sync] Failed to fetch ${endpoint}: ${res.status}`);
      return result;
    }

    const json = await res.json();
    const items: JikanAnimeResponse[] = json.data ?? [];
    result.total = items.length;

    for (const item of items) {
      try {
        const data = mapJikanToAnime(item);
        const anime = await prisma.anime.upsert({
          where: { malId: data.malId },
          update: {
            title: data.title,
            image: data.image,
            rating: data.rating,
            year: data.year,
            episodes: data.episodes,
            duration: data.duration,
            status: data.status,
            studio: data.studio,
            description: data.description,
            genres: data.genres,
            type: data.type,
          },
          create: data,
        });
        result.synced++;

        if (syncEpisodes) {
          const epResult = await syncEpisodesFromConsumet(anime.id, anime.title);
          console.log(`[jikan-sync] Episodes for ${anime.title}: ${epResult.synced} synced, ${epResult.errors} errors`);
          await delay(500);
        }
      } catch (err) {
        console.error(`[jikan-sync] Error upserting malId=${item.mal_id}:`, err);
        result.errors++;
      }

      await delay(400);
    }
  } catch (err) {
    console.error(`[jikan-sync] Fatal error for ${endpoint}:`, err);
  }

  return result;
}

export async function syncTopAnime(syncEpisodes: boolean = false): Promise<SyncResult> {
  return syncFromEndpoint('/top/anime?limit=25', syncEpisodes);
}

export async function syncSeasonalAnime(syncEpisodes: boolean = false): Promise<SyncResult> {
  return syncFromEndpoint('/seasons/now?limit=25', syncEpisodes);
}

export async function syncAll(syncEpisodes: boolean = false): Promise<SyncResult> {
  const [top, seasonal] = await Promise.all([
    syncTopAnime(syncEpisodes),
    syncSeasonalAnime(syncEpisodes),
  ]);

  return {
    synced: top.synced + seasonal.synced,
    errors: top.errors + seasonal.errors,
    total: top.total + seasonal.total,
  };
}

export interface EpisodeSyncResult {
  synced: number;
  errors: number;
}

export async function syncEpisodesFromConsumet(animeId: string, animeTitle: string): Promise<EpisodeSyncResult> {
  const result: EpisodeSyncResult = { synced: 0, errors: 0 };
  
  try {
    const searchResults = await searchAnime(animeTitle);
    if (searchResults.length === 0) {
      console.error(`[jikan-sync] No Consumet results for: ${animeTitle}`);
      return result;
    }
    
    const consumetId = searchResults[0].id;
    const info = await getAnimeInfo(consumetId);
    
    if (!info || !info.episodes.length) {
      console.error(`[jikan-sync] No episodes found for: ${animeTitle}`);
      return result;
    }
    
    for (const ep of info.episodes) {
      try {
        await prisma.episode.upsert({
          where: {
            animeId_number: {
              animeId,
              number: ep.number,
            },
          },
          update: {
            title: ep.title || `Episode ${ep.number}`,
            thumbnail: ep.image,
            consumetId: ep.id,
          },
          create: {
            animeId,
            number: ep.number,
            title: ep.title || `Episode ${ep.number}`,
            thumbnail: ep.image,
            consumetId: ep.id,
          },
        });
        result.synced++;
        
        await delay(200);
      } catch (err) {
        console.error(`[jikan-sync] Error syncing episode ${ep.number}:`, err);
        result.errors++;
      }
    }
  } catch (err) {
    console.error(`[jikan-sync] Fatal error syncing episodes for ${animeTitle}:`, err);
  }
  
  return result;
}

export async function syncAllWithEpisodes(): Promise<{
  anime: SyncResult;
  episodes: EpisodeSyncResult;
}> {
  const animeResult = await syncAll();
  
  const allAnime = await prisma.anime.findMany({
    select: { id: true, title: true },
  });
  
  let totalEpisodesSynced = 0;
  let totalEpisodeErrors = 0;
  
  for (const anime of allAnime) {
    const epResult = await syncEpisodesFromConsumet(anime.id, anime.title);
    totalEpisodesSynced += epResult.synced;
    totalEpisodeErrors += epResult.errors;
    
    await delay(500);
  }
  
  return {
    anime: animeResult,
    episodes: {
      synced: totalEpisodesSynced,
      errors: totalEpisodeErrors,
    },
  };
}
