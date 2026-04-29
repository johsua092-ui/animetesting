'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Play, Search, Loader2 } from 'lucide-react';

const JIKAN_BASE = 'https://api.jikan.moe/v4';

interface AnimeResult {
  mal_id: number;
  title: string;
  images: { jpg: { image_url: string } };
  score: number | null;
  type: string;
  episodes: number | null;
  status: string;
}

export function BrowseClient() {
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [results, setResults] = useState<AnimeResult[]>([]);
  const [loading, setLoading] = useState(false);

  const searchAnime = useCallback(async (q: string) => {
    setLoading(true);
    try {
      let url = `${JIKAN_BASE}/top/anime?limit=50&filter=bypopularity`;
      if (q) {
        url = `${JIKAN_BASE}/anime?q=${encodeURIComponent(q)}&limit=50&sfw=true`;
      }
      const res = await fetch(url);
      const json = await res.json();
      setResults(json.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    searchAnime(queryParam);
  }, [queryParam, searchAnime]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchAnime(searchQuery);
  };

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari anime..."
                className="w-full pl-10 pr-4 py-3 bg-surface border border-surface-light rounded-xl focus:outline-none focus:border-primary"
              />
            </div>
            <button type="submit" className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors">
              Search
            </button>
          </form>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="text-lg">Tidak ada anime ditemukan.</p>
          </div>
        ) : (
          <div>
            <p className="text-muted text-sm mb-4">{results.length} anime</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {results.map((anime) => (
                <Link key={anime.mal_id} href={`/anime/${anime.mal_id}`} className="group block">
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface">
                    <Image src={anime.images?.jpg?.image_url || ''} alt={anime.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-sm font-semibold text-white line-clamp-2">{anime.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs text-white">{anime.score ? anime.score.toFixed(1) : 'N/A'}</span>
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
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
