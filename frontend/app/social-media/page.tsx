'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';
import { motion, AnimatePresence } from 'framer-motion';

ChartJS.register(ArcElement, BarElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

export default function SocialMediaPage() {
  const { user, isSignedIn } = useUser();
  const { getToken, signOut } = useAuth();
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [report, setReport] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [categoryDistribution, setCategoryDistribution] = useState(null);
  const [sentimentTrend, setSentimentTrend] = useState(null);
  const [sentimentOverTime, setSentimentOverTime] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;

    const checkYoutubeConnection = async () => {
      const token = await getToken();
      const response = await fetch('/api/check-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await response.json();
      setYoutubeConnected(data.connected);
      if (data.connected) {
        const reportResponse = await fetch('/api/get-youtube-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ user_id: user.id }),
        });
        const reportData = await reportResponse.json();
        if (reportData.report) {
          setReport(reportData.report);
          setMetrics(reportData.metrics);
          setCategoryDistribution({
            labels: ['Sad', 'Happy', 'Energetic', 'Calm'],
            datasets: [{
              label: 'Emotional Categories',
              data: [
                reportData.metrics.sadCount,
                reportData.metrics.happyCount,
                reportData.metrics.energeticCount,
                reportData.metrics.calmCount,
              ],
              backgroundColor: ['#FF6B6B', '#4CAF50', '#FFD700', '#40C4FF'],
            }],
          });
          setSentimentTrend({
            labels: reportData.metrics.videos.map((v) => v.title.slice(0, 20) + '...'),
            datasets: [{
              label: 'Sentiment Score',
              data: reportData.metrics.videos.map((v) => v.sentimentScore),
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.2)',
              fill: false,
            }],
          });
          if (reportData.metrics.sentimentOverTime) {
            setSentimentOverTime({
              labels: reportData.metrics.sentimentOverTime.map((entry) => entry.date),
              datasets: [{
                label: 'Sentiment Over Time',
                data: reportData.metrics.sentimentOverTime.map((entry) => entry.score),
                borderColor: '#FF6B6B',
                backgroundColor: 'rgba(255, 107, 107, 0.2)',
                fill: false,
                tension: 0.3,
              }],
            });
          }
        }
      }
    };

    checkYoutubeConnection();
  }, [isSignedIn, getToken, user]);

  const handleConnectYoutube = () => {
    const clientId = process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_YOUTUBE_REDIRECT_URI;
    const scope = 'https://www.googleapis.com/auth/youtube.readonly';
    const state = Math.random().toString(36).substring(2);

    console.log('Client ID:', clientId);
    console.log('Redirect URI:', redirectUri);
    console.log('Scope:', scope);
    console.log('State:', state);

    if (!redirectUri) {
      console.error('Redirect URI is undefined. Please check NEXT_PUBLIC_YOUTUBE_REDIRECT_URI in .env.local');
      return;
    }

    if (!clientId) {
      console.error('Client ID is undefined. Please check NEXT_PUBLIC_YOUTUBE_CLIENT_ID in .env.local');
      return;
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&access_type=offline&state=${state}&prompt=select_account`;
    
    console.log('OAuth URL:', authUrl);

    localStorage.setItem('oauth_state', state);
    window.location.href = authUrl;
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const token = await getToken();
    const response = await fetch('/api/analyze-youtube', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: user.id }),
    });
    const data = await response.json();
    setReport(data.report);
    setMetrics(data.metrics);
    setCategoryDistribution({
      labels: ['Sad', 'Happy', 'Energetic', 'Calm'],
      datasets: [{
        label: 'Emotional Categories',
        data: [
          data.metrics.sadCount,
          data.metrics.happyCount,
          data.metrics.energeticCount,
          data.metrics.calmCount,
        ],
        backgroundColor: ['#FF6B6B', '#4CAF50', '#FFD700', '#40C4FF'],
      }],
    });
    setSentimentTrend({
      labels: data.metrics.videos.map((v) => v.title.slice(0, 20) + '...'),
      datasets: [{
        label: 'Sentiment Score',
        data: data.metrics.videos.map((v) => v.sentimentScore),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        fill: false,
      }],
    });
    if (data.metrics.sentimentOverTime) {
      setSentimentOverTime({
        labels: data.metrics.sentimentOverTime.map((entry) => entry.date),
        datasets: [{
          label: 'Sentiment Over Time',
          data: data.metrics.sentimentOverTime.map((entry) => entry.score),
          borderColor: '#FF6B6B',
          backgroundColor: 'rgba(255, 107, 107, 0.2)',
          fill: false,
          tension: 0.3,
        }],
      });
    }
    setIsAnalyzing(false);
  };

  const handleDisconnectYoutube = async () => {
    const token = await getToken();
    try {
      const response = await fetch('/api/clear-youtube-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (response.ok) {
        console.log('YouTube token cleared successfully');
        setYoutubeConnected(false);
        setReport(null);
        setMetrics(null);
        setCategoryDistribution(null);
        setSentimentTrend(null);
        setSentimentOverTime(null);
      } else {
        console.error('Failed to clear YouTube token:', await response.json());
      }
    } catch (error) {
      console.error('Error clearing YouTube token:', error);
    }
  };

  const handleSignOutWebsite = async () => {
    await signOut();
  };

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-xl text-gray-700"
        >
          Please sign in to access YouTube liked video analysis.
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-indigo-900 to-purple-900">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white">YouTube Liked Video Analysis</h1>
          <div className="flex gap-3">
            {youtubeConnected && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDisconnectYoutube}
                className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              >
                Disconnect YouTube
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSignOutWebsite}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            >
              Sign Out
            </motion.button>
          </div>
        </motion.div>

        {/* Connect or Analyze Section */}
        <AnimatePresence>
          {!youtubeConnected ? (
            <motion.div
              key="connect"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleConnectYoutube}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer text-lg font-semibold"
              >
                Connect YouTube
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="analyze"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`w-full px-6 py-3 bg-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer text-lg font-semibold flex items-center justify-center ${
                  isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isAnalyzing ? (
                  <svg
                    className="animate-spin h-5 w-5 mr-3 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : null}
                {isAnalyzing ? 'Analyzing...' : 'Analyze Liked Videos'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary Card */}
        {metrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-6 bg-white bg-opacity-10 backdrop-blur-md rounded-xl shadow-lg mb-8"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-purple-900 bg-opacity-20 rounded-lg">
                <p className="text-gray-300">Total Videos Analyzed</p>
                <p className="text-2xl font-bold text-white">{metrics.totalVideos || 0}</p>
              </div>
              <div className="p-4 bg-purple-900 bg-opacity-20 rounded-lg">
                <p className="text-gray-300">Average Sentiment Score</p>
                <p className="text-2xl font-bold text-white">
                  {metrics.averageSentimentScore ? metrics.averageSentimentScore.toFixed(2) : 'N/A'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Charts */}
        {metrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
          >
            {/* Category Distribution */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-6 bg-white bg-opacity-10 backdrop-blur-md rounded-xl shadow-lg flex flex-col items-center"
            >
              <h2 className="text-xl font-semibold text-white mb-4">Category Distribution</h2>
              <div className="w-64 h-64">
                <Pie
                  data={categoryDistribution}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        labels: {
                          color: '#e0e7ff',
                        },
                        position: 'bottom',
                      },
                      tooltip: {
                        backgroundColor: 'rgba(10, 0, 31, 0.8)',
                        titleColor: '#e0e7ff',
                        bodyColor: '#e0e7ff',
                      },
                    },
                  }}
                />
              </div>
            </motion.div>

            {/* Sentiment Trend */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-6 bg-white bg-opacity-10 backdrop-blur-md rounded-xl shadow-lg flex flex-col items-center"
            >
              <h2 className="text-xl font-semibold text-white mb-4">Sentiment Trend</h2>
              <div className="w-full h-80">
                <Bar
                  data={sentimentTrend}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: {
                          color: '#e0e7ff',
                        },
                      },
                      tooltip: {
                        backgroundColor: 'rgba(10, 0, 31, 0.8)',
                        titleColor: '#e0e7ff',
                        bodyColor: '#e0e7ff',
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { color: '#e0e7ff' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                      },
                      x: {
                        ticks: {
                          color: '#e0e7ff',
                          maxRotation: 45,
                          minRotation: 45,
                        },
                        grid: { display: false },
                      },
                    },
                  }}
                />
              </div>
            </motion.div>

            {/* Sentiment Over Time */}
            {sentimentOverTime && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-6 bg-white bg-opacity-10 backdrop-blur-md rounded-xl shadow-lg lg:col-span-2 flex flex-col items-center"
              >
                <h2 className="text-xl font-semibold text-white mb-4">Sentiment Over Time</h2>
                <div className="w-full h-80">
                  <Line
                    data={sentimentOverTime}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: {
                            color: '#e0e7ff',
                          },
                        },
                        tooltip: {
                          backgroundColor: 'rgba(10, 0, 31, 0.8)',
                          titleColor: '#e0e7ff',
                          bodyColor: '#e0e7ff',
                        },
                      },
                      scales: {
                        y: {
                          ticks: { color: '#e0e7ff' },
                          grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        },
                        x: {
                          ticks: { color: '#e0e7ff' },
                          grid: { display: false },
                        },
                      },
                    }}
                  />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Video Table */}
        {metrics && metrics.videos && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="p-6 bg-white bg-opacity-10 backdrop-blur-md rounded-xl shadow-lg mb-8"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Analyzed Videos</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-purple-900 bg-opacity-20">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Sentiment Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {metrics.videos.map((video, index) => (
                    <motion.tr
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{video.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{video.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{video.sentimentScore.toFixed(2)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Mental Health Report */}
        {report && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="p-6 bg-white bg-opacity-10 backdrop-blur-md rounded-xl shadow-lg"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Mental Health Report</h2>
            <p className="leading-relaxed text-white">{report}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}