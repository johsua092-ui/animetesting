'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star, Play, Loader2, RefreshCw } from 'lucide-react';

const JIKAN_BASE = 'https://api.jikan.moe/v4';

interface Anime {
  id: string;
  malId: number;
  title: string;
  image: string;
  rating: number;
  type: string;
  status: string;
  year: number;
}

export default function HomePage() {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    // 1. Try DB first
    try {
      const res = await fetch('/api/anime?limit=24');
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        setAnimeList(json.data);
        setLoading(false);
        return;
      }
    } catch {
      // DB empty or error
    }

    // 2. Fallback: seed first, then show Jikan data directly
    setSeeding(true);
    try {
      const seedRes = await fetch('/api/admin/seed', { method: 'POST' });
      const seedData = await seedRes.json();

      if (seedData.error) {
        setError('Gagal seed database: ' + seedData.error);
        setSeeding(false);
        setLoading(false);
        return;
      }

      // After seed, try DB again
      const res2 = await fetch('/api/anime?limit=24');
      const json2 = await res2.json();
      if (json2.data && json2.data.length > 0) {
        setAnimeList(json2.data);
        setLoading(false);
        setSeeding(false);
        return;
      }

      // Still empty, fetch from Jikan directly
      const jikanRes = await fetch(`${JIKAN_BASE}/top/anime?limit=24`);
      const jikanJson = await jikanRes.json();
      const jikanAnime = (jikanJson.data || []).map((item: any) => ({
        id: String(item.mal_id),
        malId: item.mal_id,
        title: item.title,
        image: item.images?.jpg?.image_url || '',
        rating: item.score || 0,
        type: item.type || 'TV',
        status: item.status === 'Currently Airing' ? 'Ongoing' : item.status === 'Not yet aired' ? 'Upcoming' : 'Completed',
        year: item.year || new Date().getFullYear(),
      }));
      setAnimeList(jikanAnime);
      setLoading(false);
      setSeeding(false);
    } catch (err: any) {
      setError('Gagal memuat anime: ' + err.message);
      setLoading(false);
      setSeeding(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <h2 className="text-xl font-bold text-foreground">Memuat Anime...</h2>
        {seeding && (
          <p className="text-muted text-sm">Sedang mengisi database dengan anime terbaru.</p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error}</p>
        <button onClick={fetchData} className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" /> Coba Lagi
        </button>
        <p className="text-muted text-xs">Pastikan DATABASE_URL sudah diset di Vercel Environment Variables.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Oxnime</h1>
            <p className="text-muted mt-1">Nonton anime gratis!</p>
          </div>
          <Link href="/browse" className="px-4 py-2 bg-surface-light hover:bg-surface text-foreground rounded-lg transition-colors text-sm">
            Browse All
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {animeList.map((anime) => (
            <motion.div key={anime.malId || anime.id} whileHover={{ scale: 1.05 }} className="group">
              <Link href={`/anime/${anime.malId}`}>
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface">
                  <Image src={anime.image} alt={anime.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
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
          ))}
        </div>
      </div>
    </div>
  );
}
