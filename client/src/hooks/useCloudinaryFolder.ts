import { useState, useCallback, useEffect } from "react";

import { CloudinaryFolder, CloudinaryResource, CloudinaryResponse } from "../types/cloudinary";

export function useCloudinaryFolder(folder: CloudinaryFolder) {
  const [images, setImages] = useState<CloudinaryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);

  const fetchImages = useCallback(
    async (cursor?: string, signal?: AbortSignal) => {
      try {
        if (cursor) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const baseOrigin =
          typeof window === "undefined" ? "http://localhost" : window.location.origin;
        const url = new URL("/api/imagesCloudinary.php", baseOrigin);
        url.searchParams.append("folder", folder);
        if (cursor) {
          url.searchParams.append("next_cursor", cursor);
        }

        const tokenMeta =
          typeof document !== "undefined"
            ? (document.querySelector('meta[name="api-bearer-token"]') as HTMLMetaElement | null)
            : null;
        const token = tokenMeta?.content?.trim();

        const response = await fetch(url.toString(), {
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            ...(token ? { "X-Proxy-Token": token } : {}),
          },
          signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch images: ${response.statusText}`);
        }

        const data: CloudinaryResponse = await response.json();

        if (signal?.aborted) return;

        const fetchedResources = data?.images ?? [];

        setImages((prev) => (cursor ? [...prev, ...fetchedResources] : fetchedResources));
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [folder]
  );

  useEffect(() => {
    const controller = new AbortController();
    // Reset all state when folder changes
    setImages([]);
    setLoading(true);
    setNextCursor(undefined);
    setHasMore(false);
    setLoadingMore(false);

    fetchImages(undefined, controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchImages, folder]);

  const loadMore = useCallback(() => {
    if (nextCursor && !loadingMore) {
      fetchImages(nextCursor);
    }
  }, [nextCursor, loadingMore, fetchImages]);

  const retry = useCallback(() => {
    fetchImages();
  }, [fetchImages]);

  return {
    images,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    retry,
  };
}
