import { Suspense } from 'react';
import { BrowseClient } from './browse-client';
import prisma from '@/lib/prisma';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

async function getInitialData(params: { [key: string]: string | undefined }) {
  const { genre, status, type, year, q, page: pageParam } = params;
  const page = Math.max(1, parseInt(pageParam || '1'));
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (genre) where.genres = { has: genre };
  if (status) where.status = status;
  if (type) where.type = type;
  if (year) where.year = parseInt(year);
  if (q) where.title = { contains: q, mode: 'insensitive' };

  try {
    const [data, total] = await Promise.all([
      prisma.anime.findMany({
        where,
        orderBy: { rating: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, title: true, image: true, rating: true, episodes: true, type: true, status: true },
      }),
      prisma.anime.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  } catch {
    return { data: [], total: 0, page: 1, totalPages: 0 };
  }
}

export default async function BrowsePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialData = await getInitialData(params);

  return (
    <Suspense fallback={<div className="min-h-screen bg-background pt-20 flex items-center justify-center"><p className="text-muted">Loading...</p></div>}>
      <BrowseClient initialData={initialData} />
    </Suspense>
  );
}
