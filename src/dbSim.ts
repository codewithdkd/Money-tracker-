/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VirtualExpense, VirtualCategory, VirtualBudget, AppSettings, NotificationLog } from './types';

// Default categories as highlighted in the PRD
const DEFAULT_CATEGORIES: VirtualCategory[] = [
  {
    id: 'cat_1',
    name: 'Food',
    subcategories: ['Breakfast', 'Lunch', 'Dinner', 'Groceries', 'Snacks']
  },
  {
    id: 'cat_2',
    name: 'Transport',
    subcategories: ['Auto', 'Metro', 'Fuel', 'Cab', 'Train']
  },
  {
    id: 'cat_3',
    name: 'Shopping',
    subcategories: ['Clothes', 'Electronics', 'Footwear', 'Gifts']
  },
  {
    id: 'cat_4',
    name: 'Bills',
    subcategories: ['Rent', 'Electricity', 'Water', 'Internet', 'Mobile Recharge']
  },
  {
    id: 'cat_5',
    name: 'Entertainment',
    subcategories: ['Movies', 'Streaming', 'Gaming', 'Outings']
  }
];

// Initial Budgets setup matching PRD examples
const DEFAULT_BUDGETS: VirtualBudget[] = [
  { categoryName: 'Food', limitAmount: 6000 },
  { categoryName: 'Transport', limitAmount: 3000 },
  { categoryName: 'Shopping', limitAmount: 10000 },
  { categoryName: 'Bills', limitAmount: 20000 },
  { categoryName: 'Entertainment', limitAmount: 4000 }
];

// Pre-generate realistic historical expenses for March, April, May, and up to June 12, 2026
const GENERATED_EXPENSES: VirtualExpense[] = [];

const DEFAULT_SETTINGS: AppSettings = {
  pin: '1234',
  isPinSet: true, // Default set to 1234, but on first run we can trigger set-up if we want or pre-set
  pinHint: 'Digits 1-4 in ascending order',
  userName: 'Hope',
  alertThresholdPercentage: 80,
  darkMode: false,
  backupFrequency: 'Daily',
  reminderFrequency: 'Every 2 Hours',
  lastBackupDate: 'Never Sync',
  googleDriveConnected: false,
  googleDriveEmail: null
};

export class DbSim {
  static getExpenses(): VirtualExpense[] {
    const raw = localStorage.getItem('et_expenses');
    if (!raw) {
      localStorage.setItem('et_expenses', JSON.stringify(GENERATED_EXPENSES));
      return GENERATED_EXPENSES;
    }
    return JSON.parse(raw);
  }

  static saveExpenses(expenses: VirtualExpense[]) {
    localStorage.setItem('et_expenses', JSON.stringify(expenses));
  }

