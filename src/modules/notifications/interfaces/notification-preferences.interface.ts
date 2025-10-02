import { NotificationType } from '../enums';

export interface NotificationPreferences {
  userId: string;
  email?: {
    enabled: boolean;
    address: string;
  };
  sms?: {
    enabled: boolean;
    phoneNumber: string;
    optedOut?: boolean;
  };
  push?: {
    enabled: boolean;
  };
  allowedTypes?: NotificationType[];
}
