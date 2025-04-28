
import type { Timestamp } from 'firebase/firestore';

// Removed NOTIFICATION_SENT event type
export type EventType = 'FOOD_INTAKE' | 'FRIDGE_STORAGE';

export interface LogEvent {
  id: string;
  type: EventType;
  timestamp: Date | Timestamp; // Allow Firestore Timestamp
  userId: string; // Firebase Auth User ID of the actor (who logged the event)
  userName?: string; // Optional: Display name of the actor
  groupId: string; // ID of the group this event belongs to
  // Removed notification-specific fields: targetUserId, targetUserName, notificationType
}

export type UserRole = 'admin' | 'member';

export interface UserProfile {
    uid: string;
    email: string | null; // Keep email as it's used for auth login
    displayName: string; // Make display name required
    // Removed phoneNumber field
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

