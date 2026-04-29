"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Star, Clock } from "lucide-react";

interface AnimeCardProps {
  id: string | number;
  title: string;
  image: string;
  rating: number;
  episode?: number;
  type?: "TV" | "Movie" | "OVA";
  status?: "Ongoing" | "Completed";
  index?: number;
}

export function AnimeCard({
  id,
  title,
  image,
  rating,
  episode,
  type = "TV",
  status,
  index = 0,
}: AnimeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="anime-card group"
    >
      <Link href={`/anime/${id}`} className="block">
        <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface">
          {/* Image */}
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

          {/* Play Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center glow-primary">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
          </motion.div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {status && (
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                status === "Ongoing" 
                  ? "bg-green-500/80 text-white" 
                  : "bg-blue-500/80 text-white"
              }`}>
                {status}
              </span>
            )}
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-surface-light/80 text-white">
              {type}
            </span>
          </div>

          {/* Rating */}
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-bold text-white">{rating}</span>
          </div>

          {/* Episode Badge */}
          {episode && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/80 backdrop-blur-sm">
              <Clock className="w-3 h-3 text-white" />
              <span className="text-xs font-bold text-white">EP {episode}</span>
            </div>
          )}

          {/* Title */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight">
              {title}
            </h3>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
