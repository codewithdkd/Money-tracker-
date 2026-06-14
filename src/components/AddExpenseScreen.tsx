/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalIcon, 
  IndianRupee, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  Save, 
  RotateCcw,
  CheckCircle,
  Bell,
  AlertTriangle,
  FolderPlus,
  Compass,
  CreditCard,
  LogOut,
  Notebook,
  ChevronDown,
  ArrowRightLeft,
  DollarSign,
  User,
  Clock,
  Briefcase,
  Layers,
  X
} from 'lucide-react';
import { VirtualExpense, VirtualCategory, VirtualBudget, AppSettings, TransactionType, MoneySource } from '../types';
import { DbSim } from '../dbSim';

interface AddExpenseScreenProps {
  expenses: VirtualExpense[];
  categories: VirtualCategory[];
  budgets: VirtualBudget[];
  moneySources: MoneySource[];
  onAddExpense: (exp: VirtualExpense) => void;
  onUpdateExpense: (exp: VirtualExpense) => void;
  onDeleteExpense: (id: string) => void;
  onAddCategory: (cat: VirtualCategory) => void;
  onTriggerNotification: (title: string, message: string) => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  onUpdateBudgets: (b: VirtualBudget[]) => void;
  onUpdateCategories: (c: VirtualCategory[]) => void;
  onLockApp?: () => void;
}

