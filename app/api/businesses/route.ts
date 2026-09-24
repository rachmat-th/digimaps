import { NextResponse } from 'next/server';
import { getAllBusinesses } from '@/lib/db';

export async function GET() {
  try {
    const businesses = await getAllBusinesses();
    return NextResponse.json({ businesses });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
      { status: 500 }
    );
  }
}
