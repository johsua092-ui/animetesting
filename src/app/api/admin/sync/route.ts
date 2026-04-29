import { NextRequest, NextResponse } from 'next/server';
import { syncAll, syncAllWithEpisodes } from '@/lib/jikan-sync';

export async function POST(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const withEpisodes = searchParams.get('episodes') === 'true';
    
    if (withEpisodes) {
      const result = await syncAllWithEpisodes();
      return NextResponse.json(result);
    }
    
    const result = await syncAll();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/admin/sync]', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
