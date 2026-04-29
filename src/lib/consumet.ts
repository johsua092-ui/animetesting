const CONSUMET_BASE = 'https://api.consumet.org';
const PROVIDER = 'gogoanime';

export interface ConsumetEpisode {
  id: string;
  number: number;
  title: string;
  url: string;
  image: string | null;
}

export interface ConsumetStream {
  headers?: {
    Referer: string;
  };
  sources: Array<{
    url: string;
    quality: string;
    isM3U8: boolean;
  }>;
  download: string | null;
}

export interface ConsumetSearchResult {
  id: string;
  title: string;
  url: string;
  image: string;
  releaseDate: string | null;
  subOrDub: 'sub' | 'dub';
}

export async function searchAnime(query: string): Promise<ConsumetSearchResult[]> {
  try {
    const res = await fetch(`${CONSUMET_BASE}/anime/${PROVIDER}/${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.results || [];
  } catch {
    return [];
  }
}

export async function getAnimeInfo(animeId: string): Promise<{
  episodes: ConsumetEpisode[];
  title: string;
  image: string;
  description: string | null;
  releaseDate: string | null;
  status: string | null;
  genres: string[];
} | null> {
  try {
    const res = await fetch(`${CONSUMET_BASE}/anime/${PROVIDER}/info/${animeId}`);
    if (!res.ok) return null;
    const json = await res.json();
    return {
      episodes: json.episodes || [],
      title: json.title || '',
      image: json.image || '',
      description: json.description || null,
      releaseDate: json.releaseDate || null,
      status: json.status || null,
      genres: json.genres || [],
    };
  } catch {
    return null;
  }
}

export async function getEpisodeStreams(episodeId: string): Promise<ConsumetStream | null> {
  try {
    const res = await fetch(`${CONSUMET_BASE}/anime/${PROVIDER}/watch/${episodeId}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json;
  } catch {
    return null;
  }
}

export function findBestStreamUrl(stream: ConsumetStream | null): string | null {
  if (!stream || !stream.sources || stream.sources.length === 0) return null;
  
  // Prefer m3u8 (HLS) streams for better quality/adaptivity
  const m3u8 = stream.sources.find(s => s.isM3U8);
  if (m3u8) return m3u8.url;
  
  // Fallback to highest quality
  const qualityOrder = ['1080p', '720p', '480p', '360p', 'default'];
  for (const q of qualityOrder) {
    const found = stream.sources.find(s => s.quality === q);
    if (found) return found.url;
  }
  
  return stream.sources[0]?.url || null;
}
