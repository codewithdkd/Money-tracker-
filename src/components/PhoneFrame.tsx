/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, 
  Battery, 
  Clock, 
  Bell, 
  Layers, 
  PlusCircle, 
  TrendingUp, 
  Sliders, 
  LogOut, 
  Smartphone, 
  FileSpreadsheet, 
  FileText,
  Flame,
  User,
  Calendar,
  Activity,
  Menu,
  ChevronDown
} from 'lucide-react';
import { VirtualExpense, VirtualCategory, VirtualBudget, AppSettings, NotificationLog } from '../types';
import { DbSim } from '../dbSim';

// Render imports
import PinScreen from './PinScreen';
import DashboardScreen from './DashboardScreen';
import AddExpenseScreen from './AddExpenseScreen';
import AnalysisScreen from './AnalysisScreen';
import SettingsScreen from './SettingsScreen';

interface PhoneFrameProps {
  onAddCategory: (cat: VirtualCategory) => void;
  expenses: VirtualExpense[];
  categories: VirtualCategory[];
  budgets: VirtualBudget[];
  settings: AppSettings;
  setExpenses: React.Dispatch<React.SetStateAction<VirtualExpense[]>>;
  setCategories: React.Dispatch<React.SetStateAction<VirtualCategory[]>>;
  setBudgets: React.Dispatch<React.SetStateAction<VirtualBudget[]>>;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onLockApp: () => void;
  isLocked: boolean;
  setIsLocked: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function PhoneFrame({
  onAddCategory,
  expenses,
  categories,
  budgets,
  settings,
  setExpenses,
  setCategories,
  setBudgets,
  setSettings,
  onLockApp,
  isLocked,
  setIsLocked
}: PhoneFrameProps) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'add' | 'analysis' | 'settings'>('dashboard');

  // Trigger PIN setup or bypass based on configuration
  const handleUnlock = () => {
    setIsLocked(false);
  };

  const handleUpdatePin = (newPin: string, hint?: string, userName?: string) => {
    const updated: AppSettings = {
      ...settings,
      pin: newPin,
      isPinSet: true,
      ...(hint !== undefined ? { pinHint: hint } : {}),
      ...(userName !== undefined ? { userName } : {})
    };
    DbSim.saveSettings(updated);
    setSettings(updated);
  };

