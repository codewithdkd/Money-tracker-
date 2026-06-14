/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VirtualExpense, VirtualCategory, VirtualBudget, AppSettings, NotificationLog, MoneySource } from './types';

// Default categories with separate income/expense types
const DEFAULT_CATEGORIES: VirtualCategory[] = [
  // --- EXPENSE CATEGORIES ---
  { id: 'cat_food', name: 'Food', subcategories: ['Breakfast', 'Lunch', 'Dinner', 'Groceries', 'Snacks'], type: 'expense' },
  { id: 'cat_shopping', name: 'Shopping', subcategories: ['Clothes', 'Electronics', 'Footwear', 'Gifts'], type: 'expense' },
  { id: 'cat_travel', name: 'Travel', subcategories: ['Metro', 'Train', 'Bus', 'Cab'], type: 'expense' },
  { id: 'cat_fuel', name: 'Fuel', subcategories: ['Petrol', 'Diesel', 'Gasoline', 'EV Charge'], type: 'expense' },
  { id: 'cat_rent', name: 'Rent', subcategories: ['Flat Rent', 'Maintenance', 'PG', 'Office Rent'], type: 'expense' },
  { id: 'cat_utilities', name: 'Utilities', subcategories: ['Electricity', 'Water', 'Internet', 'Mobile Recharge', 'Gas'], type: 'expense' },
  { id: 'cat_medical', name: 'Medical', subcategories: ['Medicines', 'Doctor Consultation', 'Lab Tests', 'Hospitalization'], type: 'expense' },
  { id: 'cat_ent', name: 'Entertainment', subcategories: ['Movies', 'Streaming', 'Gaming', 'Outings'], type: 'expense' },
  { id: 'cat_edu', name: 'Education', subcategories: ['Course Fees', 'Books', 'Certifications'], type: 'expense' },
  { id: 'cat_invest', name: 'Investment', subcategories: ['Stocks', 'Mutual Funds', 'Gold', 'Real Estate', 'Crypto'], type: 'expense' },
  { id: 'cat_misc', name: 'Miscellaneous', subcategories: ['General Expenses'], type: 'expense' },

  // --- INCOME CATEGORIES ---
  { id: 'cat_salary', name: 'Salary', subcategories: ['Base Salary', 'Overtime', 'Allowances'], type: 'income' },
  { id: 'cat_bonus', name: 'Bonus', subcategories: ['Festival Bonus', 'Performance Bonus'], type: 'income' },
  { id: 'cat_incentive', name: 'Incentive', subcategories: ['Sales Commission', 'Referrals'], type: 'income' },
  { id: 'cat_freelance', name: 'Freelancing', subcategories: ['Web Dev Contract', 'UI/UX Design', 'Consulting'], type: 'income' },
  { id: 'cat_biz', name: 'Business Income', subcategories: ['Store Profits', 'Ad Revenue', 'Affiliate Sales'], type: 'income' },
  { id: 'cat_interest', name: 'Interest', subcategories: ['FD Interest', 'Dividends', 'Savings Yield'], type: 'income' },
  { id: 'cat_refund', name: 'Refund', subcategories: ['Tax Refund', 'Cashback', 'Returns'], type: 'income' },
  { id: 'cat_gift', name: 'Gift Received', subcategories: ['Birthday Cash', 'Gift Card Code'], type: 'income' },
  { id: 'cat_rental_inc', name: 'Rental Income', subcategories: ['House Rent', 'Commercial Rent'], type: 'income' },
  { id: 'cat_other_inc', name: 'Other Income', subcategories: ['Scrap Sale', 'Miscellaneous Bonus'], type: 'income' }
];

// Initial Budgets setup
const DEFAULT_BUDGETS: VirtualBudget[] = [
  { categoryName: 'Food', limitAmount: 15000 },
  { categoryName: 'Shopping', limitAmount: 20000 },
  { categoryName: 'Rent', limitAmount: 22000 },
  { categoryName: 'Utilities', limitAmount: 8000 },
  { categoryName: 'Entertainment', limitAmount: 8000 },
  { categoryName: 'Medical', limitAmount: 5000 },
  { categoryName: 'Travel', limitAmount: 6000 }
];

