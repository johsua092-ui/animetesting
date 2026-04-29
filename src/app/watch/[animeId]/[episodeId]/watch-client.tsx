'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PusherClient from 'pusher-js';
import {
  ChevronLeft, MessageSquare, ThumbsUp, Share2,
  SkipBack, SkipForward, Users, Wifi, WifiOff, Play, Loader2,
} from 'lucide-react';

interface EpisodeInfo {
  id: string;
  number: number;
  title: string;
  thumbnail: string | null;
  duration: string | null;
  consumetId: string | null;
}

interface WatchClientProps {
  episode: {
    id: string;
    number: number;
    title: string;
    videoUrl: string | null;
    consumetId: string | null;
    animeId: string;
    animeName: string;
    episodes: EpisodeInfo[];
  };
}

interface Comment {
  id: string;
  content: string;
  username: string;
  createdAt: string;
  likes: number;
}

function VideoPlayer({ src, title }: { src: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  useEffect(() => {
    if (!videoRef.current || typeof window === 'undefined') return;

    const videoEl = videoRef.current;
    
    const initHls = async () => {
      const Hls = (await import('hls.js')).default;
      if (!Hls.isSupported()) {
        if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
          videoEl.src = src;
          videoEl.play().catch(() => {});
        }
        return;
      }

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoEl.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        console.error('HLS error:', data);
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

    if (src.includes('.m3u8')) {
      initHls();
    } else {
      videoEl.src = src;
      videoEl.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className="w-full h-full"
      controls
      playsInline
      title={title}
    />
  );
}

export function WatchClient({ episode }: WatchClientProps) {
  const router = useRouter();
  const { animeId, animeName, episodes, number: currentNumber, videoUrl: dbVideoUrl, consumetId } = episode;

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(1);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketId = useRef<string>(Math.random().toString(36).slice(2));

  const totalEpisodes = episodes.length;
  const prevEp = episodes.find((e) => e.number === currentNumber - 1);
  const nextEp = episodes.find((e) => e.number === currentNumber + 1);

  // Fetch streaming URL from Consumet
  useEffect(() => {
    const episodeConsumetId = consumetId || episodes.find((e) => e.number === currentNumber)?.consumetId;
    if (!episodeConsumetId) {
      setStreamError('Episode ID tidak ditemukan di Consumet');
      return;
    }

    setIsLoadingStream(true);
    setStreamError(null);
    
    fetch(`/api/stream?action=watch&episodeId=${encodeURIComponent(episodeConsumetId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStreamError(data.error);
        } else {
          setStreamUrl(data.videoUrl);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch stream:', err);
        setStreamError('Gagal memuat stream');
      })
      .finally(() => setIsLoadingStream(false));
  }, [currentNumber, consumetId, episodes]);

  // Load initial comments
  useEffect(() => {
    fetch(`/api/comments?episodeId=${episode.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setComments(data);
      })
      .catch(console.error)
      .finally(() => setIsLoadingComments(false));
  }, [episode.id]);

  // Pusher realtime
  useEffect(() => {
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
    });

    const channel = pusher.subscribe(`episode-${animeId}-${currentNumber}`);

    channel.bind('new-comment', (comment: Comment) => {
      setComments((prev) => [comment, ...prev]);
    });

    channel.bind('user-typing', () => {
      setIsTyping(true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setIsTyping(false), 2000);
    });

    channel.bind('viewer-count', (data: { count: number }) => {
      setOnlineUsers(data.count);
    });

    pusher.connection.bind('connected', () => setIsConnected(true));
    pusher.connection.bind('disconnected', () => setIsConnected(false));

    // Join presence
    fetch('/api/pusher/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animeId, episodeId: String(currentNumber), action: 'join', socketId: socketId.current }),
    });

    return () => {
      fetch('/api/pusher/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animeId, episodeId: String(currentNumber), action: 'leave', socketId: socketId.current }),
      });
      pusher.unsubscribe(`episode-${animeId}-${currentNumber}`);
      pusher.disconnect();
    };
  }, [animeId, currentNumber]);

  const handleSendComment = async () => {
    if (!newComment.trim()) return;

    const tempComment: Comment = {
      id: Date.now().toString(),
      content: newComment,
      username: 'Guest',
      createdAt: 'Just now',
      likes: 0,
    };

    setComments((prev) => [tempComment, ...prev]);
    setNewComment('');

    try {
      await fetch('/api/comments/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animeId,
          episodeId: episode.id,
          episodeNumber: currentNumber,
          content: newComment,
          username: 'Guest',
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTyping = () => {
    fetch('/api/comments/realtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animeId, episodeNumber: currentNumber, type: 'typing' }),
    }).catch(() => {});
  };

  const handleLike = async (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likes: c.likes + 1 } : c))
    );
    await fetch(`/api/comments/${commentId}/like`, { method: 'POST' }).catch(() => {});
  };

  const finalVideoUrl = streamUrl || dbVideoUrl;

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted mb-4">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link href={`/anime/${animeId}`} className="hover:text-foreground transition-colors">{animeName}</Link>
          <span>/</span>
          <span className="text-foreground">Episode {currentNumber}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-video bg-black rounded-xl overflow-hidden"
            >
              {isLoadingStream ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-3" />
                  <p className="text-muted">Memuat stream...</p>
                </div>
              ) : finalVideoUrl ? (
                <VideoPlayer
                  src={finalVideoUrl}
                  title={`${animeName} Episode ${currentNumber}`}
                />
              ) : streamError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface">
                  <Play className="w-16 h-16 text-muted mb-3" />
                  <p className="text-muted">{streamError}</p>
                  <p className="text-xs text-muted mt-1">Coba episode lain atau refresh halaman</p>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface">
                  <Play className="w-16 h-16 text-muted mb-3" />
                  <p className="text-muted">Video tidak tersedia</p>
                  <p className="text-xs text-muted mt-1">Episode ini belum memiliki stream</p>
                </div>
              )}
            </motion.div>

            {/* Episode Info + Nav */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">{animeName} — Episode {currentNumber}</h1>
                <p className="text-muted text-sm">{episode.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => prevEp && router.push(`/watch/${animeId}/${prevEp.number}`)}
                  disabled={!prevEp}
                  className="flex items-center gap-1 px-3 py-2 bg-surface-light rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface transition-colors"
                >
                  <SkipBack className="w-4 h-4" />
                  Prev
                </button>
                <button
                  onClick={() => nextEp && router.push(`/watch/${animeId}/${nextEp.number}`)}
                  disabled={!nextEp}
                  className="flex items-center gap-1 px-3 py-2 bg-surface-light rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface transition-colors"
                >
                  Next
                  <SkipForward className="w-4 h-4" />
                </button>
                <button className="flex items-center gap-1 px-3 py-2 bg-surface-light rounded-lg text-sm hover:bg-surface transition-colors">
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-muted">{onlineUsers} watching</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isConnected ? (
                  <><Wifi className="w-4 h-4 text-green-500" /><span className="text-green-500">Live</span></>
                ) : (
                  <><WifiOff className="w-4 h-4 text-red-500" /><span className="text-red-500">Offline</span></>
                )}
              </div>
            </div>

            {/* Comments */}
            <div className="bg-surface rounded-xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Comments</h2>
                <span className="text-sm text-muted">({comments.length})</span>
              </div>

              {/* Input */}
              <div className="flex gap-3 mb-5">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm font-medium text-primary">G</div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => { setNewComment(e.target.value); handleTyping(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                    placeholder="Add a comment... (Enter to send)"
                    className="w-full px-4 py-3 bg-surface-light border border-surface-light rounded-xl text-sm focus:outline-none focus:border-primary resize-none"
                    rows={2}
                  />
                  {isTyping && <p className="text-xs text-muted mt-1">Someone is typing...</p>}
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleSendComment}
                      disabled={!newComment.trim()}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>

              {/* Comment List */}
              {isLoadingComments ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-surface-light flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-surface-light rounded w-24" />
                        <div className="h-3 bg-surface-light rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-surface-light flex items-center justify-center flex-shrink-0 text-sm font-medium">
                        {c.username[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{c.username}</span>
                          <span className="text-xs text-muted">{c.createdAt}</span>
                        </div>
                        <p className="text-sm text-muted">{c.content}</p>
                        <button
                          onClick={() => handleLike(c.id)}
                          className="flex items-center gap-1 mt-1 text-xs text-muted hover:text-primary transition-colors"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          {c.likes}
                        </button>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-center text-muted text-sm py-4">Belum ada komentar. Jadilah yang pertama!</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Episode Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-surface rounded-xl p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Episodes</h2>
                <span className="text-sm text-muted">{totalEpisodes} total</span>
              </div>
              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
                {episodes.map((ep) => (
                  <Link key={ep.id} href={`/watch/${animeId}/${ep.number}`}>
                    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                      ep.number === currentNumber ? 'bg-primary/20 border border-primary/30' : 'hover:bg-surface-light'
                    }`}>
                      <div className="relative w-20 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-surface-light">
                        {ep.thumbnail ? (
                          <Image src={ep.thumbnail} alt={`EP ${ep.number}`} fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className={`w-5 h-5 ${ep.number === currentNumber ? 'text-primary' : 'text-muted'}`} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-primary font-medium">EP {ep.number}</span>
                        <p className={`text-sm truncate ${ep.number === currentNumber ? 'text-foreground' : 'text-muted'}`}>
                          {ep.title}
                        </p>
                        {ep.duration && <p className="text-xs text-muted">{ep.duration}</p>}
                      </div>
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
