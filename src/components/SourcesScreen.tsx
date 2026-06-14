/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Archive, 
  CornerDownLeft,
  ArrowLeftRight, 
  Wallet, 
  CreditCard, 
  PiggyBank, 
  Landmark, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  X, 
  CheckCircle,
  FileText,
  Bookmark,
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  Lock,
  Unlock
} from 'lucide-react';
import { MoneySource, VirtualExpense, AppSettings } from '../types';
import { DbSim } from '../dbSim';

interface SourcesScreenProps {
  expenses: VirtualExpense[];
  moneySources: MoneySource[];
  onUpdateSources: (sources: MoneySource[]) => void;
  onAddSourceExpense: (expense: VirtualExpense) => void;
  settings: AppSettings;
}

// Reusable balance calculation logic matching user's exact balance model formula with automatic roll-forward carry-over:
// The opening balance of a month is automatically considered as the ending balance of the previous month.
export function getSourceOpeningBalance(
  source: MoneySource,
  expenses: VirtualExpense[],
  monthStr: string
): number {
  const months = ['2026-03', '2026-04', '2026-05', '2026-06'];
  const targetIdx = months.indexOf(monthStr);

  // If there is an explicit override for this exact month, use it
  if (source.openingBalances && source.openingBalances[monthStr] !== undefined) {
    return source.openingBalances[monthStr];
  }

  // If this is the earliest configured month, find the earliest configured opening balance key or default to 0
  if (targetIdx <= 0) {
    const keys = Object.keys(source.openingBalances || {}).sort();
    if (keys.length > 0) {
      const earliestKey = keys[0];
      return source.openingBalances[earliestKey] ?? 0;
    }
    return 0;
  }

  // Otherwise, the opening balance is the ending balance of the previous month!
  const prevMonth = months[targetIdx - 1];
  return getSourceMonthlyBalance(source, expenses, prevMonth);
}

export function getSourceMonthlyBalance(
  source: MoneySource,
  expenses: VirtualExpense[],
  monthStr: string
): number {
  const opening = getSourceOpeningBalance(source, expenses, monthStr);
  
  let incomeSum = 0;
  let expenseSum = 0;
  let incomingTransfers = 0;
  let outgoingTransfers = 0;

  // Filter transactions for this exact month
  const monthTxs = expenses.filter(e => e.date && e.date.startsWith(monthStr));

  monthTxs.forEach(e => {
    if (e.transactionType === 'Transfer') {
      if (e.fromSourceAccountId === source.id) {
        outgoingTransfers += e.amount;
      }
      if (e.toSourceAccountId === source.id) {
        incomingTransfers += e.amount;
      }
    } else {
      if (e.sourceAccountId === source.id) {
        if (e.transactionType === 'Income' || e.transactionType === 'LoanTaken') {
          incomeSum += e.amount;
        } else if (e.transactionType === 'Expense' || e.transactionType === 'LoanGiven') {
          expenseSum += e.amount;
        }
      }
    }
  });

  return opening + incomeSum - expenseSum + incomingTransfers - outgoingTransfers;
}

