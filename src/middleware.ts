import { NextResponse } from 'next/server'

export function middleware(req: Request) {
  // /admin/sync is public for now
  return NextResponse.next()
}

export const config = {
  matcher: []
}
