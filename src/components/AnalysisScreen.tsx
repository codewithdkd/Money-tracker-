/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RechartPie, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  CartesianGrid,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Award, 
  DollarSign, 
  CalendarRange, 
  PieChart as PieIcon,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Calendar as CalIcon,
  TrendingDown,
  Layers,
  Sparkles,
  Search,
  CheckCircle,
  Activity,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VirtualExpense, MoneySource } from '../types';

interface AnalysisScreenProps {
  expenses: VirtualExpense[];
  moneySources?: MoneySource[];
  currencySymbol?: string;
}

export default function AnalysisScreen({ expenses, moneySources = [], currencySymbol = '₹' }: AnalysisScreenProps) {
  // Navigation tabs within Analysis
  const [activeAnalysisMode, setActiveAnalysisMode] = useState<'trends' | 'compare' | 'calendar' | 'sources'>('trends');
  const [selectedDetailExpense, setSelectedDetailExpense] = useState<VirtualExpense | null>(null);

  // Month Meta configurations
  const monthsMeta = [
    { key: '2026-03', name: 'March', display: 'March 2026' },
    { key: '2026-04', name: 'April', display: 'April 2026' },
    { key: '2026-05', name: 'May', display: 'May 2026' },
    { key: '2026-06', name: 'June', display: 'June 2026' }
  ];

  // Dynamic Categories list calculated
  const categoriesList = useMemo(() => {
    const list = new Set<string>();
    expenses.forEach(e => {
      if (e.category) list.add(e.category);
    });
    if (list.size === 0) {
      return ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Salary', 'Freelancing'];
    }
    return Array.from(list);
  }, [expenses]);

  // Mode: Trends Selection States
  const [drilldownCategory, setDrilldownCategory] = useState<string>('Food');
  const [drilldownSubcategory, setDrilldownSubcategory] = useState<string>('All');

  // Mode: Compare Selection States
  const [compareMonthA, setCompareMonthA] = useState<string>('2026-06');
  const [compareMonthB, setCompareMonthB] = useState<string>('2026-05');

  // Mode: Calendar States
  const [calendarMonthIndex, setCalendarMonthIndex] = useState<number>(3); // June 2026
  const currentCalMonthObj = monthsMeta[calendarMonthIndex] || monthsMeta[3];
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(new Date().getDate());

  // --- SOURCE-WISE METRICS AND TRENDS ---
  const sourceWiseAnalysis = useMemo(() => {
    const sourcesList = moneySources || [];
    const spendingMap: Record<string, number> = {};
    const incomeMap: Record<string, number> = {};
    
    expenses.forEach(e => {
      const amt = e.amount;
      const type = e.transactionType || 'Expense';
      
      if (type === 'Expense' || type === 'LoanGiven') {
        if (e.sourceAccountId) {
          spendingMap[e.sourceAccountId] = (spendingMap[e.sourceAccountId] || 0) + amt;
        }
      } else if (type === 'Income' || type === 'LoanTaken') {
        if (e.sourceAccountId) {
          incomeMap[e.sourceAccountId] = (incomeMap[e.sourceAccountId] || 0) + amt;
        }
      } else if (type === 'Transfer') {
        if (e.fromSourceAccountId) {
          spendingMap[e.fromSourceAccountId] = (spendingMap[e.fromSourceAccountId] || 0) + amt;
        }
        if (e.toSourceAccountId) {
          incomeMap[e.toSourceAccountId] = (incomeMap[e.toSourceAccountId] || 0) + amt;
        }
      }
    });

    const sourcesMetrics = sourcesList.map(s => {
      const spending = spendingMap[s.id] || 0;
      const income = incomeMap[s.id] || 0;
      const currentMonthKey = new Date().toISOString().substring(0, 7);
      const opening = s.openingBalances?.[currentMonthKey] ?? Object.values(s.openingBalances || {})[0] ?? 0;
      const currentBalance = opening + income - spending;
      
      return {
        id: s.id,
        name: s.name,
        archived: s.archived,
        opening,
        spending,
        income,
        currentBalance
      };
    });

    let largestSpendingSource = 'None';
    let maxSpending = 0;
    sourcesMetrics.forEach(sm => {
      if (sm.spending > maxSpending) {
        maxSpending = sm.spending;
        largestSpendingSource = sm.name;
      }
    });

    let largestIncomeSource = 'None';
    let maxIncome = 0;
    sourcesMetrics.forEach(sm => {
      if (sm.income > maxIncome) {
        maxIncome = sm.income;
        largestIncomeSource = sm.name;
      }
    });

    return {
      sourcesMetrics,
      largestSpendingSource,
      maxSpending,
      largestIncomeSource,
      maxIncome
    };
  }, [expenses, moneySources]);

  const sourceMonthlyTrends = useMemo(() => {
    const sourcesList = moneySources || [];
    return monthsMeta.map(m => {
      const monthBalances = sourcesList.map(s => {
        let balance = s.openingBalances?.[m.key] ?? Object.values(s.openingBalances || {})[0] ?? 0;
        expenses.forEach(e => {
          if (e.date <= `${m.key}-31`) {
            const amt = e.amount;
            const type = e.transactionType || 'Expense';
            if (type === 'Expense' || type === 'LoanGiven') {
              if (e.sourceAccountId === s.id) balance -= amt;
            } else if (type === 'Income' || type === 'LoanTaken') {
              if (e.sourceAccountId === s.id) balance += amt;
            } else if (type === 'Transfer') {
              if (e.fromSourceAccountId === s.id) balance -= amt;
              if (e.toSourceAccountId === s.id) balance += amt;
            }
          }
        });
        return {
          sourceName: s.name,
          balance
        };
      });
      return {
        month: m.name,
        ...monthBalances.reduce((acc, curr) => {
          acc[curr.sourceName] = curr.balance;
          return acc;
        }, {} as Record<string, number>)
      };
    });
  }, [expenses, moneySources]);

  // --- DATA INTERPOLATION: MONTH BY MONTH CASHFLOWS ---
  const dynamicMonthlyCashflows = useMemo(() => {
    return monthsMeta.map(m => {
      const positiveFlow = expenses
        .filter(e => e.date.startsWith(m.key) && (e.transactionType === 'Income' || e.transactionType === 'LoanTaken'))
        .reduce((sum, e) => sum + e.amount, 0);

      const negativeFlow = expenses
        .filter(e => e.date.startsWith(m.key) && (e.transactionType === 'Expense' || e.transactionType === 'LoanGiven'))
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        name: m.name,
        Inflow: positiveFlow,
        Outflow: negativeFlow,
        Savings: Math.max(0, positiveFlow - negativeFlow)
      };
    });
  }, [expenses]);

  // Subcategories specific to selected category drilldown
  const drilldownSubcategoryOptions = useMemo(() => {
    const list = new Set<string>();
    expenses.forEach(e => {
      if (e.category?.toLowerCase() === drilldownCategory.toLowerCase() && e.subcategory) {
        list.add(e.subcategory);
      }
    });
    return Array.from(list);
  }, [expenses, drilldownCategory]);

  // Drilldown category MoM history trend
  const selectedCategoryHistoryData = useMemo(() => {
    return monthsMeta.map(m => {
      const sum = expenses
        .filter(e => {
          const catMatch = e.category.toLowerCase() === drilldownCategory.toLowerCase();
          const subcatMatch = drilldownSubcategory === 'All' || (e.subcategory && e.subcategory.toLowerCase() === drilldownSubcategory.toLowerCase());
          const dateMatch = e.date.startsWith(m.key);
          return catMatch && subcatMatch && dateMatch;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        month: m.name,
        amount: sum
      };
    });
  }, [expenses, drilldownCategory, drilldownSubcategory]);

  // Top Category allocations (June 2026 outflows specifically)
  const topJuneCategories = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses
      .filter(e => e.date.startsWith('2026-06') && e.transactionType === 'Expense')
      .forEach(e => {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
      });

    const colors = [
      '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
      '#ec4899', '#14b8a6', '#f43f5e', '#a855f7', '#3b82f6', '#84cc16'
    ];
    return Object.entries(totals)
      .map(([name, value], i) => ({
        name,
        value,
        color: colors[i % colors.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // --- RESEARCH DATA: CATEGORY WISE & SUB CATEGORY WISE SPECO FACTORS ---
  const categoryResearchData = useMemo(() => {
    // Filter expenses to only 'Expense' or 'LoanGiven' (representing outflows)
    const outflows = expenses.filter(e => e.transactionType === 'Expense' || e.transactionType === 'LoanGiven');
    
    // Group outflows by Category and Subcategory
    const catTotals: Record<string, { total: number; count: number; subcats: Record<string, { total: number; count: number }> }> = {};
    
    outflows.forEach(e => {
      const cat = e.category || 'Other';
      const sub = e.subcategory || 'Uncategorized';
      const amt = e.amount;
      
      if (!catTotals[cat]) {
        catTotals[cat] = { total: 0, count: 0, subcats: {} };
      }
      catTotals[cat].total += amt;
      catTotals[cat].count += 1;
      
      if (!catTotals[cat].subcats[sub]) {
        catTotals[cat].subcats[sub] = { total: 0, count: 0 };
      }
      catTotals[cat].subcats[sub].total += amt;
      catTotals[cat].subcats[sub].count += 1;
    });
    
    // For currently selected drilldownCategory, retrieve detailed metrics
    const currentCatInfo = catTotals[drilldownCategory] || { total: 0, count: 0, subcats: {} };
    const parentTotal = currentCatInfo.total || 1; // avoid division by zero
    
    const subcategoryDetails = Object.entries(currentCatInfo.subcats).map(([subName, metrics]) => {
      const sharePct = (metrics.total / parentTotal) * 100;
      const averageAmt = metrics.total / (metrics.count || 1);
      
      // Research recommended threshold factor
      let recommendation = 'Optimized';
      let tagColor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
      if (sharePct > 40) {
        recommendation = 'High Concentration';
        tagColor = 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30';
      } else if (sharePct > 20) {
        recommendation = 'Moderate Outflow';
        tagColor = 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
      }
      
      return {
        name: subName,
        total: metrics.total,
        count: metrics.count,
        sharePct,
        averageAmt,
        recommendation,
        tagColor
      };
    }).sort((a, b) => b.total - a.total);
    
    return {
      categoryTotal: currentCatInfo.total || 0,
      categoryCount: currentCatInfo.count || 0,
      categoryAverage: currentCatInfo.total ? (currentCatInfo.total / (currentCatInfo.count || 1)) : 0,
      subcategories: subcategoryDetails
    };
  }, [expenses, drilldownCategory]);

  // --- COMPARE MONTHS METHOD ---
  const comparisonResults = useMemo(() => {
    const filterOutflow = (p: string) => expenses
      .filter(e => e.date.startsWith(p) && e.transactionType === 'Expense')
      .reduce((s, e) => s + e.amount, 0);

    const filterInflow = (p: string) => expenses
      .filter(e => e.date.startsWith(p) && e.transactionType === 'Income')
      .reduce((s, e) => s + e.amount, 0);

    const expenseA = filterOutflow(compareMonthA);
    const expenseB = filterOutflow(compareMonthB);
    const incomeA = filterInflow(compareMonthA);
    const incomeB = filterInflow(compareMonthB);

    const expDiff = expenseA - expenseB;
    const expPct = expenseB > 0 ? (expDiff / expenseB) * 105 : 0;

    const sideBySideCategories = categoriesList.map(cat => {
      const valA = expenses
        .filter(e => e.category.toLowerCase() === cat.toLowerCase() && e.date.startsWith(compareMonthA) && e.transactionType === 'Expense')
        .reduce((sum, e) => sum + e.amount, 0);

      const valB = expenses
        .filter(e => e.category.toLowerCase() === cat.toLowerCase() && e.date.startsWith(compareMonthB) && e.transactionType === 'Expense')
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        category: cat,
        MonthA: valA,
        MonthB: valB,
        netDelta: valA - valB
      };
    }).filter(r => r.MonthA > 0 || r.MonthB > 0).slice(0, 5);

    return { expenseA, expenseB, incomeA, incomeB, expDiff, expPct, categoriesComparison: sideBySideCategories };
  }, [expenses, compareMonthA, compareMonthB, categoriesList]);

  // --- CALENDAR GRID DATA ---
  const calendarDaysList = useMemo(() => {
    const [yearStr, monthStr] = currentCalMonthObj.key.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;

    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDayOffset = new Date(year, month, 1).getDay();

    const grid = [];
    
    // Prefix empty spacing items
    for (let i = 0; i < firstDayOffset; i++) {
      grid.push({ isEmpty: true, dayNum: 0, dateStr: '', totalPaidOut: 0, totalIncomeIn: 0, entries: [] });
    }

    // Populate active calendar days
    for (let d = 1; d <= totalDays; d++) {
      const dayStr = d < 10 ? `0${d}` : String(d);
      const dateStr = `${currentCalMonthObj.key}-${dayStr}`;

      const activeDaysTxs = expenses.filter(e => e.date === dateStr);
      const totalPaidOut = activeDaysTxs
        .filter(t => t.transactionType === 'Expense' || t.transactionType === 'LoanGiven')
        .reduce((sum, e) => sum + e.amount, 0);

      const totalIncomeIn = activeDaysTxs
        .filter(t => t.transactionType === 'Income' || t.transactionType === 'LoanTaken')
        .reduce((sum, e) => sum + e.amount, 0);

      grid.push({
        isEmpty: false,
        dayNum: d,
        dateStr,
        totalPaidOut,
        totalIncomeIn,
        entries: activeDaysTxs
      });
    }

    return grid;
  }, [expenses, currentCalMonthObj]);

  // Selected calendar detail items display helper
  const selectedDayMetrics = useMemo(() => {
    const formattedDayStr = selectedCalendarDay < 10 ? `0${selectedCalendarDay}` : String(selectedCalendarDay);
    const dateStr = `${currentCalMonthObj.key}-${formattedDayStr}`;
    const matched = expenses.filter(e => e.date === dateStr);
    const expenseSum = matched.filter(t => t.transactionType === 'Expense' || t.transactionType === 'LoanGiven').reduce((sum, e) => sum + e.amount, 0);
    const incomeSum = matched.filter(t => t.transactionType === 'Income' || t.transactionType === 'LoanTaken').reduce((sum, e) => sum + e.amount, 0);
    return { list: matched, expenseSum, incomeSum, dateStr };
  }, [expenses, selectedCalendarDay, currentCalMonthObj]);

  const formattedDateLong = useMemo(() => {
    const [yearStr, monthStr] = currentCalMonthObj.key.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;
    const d = new Date(year, month, selectedCalendarDay);
    return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  }, [selectedCalendarDay, currentCalMonthObj]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 px-4 py-4 space-y-4 scrollbar-none font-sans">
      
      {/* Header element */}
      <div className="flex flex-col">
        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider font-mono">Statistical Insights Engine</span>
        <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest font-mono flex items-center gap-1.5 mt-0.5">
          <Activity className="h-4 w-4 text-indigo-500" />
          Analytics & Reports
        </h2>
      </div>

      {/* Primary Analytics Tab Switch */}
      <div className="grid grid-cols-4 gap-1 bg-slate-200/60 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setActiveAnalysisMode('trends')}
          className={`py-1.5 rounded-lg text-[9px] font-black uppercase font-mono tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeAnalysisMode === 'trends'
            ? 'bg-indigo-650 text-white shadow-xs'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" /> <span className="text-center">Trends</span>
        </button>
        <button
          onClick={() => setActiveAnalysisMode('compare')}
          className={`py-1.5 rounded-lg text-[9px] font-black uppercase font-mono tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeAnalysisMode === 'compare'
            ? 'bg-indigo-650 text-white shadow-xs'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" /> <span className="text-center">Compare</span>
        </button>
        <button
          onClick={() => setActiveAnalysisMode('calendar')}
          className={`py-1.5 rounded-lg text-[9px] font-black uppercase font-mono tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeAnalysisMode === 'calendar'
            ? 'bg-indigo-650 text-white shadow-xs'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Layers className="h-3.5 w-3.5" /> <span className="text-center">Calendar</span>
        </button>
        <button
          onClick={() => setActiveAnalysisMode('sources')}
          className={`py-1.5 rounded-lg text-[9px] font-black uppercase font-mono tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeAnalysisMode === 'sources'
            ? 'bg-indigo-650 text-white shadow-xs'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" /> <span className="text-center">Accounts</span>
        </button>
      </div>

      {/* NAVIGATION MODE VIEWPORT SWITCH */}
      {activeAnalysisMode === 'trends' && (
        <div className="space-y-4">
          
          {/* Chart Card: Inflow vs Outflow cashflow bar comparison */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-2">
            <h3 className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 font-mono tracking-wider">📊 Cashflow Inflow vs Outflow</h3>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">Aggregated monthly earnings vs spending bills registered on disk.</p>
            
            <div className="h-44 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicMonthlyCashflows}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} width={30} />
                  <Tooltip cursor={{ fill: 'rgba(99,102,241,0.06)' }} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '9px', color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: '9px', marginTop: 5 }} />
                  <Bar dataKey="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Outflow" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* June Category shares (Pie card) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* June Category allocation pie */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-2">
              <h3 className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">🍕 Outflow Shares (June 2026)</h3>
              
              {topJuneCategories.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic py-6 text-center">No June expenses registered yet.</p>
              ) : (
                <div className="flex items-center justify-between">
                  {/* Pie Visualization */}
                  <div className="h-28 w-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartPie>
                        <Pie
                          data={topJuneCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          innerRadius={28}
                          outerRadius={45}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {topJuneCategories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </RechartPie>
                    </ResponsiveContainer>
                  </div>

                  {/* Legends details */}
                  <div className="flex-1 pl-4 space-y-1 text-[10px] max-h-28 overflow-y-auto pr-1 scrollbar-thin">
                    {topJuneCategories.map(c => (
                      <div key={c.name} className="flex items-center justify-between gap-2 py-0.5 border-b border-slate-50 dark:border-slate-800/20 last:border-0">
                        <span className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300 min-w-0 flex-1">
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="truncate uppercase text-[9px] tracking-tight">{c.name}</span>
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">{currencySymbol}{c.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Interactive category MoM drilldown */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-3.5 text-xs">
              <h3 className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">🗂️ Interactive Drilldown MoM</h3>
              
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-bold block">Focus Category</span>
                  <select
                    value={drilldownCategory}
                    onChange={(e) => {
                      setDrilldownCategory(e.target.value);
                      setDrilldownSubcategory('All');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-none font-bold"
                  >
                    {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-400 font-bold block">Subcategory focus</span>
                  <select
                    value={drilldownSubcategory}
                    onChange={(e) => setDrilldownSubcategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-none font-bold font-sans"
                  >
                    <option value="All">All Subs</option>
                    {drilldownSubcategoryOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Drilldown trend graph line */}
              <div className="h-28 w-full pt-1.5">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedCategoryHistoryData}>
                    <XAxis dataKey="month" stroke="#a1a1aa" fontSize={8} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: '#090d16', border: 'none', borderRadius: '6px', fontSize: '8px', color: '#fff' }} />
                    <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* RESEARCH CORNER: CATEGORY & SUB-CATEGORY DETAILS */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-xs space-y-4 text-xs">
            {/* Responsive header */}
            <div className="flex flex-col gap-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex flex-col">
                <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold font-mono uppercase tracking-widest">Research Insights Corner</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono mt-0.5 leading-tight flex items-center gap-1.5">
                  🧠 Factor: <span className="text-indigo-600 dark:text-indigo-400 font-black">{drilldownCategory}</span>
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-[8px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                  Details & Breakdown
                </span>
              </div>
            </div>

            {/* Category summary metrics row - Unified stats strip design to maximize text container space and prevent clipping */}
            <div className="flex divide-x divide-slate-100 dark:divide-slate-700/60 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/50 rounded-xl overflow-hidden py-2 shadow-xs">
              <div className="flex-1 text-center min-w-0 px-1">
                <span className="block text-[7.5px] uppercase font-sans font-bold text-slate-400 dark:text-slate-500 tracking-wider">Outflow</span>
                <span className="font-extrabold text-[11px] font-mono text-slate-805 dark:text-slate-100 mt-0.5 block truncate">
                  {currencySymbol}{categoryResearchData.categoryTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex-1 text-center min-w-0 px-1">
                <span className="block text-[7.5px] uppercase font-sans font-bold text-slate-400 dark:text-slate-500 tracking-wider">Frequency</span>
                <span className="font-extrabold text-[11px] font-mono text-slate-805 dark:text-slate-100 mt-0.5 block truncate">
                  {categoryResearchData.categoryCount} count
                </span>
              </div>
              <div className="flex-1 text-center min-w-0 px-1">
                <span className="block text-[7.5px] uppercase font-sans font-bold text-slate-400 dark:text-slate-500 tracking-wider">Avg Ticket</span>
                <span className="font-extrabold text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block truncate">
                  {currencySymbol}{Math.round(categoryResearchData.categoryAverage).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Subcategories list details partition */}
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 font-mono tracking-wider block">
                Subcategory Distribution Breakdown
              </span>

              {categoryResearchData.subcategories.length === 0 ? (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic py-2 text-center">
                  No subcategory transactions registered for {drilldownCategory}.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5 scrollbar-thin">
                  {categoryResearchData.subcategories.map(subItem => (
                    <div 
                      key={subItem.name}
                      className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-150/30 dark:border-slate-800 rounded-xl space-y-2"
                    >
                      {/* Row 1: Left has subcategory name (truncated politely), Right has exact total outflow */}
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 uppercase text-[10px] truncate">
                          {subItem.name}
                        </span>
                        <span className="font-mono text-xs font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {currencySymbol}{subItem.total.toLocaleString()}
                        </span>
                      </div>

                      {/* Row 2: Left has count and average details, Right has share percentage badge */}
                      <div className="flex justify-between items-center text-[8.5px] text-slate-500 dark:text-slate-400 font-mono">
                        <div className="flex items-center gap-1">
                          <span>{subItem.count} {subItem.count === 1 ? 'tx' : 'txs'}</span>
                          <span className="opacity-40">&middot;</span>
                          <span>Avg: {currencySymbol}{Math.round(subItem.averageAmt).toLocaleString()}</span>
                        </div>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 px-1.5 py-0.5 rounded font-bold">
                          {subItem.sharePct.toFixed(1)}% share
                        </span>
                      </div>

                      {/* Row 3: Visual horizontal slider and concentration category label badge */}
                      <div className="flex justify-between items-center gap-4 pt-2 border-t border-slate-100/60 dark:border-slate-800/50 border-dashed">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full" 
                            style={{ width: `${subItem.sharePct}%` }}
                          />
                        </div>
                        <span className={`text-[7.5px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded border leading-none ${subItem.tagColor}`}>
                          {subItem.recommendation}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {activeAnalysisMode === 'compare' && (
        <div className="space-y-4">
          
          {/* Card: side by side configuration */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-3.5 text-xs">
            <h3 className="text-[10px] font-black uppercase text-indigo-500 font-mono tracking-wider">📅 SELECT PERIODS RANGE FOR DIFFERENCES</h3>
            
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="space-y-0.5">
                <span className="text-slate-400 font-bold block">Target Period A</span>
                <select
                  value={compareMonthA}
                  onChange={(e) => setCompareMonthA(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-202 dark:border-slate-700 outline-none font-bold"
                >
                  {monthsMeta.map(m => <option key={m.key} value={m.key}>{m.display}</option>)}
                </select>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 font-bold block">Reference Period B</span>
                <select
                  value={compareMonthB}
                  onChange={(e) => setCompareMonthB(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-202 dark:border-slate-700 outline-none font-bold"
                >
                  {monthsMeta.map(m => <option key={m.key} value={m.key}>{m.display}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Comparative Metrics results block */}
          <div className="bg-slate-950 text-white p-4 rounded-2xl shadow-lg border border-slate-850 space-y-3">
            <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-500">
              <span>Financial Variance</span>
              <span>Diff status</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest block leading-none">Period A bill Total</span>
                <span className="text-sm font-black font-mono block mt-1">{currencySymbol} {comparisonResults.expenseA.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest block leading-none">Period B bill Total</span>
                <span className="text-sm font-black font-mono block mt-1 text-slate-100">{currencySymbol} {comparisonResults.expenseB.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[8px] text-slate-400 uppercase tracking-wider font-mono block">Variance Gap</span>
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-black font-mono">
                  {comparisonResults.expDiff >= 0 ? '+' : ''} {currencySymbol} {comparisonResults.expDiff.toLocaleString()}
                </span>
                <span className={`text-[10px] font-black ${comparisonResults.expDiff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {comparisonResults.expDiff > 0 ? '🔺 Increase' : '🟢 Reduced'} ({Math.abs(comparisonResults.expPct).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown lists */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-3.5 text-xs">
            <h4 className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">📋 CATEGORIES SIDE-BY-SIDE SIDEBARS (TOP 5)</h4>
            
            <div className="space-y-2">
              {comparisonResults.categoriesComparison.map(c => {
                const isIncreased = c.netDelta > 0;
                return (
                  <div key={c.category} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center font-mono text-[10px]">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-200 block uppercase text-[9px]">{c.category}</span>
                      <span className="text-slate-400 text-[8px]">
                        A: {currencySymbol}{c.MonthA.toLocaleString()} &middot; B: {currencySymbol}{c.MonthB.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`font-black ${isIncreased ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {isIncreased ? '+' : ''} {currencySymbol} {c.netDelta.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {activeAnalysisMode === 'calendar' && (
        <div className="space-y-4 font-sans text-xs">
          
          {/* Calendar Picker bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs flex justify-between items-center text-xs">
            <button
              onClick={() => setCalendarMonthIndex(Math.max(0, calendarMonthIndex - 1))}
              disabled={calendarMonthIndex === 0}
              className="p-1.5 border border-slate-100 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>
            <span className="font-extrabold text-slate-800 dark:text-slate-100 tracking-wider uppercase font-mono text-xs flex items-center gap-1.5">
              <CalIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> {currentCalMonthObj.display}
            </span>
            <button
              onClick={() => setCalendarMonthIndex(Math.min(monthsMeta.length - 1, calendarMonthIndex + 1))}
              disabled={calendarMonthIndex === monthsMeta.length - 1}
              className="p-1.5 border border-slate-100 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          {/* Calendar visual grid matrix */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-3">
            {/* Days headers row */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-wider font-mono">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>

            {/* Matrix days list cells */}
            <div className="grid grid-cols-7 gap-2 font-mono">
              {calendarDaysList.map((dayItem, index) => {
                if (dayItem.isEmpty) {
                  return <div key={`empty-${index}`} className="h-10 opacity-0" />;
                }

                const isSelected = selectedCalendarDay === dayItem.dayNum;
                const hasExpense = dayItem.totalPaidOut > 0;
                const hasIncome = dayItem.totalIncomeIn > 0;
                const isToday = currentCalMonthObj.key === '2026-06' && dayItem.dayNum === 14;
                
                let bgStyle = 'bg-slate-50/50 dark:bg-slate-900/30 border-transparent text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
                
                if (isSelected) {
                  bgStyle = 'bg-indigo-650 text-white font-bold border-indigo-600 shadow-md shadow-indigo-650/25 z-10';
                } else if (isToday) {
                  bgStyle = 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-bold';
                }

                return (
                  <button
                    key={`day-${dayItem.dayNum}`}
                    onClick={() => setSelectedCalendarDay(dayItem.dayNum)}
                    className={`h-10 flex flex-col items-center justify-between py-1 px-0.5 rounded-xl border text-[11px] cursor-pointer transition-all ${bgStyle}`}
                  >
                    <span className="leading-tight">{dayItem.dayNum}</span>
                    
                    {/* Activity dots container */}
                    <div className="flex gap-0.5 justify-center items-center mt-0.5 h-1">
                      {hasIncome && (
                        <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                      )}
                      {hasExpense && (
                        <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-rose-500'}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Elegant Detail drawer panel showing lists for selected calendarday */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
            
            {/* Header info */}
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex flex-col">
                <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-extrabold font-mono uppercase tracking-widest">Date Ledger Audit</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono mt-0.5 leading-tight">
                  {formattedDateLong}
                </span>
              </div>
              <div>
                <span className="text-[9px] bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-lg font-black font-mono">
                  {selectedDayMetrics.list.length} TX{selectedDayMetrics.list.length !== 1 ? 'S' : ''}
                </span>
              </div>
            </div>

            {/* Income & Expense Daily summary widgets requested by user */}
            <div className="grid grid-cols-2 gap-3">
              
              {/* Daily Income block */}
              <div className="p-3 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/10 dark:border-emerald-500/20 rounded-xl flex flex-col justify-between h-14">
                <span className="text-[9px] text-slate-400 dark:text-slate-450 uppercase font-bold tracking-wider leading-none flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Daily Income
                </span>
                <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 leading-none">
                  {currencySymbol}{selectedDayMetrics.incomeSum.toLocaleString()}
                </span>
              </div>

              {/* Daily Expense block */}
              <div className="p-3 bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/10 dark:border-rose-500/20 rounded-xl flex flex-col justify-between h-14">
                <span className="text-[9px] text-slate-400 dark:text-slate-450 uppercase font-bold tracking-wider leading-none flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Daily Expense
                </span>
                <span className="text-xs font-black font-mono text-rose-600 dark:text-rose-400 leading-none">
                  {currencySymbol}{selectedDayMetrics.expenseSum.toLocaleString()}
                </span>
              </div>

            </div>

            {/* Ledger Transactions list block */}
            <div className="space-y-2">
              <h5 className="text-[9px] font-black uppercase text-slate-400 font-mono tracking-wider">
                Transaction Items
              </h5>

              {selectedDayMetrics.list.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-5 text-center text-slate-400/80">
                  <CalIcon className="h-7 w-7 text-slate-300 dark:text-slate-700 stroke-[1.5] mb-1.5" />
                  <p className="text-[10px] italic font-mono">No expenditures or incomes logged on this date.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
                  {selectedDayMetrics.list.map(tx => {
                    const isPositive = tx.transactionType === 'Income' || tx.transactionType === 'LoanTaken';
                    const signSymbol = isPositive ? '+' : '-';
                    const amountColor = isPositive 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-rose-600 dark:text-rose-400';
                    
                    return (
                      <div 
                        key={tx.id} 
                        onClick={() => setSelectedDetailExpense(tx)}
                        className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl flex justify-between items-center cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:border-indigo-100 dark:hover:border-indigo-900/40 active:scale-[0.98] transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-8 w-1 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-800 dark:text-slate-100 uppercase text-[10px]">
                                {tx.category}
                              </span>
                              <span className="text-[8px] bg-slate-200/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                                {tx.paymentMode}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 block italic truncate max-w-[150px]">
                              {tx.subcategory} {tx.notes ? `· "${tx.notes}"` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`font-mono text-[11px] font-black ${amountColor}`}>
                            {signSymbol}{currencySymbol}{tx.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {activeAnalysisMode === 'sources' && (
        <div className="space-y-4">
          
          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
              <span className="text-[8px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider block">Largest Spending Source</span>
              <span className="text-[11px] font-black font-mono text-rose-500 block mt-1 truncate">
                {sourceWiseAnalysis.largestSpendingSource}
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono block mt-0.5">
                Total: {currencySymbol}{sourceWiseAnalysis.maxSpending.toLocaleString()}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
              <span className="text-[8px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider block">Largest Income Source</span>
              <span className="text-[11px] font-black font-mono text-emerald-500 block mt-1 truncate">
                {sourceWiseAnalysis.largestIncomeSource}
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono block mt-0.5">
                Total: {currencySymbol}{sourceWiseAnalysis.maxIncome.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Source comparison details */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 font-mono tracking-wider">
              💼 Source-Wise Account Statistics
            </h3>
            
            <div className="space-y-2.5">
              {sourceWiseAnalysis.sourcesMetrics.map(sm => (
                <div key={sm.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 font-sans">
                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      {sm.name}
                      {sm.archived && <span className="text-[7px] bg-slate-200 dark:bg-slate-800 text-slate-500 py-0.5 px-1.5 rounded uppercase font-sans">Archived</span>}
                    </span>
                    <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400">
                      Bal: {currencySymbol}{sm.currentBalance.toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[9px] font-mono pt-2 text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="block text-[7px] uppercase font-sans font-bold text-slate-400 dark:text-slate-500 leading-none">Opening Balance</span>
                      <span className="font-extrabold text-slate-700 dark:text-slate-300 mt-0.5 block">{currencySymbol}{sm.opening.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[7px] uppercase font-sans font-bold text-slate-400 dark:text-slate-500 leading-none">Total Inflow</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">+{currencySymbol}{sm.income.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[7px] uppercase font-sans font-bold text-slate-400 dark:text-slate-500 leading-none">Total Outflow</span>
                      <span className="font-extrabold text-rose-600 dark:text-rose-400 mt-0.5 block font-mono">-{currencySymbol}{sm.spending.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly balances dynamic line chart */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-2">
            <h3 className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 font-mono tracking-wider">📈 Balance Trend MoM</h3>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-sans">End of month historical cumulative assets progression.</p>
            
            <div className="h-44 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sourceMonthlyTrends}>
                  <XAxis dataKey="month" stroke="#a1a1aa" fontSize={8} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={8} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '8px', color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: '8px', marginTop: 5 }} />
                  {moneySources.map((s, idx) => {
                    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                    return (
                      <Line 
                        key={s.id} 
                        type="monotone" 
                        dataKey={s.name} 
                        stroke={colors[idx % colors.length]} 
                        strokeWidth={2} 
                        dot={{ r: 2 }} 
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* DETAILED TRANSACTION OVERLAY POPUP */}
      <AnimatePresence>
        {selectedDetailExpense && (
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 text-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-xs space-y-4 shadow-2xl relative"
            >
              <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide font-mono pb-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span>Ledger Receipt Detail</span>
                <button 
                  onClick={() => setSelectedDetailExpense(null)} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </h3>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Transaction Ref</span>
                  <span className="font-mono text-[9px] text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10 truncate max-w-[120px]">{selectedDetailExpense.id}</span>
                </div>
                
                <div className="flex justify-between items-center border-t border-slate-50 dark:border-slate-800/50 pt-2 border-dashed">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Amount</span>
                  <span className={`font-black font-mono text-xs ${
                    selectedDetailExpense.transactionType === 'Income' || selectedDetailExpense.transactionType === 'LoanTaken'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {selectedDetailExpense.transactionType === 'Income' || selectedDetailExpense.transactionType === 'LoanTaken' ? '+' : '-'} {currencySymbol} {selectedDetailExpense.amount.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-50 dark:border-slate-800/50 pt-2 border-dashed">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedDetailExpense.date}</span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-50 dark:border-slate-800/50 pt-2 border-dashed">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Type Classification</span>
                  <span className="font-mono font-bold uppercase text-[9px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                    {selectedDetailExpense.transactionType || 'Expense'}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-50 dark:border-slate-800/50 pt-2 border-dashed">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">General Category</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedDetailExpense.category}</span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-50 dark:border-slate-800/50 pt-2 border-dashed">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Subcategory</span>
                  <span className="font-medium text-slate-600 dark:text-slate-300">{selectedDetailExpense.subcategory}</span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-50 dark:border-slate-800/50 pt-2 border-dashed">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Payment Account</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/50 px-2 py-0.5 rounded font-mono text-[9px]">{selectedDetailExpense.paymentMode}</span>
                </div>

                {selectedDetailExpense.personName && (
                  <div className="flex justify-between items-center border-t border-slate-50 dark:border-slate-800/50 pt-2 border-dashed">
                    <span className="text-slate-400 font-bold text-[10px] uppercase">Counterparty</span>
                    <span className="text-indigo-600 dark:text-indigo-300 font-extrabold">{selectedDetailExpense.personName}</span>
                  </div>
                )}

                {selectedDetailExpense.parentLoanId && (
                  <div className="bg-amber-500/5 p-2 rounded-xl border border-amber-500/10 text-[9px] text-amber-500 font-semibold">
                    🔗 Linked Parent Loan ID: {selectedDetailExpense.parentLoanId}
                  </div>
                )}

                {selectedDetailExpense.notes && (
                  <div className="flex flex-col pt-2 border-t border-slate-50 dark:border-slate-800 border-dashed">
                    <span className="text-slate-400 font-bold text-[10px] uppercase mb-0.5">Memo Description</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300 italic text-[10px] leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100/50 dark:border-slate-800/40">
                      &quot;{selectedDetailExpense.notes}&quot;
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedDetailExpense(null)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-650 dark:hover:bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider font-mono cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
                >
                  Close Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
