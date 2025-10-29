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

  // Check if the user has a YouTube token in the Flask backend
  const flaskResponse = await fetch('http://localhost:5000/api/check-youtube', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });

  if (flaskResponse.ok) {
    const data = await flaskResponse.json();
    return NextResponse.json({ connected: data.connected });
  }

  return NextResponse.json({ connected: false });
}