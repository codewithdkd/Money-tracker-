/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  IndianRupee, 
  Layers, 
  Hash, 
  TrendingUp, 
  ArrowRight, 
  ChevronRight, 
  ChevronDown, 
  Calendar,
  X,
  LogOut,
  PieChart as PieIcon
} from 'lucide-react';
import { AppSettings, VirtualExpense, VirtualCategory, VirtualBudget } from '../types';

interface DashboardScreenProps {
  expenses: VirtualExpense[];
  categories: VirtualCategory[];
  budgets: VirtualBudget[];
  settings: AppSettings;
  onLockApp?: () => void;
}

export default function DashboardScreen({ expenses, categories, budgets, settings, onLockApp }: DashboardScreenProps) {
  // Current Month calculations (June 2026)
  const currentMonthStr = '2026-06';
  
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(currentMonthStr));
  }, [expenses]);

  const totalSpent = useMemo(() => {
    return currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [currentMonthExpenses]);

  const transactionCount = currentMonthExpenses.length;

  const currentMonthCategoriesCount = useMemo(() => {
    const uniqueCats = new Set(currentMonthExpenses.map(e => e.category));
    return uniqueCats.size;
  }, [currentMonthExpenses]);

  // Budget calculations
  const totalCategoryBudget = useMemo(() => {
    return budgets.reduce((sum, b) => sum + b.limitAmount, 0);
  }, [budgets]);

  const budgetRemaining = Math.max(0, totalCategoryBudget - totalSpent);

  // States for card modal breakdowns
  const [showCategoryBreakdownModal, setShowCategoryBreakdownModal] = useState<boolean>(false);
  const [selectedBreakdownCat, setSelectedBreakdownCat] = useState<string | null>(null);

  // 1. Group Current Month Expenses by Category & Subcategory
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { total: number; subs: Record<string, number> }> = {};
    currentMonthExpenses.forEach(e => {
      if (!map[e.category]) {
        map[e.category] = { total: 0, subs: {} };
      }
      map[e.category].total += e.amount;
      map[e.category].subs[e.subcategory] = (map[e.category].subs[e.subcategory] || 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [currentMonthExpenses]);

  // 2. Historical summary drilldown state
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Group all expenses of all time by year
  const yearGroupedTotals = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const year = e.date.substring(0, 4);
      map[year] = (map[year] || 0) + e.amount;
    });
    // Ensure 2026, 2025, 2024 exist as placeholder simulations if empty
    if (!map['2024']) map['2024'] = 90000;
    if (!map['2025']) map['2025'] = 120000;
    
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  // Month grouped totals for selected year
  const monthGroupedTotals = useMemo(() => {
    if (!selectedYear) return [];
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      if (e.date.startsWith(selectedYear)) {
        const monthNum = e.date.substring(5, 7);
        const monthNames: Record<string, string> = {
          '01': 'January', '02': 'February', '03': 'March', '04': 'April',
          '05': 'May', '06': 'June', '07': 'July', '08': 'August',
          '09': 'September', '10': 'October', '11': 'November', '12': 'December'
        };
        const monthName = monthNames[monthNum] || 'Unknown';
        map[monthName] = (map[monthName] || 0) + e.amount;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [selectedYear, expenses]);

  // Category grouped totals for selected month & year
  const catGroupedTotals = useMemo(() => {
    if (!selectedYear || !selectedMonth) return [];
    
    const monthNamesMap: Record<string, string> = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04',
      'May': '05', 'June': '06', 'July': '07', 'August': '08',
      'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    const targetMonthNum = monthNamesMap[selectedMonth];
    const targetPrefix = `${selectedYear}-${targetMonthNum}`;

    const map: Record<string, number> = {};
    expenses.forEach(e => {
      if (e.date.startsWith(targetPrefix)) {
        map[e.category] = (map[e.category] || 0) + e.amount;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [selectedYear, selectedMonth, expenses]);

  // Subcategory grouped totals for selected category, month & year
  const subcatGroupedTotals = useMemo(() => {
    if (!selectedYear || !selectedMonth || !selectedCategory) return [];

    const monthNamesMap: Record<string, string> = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04',
      'May': '05', 'June': '06', 'July': '07', 'August': '08',
      'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    const targetMonthNum = monthNamesMap[selectedMonth];
    const targetPrefix = `${selectedYear}-${targetMonthNum}`;

    const map: Record<string, number> = {};
    expenses.forEach(e => {
      if (e.date.startsWith(targetPrefix) && e.category.toLowerCase() === selectedCategory.toLowerCase()) {
        map[e.subcategory] = (map[e.subcategory] || 0) + e.amount;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [selectedYear, selectedMonth, selectedCategory, expenses]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 px-4 py-4 space-y-4 scrollbar-thin">
      {/* Target Monthly Summary Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider font-mono">
              Welcome back, {settings.userName || 'User'}!
            </span>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-1.5 font-mono mt-0.5">
              <Calendar className="h-4 w-4 text-indigo-500" />
              June 2026
            </h2>
          </div>
          {onLockApp && (
            <button
              type="button"
              onClick={onLockApp}
              className="p-1 px-2.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-black uppercase text-slate-600 hover:text-red-500 dark:text-slate-300 dark:hover:text-red-400 flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer transition-all font-mono"
              title="Lock App"
            >
              <LogOut className="h-2.5 w-2.5 text-red-500" /> Lock
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Card: Total Expenses */}
          <button
            onClick={() => setShowCategoryBreakdownModal(true)}
            className="p-3.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:ring-2 hover:ring-indigo-500 transition-all text-left border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-24 group relative cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-125 transition-transform">
              <IndianRupee className="h-14 w-14 text-slate-900 dark:text-white" />
            </div>
            <div className="flex justify-between items-center w-full">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Expenses</span>
              <div className="h-2 w-2 rounded-full bg-indigo-500" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-50 flex items-baseline">
                ₹{totalSpent.toLocaleString()}
              </div>
              <p className="text-[10px] text-indigo-500 hover:underline flex items-center gap-0.5 mt-0.5 font-medium">
                View category details <ChevronRight className="h-3 w-3" />
              </p>
            </div>
          </button>

          {/* Card: Transactions count */}
          <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-24">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Transactions</span>
              <Hash className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-50">
                {transactionCount}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Total inputs registered</p>
            </div>
          </div>

          {/* Card: Number of Categories */}
          <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-24">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Categories</span>
              <Layers className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-50">
                {currentMonthCategoriesCount} <span className="text-xs font-normal text-slate-400">/ {categories.length}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Active categories this month</p>
            </div>
          </div>

          {/* Card: Remaining Budget */}
          <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-24">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Remaining Budget</span>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                ₹{budgetRemaining.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Limit: ₹{totalCategoryBudget.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Alert monitors for individual and overall budgets */}
      <div className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-105 dark:border-slate-800 shadow-sm">
        <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider flex items-center justify-between font-mono">
          <span className="flex items-center gap-1.5 font-bold">🚨 ACTIVE THRESHOLD MONITOR</span>
          <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-black">REALTIME SQLite</span>
        </h3>

        {/* Overall Total Budget Gauge */}
        {totalCategoryBudget > 0 && (() => {
          const overallPct = (totalSpent / totalCategoryBudget) * 100;
          const overallThreshold = settings.overallThresholdPercentage ?? 80;
          
          let overallStatus: 'normal' | 'near' | 'exceeded' = 'normal';
          if (overallPct >= 100) overallStatus = 'exceeded';
          else if (overallPct >= overallThreshold) overallStatus = 'near';

          return (
            <div className={`p-3 rounded-xl border transition-all ${
              overallStatus === 'exceeded' 
                ? 'bg-red-500/5 border-red-500/30' 
                : overallStatus === 'near' 
                ? 'bg-amber-500/5 border-amber-500/30' 
                : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-slate-700 dark:text-slate-200">Overall combined spend status</span>
                {overallStatus === 'exceeded' ? (
                  <span className="text-[9px] text-red-500 font-extrabold uppercase font-mono bg-red-100 dark:bg-red-950 px-1.5 py-0.5 rounded animate-pulse">🚨 EXCEEDED BUDGET</span>
                ) : overallStatus === 'near' ? (
                  <span className="text-[9px] text-amber-600 font-extrabold uppercase font-mono bg-amber-100 dark:bg-amber-955 px-1.5 py-0.5 rounded">⚠️ APPROACHING LIMIT</span>
                ) : (
                  <span className="text-[9px] text-emerald-600 font-bold uppercase font-mono bg-emerald-100 dark:bg-emerald-955 px-1.5 py-0.5 rounded">🟢 ON TARGET</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">
                Combined utilization: <strong>₹{totalSpent.toLocaleString()}</strong> of ₹{totalCategoryBudget.toLocaleString()} ({overallPct.toFixed(1)}%). Warn trigger set at: <strong>{overallThreshold}%</strong>
              </p>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    overallStatus === 'exceeded' ? 'bg-red-500 shadow-md' : overallStatus === 'near' ? 'bg-amber-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, overallPct)}%` }}
                />
              </div>
            </div>
          );
        })()}

        {/* Individual Categories lists progress gauges */}
        <div className="grid grid-cols-1 gap-2 border-t border-slate-100 dark:border-slate-700/60 pt-2.5 space-y-1">
          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase font-mono block">Per-Category Alert Threshold limits</span>
          {budgets.map(b => {
            const catExpensesSum = currentMonthExpenses
              .filter(e => e.category.toLowerCase() === b.categoryName.toLowerCase())
              .reduce((sum, e) => sum + e.amount, 0);

            const pctVal = (catExpensesSum / b.limitAmount) * 100;
            const customThreshold = settings.categoryThresholds?.[b.categoryName] ?? settings.alertThresholdPercentage ?? 80;

            let catStatus: 'normal' | 'near' | 'exceeded' = 'normal';
            if (pctVal >= 100) catStatus = 'exceeded';
            else if (pctVal >= customThreshold) catStatus = 'near';

            return (
              <div 
                key={b.categoryName} 
                className={`p-2.5 rounded-lg border transition-all ${
                  catStatus === 'exceeded'
                    ? 'bg-red-500/5 border-red-500/30'
                    : catStatus === 'near'
                    ? 'bg-amber-500/5 border-amber-300/30'
                    : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800'
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-250 font-mono uppercase">{b.categoryName}</span>
                  {catStatus === 'exceeded' ? (
                    <span className="text-[9px] text-red-500 font-black uppercase font-mono">🚨 OVER LIMIT ({pctVal.toFixed(0)}%)</span>
                  ) : catStatus === 'near' ? (
                    <span className="text-[9px] text-amber-500 font-black uppercase font-mono">⚠️ WARNING ({pctVal.toFixed(0)}% used &gt; {customThreshold}%)</span>
                  ) : (
                    <span className="text-[9px] text-emerald-500 font-bold uppercase font-mono">🟢 OK ({pctVal.toFixed(0)}%)</span>
                  )}
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                  <span>Spent: <strong>₹{catExpensesSum.toLocaleString()}</strong></span>
                  <span>Limit: <strong>₹{b.limitAmount.toLocaleString()}</strong> &middot; Warn: {customThreshold}%</span>
                </div>

                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      catStatus === 'exceeded' ? 'bg-red-500' : catStatus === 'near' ? 'bg-amber-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, pctVal)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Summary Interactive Drilldown Box */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider mb-3 font-mono">
          Historical Summary & Drilldown
        </h3>

        {/* Level 1: Years */}
        <div className="space-y-2">
          {yearGroupedTotals.map(([year, amt]) => {
            const isYearOpen = selectedYear === year;
            return (
              <div key={year} className="border-b border-slate-100 dark:border-slate-700/60 pb-2 last:border-0 last:pb-0">
                <button
                  onClick={() => {
                    setSelectedYear(isYearOpen ? null : year);
                    setSelectedMonth(null);
                    setSelectedCategory(null);
                  }}
                  className="w-full flex items-center justify-between py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isYearOpen ? <ChevronDown className="h-4 w-4 text-indigo-500" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <span>{year} Calendar Year</span>
                  </div>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">₹{amt.toLocaleString()}</span>
                </button>

                {/* Level 2: Months Selection */}
                <AnimatePresence>
                  {isYearOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-6 mt-1.5 space-y-1 overflow-hidden"
                    >
                      {monthGroupedTotals.length === 0 ? (
                        <p className="text-xs text-slate-400 py-1 font-mono italic">No monthly transactions</p>
                      ) : (
                        monthGroupedTotals.map(([mName, mAmt]) => {
                          const isMonthOpen = selectedMonth === mName;
                          return (
                            <div key={mName} className="border-l-2 border-slate-200 dark:border-slate-700/80 pl-2">
                              <button
                                onClick={() => {
                                  setSelectedMonth(isMonthOpen ? null : mName);
                                  setSelectedCategory(null);
                                }}
                                className="w-full flex items-center justify-between py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/20 px-2 rounded"
                              >
                                <span>{mName}</span>
                                <span className="font-mono font-medium">₹{mAmt.toLocaleString()}</span>
                              </button>

                              {/* Level 3: Categories selection */}
                              <AnimatePresence>
                                {isMonthOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="ml-4 mt-1 space-y-1 overflow-hidden"
                                  >
                                    {catGroupedTotals.map(([catName, catAmt]) => {
                                      const isCatOpen = selectedCategory === catName;
                                      return (
                                        <div key={catName}>
                                          <button
                                            onClick={() => {
                                              setSelectedCategory(isCatOpen ? null : catName);
                                            }}
                                            className="w-full flex items-center justify-between py-1 text-[11px] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/20 px-2 rounded"
                                          >
                                            <span className="flex items-center gap-1">
                                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                              {catName}
                                            </span>
                                            <span className="font-mono">₹{catAmt.toLocaleString()}</span>
                                          </button>

                                          {/* Level 4: Subcategory level details */}
                                          <AnimatePresence>
                                            {isCatOpen && (
                                              <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="ml-4 mt-1 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg space-y-1 border border-slate-100 dark:border-slate-750"
                                              >
                                                {subcatGroupedTotals.map(([subName, subAmt]) => (
                                                  <div key={subName} className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 p-1 border-b border-dashed dark:border-slate-700 last:border-0 font-mono">
                                                    <span>{subName}</span>
                                                    <span className="font-bold">₹{subAmt.toLocaleString()}</span>
                                                  </div>
                                                ))}
                                                {subcatGroupedTotals.length === 0 && (
                                                  <p className="text-[10px] text-slate-400 italic">No subcategory records</p>
                                                )}
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      );
                                    })}
                                    {catGroupedTotals.length === 0 && (
                                      <p className="text-[10px] text-slate-400 italic">No categories</p>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: Current Month Category Detail Breakdown */}
      <AnimatePresence>
        {showCategoryBreakdownModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-850 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5">
                  <PieIcon className="h-5 w-5 text-indigo-500" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-tight">
                    June 25 Category Expenses
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowCategoryBreakdownModal(false);
                    setSelectedBreakdownCat(null);
                  }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-3.5 scrollbar-thin">
                {categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6 italic font-sans">No expenses registered for June 2026 yet.</p>
                ) : (
                  categoryBreakdown.map(([cat, info]) => {
                    const isSelected = selectedBreakdownCat === cat;
                    const percent = ((info.total / totalSpent) * 100).toFixed(0);
                    return (
                      <div key={cat} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-750">
                        <button
                          onClick={() => setSelectedBreakdownCat(isSelected ? null : cat)}
                          className="w-full flex items-center justify-between text-left font-semibold text-slate-700 dark:text-slate-200 text-xs"
                        >
                          <div>
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold mr-1">({percent}%)</span>
                            <span>{cat}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-100">₹{info.total.toLocaleString()}</span>
                            {isSelected ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                          </div>
                        </button>

                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-3 pl-3 border-l-2 border-indigo-500 space-y-1.5 overflow-hidden"
                            >
                              <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1 font-mono">Subcategories spending</p>
                              {Object.entries(info.subs).map(([sub, subAmt]) => (
                                <div key={sub} className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                                  <span>{sub}</span>
                                  <span className="font-mono text-slate-800 dark:text-slate-200">₹{subAmt.toLocaleString()}</span>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 text-center">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Click on single category card above to view detailed subcategory level allocations</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
