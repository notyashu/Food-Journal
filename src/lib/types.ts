
import type { Timestamp } from 'firebase/firestore';

export type EventType = 'FOOD_INTAKE' | 'FRIDGE_STORAGE';

export interface LogEvent {
  id: string;
  type: EventType;
  timestamp: Date | Timestamp; // Allow Firestore Timestamp and Date objects
  userId: string; // Firebase Auth User ID of the actor (who logged the event)
  userName?: string; // Optional: Display name of the actor
  groupId: string; // ID of the group this event belongs to
}

export type UserRole = 'admin' | 'member';

export interface UserProfile {
    uid: string;
    email: string | null; // Keep email as it's used for auth login
    displayName: string; // Make display name required
    fcmToken?: string | null; // Optional: Firebase Cloud Messaging registration token
    groupId: string | null; // ID of the group the user belongs to
    role: UserRole;
    createdAt: Timestamp;
    groupName?: string; // Optional: Denormalized group name for easier display
}

export interface Group {
    id: string;
    name: string;
    adminIds: string[]; // Array of UIDs of admins for this group
    memberIds: string[]; // Array of UIDs of members
    createdAt: Timestamp;
}
