'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Calendar, Clock, Play, Tv, Film, RefreshCw, Loader2 } from 'lucide-react';
import { BookmarkButton } from '@/components/bookmark-button';

interface Episode {
  id: string;
  number: number;
  title: string;
  thumbnail: string | null;
  duration: string | null;
}

interface Anime {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  coverImage: string | null;
  rating: number;
  year: number;
  episodes: number;
  duration: string | null;
  status: string;
  studio: string | null;
  description: string;
  genres: string[];
  type: string;
  episodeList: Episode[];
}

interface PageProps {
  params: { id: string };
}

export default function AnimeDetailPage({ params }: PageProps) {
  const { id } = params;
  const [anime, setAnime] = useState<Anime | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/anime/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          notFound();
        } else {
          setAnime(data);
          // Auto-sync episodes if none exist
          if (!data.episodeList || data.episodeList.length === 0) {
            autoSyncEpisodes(data.title, id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  const autoSyncEpisodes = async (title: string, animeId: string) => {
    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', animeTitle: title, animeId }),
      });
      const data = await res.json();
      if (!data.error) {
        const refreshRes = await fetch(`/api/anime/${id}`);
        const refreshData = await refreshRes.json();
        setAnime(refreshData);
      }
    } catch {
      // silent fail - user can manually sync later
    }
  };

  const handleSyncEpisodes = async () => {
    if (!anime) return;
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          animeTitle: anime.title,
          animeId: anime.id,
        }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        setSyncError(data.error);
      } else {
        // Refresh anime data
        const refreshRes = await fetch(`/api/anime/${id}`);
        const refreshData = await refreshRes.json();
        setAnime(refreshData);
      }
    } catch (err) {
      setSyncError('Gagal sync episode');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-16 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!anime) {
    notFound();
    return null;
  }

  const statusColor =
    anime.status === 'Ongoing' ? 'bg-green-500/20 text-green-400' :
    anime.status === 'Upcoming' ? 'bg-yellow-500/20 text-yellow-400' :
    'bg-blue-500/20 text-blue-400';

  return (
    <div className="min-h-screen bg-background pt-16">
      {/* Cover Banner */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <Image
          src={anime.coverImage || anime.image}
          alt={anime.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Poster */}
          <div className="flex-shrink-0">
            <div className="relative w-40 sm:w-48 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border-2 border-surface-light">
              <Image src={anime.image} alt={anime.title} fill className="object-cover" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-4 md:pt-16">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{anime.title}</h1>
                {anime.subtitle && <p className="text-muted mt-1">{anime.subtitle}</p>}
              </div>
              <BookmarkButton animeId={anime.id} initialBookmarked={false} />
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mt-4 text-sm">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold">{anime.rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1 text-muted">
                <Calendar className="w-4 h-4" />
                <span>{anime.year}</span>
              </div>
              {anime.duration && (
                <div className="flex items-center gap-1 text-muted">
                  <Clock className="w-4 h-4" />
                  <span>{anime.duration}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-muted">
                {anime.type === 'Movie' ? <Film className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
                <span>{anime.type}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                {anime.status}
              </span>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mt-3">
              {anime.genres.map((g: string) => (
                <Link
                  key={g}
                  href={`/browse?genre=${encodeURIComponent(g)}`}
                  className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-full border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  {g}
                </Link>
              ))}
            </div>

            {/* Studio */}
            {anime.studio && (
              <p className="text-sm text-muted mt-3">Studio: <span className="text-foreground">{anime.studio}</span></p>
            )}

            {/* Description */}
            <p className="text-sm text-muted mt-4 leading-relaxed line-clamp-4">{anime.description}</p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-5">
              {anime.episodeList.length > 0 && (
                <Link href={`/watch/${anime.id}/${anime.episodeList[0].number}`} className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition-colors">
                  <Play className="w-5 h-5 fill-current" />
                  Watch Now
                </Link>
              )}
              <button
                onClick={handleSyncEpisodes}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-4 py-3 bg-surface-light hover:bg-surface text-foreground font-medium rounded-full transition-colors disabled:opacity-50"
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isSyncing ? 'Syncing...' : 'Sync Episodes'}
              </button>
            </div>

            {syncError && (
              <p className="text-sm text-red-400 mt-2">{syncError}</p>
            )}
          </div>
        </div>

        {/* Episode List */}
        <div className="mt-10 mb-16">
          <h2 className="text-xl font-bold mb-4">
            Episodes <span className="text-muted text-base font-normal">({anime.episodeList.length})</span>
          </h2>

          {anime.episodeList.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted mb-4">Belum ada episode tersedia.</p>
              <button
                onClick={handleSyncEpisodes}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sync from Consumet
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {anime.episodeList.map((ep) => (
                <Link
                  key={ep.id}
                  href={`/watch/${anime.id}/${ep.number}`}
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-surface-light transition-colors group"
                >
                  <div className="relative w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-surface-light">
                    {ep.thumbnail ? (
                      <Image src={ep.thumbnail} alt={`EP ${ep.number}`} fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-6 h-6 text-muted group-hover:text-primary transition-colors" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-primary font-medium">EP {ep.number}</span>
                    <p className="text-sm font-medium truncate">{ep.title}</p>
                    {ep.duration && <p className="text-xs text-muted">{ep.duration}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