  // State calculations
  const [dbNotificationLogs, setDbNotificationLogs] = useState<NotificationLog[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState<boolean>(false);
  const [incomingAlert, setIncomingAlert] = useState<{ title: string; message: string } | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateString, setCurrentDateString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
      
      const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
      setCurrentDateString(now.toLocaleDateString('en-US', options));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Read notifications
    const logs = DbSim.getNotificationLogs();
    setDbNotificationLogs(logs);
    setUnreadNotificationsCount(logs.filter(l => !l.read).length);
  }, [expenses]);

  // Request notification permissions on boot
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // System alert notification triggerer
  const handleTriggerNotification = (title: string, message: string) => {
    setIncomingAlert({ title, message });

    // Audio beep alarm representation
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // Standard high frequency ping
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    }

    // Trigger REAL physical Android panel / browser notification popup!
    if ('Notification' in window && Notification.permission === 'granted') {
      const options = {
        body: message,
        icon: '/icon.svg',
        badge: '/icon.svg',
        vibrate: [200, 100, 200],
        tag: 'expense-tracker-alert'
      };

      // Best practice for installed PWAs: trigger notification via service worker registration
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, options);
        }).catch(() => {
          new Notification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    }

    // Refresh notification count logs
    const logs = DbSim.getNotificationLogs();
    setDbNotificationLogs(logs);
    setUnreadNotificationsCount(logs.filter(l => !l.read).length);

    // Auto dismiss banners
    setTimeout(() => {
      setIncomingAlert(null);
    }, 2500);
  };

  const handleMarkNotificationsRead = () => {
    const updated = dbNotificationLogs.map(l => ({ ...l, read: true }));
    DbSim.saveNotificationLogs(updated);
    setDbNotificationLogs(updated);
    setUnreadNotificationsCount(0);
  };

  // Simulated Report Exports PDF & Excel in react sandbox
  const handleDownloadReport = (format: 'pdf' | 'excel', scope: 'monthly' | 'annual') => {
    const period = scope === 'monthly' ? 'June 2026' : 'Year 2026';
    
    if (format === 'excel') {
      // Create CSV mock mimicking sheet output
      const csvContent = "data:text/csv;charset=utf-8," 
        + `Period,${period} Transaction Ledger\n`
        + "Date,Category,Subcategory,Amount (INR),Payment Mode,Notes\n"
        + expenses.map(e => `"${e.date}","${e.category}","${e.subcategory}","${e.amount}","${e.paymentMode}","${e.notes}"`).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `ExpenseReport_${period.replace(' ', '_')}.xlsx.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      handleTriggerNotification(
        'Excel Spreadsheet Exported',
        `Successfully generated and saved ${period} spreadsheet statement.`
      );
    } else {
      // Trigger instant rendering of print layout
      const reportWindow = window.open("", "_blank");
      if (reportWindow) {
        const categoriesSummary = categories.map(c => {
          const sum = expenses
            .filter(e => e.category.toLowerCase() === c.name.toLowerCase() && (scope === 'annual' || e.date.substring(0, 7) === '2026-06'))
            .reduce((sum, e) => sum + e.amount, 0);
          return { name: c.name, sum };
        }).filter(c => c.sum > 0);

        const totalSectoredSum = categoriesSummary.reduce((sum, c) => sum + c.sum, 0);

        reportWindow.document.write(`
          <html>
            <head>
              <title>Expense Tracker mobile export report</title>
              <style>
                body { font-family: monospace; padding: 40px; color: #1e293b; background: #fafafa; }
                h1 { border-bottom: 2px solid #6366f1; padding-bottom: 5px; color: #1e1b4b; }
                .metric-box { background: #e0f2fe; padding: 15px; border-radius: 8px; font-weight: bold; font-size: 1.2rem; border-left: 5px solid #0284c7; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #334155; color: white; padding: 10px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #cbd5e1; }
                .text-right { text-align: right; }
              </style>
            </head>
            <body>
              <h1>Expense Tracker - Offline Statement Report</h1>
              <p>Requested Scope: <strong>${period} Report Sheet</strong></p>
              
              <div class="metric-box">
                Total Expenditure Summary: INR ${totalSectoredSum.toLocaleString()}
              </div>

              <h3>Category Allocations</h3>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th class="text-right">Sum (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoriesSummary.map(c => `
                    <tr>
                      <td>${c.name}</td>
                      <td class="text-right">₹${c.sum.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <h3>Detailed offline logs transactions ledger</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Subcategory</th>
                    <th>Payment</th>
                    <th class="text-right">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  ${expenses.map(e => `
                    <tr>
                      <td>${e.date}</td>
                      <td>${e.category}</td>
                      <td>${e.subcategory}</td>
                      <td>${e.paymentMode}</td>
                      <td class="text-right">₹${e.amount}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <script>window.print();</script>
            </body>
          </html>
        `);
        reportWindow.document.close();
      }
      
      handleTriggerNotification(
        'PDF Statement Generated',
        `Ready-to-print PDF container launched inside dedicated window.`
      );
    }
  };

  // State mutations routing callbacks
  const handleAddNewExpense = (newExp: VirtualExpense) => {
    const updated = [newExp, ...expenses];
    DbSim.saveExpenses(updated);
    setExpenses(updated);
  };

  const handleUpdateExistingExpense = (updatedExp: VirtualExpense) => {
    const updated = expenses.map(e => e.id === updatedExp.id ? updatedExp : e);
    DbSim.saveExpenses(updated);
    setExpenses(updated);
  };

  const handleDeleteExistingExpense = (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    DbSim.saveExpenses(updated);
    setExpenses(updated);
  };

  // Global triggers to restore local database context on action
  const handleReloadLocalDatabaseFromBackup = () => {
    const freshExpenses = DbSim.getExpenses();
    const freshCategories = DbSim.getCategories();
    const freshBudgets = DbSim.getBudgets();
    const freshSettings = DbSim.getSettings();

    setExpenses(freshExpenses);
    setCategories(freshCategories);
    setBudgets(freshBudgets);
    setSettings(freshSettings);
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 lg:p-6 bg-slate-100 dark:bg-slate-950/40 min-h-full">
      {/* Dynamic Sound warning popup banner */}
      <AnimatePresence>
        {incomingAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 z-100 bg-amber-500 text-white rounded-xl py-3 px-4 shadow-xl flex items-center justify-between gap-3 max-w-sm border border-amber-400 border-l-4 border-l-red-600 cursor-pointer"
            onClick={() => {
              setIncomingAlert(null);
              setActiveTab('add');
            }}
          >
            <div className="flex gap-2 items-start">
              <span className="p-1.5 bg-white/20 rounded-lg text-white mt-0.5">
                <Bell className="h-4 w-4 animate-swing" />
              </span>
              <div>
                <h4 className="text-xs font-bold leading-none">{incomingAlert.title}</h4>
                <p className="text-[10px] text-amber-50 mt-1 leading-normal">{incomingAlert.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Frame wrapper mimicking luxurious Pixel phone hardware */}
      <div className="w-full max-w-[390px] h-[780px] bg-slate-950 rounded-[40px] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border-4 border-slate-900 flex flex-col justify-between overflow-hidden relative group/frame">
        
        {/* Dynamic camera notch pinhole */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 h-4 w-12 bg-black rounded-full z-45 flex items-center justify-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-900 border border-slate-800" />
          <div className="h-0.5 w-[14px] rounded-full bg-slate-900" />
        </div>

        {/* Screen layout container */}
        <div className={`flex-1 flex flex-col overflow-hidden rounded-[28px] border border-slate-900 ${settings.darkMode ? 'dark bg-slate-900' : 'bg-slate-50'} transition-colors duration-300 relative`}>
          
          {/* Top Status Indicators bar */}
          <div className="h-11 px-6 bg-slate-100 dark:bg-slate-900 flex items-center justify-between z-40 text-slate-500 dark:text-slate-400 select-none border-b border-slate-100 dark:border-slate-850">
            <div className="flex items-center gap-1 text-[11px] font-black font-mono">
              <Calendar className="h-3 w-3 text-indigo-500" />
              <span>{`${new Date().getDate()} - ${new Date().toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}`}</span>
            </div>
            
            <button 
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-1.5 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-150/40 dark:border-slate-700 cursor-pointer transition-all"
              title="Open Settings Details"
            >
              <div className="h-3.5 w-3.5 rounded-full bg-indigo-600 text-[8px] text-white font-black flex items-center justify-center">
                {(settings.userName || 'Hope').charAt(0).toUpperCase()}
              </div>
              <span className="truncate max-w-[65px]">{settings.userName || 'Hope'}</span>
            </button>
          </div>

          {/* Core Content viewer Routing page */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            {isLocked ? (
              <PinScreen
                settings={settings}
                onUnlock={handleUnlock}
                onSetPin={handleUpdatePin}
              />
            ) : (
              <>
                {/* Sub routing blocks */}
                <div className="flex-1 overflow-hidden flex flex-col relative bg-slate-50 dark:bg-slate-900">
                  {/* Onboarding Name Setup Overlay */}
                  <AnimatePresence>
                    {(settings.userName === 'Hope' || !settings.userName) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6"
                      >
                        <motion.div
                          initial={{ scale: 0.9, y: 20 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0.9, y: 20 }}
                          className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-2xl max-w-xs w-full text-center space-y-4 font-sans"
                        >
                          <div className="mx-auto h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <User className="h-6 w-6 animate-pulse" />
                          </div>
                          
                          <div className="space-y-1">
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono">Personalize App</h3>
                            <p className="text-[10px] text-slate-400 leading-normal">
                              Enter your profile name to customize greeting logs, generate statement reports, and track personal expenses.
                            </p>
                          </div>

                          <div className="space-y-2 pt-1">
                            <input 
                              type="text"
                              placeholder="e.g. Deepak"
                              className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-750 text-xs font-bold font-sans text-center text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                              id="userNameOnboarding"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (val) {
                                    handleUpdatePin(settings.pin, settings.pinHint, val);
                                    handleTriggerNotification('🎉 Welcome aboard!', `Hey ${val}, your personal Expense Tracker is ready!`);
                                  }
                                }
                              }}
                            />
                            
                            <button
                              onClick={() => {
                                const input = document.getElementById('userNameOnboarding') as HTMLInputElement;
                                const val = input ? input.value.trim() : '';
                                if (val) {
                                  handleUpdatePin(settings.pin, settings.pinHint, val);
                                  handleTriggerNotification('🎉 Welcome aboard!', `Hey ${val}, your personal Expense Tracker is ready!`);
                                }
                              }}
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-2xl cursor-pointer transition-all border border-indigo-500/20 shadow-md font-mono uppercase tracking-widest"
                            >
                              Get Started
                            </button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {/* Dropdown notifications drawer */}
                  <AnimatePresence>
                    {showNotificationsDropdown && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="absolute inset-x-0 top-0 bg-white dark:bg-slate-850 shadow-lg border-b border-slate-200 dark:border-slate-800 z-45 max-h-[60%] overflow-y-auto p-4 space-y-3 font-sans select-none"
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/60 text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest font-mono">Trigger Alert Notifications</span>
                          <button
                            onClick={() => setShowNotificationsDropdown(false)}
                            className="text-slate-400 hover:text-indigo-500 font-bold uppercase text-[10px]"
                          >
                            Hide
                          </button>
                        </div>
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {dbNotificationLogs.map(l => (
                            <div key={l.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-[10px] space-y-1 text-slate-600 dark:text-slate-400">
                              <div className="flex justify-between items-center text-red-500 font-bold">
                                <span>{l.title}</span>
                                <span className="text-[8px] text-slate-400 font-normal">{l.timestamp}</span>
                              </div>
                              <p className="leading-relaxed">{l.message}</p>
                            </div>
                          ))}
                          {dbNotificationLogs.length === 0 && (
                            <p className="text-[10px] text-slate-400 text-center py-4 italic">Notifications vault empty</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' && (
                      <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                        className="flex-1 flex flex-col overflow-hidden"
                      >
                        <DashboardScreen
                          expenses={expenses}
                          categories={categories}
                          budgets={budgets}
                          settings={settings}
                          onLockApp={onLockApp}
                        />
                      </motion.div>
                    )}

                    {activeTab === 'add' && (
                      <motion.div
                        key="add"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                        className="flex-1 flex flex-col overflow-hidden"
                      >
                        <AddExpenseScreen
                          expenses={expenses}
                          categories={categories}
                          budgets={budgets}
                          onAddExpense={handleAddNewExpense}
                          onUpdateExpense={handleUpdateExistingExpense}
                          onDeleteExpense={handleDeleteExistingExpense}
                          onAddCategory={onAddCategory}
                          onTriggerNotification={handleTriggerNotification}
                          settings={settings}
                          onUpdateSettings={setSettings}
                          onUpdateBudgets={setBudgets}
                          onUpdateCategories={(newCats) => {
                            DbSim.saveCategories(newCats);
                            setCategories(newCats);
                          }}
                          onLockApp={onLockApp}
                        />
                      </motion.div>
                    )}

                    {activeTab === 'analysis' && (
                      <motion.div
                        key="analysis"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                        className="flex-1 flex flex-col overflow-hidden"
                      >
                        <AnalysisScreen expenses={expenses} />
                      </motion.div>
                    )}

                    {activeTab === 'settings' && (
                      <motion.div
                        key="settings"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                        className="flex-1 flex flex-col overflow-hidden"
                      >
                        <SettingsScreen
                          settings={settings}
                          onUpdateSettings={setSettings}
                          onBackup={() => {}}
                          onRestore={handleReloadLocalDatabaseFromBackup}
                          onTriggerNotification={handleTriggerNotification}
                          expenses={expenses}
                          categories={categories}
                          budgets={budgets}
                          onUpdateBudgets={(newBudgets) => {
                            DbSim.saveBudgets(newBudgets);
                            setBudgets(newBudgets);
                          }}
                          onUpdateCategories={(newCats) => {
                            DbSim.saveCategories(newCats);
                            setCategories(newCats);
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom navigation tab row */}
                <div className="h-16 border-t border-slate-100 dark:border-slate-805 bg-white dark:bg-slate-850 px-3 flex items-center justify-around z-40 relative">
                  
                  {/* Tab button: Dashboard */}
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'dashboard' 
                        ? 'text-indigo-600 dark:text-indigo-400 scale-105' 
                        : 'text-slate-400 hover:text-slate-500'
                    }`}
                  >
                    <Layers className="h-5 w-5" />
                    <span className="text-[9px] font-bold mt-1 tracking-tighter">Dashboard</span>
                  </button>

                  {/* Tab button: Add Expense */}
                  <button
                    onClick={() => setActiveTab('add')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'add' 
                        ? 'text-indigo-600 dark:text-indigo-400 scale-105' 
                        : 'text-slate-400 hover:text-slate-500'
                    }`}
                  >
                    <PlusCircle className="h-5 w-5" />
                    <span className="text-[9px] font-bold mt-1 tracking-tighter">Add Expense</span>
                  </button>

                  {/* Tab button: Analysis */}
                  <button
                    onClick={() => setActiveTab('analysis')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'analysis' 
                        ? 'text-indigo-600 dark:text-indigo-400 scale-105' 
                        : 'text-slate-400 hover:text-slate-500'
                    }`}
                  >
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-[9px] font-bold mt-1 tracking-tighter">Analysis</span>
                  </button>

                  {/* Tab button: Settings */}
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                      activeTab === 'settings' 
                        ? 'text-indigo-600 dark:text-indigo-400 scale-105' 
                        : 'text-slate-400 hover:text-slate-500'
                    }`}
                  >
                    <Sliders className="h-5 w-5" />
                    <span className="text-[9px] font-bold mt-1 tracking-tighter">Settings</span>
                  </button>

                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
