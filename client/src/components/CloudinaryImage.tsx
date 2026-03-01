import { AdvancedImage, lazyload, responsive, placeholder } from "@cloudinary/react";
import { Cloudinary } from "@cloudinary/url-gen";
import { scale } from "@cloudinary/url-gen/actions/resize";
import React, { useMemo } from "react";

const cloudName =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME) || "";

let cldInstance: Cloudinary | null = null;

function getCloudinaryClient(): Cloudinary | null {
  if (cldInstance) return cldInstance;
  if (!cloudName.trim()) {
    console.warn(
      "CloudinaryImage: Missing VITE_CLOUDINARY_CLOUD_NAME. Cloudinary images will not render. Check your .env setup."
    );
    return null;
  }
  cldInstance = new Cloudinary({
    cloud: {
      cloudName,
    },
  });
  return cldInstance;
}

interface CloudinaryImageProps {
  publicId: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export function CloudinaryImage({ publicId, alt, className, width, height }: CloudinaryImageProps) {
  const cld = getCloudinaryClient();

  const myImage = useMemo(() => {
    if (typeof window === "undefined" || !cld) return null;
    const img = cld.image(publicId);

    // Apply transformations if needed
    if (width || height) {
      const scaleAction = scale();
      if (width) scaleAction.width(width);
      if (height) scaleAction.height(height);
      img.resize(scaleAction);
    }
    return img;
  }, [cld, publicId, width, height]);

  const plugins = useMemo(() => [lazyload(), responsive(), placeholder()], []);

  if (typeof window === "undefined") {
    return null;
  }

  if (!myImage) {
    // Return a placeholder or empty div if Cloudinary is misconfigured
    return (
      <div
        className={`${className} bg-gray-200 animate-pulse rounded flex items-center justify-center`}
        style={{ width, height }}
      >
        <span className="text-gray-400 text-xs">Image unavailable</span>
      </div>
    );
  }

  return <AdvancedImage cldImg={myImage} alt={alt} className={className} plugins={plugins} />;
}
