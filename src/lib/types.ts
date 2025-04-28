
import type { Timestamp } from 'firebase/firestore';

// Added NOTIFICATION_SENT event type
export type EventType = 'FOOD_INTAKE' | 'FRIDGE_STORAGE' | 'NOTIFICATION_SENT';

export interface LogEvent {
  id: string;
  type: EventType;
  timestamp: Date | Timestamp; // Allow Firestore Timestamp
  userId: string; // Firebase Auth User ID of the actor (who logged the event / who initiated the notification)
  userName?: string; // Optional: Display name of the actor
  groupId: string; // ID of the group this event belongs to

  // Fields specific to NOTIFICATION_SENT events
  targetUserId?: string; // UID of the user the notification was sent to
  targetUserName?: string; // Display name of the user the notification was sent to
  notificationType?: 'FCM' | 'WhatsApp'; // Type of notification sent
}

export type UserRole = 'admin' | 'member';

export interface UserProfile {
    uid: string;
    email: string | null; // Keep email as it's used for auth login
    displayName: string; // Make display name required
    phoneNumber: string; // Keep phone number required for now, but might be removed later
    fcmToken?: string | null; // Optional: Firebase Cloud Messaging registration token
    groupId: string | null; // ID of the group the user belongs to
    role: UserRole;
    createdAt: Timestamp;
}

export interface Group {
    id: string;
    name: string;
    adminIds: string[]; // Array of UIDs of admins for this group
    memberIds: string[]; // Array of UIDs of members
    createdAt: Timestamp;
}
