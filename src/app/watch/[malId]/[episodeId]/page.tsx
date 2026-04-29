'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { use, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Hls from 'hls.js';
import { Loader2, Play, SkipBack, SkipForward } from 'lucide-react';

const CONSUMET_BASE = 'https://api.consumet.org';

export default function WatchPage({ params }: { params: Promise<{ malId: string; episodeId: string }> }) {
  const { malId, episodeId } = use(params);
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  const [title, setTitle] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState(parseInt(episodeId));
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEpisode = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get anime info from Jikan
        const jikanRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
        const jikanJson = await jikanRes.json();
        const animeTitle = jikanJson.data?.title;
        setTitle(animeTitle || 'Unknown');

        // Search on Consumet
        const searchRes = await fetch(`${CONSUMET_BASE}/anime/gogoanime/${encodeURIComponent(animeTitle)}`);
        const searchJson = await searchRes.json();

        let consumetId: string;
        if (searchJson.episodes) {
          // Direct info response
          const ep = searchJson.episodes.find((e: any) => e.number === episodeNumber);
          if (!ep) {
            setError(`Episode ${episodeNumber} not found`);
            setLoading(false);
            return;
          }
          consumetId = ep.id;
          setEpisodes(searchJson.episodes);
        } else {
          // Search results
          const results = searchJson.results;
          if (!results || results.length === 0) {
            setError('Anime not found on streaming source');
            setLoading(false);
            return;
          }

          // Get episode info
          const infoRes = await fetch(`${CONSUMET_BASE}/anime/gogoanime/info/${results[0].id}`);
          const infoJson = await infoRes.json();

          const ep = infoJson.episodes?.find((e: any) => e.number === episodeNumber);
          if (!ep) {
            setError(`Episode ${episodeNumber} not found`);
            setLoading(false);
            return;
          }
          consumetId = ep.id;
          setEpisodes(infoJson.episodes || []);
        }

        // Get stream URL
        const streamRes = await fetch(`${CONSUMET_BASE}/anime/gogoanime/watch/${consumetId}`);
        const streamJson = await streamRes.json();

        const sources = streamJson.sources || [];
        const m3u8 = sources.find((s: any) => s.isM3U8);
        const url = m3u8?.url || sources[0]?.url;

        if (!url) {
          setError('No stream available');
          setLoading(false);
          return;
        }

        setStreamUrl(url);
      } catch (err) {
        setError('Failed to load stream');
      }
      setLoading(false);
    };

    loadEpisode();
  }, [malId, episodeId]);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    let destroyed = false;

    const initHls = async () => {
      const HlsModule = await import('hls.js');
      const Hls = HlsModule.default;

      if (!Hls.isSupported()) {
        if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = streamUrl;
          videoRef.current.play().catch(() => {});
        }
        return;
      }

      if (hlsRef.current) hlsRef.current.destroy();

      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!destroyed) videoRef.current?.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            hls.destroy();
          }
        }
      });
    };

    if (streamUrl.includes('.m3u8')) {
      initHls();
    } else {
      videoRef.current.src = streamUrl;
      videoRef.current.play().catch(() => {});
    }

    return () => {
      destroyed = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl]);

  const prevEp = episodes.find((e) => e.number === episodeNumber - 1);
  const nextEp = episodes.find((e) => e.number === episodeNumber + 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pt-20 text-center">
        <p className="text-muted text-lg">{error}</p>
        <Link href={`/anime/${malId}`} className="mt-4 inline-block text-primary hover:underline">Back to Anime</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 text-sm text-muted mb-4">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href={`/anime/${malId}`} className="hover:text-foreground">{title}</Link>
          <span>/</span>
          <span className="text-foreground">Episode {episodeNumber}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              {streamUrl ? (
                <video ref={videoRef} className="w-full h-full" controls playsInline title={`${title} Episode ${episodeNumber}`} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">{title} — Episode {episodeNumber}</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => prevEp && router.push(`/watch/${malId}/${prevEp.number}`)}
                  disabled={!prevEp}
                  className="flex items-center gap-1 px-3 py-2 bg-surface-light rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <SkipBack className="w-4 h-4" /> Prev
                </button>
                <button
                  onClick={() => nextEp && router.push(`/watch/${malId}/${nextEp.number}`)}
                  disabled={!nextEp}
                  className="flex items-center gap-1 px-3 py-2 bg-surface-light rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-surface rounded-xl p-4 sticky top-24">
              <h2 className="font-semibold mb-4">Episodes ({episodes.length})</h2>
              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {episodes.map((ep) => (
                  <Link key={ep.id} href={`/watch/${malId}/${ep.number}`}>
                    <div className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                      ep.number === episodeNumber ? 'bg-primary/20 border border-primary/30' : 'hover:bg-surface-light'
                    }`}>
                      <span className="text-xs text-primary font-medium">EP {ep.number}</span>
                      <span className="text-sm truncate">{ep.title || `Episode ${ep.number}`}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
