/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DbSim } from './dbSim';
import { VirtualExpense, VirtualCategory, VirtualBudget, AppSettings, MoneySource } from './types';
import PhoneFrame from './components/PhoneFrame';
import FlutterCodeCenter from './components/FlutterCodeCenter';

export default function App() {
  const [expenses, setExpenses] = useState<VirtualExpense[]>([]);
  const [categories, setCategories] = useState<VirtualCategory[]>([]);
  const [budgets, setBudgets] = useState<VirtualBudget[]>([]);
  const [moneySources, setMoneySources] = useState<MoneySource[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    pin: '1234',
    isPinSet: true,
    darkMode: false,
    backupFrequency: 'Daily',
    reminderFrequency: 'Every 2 Hours',
    lastBackupDate: null
  });

  const [isLocked, setIsLocked] = useState<boolean>(true);

  // Load database tables on mount
  useEffect(() => {
    reloadDatabaseState();
  }, []);

  const reloadDatabaseState = () => {
    // Process any active recurring entries to generate occurrences
    const rawExpenses = DbSim.processRecurringTransactions();
    const rawCategories = DbSim.getCategories();
    const rawBudgets = DbSim.getBudgets();
    const rawSources = DbSim.getMoneySources();
    const rawSettings = DbSim.getSettings();

    setExpenses(rawExpenses);
    setCategories(rawCategories);
    setBudgets(rawBudgets);
    setMoneySources(rawSources);
    setSettings(rawSettings);
  };

  const handleAddCategory = (newCat: VirtualCategory) => {
    const updated = [...categories, newCat];
    DbSim.saveCategories(updated);
    setCategories(updated);
  };

  const handleLockApp = () => {
    setIsLocked(true);
  };

  // Sync class name list and listener with dynamic theme selection
  useEffect(() => {
    const applyThemeProperties = () => {
      const pref = settings.themePreference;
      if (pref === 'light') {
        document.documentElement.classList.remove('dark');
      } else if (pref === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        // system theme or legacy setting model
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (pref === 'system') {
          if (systemDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } else {
          // fallback to darkMode boolean
          if (settings.darkMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      }
    };

    applyThemeProperties();

    if (settings.themePreference === 'system' || !settings.themePreference) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyThemeProperties();
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
      } else {
        mediaQuery.addListener(listener);
      }
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', listener);
        } else {
          mediaQuery.removeListener(listener);
        }
      };
    }
  }, [settings.themePreference, settings.darkMode]);

  return (
    <div className="min-h-screen w-screen bg-[#F3EFE7] dark:bg-[#121A17] flex flex-col justify-center items-center p-2 overflow-y-auto select-none">
      <PhoneFrame
        onAddCategory={handleAddCategory}
        expenses={expenses}
        categories={categories}
        budgets={budgets}
        moneySources={moneySources}
        settings={settings}
        setExpenses={setExpenses}
        setCategories={setCategories}
        setBudgets={setBudgets}
        setMoneySources={setMoneySources}
        setSettings={setSettings}
        onLockApp={handleLockApp}
        isLocked={isLocked}
        setIsLocked={setIsLocked}
      />
    </div>
  );
}
