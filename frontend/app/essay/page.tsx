'use client';

import { useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';

export default function EssayPage() {
  const { user, isSignedIn } = useUser();
  const { getToken, signOut } = useAuth();
  const [formData, setFormData] = useState({
    Q1: '',
    Q2: '',
    Q3: '',
  });
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = await getToken();
      const response = await fetch('https://essay-model-backend.onrender.com/api/analyze-essay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          ...formData,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to analyze responses');
      }
    } catch (err) {
      setError('An error occurred while analyzing your responses');
    } finally {
      setIsLoading(false);
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
          className="text-xl"
        >
          Please sign in to access Essay Analysis.
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-8"
        >
          <h1 className="text-4xl font-bold">Essay Analysis</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSignOutWebsite}
            className="btn-secondary"
          >
            Sign Out
          </motion.button>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="p-6 bg-[#1a1433] rounded-xl shadow-lg mb-8 border border-[#2d2a4e]"
        >
          <h2 className="text-xl font-semibold mb-4">Answer the Following Questions</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Q1 */}
            <div>
              <label className="block text-gray-300 mb-1">
                Q1: How have you been feeling emotionally over the past few weeks?
              </label>
              <textarea
                name="Q1"
                value={formData.Q1}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#2d2a4e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="Describe your emotions..."
                rows={4}
                required
              />
            </div>

            {/* Q2 */}
            <div>
              <label className="block text-gray-300 mb-1">
                Q2: How have your daily habits or activities changed recently?
              </label>
              <textarea
                name="Q2"
                value={formData.Q2}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#2d2a4e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="Describe any changes in your habits..."
                rows={4}
                required
              />
            </div>

            {/* Q3 */}
            <div>
              <label className="block text-gray-300 mb-1">
                Q3: How do you typically handle stress, and has that changed recently?
              </label>
              <textarea
                name="Q3"
                value={formData.Q3}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#2d2a4e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="Describe your coping mechanisms..."
                rows={4}
                required
              />
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={isLoading}
              className={`btn-primary flex items-center justify-center ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
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
              {isLoading ? 'Analyzing...' : 'Analyze Responses'}
            </motion.button>
          </form>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 bg-red-900 rounded-lg border border-red-800 mb-8"
          >
            <h2 className="text-xl font-semibold text-red-400 mb-4">Error</h2>
            <p className="text-gray-300">{error}</p>
          </motion.div>
        )}

        {/* Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 bg-[#1a1433] rounded-xl shadow-lg border border-[#2d2a4e]"
          >
            <h2 className="text-xl font-semibold mb-4">Analysis Result</h2>
            <div className="p-4 bg-[#2d2a4e] rounded-lg mb-4 border border-[#3b3665]">
              <p className="text-gray-300">Depression Probability</p>
              <p className={`text-2xl font-bold ${result.probability >= 80 ? 'text-red-400' : result.probability >= 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                {result.probability.toFixed(2)}%
              </p>
            </div>
            <h2 className="text-xl font-semibold mb-4">AI-Generated Report</h2>
            <div className="p-4 bg-[#2d2a4e] rounded-lg border border-[#3b3665]">
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{result.report}</p>
            </div>
            {result.probability >= 80 && (
              <div className="mt-4 p-4 bg-red-900 rounded-lg border border-red-800">
                <p className="text-gray-300">
                  Based on the analysis, you may be at high risk of depression. We strongly recommend seeking support from a mental health professional.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}