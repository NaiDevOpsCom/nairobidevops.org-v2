// src/components/events/UpcomingEventCard.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UpcomingEvent } from "@/data/eventsData";

interface UpcomingEventCardProps {
  event: UpcomingEvent;
}

export function UpcomingEventCard({ event }: UpcomingEventCardProps) {
  return (
    <Card className="bg-muted/40 dark:bg-gray-800 hover:shadow-xl transition-shadow duration-300 ease-in-out">
      <CardContent className="p-6 text-center">
        <h4 className="text-xl font-semibold text-foreground mb-2">{event.title}</h4>
        <p className="text-muted-foreground text-sm mb-4">{event.description}</p>
        <p className="font-semibold text-foreground mb-4">{event.date}</p>
        <Button variant="secondary">{event.buttonText}</Button>
      </CardContent>
    </Card>
  );
}
