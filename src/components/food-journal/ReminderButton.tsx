'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { sendReminderAction } from '@/app/actions'; // Assuming this action is still relevant
import { useToast } from '@/hooks/use-toast';
import type { LogEvent, UserProfile } from '@/lib/types';
import { BellRing } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ReminderButtonProps {
  lastFoodIntakeEvent: LogEvent | undefined;
}

export function ReminderButton({ lastFoodIntakeEvent }: ReminderButtonProps) {
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null | undefined>(undefined); // undefined initially, null if no number found, string if found
  const { toast } = useToast();

  useEffect(() => {
    const fetchPhoneNumber = async () => {
        setPhoneNumber(undefined); // Reset on event change
        if (lastFoodIntakeEvent?.userId) {
            setLoading(true); // Indicate loading while fetching phone number
            try {
                const userDocRef = doc(db, 'users', lastFoodIntakeEvent.userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const profile = userDocSnap.data() as UserProfile;
                    setPhoneNumber(profile.phoneNumber || null); // Set to null if phoneNumber field is missing or empty
                } else {
                    console.warn(`User profile not found for ID: ${lastFoodIntakeEvent.userId}`);
                    setPhoneNumber(null); // User profile doesn't exist
                }
            } catch (error) {
                console.error("Error fetching user's phone number:", error);
                setPhoneNumber(null); // Error occurred
                 toast({
                    title: 'Error',
                    description: 'Could not fetch user details for reminder.',
                    variant: 'destructive',
                });
            } finally {
                 setLoading(false);
            }
        } else {
             setPhoneNumber(null); // No user ID associated with the event
        }
    };

    fetchPhoneNumber();
  }, [lastFoodIntakeEvent, toast]); // Re-run when the last event changes

  const handleSendReminder = async () => {
    if (!phoneNumber) {
      toast({
        title: 'Cannot Send Reminder',
        description: phoneNumber === undefined ? 'Checking user details...' : 'The last person who ate does not have a phone number set in their profile or could not be found.',
        variant: 'warning', // Use warning as it might not be an error state
      });
      return;
    }

     // Optional: Add more robust phone number validation if needed
     const isLikelyPhoneNumber = /^\+?[0-9\s-()]+$/.test(phoneNumber);
     if (!isLikelyPhoneNumber) {
         toast({
            title: 'Invalid Phone Number',
            description: 'The stored phone number format is invalid.',
            variant: 'destructive',
        });
        return;
     }


    setLoading(true);
    const result = await sendReminderAction(phoneNumber); // Pass the fetched phone number
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

  // Determine if the button should be enabled
  // Enable if not loading, and phone number is fetched and is a non-empty string
  const canSendReminder = !loading && typeof phoneNumber === 'string' && phoneNumber.length > 0;

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
        'Loading...' // Covers both fetching number and sending reminder
      ) : (
        <>
         <BellRing className="mr-2 h-4 w-4" /> Send Fridge Reminder
        </>
      )}
    </Button>
  );
}
