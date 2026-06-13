/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DbSim } from './dbSim';
import { VirtualExpense, VirtualCategory, VirtualBudget, AppSettings } from './types';
import PhoneFrame from './components/PhoneFrame';
import FlutterCodeCenter from './components/FlutterCodeCenter';
import { 
  Terminal, 
  Smartphone, 
  Code2, 
  BookOpen, 
  Info, 
  User, 
  Flame, 
  ShieldAlert,
  HelpCircle,
  Copy,
  ChevronRight,
  RefreshCw,
  Sun,
  Moon
} from 'lucide-react';

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
  const [activeTabPanel, setActiveTabPanel] = useState<'emulator' | 'code' | 'both'>('both');

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
    <div className="min-h-screen bg-slate-900 border-t-4 border-indigo-600 flex flex-col justify-between">
      
      {/* Upper Navigation Master Header */}
      <header className="bg-slate-950 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 px-1.5 bg-indigo-600/10 rounded-md border border-indigo-500/30 text-indigo-400">
              <Terminal className="h-4.5 w-4.5" />
            </span>
            <h1 className="text-md font-black text-white uppercase tracking-wider font-mono">
              Material 3 Expense Tracker
            </h1>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">
            Offline-first Personal Finance Android Application &middot; Flutter & SQLite PRD Companion
          </p>
        </div>

        {/* Core panel view modes toggles */}
        <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800 gap-1 text-[11px] font-bold font-mono">
          <button
            onClick={() => setActiveTabPanel('both')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTabPanel === 'both' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Split Spec
          </button>
          <button
            onClick={() => setActiveTabPanel('emulator')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTabPanel === 'emulator' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Android Phone
          </button>
          <button
            onClick={() => setActiveTabPanel('code')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              activeTabPanel === 'code' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dart / Schema Source
          </button>
        </div>
      </header>

      {/* Main Workspace split panel */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50 dark:bg-slate-950">
        
        {/* Left pane: Operating Emulator Frame (renders if BOTH or EMULATOR is selected) */}
        {(activeTabPanel === 'both' || activeTabPanel === 'emulator') && (
          <div className={`flex flex-col justify-start overflow-y-auto ${
            activeTabPanel === 'emulator' ? 'lg:col-span-12' : 'lg:col-span-5'
          } bg-slate-900/20 dark:bg-slate-950/20 border-r border-slate-800/20 relative z-10 py-6 px-4 shrink-0 shadow-inner`}>
            
            <div className="max-w-[420px] mx-auto w-full space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 shadow-md space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">Interactive Test sandbox Active</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Test out PIN code login sequence (type <strong>1234</strong> or create custom one), manage budgets, add expense items, and filter databases instantly below inside the Material 3 mobile interface!
                </p>
              </div>

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
        )}

        {/* Right pane: Elegant Dart / Flutter / SQL source inspector definitions (renders if BOTH or CODE is selected) */}
        {(activeTabPanel === 'both' || activeTabPanel === 'code') && (
          <div className={`flex flex-col overflow-hidden ${
            activeTabPanel === 'code' ? 'lg:col-span-12' : 'lg:col-span-7'
          }`}>
            <FlutterCodeCenter />
          </div>
        )}

      </main>

      {/* App Footer metadata */}
      <footer className="bg-slate-950 border-t border-slate-900 px-6 py-3 flex flex-col md:flex-row items-center justify-between text-slate-500 text-[10px] gap-2">
        <div className="flex items-center gap-2">
          <span>Project Root:</span>
          <span className="font-mono bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-850">/android/app/src/main/sqlite_schema.sql</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-slate-400 font-bold">● SQLite Cascade Cascades Enabled</span>
          <span className="text-slate-400 font-bold">● Google Drive API v3</span>
          <span>© 2026 Google AI Studio Workspace</span>
        </div>
      </footer>
    </div>
  );
}
