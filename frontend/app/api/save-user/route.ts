import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: 'https://intimate-jaguar-48.clerk.accounts.dev/.well-known/jwks.json',
  cache: true, // Enable caching
  cacheMaxEntries: 5, // Cache up to 5 keys
  cacheMaxAge: 600000, // Cache for 10 minutes (in milliseconds)
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
  console.log('Received POST request to /api/save-user');
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  console.log('Received token:', token);

  if (!token) {
    console.log('No token provided');
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
    console.log('Verified userId:', userId);
  } catch (error) {
    console.log('Token verification failed:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('Fetching user data from Clerk for userId:', userId);
  const user = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
    },
  }).then((res) => res.json());
  console.log('Clerk user data:', user);

  const email = user.email_addresses[0]?.email_address;
  const authMethod = user.password_enabled ? 'email_password' : 'google';
  console.log('Sending to Flask:', { user_id: userId, email, auth_method: authMethod });

  const response = await fetch('http://localhost:5000/api/save-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, email, auth_method: authMethod }),
  });
  console.log('Flask response status:', response.status);

  if (response.ok) {
    return NextResponse.json({ message: 'User synced' });
  } else {
    const errorData = await response.json();
    console.log('Flask response error:', errorData);
    return NextResponse.json({ error: errorData.error || 'Failed to sync user' }, { status: 500 });
  }
}