// Rich set of pre-generated realistic financial transactions for March, April, May, and June 2026
const GENERATED_EXPENSES: VirtualExpense[] = [
  // --- MARCH 2026 ---
  { id: 'm_sal', date: '2026-03-01', amount: 95000, category: 'Salary', subcategory: 'Base Salary', notes: 'Monthly office package credited', paymentMode: 'Bank Transfer', transactionType: 'Income' },
  { id: 'm_rent', date: '2026-03-02', amount: 15000, category: 'Rent', subcategory: 'Flat Rent', notes: 'Owner rent transfer direct', paymentMode: 'Bank Transfer', transactionType: 'Expense' },
  { id: 'm_food', date: '2026-03-05', amount: 4500, category: 'Food', subcategory: 'Groceries', notes: 'Monthly supermarket refill', paymentMode: 'Debit Card', transactionType: 'Expense' },
  { id: 'm_elec', date: '2026-03-08', amount: 3200, category: 'Utilities', subcategory: 'Electricity', notes: 'State supply board bill', paymentMode: 'UPI', transactionType: 'Expense' },
  { id: 'm_shop', date: '2026-03-12', amount: 11000, category: 'Shopping', subcategory: 'Electronics', notes: 'Bought ANC headphones online', paymentMode: 'Credit Card', transactionType: 'Expense' },
  { id: 'm_free', date: '2026-03-15', amount: 12000, category: 'Freelancing', subcategory: 'UI/UX Design', notes: 'React app wireframes client pay', paymentMode: 'Bank Transfer', transactionType: 'Income' },
  { id: 'loan_rakesh_m', date: '2026-03-18', amount: 25000, category: 'Other Income', subcategory: 'Miscellaneous Bonus', notes: 'Family emergency loan taken', paymentMode: 'Cash', transactionType: 'LoanTaken', personName: 'Rakesh Sharma' },

  // --- APRIL 2026 ---
  { id: 'a_sal', date: '2026-04-01', amount: 95000, category: 'Salary', subcategory: 'Base Salary', notes: 'Monthly office package credited', paymentMode: 'Bank Transfer', transactionType: 'Income' },
  { id: 'a_rent', date: '2026-04-02', amount: 15000, category: 'Rent', subcategory: 'Flat Rent', notes: 'Owner rent transfer direct', paymentMode: 'Bank Transfer', transactionType: 'Expense' },
  { id: 'loan_sumit_a', date: '2026-04-05', amount: 12000, category: 'Investment', subcategory: 'Mutual Funds', notes: 'Helped Sumit pay college semester fees', paymentMode: 'UPI', transactionType: 'LoanGiven', personName: 'Sumit Verma' },
  { id: 'a_food', date: '2026-04-10', amount: 3800, category: 'Food', subcategory: 'Groceries', notes: 'Vegetables and pantry restocking', paymentMode: 'UPI', transactionType: 'Expense' },
  { id: 'a_repay_rakesh', date: '2026-04-12', amount: 10000, category: 'Medical', subcategory: 'Doctor Consultation', notes: 'Repaid 1st installment back', paymentMode: 'UPI', transactionType: 'Expense', personName: 'Rakesh Sharma', parentLoanId: 'loan_rakesh_m' },
  { id: 'a_free', date: '2026-04-20', amount: 18500, category: 'Freelancing', subcategory: 'Web Dev Contract', notes: 'Tailwind website landing page delivery', paymentMode: 'UPI', transactionType: 'Income' },
  { id: 'a_fuel', date: '2026-04-22', amount: 4800, category: 'Fuel', subcategory: 'Petrol', notes: 'Car fuel full tank done', paymentMode: 'Credit Card', transactionType: 'Expense' },

  // --- MAY 2026 ---
  { id: 'y_sal', date: '2026-05-01', amount: 95000, category: 'Salary', subcategory: 'Base Salary', notes: 'Monthly office package credited', paymentMode: 'Bank Transfer', transactionType: 'Income' },
  { id: 'y_rent', date: '2026-05-02', amount: 15000, category: 'Rent', subcategory: 'Flat Rent', notes: 'Owner rent transfer direct', paymentMode: 'Bank Transfer', transactionType: 'Expense' },
  { id: 'y_food', date: '2026-05-06', amount: 5120, category: 'Food', subcategory: 'Dinner', notes: 'Birthday celebration with team', paymentMode: 'UPI', transactionType: 'Expense' },
  { id: 'y_repay_sumit', date: '2026-05-10', amount: 5000, category: 'Refund', subcategory: 'Cashback', notes: 'Sumit returned first partial payment', paymentMode: 'UPI', transactionType: 'Income', personName: 'Sumit Verma', parentLoanId: 'loan_sumit_a' },
  { id: 'y_repay_rakesh', date: '2026-05-15', amount: 5000, category: 'Medical', subcategory: 'Medicines', notes: 'Repaid 2nd installment back', paymentMode: 'Cash', transactionType: 'Expense', personName: 'Rakesh Sharma', parentLoanId: 'loan_rakesh_m' },
  { id: 'y_free', date: '2026-05-18', amount: 22000, category: 'Freelancing', subcategory: 'Consulting', notes: 'Cloud migration audit session', paymentMode: 'Bank Transfer', transactionType: 'Income' },
  { id: 'y_ent', date: '2026-05-24', amount: 3500, category: 'Entertainment', subcategory: 'Movies', notes: 'Multiplex gold seats + food', paymentMode: 'Credit Card', transactionType: 'Expense' },

  // --- JUNE 2026 ---
  { id: 'j_sal', date: '2026-06-01', amount: 95000, category: 'Salary', subcategory: 'Base Salary', notes: 'First of Month salary credit', paymentMode: 'Bank Transfer', transactionType: 'Income' },
  { id: 'j_rent', date: '2026-06-02', amount: 15000, category: 'Rent', subcategory: 'Flat Rent', notes: 'Auto transfer monthly rent to owner', paymentMode: 'Bank Transfer', transactionType: 'Expense' },
  { id: 'j_tf1', date: '2026-06-04', amount: 5000, category: 'Miscellaneous', subcategory: 'General Expenses', notes: 'Withdrew cash for wallet fallback', paymentMode: 'Debit Card', transactionType: 'Transfer', personName: 'Self: Bank to Cash Pocket' },
  { id: 'j_elec', date: '2026-06-05', amount: 4800, category: 'Utilities', subcategory: 'Electricity', notes: 'Summer AC power supply bill', paymentMode: 'UPI', transactionType: 'Expense' },
  { id: 'j_food', date: '2026-06-08', amount: 4300, category: 'Food', subcategory: 'Groceries', notes: 'Weekly grocery basket', paymentMode: 'UPI', transactionType: 'Expense' },
  { id: 'j_free', date: '2026-06-10', amount: 15000, category: 'Freelancing', subcategory: 'UI/UX Design', notes: 'Dashboard Figma screens final milestone', paymentMode: 'UPI', transactionType: 'Income' },
  { id: 'j_shopping', date: '2026-06-12', amount: 7500, category: 'Shopping', subcategory: 'Clothes', notes: 'Denim wear plus sneakers', paymentMode: 'Credit Card', transactionType: 'Expense' }
];

