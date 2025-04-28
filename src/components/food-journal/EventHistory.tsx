'use client';

import type { LogEvent } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Utensils, Refrigerator } from 'lucide-react';
import { format } from 'date-fns';
import type { Timestamp } from 'firebase/firestore'; // Import Timestamp

interface EventHistoryProps {
  events: LogEvent[];
}

// Helper function to safely convert Timestamp to Date
const getDateFromTimestamp = (timestamp: Date | Timestamp): Date => {
    if (timestamp instanceof Date) {
        return timestamp;
    }
    // Check if it's a Firestore Timestamp-like object before calling toDate
    if (timestamp && typeof (timestamp as Timestamp).toDate === 'function') {
        return (timestamp as Timestamp).toDate();
    }
    // Fallback or handle error if it's neither
    console.warn("Received unexpected timestamp format:", timestamp);
    return new Date(); // Or return an invalid date, or throw an error
};


export function EventHistory({ events }: EventHistoryProps) {
  // Sort events ensuring timestamps are Date objects before comparison
  const sortedEvents = [...events].sort((a, b) => {
        const dateA = getDateFromTimestamp(a.timestamp);
        const dateB = getDateFromTimestamp(b.timestamp);
        return dateB.getTime() - dateA.getTime();
    });

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
              {sortedEvents.map((event) => {
                 const eventDate = getDateFromTimestamp(event.timestamp); // Get Date object
                 return (
                    <li
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-md bg-secondary shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        {event.type === 'FOOD_INTAKE' ? (
                          <Utensils className="h-5 w-5 text-primary" aria-label="Food Intake Icon" />
                        ) : (
                           // Consistent icon usage
                          <Refrigerator className="h-5 w-5 text-blue-500" aria-label="Fridge Storage Icon" />
                        )}
                        <span className="font-medium">
                          {event.type === 'FOOD_INTAKE' ? 'Ate Food' : 'Stored in Fridge'}
                        </span>
                        {/* Display userName if available */}
                        {event.userName && (
                          <span className="text-xs text-muted-foreground">(by {event.userName})</span>
                        )}
                      </div>
                      <span className="text-sm text-accent font-semibold">
                        {/* Format the Date object */}
                        {format(eventDate, 'PPpp')}
                      </span>
                    </li>
                  );
              })}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
