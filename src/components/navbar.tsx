'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Menu, X, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/browse', label: 'Browse' },
  { href: '/browse?type=Movie', label: 'Movies' },
  { href: '/browse?status=Ongoing', label: 'Ongoing' },
  { href: '/watchlist', label: 'Watchlist' },
];

interface SearchResult {
  id: string;
  title: string;
  image: string;
  type: string;
  year: number;
  status: string;
}

export function Navbar() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/anime/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearchLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setShowDropdown(false);
      setIsSearchOpen(false);
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    }
    if (e.key === 'Escape') {
      setShowDropdown(false);
      setIsSearchOpen(false);
    }
  };

  const handleResultClick = (id: string) => {
    setShowDropdown(false);
    setIsSearchOpen(false);
    setSearchQuery('');
    router.push(`/anime/${id}`);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-surface-light/50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-primary">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">OXNIME</span>
            </motion.div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors rounded-lg hover:bg-surface-light"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div ref={searchRef} className="relative">
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 220, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="hidden sm:block overflow-visible"
                  >
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search anime..."
                      className="w-full px-4 py-2 bg-surface border border-surface-light rounded-full text-sm focus:outline-none focus:border-primary"
                      autoFocus
                    />

                    {/* Dropdown */}
                    <AnimatePresence>
                      {showDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute top-full mt-2 left-0 right-0 bg-surface border border-surface-light rounded-xl shadow-xl overflow-hidden z-50"
                        >
                          {isSearchLoading ? (
                            <div className="p-3 text-center text-sm text-muted">Searching...</div>
                          ) : searchResults.length === 0 ? (
                            <div className="p-3 text-center text-sm text-muted">Anime tidak ditemukan</div>
                          ) : (
                            searchResults.map((r) => (
                              <button
                                key={r.id}
                                onClick={() => handleResultClick(r.id)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-surface-light transition-colors text-left"
                              >
                                <div className="relative w-10 h-14 rounded-lg overflow-hidden flex-shrink-0">
                                  <Image src={r.image} alt={r.title} fill className="object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{r.title}</p>
                                  <p className="text-xs text-muted">{r.type} · {r.year}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { setIsSearchOpen(!isSearchOpen); if (isSearchOpen) { setSearchQuery(''); setShowDropdown(false); } }}
                className="p-2 text-muted hover:text-foreground transition-colors rounded-lg hover:bg-surface-light"
              >
                {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </motion.button>
            </div>

            {/* Mobile Menu Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-muted hover:text-foreground transition-colors rounded-lg hover:bg-surface-light"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-surface-light/50"
            >
              <div className="py-4 space-y-1">
                {/* Mobile Search */}
                <div className="px-2 pb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search anime..."
                      className="w-full pl-10 pr-4 py-2 bg-surface border border-surface-light rounded-lg text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                {navLinks.map((link, i) => (
                  <motion.div key={link.href} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
                    <Link
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-4 py-3 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-light rounded-lg transition-colors"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
