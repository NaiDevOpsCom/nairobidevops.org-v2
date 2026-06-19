import React from "react";

import { getYouTubeThumbnail, YOUTUBE_THUMBNAIL_PLACEHOLDER_SVG } from "@/lib/youtube";

export interface RecordedVideoCardProps {
  id: number;
  title: string;
  videoUrl: string;
  className?: string;
}

/**
 * RecordedVideoCard - A reusable card component for displaying recorded YouTube sessions
 *
 * Features:
 * - YouTube thumbnail with fallback placeholder
 * - Hover effects and animations
 * - Play button overlay
 * - Responsive design
 * - Accessible link with proper ARIA labels
 */
export const RecordedVideoCard: React.FC<RecordedVideoCardProps> = ({
  title,
  videoUrl,
  className = "",
}) => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.src !== YOUTUBE_THUMBNAIL_PLACEHOLDER_SVG) {
      target.src = YOUTUBE_THUMBNAIL_PLACEHOLDER_SVG;
    }
  };

  return (
    <div
      className={`group relative rounded-xl overflow-hidden shadow-xl bg-slate-800 border border-slate-700 hover:border-primary/50 transition-all duration-300 ${className}`}
    >
      {/* Thumbnail Container */}
      <div className="aspect-video relative bg-slate-900 overflow-hidden">
        <img
          src={getYouTubeThumbnail(videoUrl)}
          alt={title}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
          loading="lazy"
          onError={handleImageError}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300 border border-white/20">
            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent opacity-60"></div>
      </div>

      {/* Content Section */}
      <div className="p-5">
        <h4 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h4>
        <div className="flex items-center text-sm text-gray-400 mt-3">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            ></path>
          </svg>
          <span>Watch Recording</span>
        </div>
      </div>

      {/* Full Card Link overlay */}
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 z-10"
        aria-label={`Watch ${title}`}
      ></a>
    </div>
  );
};

export default RecordedVideoCard;
