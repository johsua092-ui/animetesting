"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, ChevronLeft, ChevronRight, Star, Calendar, Clock } from "lucide-react";

const featuredAnime = [
  {
    id: 1,
    title: "Jujutsu Kaisen",
    subtitle: "Shibuya Incident Arc",
    description: "Yuji Itadori and his friends face their greatest challenge yet as they battle powerful curses in the Shibuya Incident. The fate of the jujutsu world hangs in the balance.",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80",
    rating: 9.2,
    year: 2023,
    episodes: 23,
    duration: "24 min",
    genres: ["Action", "Supernatural", "Dark Fantasy"],
    color: "from-violet-600",
  },
  {
    id: 2,
    title: "Demon Slayer",
    subtitle: "Swordsmith Village Arc",
    description: "Tanjiro journeys to the Swordsmith Village to get his sword repaired. There, he encounters new allies and faces powerful new demons in breathtaking battles.",
    image: "https://images.unsplash.com/photo-1541562232579-512a21360020?w=1920&q=80",
    rating: 9.0,
    year: 2023,
    episodes: 11,
    duration: "24 min",
    genres: ["Action", "Adventure", "Supernatural"],
    color: "from-amber-600",
  },
  {
    id: 3,
    title: "Attack on Titan",
    subtitle: "The Final Season",
    description: "The epic conclusion to the saga of Eren Yeager and the battle for humanity's survival. The truth behind the Titans is finally revealed.",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&q=80",
    rating: 9.4,
    year: 2023,
    episodes: 12,
    duration: "24 min",
    genres: ["Action", "Drama", "Mystery"],
    color: "from-emerald-600",
  },
];

export function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredAnime.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredAnime.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredAnime.length) % featuredAnime.length);
  };

  const current = featuredAnime[currentIndex];

  return (
    <section className="relative h-screen max-h-[900px] min-h-[600px] overflow-hidden">
      {/* Background Image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <Image
            src={current.image}
            alt={current.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 hero-gradient" />
          <div className={`absolute inset-0 bg-gradient-to-t ${current.color}/20 to-transparent opacity-50`} />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 h-full flex items-end pb-24 pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5 }}
              >
                {/* Genres */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {current.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full border border-primary/30"
                    >
                      {genre}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-2">
                  {current.title}
                </h1>
                <p className="text-xl sm:text-2xl text-primary font-medium mb-4">
                  {current.subtitle}
                </p>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-white font-semibold">{current.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{current.year}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{current.episodes} Episodes</span>
                  </div>
                  <span>{current.duration}</span>
                </div>

                {/* Description */}
                <p className="text-base text-gray-300 mb-8 line-clamp-3 leading-relaxed">
                  {current.description}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4">
                  <Link href={`/watch/${current.id}`}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition-colors glow-primary"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      Watch Now
                    </motion.button>
                  </Link>
                  <Link href={`/anime/${current.id}`}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-8 py-3 bg-surface-light hover:bg-surface text-white font-semibold rounded-full transition-colors border border-surface-light"
                    >
                      <Info className="w-5 h-5" />
                      More Info
                    </motion.button>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <div className="absolute bottom-1/2 translate-y-1/2 left-4 right-4 z-20 flex justify-between pointer-events-none">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={prevSlide}
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors pointer-events-auto"
        >
          <ChevronLeft className="w-6 h-6" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={nextSlide}
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors pointer-events-auto"
        >
          <ChevronRight className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {featuredAnime.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex ? "w-8 bg-primary" : "w-2 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
