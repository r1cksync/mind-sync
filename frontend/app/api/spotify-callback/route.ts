import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  console.log('Spotify callback received:', { code, state, fullUrl: request.url });

  if (!code) {
    console.error('No code parameter in Spotify callback');
    return NextResponse.json({ error: 'No authorization code' }, { status: 400 });
  }

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Sending request to backend (Attempt ${attempt}): http://localhost:5007/callback?code=${code}`);
      const response = await fetch(`http://localhost:5007/callback?code=${code}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Backend response status:', response.status, 'OK:', response.ok);
      if (!response.ok) {
        const text = await response.text();
        console.error('Backend response error:', text);
        throw new Error(`Backend error: ${response.status} - ${text}`);
      }

      const data = await response.json();
      console.log('Backend response data:', data);
      const accessToken = data.access_token;

      if (accessToken) {
        const responseObj = NextResponse.redirect(new URL('/music', request.url));
        responseObj.cookies.set('spotifyAccessToken', accessToken, {
          maxAge: 3600, // 1 hour
          path: '/',
          sameSite: 'lax',
          httpOnly: false, // Allow client-side access for debugging
        });
        console.log('Cookie set before redirect:', {
          name: 'spotifyAccessToken',
          value: accessToken,
          headers: responseObj.headers.getSetCookie(),
        });
        return responseObj;
      } else {
        console.error('No access token received from backend, data:', data);
        return NextResponse.redirect(new URL('/music?error=no-token', request.url));
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed in Spotify callback:`, error);
      if (attempt === maxRetries) {
        return NextResponse.redirect(new URL(`/music?error=callback-failed&details=${encodeURIComponent(error.message)}`, request.url));
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
    }
  }
}