import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { WatchClient } from './watch-client';

interface PageProps {
  params: Promise<{ animeId: string; episodeId: string }>;
}

export default async function WatchPage({ params }: PageProps) {
  const { animeId, episodeId } = await params;

  const episode = await prisma.episode.findFirst({
    where: { animeId, number: parseInt(episodeId) },
    include: {
      anime: {
        include: {
          episodeList: { orderBy: { number: 'asc' } },
        },
      },
    },
  });

  if (!episode) notFound();

  return (
    <WatchClient
      episode={{
        id: episode.id,
        number: episode.number,
        title: episode.title,
        videoUrl: episode.videoUrl,
        animeId: episode.animeId,
        animeName: episode.anime.title,
        episodes: episode.anime.episodeList.map((ep) => ({
          id: ep.id,
          number: ep.number,
          title: ep.title,
          thumbnail: ep.thumbnail,
          duration: ep.duration,
        })),
      }}
    />
  );
}
