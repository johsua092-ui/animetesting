import { Hero } from "@/components/hero";
import { AnimeSection } from "@/components/anime-section";
import prisma from "@/lib/prisma";

async function getHomeData() {
  try {
    const [trendingAnime, latestEpisodes, popularAnime, movieAnime] = await Promise.all([
      prisma.anime.findMany({
        where: { trending: true },
        orderBy: { views: 'desc' },
        take: 12,
        select: { id: true, title: true, image: true, rating: true, episodes: true, type: true, status: true },
      }),
      prisma.anime.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 12,
        select: { id: true, title: true, image: true, rating: true, episodes: true, type: true, status: true },
      }),
      prisma.anime.findMany({
        orderBy: { rating: 'desc' },
        take: 12,
        select: { id: true, title: true, image: true, rating: true, episodes: true, type: true, status: true },
      }),
      prisma.anime.findMany({
        where: { type: 'Movie' },
        orderBy: { rating: 'desc' },
        take: 12,
        select: { id: true, title: true, image: true, rating: true, episodes: true, type: true, status: true },
      }),
    ]);

    return { trendingAnime, latestEpisodes, popularAnime, movieAnime };
  } catch {
    return { trendingAnime: [], latestEpisodes: [], popularAnime: [], movieAnime: [] };
  }
}

function mapAnime(anime: { id: string; title: string; image: string; rating: number; episodes: number; type: string; status: string }) {
  return {
    id: anime.id,
    title: anime.title,
    image: anime.image,
    rating: anime.rating,
    episode: anime.episodes,
    type: anime.type as "TV" | "Movie" | "OVA",
    status: anime.status === 'Ongoing' ? 'Ongoing' as const : 'Completed' as const,
  };
}

export default async function Home() {
  const { trendingAnime, latestEpisodes, popularAnime, movieAnime } = await getHomeData();

  const isEmpty = trendingAnime.length === 0 && latestEpisodes.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <Hero />

      {isEmpty ? (
        <div className="relative -mt-20 z-20 py-20 text-center">
          <p className="text-muted text-lg">Sedang memuat data anime...</p>
          <p className="text-muted text-sm mt-2">
            Jalankan sync pertama kali via{' '}
            <code className="bg-surface px-2 py-1 rounded text-primary">POST /api/admin/sync</code>
          </p>
        </div>
      ) : (
        <>
          <div className="relative -mt-20 z-20">
            <AnimeSection
              title="Trending Now"
              subtitle="Hot anime everyone is watching"
              animeList={trendingAnime.map(mapAnime)}
              icon="flame"
              viewAllHref="/browse?status=Ongoing"
              variant="slider"
            />
          </div>

          <AnimeSection
            title="Latest Episodes"
            subtitle="Fresh episodes just released"
            animeList={latestEpisodes.map(mapAnime)}
            icon="clock"
            viewAllHref="/browse"
            variant="grid"
          />

          <AnimeSection
            title="Popular Anime"
            subtitle="Top rated anime of all time"
            animeList={popularAnime.map(mapAnime)}
            icon="trending"
            viewAllHref="/browse"
            variant="grid"
          />

          <AnimeSection
            title="Anime Movies"
            subtitle="Cinematic masterpieces"
            animeList={movieAnime.map(mapAnime)}
            icon="sparkles"
            viewAllHref="/browse?type=Movie"
            variant="slider"
          />
        </>
      )}
    </div>
  );
}
