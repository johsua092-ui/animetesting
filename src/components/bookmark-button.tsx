'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';

interface BookmarkButtonProps {
  animeId: string;
  initialBookmarked: boolean;
}

export function BookmarkButton({ animeId, initialBookmarked }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animeId }),
      });

      if (res.status === 401) {
        alert('Login dulu untuk bookmark anime!');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setIsBookmarked(data.bookmarked);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleToggle}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        isBookmarked
          ? 'bg-primary text-white'
          : 'bg-surface-light hover:bg-surface text-foreground'
      }`}
      title={isBookmarked ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
      {isBookmarked ? 'Saved' : 'Watchlist'}
    </motion.button>
  );
}
