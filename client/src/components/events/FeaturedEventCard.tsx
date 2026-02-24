// src/components/events/FeaturedEventCard.tsx
import { Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeaturedEvent } from "@/data/eventsData";

interface FeaturedEventCardProps {
  event: FeaturedEvent;
}

export function FeaturedEventCard({ event }: FeaturedEventCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300 ease-in-out w-full">
      <img
        src={event.image}
        alt={event.title}
        className="w-full h-40 sm:h-48 md:h-56 object-cover transition-transform duration-300 ease-in-out hover:scale-105"
      />
      <CardContent className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center mb-3 flex-wrap gap-2">
          <Badge className={`${event.badgeColor} text-xs sm:text-sm`}>{event.type}</Badge>
          <span className="text-xs sm:text-sm text-muted-foreground flex items-center">
            <Calendar className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
            {event.date}
          </span>
        </div>
        <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-3 line-clamp-2">
          {event.title}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-3">
          {event.description}
        </p>
        <Button className="text-sm sm:text-base">{event.cta}</Button>
      </CardContent>
    </Card>
  );
}
