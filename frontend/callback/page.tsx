'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    if (accessToken) {
      localStorage.setItem('spotifyAccessToken', accessToken);
      router.push('/music');
    } else {
      console.error('No access token found in callback URL');
    }
  }, [router]);

  return <div>Authenticating with Spotify...</div>;
}