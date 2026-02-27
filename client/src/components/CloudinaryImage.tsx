import { AdvancedImage, lazyload, responsive, placeholder } from "@cloudinary/react";
import { Cloudinary } from "@cloudinary/url-gen";
import { scale } from "@cloudinary/url-gen/actions/resize";
import React, { useMemo } from "react";

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

if (!cloudName || cloudName.trim() === "") {
  throw new Error(
    "Missing VITE_CLOUDINARY_CLOUD_NAME environment variable. Check your .env setup."
  );
}

const cld = new Cloudinary({
  cloud: {
    cloudName,
  },
});

interface CloudinaryImageProps {
  publicId: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export function CloudinaryImage({ publicId, alt, className, width, height }: CloudinaryImageProps) {
  const myImage = useMemo(() => {
    const img = cld.image(publicId);

    // Apply transformations if needed
    if (width || height) {
      const scaleAction = scale();
      if (width) scaleAction.width(width);
      if (height) scaleAction.height(height);
      img.resize(scaleAction);
    }
    return img;
  }, [publicId, width, height]);

  const plugins = useMemo(() => [lazyload(), responsive(), placeholder()], []);

  return <AdvancedImage cldImg={myImage} alt={alt} className={className} plugins={plugins} />;
}
