'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Utensils, Refrigerator } from 'lucide-react';
import type { LogEvent, EventType } from '@/lib/types';
import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LogButtonsProps {
  onLogEvent: (event: LogEvent) => Promise<void>;
}

export function LogButtons({ onLogEvent }: LogButtonsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<EventType | null>(null);
  const [userIdentifier, setUserIdentifier] = useState<string>('');

  const handleLog = async (type: EventType) => {
    setLoading(type);
    const newEvent: LogEvent = {
      id: crypto.randomUUID(),
      type: type,
      timestamp: new Date(),
      userIdentifier: userIdentifier || undefined, // Add user identifier if provided
    };

    try {
      await onLogEvent(newEvent);
      toast({
        title: 'Event Logged',
        description: `${type === 'FOOD_INTAKE' ? 'Food intake' : 'Fridge storage'} logged successfully at ${new Date().toLocaleTimeString()}.`,
        variant: 'default',
      });
      // Clear identifier after logging 'Ate Food' as the next action is likely 'Fridge Storage' by someone else or reminder needed
      if (type === 'FOOD_INTAKE') {
         // Keep identifier for fridge storage for now, maybe clear later if needed
         // setUserIdentifier('');
      }
    } catch (error) {
      console.error('Failed to log event:', error);
      toast({
        title: 'Error Logging Event',
        description: 'There was a problem saving the event. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
      <div className="flex-1 w-full sm:w-auto">
          <Label htmlFor="userIdentifier" className="mb-1 block text-sm font-medium">Your Identifier (Optional - e.g., Name/Phone# for Reminder)</Label>
          <Input
            id="userIdentifier"
            type="text"
            placeholder="Enter name or phone number"
            value={userIdentifier}
            onChange={(e) => setUserIdentifier(e.target.value)}
            className="mb-4 sm:mb-0"
            aria-label="User Identifier for Logging"
          />
      </div>
      <div className="flex gap-4 w-full sm:w-auto justify-center">
        <Button
          onClick={() => handleLog('FOOD_INTAKE')}
          disabled={loading === 'FOOD_INTAKE'}
          className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none min-w-[140px]"
          aria-busy={loading === 'FOOD_INTAKE'}
          aria-live="polite"
        >
          {loading === 'FOOD_INTAKE' ? (
            'Logging...'
          ) : (
            <>
              <Utensils className="mr-2 h-4 w-4" /> Log Food Intake
            </>
          )}
        </Button>
        <Button
          onClick={() => handleLog('FRIDGE_STORAGE')}
          disabled={loading === 'FRIDGE_STORAGE'}
          className="bg-blue-500 hover:bg-blue-600 text-white flex-1 sm:flex-none min-w-[140px]"
          aria-busy={loading === 'FRIDGE_STORAGE'}
          aria-live="polite"
        >
          {loading === 'FRIDGE_STORAGE' ? (
            'Logging...'
          ) : (
            <>
              <Refrigerator className="mr-2 h-4 w-4" /> Log Fridge Storage
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
