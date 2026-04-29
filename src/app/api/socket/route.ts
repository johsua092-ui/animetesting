import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Socket server should be initialized separately',
    info: 'For production, use a separate Socket.io server or serverless functions'
  });
}
