'use client';

import { useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';

export default function AcademicPage() {
  const { user, isSignedIn } = useUser();
  const { getToken, signOut } = useAuth();
  const [formData, setFormData] = useState({
    Age: '',
    'Academic Pressure': '',
    CGPA: '',
    'Study Satisfaction': '',
    'Dietary Habits': '',
    Degree: 'Bachelors',
    'Have you ever had suicidal thoughts ?': 'No',
    'Work/Study Hours': '',
    'Fatigue Index': '',
    'Stress Risk Score': '',
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
      const response = await fetch('https://academic-model-backend.onrender.com/api/predict-depression-with-report', {
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
        setError(data.error || 'Failed to get prediction and report');
      }
    } catch (err) {
      setError('An error occurred while fetching the prediction and report');
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
          Please sign in to access Academic Analysis.
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
          <h1 className="text-4xl font-bold">Academic Analysis</h1>
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
          <h2 className="text-xl font-semibold mb-4">Enter Your Details</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Age */}
            <div>
              <label className="block text-gray-300 mb-1">Age</label>
              <input
                type="number"
                name="Age"
                value={formData.Age}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#2d2a4e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="e.g., 20"
                min="0"
                max="100"
                required
              />
            </div>

            {/* Academic Pressure */}
            <div>
              <label className="block text-gray-300 mb-1">Academic Pressure (1-10)</label>
              <input
                type="number"
                name="Academic Pressure"
                value={formData['Academic Pressure']}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#2d2a4e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="e.g., 7"
                min="1"
                max="10"
                required
              />
            </div>

            {/* CGPA */}
            <div>
              <label className="block text-gray-300 mb-1">CGPA (0-10)</label>
              <input
                type="number"
                name="CGPA"
                value={formData.CGPA}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#2d2a4e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="e.g., 8.5"
                min="0"
                max="10"
                step="0.1"
                required
              />
            </div>

            {/* Study Satisfaction */}
            <div>
              <label className="block text-gray-300 mb-1">Study Satisfaction (1-10)</label>
              <input
                type="number"
                name="Study Satisfaction"
                value={formData['Study Satisfaction']}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#2d2a4e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="e.g., 6"
                min="1"
                max="10"
                required
              />
            </div>

            {/* Dietary Habits */}
            <div>
              <label className="block text-gray-300 mb-1">Dietary Habits (1-10)</label>
              <input
                type="number"
                name="Dietary Habits"
                value={formData['Dietary Habits']}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#2d2a4e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="e.g., 5"
                min="1"
                max="10"
                required
              />
            </div>

            {/* Degree */}
            <div>
              <label className="block text-gray-300 mb-1">Degree</label>
              <select
                name="Degree"
                value={formData.Degree}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#2d2a4e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                required
              >
                <option value="Bachelors">Bachelors</option>
                <option value="Masters">Masters</option>
                <option value="PhD">PhD</option>
              </select>
            </div>

            {/* Suicidal Thoughts */}
            <div>
              <label className="block text-gray-300 mb-1">Have you ever had suicidal thoughts?</label>
              <select
                name="Have you ever had suicidal thoughts ?"
                value={formData['Have you ever had suicidal thoughts ?']}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#2d2a4e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                required
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            {/* Work/Study Hours */}
            <div>
              <label className="block text-gray-300 mb-1">Work/Study Hours (per day)</label>
              <input
                type="number"
                name="Work/Study Hours"
                value={formData['Work/Study Hours']}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#2d2a4e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="e.g., 8"
                min="0"
                max="24"
                required
              />
            </div>

            {/* Fatigue Index */}
            <div>
              <label className="block text-gray-300 mb-1">Fatigue Index (1-10)</label>
              <input
                type="number"
                name="Fatigue Index"
                value={formData['Fatigue Index']}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#2d2a4e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="e.g., 4"
                min="1"
                max="10"
                required
              />
            </div>

            {/* Stress Risk Score */}
            <div>
              <label className="block text-gray-300 mb-1">Stress Risk Score (1-10)</label>
              <input
                type="number"
                name="Stress Risk Score"
                value={formData['Stress Risk Score']}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#2d2a4e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="e.g., 3"
                min="1"
                max="10"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2">
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
                {isLoading ? 'Analyzing...' : 'Analyze'}
              </motion.button>
            </div>
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
            className="p-6 bg-[#1a1433] rounded-xl shadow-lg border border-[#2d2a4e] mb-8"
          >
            <h2 className="text-xl font-semibold mb-4">Prediction Result</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-[#2d2a4e] rounded-lg border border-[#3b3665]">
                <p className="text-gray-300">Depression Risk</p>
                <p className={`text-2xl font-bold ${result.prediction === 'Depression' ? 'text-red-400' : 'text-green-400'}`}>
                  {result.prediction}
                </p>
              </div>
              <div className="p-4 bg-[#2d2a4e] rounded-lg border border-[#3b3665]">
                <p className="text-gray-300">Probability of Depression</p>
                <p className="text-2xl font-bold">{(result.probability * 100).toFixed(2)}%</p>
              </div>
              <div className="p-4 bg-[#2d2a4e] rounded-lg border border-[#3b3665]">
                <p className="text-gray-300">Academic Stress Probability</p>
                <p className={`text-2xl font-bold ${result.academic_stress_probability >= 80 ? 'text-red-400' : result.academic_stress_probability >= 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {result.academic_stress_probability.toFixed(2)}%
                </p>
              </div>
            </div>
            {result.prediction === 'Depression' && (
              <div className="mb-6 p-4 bg-red-900 rounded-lg border border-red-800">
                <p className="text-gray-300">
                  Based on the prediction, you may be at risk of depression. We recommend seeking support from a mental health professional.
                </p>
              </div>
            )}
            <h2 className="text-xl font-semibold mb-4">AI-Generated Report</h2>
            <div className="p-4 bg-[#2d2a4e] rounded-lg border border-[#3b3665]">
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{result.llm_report}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}