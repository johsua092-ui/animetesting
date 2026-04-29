import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { WatchClient } from './watch-client';

interface PageProps {
  params: Promise<{ animeId: string; episodeId: string }>;
}

export default async function WatchPage({ params }: PageProps) {
  const { animeId, episodeId } = await params;

  const anime = await prisma.anime.findUnique({
    where: { id: animeId },
    include: {
      episodeList: { orderBy: { number: 'asc' } },
    },
  });

  if (!anime) notFound();

  const episodeNum = parseInt(episodeId);
  const episode = anime.episodeList.find((ep: { number: number }) => ep.number === episodeNum);

  if (!episode) notFound();

  return (
    <WatchClient
      episode={{
        id: episode.id,
        number: episode.number,
        title: episode.title,
        videoUrl: episode.videoUrl,
        consumetId: episode.consumetId,
        animeId: anime.id,
        animeName: anime.title,
        episodes: anime.episodeList.map((ep: { id: string; number: number; title: string; thumbnail: string | null; duration: string | null; consumetId: string | null }) => ({
          id: ep.id,
          number: ep.number,
          title: ep.title,
          thumbnail: ep.thumbnail,
          duration: ep.duration,
          consumetId: ep.consumetId,
        })),
      }}
    />
  );
}