export default function SourcesScreen({
  expenses,
  moneySources,
  onUpdateSources,
  onAddSourceExpense,
  settings
}: SourcesScreenProps) {
  const currencySymbol = settings.currency || '₹';
  const currentMonthStr = '2026-06';

  // State: selected month for reviewing/adjusting balances
  const [selectedBalanceMonth, setSelectedBalanceMonth] = useState<string>(currentMonthStr);

  // Modals / forms toggles
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<MoneySource | null>(null);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [isEditingOpeningBalances, setIsEditingOpeningBalances] = useState<boolean>(false);
  const [canEditStartingBalances, setCanEditStartingBalances] = useState<boolean>(false);

  // Collapsible sections
  const [isReservesCollapsed, setIsReservesCollapsed] = useState<boolean>(false);
  const [isArchivedCollapsed, setIsArchivedCollapsed] = useState<boolean>(true);

  // Form parameters: Source Creation / Editing
  const [sourceNameInput, setSourceNameInput] = useState<string>('');
  const [openingBalanceInput, setOpeningBalanceInput] = useState<string>('');

  // Form parameters: Opening balances board
  const [tempOpeningBalances, setTempOpeningBalances] = useState<Record<string, string>>({});

  // Custom confirmation overlays to prevent browser confirm popup blocks in frames
  const [confirmArchive, setConfirmArchive] = useState<{ id: string; name: string } | null>(null);
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState<{ id: string; name: string } | null>(null);

  // Form parameters: Money Transfer
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().substring(0, 10));

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper: map standard names to specific aesthetic wallet icons
  const getAccountIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('cash') || n.includes('wallet')) return <Wallet className="h-4 w-4 text-amber-500" />;
    if (n.includes('card') || n.includes('credit')) return <CreditCard className="h-4 w-4 text-indigo-500" />;
    if (n.includes('savings') || n.includes('piggy')) return <PiggyBank className="h-4 w-4 text-pink-500" />;
    return <Landmark className="h-4 w-4 text-emerald-500" />;
  };

  // Dynamic balance calculation helper for rendering
  const activeSources = useMemo(() => {
    return moneySources.filter(s => !s.archived);
  }, [moneySources]);

  const activeSourcesForMonth = useMemo(() => {
    return moneySources.filter(s => {
      // Check creation date if available (defaulting to older month if not provided so mock accounts persist)
      if (s.createdAt) {
        const createdMonth = s.createdAt.substring(0, 7);
        // If created month is in the future relative to the selected month, do NOT show it
        if (createdMonth > selectedBalanceMonth) {
          return false;
        }
      }

      // Check archive date: if archived and the archiving month is <= selected balance month, it is archived
      if (s.archived) {
        const archiveMonth = s.archivedAt?.substring(0, 7) || '2026-06';
        if (selectedBalanceMonth >= archiveMonth) {
          return false;
        }
      }

      return true;
    });
  }, [moneySources, selectedBalanceMonth]);

  const archivedSourcesForMonth = useMemo(() => {
    return moneySources.filter(s => {
      if (!s.archived) return false;
      const archiveMonth = s.archivedAt?.substring(0, 7) || '2026-06';
      return archiveMonth === selectedBalanceMonth;
    });
  }, [moneySources, selectedBalanceMonth]);

  // Total calculated assets across all active accounts
  const totalAssetsValue = useMemo(() => {
    return activeSourcesForMonth.reduce((sum, s) => {
      const bal = getSourceMonthlyBalance(s, expenses, selectedBalanceMonth);
      return sum + bal;
    }, 0);
  }, [activeSourcesForMonth, expenses, selectedBalanceMonth]);

  // Create account handler
  const handleCreateSource = () => {
    const name = sourceNameInput.trim();
    if (!name) {
      alert('Please input a valid source account name.');
      return;
    }
    const initialAmt = parseFloat(openingBalanceInput) || 0;

    const newSource: MoneySource = {
      id: `source_${Date.now()}`,
      name,
      openingBalances: {
        [selectedBalanceMonth]: initialAmt
      },
      archived: false,
      createdAt: new Date().toISOString()
    };

    const updated = [...moneySources, newSource];
    onUpdateSources(updated);
    setIsCreating(false);
    setSourceNameInput('');
    setOpeningBalanceInput('');
    triggerToast(`✓ Channel account "${name}" created dynamically!`);
  };

  // Edit account handler
  const handleEditSource = () => {
    if (!isEditing) return;
    
    const updated = moneySources.map(s => {
      if (s.id === isEditing.id) {
        if (canEditStartingBalances) {
          const editAmt = parseFloat(openingBalanceInput) || 0;
          return { 
            ...s, 
            openingBalances: {
              ...(s.openingBalances || {}),
              [selectedBalanceMonth]: editAmt
            }
          };
        } else {
          const name = sourceNameInput.trim();
          if (!name) {
            alert('Please fill out a valid name.');
            return s;
          }
          return { 
            ...s, 
            name
          };
        }
      }
      return s;
    });

    onUpdateSources(updated);
    setIsEditing(null);
    setSourceNameInput('');
    setOpeningBalanceInput('');
    triggerToast(canEditStartingBalances ? '✓ Account starting balance updated!' : '✓ Account name updated!');
  };

  // Delete account handler - soft archive to protect records in statement
  const handleDeleteSource = (id: string, name: string) => {
    setConfirmArchive({ id, name });
  };

  const executeArchiveSource = (id: string, name: string) => {
    const updated = moneySources.map(s => {
      if (s.id === id) {
        return { ...s, archived: true, archivedAt: selectedBalanceMonth };
      }
      return s;
    });
    onUpdateSources(updated);
    triggerToast(`✓ Retired account "${name}" moved to Archived list.`);
    setConfirmArchive(null);
  };

  // Archive toggle handler
  const handleArchiveToggle = (id: string, currentlyArchived: boolean, name: string) => {
    const updated = moneySources.map(s => {
      if (s.id === id) {
        const nextArchived = !currentlyArchived;
        return { 
          ...s, 
          archived: nextArchived, 
          archivedAt: nextArchived ? selectedBalanceMonth : undefined 
        };
      }
      return s;
    });
    onUpdateSources(updated);
    triggerToast(`✓ Account "${name}" successfully ${currentlyArchived ? 'unarchived' : 'archived'}!`);
  };

  // Permanent Delete handler
  const handlePermanentDelete = (id: string, name: string) => {
    setConfirmPermanentDelete({ id, name });
  };

  const executePermanentDelete = (id: string, name: string) => {
    const updated = moneySources.filter(s => s.id !== id);
    onUpdateSources(updated);
    triggerToast(`🗑️ Account "${name}" permanently deleted.`);
    setConfirmPermanentDelete(null);
  };

  // Open opening balances board
  const handleOpenOpeningBalancesBoard = () => {
    const initialValues: Record<string, string> = {};
    activeSources.forEach(s => {
      initialValues[s.id] = String(getSourceOpeningBalance(s, expenses, selectedBalanceMonth));
    });
    setTempOpeningBalances(initialValues);
    setIsEditingOpeningBalances(true);
  };

  // Save opening balances board
  const handleSaveOpeningBalances = () => {
    const updated = moneySources.map(s => {
      if (s.archived) return s;
      const inputVal = tempOpeningBalances[s.id];
      const parsedVal = inputVal !== undefined ? (parseFloat(inputVal) || 0) : s.openingBalances[selectedBalanceMonth] ?? 0;
      
      return {
        ...s,
        openingBalances: {
          ...s.openingBalances,
          [selectedBalanceMonth]: parsedVal
        }
      };
    });

    onUpdateSources(updated);
    setIsEditingOpeningBalances(false);
    triggerToast(`✓ Opening balances updated for ${selectedBalanceMonth}!`);
  };

  // Execute manual money Transfer between sources
  const handleExecuteTransfer = () => {
    if (!fromAccountId || !toAccountId) {
      alert('Please select both from and to accounts for this transfer.');
      return;
    }
    if (fromAccountId === toAccountId) {
      triggerToast('⚠️ Error: From and To accounts must be different!');
      return;
    }
    const amt = parseFloat(transferAmount) || 0;
    if (amt <= 0) {
      triggerToast('⚠️ Error: Please input a valid greater-than-zero transfer amount.');
      return;
    }

    const fromAcct = moneySources.find(s => s.id === fromAccountId);
    const toAcct = moneySources.find(s => s.id === toAccountId);
    if (!fromAcct || !toAcct) return;

    // Check balance sufficiency fallback reminder (user is alert, but still allowed to record debt overdrafts if needed)
    const currentFromBalance = getSourceMonthlyBalance(fromAcct, expenses, selectedBalanceMonth);
    if (currentFromBalance < amt) {
      triggerToast(`⚠️ Overdrawn! Recorded transfer exceeds balance in ${fromAcct.name}.`);
    }

    // Append a real transaction block onto ledger
    const newTx: VirtualExpense = {
      id: `transfer_${Date.now()}`,
      date: transferDate,
      amount: amt,
      category: 'Transfer',
      subcategory: 'Transfers',
      notes: transferNotes.trim() || `Transferred funds from ${fromAcct.name} to ${toAcct.name}`,
      paymentMode: 'Bank Transfer', // placeholder
      transactionType: 'Transfer',
      personName: `Self: ${fromAcct.name} ➔ ${toAcct.name}`,
      fromSourceAccountId: fromAccountId,
      toSourceAccountId: toAccountId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onAddSourceExpense(newTx);
    setIsTransferring(false);
    setTransferAmount('');
    setTransferNotes('');
    setFromAccountId('');
    setToAccountId('');
    triggerToast(`✓ Transfer of ${currencySymbol}${amt.toLocaleString()} recorded between accounts!`);
  };

  // Pre-fill creation / editing inputs
  const triggerStartEdit = (source: MoneySource) => {
    setIsEditing(source);
    setSourceNameInput(source.name);
    setOpeningBalanceInput(String(getSourceOpeningBalance(source, expenses, selectedBalanceMonth)));
  };

  // Available Month array for selector
  const availableMonths = ['2026-03', '2026-04', '2026-05', '2026-06'];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-none">
      
      {/* Toast Alert Popups */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 bg-slate-950 text-white font-extrabold text-[10px] uppercase font-mono px-4 py-2 rounded-full z-50 shadow-xl border border-indigo-500/35 flex items-center gap-1.5"
          >
            <CheckCircle className="h-3.5 w-3.5 text-indigo-400" /> {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER GREETING BAR */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest font-mono">
            MONEY SOURCE WALLETS
          </span>
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1 font-mono mt-0.5">
            <Wallet className="h-4 w-4 text-indigo-505" />
            Accounts Dashboard
          </h2>
        </div>

        {/* Month Picker */}
        <select
          value={selectedBalanceMonth}
          onChange={(e) => setSelectedBalanceMonth(e.target.value)}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase text-indigo-650 dark:text-indigo-400 font-mono"
        >
          {availableMonths.map(m => (
            <option key={m} value={m}>{new Date(m + '-02').toLocaleString('en-US', { month: 'short', year: 'numeric' })}</option>
          ))}
        </select>
      </div>

      {/* OVERALL PORTFOLIO ASSETS CARD */}
      <div className="p-4 bg-indigo-950 text-white rounded-2xl shadow-lg border border-indigo-900/40 relative overflow-hidden flex flex-col justify-between">
        <div className="absolute right-[-10px] bottom-[-20px] opacity-10 pointer-events-none">
          <Award className="h-40 w-40 text-indigo-300" />
        </div>

        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest font-mono">Total Liquid Assets</span>
          <span className="text-[8px] bg-indigo-900 border border-indigo-800 rounded px-1.5 py-0.5 font-bold uppercase font-mono">
            {selectedBalanceMonth} Stand
          </span>
        </div>

        <div className="text-2xl font-black text-slate-100 tracking-tight font-mono">
          {currencySymbol} {totalAssetsValue.toLocaleString()}
        </div>

        <p className="text-[9px] text-indigo-300 mt-1 leading-normal">
          Aggregating {activeSourcesForMonth.length} active wealth reserves for this calendar month. Adjust starting month balances below.
        </p>

        {/* Dynamic actions drawer trigger */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-indigo-900/60 font-mono">
          <button
            onClick={() => setIsTransferring(true)}
            className="py-1.5 bg-indigo-900 hover:bg-indigo-850 text-indigo-100 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 uppercase transition-all cursor-pointer"
          >
            <ArrowLeftRight className="h-3 w-3 text-emerald-400" /> Pay-Transfer
          </button>
          <button
            onClick={() => {
              const nextState = !canEditStartingBalances;
              setCanEditStartingBalances(nextState);
              triggerToast(nextState ? '🔓 Starting balances editing is now unlocked!' : '🔒 Starting balances editing in now locked!');
            }}
            className={`py-1.5 rounded-lg text-[9px] font-black flex items-center justify-center gap-1.5 uppercase transition-all px-3 cursor-pointer ${
              canEditStartingBalances
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow shadow-rose-900/45 border border-rose-500/30'
                : 'bg-white hover:bg-slate-100 text-indigo-950 shadow shadow-indigo-950/40 border border-slate-200'
            }`}
            title="Toggle starting balance edit mode"
          >
            {canEditStartingBalances ? (
              <>
                <Unlock className="h-3.5 w-3.5 text-white animate-bounce" /> Balances Unlocked
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5 text-rose-600" /> Balances Locked
              </>
            )}
          </button>
        </div>
      </div>

      {/* ACTIVE ACCOUNTS BOARD */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => setIsReservesCollapsed(!isReservesCollapsed)}
            className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-widest flex items-center gap-1 hover:text-indigo-505 transition-colors cursor-pointer"
          >
            {isReservesCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Reserves & Accounts Vault ({activeSourcesForMonth.length})
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="text-[9px] bg-slate-200 hover:bg-indigo-50 text-indigo-750 dark:bg-slate-800 dark:hover:bg-slate-750 font-black tracking-wider uppercase px-2 py-1 rounded-lg flex items-center gap-1 font-mono cursor-pointer"
          >
            <Plus className="h-3 w-3" /> New Account
          </button>
        </div>

        <AnimatePresence initial={false}>
          {!isReservesCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 gap-2.5 overflow-hidden"
            >
              {activeSourcesForMonth.map(s => {
                const currentBal = getSourceMonthlyBalance(s, expenses, selectedBalanceMonth);
                const rawOpening = getSourceOpeningBalance(s, expenses, selectedBalanceMonth);
                const isCurrentMonth = selectedBalanceMonth === '2026-06';

                return (
                  <div 
                    key={s.id}
                    className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-805 shadow-2xs hover:border-slate-200 dark:hover:border-slate-700 transition-all flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                        {getAccountIcon(s.name)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100 font-mono uppercase tracking-tight">
                          {s.name}
                        </h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-none">
                          {isCurrentMonth ? 'Opening Monthly Cap' : 'Opening Balance'}: <span className="font-semibold font-mono text-slate-500">{currencySymbol}{rawOpening.toLocaleString()}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className={`text-sm font-black font-mono leading-none block ${currentBal >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}`}>
                          {currencySymbol}{currentBal.toLocaleString()}
                        </span>
                        <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-widest block mt-0.5 font-mono">
                          {isCurrentMonth ? 'Current balance' : 'Closing balance'}
                        </span>
                      </div>

                      {/* Actions Drawer */}
                      <div className="flex items-center gap-1.5 border-l border-slate-100 dark:border-slate-700/60 pl-2.5">
                        <button
                          onClick={() => triggerStartEdit(s)}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            canEditStartingBalances 
                              ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-405 hover:bg-rose-200'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600'
                          }`}
                          title={canEditStartingBalances ? "Edit Opening Balance Amount" : "Rename Account"}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSource(s.id, s.name)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Delete & Archive Account"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {activeSourcesForMonth.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6 italic font-medium bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-805">No active accounts stored. Provision one above.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ARCHIVED RESERVES PANEL (IF ANY) */}
      {archivedSourcesForMonth.length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <button
            type="button"
            onClick={() => setIsArchivedCollapsed(!isArchivedCollapsed)}
            className="w-full text-left text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase font-mono tracking-wider flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-1">
              <Archive className="h-3 w-3" /> Archived in {selectedBalanceMonth} ({archivedSourcesForMonth.length})
            </span>
            {isArchivedCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          
          <AnimatePresence initial={false}>
            {!isArchivedCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-sans overflow-hidden"
              >
                {archivedSourcesForMonth.map(s => (
                  <div key={s.id} className="flex justify-between items-center bg-white/50 dark:bg-slate-900/40 p-2 rounded-lg pr-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                        {getAccountIcon(s.name)}
                      </div>
                      <span className="font-bold uppercase tracking-tight font-mono text-[10px]">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleArchiveToggle(s.id, true, s.name)}
                        className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100/80 text-indigo-750 dark:text-indigo-300 rounded text-[8px] font-black uppercase font-mono cursor-pointer transition-colors"
                        title="Restore Account"
                      >
                        Unarchive
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(s.id, s.name)}
                        className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/45 text-rose-600 rounded transition-colors cursor-pointer"
                        title="Permanently Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      </div>

      {/* INTERACTIVE PAY-TRANSFER DIALOG OVERLAY */}
      <AnimatePresence>
        {isTransferring && (
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-205 dark:border-slate-800 w-full max-w-xs space-y-3.5 shadow-2xl font-sans text-xs"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono flex items-center gap-1">
                  <ArrowLeftRight className="h-4 w-4 text-emerald-500" />
                  <span>Internal Money Transfer</span>
                </h3>
                <button 
                  onClick={() => setIsTransferring(false)} 
                  className="text-slate-400 hover:text-red-500 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Source selection */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase font-mono block">From Account</label>
                  <select
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-1.5 px-2.5 rounded-xl font-bold font-sans"
                  >
                    <option value="">Select</option>
                    {activeSources.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase font-mono block">To Account</label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-1.5 px-2.5 rounded-xl font-bold font-sans"
                  >
                    <option value="">Select</option>
                    {activeSources.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase font-mono block">Amount</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 font-bold font-mono text-indigo-500">{currencySymbol}</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 pl-6 pr-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase font-mono block">Transfer Date</label>
                  <input 
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 py-1.5 px-1 text-[11px] font-bold border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-center"
                  />
                </div>
              </div>

              {/* Notes memo */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase font-mono block font-sans">Memo Notes (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Swapped funds for bank limit"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800 rounded-xl outline-none placeholder:text-slate-400"
                />
              </div>

              <button
                onClick={handleExecuteTransfer}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black tracking-wider uppercase font-mono rounded-xl cursor-pointer transition-colors"
              >
                Execute Safe Transfer
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE / RENAME SOURCE DOCK OVERLAYS */}
      <AnimatePresence>
        {(isCreating || isEditing) && (
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-205 dark:border-slate-800 w-full max-w-xs space-y-3.5 shadow-2xl font-sans text-xs"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono">
                  {isEditing 
                    ? (canEditStartingBalances ? 'Edit Starting Balance' : 'Rename Wealth Account') 
                    : 'Provision Wealth Account'
                  }
                </h3>
                <button 
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(null);
                    setSourceNameInput('');
                    setOpeningBalanceInput('');
                  }} 
                  className="text-slate-400 hover:text-red-500 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {(isCreating || (isEditing && !canEditStartingBalances)) && (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-sans">Account Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Emergency Reserve, Paytm Wallet"
                    value={sourceNameInput}
                    onChange={(e) => setSourceNameInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 p-2.5 border border-slate-205 dark:border-slate-700 rounded-xl outline-none font-bold placeholder:text-slate-400"
                    autoFocus
                  />
                </div>
              )}

              {(isCreating || (isEditing && canEditStartingBalances)) && (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-gray-500 leading-none">
                    Opening Balance ({selectedBalanceMonth})
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-indigo-400 font-semibold font-mono">{currencySymbol}</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={openingBalanceInput}
                      onChange={(e) => setOpeningBalanceInput(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 pl-6 pr-3 py-2 border border-slate-205 dark:border-slate-700 rounded-xl outline-none font-black font-mono"
                      autoFocus={canEditStartingBalances}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={isEditing ? handleEditSource : handleCreateSource}
                className="w-full py-2.5 bg-[#4f46e5] hover:bg-indigo-700 text-white font-black tracking-wider uppercase font-mono rounded-xl cursor-pointer transition-colors shadow"
              >
                {isEditing ? 'Save Changes' : 'Create & Save'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM ARCHIVE CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmArchive && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-4 text-left"
            >
              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto text-xl">
                  📦
                </div>
                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 font-mono tracking-tight">Archive Account</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Do you want to delete and archive <span className="font-bold text-slate-700 dark:text-slate-200">&quot;{confirmArchive.name}&quot;</span>? 
                  To preserve your past transaction logs correctly, it will be kept safely under 'Archived Reserves'.
                </p>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmArchive(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider font-mono cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeArchiveSource(confirmArchive.id, confirmArchive.name)}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider font-mono cursor-pointer transition-colors shadow-sm shadow-indigo-900/25"
                >
                  Archive
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM PERMANENT DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmPermanentDelete && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs font-sans">
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
                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 font-mono tracking-tight">Permanent Delete Warning</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Are you absolutely certain you want to permanently delete <span className="font-bold text-slate-700 dark:text-slate-200">&quot;{confirmPermanentDelete.name}&quot;</span>? This action <span className="font-bold text-rose-600 uppercase">cannot be undone</span> and will purge the account completely from all records.
                </p>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmPermanentDelete(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider font-mono cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executePermanentDelete(confirmPermanentDelete.id, confirmPermanentDelete.name)}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider font-mono cursor-pointer transition-colors shadow-sm shadow-rose-900/25"
                >
                  Delete Forever
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
