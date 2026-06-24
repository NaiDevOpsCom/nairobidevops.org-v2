// src/lib/youtube.ts
// Utility helpers for extracting YouTube video IDs and generating thumbnail URLs.

const YOUTUBE_THUMBNAIL_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="100%" height="100%" fill="#0f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="Arial, Helvetica, sans-serif" font-size="20">No preview available</text></svg>`
  );

const YOUTUBE_ID_REGEX = /^[0-9A-Za-z_-]{11}$/;

/**
 * Extracts the YouTube video ID from common YouTube URL formats.
 * Returns undefined if no valid ID can be found.
 */
export function extractYouTubeId(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    // Try URL constructor parsing for robustness
    const u = new URL(url);
    // Normalize hostname and whitelist allowed YouTube hostnames/subdomains.
    const host = u.hostname.toLowerCase();
    // Accept the root domain 'youtube.com' or any valid subdomain like 'www.youtube.com', 'm.youtube.com', etc.
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const videoId = u.searchParams.get("v");
      if (videoId && YOUTUBE_ID_REGEX.test(videoId)) {
        return videoId;
      }
      return undefined;
    }
    // Shortened youtu.be links
    if (host === "youtu.be") {
      const pathname = u.pathname.replace(/^\//, "");
      if (pathname && YOUTUBE_ID_REGEX.test(pathname)) {
        return pathname;
      }
      return undefined;
    }
  } catch {
    // Fallback to regex matching when URL parsing fails (e.g., missing scheme)
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:[&?#]|$)/);
    return match ? match[1] : undefined;
  }
  return undefined;
}

/**
 * Returns a YouTube thumbnail URL for the given video URL. If the video URL
 * is invalid or no ID can be extracted, a small SVG data-uri placeholder is returned.
 */
export function getYouTubeThumbnail(
  url?: string,
  quality: "default" | "mqdefault" | "hqdefault" | "sddefault" | "maxresdefault" = "hqdefault"
) {
  const id = extractYouTubeId(url);
  if (!id) return YOUTUBE_THUMBNAIL_PLACEHOLDER;
  // YouTube thumbnail URL pattern
  return `https://i.ytimg.com/vi/${id}/${quality}.jpg`;
}

export const YOUTUBE_THUMBNAIL_PLACEHOLDER_SVG = YOUTUBE_THUMBNAIL_PLACEHOLDER;

export default {
  extractYouTubeId,
  getYouTubeThumbnail,
};
