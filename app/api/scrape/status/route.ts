import { NextResponse } from 'next/server';
import { getSession } from '@/lib/scraping-session';

export async function GET() {
  const session = getSession();
  
  return NextResponse.json({
    isRunning: session.isRunning,
    startedAt: session.startedAt,
    keyword: session.keyword,
    city: session.city,
  });
}
