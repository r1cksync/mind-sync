import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  const { userId } = getAuth(request);
  if (!userId) {
    console.error('No userId in request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cookie = request.cookies.get('spotifyAccessToken');
  console.log('Checking cookie:', {
    name: 'spotifyAccessToken',
    value: cookie?.value,
    allCookies: Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value])),
    requestHeaders: Object.fromEntries(request.headers.entries()),
  });
  if (!cookie || !cookie.value) {
    return NextResponse.json({ error: 'No Spotify token' }, { status: 401 });
  }

  return NextResponse.json({ linked: true }, { status: 200 });
}