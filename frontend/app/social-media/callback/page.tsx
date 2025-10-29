'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function YouTubeCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const exchangeCodeForToken = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const storedState = localStorage.getItem('oauth_state');

      console.log('Authorization code:', code);
      console.log('State:', state);
      console.log('Stored state:', storedState);

      if (!code || state !== storedState) {
        setError('Invalid or missing authorization code/state');
        return;
      }

      if (!user) {
        setError('User not authenticated');
        return;
      }

      try {
        // Use the full backend URL to avoid proxy issues
        const backendUrl = 'http://localhost:5000/api/save-youtube-token';
        console.log('Sending request to:', backendUrl);
        console.log('Request body:', {
          user_id: user.id,
          code: code,
          redirect_uri: process.env.NEXT_PUBLIC_YOUTUBE_REDIRECT_URI,
        });

        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            code: code,
            redirect_uri: process.env.NEXT_PUBLIC_YOUTUBE_REDIRECT_URI,
          }),
        });

        // Log the HTTP status and headers
        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);

        // Log the raw response
        const responseText = await response.text();
        console.log('Raw response from /api/save-youtube-token:', responseText);

        // Try to parse the response as JSON
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse response as JSON:', parseError);
          setError(`Failed to parse server response: ${responseText} (Status: ${response.status})`);
          return;
        }

        if (!response.ok) {
          console.error('Failed to exchange code for token:', responseData);
          setError(`Failed to exchange code for token: ${responseData.error || 'Unknown error'} (Status: ${response.status})`);
          return;
        }

        // Successfully saved the token
        console.log('Token exchange successful, redirecting to /social-media');
        router.push('/social-media');
      } catch (err) {
        console.error('Error in exchangeCodeForToken:', err);
        setError(`Failed to exchange code for token: ${err.message || 'Unknown error'}`);
      }
    };

    exchangeCodeForToken();
  }, [searchParams, user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-indigo-200">
      {error ? (
        <div className="text-red-500 text-xl">
          Error: {error}
          <br />
          <button
            onClick={() => router.push('/social-media')}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      ) : (
        <div className="text-xl text-gray-700">
          Connecting to YouTube...
        </div>
      )}
    </div>
  );
}