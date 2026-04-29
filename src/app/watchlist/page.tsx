import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, Play } from 'lucide-react';
import prisma from '@/lib/prisma';

export default async function WatchlistPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });

  const bookmarks = user
    ? await prisma.bookmark.findMany({
        where: { userId: user.id },
        include: {
          anime: {
            select: { id: true, title: true, image: true, status: true, episodes: true, type: true, rating: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Bookmark className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">My Watchlist</h1>
          <span className="text-muted text-sm">({bookmarks.length} anime)</span>
        </div>

        {bookmarks.length === 0 ? (
          <div className="text-center py-20">
            <Bookmark className="w-16 h-16 text-muted mx-auto mb-4" />
            <p className="text-muted text-lg">Watchlist kamu masih kosong</p>
            <Link href="/browse" className="mt-4 inline-block text-primary hover:underline text-sm">
              Browse anime sekarang
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {bookmarks.map(({ anime }: { anime: { id: string; title: string; image: string; status: string; episodes: number; type: string; rating: number } }) => (
              <div key={anime.id} className="group relative">
                <Link href={`/anime/${anime.id}`}>
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface">
                    <Image
                      src={anime.image}
                      alt={anime.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute top-2 left-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                        anime.status === 'Ongoing' ? 'bg-green-500/80 text-white' : 'bg-blue-500/80 text-white'
                      }`}>
                        {anime.status}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-sm font-semibold text-white line-clamp-2">{anime.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{anime.episodes} eps · {anime.type}</p>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                        <Play className="w-7 h-7 text-white fill-white ml-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
