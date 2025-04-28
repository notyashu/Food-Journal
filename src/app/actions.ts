
'use server';

import { sendFcmNotification } from '@/services/fcm'; // Import FCM service
import { db } from '@/lib/firebase'; // Import Firestore client db
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { LogEvent } from '@/lib/types'; // Import LogEvent type

interface ActionResult {
  success: boolean;
  message: string;
}

// Updated action to send FCM reminder and log the event
export async function sendReminderAction(
    targetUserId: string,
    targetUserName: string | undefined,
    targetFcmToken: string | undefined | null,
    actorUserId: string, // User who initiated the reminder
    actorUserName: string | undefined,
    groupId: string
): Promise<ActionResult> {
  if (!targetFcmToken) {
    return { success: false, message: 'Target user does not have an FCM token. Cannot send notification.' };
  }
  if (!groupId) {
       return { success: false, message: 'Group ID not provided.' };
   }
    if (!actorUserId) {
       return { success: false, message: 'Actor User ID not provided.' };
   }


  const title = 'Food Journal Reminder';
  const message = `Hi ${targetUserName || 'there'}, remember to put the food in the fridge!`;

  try {
    // Send the FCM notification
    const fcmSuccess = await sendFcmNotification(targetFcmToken, title, message);

    if (fcmSuccess) {
        // Log the notification event to Firestore
        const eventLog: Omit<LogEvent, 'id'> = {
            type: 'NOTIFICATION_SENT',
            timestamp: Timestamp.now(),
            userId: actorUserId, // The user *sending* the notification
            userName: actorUserName || 'System',
            groupId: groupId,
            targetUserId: targetUserId, // The user *receiving* the notification
            targetUserName: targetUserName || 'Unknown User',
            notificationType: 'FCM',
        };

        try {
             const eventsColRef = collection(db, 'groups', groupId, 'events');
             await addDoc(eventsColRef, eventLog);
             console.log("Notification sent event logged successfully");
              // Revalidate the main page to show the new event in history
             revalidatePath('/');
             return { success: true, message: 'FCM reminder sent and logged successfully!' };
        } catch (logError) {
             console.error('Error logging notification sent event:', logError);
             // Even if logging fails, the notification might have been sent.
             // Consider the desired behavior here. Maybe return success but with a warning?
             return { success: true, message: 'FCM reminder sent, but failed to log the event.' };
        }

    } else {
        return { success: false, message: 'Failed to send FCM reminder (service error).' };
    }
  } catch (error) {
    console.error('Error sending FCM reminder via server action:', error);
    return { success: false, message: 'An error occurred while attempting to send the reminder.' };
  }
}