const DEFAULT_SETTINGS: AppSettings = {
  pin: '1234',
  isPinSet: true,
  pinHint: 'Digits 1-4 in ascending order',
  userName: 'User',
  alertThresholdPercentage: 80,
  darkMode: true,
  themePreference: 'system',
  backupFrequency: 'Daily',
  reminderFrequency: 'Every 2 Hours',
  lastBackupDate: 'Never Sync',
  googleDriveConnected: false,
  googleDriveEmail: null,
  currency: '₹'
};

const DEFAULT_SOURCES: MoneySource[] = [
  {
    id: 'source_cash',
    name: 'Cash Wallet',
    openingBalances: {
      '2026-03': 10000,
      '2026-04': 8000,
      '2026-05': 12000,
      '2026-06': 5000
    },
    archived: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'source_bank',
    name: 'Bank Account',
    openingBalances: {
      '2026-03': 40000,
      '2026-04': 30000,
      '2026-05': 45000,
      '2026-06': 50000
    },
    archived: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'source_savings',
    name: 'Savings Account',
    openingBalances: {
      '2026-03': 80000,
      '2026-04': 85000,
      '2026-05': 90000,
      '2026-06': 100000
    },
    archived: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'source_upi',
    name: 'UPI Wallet',
    openingBalances: {
      '2026-03': 5000,
      '2026-04': 4000,
      '2026-05': 3000,
      '2026-06': 2000
    },
    archived: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'source_card',
    name: 'Credit Card',
    openingBalances: {
      '2026-03': 0,
      '2026-04': 0,
      '2026-05': 0,
      '2026-06': 0
    },
    archived: false,
    createdAt: new Date().toISOString()
  }
];

