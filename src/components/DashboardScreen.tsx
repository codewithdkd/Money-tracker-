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
  TrendingDown,
  ArrowRight, 
  ChevronRight, 
  ChevronDown, 
  Calendar,
  X,
  LogOut,
  PieChart as PieIcon,
  PlusCircle,
  Clock,
  Briefcase,
  Layers3,
  User,
  ArrowLeftRight,
  ShieldCheck,
  CheckCircle,
  Activity
} from 'lucide-react';
import { AppSettings, VirtualExpense, VirtualCategory, VirtualBudget, MoneySource } from '../types';
import { DbSim } from '../dbSim';
import { getSourceMonthlyBalance } from './SourcesScreen';

interface DashboardScreenProps {
  expenses: VirtualExpense[];
  categories: VirtualCategory[];
  budgets: VirtualBudget[];
  moneySources: MoneySource[];
  settings: AppSettings;
  onLockApp?: () => void;
  // Options to switch tab programmatically
  setActiveTab?: (tab: 'dashboard' | 'add' | 'accounts' | 'analysis' | 'settings') => void;
  onQuickRepay?: (loan: VirtualExpense, repaymentAmount: number, notes: string) => void;
}

export default function DashboardScreen({ 
  expenses, 
  categories, 
  budgets, 
  moneySources = [],
  settings, 
  onLockApp,
  setActiveTab,
  onQuickRepay
}: DashboardScreenProps) {
  const currencySymbol = settings.currency || '₹';

  // Current Month calculations (e.g. June 2026)
  const currentMonthStr = '2026-06';

  // ----------------------------------------------------
  // MONEY SOURCES AGGREGATES & BALANCES FOR HOME SCREEN
  // ----------------------------------------------------
  const activeSources = useMemo(() => {
    return moneySources.filter(s => !s.archived);
  }, [moneySources]);

  const sourceBalancesMap = useMemo(() => {
    const map: Record<string, number> = {};
    activeSources.forEach(s => {
      map[s.id] = getSourceMonthlyBalance(s, expenses, currentMonthStr);
    });
    return map;
  }, [activeSources, expenses, currentMonthStr]);

  const totalAvailableMoney = useMemo(() => {
    return Object.values(sourceBalancesMap).reduce((sum: number, val: number) => sum + val, 0);
  }, [sourceBalancesMap]);

  const topSourceByBalance = useMemo(() => {
    if (activeSources.length === 0) return { name: 'None', balance: 0 };
    let top = activeSources[0];
    let topBal = sourceBalancesMap[top.id] || 0;
    
    activeSources.forEach(s => {
      const bal = sourceBalancesMap[s.id] || 0;
      if (bal > topBal) {
        top = s;
        topBal = bal;
      }
    });
    return { name: top.name, balance: topBal };
  }, [activeSources, sourceBalancesMap]);

  // Current Month Expenses (Where Type is Expense)
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(currentMonthStr) && e.transactionType === 'Expense');
  }, [expenses]);

  // Current Month Income
  const currentMonthIncome = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(currentMonthStr) && e.transactionType === 'Income');
  }, [expenses]);

  // CURRENT MONTH SUMMARIES
  const totalIncomeMonth = useMemo(() => {
    return currentMonthIncome.reduce((sum, e) => sum + e.amount, 0);
  }, [currentMonthIncome]);

  const totalExpenseMonth = useMemo(() => {
    return currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [currentMonthExpenses]);

  const netSavingsMonth = totalIncomeMonth - totalExpenseMonth;
  const savingsPercentMonth = totalIncomeMonth > 0 ? Math.max(0, (netSavingsMonth / totalIncomeMonth) * 100) : 0;

  // OVERALL FINANCIAL POSITION CALCULATIONS (ALL TIME)
  const overallIncome = useMemo(() => {
    return expenses.filter(e => e.transactionType === 'Income').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const overallExpense = useMemo(() => {
    return expenses.filter(e => e.transactionType === 'Expense').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Loans Given tracking (Total lended out)
  const overallLoansGiven = useMemo(() => {
    return expenses.filter(e => e.transactionType === 'LoanGiven').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Loans Taken tracking (Total borrowed)
  const overallLoansTaken = useMemo(() => {
    return expenses.filter(e => e.transactionType === 'LoanTaken').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Outstanding returned money (Income linked to a LoanGiven parent)
  const loansReceivedBack = useMemo(() => {
    return expenses.filter(e => e.transactionType === 'Income' && e.parentLoanId).reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Repayments made (Expense linked to a LoanTaken parent)
  const loanRepaymentsMade = useMemo(() => {
    return expenses.filter(e => e.transactionType === 'Expense' && e.parentLoanId).reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Loan Receivable/Payable Outstanding Balances
  const totalLoanReceivable = Math.max(0, overallLoansGiven - loansReceivedBack);
  const totalLoanPayable = Math.max(0, overallLoansTaken - loanRepaymentsMade);

  // Balanced Formula exactly requested:
  // Current Balance = Total Income - Total Expenses - Total Loan Given + Total Loan Received Back - Total Loan Repayments Made + Total Loan Taken
  const currentBalance = useMemo(() => {
    return overallIncome - overallExpense - overallLoansGiven + loansReceivedBack - loanRepaymentsMade + overallLoansTaken;
  }, [overallIncome, overallExpense, overallLoansGiven, loansReceivedBack, loanRepaymentsMade, overallLoansTaken]);

  const transactionCount = expenses.filter(e => e.date.startsWith(currentMonthStr)).length;

  const currentMonthCategoriesCount = useMemo(() => {
    const uniqueCats = new Set(currentMonthExpenses.map(e => e.category));
    return uniqueCats.size;
  }, [currentMonthExpenses]);

  // Budget calculations
  const totalCategoryBudget = useMemo(() => {
    return budgets.reduce((sum, b) => sum + b.limitAmount, 0);
  }, [budgets]);

  const budgetRemaining = Math.max(0, totalCategoryBudget - totalExpenseMonth);

  // States for card modal breakdowns
  const [showCategoryBreakdownModal, setShowCategoryBreakdownModal] = useState<boolean>(false);
  const [selectedBreakdownCat, setSelectedBreakdownCat] = useState<string | null>(null);

  // Loans Module Modal state
  const [loansModalOpen, setLoansModalOpen] = useState<boolean>(false);
  const [selectedLoanIdForRepay, setSelectedLoanIdForRepay] = useState<string | null>(null);
  const [repayAmtInput, setRepayAmtInput] = useState<string>('');
  const [isAccountBalanceCollapsed, setIsAccountBalanceCollapsed] = useState<boolean>(false);
  const [isBudgetsCollapsed, setIsBudgetsCollapsed] = useState<boolean>(false);

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
      if (e.transactionType === 'Expense') {
        map[year] = (map[year] || 0) + e.amount;
      }
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  // Month grouped totals for selected year
  const monthGroupedTotals = useMemo(() => {
    if (!selectedYear) return [];
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      if (e.date.startsWith(selectedYear) && e.transactionType === 'Expense') {
        const monthNum = e.date.substring(5, 7);
        const monthNames: Record<string, string> = {
          '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
          '05': 'May', '06': 'June', '07': 'July', '08': 'Aug',
          '09': 'Sept', '10': 'Oct', '11': 'Nov', '12': 'Dec'
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
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'June': '06', 'July': '07', 'Aug': '08',
      'Sept': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    const targetMonthNum = monthNamesMap[selectedMonth];
    const targetPrefix = `${selectedYear}-${targetMonthNum}`;

    const map: Record<string, number> = {};
    expenses.forEach(e => {
      if (e.date.startsWith(targetPrefix) && e.transactionType === 'Expense') {
        map[e.category] = (map[e.category] || 0) + e.amount;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [selectedYear, selectedMonth, expenses]);

  // Subcategory grouped totals
  const subcatGroupedTotals = useMemo(() => {
    if (!selectedYear || !selectedMonth || !selectedCategory) return [];

    const monthNamesMap: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'June': '06', 'July': '07', 'Aug': '08',
      'Sept': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    const targetMonthNum = monthNamesMap[selectedMonth];
    const targetPrefix = `${selectedYear}-${targetMonthNum}`;

    const map: Record<string, number> = {};
    expenses.forEach(e => {
      if (e.date.startsWith(targetPrefix) && e.category.toLowerCase() === selectedCategory.toLowerCase() && e.transactionType === 'Expense') {
        map[e.subcategory] = (map[e.subcategory] || 0) + e.amount;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [selectedYear, selectedMonth, selectedCategory, expenses]);

  // Individual loans checklist mapping Helper
  const allLoansGiven = useMemo(() => {
    return expenses.filter(e => e.transactionType === 'LoanGiven');
  }, [expenses]);

  const allLoansTaken = useMemo(() => {
    return expenses.filter(e => e.transactionType === 'LoanTaken');
  }, [expenses]);

  // Get outstanding for single LoanGiven
  const getLoanGivenOutstanding = (loanId: string, loanAmt: number) => {
    const childRepays = expenses
      .filter(e => e.transactionType === 'Income' && e.parentLoanId === loanId)
      .reduce((sum, e) => sum + e.amount, 0);
    return Math.max(0, loanAmt - childRepays);
  };

  // Get outstanding for single LoanTaken
  const getLoanTakenOutstanding = (loanId: string, loanAmt: number) => {
    const childRepays = expenses
      .filter(e => e.transactionType === 'Expense' && e.parentLoanId === loanId)
      .reduce((sum, e) => sum + e.amount, 0);
    return Math.max(0, loanAmt - childRepays);
  };

  const handleRecordRepaymentSubmit = () => {
    if (!selectedLoanIdForRepay || !repayAmtInput || isNaN(parseFloat(repayAmtInput)) || parseFloat(repayAmtInput) <= 0) {
      alert("Please enter a valid repayment amount");
      return;
    }
    const repayVal = parseFloat(repayAmtInput);
    const targetLoan = expenses.find(e => e.id === selectedLoanIdForRepay);
    if (!targetLoan) return;

    if (onQuickRepay) {
      onQuickRepay(targetLoan, repayVal, `Repayment of ${targetLoan.personName}'s loan`);
      setSelectedLoanIdForRepay(null);
      setRepayAmtInput('');
      setLoansModalOpen(false);
    } else {
      // Inline direct write as fallback
      const isLended = targetLoan.transactionType === 'LoanGiven';
      const repayId = `repay_${Date.now()}`;
      const newRepayTx: VirtualExpense = {
        id: repayId,
        date: new Date().toISOString().substring(0, 10),
        amount: repayVal,
        category: isLended ? 'Refund' : 'Medical', // placeholder categories compatible
        subcategory: isLended ? 'Cashback' : 'Doctor Consultation',
        notes: `Quick Return repayment for ${targetLoan.personName}`,
        paymentMode: 'UPI',
        transactionType: isLended ? 'Income' : 'Expense',
        personName: targetLoan.personName,
        parentLoanId: targetLoan.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const allTxs = [newRepayTx, ...expenses];
      DbSim.saveExpenses(allTxs);
      window.location.reload(); // Quick refresh
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 px-4 py-4 space-y-4 scrollbar-none font-sans">
      
      {/* Header Greeting bar */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest font-mono">
            Welcome back, {settings.userName || 'User'}!
          </span>
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1 font-mono mt-0.5">
            <Calendar className="h-4 w-4 text-indigo-500" />
            Personal Finance Tracker
          </h2>
        </div>
        {onLockApp && (
          <button
            type="button"
            onClick={onLockApp}
            className="p-1 px-2.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-black uppercase text-slate-600 hover:text-red-500 dark:text-slate-300 dark:hover:text-red-400 flex items-center gap-1 rounded-lg border border-slate-250 dark:border-slate-700 shadow-xs cursor-pointer transition-all font-mono"
          >
            <LogOut className="h-2.5 w-2.5 text-red-500" /> Lock
          </button>
        )}
      </div>

      {/* OVERALL FINANCIAL STANDING (HOME PAGE SUMMARY) */}
      <div className="p-4 bg-slate-950 text-white rounded-2xl shadow-lg border border-slate-850 relative overflow-hidden flex flex-col justify-between">
        <div className="absolute -top-10 -right-10 p-5 opacity-5">
          <ShieldCheck className="h-40 w-40 text-indigo-500" />
        </div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest font-mono">Remaining Monthly Budget</span>
          <span className="text-[8px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-mono">Current Limit</span>
        </div>
        <div className="text-2xl font-black text-slate-100 tracking-tight flex items-baseline font-mono">
          {currencySymbol} {budgetRemaining.toLocaleString()}
        </div>
        <div className="text-[10px] text-slate-400 font-medium font-mono">
          Total Limit Set: {currencySymbol} {totalCategoryBudget.toLocaleString()}
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-850/60 text-xs">
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-slate-500 text-[8px] uppercase tracking-wider block font-bold font-mono">Monthly Income</span>
            <span className="text-emerald-400 font-bold font-mono text-[11px] block mt-0.5">{currencySymbol} {totalIncomeMonth.toLocaleString()}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-slate-500 text-[8px] uppercase tracking-wider block font-bold font-mono">Monthly Expense</span>
            <span className="text-rose-455 font-bold font-mono text-[11px] block mt-0.5">{currencySymbol} {totalExpenseMonth.toLocaleString()}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-slate-500 text-[8px] uppercase tracking-wider block font-bold font-mono">Monthly Savings</span>
            <span className={`font-bold font-mono text-[11px] block mt-0.5 ${netSavingsMonth >= 0 ? 'text-indigo-455' : 'text-rose-455'}`}>
              {currencySymbol} {netSavingsMonth.toLocaleString()}
            </span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-slate-500 text-[8px] uppercase tracking-wider block font-bold font-mono">TXs Registered</span>
            <span className="text-slate-100 font-bold font-mono text-[11px] block mt-0.5">{transactionCount} count</span>
          </div>
        </div>

        {/* Buttons to trigger loans tracker or add new */}
        <div className="flex gap-2 mt-4 pt-2 border-t border-slate-900/50">
          <button
            onClick={() => setLoansModalOpen(true)}
            className="flex-1 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1 transition-all"
          >
            <ArrowLeftRight className="h-3 w-3 text-emerald-400" /> Loan Book
          </button>
          <button
            onClick={() => setActiveTab && setActiveTab('add')}
            className="flex-1 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all"
          >
            <PlusCircle className="h-3 w-3" /> Quick Add TX
          </button>
        </div>
      </div>

      {/* ACCOUNT BALANCE DASHBOARD (Individual active source balances) */}
      <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-805 shadow-2xs space-y-3">
        <button
          type="button"
          onClick={() => setIsAccountBalanceCollapsed(!isAccountBalanceCollapsed)}
          className="w-full text-left text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-widest flex justify-between items-center font-mono cursor-pointer"
        >
          <span className="flex items-center gap-1">
            💼 Account Balance Dashboard
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 px-1.5 py-0.5 rounded font-black uppercase font-mono">Balances</span>
            {isAccountBalanceCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            )}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {!isAccountBalanceCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {activeSources.map(s => {
                  const bal = getSourceMonthlyBalance(s, expenses, currentMonthStr);
                  return (
                    <div 
                      key={s.id} 
                      onClick={() => setActiveTab && setActiveTab('accounts')}
                      className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-150/40 dark:border-slate-800 cursor-pointer hover:border-indigo-500/20 dark:hover:border-indigo-500/30 transition-all flex flex-col justify-between"
                    >
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold font-mono uppercase truncate block leading-none">{s.name}</span>
                      <span className={`text-[12px] font-bold font-mono block mt-1.5 ${bal >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-500'}`}>
                        {currencySymbol}{bal.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
                
                {activeSources.length === 0 && (
                  <p className="text-[10px] text-slate-450 italic text-center py-2 col-span-2">No active reserve sources initialized.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CURRENT MONTH SUMMARY CARDS (JUNE 2026) */}
      <div>
        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2 font-mono tracking-widest flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-indigo-500" /> June Monthly Cashflow Summary
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Monthly Income Card */}
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-100 dark:border-slate-805 flex flex-col justify-between h-20">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Income In</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div>
              <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {currencySymbol} {totalIncomeMonth.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Monthly Expense Card */}
          <button
            onClick={() => setShowCategoryBreakdownModal(true)}
            className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-105 dark:border-slate-805 flex flex-col justify-between h-20 text-left hover:ring-2 hover:ring-indigo-500 transition-all cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Expenses Out</span>
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <div>
              <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                {currencySymbol} {totalExpenseMonth.toLocaleString()}
              </div>
            </div>
          </button>

          {/* Net Savings Card */}
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-105 dark:border-slate-805 flex flex-col justify-between h-20">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Net Savings</span>
              <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div>
              <div className={`text-base font-black ${netSavingsMonth >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'} font-mono`}>
                {currencySymbol} {netSavingsMonth.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Savings Ratio Card */}
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-105 dark:border-slate-805 flex flex-col justify-between h-20">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Savings %</span>
              <span className="text-[10px] font-black text-indigo-500 font-mono">{savingsPercentMonth.toFixed(0)}%</span>
            </div>
            <div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, savingsPercentMonth)}%` }} />
              </div>
              <p className="text-[8px] text-slate-400 font-medium">Of month income saved</p>
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC SPENDING VS BUDGETS GUAGE */}
      <div className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-105 dark:border-slate-805 shadow-xs">
        <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-widest flex items-center justify-between font-mono">
          <span>⚠️ BUDGET SPENDING MONITOR</span>
          <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-black">REALTIME</span>
        </h3>

        {/* Overall Budget Progress */}
        {totalCategoryBudget > 0 && (() => {
          const overallPct = (totalExpenseMonth / totalCategoryBudget) * 100;
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
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200/50 dark:border-slate-800'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Overall Expense Budget</span>
                {overallStatus === 'exceeded' ? (
                  <span className="text-[8px] text-red-500 font-black uppercase font-mono bg-red-100 dark:bg-red-950 px-1 px-0.5 rounded animate-pulse">🚨 CAPPED OUT</span>
                ) : overallStatus === 'near' ? (
                  <span className="text-[8px] text-amber-600 font-black uppercase font-mono bg-amber-100 dark:bg-amber-955 px-1 px-0.5 rounded">⚠️ HIGH USE</span>
                ) : (
                  <span className="text-[8px] text-emerald-600 font-extrabold uppercase font-mono bg-emerald-100 dark:bg-emerald-955 px-1 px-0.5 rounded">🟢 SAFE</span>
                )}
              </div>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 mb-1.5 leading-relaxed">
                Utilized: <strong>{currencySymbol} {totalExpenseMonth.toLocaleString()}</strong> of {currencySymbol} {totalCategoryBudget.toLocaleString()} ({overallPct.toFixed(1)}%). Warn limit: {overallThreshold}%
              </p>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-850 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    overallStatus === 'exceeded' ? 'bg-red-500' : overallStatus === 'near' ? 'bg-amber-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, overallPct)}%` }}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* CATEGORY BUDGETS VS SPENDING TRACKER */}
      <div className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-105 dark:border-slate-805 shadow-xs">
        <button
          type="button"
          onClick={() => setIsBudgetsCollapsed(!isBudgetsCollapsed)}
          className="w-full text-left text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-widest flex justify-between items-center font-mono cursor-pointer"
        >
          <span className="flex items-center gap-1">📊 Category Budgets & Spending</span>
          <div className="flex items-center gap-2">
            <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-black">TRACKER</span>
            {isBudgetsCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            )}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {!isBudgetsCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-3 pt-1"
            >
              {budgets.map(b => {
                const categorySpent = currentMonthExpenses
                  .filter(e => e.category.toLowerCase() === b.categoryName.toLowerCase() && e.transactionType === 'Expense')
                  .reduce((sum, e) => sum + e.amount, 0);
                
                const pct = b.limitAmount > 0 ? (categorySpent / b.limitAmount) * 100 : 0;
                let barColor = "bg-emerald-500";
                let badgeText = "🟢 SAFE";
                let badgeStyle = "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/45";
                let amtColor = "text-emerald-600 dark:text-emerald-400 font-bold";

                if (pct >= 100) {
                  barColor = "bg-rose-500";
                  badgeText = "🚨 OVERUSE";
                  badgeStyle = "text-rose-600 bg-rose-100 dark:bg-rose-950/45";
                  amtColor = "text-rose-600 dark:text-rose-450 font-bold";
                } else if (pct >= 80) {
                  barColor = "bg-amber-500";
                  badgeText = "⚠️ WARNING";
                  badgeStyle = "text-amber-600 bg-amber-100 dark:bg-amber-950/45";
                  amtColor = "text-amber-600 dark:text-amber-400 font-bold";
                }

                return (
                  <div key={b.categoryName} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-805 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-[10.5px] font-black text-slate-700 dark:text-slate-100 uppercase tracking-tight leading-snug">{b.categoryName}</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                          Spent <span className={`${amtColor}`}>{currencySymbol}{categorySpent.toLocaleString()}</span> of {currencySymbol}{b.limitAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 font-mono">
                        <span className={`text-[8px] font-black uppercase px-1 rounded ${badgeStyle}`}>{badgeText}</span>
                        <span className="text-[9px] font-bold text-slate-450">{pct.toFixed(0)}% Utilized</span>
                      </div>
                    </div>

                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {budgets.length === 0 && (
                <p className="text-[10px] text-slate-400 italic text-center py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  No category budgets configured. Set limits in Settings to begin category tracking.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* DRILLDOWN MODULE */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-105 dark:border-slate-805 shadow-xs">
        <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-widest mb-3 font-mono">
          📂 HISTORICAL STATS ACCORDION
        </h3>

        {/* Level 1: Years */}
        <div className="space-y-1">
          {yearGroupedTotals.map(([year, amt]) => {
            const isYearOpen = selectedYear === year;
            return (
              <div key={year} className="border-b border-slate-100 dark:border-slate-700/50 pb-1.5 last:border-0 last:pb-0">
                <button
                  onClick={() => {
                    setSelectedYear(isYearOpen ? null : year);
                    setSelectedMonth(null);
                    setSelectedCategory(null);
                  }}
                  className="w-full flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/40 text-[11px] font-bold text-slate-700 dark:text-slate-250 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    {isYearOpen ? <ChevronDown className="h-3.5 w-3.5 text-indigo-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                    <span>{year} Financial Year</span>
                  </div>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{currencySymbol} {amt.toLocaleString()}</span>
                </button>

                {/* Level 2: Months */}
                <AnimatePresence>
                  {isYearOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-5 mt-1 space-y-1 overflow-hidden border-l border-slate-200 dark:border-slate-700 pl-3"
                    >
                      {monthGroupedTotals.map(([mName, mAmt]) => {
                        const isMonthOpen = selectedMonth === mName;
                        return (
                          <div key={mName}>
                            <button
                              onClick={() => {
                                setSelectedMonth(isMonthOpen ? null : mName);
                                setSelectedCategory(null);
                              }}
                              className="w-full flex items-center justify-between py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/20 px-2 rounded"
                            >
                              <span>{mName}</span>
                              <span className="font-mono">{currencySymbol} {mAmt.toLocaleString()}</span>
                            </button>

                            {/* Level 3: Categories */}
                            <AnimatePresence>
                              {isMonthOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="ml-3 mt-1 space-y-0.5 overflow-hidden pl-2 border-l border-dashed border-slate-200 dark:border-slate-700"
                                >
                                  {catGroupedTotals.map(([catName, catAmt]) => {
                                    const isCatOpen = selectedCategory === catName;
                                    return (
                                      <div key={catName}>
                                        <button
                                          onClick={() => setSelectedCategory(isCatOpen ? null : catName)}
                                          className="w-full flex items-center justify-between py-0.5 text-[10px] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/20 px-1 rounded"
                                        >
                                          <span>{catName}</span>
                                          <span className="font-mono">{currencySymbol} {catAmt.toLocaleString()}</span>
                                        </button>

                                        {/* Level 4: Subcategories */}
                                        <AnimatePresence>
                                          {isCatOpen && (
                                            <motion.div
                                              initial={{ opacity: 0, scale: 0.95 }}
                                              animate={{ opacity: 1, scale: 1 }}
                                              exit={{ opacity: 0, scale: 0.95 }}
                                              className="ml-3 mt-0.5 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-1 border border-slate-100 dark:border-slate-750"
                                            >
                                              {subcatGroupedTotals.map(([subName, subAmt]) => (
                                                <div key={subName} className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 p-0.5 last:border-0 font-mono">
                                                  <span>{subName}</span>
                                                  <span className="font-bold">{currencySymbol} {subAmt.toLocaleString()}</span>
                                                </div>
                                              ))}
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* MONTH CATEGORY BREAKDOWN MODAL */}
      <AnimatePresence>
        {showCategoryBreakdownModal && (
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-850 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-105 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5">
                  <PieIcon className="h-5 w-5 text-indigo-500 animate-pulse" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-105 text-sm tracking-tight">
                    June Expense Breakdown
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowCategoryBreakdownModal(false);
                    setSelectedBreakdownCat(null);
                  }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-705 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-104 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-3 scrollbar-none">
                {categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6 italic font-sans animate-fade">No expenses categorized for June yet.</p>
                ) : (
                  categoryBreakdown.map(([cat, info]) => {
                    const isSelected = selectedBreakdownCat === cat;
                    const percent = ((info.total / totalExpenseMonth) * 100).toFixed(0);
                    return (
                      <div key={cat} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-105 dark:border-slate-800">
                        <button
                          onClick={() => setSelectedBreakdownCat(isSelected ? null : cat)}
                          className="w-full flex items-center justify-between text-left font-bold text-slate-700 dark:text-slate-200 text-xs"
                        >
                          <div>
                            <span className="text-indigo-600 dark:text-indigo-400 mr-1.5 font-mono">[{percent}%]</span>
                            <span>{cat}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-black text-slate-800 dark:text-slate-100">{currencySymbol} {info.total.toLocaleString()}</span>
                            {isSelected ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                          </div>
                        </button>

                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-3 pl-3 border-l-2 border-indigo-500 space-y-2 overflow-hidden"
                            >
                              <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider font-mono">Subcategories spending</p>
                              {Object.entries(info.subs).map(([sub, subAmt]) => (
                                <div key={sub} className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                                  <span>{sub}</span>
                                  <span className="font-mono text-slate-800 dark:text-slate-200">{currencySymbol} {subAmt.toLocaleString()}</span>
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LOANS MANAGEMENT BOOK MODAL */}
      <AnimatePresence>
        {loansModalOpen && (
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-850 rounded-2xl p-5 shadow-2xl border border-slate-205 dark:border-slate-700 w-full max-w-sm flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-105 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5">
                  <ArrowLeftRight className="h-5 w-5 text-indigo-500 animate-pulse" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-105 text-sm tracking-tight">
                    Personal Loan Book Ledger
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setLoansModalOpen(false);
                    setSelectedLoanIdForRepay(null);
                  }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-104 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Loans Contents lists */}
              <div className="flex-1 overflow-y-auto py-3 space-y-4 scrollbar-none text-xs">
                
                {/* Section A: Loans Given */}
                <div>
                  <h4 className="text-[10px] font-black uppercase text-indigo-500 font-mono tracking-wider mb-2">🤝 Loans Given (Receivables)</h4>
                  {allLoansGiven.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic py-2 pl-1 border-l-2 border-slate-100">No loans given recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {allLoansGiven.map(g => {
                        const outstanding = getLoanGivenOutstanding(g.id, g.amount);
                        return (
                          <div key={g.id} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-105 dark:border-slate-800 rounded-xl space-y-1">
                            <div className="flex justify-between font-bold text-slate-700 dark:text-slate-200">
                              <span>{g.personName}</span>
                              <span className="font-mono text-indigo-500">{currencySymbol} {g.amount.toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal">{g.notes} &middot; <span className="font-mono">{g.date}</span></p>
                            
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[10px] mt-1">
                              <span className="text-slate-400">Outstanding: <strong className="text-emerald-500 font-mono">{currencySymbol} {outstanding.toLocaleString()}</strong></span>
                              {outstanding > 0 && (
                                <button
                                  onClick={() => setSelectedLoanIdForRepay(g.id)}
                                  className="px-2 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded font-bold text-[9px] cursor-pointer"
                                >
                                  Take Refund
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section B: Loans Taken */}
                <div>
                  <h4 className="text-[10px] font-black uppercase text-amber-500 font-mono tracking-wider mb-2">💸 Loans Taken (Payables)</h4>
                  {allLoansTaken.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic py-2 pl-1 border-l-2 border-slate-100">No debts taken recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {allLoansTaken.map(t => {
                        const outstandingValue = getLoanTakenOutstanding(t.id, t.amount);
                        return (
                          <div key={t.id} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-105 dark:border-slate-800 rounded-xl space-y-1">
                            <div className="flex justify-between font-bold text-slate-700 dark:text-slate-200">
                              <span>{t.personName}</span>
                              <span className="font-mono text-amber-500">{currencySymbol} {t.amount.toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal">{t.notes} &middot; <span className="font-mono">{t.date}</span></p>
                            
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[10px] mt-1">
                              <span className="text-slate-400">Debt Remaining: <strong className="text-rose-500 font-mono">{currencySymbol} {outstandingValue.toLocaleString()}</strong></span>
                              {outstandingValue > 0 && (
                                <button
                                  onClick={() => setSelectedLoanIdForRepay(t.id)}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[9px] cursor-pointer"
                                >
                                  Repay Part
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Record repayment sub-view block */}
                {selectedLoanIdForRepay && (() => {
                  const loanItem = expenses.find(e => e.id === selectedLoanIdForRepay);
                  if (!loanItem) return null;
                  const isGiven = loanItem.transactionType === 'LoanGiven';
                  const maxRepay = isGiven 
                    ? getLoanGivenOutstanding(loanItem.id, loanItem.amount)
                    : getLoanTakenOutstanding(loanItem.id, loanItem.amount);

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 bg-slate-100 dark:bg-slate-800 border border-indigo-500/30 rounded-xl space-y-3 mt-4"
                    >
                      <h4 className="font-bold text-slate-800 dark:text-slate-105 flex items-center justify-between text-[11px] uppercase">
                        <span>Record Repayment for {loanItem.personName}</span>
                        <button onClick={() => setSelectedLoanIdForRepay(null)} className="text-slate-400 hover:text-red-500"><X className="h-3 w-3" /></button>
                      </h4>
                      <p className="text-[9px] text-slate-400 italic">Remaining outstanding balance limit is {currencySymbol} {maxRepay.toLocaleString()}.</p>
                      
                      <div className="space-y-2">
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 font-bold text-slate-400 font-mono">{currencySymbol}</span>
                          <input
                            type="number"
                            placeholder="Amount returned"
                            value={repayAmtInput}
                            onChange={(e) => setRepayAmtInput(e.target.value)}
                            max={maxRepay}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 pl-7 pr-3 py-2 text-xs rounded-xl outline-none font-mono"
                          />
                        </div>
                        <button
                          onClick={handleRecordRepaymentSubmit}
                          className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold font-mono tracking-widest uppercase transition-all shadow-md"
                        >
                          Confirm Receipt
                        </button>
                      </div>
                    </motion.div>
                  );
                })()}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
