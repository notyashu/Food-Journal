
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { sendReminderAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { LogEvent, UserProfile } from '@/lib/types';
import { BellRing } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext'; // Import useAuth to get current user details

interface ReminderButtonProps {
  lastFoodIntakeEvent: LogEvent | undefined;
}

export function ReminderButton({ lastFoodIntakeEvent }: ReminderButtonProps) {
  const { user, userProfile } = useAuth(); // Get current user info
  const [loading, setLoading] = useState(false);
  // State to track target user's FCM token and display name
  const [targetUserInfo, setTargetUserInfo] = useState<{ fcmToken: string | null; displayName: string | null }>({ fcmToken: null, displayName: null });
  const { toast } = useToast();

  useEffect(() => {
    const fetchTargetUserInfo = async () => {
        setTargetUserInfo({ fcmToken: null, displayName: null }); // Reset on event change
        if (lastFoodIntakeEvent?.userId) {
            setLoading(true); // Indicate loading while fetching target user info
            try {
                const userDocRef = doc(db, 'users', lastFoodIntakeEvent.userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const profile = userDocSnap.data() as UserProfile;
                    setTargetUserInfo({
                        fcmToken: profile.fcmToken || null, // Get FCM token or null
                        displayName: profile.displayName || null, // Get display name
                    });
                } else {
                    console.warn(`User profile not found for ID: ${lastFoodIntakeEvent.userId}`);
                    setTargetUserInfo({ fcmToken: null, displayName: null }); // User profile doesn't exist
                }
            } catch (error) {
                console.error("Error fetching target user's info:", error);
                setTargetUserInfo({ fcmToken: null, displayName: null }); // Error occurred
                 toast({
                    title: 'Error',
                    description: 'Could not fetch user details for reminder.',
                    variant: 'destructive',
                });
            } finally {
                 setLoading(false);
            }
        } else {
             setTargetUserInfo({ fcmToken: null, displayName: null }); // No user ID associated with the event
        }
    };

    fetchTargetUserInfo();
  }, [lastFoodIntakeEvent, toast]); // Re-run when the last event changes

  const handleSendReminder = async () => {
    // Ensure we have the necessary info for both target and actor
    if (!lastFoodIntakeEvent?.userId || !targetUserInfo.fcmToken) {
      toast({
        title: 'Cannot Send Reminder',
        description: 'Target user info or FCM token is missing.',
        variant: 'warning',
      });
      return;
    }
    if (!user || !userProfile || !userProfile.groupId) {
        toast({
            title: 'Cannot Send Reminder',
            description: 'Your user information or group ID is missing. Please log in again.',
            variant: 'warning',
        });
        return;
    }


    setLoading(true);
    const result = await sendReminderAction(
        lastFoodIntakeEvent.userId,       // targetUserId
        targetUserInfo.displayName ?? undefined, // targetUserName
        targetUserInfo.fcmToken,          // targetFcmToken
        user.uid,                         // actorUserId
        userProfile.displayName ?? user.email ?? undefined, // actorUserName
        userProfile.groupId               // groupId
    );
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
  // Enable if not loading and target user's FCM token is available
  const canSendReminder = !loading && !!targetUserInfo.fcmToken && !!user && !!userProfile?.groupId;

  return (
    <Button
      onClick={handleSendReminder}
      disabled={loading || !canSendReminder}
      variant="outline"
      className="border-accent text-accent hover:bg-accent/10"
      aria-busy={loading}
      aria-live="polite"
      aria-label="Send reminder notification to last person who ate"
    >
      {loading ? (
        'Processing...' // Covers both fetching info and sending reminder
      ) : (
        <>
         <BellRing className="mr-2 h-4 w-4" /> Send Fridge Reminder
        </>
      )}
    </Button>
  );
}
