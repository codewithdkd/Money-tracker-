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
  Sparkles
} from 'lucide-react';
import { VirtualExpense } from '../types';

interface AnalysisScreenProps {
  expenses: VirtualExpense[];
}

export default function AnalysisScreen({ expenses }: AnalysisScreenProps) {
  // Navigation tabs within Analysis for visual compactness
  const [activeAnalysisMode, setActiveAnalysisMode] = useState<'trends' | 'compare' | 'calendar'>('trends');

  // --- GENERAL CONSTANTS & UTILITIES ---
  const monthsMeta = [
    { key: '2026-03', name: 'March', display: 'March 2026' },
    { key: '2026-04', name: 'April', display: 'April 2026' },
    { key: '2026-05', name: 'May', display: 'May 2026' },
    { key: '2026-06', name: 'June', display: 'June 2026' }
  ];

  const categoriesList = useMemo(() => {
    const list = new Set<string>();
    expenses.forEach(e => {
      if (e.category) list.add(e.category);
    });
    // Fallbacks if empty
    if (list.size === 0) {
      return ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment'];
    }
    return Array.from(list);
  }, [expenses]);

  // --- STATE FOR MODE: TRENDS ---
  const [drilldownCategory, setDrilldownCategory] = useState<string>(categoriesList[0] || 'Food');
  const [drilldownSubcategory, setDrilldownSubcategory] = useState<string>('All');
  const [compareGraphMode, setCompareGraphMode] = useState<'grouped' | 'stacked'>('grouped');

  // --- STATE FOR MODE: COMPARE ---
  const [compareMonthA, setCompareMonthA] = useState<string>('2026-06');
  const [compareMonthB, setCompareMonthB] = useState<string>('2026-05');
  const [compareYearA, setCompareYearA] = useState<number>(2026);
  const [compareYearB, setCompareYearB] = useState<number>(2025);
  const [comparisonType, setComparisonType] = useState<'month' | 'year'>('month');

  // --- STATE FOR MODE: CALENDAR ---
  const [calendarMonthIndex, setCalendarMonthIndex] = useState<number>(3); // index of moonsMeta, defaults to June 2026 (index 3)
  const currentCalMonthObj = monthsMeta[calendarMonthIndex] || monthsMeta[3];
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(new Date().getDate());

  // --- DATA CALCULATIONS: TRENDS ---
  const monthlyTotalTrend = useMemo(() => {
    return monthsMeta.map(m => {
      const sum = expenses
        .filter(e => e.date.startsWith(m.key))
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        name: m.name,
        amount: sum
      };
    });
  }, [expenses]);

  // Last 4 months grouped category comparative data
  const last4MonthsCategoryComparison = useMemo(() => {
    return categoriesList.map(cat => {
      const row: Record<string, any> = { category: cat };
      monthsMeta.forEach(m => {
        const sum = expenses
          .filter(e => e.category.toLowerCase() === cat.toLowerCase() && e.date.startsWith(m.key))
          .reduce((sum, e) => sum + e.amount, 0);
        row[m.name] = sum;
      });
      return row;
    });
  }, [expenses, categoriesList]);

  // Available subcategories for selected drilldownCategory calculated dynamically
  const drilldownSubcategoryOptions = useMemo(() => {
    const list = new Set<string>();
    expenses.forEach(e => {
      if (e.category?.toLowerCase() === drilldownCategory.toLowerCase() && e.subcategory) {
        list.add(e.subcategory);
      }
    });
    return Array.from(list);
  }, [expenses, drilldownCategory]);

  // Category wise MoM drilldown
  const selectedCategoryMoMData = useMemo(() => {
    return monthsMeta.map(m => {
      const sum = expenses
        .filter(e => {
          const categoryMatch = e.category.toLowerCase() === drilldownCategory.toLowerCase();
          const subcategoryMatch = drilldownSubcategory === 'All' || (e.subcategory && e.subcategory.toLowerCase() === drilldownSubcategory.toLowerCase());
          const dateMatch = e.date.startsWith(m.key);
          return categoryMatch && subcategoryMatch && dateMatch;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        month: m.name,
        monthFull: m.display,
        amount: sum
      };
    });
  }, [expenses, drilldownCategory, drilldownSubcategory]);

  const topCategories = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach(e => {
      // aggregate global or within last 4 months
      const yearMonth = e.date.substring(0, 7);
      if (monthsMeta.some(m => m.key === yearMonth)) {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
      }
    });

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return Object.entries(totals)
      .map(([name, value], i) => ({
        name,
        value,
        color: colors[i % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [expenses]);


  // --- DATA CALCULATIONS: COMPARATIVE ENGINE ---
  const monthComparisonMetrics = useMemo(() => {
    const sumA = expenses
      .filter(e => e.date.startsWith(compareMonthA))
      .reduce((sum, e) => sum + e.amount, 0);
    const sumB = expenses
      .filter(e => e.date.startsWith(compareMonthB))
      .reduce((sum, e) => sum + e.amount, 0);

    const diff = sumA - sumB;
    const percentage = sumB > 0 ? (diff / sumB) * 100 : 0;

    // Category breakdown comparison side by side
    const catBreakdown = categoriesList.map(cat => {
      const amtA = expenses
        .filter(e => e.category.toLowerCase() === cat.toLowerCase() && e.date.startsWith(compareMonthA))
        .reduce((sum, e) => sum + e.amount, 0);
      const amtB = expenses
        .filter(e => e.category.toLowerCase() === cat.toLowerCase() && e.date.startsWith(compareMonthB))
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        category: cat,
        amountA: amtA,
        amountB: amtB,
        diff: amtA - amtB
      };
    });

    return { sumA, sumB, diff, percentage, breakdown: catBreakdown };
  }, [expenses, compareMonthA, compareMonthB, categoriesList]);

  const yearComparisonMetrics = useMemo(() => {
    const sumA = expenses
      .filter(e => e.date.startsWith(String(compareYearA)))
      .reduce((sum, e) => sum + e.amount, 0);
    const sumB = expenses
      .filter(e => e.date.startsWith(String(compareYearB)))
      .reduce((sum, e) => sum + e.amount, 0);

    const diff = sumA - sumB;
    const percentage = sumB > 0 ? (diff / sumB) * 100 : 0;

    const catBreakdown = categoriesList.map(cat => {
      const amtA = expenses
        .filter(e => e.category.toLowerCase() === cat.toLowerCase() && e.date.startsWith(String(compareYearA)))
        .reduce((sum, e) => sum + e.amount, 0);
      const amtB = expenses
        .filter(e => e.category.toLowerCase() === cat.toLowerCase() && e.date.startsWith(String(compareYearB)))
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        category: cat,
        amountA: amtA,
        amountB: amtB,
        diff: amtA - amtB
      };
    });

    return { sumA, sumB, diff, percentage, breakdown: catBreakdown };
  }, [expenses, compareYearA, compareYearB, categoriesList]);


  // --- DATA CALCULATIONS: CALENDAR TRACKER ---
  const calendarGridData = useMemo(() => {
    // Current chosen year-month
    const [yearStr, monthStr] = currentCalMonthObj.key.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-indexed month

    // Determine total days in month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Determine day offset of the consecutive first day
    const firstDayOffset = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday ...

    const grid = [];
    
    // Add prefix empty spacer cells
    for (let i = 0; i < firstDayOffset; i++) {
      grid.push({ isEmpty: true, dayNum: 0, dateStr: '', totalSpend: 0 });
    }

    // Add days
    for (let d = 1; d <= totalDays; d++) {
      const dayFormatted = d < 10 ? `0${d}` : String(d);
      const dateStr = `${currentCalMonthObj.key}-${dayFormatted}`;
      
      const dayExpenses = expenses.filter(e => e.date === dateStr);
      const totalSpend = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

      grid.push({
        isEmpty: false,
        dayNum: d,
        dateStr,
        totalSpend
      });
    }

    return grid;
  }, [expenses, currentCalMonthObj]);

  const selectedDayExpenses = useMemo(() => {
    const dayFormatted = selectedCalendarDay < 10 ? `0${selectedCalendarDay}` : String(selectedCalendarDay);
    const targetDateStr = `${currentCalMonthObj.key}-${dayFormatted}`;
    return expenses.filter(e => e.date === targetDateStr);
  }, [expenses, selectedCalendarDay, currentCalMonthObj]);

  const selectedDayTotal = useMemo(() => {
    return selectedDayExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [selectedDayExpenses]);


  // --- EVENT HANDLERS ---
  const handlePrevMonthSwipe = () => {
    setCalendarMonthIndex(prev => (prev > 0 ? prev - 1 : prev));
    setSelectedCalendarDay(1); // Reset selected day to 1st of the page
  };

  const handleNextMonthSwipe = () => {
    setCalendarMonthIndex(prev => (prev < monthsMeta.length - 1 ? prev + 1 : prev));
    setSelectedCalendarDay(1);
  };


  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 px-4 py-4 space-y-4 scrollbar-thin">
      
      {/* Visual Identity Title segment */}
      <div className="bg-gradient-to-r from-slate-800 to-indigo-950 dark:from-slate-900 dark:to-indigo-950 p-4 rounded-2xl text-white shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[9px] font-black bg-indigo-500/30 border border-indigo-400/20 px-2.5 py-0.5 rounded-md font-mono uppercase tracking-wider">
            Enterprise Ledger Cockpit
          </span>
          <h2 className="text-sm font-black tracking-tight">Financial Analytics Suite</h2>
          <p className="text-[10px] text-slate-300">Bi-temporal comparing, daily tracks & trend charts</p>
        </div>
        <Sparkles className="h-9 w-9 text-indigo-400/30" />
      </div>

      {/* Tabs Menu in Line to save space and match aesthetics */}
      <div className="bg-white dark:bg-slate-800 p-1 rounded-xl flex border border-slate-150 dark:border-slate-800 shadow-xs">
        <button
          onClick={() => setActiveAnalysisMode('trends')}
          className={`flex-1 py-1.5 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            activeAnalysisMode === 'trends' 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Trends
        </button>
        <button
          onClick={() => setActiveAnalysisMode('compare')}
          className={`flex-1 py-1.5 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            activeAnalysisMode === 'compare' 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Compare Engine
        </button>
        <button
          onClick={() => setActiveAnalysisMode('calendar')}
          className={`flex-1 py-1.5 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            activeAnalysisMode === 'calendar' 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Calendar
        </button>
      </div>


      {/* --- MODE 1: TRENDS & HISTOGRAMS --- */}
      {activeAnalysisMode === 'trends' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Gold, Silver, Bronze: Top Spending Categories in Last 4 Months */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
              <Award className="h-4 w-4 text-amber-500" />
              Dominant Spending Sectors (March - June)
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {topCategories.map((item, i) => (
                <div key={item.name} className="bg-slate-50/50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-black text-indigo-500 block mb-1">RANK #{i + 1}</span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold block truncate">{item.name}</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono mt-1.5 block">₹{item.value.toLocaleString()}</span>
                </div>
              ))}
              {topCategories.length === 0 && (
                <p className="col-span-3 text-xs text-slate-400 p-2 text-center italic">No ledger inputs mapped</p>
              )}
            </div>
          </div>

          {/* Line Chart: Overall Cumulative trends over 4 months */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-2">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Cumulative Monthly Outlay (4-Month Trend)
            </h3>
            <div className="h-44 w-full text-[10px] font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTotalTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Outlay']} />
                  <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3.5} dot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Drilldown Section: MoM analysis of category wise */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
                <CalIcon className="h-4 w-4 text-indigo-500" />
                Category Specific Audit
              </h3>
              
              <div className="flex items-center gap-2">
                {/* Category select button */}
                <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-1 flex items-center">
                  <select
                    value={drilldownCategory}
                    onChange={(e) => {
                      setDrilldownCategory(e.target.value);
                      setDrilldownSubcategory('All');
                    }}
                    className="bg-transparent border-0 outline-none text-[10px] font-mono text-slate-800 dark:text-slate-100 uppercase font-black"
                  >
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat} className="dark:bg-slate-800">{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Subcategory select button */}
                <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-1 flex items-center">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 pl-1 uppercase font-mono">Subcat:</span>
                  <select
                    value={drilldownSubcategory}
                    onChange={(e) => setDrilldownSubcategory(e.target.value)}
                    className="bg-transparent border-0 outline-none text-[10px] font-mono text-slate-800 dark:text-slate-100 font-bold px-1"
                  >
                    <option value="All" className="dark:bg-slate-800">ALL</option>
                    {drilldownSubcategoryOptions.map(sub => (
                      <option key={sub} value={sub} className="dark:bg-slate-800">{sub.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal">
              Month-over-month telemetry auditing for category <strong className="text-indigo-500 uppercase">{drilldownCategory}</strong> 
              {drilldownSubcategory !== 'All' && <span> (subcategory: <strong className="text-emerald-500 uppercase">{drilldownSubcategory}</strong>)</span>}:
            </p>

            {/* Dynamic MoM Bar chart for the chosen category and subcategory */}
            <div className="h-32 w-full text-[10px] font-mono pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selectedCategoryMoMData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, drilldownSubcategory === 'All' ? drilldownCategory : `${drilldownCategory} - ${drilldownSubcategory}`]} />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Render data list as elegant scannable text rows instead of charts */}
            <div className="space-y-2">
              {selectedCategoryMoMData.map(item => (
                <div key={item.month} className="flex justify-between items-center py-2.5 px-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-slate-150 dark:border-slate-850/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/20 dark:bg-indigo-400/20 border border-indigo-500 dark:border-indigo-400" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.monthFull}</span>
                  </div>
                  <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm">
                    ₹{item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}


      {/* --- MODE 2: RECTIFY COMPARATIVE ENGINE --- */}
      {activeAnalysisMode === 'compare' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Sub menu: Compare Month vs Month, or Year vs Year */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-[10px] font-mono font-black uppercase text-slate-400">Comparison Scope</span>
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 text-[9px] font-black uppercase font-mono">
                <button
                  onClick={() => setComparisonType('month')}
                  className={`px-2.5 py-1 rounded ${comparisonType === 'month' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs' : 'text-slate-400'}`}
                >
                  Month vs Month
                </button>
                <button
                  onClick={() => setComparisonType('year')}
                  className={`px-2.5 py-1 rounded ${comparisonType === 'year' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs' : 'text-slate-400'}`}
                >
                  Year vs Year
                </button>
              </div>
            </div>

            {comparisonType === 'month' ? (
              <div className="grid grid-cols-2 gap-3 pb-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Target Base (A)</label>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg p-1.5">
                    <select
                      value={compareMonthA}
                      onChange={(e) => setCompareMonthA(e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                    >
                      {monthsMeta.map(m => (
                        <option key={m.key} value={m.key} className="dark:bg-slate-800">{m.display}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Compare With (B)</label>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg p-1.5">
                    <select
                      value={compareMonthB}
                      onChange={(e) => setCompareMonthB(e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                    >
                      {monthsMeta.map(m => (
                        <option key={m.key} value={m.key} className="dark:bg-slate-800">{m.display}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pb-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Target Year (A)</label>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg p-1.5">
                    <select
                      value={compareYearA}
                      onChange={(e) => setCompareYearA(Number(e.target.value))}
                      className="w-full bg-transparent border-0 outline-none text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                    >
                      <option value="2026" className="dark:bg-slate-800">2026 Ledger</option>
                      <option value="2025" className="dark:bg-slate-800">2025 Ledger</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Compare Year (B)</label>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg p-1.5">
                    <select
                      value={compareYearB}
                      onChange={(e) => setCompareYearB(Number(e.target.value))}
                      className="w-full bg-transparent border-0 outline-none text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                    >
                      <option value="2026" className="dark:bg-slate-800">2026 Ledger</option>
                      <option value="2025" className="dark:bg-slate-800">2025 Ledger</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Comparative Metrics Card */}
          {comparisonType === 'month' ? (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
              <div className="text-center space-y-1 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-extrabold font-mono uppercase tracking-widest block">Delta Variation</span>
                <span className="text-2xl font-black font-mono text-slate-800 dark:text-slate-100 block">
                  {monthComparisonMetrics.diff >= 0 ? '+' : ''}₹{monthComparisonMetrics.diff.toLocaleString()}
                </span>
                
                <div className="flex items-center justify-center gap-1 mt-1">
                  {monthComparisonMetrics.diff > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase font-mono bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30 px-2 py-0.5 rounded-full">
                      <TrendingUp className="h-2.5 w-2.5" /> {monthComparisonMetrics.percentage.toFixed(1)}% INCREASE
                    </span>
                  ) : monthComparisonMetrics.diff < 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase font-mono bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 px-2 py-0.5 rounded-full">
                      <TrendingDown className="h-2.5 w-2.5" /> {Math.abs(monthComparisonMetrics.percentage).toFixed(1)}% DECREASE
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold text-slate-400 uppercase">NO CHANGE</span>
                  )}
                </div>
              </div>

              {/* Side-by-Side totals */}
              <div className="grid grid-cols-2 gap-3.5 text-center text-xs font-mono font-bold">
                <div className="bg-indigo-50/20 dark:bg-indigo-950/10 p-3 rounded-lg border border-indigo-100/30 dark:border-indigo-900/20">
                  <span className="text-[9.5px] text-indigo-600 dark:text-indigo-400 font-bold tracking-wider font-sans uppercase block truncate">
                    {monthsMeta.find(m => m.key === compareMonthA)?.display || compareMonthA}
                  </span>
                  <span className="block text-sm font-black text-slate-800 dark:text-slate-100 mt-1">₹{monthComparisonMetrics.sumA.toLocaleString()}</span>
                </div>
                <div className="bg-slate-100/60 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-850">
                  <span className="text-[9.5px] text-slate-400 font-bold tracking-wider font-sans uppercase block truncate">
                    {monthsMeta.find(m => m.key === compareMonthB)?.display || compareMonthB}
                  </span>
                  <span className="block text-sm font-black text-slate-800 dark:text-slate-100 mt-1">₹{monthComparisonMetrics.sumB.toLocaleString()}</span>
                </div>
              </div>

              {/* Category-wise side-by-side break-up list */}
              <div className="space-y-2.5 pt-1.5">
                <label className="text-[9.5px] font-mono font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  Sectorial Side-By-Side Comparison
                </label>
                
                <div className="space-y-2.5">
                  {monthComparisonMetrics.breakdown.map(b => (
                    <div key={b.category} className="bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <span className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide font-mono block">
                          {b.category}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>A: ₹{b.amountA.toLocaleString()}</span>
                          <span>•</span>
                          <span>B: ₹{b.amountB.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-mono font-black ${b.diff > 0 ? 'text-red-500' : b.diff < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {b.diff > 0 ? '+' : ''}{b.diff.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
              <div className="text-center space-y-1 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-extrabold font-mono uppercase tracking-widest block">Delta Variation</span>
                <span className="text-2xl font-black font-mono text-slate-800 dark:text-slate-100 block">
                  {yearComparisonMetrics.diff >= 0 ? '+' : ''}₹{yearComparisonMetrics.diff.toLocaleString()}
                </span>
                
                <div className="flex items-center justify-center gap-1 mt-1">
                  {yearComparisonMetrics.diff > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase font-mono bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30 px-2 py-0.5 rounded-full">
                      <TrendingUp className="h-2.5 w-2.5" /> {yearComparisonMetrics.percentage.toFixed(1)}% INCREASE
                    </span>
                  ) : yearComparisonMetrics.diff < 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase font-mono bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 px-2 py-0.5 rounded-full">
                      <TrendingDown className="h-2.5 w-2.5" /> {Math.abs(yearComparisonMetrics.percentage).toFixed(1)}% DECREASE
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold text-slate-400 uppercase">NO CHANGE</span>
                  )}
                </div>
              </div>

              {/* Side-by-Side totals */}
              <div className="grid grid-cols-2 gap-3.5 text-center text-xs font-mono font-bold">
                <div className="bg-indigo-50/20 dark:bg-indigo-950/10 p-3 rounded-lg border border-indigo-100/30 dark:border-indigo-900/20">
                  <span className="text-[9.5px] text-indigo-600 dark:text-indigo-400 font-bold tracking-wider font-sans uppercase block truncate">
                    Year {compareYearA} Spend
                  </span>
                  <span className="block text-sm font-black text-slate-800 dark:text-slate-100 mt-1">₹{yearComparisonMetrics.sumA.toLocaleString()}</span>
                </div>
                <div className="bg-slate-100/60 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-850">
                  <span className="text-[9.5px] text-slate-400 font-bold tracking-wider font-sans uppercase block truncate">
                    Year {compareYearB} Spend
                  </span>
                  <span className="block text-sm font-black text-slate-800 dark:text-slate-100 mt-1">₹{yearComparisonMetrics.sumB.toLocaleString()}</span>
                </div>
              </div>

              {/* Category-wise side-by-side break-up list */}
              <div className="space-y-2.5 pt-1.5">
                <label className="text-[9.5px] font-mono font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  Sectorial Side-By-Side Comparison
                </label>
                
                <div className="space-y-2.5">
                  {yearComparisonMetrics.breakdown.map(b => (
                    <div key={b.category} className="bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <span className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide font-mono block">
                          {b.category}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>A: ₹{b.amountA.toLocaleString()}</span>
                          <span>•</span>
                          <span>B: ₹{b.amountB.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-mono font-black ${b.diff > 0 ? 'text-red-500' : b.diff < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {b.diff > 0 ? '+' : ''}{b.diff.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      )}


      {/* --- MODE 3: SWIPABLE MONTH CALENDAR WITH DAILY LABELS --- */}
      {activeAnalysisMode === 'calendar' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Swiper header block */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <button
              onClick={handlePrevMonthSwipe}
              disabled={calendarMonthIndex === 0}
              className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center font-sans">
              <span className="text-[10px] font-mono font-bold text-indigo-500 uppercase tracking-wider block">Month Swipe</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                {currentCalMonthObj.display}
              </span>
            </div>
            <button
              onClick={handleNextMonthSwipe}
              disabled={calendarMonthIndex === monthsMeta.length - 1}
              className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Calendar Grid card */}
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-3">
            {/* Grid days column names */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] font-black text-slate-400 uppercase select-none">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Grid layout */}
            <div className="grid grid-cols-7 gap-1">
              {calendarGridData.map((cell, idx) => {
                if (cell.isEmpty) {
                  return (
                    <div key={`empty-${idx}`} className="h-10 bg-slate-50/30 dark:bg-slate-900/10 rounded-lg" />
                  );
                }

                const isSelected = selectedCalendarDay === cell.dayNum;
                const dailyTotal = cell.totalSpend;

                return (
                  <button
                    key={`day-${cell.dayNum}`}
                    type="button"
                    onClick={() => setSelectedCalendarDay(cell.dayNum)}
                    className={`h-10 flex items-center justify-center border rounded-lg cursor-pointer transition-all text-xs font-mono font-bold ${
                      isSelected 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs font-black' 
                        : dailyTotal > 0
                        ? 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900/30 dark:text-indigo-400 font-extrabold'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 dark:border-slate-850 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>
                      {cell.dayNum}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daily Ledger Detail listings listed directly beneath requested date */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-black uppercase text-slate-400">Date Audit Details</span>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono">
                  {selectedCalendarDay} {currentCalMonthObj.display} 2026
                </h4>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Total Spend</span>
                <span className="text-xs font-black text-rose-500 font-mono">₹{selectedDayTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {selectedDayExpenses.map(exp => (
                <div key={exp.id} className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs">
                  <div className="space-y-0.5 min-w-0 pr-1 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate">{exp.category}</span>
                      <span className="text-[8.5px] text-slate-400 bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono truncate">{exp.subcategory}</span>
                    </div>
                    {exp.notes && (
                      <span className="text-[10px] text-slate-400 italic block truncate">({exp.notes})</span>
                    )}
                  </div>
                  <div className="text-right shrink-0 font-mono font-black text-slate-700 dark:text-slate-200">
                    ₹{exp.amount.toLocaleString()}
                  </div>
                </div>
              ))}

              {selectedDayExpenses.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4 italic">
                  No expenditure logged on this calendar date.
                </p>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
