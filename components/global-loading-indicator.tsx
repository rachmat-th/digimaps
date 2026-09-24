"use client";

import { useScrapingContext } from "@/contexts/scraping-context";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function GlobalLoadingIndicator() {
  const { isLoading, progress, statusText, keyword, city } = useScrapingContext();

  if (!isLoading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 shadow-lg"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Status */}
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
              <div>
                <p className="text-sm font-semibold text-white">
                  Scraping in progress
                </p>
                <p className="text-xs text-blue-100">
                  {keyword} • {city}
                </p>
              </div>
            </div>

            {/* Center: Progress */}
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-blue-100">{statusText}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-32 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-sm font-bold text-white min-w-[3ch]">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            {/* Right: Mobile Progress */}
            <div className="md:hidden">
              <span className="text-sm font-bold text-white">
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          {/* Mobile Status Text */}
          <div className="md:hidden mt-2">
            <p className="text-xs text-blue-100 truncate">{statusText}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
