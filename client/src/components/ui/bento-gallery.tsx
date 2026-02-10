import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Variants } from "motion/react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { seededRandom } from "@/lib/random";

type ImageItem = {
  id: number | string;
  title: string;
  desc: string;
  url: string;
  span: string; // Tailwind CSS grid span classes
};

// Raw image data structure for the pool
type GalleryImage = {
  url: string;
  alt: string;
  priority?: boolean;
};

interface InteractiveImageBentoGalleryProps {
  imageItems: ImageItem[];
  imagePool: GalleryImage[];
  title: string;
  description: string;
  className?: string;
}

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

const ImageModal = ({ item, onClose }: { item: ImageItem; onClose: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative flex max-h-full max-w-7xl flex-col items-center justify-center outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={item.url}
          alt={item.title}
          className="max-h-[85vh] w-auto rounded-lg object-contain shadow-2xl"
        />
        <div className="mt-4 text-center">
          <h3 className="text-2xl font-bold text-white">{item.title}</h3>
          <p className="mt-2 text-white/80">{item.desc}</p>
        </div>
      </motion.div>
      <button
        onClick={onClose}
        className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white/70 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white"
        aria-label="Close image view"
      >
        <X size={28} />
      </button>
    </motion.div>
  );
};

const transitions = [
  {
    name: "Fade",
    initial: { opacity: 0, scale: 1 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1 },
  },
  {
    name: "Zoom",
    initial: { opacity: 0, scale: 1.1 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  {
    name: "SlideUp",
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  {
    name: "Blur",
    initial: { opacity: 0, filter: "blur(4px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
    exit: { opacity: 0, filter: "blur(4px)" },
  },
];

const GalleryTile = ({
  initialItem,
  imagePool,
  onSelect,
}: {
  initialItem: ImageItem;
  imagePool: GalleryImage[];
  onSelect: (item: ImageItem) => void;
}) => {
  const [currentItem, setCurrentItem] = useState(initialItem);
  const [currentTransition, setCurrentTransition] = useState(transitions[0]);

  useEffect(() => {
    // Random interval between 5s and 12s for a relaxed organic feel
    const intervalTime = seededRandom() * 7000 + 5000;

    const interval = setInterval(() => {
      const randomImage = imagePool[Math.floor(seededRandom() * imagePool.length)];

      // Avoid same image consecutively if pool > 1
      if (imagePool.length > 1 && randomImage.url === currentItem.url) {
        return;
      }

      // Pick a random transition effect
      const randomTransition = transitions[Math.floor(seededRandom() * transitions.length)];
      setCurrentTransition(randomTransition);

      setCurrentItem({
        ...currentItem,
        title: randomImage.alt,
        desc: `Snapshot from our community ${randomImage.alt.toLowerCase()}`,
        url: randomImage.url,
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [currentItem, imagePool]);

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "group relative cursor-zoom-in overflow-hidden rounded-2xl bg-muted",
        "min-h-[300px] w-full",
        currentItem.span
      )}
      onClick={() => onSelect(currentItem)}
      layoutId={`card-${initialItem.id}`} // layoutId stays stable with ID
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.img
          key={currentItem.url}
          src={currentItem.url}
          alt={currentItem.title}
          initial={currentTransition.initial}
          animate={currentTransition.animate}
          exit={currentTransition.exit}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-10" />
      <div className="absolute bottom-0 left-0 w-full p-6 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 z-20">
        <h3 className="line-clamp-1 text-xl font-semibold text-white">{currentItem.title}</h3>
        <p className="line-clamp-1 mt-1 text-sm text-white/80">{currentItem.desc}</p>
      </div>
    </motion.div>
  );
};

const InteractiveImageBentoGallery: React.FC<InteractiveImageBentoGalleryProps> = ({
  imageItems,
  imagePool,
  title,
  description,
  className,
}) => {
  const [selectedItem, setSelectedItem] = useState<ImageItem | null>(null);

  return (
    <section className={cn("py-16 sm:py-24 transition-colors duration-300", className)}>
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center sm:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl"
          >
            {title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground sm:text-xl"
          >
            {description}
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:auto-rows-[300px]"
        >
          {imageItems.map((item) => (
            <GalleryTile
              key={item.id}
              initialItem={item}
              imagePool={imagePool}
              onSelect={setSelectedItem}
            />
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedItem && <ImageModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
      </AnimatePresence>
    </section>
  );
};

export default InteractiveImageBentoGallery;
