export type EventType = 'FOOD_INTAKE' | 'FRIDGE_STORAGE';

export interface LogEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  userIdentifier?: string; // Optional: To store who performed the action, e.g., phone number
}
