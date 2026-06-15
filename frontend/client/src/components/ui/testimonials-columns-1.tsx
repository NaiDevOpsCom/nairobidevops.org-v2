"use client";

import { Fragment, useState } from "react";

import { Avatar, AvatarFallback } from "./avatar";

export interface TestimonialsColumnItem {
  text: string;
  avatar?: string; // initials or short text
  avatarColor?: string; // tailwind bg-* class
  name: string;
  role: string;
}

interface TestimonialsColumnProps {
  className?: string;
  testimonials: TestimonialsColumnItem[];
  duration?: number;
}

export function TestimonialsColumn({
  className,
  testimonials,
  duration = 12,
}: TestimonialsColumnProps) {
  const [isPaused, setIsPaused] = useState(false);

  // Slow down the configured duration to improve accessibility (lower speed)
  const animDuration = duration * 2;

  return (
    <div
      className={className}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {/* Keyframes defined inline so animation is scoped to this component */}
      <style>{`
        @keyframes ndcScrollY {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>

      <div
        className="flex flex-col gap-6 pb-6"
        style={{
          animationName: "ndcScrollY",
          animationTimingFunction: "linear",
          animationDuration: `${animDuration}s`,
          animationIterationCount: "infinite",
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        {[...new Array(2)].map((_, loopIndex) => (
          <Fragment key={`column-loop-${loopIndex}`}>
            {testimonials.map(({ text, avatar, avatarColor, name, role }, itemIndex) => (
              <div
                key={`${name}-${itemIndex}`}
                className="p-6 rounded-3xl border shadow-lg shadow-primary/5 bg-background/80 backdrop-blur"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                <p className="text-base leading-relaxed text-muted-foreground">
                  &ldquo;{text}&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-6">
                  <Avatar>
                    <AvatarFallback className={avatarColor ? avatarColor : "bg-muted"}>
                      {avatar ??
                        name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground leading-5 tracking-tight">
                      {name}
                    </span>
                    <span className="text-sm text-muted-foreground leading-5 tracking-tight">
                      {role}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
