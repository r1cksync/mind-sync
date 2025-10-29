'use client';

import { ClerkProvider, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import './globals.css';
import Link from 'next/link';
import { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { scrollY } = useScroll();
  const backgroundY1 = useTransform(scrollY, [0, 1000], [0, -800]);
  const backgroundY2 = useTransform(scrollY, [0, 1000], [0, -400]);
  const backgroundY3 = useTransform(scrollY, [0, 1000], [0, -200]);
  const opacity1 = useTransform(scrollY, [0, 500], [0.15, 0.6]);
  const opacity2 = useTransform(scrollY, [0, 500], [0.15, 0.5]);
  const opacity3 = useTransform(scrollY, [0, 500], [0.15, 0.4]);
  const backgroundPosY = useTransform(scrollY, [0, 1000], ['0%', '10%']);

  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body style={{ backgroundPositionY: backgroundPosY }}>
          <motion.div
            className="background-layer-1"
            style={{ y: backgroundY1, opacity: opacity1 }}
          />
          <motion.div
            className="background-layer-2"
            style={{ y: backgroundY2, opacity: opacity2 }}
          />
          <motion.div
            className="background-layer-3"
            style={{ y: backgroundY3, opacity: opacity3 }}
          />
          <SignedIn>
            <div className="min-h-screen w-full">
              <div className="flex min-h-screen w-full">
                <div className="flex-1 w-full">{children}</div>
                <div className="fixed right-0 top-0 h-full z-50">
                  <button
                    className="p-4 text-purple-400 hover:text-purple-300"
                    onClick={() => setIsOpen(!isOpen)}
                  >
                    ☰
                  </button>
                  {isOpen && (
                    <nav className="bg-gradient-to-br from-gray-900 to-purple-950 w-64 h-full shadow-lg border-l border-purple-900 shadow-purple-500/50">
                      <ul className="p-4 space-y-4">
                        <li>
                          <Link href="/home" onClick={() => setIsOpen(false)} className="text-purple-300 hover:text-purple-400">
                            Home
                          </Link>
                        </li>
                        <li>
                          <Link href="/social-media" onClick={() => setIsOpen(false)} className="text-purple-300 hover:text-purple-400">
                            Social Media Analysis
                          </Link>
                        </li>
                        <li>
                          <Link href="/academic" onClick={() => setIsOpen(false)} className="text-purple-300 hover:text-purple-400">
                            Academic Analysis
                          </Link>
                        </li>
                        <li>
                          <Link href="/music" onClick={() => setIsOpen(false)} className="text-purple-300 hover:text-purple-400">
                            Music Analysis
                          </Link>
                        </li>
                        <li>
                          <Link href="/essay" onClick={() => setIsOpen(false)} className="text-purple-300 hover:text-purple-400">
                            Essay Analysis
                          </Link>
                        </li>
                        <li>
                          <Link href="/stress-detection" onClick={() => setIsOpen(false)} className="text-purple-300 hover:text-purple-400">
                            Stress Detection
                          </Link>
                        </li>
                        <li>
                          <Link href="/quiz" onClick={() => setIsOpen(false)} className="text-purple-300 hover:text-purple-400">
                            Stress Quiz
                          </Link>
                        </li>
                        <li>
                          <Link href="/report" onClick={() => setIsOpen(false)} className="text-purple-300 hover:text-purple-400">
                            Overall Report
                          </Link>
                        </li>
                        <li>
                          <UserButton afterSignOutUrl="/" />
                        </li>
                      </ul>
                    </nav>
                  )}
                </div>
              </div>
            </div>
          </SignedIn>
          <SignedOut>{children}</SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}