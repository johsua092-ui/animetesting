"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Flame, Sparkles, Clock, TrendingUp } from "lucide-react";
import { AnimeCard } from "./anime-card";

interface Anime {
  id: string | number;
  title: string;
  image: string;
  rating: number;
  episode?: number;
  type?: "TV" | "Movie" | "OVA";
  status?: "Ongoing" | "Completed";
}

interface AnimeSectionProps {
  title: string;
  subtitle?: string;
  animeList: Anime[];
  icon?: "flame" | "sparkles" | "clock" | "trending";
  viewAllHref?: string;
  variant?: "grid" | "slider";
}

const iconMap = {
  flame: Flame,
  sparkles: Sparkles,
  clock: Clock,
  trending: TrendingUp,
};

export function AnimeSection({
  title,
  subtitle,
  animeList,
  icon = "flame",
  viewAllHref = "#",
  variant = "grid",
}: AnimeSectionProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const Icon = iconMap[icon];

  const scroll = (direction: "left" | "right") => {
    if (sliderRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              icon === "flame" ? "bg-orange-500/20 text-orange-500" :
              icon === "sparkles" ? "bg-purple-500/20 text-purple-500" :
              icon === "clock" ? "bg-blue-500/20 text-blue-500" :
              "bg-green-500/20 text-green-500"
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{title}</h2>
              {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
            </div>
          </div>
          <Link
            href={viewAllHref}
            className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
          >
            View All
          </Link>
        </div>

        {variant === "slider" ? (
          <div className="relative group">
            {/* Navigation Buttons */}
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-surface/90 backdrop-blur-sm border border-surface-light flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-white hover:border-primary"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-surface/90 backdrop-blur-sm border border-surface-light flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-white hover:border-primary"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Slider */}
            <div
              ref={sliderRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 -mx-4 px-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {animeList.map((anime, index) => (
                <div key={anime.id} className="flex-shrink-0 w-[180px] snap-start">
                  <AnimeCard {...anime} index={index} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {animeList.map((anime, index) => (
              <AnimeCard key={anime.id} {...anime} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
