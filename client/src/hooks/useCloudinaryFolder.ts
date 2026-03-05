import { useState, useCallback, useEffect, useRef } from "react";

import { CloudinaryFolder, CloudinaryResource, CloudinaryResponse } from "../types/cloudinary";

export function useCloudinaryFolder(folder: CloudinaryFolder) {
  const [images, setImages] = useState<CloudinaryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const inFlightCursor = useRef<string | null | undefined>(null);
  const loadMoreController = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const fetchImages = useCallback(
    async (cursor?: string, signal?: AbortSignal) => {
      const requestId = ++requestIdRef.current;
      
      try {
        if (cursor) {
          if (inFlightCursor.current === cursor) return;
          inFlightCursor.current = cursor;
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

        const fetchedResources = data?.images ?? [];

        // Only update state if this is still the latest request
        if (requestId === requestIdRef.current) {
          setImages((prev) => (cursor ? [...prev, ...fetchedResources] : fetchedResources));
          setNextCursor(data.nextCursor);
          setHasMore(data.hasMore);
        }
      } catch (err) {
        if (requestId === requestIdRef.current) {
          if (err instanceof DOMException && err.name === "AbortError") {
            return; // AbortError is expected, ignore for normal control flow
          } else {
            setError(err instanceof Error ? err.message : "An unknown error occurred");
          }
        }
      } finally {
        // Only update loading state if this is still the latest request
        if (requestId === requestIdRef.current) {
          if (cursor) {
            setLoadingMore(false);
            // Only clear if the cursor we started with is still the one in flight
            if (cursor === inFlightCursor.current) {
              inFlightCursor.current = null;
            }
          } else {
            setLoading(false);
          }
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
    inFlightCursor.current = null;

    fetchImages(undefined, controller.signal);
    return () => {
      controller.abort();
      loadMoreController.current?.abort();
    };
  }, [fetchImages, folder]);

  const loadMore = useCallback(() => {
    if (nextCursor && !loadingMore) {
      loadMoreController.current?.abort();
      loadMoreController.current = new AbortController();
      fetchImages(nextCursor, loadMoreController.current.signal);
    }
  }, [nextCursor, loadingMore, fetchImages]);

  const retry = useCallback(() => {
    loadMoreController.current?.abort();
    loadMoreController.current = new AbortController();
    fetchImages(undefined, loadMoreController.current.signal);
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
