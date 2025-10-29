'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function MusicPage() {
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [isLinked, setIsLinked] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [topTrack, setTopTrack] = useState<any>(null);
  const [topEmotion, setTopEmotion] = useState<string | null>(null);
  const [llmFeedback, setLlmFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSpotifyLink = async () => {
      if (!isSignedIn) return;
      try {
        const clerkToken = await getToken();
        const res = await fetch('/api/spotify-check', {
          method: 'GET',
          headers: { Authorization: `Bearer ${clerkToken}` },
        });
        if (res.ok) {
          setIsLinked(true);
          await fetchAnalysis();
          await fetchTopTrack();
        } else {
          setIsLinked(false);
          const text = await res.text();
          console.log('Spotify check failed:', text);
        }
      } catch (err) {
        setError('Failed to check Spotify link');
        setIsLinked(false);
        console.error('Check link error:', err);
      }
    };

    checkSpotifyLink();
  }, [isSignedIn, getToken]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const clerkToken = await getToken();
      const cookieString = document.cookie;
      console.log('Cookie string:', cookieString);
      const spotifyTokenMatch = cookieString.match(new RegExp('(?:^|;)\\s*spotifyAccessToken=([^;]+)'));
      const spotifyToken = spotifyTokenMatch ? spotifyTokenMatch[1] : null;
      if (!spotifyToken) throw new Error('Spotify access token not found in cookie');

      console.log('Fetching tracks with URL:', `http://localhost:5007/top-tracks?access_token=${encodeURIComponent(spotifyToken)}`);
      const tracksRes = await fetch(`http://localhost:5007/top-tracks?access_token=${encodeURIComponent(spotifyToken)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${clerkToken}` },
      });
      console.log('Tracks response status:', tracksRes.status, 'OK:', tracksRes.ok);
      if (!tracksRes.ok) {
        const errorText = await tracksRes.text();
        throw new Error(`Failed to fetch tracks: ${errorText}`);
      }
      const tracksData = await tracksRes.json();
      setTracks(tracksData.tracks);
      setLlmFeedback(tracksData.llm_feedback);
    } catch (err) {
      setError(err.message);
      console.error('Fetch analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopTrack = async () => {
    setLoading(true);
    setError(null);
    try {
      const clerkToken = await getToken();
      const cookieString = document.cookie;
      const spotifyTokenMatch = cookieString.match(new RegExp('(?:^|;)\\s*spotifyAccessToken=([^;]+)'));
      const spotifyToken = spotifyTokenMatch ? spotifyTokenMatch[1] : null;
      if (!spotifyToken) throw new Error('Spotify access token not found in cookie');

      console.log('Fetching top track with URL:', `http://localhost:5007/top-track?access_token=${encodeURIComponent(spotifyToken)}`);
      const topRes = await fetch(`http://localhost:5007/top-track?access_token=${encodeURIComponent(spotifyToken)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${clerkToken}` },
      });
      console.log('Top track response status:', topRes.status, 'OK:', topRes.ok);
      if (!topRes.ok) {
        const errorText = await topRes.text();
        throw new Error(`Failed to fetch top track: ${errorText}`);
      }
      const topData = await topRes.json();
      setTopTrack(topData.top_track);
      setTopEmotion(topData.emotion);
    } catch (err) {
      setError(err.message);
      console.error('Fetch top track error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkSpotify = () => {
    document.cookie = 'spotifyAccessToken=; Max-Age=-1; path=/';
    router.push('/api/spotify-login?prompt=consent');
  };

  const handleSignOutSpotify = () => {
    document.cookie = 'spotifyAccessToken=; Max-Age=-1; path=/';
    setIsLinked(false);
    setTracks([]);
    setTopTrack(null);
    setTopEmotion(null);
    setLlmFeedback(null);
    window.location.reload();
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl p-8 text-center transform hover:scale-105 transition duration-300">
          <p className="text-xl font-semibold text-gray-800">Please sign in to link your Spotify account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-extrabold text-white mb-12 text-center tracking-tight">
          Your Music Insights
        </h1>

        {!isLinked ? (
          <div className="text-center">
            <button
              onClick={handleLinkSpotify}
              className="px-8 py-4 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 transform hover:scale-105 transition duration-300"
            >
              Link Spotify Account
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {loading && (
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-white"></div>
                <p className="text-white mt-4 text-lg">Analyzing your music... Please wait.</p>
              </div>
            )}
            {error && (
              <div className="bg-red-600 text-white p-6 rounded-xl shadow-lg">
                <p className="text-lg font-medium">Error: {error}</p>
              </div>
            )}

            {tracks.length > 0 && (
              <div className="bg-white rounded-xl shadow-2xl p-8 transform hover:shadow-3xl transition duration-300">
                <h2 className="text-3xl font-bold text-indigo-900 mb-6">Top Streamed Tracks</h2>
                <ul className="space-y-4 list-none">
                  {tracks.map((track, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-indigo-600 text-2xl mr-4">•</span>
                      <div className="flex-1">
                        <span className="font-semibold text-gray-800 text-lg">{track.name}</span>
                        <span className="text-gray-600 text-lg"> by {track.artists}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {topTrack && (
              <div className="bg-white rounded-xl shadow-2xl p-8 transform hover:shadow-3xl transition duration-300">
                <h2 className="text-3xl font-bold text-indigo-900 mb-6">Top Streamed Track</h2>
                <p className="text-xl">
                  <span className="font-semibold text-gray-800">{topTrack.name}</span>
                  <span className="text-gray-600"> by {topTrack.artists}</span>
                </p>
                {topEmotion && (
                  <p className="mt-3 text-lg">
                    Emotion: <span className="font-semibold text-indigo-600">{topEmotion}</span>
                  </p>
                )}
              </div>
            )}

            {llmFeedback && (
              <div className="bg-white rounded-xl shadow-2xl p-8 transform hover:shadow-3xl transition duration-300">
                <h2 className="text-3xl font-bold text-indigo-900 mb-6">Mental Health Insights</h2>
                <div className="space-y-4">
                  {llmFeedback.split('\n').map((line, index) => (
                    <div key={index} className="flex items-start">
                      {line.trim().startsWith('-') && (
                        <span className="text-indigo-600 text-2xl mr-4">•</span>
                      )}
                      <p className="text-gray-700 text-xl leading-relaxed flex-1">{line.trim()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={handleSignOutSpotify}
                className="px-8 py-4 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 transform hover:scale-105 transition duration-300"
              >
                Sign Out of Spotify
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}