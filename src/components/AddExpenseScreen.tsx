/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
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
  ChevronDown
} from 'lucide-react';
import { VirtualExpense, VirtualCategory, VirtualBudget, AppSettings } from '../types';
import { DbSim } from '../dbSim';

interface AddExpenseScreenProps {
  expenses: VirtualExpense[];
  categories: VirtualCategory[];
  budgets: VirtualBudget[];
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
  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [amount, setAmount] = useState<string>('');
  // Force clean unselected fields by default to prevent preselection
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [selectedSubcat, setSelectedSubcat] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Credit Card' | 'Debit Card' | 'Bank Transfer'>('Cash');
  const [isAddingSub, setIsAddingSub] = useState<boolean>(false);
  const [newSubcatInputVal, setNewSubcatInputVal] = useState<string>('');

  // New Category / Subcategory Creation Drawer State
  const [showCatCreator, setShowCatCreator] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newSubcatName, setNewSubcatName] = useState<string>('');
  const [newCatBudget, setNewCatBudget] = useState<string>('5000');
  const [newCatThreshold, setNewCatThreshold] = useState<number>(80);

  // Success Confirmation and ledger popup detail states
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);
  const [selectedDetailExpense, setSelectedDetailExpense] = useState<VirtualExpense | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterPaymentMode, setFilterPaymentMode] = useState<string>('All');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // No automatic preselection logic on mount or categories update
  // Users will choose manually instead

  // Dependent subcategories options list
  const subcategoryOptions = useMemo(() => {
    if (!selectedCat) return [];
    const catObj = categories.find(c => c.name.toLowerCase() === selectedCat.toLowerCase());
    return catObj ? catObj.subcategories : [];
  }, [selectedCat, categories]);

  // Form Reset helper
  const resetForm = () => {
    setEditingId(null);
    setDate(new Date().toISOString().substring(0, 10));
    setAmount('');
    setSelectedCat('');
    setSelectedSubcat('');
    setNotes('');
    setPaymentMode('Cash');
    setIsAddingSub(false);
    setNewSubcatInputVal('');
  };

  // Check budget limits helper and trigger popup message & state mutation
  const executeBudgetVerification = (catName: string, expenseAmount: number) => {
    const alerts = DbSim.checkBudgetAlerts(catName, expenseAmount);
    if (alerts && alerts.length > 0) {
      alerts.forEach(alertResult => {
        if (alertResult.triggerAlert) {
          onTriggerNotification(alertResult.title, alertResult.message);
        }
      });
    }
  };

  // Submit Handler
  const handleSave = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      alert('Please fill out a valid amount');
      return;
    }
    if (!selectedCat || selectedCat === '') {
      alert('Please select a category');
      return;
    }
    if (!selectedSubcat || selectedSubcat === '') {
      alert('Please select a subcategory');
      return;
    }

    const expAmt = parseFloat(amount);

    if (editingId) {
      // Update
      const updatedExpense: VirtualExpense = {
        id: editingId,
        date,
        amount: expAmt,
        category: selectedCat,
        subcategory: selectedSubcat,
        notes,
        paymentMode
      };
      onUpdateExpense(updatedExpense);
      executeBudgetVerification(selectedCat, 0); // check on update
      setEditingId(null);

      setShowSuccessToast('✓ Transaction parameters updated successfully!');
      setTimeout(() => setShowSuccessToast(null), 3000);
      onTriggerNotification(
        'Transaction Updated',
        `Successfully updated record for ${selectedCat} : ${selectedSubcat} of ₹${expAmt.toLocaleString()}`
      );
    } else {
      // Create new
      const newExpense: VirtualExpense = {
        id: `exp_${Date.now()}`,
        date,
        amount: expAmt,
        category: selectedCat,
        subcategory: selectedSubcat,
        notes,
        paymentMode
      };
      onAddExpense(newExpense);
      executeBudgetVerification(selectedCat, expAmt);

      setShowSuccessToast('✓ Transaction successfully recorded to local memory database!');
      setTimeout(() => setShowSuccessToast(null), 3500);
      onTriggerNotification(
        'Transaction Saved',
        `Recorded ₹${expAmt.toLocaleString()} under ${selectedCat} : ${selectedSubcat}`
      );
    }

    resetForm();
  };

  // Edit Trigger
  const handleStartEdit = (exp: VirtualExpense) => {
    setEditingId(exp.id);
    setDate(exp.date);
    setAmount(exp.amount.toString());
    setSelectedCat(exp.category);
    // Timeout to let category dependent subcategories populate safely first
    setTimeout(() => {
      setSelectedSubcat(exp.subcategory);
    }, 50);
    setNotes(exp.notes);
    setPaymentMode(exp.paymentMode);
  };

  // Unlimited dynamic addition of customer categories and subcategories
  const handleCreateCategory = () => {
    if (!newCatName.trim()) {
      alert('Category must have a valid identifier name.');
      return;
    }
    
    // Check duplication
    const duplicate = categories.find(c => c.name.toLowerCase() === newCatName.trim().toLowerCase());
    if (duplicate) {
      alert('That category already exists.');
      return;
    }

    const subs = newSubcatName.trim() 
      ? newSubcatName.split(',').map(s => s.trim()).filter(s => s.length > 0)
      : ['General'];

    const newCategoryObj: VirtualCategory = {
      id: `cat_${Date.now()}`,
      name: newCatName.trim(),
      subcategories: subs
    };

    onAddCategory(newCategoryObj);

    // Save Budget option if input
    const parsedBudget = parseFloat(newCatBudget);
    if (!isNaN(parsedBudget) && parsedBudget > 0) {
      const newBudget: VirtualBudget = {
        categoryName: newCategoryObj.name,
        limitAmount: parsedBudget
      };
      onUpdateBudgets([...budgets, newBudget]);
    }

    // Save custom threshold slider option
    const currentThresholds = settings.categoryThresholds || {};
    const updatedThresholds = {
      ...currentThresholds,
      [newCategoryObj.name]: newCatThreshold
    };
    onUpdateSettings({
      ...settings,
      categoryThresholds: updatedThresholds
    });

    onTriggerNotification(
      'Category Created',
      `Registered category "${newCategoryObj.name}" with a budget of ₹${parsedBudget.toLocaleString()} and alert trigger at ${newCatThreshold}%.`
    );

    setSelectedCat(newCategoryObj.name);
    setNewCatName('');
    setNewSubcatName('');
    setNewCatBudget('5000');
    setNewCatThreshold(80);
    setShowCatCreator(false);
  };

  // Subcategory management on existing selected category
  const handleAddNewSubcategory = () => {
    if (!selectedCat) {
      alert('Please select a category first.');
      return;
    }
    const subName = prompt('Enter new subcategory name:');
    if (!subName || !subName.trim()) return;

    const trimmedSub = subName.trim();
    const updatedCategories = categories.map(c => {
      if (c.name.toLowerCase() === selectedCat.toLowerCase()) {
        if (c.subcategories.some(s => s.toLowerCase() === trimmedSub.toLowerCase())) {
          alert('Subcategory already existed inside this cluster.');
          return c;
        }
        return {
          ...c,
          subcategories: [...c.subcategories, trimmedSub]
        };
      }
      return c;
    });

    onUpdateCategories(updatedCategories);
    setSelectedSubcat(trimmedSub);

    onTriggerNotification(
      'Subcategory Added',
      `Successfully added "${trimmedSub}" to category "${selectedCat}"`
    );
  };

  // Filtering Logic
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // 1. Unified text match (Date, Category, Subcategory, Notes, Amount)
      const q = searchQuery.toLowerCase().trim();
      const matchText = q === '' || 
        exp.category.toLowerCase().includes(q) ||
        exp.subcategory.toLowerCase().includes(q) ||
        exp.notes.toLowerCase().includes(q) ||
        exp.amount.toString().includes(q) ||
        exp.date.includes(q);

      if (!matchText) return false;

      // 2. Filter rules
      if (filterCategory !== 'All' && exp.category.toLowerCase() !== filterCategory.toLowerCase()) {
        return false;
      }

      if (filterPaymentMode !== 'All' && exp.paymentMode.toLowerCase() !== filterPaymentMode.toLowerCase()) {
        return false;
      }

      const expDate = new Date(exp.date);
      const expYear = expDate.getFullYear().toString();
      const expMonthNum = (expDate.getMonth() + 1).toString().padStart(2, '0');

      if (filterYear !== 'All' && expYear !== filterYear) {
        return false;
      }

      if (filterMonth !== 'All' && expMonthNum !== filterMonth) {
        return false;
      }

      return true;
    });
  }, [expenses, searchQuery, filterMonth, filterYear, filterCategory, filterPaymentMode]);

  // Year list option calculator
  const yearOptions = useMemo(() => {
    const years = expenses.map(e => new Date(e.date).getFullYear().toString());
    return Array.from(new Set(years)).sort((a,b) => b.localeCompare(a));
  }, [expenses]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 px-4 py-4 space-y-4 scrollbar-thin">
      
      {/* Toast Alert Success Banner */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg border border-emerald-400 font-bold text-xs flex items-center gap-2"
          >
            <CheckCircle className="h-4.5 w-4.5 shrink-0 animate-bounce text-white" />
            <span>{showSuccessToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 1: Transaction editing form */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3.5 relative">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider font-mono flex items-center gap-1">
            <Notebook className="h-4 w-4 text-emerald-500" />
            {editingId ? 'Edit Locked Transaction' : 'Record New Expense'}
          </h3>
          <div className="flex items-center gap-2">
            {editingId && (
              <button 
                onClick={resetForm}
                className="text-[10px] text-indigo-500 hover:underline flex items-center gap-0.5"
              >
                <RotateCcw className="h-3 w-3" /> Cancel Edit
              </button>
            )}
            {onLockApp && (
              <button
                type="button"
                onClick={onLockApp}
                className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-[10px] font-black uppercase text-slate-600 hover:text-red-500 dark:text-slate-300 dark:hover:text-red-400 flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-650 shadow-xs cursor-pointer transition-all font-mono"
                title="Lock App"
              >
                <LogOut className="h-2.5 w-2.5 text-red-500" /> Lock
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* Row 1: Date & Amount Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Date</label>
              <div className="flex bg-slate-100 dark:bg-slate-700/60 rounded-lg p-2.5 items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-100 w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Amount (INR)</label>
              <div className="flex bg-slate-100 dark:bg-slate-700/60 rounded-lg p-2.5 items-center gap-1.5 mt-1">
                <span className="text-slate-400 font-bold text-xs font-mono">₹</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-100 font-mono w-full"
                  required
                />
              </div>
            </div>
          </div>

          {/* Row 2: Category & dependent subcategories */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Category</label>
                <button
                  type="button"
                  onClick={() => setShowCatCreator(true)}
                  className="text-[10px] text-indigo-500 font-bold hover:underline flex items-center gap-0.5"
                  title="Add new category"
                >
                  <Plus className="h-2.5 w-2.5" /> New
                </button>
              </div>
              <div className="bg-slate-100 dark:bg-slate-700/60 rounded-lg p-1 mt-1 flex items-center">
                <select
                  value={selectedCat}
                  onChange={(e) => {
                    setSelectedCat(e.target.value);
                    setSelectedSubcat(''); // clear subcategory selection when category changes
                    setIsAddingSub(false);
                    setNewSubcatInputVal('');
                  }}
                  className="bg-transparent border-0 outline-none p-1.5 text-xs text-slate-800 dark:text-slate-100 w-full"
                >
                  <option value="" className="text-slate-400">-- Select Category --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name} className="dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Subcategory</label>
                {selectedCat && selectedCat !== '' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingSub(!isAddingSub);
                      setNewSubcatInputVal('');
                    }}
                    className="text-[10px] text-emerald-500 font-bold hover:underline flex items-center gap-0.5"
                    title="Add subcategory to selected category cluster"
                  >
                    {isAddingSub ? 'Cancel' : <><Plus className="h-2.5 w-2.5" /> Sub</>}
                  </button>
                )}
              </div>
              <div className="bg-slate-100 dark:bg-slate-700/60 rounded-lg p-1 mt-1 flex items-center min-h-[38px]">
                {isAddingSub ? (
                  <div className="flex items-center w-full gap-1.5 px-1.5">
                    <input
                      type="text"
                      placeholder="Type subcategory..."
                      value={newSubcatInputVal}
                      onChange={(e) => setNewSubcatInputVal(e.target.value)}
                      className="bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-100 w-full px-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const trimmedSub = newSubcatInputVal.trim();
                          if (!trimmedSub) return;
                          const updatedCategories = categories.map(c => {
                            if (c.name.toLowerCase() === selectedCat.toLowerCase()) {
                              if (c.subcategories.some(s => s.toLowerCase() === trimmedSub.toLowerCase())) {
                                alert('Subcategory already existed inside this cluster.');
                                return c;
                              }
                              return {
                                ...c,
                                subcategories: [...c.subcategories, trimmedSub]
                              };
                            }
                            return c;
                          });
                          onUpdateCategories(updatedCategories);
                          setSelectedSubcat(trimmedSub);
                          onTriggerNotification(
                            'Subcategory Added',
                            `Successfully added "${trimmedSub}" to category "${selectedCat}"`
                          );
                          setIsAddingSub(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmedSub = newSubcatInputVal.trim();
                        if (!trimmedSub) {
                          alert('Please enter a subcategory name.');
                          return;
                        }
                        const updatedCategories = categories.map(c => {
                          if (c.name.toLowerCase() === selectedCat.toLowerCase()) {
                            if (c.subcategories.some(s => s.toLowerCase() === trimmedSub.toLowerCase())) {
                              alert('Subcategory already existed inside this cluster.');
                              return c;
                            }
                            return {
                              ...c,
                              subcategories: [...c.subcategories, trimmedSub]
                            };
                          }
                          return c;
                        });
                        onUpdateCategories(updatedCategories);
                        setSelectedSubcat(trimmedSub);
                        onTriggerNotification(
                          'Subcategory Added',
                          `Successfully added "${trimmedSub}" to category "${selectedCat}"`
                        );
                        setIsAddingSub(false);
                      }}
                      className="shrink-0 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-xs transition-all cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedSubcat}
                    onChange={(e) => setSelectedSubcat(e.target.value)}
                    className="bg-transparent border-0 outline-none p-1.5 text-xs text-slate-800 dark:text-slate-100 w-full font-sans"
                    disabled={!selectedCat || selectedCat === '' || subcategoryOptions.length === 0}
                  >
                    <option value="" className="text-slate-400">
                      {!selectedCat || selectedCat === '' ? 'Choose Category First' : '-- Choose Subcategory --'}
                    </option>
                    {subcategoryOptions.map(sub => (
                      <option key={sub} value={sub} className="dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                        {sub}
                      </option>
                    ))}
                    {selectedCat && selectedCat !== '' && subcategoryOptions.length === 0 && (
                      <option value="">General</option>
                    )}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Notes & Payment Modes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Notes & Details</label>
              <div className="bg-slate-100 dark:bg-slate-700/60 rounded-lg p-2 mt-1">
                <input
                  type="text"
                  placeholder="e.g. Starbucks lunch"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-100 w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Payment Mode</label>
              <div className="bg-slate-100 dark:bg-slate-700/60 rounded-lg p-1 mt-1">
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="bg-transparent border-0 outline-none p-1.5 text-xs text-slate-800 dark:text-slate-100 w-full"
                >
                  <option value="Cash" className="dark:bg-slate-800 text-slate-800 dark:text-slate-100">Cash</option>
                  <option value="UPI" className="dark:bg-slate-800 text-slate-800 dark:text-slate-100">UPI</option>
                  <option value="Credit Card" className="dark:bg-slate-800 text-slate-800 dark:text-slate-100">Credit Card</option>
                  <option value="Debit Card" className="dark:bg-slate-800 text-slate-800 dark:text-slate-100">Debit Card</option>
                  <option value="Bank Transfer" className="dark:bg-slate-800 text-slate-800 dark:text-slate-100">Bank Transfer</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 4: Action Submission Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleSave()}
              className="py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer col-span-1"
            >
              <Save className="h-4 w-4" />
              {editingId ? 'Update Record' : 'Save'}
            </button>
            <button
              onClick={resetForm}
              className="py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-650 active:scale-95 text-slate-800 dark:text-slate-100 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer col-span-1"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Dynamic inline Category addition creator pop-up */}
        <AnimatePresence>
          {showCatCreator && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="absolute inset-0 bg-white dark:bg-slate-800 p-4 rounded-xl z-25 flex flex-col justify-between border border-indigo-200 dark:border-indigo-805"
            >
              <div className="space-y-3 overflow-y-auto pr-0.5 scrollbar-thin">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-1">
                    <FolderPlus className="h-4 w-4" /> Create Custom Category Cluster
                  </h4>
                  <button 
                    type="button"
                    onClick={() => setShowCatCreator(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase font-black"
                  >
                    Cancel
                  </button>
                </div>
                
                <div className="space-y-3 text-left">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Category Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Medical, Health"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="bg-slate-100 dark:bg-slate-700 p-1.5 text-xs rounded-lg w-full text-slate-800 dark:text-slate-100 outline-none mt-1 border border-transparent focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Subcategories (Comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Medicine, Doctor visit, Tests"
                      value={newSubcatName}
                      onChange={(e) => setNewSubcatName(e.target.value)}
                      className="bg-slate-100 dark:bg-slate-700 p-1.5 text-xs rounded-lg w-full text-slate-800 dark:text-slate-100 outline-none mt-1 border border-transparent focus:border-indigo-500"
                    />
                    <span className="text-[8px] text-slate-400 block mt-0.5">Leave blank to inherit a default &quot;General&quot; subcategory</span>
                  </div>

                  {/* Threshold & Budget Configuration Controls */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-700">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Monthly Budget</label>
                      <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1.5 items-center gap-1 mt-1 border border-transparent focus-within:border-indigo-500All">
                        <span className="text-slate-400 font-bold text-[10px] font-mono">₹</span>
                        <input
                          type="number"
                          placeholder="5000"
                          value={newCatBudget}
                          onChange={(e) => setNewCatBudget(e.target.value)}
                          className="bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-100 font-mono w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Alert Threshold</label>
                        <span className="text-[10px] font-mono font-bold text-indigo-500">{newCatThreshold}%</span>
                      </div>
                      <div className="mt-2.5">
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={newCatThreshold}
                          onChange={(e) => setNewCatThreshold(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-100 dark:bg-slate-705 rounded-lg cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateCategory}
                className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black tracking-wider uppercase mt-2 w-full transition-colors cursor-pointer"
              >
                Save Category Cluster
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECTION 2: Advanced Search, Multi-Filter, and itemized transaction log list */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider font-mono">
            Transaction Ledger ({filteredExpenses.length} Records)
          </h3>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`p-1.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
              isFilterOpen || filterCategory !== 'All' || filterMonth !== 'All' || filterPaymentMode !== 'All' || filterYear !== 'All'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {/* Global Text search across database */}
        <div className="flex bg-slate-100 dark:bg-slate-700/60 rounded-lg p-2 items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search dates, category, notes, price, amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-100 w-full"
          />
        </div>

        {/* Expandable Multi Filter Controls */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl space-y-3 border border-slate-100 dark:border-slate-805 overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Month Selector */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase font-sans">Month</label>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700 text-xs mt-1"
                  >
                    <option value="All">All Months</option>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>

                {/* Year Selector */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase font-sans">Year</label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700 text-xs mt-1"
                  >
                    <option value="All">All Years</option>
                    {yearOptions.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>

                {/* Category Selector */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase font-sans">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700 text-xs mt-1"
                  >
                    <option value="All">All Categories</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Payment Mode Selector */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase font-sans">Payment Mode</label>
                  <select
                    value={filterPaymentMode}
                    onChange={(e) => setFilterPaymentMode(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700 text-xs mt-1"
                  >
                    <option value="All">All payment modes</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              {/* Clear filters trigger */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setFilterCategory('All');
                    setFilterPaymentMode('All');
                    setFilterMonth('All');
                    setFilterYear('All');
                  }}
                  className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Render Transaction Record list */}
        <div className="space-y-2 mt-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
          {filteredExpenses.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 italic">No expenses found matching the criteria.</p>
          ) : (
            filteredExpenses.map((exp) => (
              <div 
                key={exp.id} 
                onClick={() => setSelectedDetailExpense(exp)}
                className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg flex items-center justify-between border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-950/40 hover:bg-slate-100/50 dark:hover:bg-slate-850 cursor-pointer group transition-all min-w-0 overflow-hidden"
              >
                <div className="space-y-1 flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                      {exp.category}
                    </span>
                    <span className="text-[9px] text-slate-400 bg-slate-200 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-medium truncate max-w-[90px]">
                      {exp.subcategory}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">
                    <span className="font-mono bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 px-1 rounded inline-block shrink-0">{exp.paymentMode}</span>
                    <span className="shrink-0">{exp.date}</span>
                    {exp.notes && <span className="truncate italic">({exp.notes})</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-slate-800 dark:text-slate-100 text-xs">
                      ₹{exp.amount.toLocaleString()}
                    </span>
                  </div>

                  {/* Edit and Delete Buttons */}
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(exp);
                      }}
                      className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-all cursor-pointer"
                      title="Edit entry"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteExpense(exp.id);
                      }}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-all cursor-pointer"
                      title="Delete entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pop-up Modal: Transaction Detail Inspector */}
      <AnimatePresence>
        {selectedDetailExpense && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm flex flex-col relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800">
                <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-md font-mono uppercase tracking-wider font-black">
                  TRANSACTION SPECIFICATIONS
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDetailExpense(null)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>

              <div className="py-4 space-y-4 font-sans text-left">
                {/* Large Amount display using soft reassuring eye-pleasing teal theme */}
                <div className="text-center py-3 bg-teal-50/50 dark:bg-teal-950/20 rounded-xl border border-teal-100/60 dark:border-teal-900/40">
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 uppercase tracking-widest block font-mono font-extrabold mb-0.5">Total Amount</span>
                  <span className="text-2xl font-black text-teal-800 dark:text-teal-300 font-mono">
                    ₹{selectedDetailExpense.amount.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block mb-0.5 font-mono">Category</span>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/30 rounded font-mono font-bold block truncate text-center">
                      {selectedDetailExpense.category}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block mb-0.5 font-mono">Subcategory</span>
                    <span className="px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/20 dark:text-sky-300 dark:border-sky-900/30 rounded font-mono font-bold block truncate text-center">
                      {selectedDetailExpense.subcategory}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 text-xs border-t border-slate-150 dark:border-slate-800 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block mb-0.5 font-mono">Date</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 font-medium block text-center py-1">
                      {selectedDetailExpense.date}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block mb-0.5 font-mono">Payment Mode</span>
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-850 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-350 dark:border-rose-900/30 rounded font-mono font-bold block truncate text-center">
                      {selectedDetailExpense.paymentMode}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-150 dark:border-slate-800 pt-3 text-xs font-sans">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block mb-1 font-mono">Notes & Memo</span>
                  <p className="text-slate-600 dark:text-slate-350 bg-slate-100/50 dark:bg-slate-950/50 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80 italic text-[11px] leading-relaxed max-h-24 overflow-y-auto">
                    {selectedDetailExpense.notes || 'No description provided for this ledger entry.'}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDetailExpense(null)}
                  className="w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
                >
                  Close Specification
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
