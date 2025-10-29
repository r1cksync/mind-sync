'use client';

import { useEffect, Suspense } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

// Dynamically import TechOrbit with explicit extension and loading fallback
const TechOrbit = dynamic(() => import('./TechOrbit.tsx'), {
  ssr: false,
  loading: () => <div className="text-center text-white">Loading Tech Orbit...</div>,
});

// Animation variants for sections
const sectionVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 1, ease: 'easeOut' } },
};

// Animation variants for list items
const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.2, duration: 0.5, ease: 'easeOut' },
  }),
};

export default function HomePage() {
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (!isSignedIn) {
      console.log('User not signed in, skipping API call');
      return;
    }

    const syncUser = async () => {
      const token = await getToken();
      console.log('Clerk session token:', token);

      try {
        const response = await fetch('/api/save-user', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const text = await response.text();
          console.error('Save-user error:', text);
          throw new Error(`HTTP error! status: ${response.status} - ${text}`);
        }

        const data = await response.json();
        console.log('User sync response:', data);
      } catch (err) {
        console.error('Error syncing user:', err.message);
      }
    };

    syncUser();
  }, [isSignedIn, getToken]);

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-center">
          Please sign in to access your MindSync dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Hero Section */}
      <motion.section
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="relative h-screen flex items-center justify-center text-center bg-gradient-to-r from-purple-900 to-indigo-900"
      >
        <div className="z-10">
          <motion.h1
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="text-5xl md:text-7xl font-bold text-white mb-4"
          >
            MindSync
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-xl md:text-2xl text-gray-300 mb-8"
          >
            Empowering your mental well-being with cutting-edge technology.
          </motion.p>
        </div>
      </motion.section>

      {/* Technology Orbit Section */}
      <motion.section
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-gray-900"
      >
        <div className="w-full flex justify-center">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-white mb-8"
          >
            Technologies Powering MindSync
          </motion.h2>
          <Suspense fallback={<div className="text-center text-white">Loading Tech Orbit...</div>}>
            <TechOrbit />
          </Suspense>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-gray-900"
      >
        <div className="text-center">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-white mb-4"
          >
            Explore Your Mental Health
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 1 }}
            viewport={{ once: true }}
            className="text-xl text-gray-300 mb-8"
          >
            Dive into personalized insights with MindSync’s advanced tools.
          </motion.p>
          <ul className="mt-8 max-w-3xl mx-auto space-y-4">
            {[
              { href: '/social-media', text: 'Social Media Analysis: See how your online activity reflects your mood.' },
              { href: '/stress-detection', text: 'Stress Detection: Use a photo to predict your stress level.' },
              { href: '/academic', text: 'Academic Analysis: Understand how academic stress might be affecting you.' },
              { href: '/api/spotify-login', text: 'Music Analysis: Explore how your music preferences relate to your emotions.' },
              { href: '/essay', text: 'Essay Analysis: Analyze your writing to gauge your mental state.' },
            ].map((item, index) => (
              <motion.li
                key={index}
                custom={index}
                variants={listItemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="text-left text-gray-300 hover:text-purple-400 transition-colors"
              >
                <Link href={item.href}>
                  <strong>{item.text.split(':')[0]}:</strong> {item.text.split(':')[1]}
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.section>

      {/* Call to Action Section */}
      <motion.section
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 bg-gray-900"
      >
        <div className="text-center">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-white mb-4"
          >
            Start Your Journey with MindSync
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 1 }}
            viewport={{ once: true }}
            className="text-xl text-gray-300 mb-8"
          >
            Take the first step towards understanding and improving your mental health.
          </motion.p>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
            viewport={{ once: true }}
          >
            <Link href="/social-media" className="inline-block mt-8 px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition shadow-lg">
              Take the Social Media Analysis Test
            </Link>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}