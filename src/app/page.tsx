'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Loader2, Play, Clock, Calendar } from 'lucide-react';

const JIKAN_BASE = 'https://api.jikan.moe/v4';

interface Anime {
  mal_id: number;
  title: string;
  image_url: string;
  score: number;
  type: string;
  episodes: number | null;
  status: string;
  url: string;
}

interface FetchedAnime {
  id: string;
  title: string;
  image: string;
  rating: number;
  episodes: number;
  type: string;
  status: string;
}

function AnimeCard({ anime }: { anime: FetchedAnime }) {
  return (
    <motion.div whileHover={{ scale: 1.05 }} className="group relative">
      <Link href={`/browse?q=${encodeURIComponent(anime.title)}`}>
        <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface">
          <Image
            src={anime.image}
            alt={anime.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-sm font-semibold text-white line-clamp-2">{anime.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span className="text-xs text-white">{anime.rating > 0 ? anime.rating.toFixed(1) : 'N/A'}</span>
              </div>
              <span className="text-xs text-gray-400">{anime.type}</span>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function HomePageContent({ dbTrending, dbLatest, dbPopular, dbMovies }: {
  dbTrending: FetchedAnime[];
  dbLatest: FetchedAnime[];
  dbPopular: FetchedAnime[];
  dbMovies: FetchedAnime[];
}) {
  const [sections, setSections] = useState<{
    trending: FetchedAnime[];
    latest: FetchedAnime[];
    popular: FetchedAnime[];
    movies: FetchedAnime[];
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmpty = dbTrending.length === 0 && dbLatest.length === 0;

  useEffect(() => {
    if (isEmpty) {
      setLoading(true);
      fetch('/api/admin/seed', { method: 'POST' })
        .then(r => r.json())
        .then(() => {
          window.location.reload();
        })
        .catch(() => {
          setError('Gagal sync. Coba refresh halaman.');
          setLoading(false);
        });
    }
  }, [isEmpty]);

  if (loading) {
    return (
      <div className="relative -mt-20 z-20 py-40 text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Memuat Anime...</h2>
        <p className="text-muted max-w-md mx-auto">
          Sedang mengambil data anime dan episode dari database. Harap tunggu beberapa saat.
        </p>
      </div>
    );
  }

  if (isEmpty && error) {
    return (
      <div className="relative -mt-20 z-20 py-20 text-center">
        <p className="text-muted text-lg mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition-colors"
        >
          Refresh
        </button>
        <p className="text-muted text-xs mt-4">
          Atau buka{' '}
          <a href="/admin/sync" className="text-primary hover:underline">/admin/sync</a>{' '}
          untuk sync manual
        </p>
      </div>
    );
  }

  if (isEmpty) return null;

  const animeData = sections || {
    trending: dbTrending,
    latest: dbLatest,
    popular: dbPopular,
    movies: dbMovies,
  };

  return (
    <>
      <div className="relative -mt-20 z-20">
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-4">Trending</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {animeData.trending.map(a => <AnimeCard key={a.id} anime={a} />)}
            </div>
          </div>
        </section>
      </div>

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Latest</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {animeData.latest.map(a => <AnimeCard key={a.id} anime={a} />)}
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Popular</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {animeData.popular.map(a => <AnimeCard key={a.id} anime={a} />)}
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Movies</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {animeData.movies.map(a => <AnimeCard key={a.id} anime={a} />)}
          </div>
        </div>
      </section>
    </>
  );
}

export default async function Home() {
  let dbTrending: FetchedAnime[] = [];
  let dbLatest: FetchedAnime[] = [];
  let dbPopular: FetchedAnime[] = [];
  let dbMovies: FetchedAnime[] = [];

  try {
    const prisma = (await import('@/lib/prisma')).default;

    const [trending, latest, popular, movies] = await Promise.all([
      prisma.anime.findMany({ where: { trending: true }, orderBy: { views: 'desc' }, take: 12 }),
      prisma.anime.findMany({ orderBy: { updatedAt: 'desc' }, take: 12 }),
      prisma.anime.findMany({ orderBy: { rating: 'desc' }, take: 12 }),
      prisma.anime.findMany({ where: { type: 'Movie' }, orderBy: { rating: 'desc' }, take: 12 }),
    ]);

    dbTrending = trending.map(a => ({ id: a.id, title: a.title, image: a.image, rating: a.rating, episodes: a.episodes, type: a.type, status: a.status }));
    dbLatest = latest.map(a => ({ id: a.id, title: a.title, image: a.image, rating: a.rating, episodes: a.episodes, type: a.type, status: a.status }));
    dbPopular = popular.map(a => ({ id: a.id, title: a.title, image: a.image, rating: a.rating, episodes: a.episodes, type: a.type, status: a.status }));
    dbMovies = movies.map(a => ({ id: a.id, title: a.title, image: a.image, rating: a.rating, episodes: a.episodes, type: a.type, status: a.status }));
  } catch {
    // ignore
  }

  return (
    <div className="min-h-screen bg-background">
      <HomePageContent
        dbTrending={dbTrending}
        dbLatest={dbLatest}
        dbPopular={dbPopular}
        dbMovies={dbMovies}
      />
    </div>
  );
}
