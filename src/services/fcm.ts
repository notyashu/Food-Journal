
'use server';

import { adminMessaging } from '@/lib/firebase-admin';
import type { Message, MulticastMessage } from 'firebase-admin/messaging';

/**
 * Sends an FCM notification to a specific device token.
 *
 * @param fcmToken The registration token of the target device.
 * @param title The title of the notification.
 * @param body The body text of the notification.
 * @returns A promise that resolves to true if the message was sent successfully, false otherwise.
 */
export async function sendFcmNotification(fcmToken: string, title: string, body: string): Promise<boolean> {
  if (!fcmToken) {
    console.error('FCM token is missing.');
    return false;
  }
   if (!adminMessaging) {
        console.error('Firebase Admin Messaging is not initialized. Cannot send FCM notification.');
        return false;
    }


  const message: Message = {
    notification: {
      title: title,
      body: body,
    },
    token: fcmToken,
    // Optional: Add more configuration like 'data' payload, 'android', 'apns', etc.
    // data: {
    //   score: '850',
    //   time: '2:45',
    // },
    // apns: { // Specific config for Apple devices
    //    payload: {
    //        aps: {
    //            sound: 'default', // Play default sound
    //            badge: 1,         // Set badge number
    //        },
    //    },
    //},
    // android: { // Specific config for Android devices
    //    notification: {
    //        sound: 'default',
    //        click_action: 'FLUTTER_NOTIFICATION_CLICK', // Example for Flutter
    //    },
    //},
  };

  try {
    const response = await adminMessaging().send(message);
    console.log('Successfully sent FCM message:', response);
    return true;
  } catch (error) {
    console.error('Error sending FCM message:', error);
    return false;
  }
}

/**
 * Sends the same FCM notification to multiple device tokens.
 *
 * @param fcmTokens An array of registration tokens for the target devices.
 * @param title The title of the notification.
 * @param body The body text of the notification.
 * @returns A promise that resolves to the BatchResponse object from Firebase Admin SDK.
 */
export async function sendMulticastFcmNotification(fcmTokens: string[], title: string, body: string) {
    if (!fcmTokens || fcmTokens.length === 0) {
        console.error('No FCM tokens provided for multicast message.');
        return null; // Or throw an error
    }
     if (!adminMessaging) {
        console.error('Firebase Admin Messaging is not initialized. Cannot send FCM notification.');
        return null;
    }


    const message: MulticastMessage = {
        notification: {
            title: title,
            body: body,
        },
        tokens: fcmTokens,
        // Optional data payload, APNS/Android config as above
    };

    try {
        const response = await adminMessaging().sendEachForMulticast(message);
        console.log(`Successfully sent ${response.successCount} multicast messages out of ${fcmTokens.length}.`);
        if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(fcmTokens[idx]);
                    console.error(`Failed to send to token ${fcmTokens[idx]}:`, resp.error);
                }
            });
            console.warn('Failed tokens:', failedTokens);
        }
        return response;
    } catch (error) {
        console.error('Error sending multicast FCM message:', error);
        return null; // Or re-throw
    }
}
