import type { Timestamp } from 'firebase/firestore';

export type EventType = 'FOOD_INTAKE' | 'FRIDGE_STORAGE';

export interface LogEvent {
  id: string;
  type: EventType;
  timestamp: Date | Timestamp; // Allow Firestore Timestamp
  userId: string; // Firebase Auth User ID
  userName?: string; // Optional: Display name of the user
  groupId: string; // ID of the group this event belongs to
  // userIdentifier is removed, use userId and fetch profile if needed
}

export type UserRole = 'admin' | 'member';

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    phoneNumber?: string; // Optional phone number for reminders
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
