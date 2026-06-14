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
  transactionType?: TransactionType;
  personName?: string; // loan partner or beneficiary
  createdAt?: string;
  updatedAt?: string;
  parentLoanId?: string; // if this is a repayment or return of a loan, link to parent loan transaction
  sourceAccountId?: string; // For standard Expense, Income, LoanGiven, LoanTaken
  fromSourceAccountId?: string; // For Transfer from account
  toSourceAccountId?: string; // For Transfer to account
  recurring?: {
    frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
    active: boolean;
    lastGenerated?: string; // YYYY-MM-DD
  };
}

export interface MoneySource {
  id: string;
  name: string;
  openingBalances: Record<string, number>; // Record of YYYY-MM -> Balance (e.g. {"2026-06": 5000})
  archived: boolean;
  createdAt: string;
  archivedAt?: string;
}

export type TransactionType = 'Expense' | 'Income' | 'LoanGiven' | 'LoanTaken' | 'Transfer';

export interface VirtualCategory {
  id: string;
  name: string;
  subcategories: string[];
  type?: 'expense' | 'income';
}

export interface VirtualBudget {
  categoryName: string;
  limitAmount: number;
}

export interface AppSettings {
  pin: string;
  isPinSet: boolean;
  pinHint?: string; // Optional user PIN hint
  userName?: string; // Optional user profile display name
  alertThresholdPercentage?: number; // User-customizable notification percentage (fallback/default 80)
  categoryThresholds?: Record<string, number>; // Map of category names to specific alert percentages (e.g. {"Food": 75})
  overallThresholdPercentage?: number; // Customizable overall total budget threshold percentage
  darkMode: boolean;
  backupFrequency: 'Daily' | 'Weekly' | 'Monthly';
  reminderFrequency: 'Every 1 Hour' | 'Every 2 Hours' | 'Every 4 Hours' | 'Disabled';
  lastBackupDate: string | null;
  googleDriveConnected?: boolean;
  googleDriveEmail?: string | null;
  currency?: string; // Selected currency symbol (default: '₹')
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  read: boolean;
}
