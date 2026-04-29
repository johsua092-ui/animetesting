import { NextResponse } from 'next/server';
import { syncAll } from '@/lib/jikan-sync';

export async function POST() {
  try {
    const result = await syncAll(true);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/admin/sync]', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