  static getCategories(): VirtualCategory[] {
    const raw = localStorage.getItem('et_categories');
    if (!raw) {
      localStorage.setItem('et_categories', JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(raw);
  }

  static saveCategories(categories: VirtualCategory[]) {
    localStorage.setItem('et_categories', JSON.stringify(categories));
  }

  static getBudgets(): VirtualBudget[] {
    const raw = localStorage.getItem('et_budgets');
    if (!raw) {
      localStorage.setItem('et_budgets', JSON.stringify(DEFAULT_BUDGETS));
      return DEFAULT_BUDGETS;
    }
    return JSON.parse(raw);
  }

  static saveBudgets(budgets: VirtualBudget[]) {
    localStorage.setItem('et_budgets', JSON.stringify(budgets));
  }

  static getSettings(): AppSettings {
    const raw = localStorage.getItem('et_settings');
    if (!raw) {
      localStorage.setItem('et_settings', JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return JSON.parse(raw);
  }

  static saveSettings(settings: AppSettings) {
    localStorage.setItem('et_settings', JSON.stringify(settings));
  }

  static getNotificationLogs(): NotificationLog[] {
    const raw = localStorage.getItem('et_notification_logs');
    if (!raw) {
      const initialLogs: NotificationLog[] = [];
      localStorage.setItem('et_notification_logs', JSON.stringify(initialLogs));
      return initialLogs;
    }
    return JSON.parse(raw);
  }

  static saveNotificationLogs(logs: NotificationLog[]) {
    localStorage.setItem('et_notification_logs', JSON.stringify(logs));
  }

  // Helper to check budgets of an individual category and overall, returning list of triggered alerts
  static checkBudgetAlerts(categoryName: string, additionalAmount: number): { triggerAlert: boolean; message: string; title: string }[] {
    const expenses = this.getExpenses();
    const budgets = this.getBudgets();
    const settings = this.getSettings();
    const alertThreshold = settings.alertThresholdPercentage ?? 80;
    const categoryThresholds = settings.categoryThresholds ?? {};
    const overallThreshold = settings.overallThresholdPercentage ?? 80;

    const alerts: { triggerAlert: boolean; message: string; title: string }[] = [];
    const currentYearMonth = '2026-06'; // Target current simulated month

    // 1. Check Category Specific Budget Alert
    const budget = budgets.find(b => b.categoryName.toLowerCase() === categoryName.toLowerCase());
    if (budget) {
      const currentExpenditure = expenses
        .filter(e => e.category.toLowerCase() === categoryName.toLowerCase() && e.date.startsWith(currentYearMonth))
        .reduce((sum, e) => sum + e.amount, 0);

      const targetSum = currentExpenditure + additionalAmount;
      const limit = budget.limitAmount;
      const pctValue = (targetSum / limit) * 100;
      
      // Determine the threshold for this category
      const specificThreshold = categoryThresholds[budget.categoryName] ?? alertThreshold;

      if (pctValue >= 100) {
        alerts.push({
          triggerAlert: true,
          title: `🔴 Category Exceeded: ${categoryName}`,
          message: `Category "${categoryName}" has crossed 100% of its budget limit! Spent: ₹${targetSum.toLocaleString()} / ₹${limit.toLocaleString()} (${pctValue.toFixed(1)}%).`
        });
      } else if (pctValue >= specificThreshold) {
        alerts.push({
          triggerAlert: true,
          title: `⚠️ Category Threshold: ${categoryName}`,
          message: `Category "${categoryName}" spent ₹${targetSum.toLocaleString()} of ₹${limit.toLocaleString()} (${pctValue.toFixed(1)}%), crossing its customized warning threshold of ${specificThreshold}%.`
        });
      }
    }

    // 2. Check Overall Budget Alert
    const totalBudget = budgets.reduce((sum, b) => sum + b.limitAmount, 0);
    if (totalBudget > 0) {
      const totalExpenditure = expenses
        .filter(e => e.date.startsWith(currentYearMonth))
        .reduce((sum, e) => sum + e.amount, 0);

      const targetOverall = totalExpenditure + additionalAmount;
      const overallPercent = (targetOverall / totalBudget) * 100;

      if (overallPercent >= 100) {
        alerts.push({
          triggerAlert: true,
          title: `🚨 Overall Budget Exceeded`,
          message: `Total monthly spending has completely capped out your entire combined budget! Spent: ₹${targetOverall.toLocaleString()} of ₹${totalBudget.toLocaleString()} (100%+ used).`
        });
      } else if (overallPercent >= overallThreshold) {
        alerts.push({
          triggerAlert: true,
          title: `⚠️ Overall Budget Warning`,
          message: `Your entire combined monthly budget is now ${overallPercent.toFixed(1)}% utilized, crossing your overall safety warning threshold of ${overallThreshold}%. Spent ₹${targetOverall.toLocaleString()} of ₹${totalBudget.toLocaleString()}.`
        });
      }
    }

    if (alerts.length > 0) {
      const logs = this.getNotificationLogs();
      const newLogs: NotificationLog[] = alerts.map((a, idx) => ({
        id: `not_${Date.now()}_${idx}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        title: a.title,
        message: a.message,
        read: false
      }));
      this.saveNotificationLogs([...newLogs, ...logs]);
    }

    return alerts;
  }

  // Backup data to JSON string representation (SQLite simulator format)
  static generateBackupData(): string {
    const data = {
      expenses: this.getExpenses(),
      categories: this.getCategories(),
      budgets: this.getBudgets(),
      settings: this.getSettings()
    };
    return JSON.stringify(data, null, 2);
  }

  // Restore database tables
  static restoreBackupData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.expenses && parsed.categories && parsed.budgets && parsed.settings) {
        localStorage.setItem('et_expenses', JSON.stringify(parsed.expenses));
        localStorage.setItem('et_categories', JSON.stringify(parsed.categories));
        localStorage.setItem('et_budgets', JSON.stringify(parsed.budgets));
        
        // Retain dark mode but overwrite pin/settings from backup if needed
        const currentSettings = this.getSettings();
        const restoredSettings = {
          ...parsed.settings,
          darkMode: currentSettings.darkMode // retain user UI preference
        };
        localStorage.setItem('et_settings', JSON.stringify(restoredSettings));
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  // Soft Reset to Initial Sample Data
  static resetToDefault() {
    localStorage.removeItem('et_expenses');
    localStorage.removeItem('et_categories');
    localStorage.removeItem('et_budgets');
    localStorage.removeItem('et_settings');
    localStorage.removeItem('et_notification_logs');
  }
}
