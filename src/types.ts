/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VirtualExpense {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: string;
  subcategory: string;
  notes: string;
  paymentMode: 'Cash' | 'UPI' | 'Credit Card' | 'Debit Card' | 'Bank Transfer';
}

export interface VirtualCategory {
  id: string;
  name: string;
  subcategories: string[];
}

export interface VirtualBudget {
  categoryName: string;
  limitAmount: number;
}

export interface AppSettings {
  pin: string;
  isPinSet: boolean;
  pinHint?: string; // Optional user PIN hint
  alertThresholdPercentage?: number; // User-customizable notification percentage (fallback/default 80)
  categoryThresholds?: Record<string, number>; // Map of category names to specific alert percentages (e.g. {"Food": 75})
  overallThresholdPercentage?: number; // Customizable overall total budget threshold percentage
  darkMode: boolean;
  backupFrequency: 'Daily' | 'Weekly' | 'Monthly';
  reminderFrequency: 'Every 1 Hour' | 'Every 2 Hours' | 'Every 4 Hours' | 'Disabled';
  lastBackupDate: string | null;
  googleDriveConnected?: boolean;
  googleDriveEmail?: string | null;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  read: boolean;
}
