import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: 'https://intimate-jaguar-48.clerk.accounts.dev/.well-known/jwks.json',
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000,
});

const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    }
  });
};

export async function POST(req) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      console.error('No Authorization token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId;
    try {
      const decoded = await new Promise((resolve, reject) => {
        jwt.verify(token, getKey, { issuer: 'https://intimate-jaguar-48.clerk.accounts.dev' }, (err, decoded) => {
          if (err) {
            reject(err);
          } else {
            resolve(decoded);
          }
        });
      });
      userId = decoded.sub;
      console.log('User ID from token:', userId);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI;

    console.log('Client ID:', clientId);
    console.log('Client Secret:', clientSecret);
    console.log('Redirect URI:', redirectUri);
    console.log('Code:', code);

    if (!clientId || !clientSecret || !redirectUri) {
      console.log('Missing environment variables:', { clientId: !clientId, clientSecret: !clientSecret, redirectUri: !redirectUri });
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: 'authorization_code',
    });

    let googleResponse;
    try {
      googleResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
    } catch (error) {
      console.error('Failed to fetch Google token endpoint:', error);
      return NextResponse.json({ error: 'Failed to contact Google token endpoint', details: error.message }, { status: 500 });
    }

    let data;
    try {
      data = await googleResponse.json();
      console.log('Google token response:', data);
    } catch (error) {
      console.error('Failed to parse Google token response:', error);
      return NextResponse.json({ error: 'Invalid response from Google token endpoint', details: error.message }, { status: 500 });
    }

    if (!googleResponse.ok || !data.access_token) {
      console.error('Failed to get access token:', data);
      return NextResponse.json({ error: 'Failed to authenticate with YouTube', details: data }, { status: 500 });
    }

    let flaskResponse;
    try {
      flaskResponse = await fetch('http://localhost:5000/api/save-youtube-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        }),
      });
    } catch (error) {
      console.error('Failed to contact Flask backend:', error);
      return NextResponse.json({ error: 'Failed to contact Flask backend', details: error.message }, { status: 500 });
    }

    let flaskData;
    try {
      flaskData = await flaskResponse.json();
      console.log('Flask response:', flaskData);
    } catch (error) {
      console.error('Failed to parse Flask response:', error);
      return NextResponse.json({ error: 'Invalid response from Flask backend', details: error.message }, { status: 500 });
    }

    if (!flaskResponse.ok) {
      console.error('Failed to save token to Flask:', flaskData);
      return NextResponse.json({ error: 'Failed to save token', details: flaskData }, { status: 500 });
    }

    return NextResponse.json({ message: 'Token saved successfully' });
  } catch (error) {
    console.error('Unexpected error in /api/youtube-callback:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}