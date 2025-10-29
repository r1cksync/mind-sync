import { NextResponse } from 'next/server';

export async function GET() {
  const redirectUri = 'http://localhost:3000/api/spotify-callback';
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const scope = 'user-read-recently-played user-top-read';

  console.log('Spotify Client ID:', clientId);
  console.log('Redirect URI:', redirectUri);

  if (!clientId) {
    console.error('SPOTIFY_CLIENT_ID not set in .env.local');
    return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
  }

  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  console.log('Authorization URL:', authUrl);
  return NextResponse.redirect(authUrl);
}