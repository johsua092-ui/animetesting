'use client';

import { useEffect, useState } from 'react';
import { use, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Calendar, Clock, Play, Tv, Film, Loader2, RefreshCw } from 'lucide-react';

const CONSUMET_BASE = 'https://api.consumet.org';

interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  images: { jpg: { image_url: string; large_image_url: string } };
  score: number | null;
  year: number | null;
  episodes: number | null;
  duration: string | null;
  status: string;
  studios: { name: string }[];
  synopsis: string | null;
  genres: { name: string }[];
  type: string | null;
}

interface Episode {
  id: string;
  number: number;
  title: string;
  image: string | null;
}

export default function AnimeDetailPage({ params }: { params: Promise<{ malId: string }> }) {
  const { malId } = use(params);
  const router = useRouter();

  const [anime, setAnime] = useState<JikanAnime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEp, setLoadingEp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`https://api.jikan.moe/v4/anime/${malId}/full`)
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setAnime(json.data);
        } else {
          setError('Anime not found');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load anime');
        setLoading(false);
      });
  }, [malId]);

  const loadEpisodes = async () => {
    if (episodes.length > 0) return;
    setLoadingEp(true);
    try {
      const res = await fetch(`${CONSUMET_BASE}/anime/gogoanime/${encodeURIComponent(anime!.title)}`);
      const json = await res.json();
      if (json.episodes) {
        setEpisodes(json.episodes.slice(0, 24));
      } else if (json.results && json.results.length > 0) {
        const infoRes = await fetch(`${CONSUMET_BASE}/anime/gogoanime/info/${json.results[0].id}`);
        const infoJson = await infoRes.json();
        if (infoJson.episodes) {
          setEpisodes(infoJson.episodes.slice(0, 24));
        }
      }
    } catch (err) {
      console.error('Failed to load episodes:', err);
    }
    setLoadingEp(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen bg-background pt-20 text-center">
        <p className="text-muted text-lg">{error || 'Anime not found'}</p>
        <Link href="/" className="mt-4 inline-block text-primary hover:underline">Back to Home</Link>
      </div>
    );
  }

  const statusColor = anime.status === 'Currently Airing' ? 'bg-green-500/20 text-green-400'
    : anime.status === 'Not yet aired' ? 'bg-yellow-500/20 text-yellow-400'
    : 'bg-blue-500/20 text-blue-400';

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <Image
          src={anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || ''}
          alt={anime.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0">
            <div className="relative w-40 sm:w-48 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border-2 border-surface-light">
              <Image src={anime.images?.jpg?.image_url || ''} alt={anime.title} fill className="object-cover" />
            </div>
          </div>

          <div className="flex-1 pt-4 md:pt-16">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{anime.title}</h1>
            {anime.title_english && anime.title_english !== anime.title && (
              <p className="text-muted mt-1">{anime.title_english}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-4 text-sm">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold">{anime.score ? anime.score.toFixed(1) : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1 text-muted">
                <Calendar className="w-4 h-4" />
                <span>{anime.year || 'Unknown'}</span>
              </div>
              {anime.duration && (
                <div className="flex items-center gap-1 text-muted">
                  <Clock className="w-4 h-4" />
                  <span>{anime.duration}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-muted">
                {anime.type === 'Movie' ? <Film className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
                <span>{anime.type || 'TV'}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                {anime.status === 'Currently Airing' ? 'Ongoing' : anime.status === 'Not yet aired' ? 'Upcoming' : 'Completed'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {anime.genres?.map((g) => (
                <Link
                  key={g.name}
                  href={`/browse?genre=${encodeURIComponent(g.name)}`}
                  className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-full border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  {g.name}
                </Link>
              ))}
            </div>

            {anime.studios?.[0] && (
              <p className="text-sm text-muted mt-3">Studio: <span className="text-foreground">{anime.studios[0].name}</span></p>
            )}

            <p className="text-sm text-muted mt-4 leading-relaxed line-clamp-4">{anime.synopsis}</p>

            <div className="mt-5">
              <button
                onClick={loadEpisodes}
                disabled={loadingEp}
                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition-colors disabled:opacity-50"
              >
                {loadingEp ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
                {loadingEp ? 'Loading Episodes...' : 'Find Episodes'}
              </button>
            </div>
          </div>
        </div>

        {episodes.length > 0 && (
          <div className="mt-10 mb-16">
            <h2 className="text-xl font-bold mb-4">
              Episodes <span className="text-muted text-base font-normal">({episodes.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {episodes.map((ep) => (
                <Link
                  key={ep.id}
                  href={`/watch/${malId}/${ep.number}`}
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-surface-light transition-colors group"
                >
                  <div className="relative w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-surface-light">
                    {ep.image ? (
                      <Image src={ep.image} alt={`EP ${ep.number}`} fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-6 h-6 text-muted group-hover:text-primary transition-colors" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-primary font-medium">EP {ep.number}</span>
                    <p className="text-sm font-medium truncate">{ep.title || `Episode ${ep.number}`}</p>
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
