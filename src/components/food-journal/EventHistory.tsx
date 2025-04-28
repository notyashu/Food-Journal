'use client';

import type { LogEvent } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Utensils, Refrigerator } from 'lucide-react';
import { format } from 'date-fns';

interface EventHistoryProps {
  events: LogEvent[];
}

export function EventHistory({ events }: EventHistoryProps) {
  const sortedEvents = [...events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Event History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {sortedEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No events logged yet.</p>
          ) : (
            <ul className="space-y-3">
              {sortedEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-md bg-secondary shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    {event.type === 'FOOD_INTAKE' ? (
                      <Utensils className="h-5 w-5 text-primary" aria-label="Food Intake Icon" />
                    ) : (
                      <Refrigerator className="h-5 w-5 text-blue-500" aria-label="Fridge Storage Icon" />
                    )}
                    <span className="font-medium">
                      {event.type === 'FOOD_INTAKE' ? 'Ate Food' : 'Stored in Fridge'}
                    </span>
                    {event.userIdentifier && (
                      <span className="text-xs text-muted-foreground">(by {event.userIdentifier})</span>
                    )}
                  </div>
                  <span className="text-sm text-accent font-semibold">
                    {format(event.timestamp, 'PPpp')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
