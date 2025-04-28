'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { sendReminderAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { LogEvent } from '@/lib/types';
import { BellRing } from 'lucide-react';

interface ReminderButtonProps {
  lastFoodIntakeEvent: LogEvent | undefined;
}

export function ReminderButton({ lastFoodIntakeEvent }: ReminderButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSendReminder = async () => {
    if (!lastFoodIntakeEvent || !lastFoodIntakeEvent.userIdentifier) {
      toast({
        title: 'Cannot Send Reminder',
        description: 'No recent food intake event with a user identifier found.',
        variant: 'destructive',
      });
      return;
    }

    // Basic check if the identifier looks like a phone number (very naive)
    // A proper validation library should be used in a real app.
    const isLikelyPhoneNumber = /^\+?[0-9\s-()]+$/.test(lastFoodIntakeEvent.userIdentifier);

    if (!isLikelyPhoneNumber) {
         toast({
            title: 'Cannot Send Reminder',
            description: 'The identifier associated with the last food intake does not look like a phone number.',
            variant: 'destructive',
        });
        return;
    }


    setLoading(true);
    const result = await sendReminderAction(lastFoodIntakeEvent.userIdentifier);
    setLoading(false);

    if (result.success) {
      toast({
        title: 'Reminder Sent',
        description: result.message,
        variant: 'default',
      });
    } else {
      toast({
        title: 'Reminder Failed',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  const canSendReminder = lastFoodIntakeEvent?.userIdentifier && /^\+?[0-9\s-()]+$/.test(lastFoodIntakeEvent.userIdentifier);

  return (
    <Button
      onClick={handleSendReminder}
      disabled={loading || !canSendReminder}
      variant="outline"
      className="border-accent text-accent hover:bg-accent/10"
      aria-busy={loading}
      aria-live="polite"
      aria-label="Send WhatsApp reminder to last person who ate"
    >
      {loading ? (
        'Sending...'
      ) : (
        <>
         <BellRing className="mr-2 h-4 w-4" /> Send Fridge Reminder
        </>
      )}
    </Button>
  );
}
