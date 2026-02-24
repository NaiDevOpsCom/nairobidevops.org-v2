import InteractiveImageBentoGallery from "@/components/ui/bento-gallery";
import { communityGallery } from "@/data/galleryData";

// Transform gallery data to match bento gallery format
const bentoGalleryItems = communityGallery.map((image, index) => {
  // Create a visually interesting pattern
  // Pattern: Large, Small, Small, Long, Small, Small...
  let span = "col-span-1 row-span-1";

  const patternIndex = index % 5;
  if (patternIndex === 0) {
    span = "md:col-span-2 md:row-span-2"; // Large square
  } else if (patternIndex === 3) {
    span = "md:col-span-2 md:row-span-1"; // Wide rectangle
  }

  return {
    id: index,
    title: image.alt,
    desc: `Snapshot from our community ${image.alt.toLowerCase()}`,
    url: image.url,
    span: span,
  };
});

export default function Gallery() {
  return (
    <div id="gallery">
      <InteractiveImageBentoGallery
        imageItems={bentoGalleryItems}
        imagePool={communityGallery}
        title="Snapshots of Our Journey"
        description="Explore moments from our Events, MeetUps, workshops, community events, and Collaborations"
        className="bg-[#d3d3d3] dark:bg-ndc-darkblue"
      />
    </div>
  );
}
