import { PlusIcon } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";

import { partnersData } from "@/data/partnersData";
import { seededRandom, seededShuffle } from "@/lib/random";
import { cn } from "@/lib/utils";

// --- Types and Constants ---

type Logo = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

// Filter and map logos from the campusTour category, ensuring no empty logos are included.
const allLogos: Logo[] = partnersData.campusTour
  .filter((p) => p.logo) // Validate that the logo field is not empty
  .map((p) => ({ src: p.logo, alt: p.name }));

// --- Main Component: LogoCloud ---

type LogoCloudProps = React.ComponentProps<"div">;

export function LogoCloud({ className, ...props }: LogoCloudProps) {
  // Prepare a shuffled list of unique logos for initial display
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const initialLogos = useMemo(() => {
    const logos = [...allLogos];
    const shuffled: Logo[] = [];
    const count = 8;

    if (logos.length === 0) return [];

    // Create a pool of 8 logos, repeating if necessary
    for (let i = 0; i < count; i++) {
      shuffled.push(logos[i % logos.length]);
    }

    // Shuffle the pool using a fixed seed for consistent initial rendering
    return seededShuffle(shuffled, 12345);
  }, []);

  if (allLogos.length === 0) {
    return null; // Don't render anything if there are no logos to display
  }

  return (
    <div className={cn("relative grid grid-cols-2 border-x md:grid-cols-4", className)} {...props}>
      <div className="-translate-x-1/2 -top-px pointer-events-none absolute left-1/2 w-screen border-t" />

      <LogoCard
        className="relative border-r border-b bg-ndc-primary-light-blue dark:bg-secondary/30"
        initialLogo={initialLogos[0]}
        allLogos={allLogos}
      >
        <PlusIcon
          className="-right-[12.5px] -bottom-[12.5px] absolute z-10 size-6"
          strokeWidth={1}
        />
      </LogoCard>

      <LogoCard
        className="border-b md:border-r"
        initialLogo={initialLogos[1]}
        allLogos={allLogos}
      />

      <LogoCard
        className="relative border-r border-b md:bg-ndc-primary-light-blue dark:md:bg-secondary/30"
        initialLogo={initialLogos[2]}
        allLogos={allLogos}
      >
        <PlusIcon
          className="-right-[12.5px] -bottom-[12.5px] absolute z-10 size-6"
          strokeWidth={1}
        />
        <PlusIcon
          className="-bottom-[12.5px] -left-[12.5px] absolute z-10 hidden size-6 md:block"
          strokeWidth={1}
        />
      </LogoCard>

      <LogoCard
        className="relative border-b bg-ndc-primary-light-blue md:bg-background dark:bg-secondary/30 md:dark:bg-background"
        initialLogo={initialLogos[3]}
        allLogos={allLogos}
      />

      <LogoCard
        className="relative border-r border-b bg-ndc-primary-light-blue md:border-b-0 md:bg-background dark:bg-secondary/30 md:dark:bg-background"
        initialLogo={initialLogos[4]}
        allLogos={allLogos}
      >
        <PlusIcon
          className="-right-[12.5px] -bottom-[12.5px] md:-left-[12.5px] absolute z-10 size-6 md:hidden"
          strokeWidth={1}
        />
      </LogoCard>

      <LogoCard
        className="border-b bg-background md:border-r md:border-b-0 md:bg-ndc-primary-light-blue dark:md:bg-secondary/30"
        initialLogo={initialLogos[5]}
        allLogos={allLogos}
      />

      <LogoCard className="border-r" initialLogo={initialLogos[6]} allLogos={allLogos} />

      <LogoCard
        className="bg-ndc-primary-light-blue dark:bg-secondary/30"
        initialLogo={initialLogos[7]}
        allLogos={allLogos}
      />

      <div className="-translate-x-1/2 -bottom-px pointer-events-none absolute left-1/2 w-screen border-b" />
    </div>
  );
}

// --- LogoCard Component with Individual Animation ---

type LogoCardProps = React.ComponentProps<"div"> & {
  initialLogo: Logo;
  allLogos: Logo[];
};

function LogoCard({ initialLogo, allLogos, className, children, ...props }: LogoCardProps) {
  const [currentLogo, setCurrentLogo] = useState(initialLogo);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Track the pending timeout so we can cancel it on cleanup and avoid
    // setting state after the component unmounts.
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const changeLogo = () => {
      setIsFading(true);
      // Wait for fade-out to complete before changing the logo and fading back in
      timeoutId = setTimeout(() => {
        setCurrentLogo((prevLogo) => {
          if (allLogos.length > 1) {
            let newLogo: Logo;
            do {
              const idx = Math.floor(seededRandom() * allLogos.length);
              newLogo = allLogos[idx];
            } while (newLogo.src === prevLogo.src);
            return newLogo;
          }
          return prevLogo;
        });
        setIsFading(false);
      }, 1000); // This duration should match the CSS transition
    };

    // Set a random interval for each card to change its logo (between 5 and 10 seconds)
    // We use a ref or just let the effect re-run. Since we depend on currentLogo,
    // the effect re-runs every time the logo changes. This is actually fine and creates
    // a new random interval for the next change.
    const randomInterval = seededRandom() * 5000 + 5000;
    const intervalId = setInterval(changeLogo, randomInterval);

    return () => {
      clearInterval(intervalId);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [currentLogo, allLogos]);

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-background px-4 py-8 md:p-8 transition-opacity duration-1000 ease-in-out", // Slower, smoother transition
        isFading ? "opacity-0" : "opacity-100",
        className
      )}
      {...props}
    >
      <img
        alt={currentLogo.alt}
        className="pointer-events-none h-20 select-none md:h-24 dark:brightness-0 dark:invert"
        height={currentLogo.height}
        src={currentLogo.src}
        width={currentLogo.width}
      />
      {children}
    </div>
  );
}