export class DbSim {
  static getExpenses(): VirtualExpense[] {
    const raw = localStorage.getItem('et_expenses');
    if (!raw) {
      // For default seed data, pre-assign source IDs before first write
      const seeded = GENERATED_EXPENSES.map(e => {
        if (e.transactionType === 'Transfer') {
          e.fromSourceAccountId = 'source_bank';
          e.toSourceAccountId = 'source_cash';
          e.createdAt = e.createdAt || new Date(e.date).toISOString();
          e.updatedAt = e.updatedAt || new Date(e.date).toISOString();
        } else {
          e.createdAt = e.createdAt || new Date(e.date).toISOString();
          e.updatedAt = e.updatedAt || new Date(e.date).toISOString();
          if (e.paymentMode === 'Cash') e.sourceAccountId = 'source_cash';
          else if (e.paymentMode === 'UPI') e.sourceAccountId = 'source_upi';
          else if (e.paymentMode === 'Credit Card') e.sourceAccountId = 'source_card';
          else e.sourceAccountId = 'source_bank';
        }
        return e;
      });
      localStorage.setItem('et_expenses', JSON.stringify(seeded));
      return seeded;
    }
    // Parse actions and migrate elements automatically
    const parsed: VirtualExpense[] = JSON.parse(raw);
    let dirty = false;
    const migrated = parsed.map(e => {
      let isMigrated = false;
      if (!e.transactionType) {
        e.transactionType = 'Expense'; // default migrate
        e.createdAt = e.createdAt || new Date(e.date).toISOString();
        e.updatedAt = e.updatedAt || new Date(e.date).toISOString();
        isMigrated = true;
      }
      
      // Migrate missing target accounts for seed/existing data
      if (e.transactionType === 'Transfer') {
        if (!e.fromSourceAccountId) {
          e.fromSourceAccountId = 'source_bank';
          isMigrated = true;
        }
        if (!e.toSourceAccountId) {
          e.toSourceAccountId = 'source_cash';
          isMigrated = true;
        }
      } else {
        if (!e.sourceAccountId) {
          if (e.paymentMode === 'Cash') e.sourceAccountId = 'source_cash';
          else if (e.paymentMode === 'UPI') e.sourceAccountId = 'source_upi';
          else if (e.paymentMode === 'Credit Card') e.sourceAccountId = 'source_card';
          else e.sourceAccountId = 'source_bank';
          isMigrated = true;
        }
      }

      if (isMigrated) {
        dirty = true;
      }
      return e;
    });

    if (dirty) {
      localStorage.setItem('et_expenses', JSON.stringify(migrated));
    }
    return migrated;
  }

  static saveExpenses(expenses: VirtualExpense[]) {
    localStorage.setItem('et_expenses', JSON.stringify(expenses));
  }