export default function AddExpenseScreen({
  expenses,
  categories,
  budgets,
  moneySources,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddCategory,
  onTriggerNotification,
  settings,
  onUpdateSettings,
  onUpdateBudgets,
  onUpdateCategories,
  onLockApp
}: AddExpenseScreenProps) {
  const currencySymbol = settings.currency || '₹';

  const getSourceAccountNameFromId = (id?: string) => {
    if (!id) return '';
    const sourceObj = moneySources.find(s => s.id === id);
    return sourceObj ? sourceObj.name : '';
  };

  // State: Selected Transaction Type
  const [transactionType, setTransactionType] = useState<'Expense' | 'Income' | 'LoanGiven' | 'LoanTaken' | 'Transfer'>('Expense');

  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [amount, setAmount] = useState<string>('');
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [selectedSubcat, setSelectedSubcat] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Credit Card' | 'Debit Card' | 'Bank Transfer'>('Cash');
  const [sourceAccountId, setSourceAccountId] = useState<string>('source_cash');
  const [fromSourceAccountId, setFromSourceAccountId] = useState<string>('source_bank');
  const [toSourceAccountId, setToSourceAccountId] = useState<string>('source_cash');
  
  // Recurring Sub-options section state
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringFreq, setRecurringFreq] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Monthly');

  // Subcategory management state
  const [isAddingSub, setIsAddingSub] = useState<boolean>(false);
  const [newSubcatInputVal, setNewSubcatInputVal] = useState<string>('');

  // Category creator drawer states
  const [showCatCreator, setShowCatCreator] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newSubcatName, setNewSubcatName] = useState<string>('');
  const [newCatBudget, setNewCatBudget] = useState<string>('5000');
  const [newCatThreshold, setNewCatThreshold] = useState<number>(80);
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');

  // Toast confirm indicators
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);
  const [selectedDetailExpense, setSelectedDetailExpense] = useState<VirtualExpense | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Search & Filter state variables
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterPaymentMode, setFilterPaymentMode] = useState<string>('All');
  const [filterPerson, setFilterPerson] = useState<string>('');
  const [filterMinAmount, setFilterMinAmount] = useState<string>('');
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Dynamic category options filtered by transaction type
  const activeCategoriesOptions = useMemo(() => {
    if (transactionType === 'Expense' || transactionType === 'LoanGiven') {
      return categories.filter(c => !c.type || c.type === 'expense');
    } else if (transactionType === 'Income' || transactionType === 'LoanTaken') {
      return categories.filter(c => c.type === 'income');
    } else {
      // Transfer or others
      return categories;
    }
  }, [categories, transactionType]);

  // Subcategory options based on selectedCategory
  const subcategoryOptions = useMemo(() => {
    if (!selectedCat) return [];
    const catObj = categories.find(c => c.name.toLowerCase() === selectedCat.toLowerCase());
    return catObj ? catObj.subcategories : [];
  }, [selectedCat, categories]);

  // Auto assign first logical category on type shift to prevent blank screen selections
  useEffect(() => {
    if (!editingId) {
      if (activeCategoriesOptions.length > 0) {
        setSelectedCat(activeCategoriesOptions[0].name);
        if (activeCategoriesOptions[0].subcategories.length > 0) {
          setSelectedSubcat(activeCategoriesOptions[0].subcategories[0]);
        } else {
          setSelectedSubcat('');
        }
      } else {
        setSelectedCat('');
        setSelectedSubcat('');
      }
    }
  }, [transactionType, activeCategoriesOptions, editingId]);

  // Adjust subcategories if category changes
  const handleCategorySelect = (catName: string) => {
    setSelectedCat(catName);
    const catObj = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    if (catObj && catObj.subcategories.length > 0) {
      setSelectedSubcat(catObj.subcategories[0]);
    } else {
      setSelectedSubcat('');
    }
  };

  // Form reset procedure helper
  const resetForm = () => {
    setEditingId(null);
    setDate(new Date().toISOString().substring(0, 10));
    setAmount('');
    setNotes('');
    setPersonName('');
    setPaymentMode('Cash');
    setSourceAccountId('source_cash');
    setFromSourceAccountId('source_bank');
    setToSourceAccountId('source_cash');
    setIsRecurring(false);
    setRecurringFreq('Monthly');
    setIsAddingSub(false);
    setNewSubcatInputVal('');
  };

  // Budget validation alerts
  const executeBudgetVerification = (catName: string, expenseAmount: number) => {
    if (transactionType !== 'Expense') return; // only Expense triggers budget caps
    const alerts = DbSim.checkBudgetAlerts(catName, expenseAmount);
    if (alerts && alerts.length > 0) {
      alerts.forEach(alertResult => {
        if (alertResult.triggerAlert) {
          onTriggerNotification(alertResult.title, alertResult.message);
        }
      });
    }
  };

  // Submission handler
  const handleSave = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      alert('Please fill out a valid amount');
      return;
    }

    // Checking required person name for Loan/Transfer types
    const needsPersonName = transactionType === 'LoanGiven' || transactionType === 'LoanTaken' || transactionType === 'Transfer';
    if (needsPersonName && !personName.trim()) {
      alert(`Please input a Name/Institution for this ${transactionType} transaction.`);
      return;
    }

    const valAmount = parseFloat(amount);
    
    // Set default placeholder category for transfers
    let finalCategory = selectedCat;
    let finalSubcategory = selectedSubcat;
    if (transactionType === 'Transfer') {
      finalCategory = 'Transfer';
      finalSubcategory = 'Transfers';
    }

    const payload: VirtualExpense = {
      id: editingId || `exp_${Date.now()}`,
      date,
      amount: valAmount,
      category: finalCategory,
      subcategory: finalSubcategory,
      notes: notes.trim() || `${transactionType} record`,
      paymentMode,
      transactionType,
      sourceAccountId: transactionType !== 'Transfer' ? sourceAccountId : undefined,
      fromSourceAccountId: transactionType === 'Transfer' ? fromSourceAccountId : undefined,
      toSourceAccountId: transactionType === 'Transfer' ? toSourceAccountId : undefined,
      personName: needsPersonName ? personName.trim() : undefined,
      updatedAt: new Date().toISOString(),
      createdAt: editingId ? undefined : new Date().toISOString(),
      ...(isRecurring ? {
        recurring: {
          frequency: recurringFreq,
          active: true,
          lastGenerated: date
        }
      } : {})
    };

    if (editingId) {
      onUpdateExpense(payload);
      executeBudgetVerification(finalCategory, 0);
      setEditingId(null);
      setShowSuccessToast('✓ Transaction successfully modernized!');
      onTriggerNotification(
        'Transaction Updated',
        `Successfully saved edits for ₹${valAmount.toLocaleString()} (${transactionType})`
      );
    } else {
      onAddExpense(payload);
      executeBudgetVerification(finalCategory, valAmount);
      setShowSuccessToast('✓ Transaction securely stored to database memory!');
      onTriggerNotification(
        'Transaction Saved',
        `Recorded ₹${valAmount.toLocaleString()} classified as ${transactionType}`
      );
    }

    resetForm();
    setTimeout(() => setShowSuccessToast(null), 3000);
  };

  // Delete transaction action handler
  const handleDeleteItem = (id: string) => {
    setConfirmDeleteId(id);
  };

  // Edit action initializer
  const handleStartEdit = (exp: VirtualExpense) => {
    setEditingId(exp.id);
    setDate(exp.date);
    setAmount(exp.amount.toString());
    setTransactionType(exp.transactionType || 'Expense');
    setNotes(exp.notes);
    setPaymentMode(exp.paymentMode || 'Cash');
    setSourceAccountId(exp.sourceAccountId || 'source_cash');
    setFromSourceAccountId(exp.fromSourceAccountId || 'source_bank');
    setToSourceAccountId(exp.toSourceAccountId || 'source_cash');
    setPersonName(exp.personName || '');
    if (exp.recurring) {
      setIsRecurring(true);
      setRecurringFreq(exp.recurring.frequency);
    } else {
      setIsRecurring(false);
    }

    // Safe delay for category options rendering
    setTimeout(() => {
      setSelectedCat(exp.category);
      setSelectedSubcat(exp.subcategory);
    }, 80);
  };

  // Add custom Subcategory dynamically
  const handleAddCustomSubcategory = () => {
    const trimmed = newSubcatInputVal.trim();
    if (!trimmed || !selectedCat) return;

    const updated = categories.map(c => {
      if (c.name.toLowerCase() === selectedCat.toLowerCase()) {
        if (!c.subcategories.includes(trimmed)) {
          return {
            ...c,
            subcategories: [...c.subcategories, trimmed]
          };
        }
      }
      return c;
    });

    onUpdateCategories(updated);
    setSelectedSubcat(trimmed);
    setIsAddingSub(false);
    setNewSubcatInputVal('');
  };

  // Add custom Category drawer submit
  const handleCreateCategorySubmit = () => {
    const trimmedName = newCatName.trim();
    if (!trimmedName) {
      alert('Fill out category name');
      return;
    }

    const subcats = newSubcatName.split(',').map(s => s.trim()).filter(Boolean);
    if (subcats.length === 0) subcats.push('General');

    const newCatObj: VirtualCategory = {
      id: `cat_user_${Date.now()}`,
      name: trimmedName,
      subcategories: subcats,
      type: newCatType
    };

    onAddCategory(newCatObj);

    if (newCatType === 'expense' && newCatBudget) {
      const bAmt = parseFloat(newCatBudget);
      if (bAmt > 0) {
        const newBudget: VirtualBudget = { categoryName: trimmedName, limitAmount: bAmt };
        const updatedBudgets = [...budgets, newBudget];
        onUpdateBudgets(updatedBudgets);

        // Append custom category safety threshold percentage configuration
        if (newCatThreshold !== 80) {
          const currentSettings = { ...settings };
          currentSettings.categoryThresholds = currentSettings.categoryThresholds || {};
          currentSettings.categoryThresholds[trimmedName] = newCatThreshold;
          onUpdateSettings(currentSettings);
          DbSim.saveSettings(currentSettings);
        }
      }
    }

    setSelectedCat(trimmedName);
    setSelectedSubcat(subcats[0]);
    setShowCatCreator(false);
    setNewCatName('');
    setNewSubcatName('');
    setNewCatBudget('5000');
    setNewCatThreshold(80);
  };

  // Advanced Filters and search compilation
  const filteredLedger = useMemo(() => {
    return expenses.filter(e => {
      // 1. Text Search matching Category, Subcategory, Notes, PersonName, Amount, Type
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const amtStr = String(e.amount);
        const matchCat = e.category.toLowerCase().includes(query);
        const matchSub = e.subcategory.toLowerCase().includes(query);
        const matchNotes = e.notes.toLowerCase().includes(query);
        const matchPerson = e.personName ? e.personName.toLowerCase().includes(query) : false;
        const matchType = (e.transactionType || 'Expense').toLowerCase().includes(query);
        const matchAmt = amtStr.includes(query);

        if (!matchCat && !matchSub && !matchNotes && !matchPerson && !matchType && !matchAmt) {
          return false;
        }
      }

      // 2. Transaction Type Filter
      if (filterType !== 'All') {
        const activeType = e.transactionType || 'Expense';
        if (activeType !== filterType) return false;
      }

      // 3. Date Month & Year Filter
      const entryYear = e.date.substring(0, 4);
      const entryMonth = e.date.substring(5, 7);
      if (filterYear !== 'All' && entryYear !== filterYear) return false;
      if (filterMonth !== 'All' && entryMonth !== filterMonth) return false;

      // 4. Category Filter
      if (filterCategory !== 'All' && e.category.toLowerCase() !== filterCategory.toLowerCase()) return false;

      // 5. Payment Mode Filter
      if (filterPaymentMode !== 'All' && e.paymentMode !== filterPaymentMode) return false;

      // 6. Person Filter
      if (filterPerson.trim() !== '') {
        const pQuery = filterPerson.toLowerCase();
        if (!e.personName || !e.personName.toLowerCase().includes(pQuery)) return false;
      }

      // 7. Amount Range Filters
      if (filterMinAmount !== '') {
        const minVal = parseFloat(filterMinAmount);
        if (e.amount < minVal) return false;
      }
      if (filterMaxAmount !== '') {
        const maxVal = parseFloat(filterMaxAmount);
        if (e.amount > maxVal) return false;
      }

      // 8. Custom Date Start and End Filter
      if (filterStartDate !== '' && e.date < filterStartDate) return false;
      if (filterEndDate !== '' && e.date > filterEndDate) return false;

      return true;
    });
  }, [
    expenses,
    searchQuery,
    filterType,
    filterMonth,
    filterYear,
    filterCategory,
    filterPaymentMode,
    filterPerson,
    filterMinAmount,
    filterMaxAmount,
    filterStartDate,
    filterEndDate
  ]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-none">
      
      {/* Toast Alert Popup */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 bg-emerald-600 text-white font-extrabold text-[10px] uppercase font-mono px-4 py-2 rounded-full z-100 shadow-xl border border-emerald-500 flex items-center gap-1.5"
          >
            <CheckCircle className="h-3 w-3" /> {showSuccessToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL / BOTTOM SHEET: Custom Category Creator */}
      <AnimatePresence>
        {showCatCreator && (
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xs space-y-3.5 text-xs shadow-2xl font-sans"
            >
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono flex justify-between items-center">
                <span>Configure Category</span>
                <button onClick={() => setShowCatCreator(false)} className="text-slate-400 hover:text-red-500 cursor-pointer"><X className="h-4 w-4" /></button>
              </h3>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase font-mono">Category Allocation Type</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewCatType('expense')}
                    className={`py-1.5 rounded-xl border text-[10px] font-black uppercase font-mono transition-all cursor-pointer ${
                      newCatType === 'expense' 
                      ? 'bg-rose-500 text-white border-rose-500' 
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    Expense Cat
                  </button>
                  <button
                    onClick={() => setNewCatType('income')}
                    className={`py-1.5 rounded-xl border text-[10px] font-black uppercase font-mono transition-all cursor-pointer ${
                      newCatType === 'income' 
                      ? 'bg-emerald-600 text-white border-emerald-650' 
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    Income Cat
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase font-mono">Category Name</span>
                <input 
                  type="text" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Subscriptions"
                  className="w-full bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 outline-none font-bold"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase font-mono">Initial Subcategories (Comma list)</span>
                <input 
                  type="text" 
                  value={newSubcatName}
                  onChange={(e) => setNewSubcatName(e.target.value)}
                  placeholder="e.g. Netflix, Spotify, AWS"
                  className="w-full bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-[11px]"
                />
              </div>

              {newCatType === 'expense' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase font-mono">Monthly Cap</span>
                    <input 
                      type="number" 
                      value={newCatBudget}
                      onChange={(e) => setNewCatBudget(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-105 dark:border-slate-800 outline-none font-mono font-bold text-[#4f46e5]"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase font-mono">Warning Threshold %</span>
                    <select
                      value={newCatThreshold}
                      onChange={(e) => setNewCatThreshold(parseInt(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-105 dark:border-slate-800 outline-none text-xs font-bold font-mono text-slate-700 dark:text-slate-200"
                    >
                      <option value={50}>50%</option>
                      <option value={70}>70%</option>
                      <option value={80}>80%</option>
                      <option value={90}>90%</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                onClick={handleCreateCategorySubmit}
                className="w-full py-2 bg-[#4f46e5] hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest font-mono rounded-xl cursor-pointer transition-colors"
              >
                Provision Category
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CORE FORM CARD PANEL */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-105 dark:border-slate-805 shadow-xs space-y-3">
        <h3 className="text-[10px] font-black uppercase text-indigo-500 font-mono tracking-widest flex justify-between items-center">
          <span>{editingId ? '📝 MODIFY RECORD TRANSACTION' : '⚡ RECORD NEW CASHFLOW'}</span>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-[9px] bg-red-100 hover:bg-red-200 text-red-650 dark:bg-red-955 dark:text-red-300 font-black px-2 py-0.5 rounded font-mono uppercase"
            >
              Abort Edit
            </button>
          )}
        </h3>

        {/* Universal Segment Switcher */}
        <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          {(['Expense', 'Income', 'LoanGiven', 'LoanTaken', 'Transfer'] as const).map(type => (
            <button
              key={type}
              onClick={() => {
                setTransactionType(type);
                // Also reset fields logical to avoid crosstalk
                setPersonName('');
              }}
              className={`p-1.5 rounded-lg text-[9px] font-black uppercase font-mono tracking-tighter text-center transition-all cursor-pointer ${
                transactionType === type
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-200'
              }`}
            >
              {type === 'LoanGiven' ? 'Lend' : type === 'LoanTaken' ? 'Borrow' : type}
            </button>
          ))}
        </div>

        {/* Input Parameters */}
        <div className="grid grid-cols-2 gap-3 text-xs font-sans">
          
          {/* Main Amount */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Financial Value</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold font-mono text-slate-450">{currencySymbol}</span>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-900 pl-7 pr-3 py-2 border border-slate-205 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 font-black font-mono focus:ring-2 focus:ring-indigo-500 transition-all text-xs"
              />
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Date</label>
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 py-2 px-3 border border-slate-205 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-100 text-xs text-center"
            />
          </div>

          {/* Conditional Input: Person Name / Destination */}
          {(transactionType === 'LoanGiven' || transactionType === 'LoanTaken' || transactionType === 'Transfer') && (
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                {transactionType === 'Transfer' ? 'Transfer Path / Account Name' : 'Associated Person Name (Mandatory)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5"><User className="h-3.5 w-3.5 text-slate-400" /></span>
                <input 
                  type="text"
                  placeholder={transactionType === 'Transfer' ? 'e.g. ICICI Bank to HDFC Credit Card' : 'e.g. Sumit Verma'}
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 pl-8 pr-3 py-2 border border-slate-205 dark:border-slate-700 rounded-xl outline-none font-semibold text-slate-850 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {/* Category Picker (unless Transfer) */}
          {transactionType !== 'Transfer' && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-sans">Category</label>
                  <button 
                    onClick={() => {
                      setNewCatType(transactionType === 'Income' || transactionType === 'LoanTaken' ? 'income' : 'expense');
                      setShowCatCreator(true);
                    }}
                    className="text-[9px] text-indigo-500 hover:underline flex items-center font-bold"
                  >
                    + Setup
                  </button>
                </div>
                <select
                  value={selectedCat}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 p-2.5 border border-slate-205 dark:border-slate-700 rounded-xl outline-none font-bold text-xs"
                >
                  {activeCategoriesOptions.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  {activeCategoriesOptions.length === 0 && (
                    <option value="">No categories</option>
                  )}
                </select>
              </div>

              {/* Dependent Subcategory Selector */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sub-Category</label>
                  {selectedCat && !isAddingSub && (
                    <button
                      onClick={() => setIsAddingSub(true)}
                      className="text-[9px] text-indigo-500 hover:underline font-bold"
                    >
                      + Add
                    </button>
                  )}
                </div>
                {isAddingSub ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="Label"
                      value={newSubcatInputVal}
                      onChange={(e) => setNewSubcatInputVal(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 p-2 border border-slate-205 dark:border-slate-700 rounded-lg text-[10px] font-bold"
                    />
                    <button
                      onClick={handleAddCustomSubcategory}
                      className="px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px]"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setIsAddingSub(false)}
                      className="px-1.5 bg-slate-300 dark:bg-slate-700 text-slate-600 rounded-lg text-[10px]"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedSubcat}
                    onChange={(e) => setSelectedSubcat(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 p-2.5 border border-slate-205 dark:border-slate-700 rounded-xl outline-none font-bold text-xs"
                  >
                    {subcategoryOptions.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    {subcategoryOptions.length === 0 && (
                      <option value="">General</option>
                    )}
                  </select>
                )}
              </div>
            </>
          )}

          {/* Money Source selection / Transfer Accounts configuration */}
          {transactionType !== 'Transfer' ? (
            <>
              <div className="space-y-1 col-span-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Select Money Source</label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 p-2.5 border border-slate-205 dark:border-slate-700 rounded-xl outline-none font-bold text-xs"
                >
                  {moneySources.filter(s => !s.archived).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 col-span-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 p-2.5 border border-slate-205 dark:border-slate-700 rounded-xl outline-none font-bold text-xs"
                >
                  <option value="Cash">Cash Wallet</option>
                  <option value="UPI">UPI Digital Payment</option>
                  <option value="Credit Card">Credit Card Line</option>
                  <option value="Debit Card">Debit Checking Card</option>
                  <option value="Bank Transfer">Bank Transfer / IMPS</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1 col-span-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">From Source Account</label>
                <select
                  value={fromSourceAccountId}
                  onChange={(e) => setFromSourceAccountId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 p-2.5 border border-slate-205 dark:border-slate-700 rounded-xl outline-none font-bold text-xs"
                >
                  {moneySources.filter(s => !s.archived).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 col-span-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">To Source Account</label>
                <select
                  value={toSourceAccountId}
                  onChange={(e) => setToSourceAccountId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 p-2.5 border border-slate-205 dark:border-slate-700 rounded-xl outline-none font-bold text-xs"
                >
                  {moneySources.filter(s => !s.archived).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Notes description */}
          <div className="space-y-1 col-span-2">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Description Memo</label>
            <input 
              type="text" 
              placeholder="e.g. McDonald's big mac lunch"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 p-2.5 border border-slate-205 dark:border-slate-700 rounded-xl outline-none font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Recurring Option Toggler */}
          <div className="col-span-2 bg-slate-100/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-500" />
              <div>
                <span className="text-[10px] font-black text-slate-750 dark:text-slate-200 block leading-tight font-mono uppercase">Recurring entries planner</span>
                <span className="text-[8px] text-slate-400 block leading-none">Auto-generate future transactions</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isRecurring && (
                <select
                  value={recurringFreq}
                  onChange={(e) => setRecurringFreq(e.target.value as any)}
                  className="bg-white dark:bg-slate-850 py-1 px-1.5 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-bold font-mono outline-none"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              )}
              <input 
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 text-indigo-650 cursor-pointer"
              />
            </div>
          </div>

        </div>

        {/* Buttons */}
        <div className="flex gap-2.5 pt-1.5 font-mono">
          <button
            onClick={resetForm}
            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300/40 font-bold rounded-xl cursor-pointer transition-all uppercase text-[9px] tracking-wider"
          >
            Clear Fields
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold rounded-xl cursor-pointer transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 uppercase text-[9px] tracking-widest border border-indigo-500/25"
          >
            <Save className="h-3 w-3" /> Save To DB
          </button>
        </div>
      </div>

      {/* FILTER & LEDGER VAULT PANEL */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-105 dark:border-slate-850 shadow-xs space-y-3 font-sans">
        
        {/* Title row */}
        <div className="flex justify-between items-center border-b border-slate-105 dark:border-slate-750/70 pb-2">
          <h3 className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-widest flex items-center gap-1">
            <Notebook className="h-3 w-3 text-emerald-500" /> System Ledger Database
          </h3>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`px-2 py-1 font-bold rounded flex items-center gap-1.5 text-[9px] cursor-pointer font-mono border transition-all ${
              isFilterOpen 
              ? 'bg-amber-100 text-amber-700 border-amber-300' 
              : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-750'
            }`}
          >
            <Filter className="h-3 w-3" /> {isFilterOpen ? 'Lock Filters' : 'Toggle Filters'}
          </button>
        </div>

        {/* Instant Search Bar */}
        <div className="relative">
          <span className="absolute left-3 top-2.5"><Search className="h-3. w-3 text-slate-400" /></span>
          <input 
            type="text" 
            placeholder="Search categories, subcats, notes, amounts, tag types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-700 pl-8 pr-3 py-2 text-xs rounded-xl outline-none placeholder:text-slate-400 font-medium"
          />
        </div>

        {/* Filters Drawer Sheet */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 overflow-hidden text-xs font-sans"
            >
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                
                {/* Transaction Type */}
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 font-bold font-mono">TX Type</span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full bg-white dark:bg-slate-850 p-1.5 border border-slate-201 dark:border-slate-750 rounded text-[10px]"
                  >
                    <option value="All">All Types</option>
                    <option value="Expense">Expense Only</option>
                    <option value="Income">Income Only</option>
                    <option value="LoanGiven">Lending Only</option>
                    <option value="LoanTaken">Borrowing Only</option>
                    <option value="Transfer">Transfers Only</option>
                  </select>
                </div>

                {/* Categories */}
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 font-bold font-mono">Cat Filter</span>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-white dark:bg-slate-850 p-1.5 border border-slate-201 dark:border-slate-750 rounded text-[10px]"
                  >
                    <option value="All">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                {/* Period Month */}
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 font-bold font-mono">Month</span>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="w-full bg-white dark:bg-slate-850 p-1.5 border border-slate-201 dark:border-slate-750 rounded text-[10px] font-mono"
                  >
                    <option value="All">All Months</option>
                    <option value="01">Jan</option>
                    <option value="02">Feb</option>
                    <option value="03">Mar</option>
                    <option value="04">Apr</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">Aug</option>
                    <option value="09">Sep</option>
                    <option value="10">Oct</option>
                    <option value="11">Nov</option>
                    <option value="12">Dec</option>
                  </select>
                </div>

                {/* Period Year */}
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 font-bold font-mono">Year</span>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="w-full bg-white dark:bg-slate-850 p-1.5 border border-slate-201 dark:border-slate-750 rounded text-[10px] font-mono"
                  >
                    <option value="All">All Time</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>

                {/* payment mode */}
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 font-bold font-mono">Payment Mode</span>
                  <select
                    value={filterPaymentMode}
                    onChange={(e) => setFilterPaymentMode(e.target.value)}
                    className="w-full bg-white dark:bg-slate-850 p-1.5 border border-slate-201 dark:border-slate-750 rounded text-[10px]"
                  >
                    <option value="All">All Modes</option>
                    <option value="Cash">Cash Wallet</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                {/* Person Partner filtering */}
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 font-bold font-mono">Contact / Partner</span>
                  <input
                    type="text"
                    placeholder="Partner name"
                    value={filterPerson}
                    onChange={(e) => setFilterPerson(e.target.value)}
                    className="w-full bg-white dark:bg-slate-850 p-1.5 border border-slate-201 dark:border-slate-750 rounded text-[10px]"
                  />
                </div>

                {/* Amount ranges */}
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 font-bold font-mono">Min Value</span>
                  <input
                    type="number"
                    placeholder="Min amount"
                    value={filterMinAmount}
                    onChange={(e) => setFilterMinAmount(e.target.value)}
                    className="w-full bg-white dark:bg-slate-850 p-1.5 border border-slate-201 dark:border-slate-750 rounded text-[10px]"
                  />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 font-bold font-mono">Max Value</span>
                  <input
                    type="number"
                    placeholder="Max amount"
                    value={filterMaxAmount}
                    onChange={(e) => setFilterMaxAmount(e.target.value)}
                    className="w-full bg-white dark:bg-slate-850 p-1.5 border border-slate-201 dark:border-slate-755 rounded text-[10px]"
                  />
                </div>

                {/* Start & End Dates */}
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 font-bold font-mono">Start Date</span>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-850 p-1 border border-slate-201 dark:border-slate-750 rounded text-[9px]"
                  />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 font-bold font-mono">End Date</span>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-850 p-1 border border-slate-201 dark:border-slate-750 rounded text-[9px]"
                  />
                </div>

              </div>

              {/* Reset filter options */}
              <button
                onClick={() => {
                  setFilterType('All');
                  setFilterMonth('All');
                  setFilterYear('All');
                  setFilterCategory('All');
                  setFilterPaymentMode('All');
                  setFilterPerson('');
                  setFilterMinAmount('');
                  setFilterMaxAmount('');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="w-full py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 rounded font-bold uppercase tracking-wider text-[9px] font-mono mt-2"
              >
                Clear Advanced Filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ledger list */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredLedger.map(e => {
            const activeType = e.transactionType || 'Expense';
            
            // Style settings depending on transaction classifications
            let textClass = 'text-rose-500';
            if (activeType === 'Income') textClass = 'text-emerald-500';
            else if (activeType === 'LoanGiven') textClass = 'text-indigo-400';
            else if (activeType === 'LoanTaken') textClass = 'text-amber-500';
            else if (activeType === 'Transfer') textClass = 'text-slate-400';

            return (
              <div 
                key={e.id}
                className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-105 dark:border-slate-850/80 rounded-xl hover:bg-slate-100/40 transition-all flex flex-col justify-between cursor-pointer"
                onClick={() => setSelectedDetailExpense(e)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-750 dark:text-slate-200 block truncate max-w-[190px]">
                      {e.category} &middot; {e.subcategory}
                    </span>
                    <span className="text-[9px] text-slate-400 block truncate max-w-[200px] mt-0.5">
                      {e.notes}
                    </span>
                    {e.personName && (
                      <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950/55 rounded text-indigo-650 dark:text-indigo-300 font-mono py-0.5 px-1.5 mt-1 inline-block">
                        🗣️ Partner: {e.personName}
                      </span>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className={`text-xs font-black font-mono ${textClass}`}>
                      {activeType === 'Income' ? '+' : '-'} {currencySymbol} {e.amount.toLocaleString()}
                    </span>
                    <span className="text-[8px] text-slate-400 font-mono mt-1 block">
                      {e.date}
                    </span>
                    <span className="text-[8px] uppercase font-bold text-slate-400 px-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-mono border border-slate-200/50 mt-1 inline-block">
                      {activeType === 'LoanGiven' ? 'Lend' : activeType === 'LoanTaken' ? 'Borrow' : activeType}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-405 border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 leading-none">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[8px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-850 px-1.5 py-0.5 rounded">
                      💳 {e.paymentMode}
                    </span>
                    {activeType === 'Transfer' ? (
                      <span className="text-[8px] font-bold text-slate-100 bg-emerald-600 dark:bg-emerald-750 px-1.5 py-0.5 rounded">
                        💼 {getSourceAccountNameFromId(e.fromSourceAccountId)} ➔ {getSourceAccountNameFromId(e.toSourceAccountId)}
                      </span>
                    ) : (
                      e.sourceAccountId && (
                        <span className="text-[8px] font-bold text-indigo-650 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                          💼 Account: {getSourceAccountNameFromId(e.sourceAccountId)}
                        </span>
                      )
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(evt) => {
                        evt.stopPropagation();
                        handleStartEdit(e);
                      }}
                      className="p-1 hover:text-indigo-500 rounded"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(evt) => {
                        evt.stopPropagation();
                        handleDeleteItem(e.id);
                      }}
                      className="p-1 hover:text-red-500 rounded"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredLedger.length === 0 && (
            <p className="text-[10px] text-slate-400 text-center py-8 italic font-mono">
              Database contains no matches found. Adjust parameters.
            </p>
          )}
        </div>
      </div>

      </div>

      {/* DETAILED TRANSACTION OVERLAY POPUP */}
      <AnimatePresence>
        {selectedDetailExpense && (
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 text-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 w-full max-w-xs space-y-4 shadow-2xl"
            >
              <h3 className="font-bold text-slate-800 dark:text-slate-105 uppercase tracking-wide font-mono pb-2 border-b border-slate-105 dark:border-slate-705 flex justify-between items-center">
                <span>Verification Receipt Ledger</span>
                <button onClick={() => setSelectedDetailExpense(null)} className="text-slate-400 hover:text-red-500 cursor-pointer"><X className="h-4 w-4" /></button>
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Transaction Reference</span>
                  <span className="font-mono text-[10px] text-indigo-500">{selectedDetailExpense.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Value</span>
                  <span className="font-black font-mono text-slate-800 dark:text-slate-100">{currencySymbol} {selectedDetailExpense.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Date</span>
                  <span className="font-medium">{selectedDetailExpense.date}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold">Type Classification</span>
                  <span className="font-bold uppercase text-indigo-600 dark:text-indigo-400">{selectedDetailExpense.transactionType || 'Expense'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">General Category</span>
                  <span>{selectedDetailExpense.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Subcategory</span>
                  <span>{selectedDetailExpense.subcategory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Payment Method</span>
                  <span>{selectedDetailExpense.paymentMode}</span>
                </div>
                {selectedDetailExpense.personName && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Partner / Entity</span>
                    <span className="text-indigo-600 dark:text-indigo-300 font-bold">{selectedDetailExpense.personName}</span>
                  </div>
                )}
                {selectedDetailExpense.parentLoanId && (
                  <div className="bg-amber-500/5 p-2 rounded-xl border border-amber-500/20 text-[10px] text-amber-500 font-medium">
                    🔗 Linked to loan parent record: {selectedDetailExpense.parentLoanId}
                  </div>
                )}
                <div className="flex flex-col pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-bold">Detailed Memo Description</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 italic mt-0.5">&quot;{selectedDetailExpense.notes}&quot;</span>
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      handleStartEdit(selectedDetailExpense);
                      setSelectedDetailExpense(null);
                    }}
                    className="flex-1 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-black uppercase tracking-wider font-mono cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="h-3 w-3" /> Edit Item
                  </button>
                  <button
                    onClick={() => {
                      const idToDelete = selectedDetailExpense.id;
                      setSelectedDetailExpense(null);
                      handleDeleteItem(idToDelete);
                    }}
                    className="flex-1 py-1.5 bg-rose-50 dark:bg-rose-950/45 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-wider font-mono cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-3 w-3" /> Delete Item
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRMATION OVERLAY MODAL */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-4 text-left"
            >
              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto text-xl">
                  ⚠️
                </div>
                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 font-mono tracking-tight">Confirm Deletion</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Are you absolutely certain you want to purge this transaction record permanently from local registers? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider font-mono cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteExpense(confirmDeleteId);
                    onTriggerNotification('Record Purged', 'Expense deleted successfully!');
                    setConfirmDeleteId(null);
                  }}
                  className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider font-mono cursor-pointer transition-colors shadow-sm shadow-rose-900/25"
                >
                  Delete Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
