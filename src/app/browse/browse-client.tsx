'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimeCard } from '@/components/anime-card';
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Isekai', 'Mecha', 'Mystery', 'Psychological',
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural',
];

const STATUSES = ['Ongoing', 'Completed', 'Upcoming'];
const TYPES = ['TV', 'Movie', 'OVA', 'Special', 'ONA'];

interface Anime {
  id: string;
  title: string;
  image: string;
  rating: number;
  episodes: number;
  type: string;
  status: string;
}

interface BrowseClientProps {
  initialData: { data: Anime[]; total: number; page: number; totalPages: number };
}

export function BrowseClient({ initialData }: BrowseClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const genre = searchParams.get('genre') || '';
  const status = searchParams.get('status') || '';
  const type = searchParams.get('type') || '';
  const year = searchParams.get('year') || '';
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (genre) params.set('genre', genre);
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      if (year) params.set('year', year);
      if (q) params.set('q', q);
      params.set('page', String(page));
      params.set('limit', '20');

      const res = await fetch(`/api/anime?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [genre, status, type, year, q, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`/browse?${params}`);
  }

  function clearFilters() {
    router.push('/browse');
  }

  const hasFilters = genre || status || type || year || q;

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Browse Anime</h1>
            <p className="text-muted text-sm mt-1">{data.total} anime found</p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-light rounded-lg text-sm font-medium hover:bg-surface transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasFilters && <span className="w-2 h-2 bg-primary rounded-full" />}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-surface rounded-xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <select
              value={genre}
              onChange={(e) => updateParam('genre', e.target.value)}
              className="px-3 py-2 bg-surface-light rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Genres</option>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>

            <select
              value={status}
              onChange={(e) => updateParam('status', e.target.value)}
              className="px-3 py-2 bg-surface-light rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={type}
              onChange={(e) => updateParam('type', e.target.value)}
              className="px-3 py-2 bg-surface-light rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Types</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <input
              type="number"
              placeholder="Year"
              value={year}
              onChange={(e) => updateParam('year', e.target.value)}
              className="px-3 py-2 bg-surface-light rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              min="1960"
              max="2030"
            />

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-surface rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data.data.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted text-lg">Tidak ada anime yang ditemukan</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-4 text-primary hover:underline text-sm">
                Hapus semua filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {data.data.map((anime, i) => (
              <AnimeCard
                key={anime.id}
                id={anime.id}
                title={anime.title}
                image={anime.image}
                rating={anime.rating}
                episode={anime.episodes}
                type={anime.type as "TV" | "Movie" | "OVA"}
                status={anime.status === 'Ongoing' ? 'Ongoing' : 'Completed'}
                index={i}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => updateParam('page', String(page - 1))}
              disabled={page <= 1}
              className="flex items-center gap-2 px-4 py-2 bg-surface-light rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm text-muted">
              Page {data.page} of {data.totalPages}
            </span>
            <button
              onClick={() => updateParam('page', String(page + 1))}
              disabled={page >= data.totalPages}
              className="flex items-center gap-2 px-4 py-2 bg-surface-light rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
