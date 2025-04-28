'use client'; // This component needs client-side interactivity

import { useState, useEffect } from 'react';
import { LogButtons } from '@/components/food-journal/LogButtons';
import { EventHistory } from '@/components/food-journal/EventHistory';
import { ReminderButton } from '@/components/food-journal/ReminderButton';
import type { LogEvent } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Mock data storage (replace with actual server/DB interaction)
const LOCAL_STORAGE_KEY = 'foodJournalEvents';

async function fetchEvents(): Promise<LogEvent[]> {
  // Simulate fetching from server/localStorage
  if (typeof window !== 'undefined') {
    const storedEvents = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedEvents) {
      try {
        // Need to parse dates correctly
        const parsedEvents = JSON.parse(storedEvents).map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp),
        }));
        return parsedEvents;
      } catch (e) {
        console.error("Failed to parse events from localStorage", e);
        return [];
      }
    }
  }
  return [];
}

async function saveEvent(event: LogEvent): Promise<void> {
  // Simulate saving to server/localStorage
  const currentEvents = await fetchEvents();
  const updatedEvents = [...currentEvents, event];
   if (typeof window !== 'undefined') {
       localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedEvents));
   }
}


export default function Home() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      setIsLoading(true);
      const loadedEvents = await fetchEvents();
      setEvents(loadedEvents);
      setIsLoading(false);
    }
    loadEvents();
  }, []);

  const handleLogEvent = async (newEvent: LogEvent) => {
    await saveEvent(newEvent);
    // Re-fetch or update state optimistically
    const updatedEvents = await fetchEvents();
    setEvents(updatedEvents);
  };

  const lastFoodIntakeEvent = events
    .filter(event => event.type === 'FOOD_INTAKE' && event.userIdentifier)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
      <Card className="w-full max-w-3xl shadow-xl rounded-lg overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-6">
          <CardTitle className="text-3xl font-bold text-center">Food Journal</CardTitle>
          <CardDescription className="text-center text-primary-foreground/80 pt-1">
            Track your meals and when you store them in the fridge.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Log New Event</h2>
            <LogButtons onLogEvent={handleLogEvent} />
          </div>

          <Separator />

           <div className="space-y-4">
             <div className="flex justify-between items-center">
                 <h2 className="text-lg font-semibold text-foreground">Need to Remind?</h2>
                 <ReminderButton lastFoodIntakeEvent={lastFoodIntakeEvent} />
             </div>
            <p className="text-sm text-muted-foreground">
               Send a WhatsApp reminder to the last person who logged eating (if they provided a phone number).
            </p>
          </div>


          <Separator />

          <div className="space-y-4">
             {isLoading ? (
                <p className="text-center text-muted-foreground">Loading event history...</p>
              ) : (
                <EventHistory events={events} />
              )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