  static getMoneySources(): MoneySource[] {
    const raw = localStorage.getItem('et_moneysources');
    if (!raw) {
      localStorage.setItem('et_moneysources', JSON.stringify(DEFAULT_SOURCES));
      return DEFAULT_SOURCES;
    }
    return JSON.parse(raw);
  }

  static saveMoneySources(sources: MoneySource[]) {
    localStorage.setItem('et_moneysources', JSON.stringify(sources));
  }

  static getCategories(): VirtualCategory[] {
    const raw = localStorage.getItem('et_categories');
    if (!raw) {
      localStorage.setItem('et_categories', JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    const categories: VirtualCategory[] = JSON.parse(raw);
    // Backward compatibility: ensure all default categories exist in list
    let updated = [...categories];
    let isChanged = false;
    DEFAULT_CATEGORIES.forEach(dc => {
      if (!updated.some(c => c.name.toLowerCase() === dc.name.toLowerCase())) {
        updated.push(dc);
        isChanged = true;
      }
    });
    if (isChanged) {
      localStorage.setItem('et_categories', JSON.stringify(updated));
      return updated;
    }
    return categories;
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
    const parsed = JSON.parse(raw);
    if (!parsed.currency) {
      parsed.currency = '₹';
    }
    if (!parsed.themePreference) {
      parsed.themePreference = parsed.darkMode ? 'dark' : 'light';
    }
    localStorage.setItem('et_settings', JSON.stringify(parsed));
    return parsed;
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

  // Processes any active recurring entries to spin forward future occurrences up to current date
  static processRecurringTransactions(): VirtualExpense[] {
    const expenses = this.getExpenses();
    const todayStr = new Date().toISOString().substring(0, 10);
    const today = new Date(todayStr);
    let updated = false;
    const newEntries: VirtualExpense[] = [];

    const processedExpenses = expenses.map(e => {
      if (e.recurring && e.recurring.active) {
        let lastGenStr = e.recurring.lastGenerated || e.date;
        let lastGen = new Date(lastGenStr);
        let spawnedAtLeastOnce = false;

        while (true) {
          const nextDate = new Date(lastGen);
          if (e.recurring.frequency === 'Daily') {
            nextDate.setDate(nextDate.getDate() + 1);
          } else if (e.recurring.frequency === 'Weekly') {
            nextDate.setDate(nextDate.getDate() + 7);
          } else if (e.recurring.frequency === 'Monthly') {
            nextDate.setMonth(nextDate.getMonth() + 1);
          } else if (e.recurring.frequency === 'Yearly') {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
          }

          if (nextDate <= today) {
            const nextDateStr = nextDate.toISOString().substring(0, 10);
            const newId = `exp_rec_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
            const newTx: VirtualExpense = {
              ...e,
              id: newId,
              date: nextDateStr,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              recurring: undefined // generated instances are normal transaction items
            };
            newEntries.push(newTx);
            lastGen = nextDate;
            spawnedAtLeastOnce = true;
            updated = true;
          } else {
            break;
          }
        }
        if (spawnedAtLeastOnce) {
          e.recurring = {
            ...e.recurring,
            lastGenerated: lastGen.toISOString().substring(0, 10)
          };
        }
      }
      return e;
    });

    if (newEntries.length > 0) {
      const allExpenses = [...processedExpenses, ...newEntries];
      this.saveExpenses(allExpenses);
      return allExpenses;
    }
    
    if (updated) {
      this.saveExpenses(processedExpenses);
    }
    return processedExpenses;
  }

  // Check category and overall budgets alert
  static checkBudgetAlerts(categoryName: string, additionalAmount: number): { triggerAlert: boolean; message: string; title: string }[] {
    const expenses = this.getExpenses();
    const budgets = this.getBudgets();
    const settings = this.getSettings();
    const alertThreshold = settings.alertThresholdPercentage ?? 80;
    const categoryThresholds = settings.categoryThresholds ?? {};
    const overallThreshold = settings.overallThresholdPercentage ?? 80;

    const alerts: { triggerAlert: boolean; message: string; title: string }[] = [];
    const currentYearMonth = new Date().toISOString().substring(0, 7); // Active actual client-side year-month

    // Check budget limit
    const budget = budgets.find(b => b.categoryName.toLowerCase() === categoryName.toLowerCase());
    if (budget) {
      const currentExpenditure = expenses
        .filter(e => e.transactionType === 'Expense' && e.category.toLowerCase() === categoryName.toLowerCase() && e.date.startsWith(currentYearMonth))
        .reduce((sum, e) => sum + e.amount, 0);

      const targetSum = currentExpenditure + additionalAmount;
      const limit = budget.limitAmount;
      const pctValue = (targetSum / limit) * 100;
      
      const specificThreshold = categoryThresholds[budget.categoryName] ?? alertThreshold;

      if (pctValue >= 100) {
        alerts.push({
          triggerAlert: true,
          title: `🔴 Category Exceeded: ${categoryName}`,
          message: `Category "${categoryName}" has crossed 100% of its budget limit! Spent: ${settings.currency || '₹'}${targetSum.toLocaleString()} / ${settings.currency || '₹'}${limit.toLocaleString()} (${pctValue.toFixed(1)}%).`
        });
      } else if (pctValue >= specificThreshold) {
        alerts.push({
          triggerAlert: true,
          title: `⚠️ Category Threshold: ${categoryName}`,
          message: `Category "${categoryName}" spent ${settings.currency || '₹'}${targetSum.toLocaleString()} of ${settings.currency || '₹'}${limit.toLocaleString()} (${pctValue.toFixed(1)}%), crossing safety warning threshold of ${specificThreshold}%.`
        });
      }
    }

    // Check Overall Budget Limit
    const totalBudget = budgets.reduce((sum, b) => sum + b.limitAmount, 0);
    if (totalBudget > 0) {
      const totalExpenditure = expenses
        .filter(e => e.transactionType === 'Expense' && e.date.startsWith(currentYearMonth))
        .reduce((sum, e) => sum + e.amount, 0);

      const targetOverall = totalExpenditure + additionalAmount;
      const overallPercent = (targetOverall / totalBudget) * 100;

      if (overallPercent >= 100) {
        alerts.push({
          triggerAlert: true,
          title: `🚨 Overall Budget Exceeded`,
          message: `Total monthly spending has completely capped out your entire combined budget! Spent: ${settings.currency || '₹'}${targetOverall.toLocaleString()} of ${settings.currency || '₹'}${totalBudget.toLocaleString()} (100%+ used).`
        });
      } else if (overallPercent >= overallThreshold) {
        alerts.push({
          triggerAlert: true,
          title: `⚠️ Overall Budget Warning`,
          message: `Your entire combined monthly budget is now ${overallPercent.toFixed(1)}% utilized, crossing safety warning threshold of ${overallThreshold}%. Spent ${settings.currency || '₹'}${targetOverall.toLocaleString()} of ${settings.currency || '₹'}${totalBudget.toLocaleString()}.`
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

  static generateBackupData(): string {
    const data = {
      expenses: this.getExpenses(),
      categories: this.getCategories(),
      budgets: this.getBudgets(),
      settings: this.getSettings()
    };
    return JSON.stringify(data, null, 2);
  }

  static restoreBackupData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.expenses && parsed.categories && parsed.budgets && parsed.settings) {
        localStorage.setItem('et_expenses', JSON.stringify(parsed.expenses));
        localStorage.setItem('et_categories', JSON.stringify(parsed.categories));
        localStorage.setItem('et_budgets', JSON.stringify(parsed.budgets));
        
        const currentSettings = this.getSettings();
        const restoredSettings = {
          ...parsed.settings,
          darkMode: currentSettings.darkMode
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

  static resetToDefault() {
    localStorage.removeItem('et_expenses');
    localStorage.removeItem('et_categories');
    localStorage.removeItem('et_budgets');
    localStorage.removeItem('et_settings');
    localStorage.removeItem('et_notification_logs');
  }
}
