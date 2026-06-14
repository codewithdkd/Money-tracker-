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
    <div className="min-h-screen w-screen bg-slate-100 dark:bg-slate-950 flex flex-col lg:flex-row overflow-hidden">
      {/* Interactive Mobile Emulator Block */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 overflow-y-auto lg:overflow-hidden select-none">
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

      {/* Flutter Mobile Specifications & Dart SQLite Code Base panel */}
      <div className="w-full lg:w-[480px] xl:w-[580px] border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col bg-slate-900 overflow-hidden h-96 lg:h-full">
        <FlutterCodeCenter />
      </div>
    </div>
  );
}
