'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Utensils, Refrigerator } from 'lucide-react';
import type { LogEvent, EventType } from '@/lib/types';
import { useState } from 'react';
// Input and Label for userIdentifier are removed

interface LogButtonsProps {
  // onLogEvent now expects only the type, as user/group info comes from context
  onLogEvent: (eventData: Pick<LogEvent, 'type' | 'timestamp'>) => Promise<void>;
}

export function LogButtons({ onLogEvent }: LogButtonsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<EventType | null>(null);
  // userIdentifier state is removed

  const handleLog = async (type: EventType) => {
    setLoading(type);
    // Create a partial event object; the full details (userId, groupId, etc.)
    // will be added in the parent component (Home page) using AuthContext.
    const partialEvent: Pick<LogEvent, 'type' | 'timestamp'> = {
      type: type,
      timestamp: new Date(), // Timestamp generated client-side for immediate feedback
    };

    try {
      await onLogEvent(partialEvent);
      // Parent component (Home page) now handles the success/error logic and toasts
      // as it has the full context (user info, etc.)
       toast({
         title: 'Event Logged',
         description: `${type === 'FOOD_INTAKE' ? 'Food intake' : 'Fridge storage'} logged.`,
         variant: 'default',
       });
    } catch (error) {
      // Error handling might still be useful here for button state,
      // but primary error display is in the parent.
      console.error('Initiating log event failed:', error);
        toast({
           title: 'Error',
           description: 'Could not log event. Please try again.',
           variant: 'destructive',
       });
    } finally {
      setLoading(null);
    }
  };

  return (
    // Removed outer div wrapping input and buttons for cleaner layout
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
      {/* User Identifier Input is removed */}
      {/* <div className="flex-1 w-full sm:w-auto"> ... </div> */}

      {/* Buttons take full width available in the flex container */}
      {/* <div className="flex gap-4 w-full sm:w-auto justify-center"> */}
        <Button
          onClick={() => handleLog('FOOD_INTAKE')}
          disabled={loading === 'FOOD_INTAKE'}
          className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none min-w-[140px] w-full sm:w-auto"
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
          // Use theme colors or define a specific style if needed
          className="bg-blue-500 hover:bg-blue-600 text-white flex-1 sm:flex-none min-w-[140px] w-full sm:w-auto" // Example custom color - consider adding to theme if used often
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
      {/* </div> */}
    </div>
  );
}
