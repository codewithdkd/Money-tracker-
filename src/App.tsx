/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DbSim } from './dbSim';
import { VirtualExpense, VirtualCategory, VirtualBudget, AppSettings } from './types';
import PhoneFrame from './components/PhoneFrame';

export default function App() {
  const [expenses, setExpenses] = useState<VirtualExpense[]>([]);
  const [categories, setCategories] = useState<VirtualCategory[]>([]);
  const [budgets, setBudgets] = useState<VirtualBudget[]>([]);
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
    const rawExpenses = DbSim.getExpenses();
    const rawCategories = DbSim.getCategories();
    const rawBudgets = DbSim.getBudgets();
    const rawSettings = DbSim.getSettings();

    setExpenses(rawExpenses);
    setCategories(rawCategories);
    setBudgets(rawBudgets);
    setSettings(rawSettings);

    // Apply global body dark class reflecting settings
    if (rawSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleAddCategory = (newCat: VirtualCategory) => {
    const updated = [...categories, newCat];
    DbSim.saveCategories(updated);
    setCategories(updated);
  };

  const handleLockApp = () => {
    setIsLocked(true);
  };

  // Toggle Dark/Light mode globally tracking the emulator settings
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center items-center overflow-hidden">
      <div className="w-full max-w-full flex-1 flex flex-col justify-center items-center">
        <PhoneFrame
          onAddCategory={handleAddCategory}
          expenses={expenses}
          categories={categories}
          budgets={budgets}
          settings={settings}
          setExpenses={setExpenses}
          setCategories={setCategories}
          setBudgets={setBudgets}
          setSettings={setSettings}
          onLockApp={handleLockApp}
          isLocked={isLocked}
          setIsLocked={setIsLocked}
        />
      </div>
    </div>
  );
}
