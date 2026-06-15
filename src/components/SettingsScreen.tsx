/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
import {
  Key,
  HardDrive,
  FileSpreadsheet,
  Trash2,
  Download,
  Check,
  FolderPlus,
  Plus,
  X,
  FileText,
  AlertCircle,
  User,
  Settings,
  ChevronDown,
  ChevronUp,
  Percent,
  TrendingDown,
  TrendingUp,
  Smartphone,
  Cloud,
} from "lucide-react";
import {
  AppSettings,
  VirtualExpense,
  VirtualCategory,
  VirtualBudget,
} from "../types";
import { DbSim } from "../dbSim";

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onBackup: () => void;
  onRestore: () => void;
  onTriggerNotification: (title: string, message: string) => void;
  expenses: VirtualExpense[];
  categories: VirtualCategory[];
  budgets: VirtualBudget[];
  onUpdateBudgets: (newBudgets: VirtualBudget[]) => void;
  onUpdateCategories: (newCategories: VirtualCategory[]) => void;
}

export default function SettingsScreen({
  settings,
  onUpdateSettings,
  onTriggerNotification,
  expenses = [],
  categories = [],
  budgets = [],
  onUpdateBudgets,
  onUpdateCategories,
}: SettingsScreenProps) {
  // Hardcoded default Indian Rupees symbol
  const currencySymbol = "₹";

  // 1. Reports & Statement Exporter States
  const [timeframeInput, setTimeframeInput] =
    useState<string>("2026-06, 2026-05");
  const [activeTimeframePills, setActiveTimeframePills] = useState<string[]>([
    "2026-06",
    "2026-05",
  ]);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");

  // 2. Category Creation & Checking/Modifying States
  const [newCatName, setNewCatName] = useState<string>("");
  const [newCatType, setNewCatType] = useState<"expense" | "income">("expense");
  const [newCatSubcats, setNewCatSubcats] = useState<string>("");
  const [newCatBudget, setNewCatBudget] = useState<string>("");
  const [newCatThreshold, setNewCatThreshold] = useState<number>(80);

  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [inlineSubcatInputs, setInlineSubcatInputs] = useState<
    Record<string, string>
  >({});
  const [categoryBudgetInputs, setCategoryBudgetInputs] = useState<
    Record<string, string>
  >({});
  const [isCategoryListCollapsed, setIsCategoryListCollapsed] =
    useState<boolean>(false);
  const [isEntriesListCollapsed, setIsEntriesListCollapsed] =
    useState<boolean>(false);
  const [isExpenseListOpen, setIsExpenseListOpen] = useState<boolean>(false);
  const [isIncomeListOpen, setIsIncomeListOpen] = useState<boolean>(false);
  const [deleteConfirms, setDeleteConfirms] = useState<Record<string, boolean>>(
    {},
  );
  const [wipeConfirm, setWipeConfirm] = useState<boolean>(false);

  // 3. Category & Overall Budget alert thresholds
  const [alertThreshold, setAlertThreshold] = useState<number>(
    settings.alertThresholdPercentage || 80,
  );
  const [overallThreshold, setOverallThreshold] = useState<number>(
    settings.overallThresholdPercentage || 80,
  );

  // 4. PIN Change Lock security states
  const [pinChangeOpen, setPinChangeOpen] = useState<boolean>(false);
  const [oldPin, setOldPin] = useState<string>("");
  const [newPin, setNewPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [customPinHint, setCustomPinHint] = useState<string>(
    settings.pinHint || "",
  );
  const [pinError, setPinError] = useState<string>("");
  const [pinSuccess, setPinSuccess] = useState<boolean>(false);
  const [showMobileInstructions, setShowMobileInstructions] =
    useState<boolean>(false);

  // Ref files element
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelImportInputRef = useRef<HTMLInputElement>(null);

  // Helper timeframe filter
  const parseAndTimeframeFilter = (
    raw: VirtualExpense[],
    timeframeStr: string,
  ) => {
    const trimmedStr = timeframeStr.trim().toLowerCase();
    if (!trimmedStr || trimmedStr === "lifetime" || trimmedStr === "all") {
      return raw;
    }

    const tokens = trimmedStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.length === 0) return raw;

    return raw.filter((exp) => {
      const dateStr = exp.date; // YYYY-MM-DD
      return tokens.some((token) => {
        return dateStr.startsWith(token);
      });
    });
  };

  // Helper to handle timeframe pill toggles
  const handleTogglePill = (val: string) => {
    let next: string[];
    if (val === "lifetime") {
      next = ["lifetime"];
    } else {
      next = activeTimeframePills.filter((p) => p !== "lifetime");
      if (next.includes(val)) {
        next = next.filter((p) => p !== val);
      } else {
        next = [...next, val];
      }
    }
    if (next.length === 0) {
      next = ["lifetime"];
    }
    setActiveTimeframePills(next);
    setTimeframeInput(next.join(", "));
  };

  // Helper category thresholds setting
  const handleUpdateCategoryThreshold = (catName: string, valStr: string) => {
    const pct = parseInt(valStr);
    if (isNaN(pct) || pct < 10 || pct > 100) return;

    const updatedThresh = {
      ...(settings.categoryThresholds || {}),
      [catName]: pct,
    };
    onUpdateSettings({
      ...settings,
      categoryThresholds: updatedThresh,
    });
  };

  // Create Category Handler
  const handleCreateCategorySubmit = () => {
    const trimmedName = newCatName.trim();
    if (!trimmedName) {
      alert("Fill out category name");
      return;
    }

    if (
      categories.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())
    ) {
      alert("A category with this name already exists.");
      return;
    }

    const subList = newCatSubcats
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newCatObj: VirtualCategory = {
      id: "cat_" + Date.now(),
      name: trimmedName,
      subcategories: subList.length > 0 ? subList : ["General"],
      type: newCatType,
    };

    const updatedCategories = [...categories, newCatObj];
    onUpdateCategories(updatedCategories);

    // If initial budget cap limit is specified for expense category
    const limit = parseFloat(newCatBudget);
    if (newCatType === "expense") {
      if (!isNaN(limit) && limit > 0) {
        const updatedBudgets = [
          ...budgets,
          { categoryName: trimmedName, limitAmount: limit },
        ];
        onUpdateBudgets(updatedBudgets);
      }
      // Save original threshold slider settings matching selection
      const updatedThresh = {
        ...(settings.categoryThresholds || {}),
        [trimmedName]: newCatThreshold,
      };
      onUpdateSettings({
        ...settings,
        categoryThresholds: updatedThresh,
      });
    }

    setNewCatName("");
    setNewCatSubcats("");
    setNewCatBudget("");
    setNewCatThreshold(80);
    onTriggerNotification(
      "Category Created",
      `Category "${trimmedName}" has been successfully added.`,
    );
  };

  // Delete Category Handler
  const handleDeleteCategory = (catId: string, catName: string) => {
    if (
      confirm(
        `Are you sure you want to delete the category "${catName}"? This will also purge its limit budgets.`,
      )
    ) {
      const updatedCategories = categories.filter((c) => c.id !== catId);
      onUpdateCategories(updatedCategories);

      const updatedBudgets = budgets.filter((b) => b.categoryName !== catName);
      onUpdateBudgets(updatedBudgets);

      onTriggerNotification(
        "Category Removed",
        `Category "${catName}" has been removed.`,
      );
    }
  };

  // Inline Subcategory additions
  const handleAddSubcatInline = (catId: string, catName: string) => {
    const subName = (inlineSubcatInputs[catId] || "").trim();
    if (!subName) return;

    const updatedCategories = categories.map((c) => {
      if (c.id === catId) {
        if (c.subcategories.includes(subName)) {
          alert("Subcategory already exists in this pool.");
          return c;
        }
        return {
          ...c,
          subcategories: [...c.subcategories, subName],
        };
      }
      return c;
    });

    onUpdateCategories(updatedCategories);
    setInlineSubcatInputs((prev) => ({ ...prev, [catId]: "" }));
    onTriggerNotification(
      "Subcategory Added",
      `Added "${subName}" to category "${catName}".`,
    );
  };

  // Inline subcategory removals
  const handleDeleteSubcatInline = (
    catId: string,
    subName: string,
    catName: string,
  ) => {
    const updatedCategories = categories.map((c) => {
      if (c.id === catId) {
        return {
          ...c,
          subcategories: c.subcategories.filter((s) => s !== subName),
        };
      }
      return c;
    });
    onUpdateCategories(updatedCategories);
    onTriggerNotification(
      "Subcategory Deleted",
      `Removed "${subName}" from "${catName}".`,
    );
  };

  // Budget Limits configurations
  const handleUpdateCategoryBudget = (catName: string, amtStr: string) => {
    const limit = parseFloat(amtStr);
    if (isNaN(limit) || limit < 0) return;

    let exists = budgets.some((b) => b.categoryName === catName);
    let updated: VirtualBudget[];
    if (exists) {
      updated = budgets.map((b) =>
        b.categoryName === catName ? { ...b, limitAmount: limit } : b,
      );
    } else {
      updated = [...budgets, { categoryName: catName, limitAmount: limit }];
    }
    onUpdateBudgets(updated);
  };

  // Global Warning alert threshold saving
  const handleSaveThreshold = (valStr: string) => {
    const val = parseInt(valStr);
    if (isNaN(val) || val <= 0 || val > 100) return;
    setAlertThreshold(val);
    onUpdateSettings({
      ...settings,
      alertThresholdPercentage: val,
    });
  };

  // Overall Total Budget alarm warning threshold percentage
  const handleSaveOverallThreshold = (valStr: string) => {
    const val = parseInt(valStr);
    if (isNaN(val) || val <= 0 || val > 100) return;
    setOverallThreshold(val);
    onUpdateSettings({
      ...settings,
      overallThresholdPercentage: val,
    });
  };

  // Master Excel workbook export handler
  const handleExportToExcel = () => {
    try {
      const filteredExpenses = parseAndTimeframeFilter(
        expenses,
        timeframeInput,
      );
      if (filteredExpenses.length === 0) {
        alert(
          "No transactions identified in the chosen timeframe prefix filter: " +
            timeframeInput,
        );
        return;
      }

      const txRows = filteredExpenses.map((e) => ({
        ID: e.id,
        Date: e.date,
        Amount: e.amount,
        Type: e.transactionType || "Expense",
        Category: e.category,
        Subcategory: e.subcategory,
        PaymentMode: e.paymentMode,
        PartyName: e.personName || "N/A",
        Notes: e.notes || "",
      }));
      const wsTx = XLSX.utils.json_to_sheet(txRows);

      const incomeRows = filteredExpenses
        .filter((e) => e.transactionType === "Income")
        .map((e) => ({
          Date: e.date,
          Category: e.category,
          Subcategory: e.subcategory,
          AmountSpent: e.amount,
          Mode: e.paymentMode,
          Description: e.notes || "",
        }));
      const wsInc = XLSX.utils.json_to_sheet(incomeRows);

      const expenseRows = filteredExpenses
        .filter((e) => e.transactionType === "Expense")
        .map((e) => ({
          Date: e.date,
          Category: e.category,
          Subcategory: e.subcategory,
          AmountSpent: e.amount,
          Mode: e.paymentMode,
          Description: e.notes || "",
        }));
      const wsExp = XLSX.utils.json_to_sheet(expenseRows);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsTx, "Transactions");
      XLSX.utils.book_append_sheet(wb, wsInc, "Income_Records");
      XLSX.utils.book_append_sheet(wb, wsExp, "Expense_Records");

      XLSX.writeFile(
        wb,
        `Finance_Ledger_Report_${timeframeInput.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`,
      );
      onTriggerNotification(
        "Excel Generated",
        `Master Spreadsheet exported for ${timeframeInput}.`,
      );
    } catch (e) {
      console.error(e);
      alert("Error building excel workbook.");
    }
  };

  // Excel import handler
  const handleImportExcelFile = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json<any>(
          workbook.Sheets[firstSheetName],
        );

        if (rows.length === 0) {
          alert("Sheets appears blank or unreadable.");
          return;
        }

        const importedExpenses: VirtualExpense[] = [];
        rows.forEach((row, idx) => {
          const parsedAmount = parseFloat(
            row.Amount || row.AmountSpent || row.AmountReceived || "0",
          );
          if (parsedAmount > 0) {
            importedExpenses.push({
              id: `imp_ex_${Date.now()}_${idx}`,
              date: row.Date || new Date().toISOString().substring(0, 10),
              amount: parsedAmount,
              category: row.Category || "Miscellaneous",
              subcategory: row.Subcategory || "General Expenses",
              notes: row.Notes || row.Description || "Excel ledger import",
              paymentMode: (row.PaymentMode || row.Mode || "Cash") as any,
              transactionType: (row.Type || "Expense") as any,
              personName: row.PartyName || row.Partner || undefined,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        });

        if (importedExpenses.length > 0) {
          const merged = [...importedExpenses, ...expenses];
          DbSim.saveExpenses(merged);
          onTriggerNotification(
            "Merged",
            `Successfully recorded ${importedExpenses.length} log transactions.`,
          );
          alert(
            `Successfully loaded ${importedExpenses.length} transactions from Excel workbook!`,
          );
          window.location.reload();
        } else {
          alert('Unable to identify standard columns "Amount" or "Category".');
        }
      } catch (err) {
        console.error(err);
        alert("File read failure.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Executive printable state summary report
  const handleExportToPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert(
        "Pop-up display is blocked. Permit permission to print report PDF.",
      );
      return;
    }

    const filteredExpenses = parseAndTimeframeFilter(expenses, timeframeInput);
    const earned = filteredExpenses
      .filter((e) => e.transactionType === "Income")
      .reduce((s, e) => s + e.amount, 0);
    const spent = filteredExpenses
      .filter((e) => e.transactionType === "Expense")
      .reduce((s, e) => s + e.amount, 0);
    const lent = filteredExpenses
      .filter((e) => e.transactionType === "LoanGiven")
      .reduce((s, e) => s + e.amount, 0);
    const borrowed = filteredExpenses
      .filter((e) => e.transactionType === "LoanTaken")
      .reduce((s, e) => s + e.amount, 0);

    const userName = settings.userName || "Account User";

    printWindow.document.write(`
      <html>
        <head>
          <title>${userName} - Budget Balance Audit</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
            .h { border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            h1 { font-size: 20px; margin: 0; color: #1e1b4b; text-transform: uppercase; }
            .m { font-size: 11px; color: #64748b; }
            .grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; border-left: 4px solid #4f46e5; }
            .card-lbl { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .card-val { font-size: 16px; font-weight: 800; margin-top: 5px; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; padding: 8px 10px; font-size: 10px; text-transform: uppercase; text-align: left; }
            td { padding: 8px 10px; font-size: 11px; border-bottom: 1px solid #e2e8f0; }
            .rx { text-align: right; }
            .col-in { color: #10b981; font-weight: bold; }
            .col-ex { color: #ef4444; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="h">
            <div>
              <h1>Financial Wealth Statement Analysis</h1>
              <div class="m">Audit for account owner: ${userName} &middot; Chosen Timeframe: ${timeframeInput}</div>
            </div>
            <div style="font-size: 10px; font-weight: bold; color: #4f46e5;">WALLET_SYSTEM_REPORT</div>
          </div>
          <div class="grid">
            <div class="card" style="border-left-color: #10b981;">
              <div class="card-lbl">Available Balance</div>
              <div class="card-val">${currencySymbol} ${(earned - spent - lent + borrowed).toLocaleString()}</div>
            </div>
            <div class="card" style="border-left-color: #3b82f6;">
              <div class="card-lbl">Total Income</div>
              <div class="card-val">${currencySymbol} ${earned.toLocaleString()}</div>
            </div>
            <div class="card" style="border-left-color: #ef4444;">
              <div class="card-lbl">Total Spending</div>
              <div class="card-val">${currencySymbol} ${spent.toLocaleString()}</div>
            </div>
            <div class="card" style="border-left-color: #f59e0b;">
              <div class="card-lbl">Lent Receivables</div>
              <div class="card-val">${currencySymbol} ${lent.toLocaleString()}</div>
            </div>
          </div>
          <h2 style="font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 20px;">Transactions Log (First 150 items)</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Channel Mode</th>
                <th>Partner</th>
                <th class="rx">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredExpenses
                .slice(0, 150)
                .map((e) => {
                  const isIn = e.transactionType === "Income";
                  return `
                  <tr>
                    <td>${e.date}</td>
                    <td style="text-transform: uppercase; font-weight: bold">${e.transactionType || "Expense"}</td>
                    <td>${e.category}</td>
                    <td>${e.subcategory}</td>
                    <td>${e.paymentMode}</td>
                    <td>${e.personName || "N/A"}</td>
                    <td class="rx ${isIn ? "col-in" : "col-ex"}">${isIn ? "+" : "-"} ${currencySymbol} ${e.amount.toLocaleString()}</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
          <p style="text-align: center; color: #94a3b8; font-size: 9px; margin-top: 50px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
            This statement was generated instantly using browser local database index repositories. Safeguarded under personal credentials.
          </p>
          <script>window.print();</script>
        </body>
      </html>
    `);
  };

  const handleShareAction = () => {
    try {
      const filtered = parseAndTimeframeFilter(expenses, timeframeInput);
      const spent = filtered
        .filter((e) => e.transactionType === "Expense")
        .reduce((s, e) => s + e.amount, 0);
      const summaryText = `📊 Rupee Ledger Report:\n- Filter: ${timeframeInput}\n- Ledger logs: ${filtered.length}\n- Monthly spendings: ₹${spent.toLocaleString()}`;

      if (navigator.share) {
        navigator
          .share({
            title: "Rupee Wallet Statement",
            text: summaryText,
          })
          .catch(() => {});
      } else {
        navigator.clipboard.writeText(summaryText);
        onTriggerNotification(
          "✓ Share Prepared",
          "Statement overview summary copied to clipboard!",
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Safe PIN lock changes
  const handlePinUpdate = () => {
    setPinError("");
    setPinSuccess(false);

    if (oldPin !== settings.pin) {
      setPinError("Existing security PIN is incorrect");
      return;
    }
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      setPinError("New PIN must be 4 digits numeric");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("Confirmation code does not match");
      return;
    }

    onUpdateSettings({
      ...settings,
      pin: newPin,
      pinHint: customPinHint || "Ascending sequence digits",
      isPinSet: true,
    });
    setPinSuccess(true);
    setOldPin("");
    setNewPin("");
    setConfirmPin("");
    onTriggerNotification(
      "PIN Updated",
      "Your device terminal entry block PIN security has been successfully modified.",
    );
    setTimeout(() => {
      setPinChangeOpen(false);
      setPinSuccess(false);
    }, 2000);
  };

  // Wipe Simulated Database
  const handleWipeDatabase = () => {
    DbSim.resetToDefault();
    onTriggerNotification(
      "Database Reset",
      "Simulated system database initialized to original defaults.",
    );
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // JSON Ingress/Egress Backups
  const handleDownloadBackupFile = () => {
    const rawData = DbSim.generateBackupData();
    const blob = new Blob([rawData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rupee_app_database_dump_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onTriggerNotification(
      "JSON Exported",
      "A clean system fallback backup file downloaded successfully.",
    );
  };

  const handleImportBackupFile = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = DbSim.restoreBackupData(content);
      if (success) {
        alert(
          "All master database payload elements loaded from fallback. App is rebooting...",
        );
        window.location.reload();
      } else {
        alert("Malformed database backup JSON file.");
      }
    };
    reader.readAsText(file);
  };

  // Google Drive Simulation Backup
  const handleBackupToDrive = () => {
    try {
      const rawData = DbSim.generateBackupData();
      localStorage.setItem("rupee_app_drive_backup_ledgers", rawData);
      onTriggerNotification(
        "Drive Synced ✓",
        "Successfully synchronized and backed up SQLite database ledger to Google Drive ledger cloud.",
      );
    } catch (err) {
      onTriggerNotification(
        "Backup Failed",
        "Google Drive cloud backup failed.",
      );
    }
  };

  const handleRestoreFromDrive = () => {
    const backupData = localStorage.getItem("rupee_app_drive_backup_ledgers");
    if (!backupData) {
      alert(
        "No Google Drive backup ledger found. Please create a backup to Drive first!",
      );
      return;
    }
    const success = DbSim.restoreBackupData(backupData);
    if (success) {
      onTriggerNotification(
        "Drive Restored ✓",
        "Successfully restored SQLite database entries from Google Drive cloud.",
      );
      setTimeout(() => {
        alert(
          "All master database elements loaded from Google Drive. App is rebooting...",
        );
        window.location.reload();
      }, 500);
    } else {
      alert("Corrupt or invalid backup payload detected in cloud.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full bg-slate-50 dark:bg-slate-900 px-4 py-4 space-y-2 scrollbar-none font-sans relative text-xs text-slate-700">
      {/* Dynamic Header */}
      <div className="flex items-center gap-1.5 border-b border-indigo-950/20 pb-2">
        <Settings className="h-4 w-4 text-[#4f46e5] dark:text-indigo-400" />
        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">
          SYSTEM CONFIGURATION PANEL
        </span>
      </div>

      {/* BLOCK 1: OVERALL TOTAL BUDGET WARNING LIMIT */}
      <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="space-y-1">
          <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider font-mono">
            OVERALL EXPENSE BUDGET WARNING LIMIT
          </h3>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">
            Triggers warning on home dashboard budget monitor once combined monthly usage exceeds this ratio.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <input
              type="range"
              min={40}
              max={100}
              step={5}
              value={overallThreshold}
              onChange={(e) => handleSaveOverallThreshold(e.target.value)}
              className="flex-1 cursor-pointer"
            />
            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-[#4f46e5] dark:text-indigo-300 font-extrabold font-mono text-[10px] px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/40 min-w-[45px] text-center">
              {overallThreshold}%
            </span>
          </div>
        </div>
      </div>

      {/* BLOCK 1B: SYSTEM THEME PREFERENCE CONTROLLER */}
      <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
        <div className="flex justify-between items-center pb-1">
          <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider font-mono">
            Application Theme / UI Style
          </h3>
          <span className="bg-indigo-50 dark:bg-indigo-950/40 text-[#4f46e5] dark:text-indigo-300 font-extrabold font-mono text-[8px] px-1.5 py-0.5 rounded uppercase border border-indigo-100 dark:border-indigo-900/40">
            Active: {settings.themePreference || (settings.darkMode ? "dark" : "light")}
          </span>
        </div>
        <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">
          Select light or dark user-interface colors, or let the app synchronize automatically with your device settings.
        </p>
        <div className="grid grid-cols-3 gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-100 dark:border-slate-800/80">
          {[
            { id: "light" as const, name: "Light" },
            { id: "dark" as const, name: "Dark" },
            { id: "system" as const, name: "System" },
          ].map((t) => {
            const currentPref = settings.themePreference || (settings.darkMode ? "dark" : "light");
            const isSelected = settings.themePreference === t.id || (t.id === 'light' && !settings.themePreference && !settings.darkMode) || (t.id === 'dark' && !settings.themePreference && settings.darkMode);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  const isPrefDark = t.id === 'dark' || (t.id === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  onUpdateSettings({
                    ...settings,
                    themePreference: t.id,
                    darkMode: isPrefDark,
                  });
                  onTriggerNotification(
                    "Theme Style Updated",
                    `Primary user preference has been updated to ${t.name} interface theme.`
                  );
                }}
                className={`py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border cursor-pointer text-center flex items-center justify-center ${
                  isSelected
                    ? "bg-[#4f46e5] text-white border-indigo-500/20 shadow-xs"
                    : "bg-transparent text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-500"
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* BLOCK 2: Category Master Section (Creation, Checking, Modifying Categories) */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3.5">
        {/* Collapsible Section Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
          <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
            <FolderPlus className="h-3.5 w-3.5 text-[#4f46e5] dark:text-indigo-400" />{" "}
            CATEGORY & BUDGET CONTROL
          </h3>
          <button
            onClick={() => setIsCategoryListCollapsed(!isCategoryListCollapsed)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-755 text-[#4f46e5] dark:text-indigo-400 font-bold font-mono text-[9px] rounded-lg border border-slate-150 dark:border-slate-700 cursor-pointer transition-colors"
          >
            Modify Category
          </button>
        </div>

        <AnimatePresence initial={false}>
          {!isCategoryListCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              {/* 2a. Category Creation Block */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-150 dark:border-slate-800/80">
                <h4 className="text-[9px] font-extrabold uppercase text-[#4f46e5] dark:text-indigo-400 tracking-wider font-mono">
                  Create New Category
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[8.5px] text-slate-400 block font-bold font-mono uppercase">
                      Category Name
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Subscriptions"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full bg-slate-900 p-2 rounded-lg border border-slate-700 outline-none font-bold text-xs text-white placeholder-slate-450 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <span className="text-[8.5px] text-slate-400 block font-bold font-mono uppercase">
                      Allocation Flow
                    </span>
                    <div className="grid grid-cols-2 gap-1 mt-0.5">
                      <button
                        onClick={() => setNewCatType("expense")}
                        className={`py-1.5 rounded-lg text-[8.5px] font-bold uppercase font-mono border transition-all cursor-pointer ${
                          newCatType === "expense"
                            ? "bg-[#4f46e5] border-[#4f46e5] text-white"
                            : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-750"
                        }`}
                      >
                        Expense
                      </button>
                      <button
                        onClick={() => setNewCatType("income")}
                        className={`py-1.5 rounded-lg text-[8.5px] font-bold uppercase font-mono border transition-all cursor-pointer ${
                          newCatType === "income"
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-750"
                        }`}
                      >
                        Income
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[8.5px] text-slate-400 block font-bold font-mono uppercase">
                      Subcategory
                    </span>
                    <input
                      type="text"
                      placeholder="Netflix, Spotify, Prime"
                      value={newCatSubcats}
                      onChange={(e) => setNewCatSubcats(e.target.value)}
                      className="w-full bg-slate-900 p-2 rounded-lg border border-slate-700 outline-none text-[10px] text-white placeholder-slate-450 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <span className="text-[8.5px] text-slate-400 block font-bold font-mono uppercase">
                      Monthly Budget ({currencySymbol})
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      disabled={newCatType === "income"}
                      value={newCatBudget}
                      onChange={(e) => setNewCatBudget(e.target.value)}
                      className="w-full bg-slate-900 p-2 rounded-lg border border-slate-700 outline-none font-bold font-mono text-[10px] disabled:opacity-30 text-white placeholder-slate-450 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Slider for threshold limit just for expense categories */}
                {newCatType === "expense" && (
                  <div className="space-y-1 bg-white/20 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-150 dark:border-slate-800/80 mt-1">
                    <div className="flex justify-between items-center text-[8.5px] font-mono font-bold">
                      <span className="text-slate-400 uppercase">
                        Warning Trigger Alert Threshold
                      </span>
                      <span className="text-indigo-650 dark:text-indigo-400 font-black">
                        {newCatThreshold}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={40}
                        max={100}
                        step={5}
                        value={newCatThreshold}
                        onChange={(e) =>
                          setNewCatThreshold(parseInt(e.target.value))
                        }
                        className="flex-1 accent-[#5B4CFF] cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCreateCategorySubmit}
                  className="w-full py-2 bg-[#4f46e5] hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-widest font-mono rounded-lg transition-colors cursor-pointer"
                >
                  + Add New Category
                </button>
              </div>

              {/* 2b. Checking and Modifying Category List grouped into distinct dropdown directories */}
              <div className="space-y-2.5 pt-1 border-t border-slate-200 dark:border-slate-800 mt-4">
                <div
                  onClick={() =>
                    setIsEntriesListCollapsed(!isEntriesListCollapsed)
                  }
                  className="flex justify-between items-center text-slate-400 dark:text-slate-350 select-none py-1.5 cursor-pointer hover:text-indigo-500 dark:hover:text-indigo-400"
                >
                  <span className="font-extrabold text-[11px] tracking-wider font-mono">
                    CATEGORIES
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEntriesListCollapsed(!isEntriesListCollapsed);
                    }}
                    className="px-3 py-1 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-[#5B4CFF] dark:text-indigo-400 border border-slate-300 dark:border-slate-700/60 font-black text-[9px] uppercase font-mono rounded-lg transition-colors cursor-pointer"
                  >
                    {isEntriesListCollapsed ? "Expand" : "Collapse"}
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {!isEntriesListCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden pr-0.5"
                    >
                      {/* -- 1. EXPENSES DROP DOWN SECTION -- */}
                      <div className="space-y-2 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <div
                          onClick={() =>
                            setIsExpenseListOpen(!isExpenseListOpen)
                          }
                          className="flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                            <span className="font-black text-[10px] text-slate-500 dark:text-slate-400 tracking-wider font-mono uppercase">
                              EXPENSES
                            </span>
                            <span className="bg-rose-500/10 text-rose-500 text-[8px] font-mono px-2 py-0.5 rounded-full font-black">
                              {
                                categories.filter((c) => c.type !== "income")
                                  .length
                              }
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsExpenseListOpen(!isExpenseListOpen);
                            }}
                            className={`px-2.5 py-1 font-extrabold text-[8.5px] uppercase font-mono rounded-lg transition-all cursor-pointer border ${
                              isExpenseListOpen
                                ? "bg-[#5B4CFF] border-[#5B4CFF] text-white hover:bg-[#4d3fe0] shadow-sm"
                                : "bg-transparent hover:bg-slate-250 dark:hover:bg-slate-800 text-[#5B4CFF] dark:text-indigo-400 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {isExpenseListOpen ? "Collapse" : "Edit / Modify"}
                          </button>
                        </div>

                        <AnimatePresence initial={false}>
                          {isExpenseListOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{
                                opacity: 1,
                                height: "auto",
                                marginTop: 8,
                              }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-3 overflow-hidden"
                            >
                              {categories.filter((c) => c.type !== "income")
                                .length === 0 ? (
                                <p className="text-[9px] text-slate-400 italic text-center py-2 font-mono">
                                  No custom expense categories.
                                </p>
                              ) : (
                                categories
                                  .filter((c) => c.type !== "income")
                                  .map((cat) => {
                                    const isOpen = expandedCatId === cat.id;
                                    const hasBudget = budgets.find(
                                      (b) => b.categoryName === cat.name,
                                    );
                                    const limitAmountStr = hasBudget
                                      ? `${currencySymbol}${hasBudget.limitAmount.toLocaleString()}`
                                      : "NONE";

                                    return (
                                      <div key={cat.id} className="space-y-1">
                                        {/* Main card */}
                                        <div
                                          onClick={() =>
                                            setExpandedCatId(
                                              isOpen ? null : cat.id,
                                            )
                                          }
                                          className="bg-white dark:bg-slate-800/85 rounded-2xl p-4 flex items-center justify-between cursor-pointer shadow-sm hover:opacity-95 transition-all text-slate-800 dark:text-slate-100 border border-slate-150/40 dark:border-slate-700/50"
                                        >
                                          <div className="flex flex-col gap-1 items-start">
                                            <span className="font-extrabold font-mono tracking-widest text-[#1E293B] dark:text-slate-200 text-[12px] uppercase">
                                              {cat.name}
                                            </span>
                                            <span className="text-[9px] text-[#94A3B8] font-mono tracking-wide">
                                              {cat.subcategories.length === 1
                                                ? "1 active subcategory tag"
                                                : `${cat.subcategories.length} active subcategory tags`}
                                            </span>
                                          </div>

                                          <div className="flex flex-col items-end gap-1 text-right justify-center">
                                            <div className="flex items-center gap-1">
                                              <span className="text-[8px] uppercase font-black text-slate-400 font-mono tracking-wider">
                                                LIMIT:
                                              </span>
                                              <span
                                                className={`font-black font-mono text-[11.5px] ${hasBudget ? "text-[#5B4CFF] dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`}
                                              >
                                                {limitAmountStr}
                                              </span>
                                            </div>

                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedCatId(
                                                  isOpen ? null : cat.id,
                                                );
                                              }}
                                              className={`px-2.5 py-1 text-[8.5px] font-extrabold rounded-full tracking-wider uppercase cursor-pointer transition-all ${
                                                isOpen
                                                  ? "bg-[#5B4CFF] border-[#5B4CFF] text-white hover:bg-[#4d3fe0] shadow-sm"
                                                  : "bg-indigo-50 dark:bg-indigo-950/45 border border-indigo-150/50 dark:border-indigo-900/60 text-[#5B4CFF] dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                                              }`}
                                            >
                                              {isOpen ? "Collapse" : "Edit"}
                                            </button>
                                          </div>
                                        </div>

                                        {/* Expanded sub-section */}
                                        <AnimatePresence>
                                          {isOpen && (
                                            <motion.div
                                              initial={{
                                                height: 0,
                                                opacity: 0,
                                                marginTop: 0,
                                              }}
                                              animate={{
                                                height: "auto",
                                                opacity: 1,
                                                marginTop: 4,
                                              }}
                                              exit={{
                                                height: 0,
                                                opacity: 0,
                                                marginTop: 0,
                                              }}
                                              className="bg-[#0D152D]/95 rounded-2xl border border-[#1E2B4B] p-3 px-3 text-[10px] space-y-4 overflow-hidden shadow-inner font-mono text-slate-200"
                                            >
                                              {/* Budget limit section */}
                                              <div className="space-y-2">
                                                <span className="text-[8.5px] text-[#A7B1C2] font-black uppercase block font-mono tracking-wider">
                                                  MONTHLY BUDGET (
                                                  {currencySymbol})
                                                </span>
                                                <div className="flex gap-1.5 items-center w-full">
                                                  <div className="w-[82px] min-w-[82px]">
                                                    <input
                                                      type="number"
                                                      placeholder="3000"
                                                      value={
                                                        categoryBudgetInputs[
                                                          cat.name
                                                        ] ??
                                                        (hasBudget
                                                          ? hasBudget.limitAmount
                                                          : "")
                                                      }
                                                      onChange={(e) => {
                                                        const val =
                                                          e.target.value;
                                                        setCategoryBudgetInputs(
                                                          (prev) => ({
                                                            ...prev,
                                                            [cat.name]: val,
                                                          }),
                                                        );
                                                      }}
                                                      className="w-full bg-[#050B18] border border-[#1E2B4B] px-1 py-1.5 rounded-lg text-white font-mono font-bold text-xs outline-none focus:border-indigo-500 text-center"
                                                    />
                                                  </div>
                                                  <button
                                                    onClick={() => {
                                                      const val =
                                                        categoryBudgetInputs[
                                                          cat.name
                                                        ] ??
                                                        (hasBudget
                                                          ? hasBudget.limitAmount.toString()
                                                          : "");
                                                      handleUpdateCategoryBudget(
                                                        cat.name,
                                                        val,
                                                      );
                                                      onTriggerNotification(
                                                        "Limit Adjusted",
                                                        `Category "${cat.name}" has been modified to ${currencySymbol}${parseFloat(val).toLocaleString() || "None"}`,
                                                      );
                                                    }}
                                                    className="flex-1 bg-[#5B4CFF] hover:bg-[#4d3fe0] text-white rounded-lg font-bold py-1.5 text-[9px] font-mono uppercase tracking-wider cursor-pointer transition-colors text-center whitespace-nowrap px-1"
                                                  >
                                                    Save Limit
                                                  </button>
                                                </div>
                                              </div>

                                              {/* Alert Threshold Warning */}
                                              <div className="space-y-1.5 border-t border-[#1E2B4B] pt-3.5">
                                                <div className="flex justify-between items-center text-[8.5px] font-mono font-bold tracking-wider">
                                                  <span className="text-[#A7B1C2] uppercase flex items-center gap-1">
                                                    ⚠️ ALERT THRESHOLD
                                                  </span>
                                                  <span className="bg-[#1E1B4B] text-indigo-300 border border-[#2E288F] text-[9.5px] font-mono px-2 py-0.5 rounded-full font-black">
                                                    {settings
                                                      .categoryThresholds?.[
                                                      cat.name
                                                    ] ||
                                                      settings.alertThresholdPercentage ||
                                                      80}
                                                    %
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <input
                                                    type="range"
                                                    min={40}
                                                    max={100}
                                                    step={5}
                                                    value={
                                                      settings
                                                        .categoryThresholds?.[
                                                        cat.name
                                                      ] ||
                                                      settings.alertThresholdPercentage ||
                                                      80
                                                    }
                                                    onChange={(e) =>
                                                      handleUpdateCategoryThreshold(
                                                        cat.name,
                                                        e.target.value,
                                                      )
                                                    }
                                                    className="flex-1 accent-[#5B4CFF] cursor-pointer h-2 bg-[#050B18] rounded-lg"
                                                  />
                                                </div>
                                                <p className="text-[8px] text-[#A7B1C2]/60 font-mono italic">
                                                  Adjust color warn point for{" "}
                                                  {cat.name} (fallback:{" "}
                                                  {settings.alertThresholdPercentage ||
                                                    85}
                                                  %).
                                                </p>
                                              </div>

                                              {/* Subcategory tag lists container */}
                                              <div className="space-y-3 border-t border-[#1E2B4B] pt-3.5">
                                                <span className="text-[8.5px] text-[#A7B1C2] font-black uppercase block font-mono tracking-wider">
                                                  TAGS
                                                </span>
                                                <div className="flex flex-wrap gap-1.5 pb-1">
                                                  {cat.subcategories.map(
                                                    (sub) => (
                                                      <div
                                                        key={sub}
                                                        className="flex items-center gap-1 bg-[#050B18] border border-[#1E2B4B] px-3 py-1 rounded-md font-semibold font-mono"
                                                      >
                                                        <span className="text-white text-[9.5px]">
                                                          {sub}
                                                        </span>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteSubcatInline(
                                                              cat.id,
                                                              sub,
                                                              cat.name,
                                                            );
                                                          }}
                                                          className="text-red-400 hover:text-red-500 font-black ml-1 text-[10.5px] cursor-pointer"
                                                          title="Delete Tag"
                                                        >
                                                          ×
                                                        </button>
                                                      </div>
                                                    ),
                                                  )}
                                                  {cat.subcategories.length ===
                                                    0 && (
                                                    <p className="text-[9px] italic text-[#A7B1C2]/40 font-mono">
                                                      No active tags registered
                                                      yet.
                                                    </p>
                                                  )}
                                                </div>

                                                {/* Add subcategory tag row */}
                                                <div className="flex gap-2 pt-1.5">
                                                  <input
                                                    type="text"
                                                    placeholder="Add subcategory tag (e.g. Fast Food)"
                                                    value={
                                                      inlineSubcatInputs[
                                                        cat.id
                                                      ] || ""
                                                    }
                                                    onChange={(e) =>
                                                      setInlineSubcatInputs(
                                                        (prev) => ({
                                                          ...prev,
                                                          [cat.id]:
                                                            e.target.value,
                                                        }),
                                                      )
                                                    }
                                                    className="flex-1 bg-[#050B18] p-2 rounded-lg border border-[#1E2B4B] text-[10px] font-medium outline-none text-white placeholder-[#A7B1C2]/45 font-mono"
                                                    onKeyDown={(e) => {
                                                      if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        handleAddSubcatInline(
                                                          cat.id,
                                                          cat.name,
                                                        );
                                                      }
                                                    }}
                                                  />
                                                  <button
                                                    onClick={() =>
                                                      handleAddSubcatInline(
                                                        cat.id,
                                                        cat.name,
                                                      )
                                                    }
                                                    className="bg-[#10B981] hover:bg-emerald-600 text-white select-none px-4 py-1.5 rounded-lg font-black text-[10px] font-mono uppercase cursor-pointer transition-colors"
                                                  >
                                                    + Tag
                                                  </button>
                                                </div>
                                              </div>

                                              {/* Delete Category Purge line */}
                                              <div className="flex items-center justify-center pt-3 border-t border-[#1E2B4B] mt-2">
                                                {deleteConfirms[cat.id] ? (
                                                  <div className="flex flex-col items-center gap-1.5 w-full bg-[#3B0712]/40 p-2.5 rounded-lg border border-[#7F1D1D]/40">
                                                    <span className="text-[8.5px] text-red-200 font-extrabold font-mono tracking-wider">
                                                      PURGE CATEGORY & ALL TAGS?
                                                    </span>
                                                    <div className="flex items-center gap-2 font-mono">
                                                      <button
                                                        onClick={() => {
                                                          const updatedCategories =
                                                            categories.filter(
                                                              (c) =>
                                                                c.id !== cat.id,
                                                            );
                                                          onUpdateCategories(
                                                            updatedCategories,
                                                          );

                                                          const updatedBudgets =
                                                            budgets.filter(
                                                              (b) =>
                                                                b.categoryName !==
                                                                cat.name,
                                                            );
                                                          onUpdateBudgets(
                                                            updatedBudgets,
                                                          );

                                                          onTriggerNotification(
                                                            "Category Purged",
                                                            `Category "${cat.name}" has been removed completely.`,
                                                          );
                                                          setDeleteConfirms(
                                                            (prev) => {
                                                              const next = {
                                                                ...prev,
                                                              };
                                                              delete next[
                                                                cat.id
                                                              ];
                                                              return next;
                                                            },
                                                          );
                                                        }}
                                                        className="bg-red-650 hover:bg-red-705 text-white font-black px-2.5 py-1 rounded text-[8.5px] uppercase cursor-pointer"
                                                      >
                                                        YES, PURGE
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          setDeleteConfirms(
                                                            (prev) => ({
                                                              ...prev,
                                                              [cat.id]: false,
                                                            }),
                                                          );
                                                        }}
                                                        className="bg-[#050B18] hover:bg-slate-800 text-slate-300 border border-slate-700 font-extrabold px-2.5 py-1 rounded text-[8.5px] uppercase cursor-pointer"
                                                      >
                                                        NO
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <button
                                                    onClick={() => {
                                                      setDeleteConfirms(
                                                        (prev) => ({
                                                          ...prev,
                                                          [cat.id]: true,
                                                        }),
                                                      );
                                                    }}
                                                    className="text-red-500 hover:text-red-400 font-mono font-black uppercase text-[10px] flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                                                  >
                                                    <Trash2 className="h-3 w-3 text-red-500" />{" "}
                                                    Delete Category
                                                  </button>
                                                )}
                                              </div>
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

                      {/* -- 2. INCOME DROP DOWN SECTION -- */}
                      <div className="space-y-2 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <div
                          onClick={() => setIsIncomeListOpen(!isIncomeListOpen)}
                          className="flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-black text-[10px] text-slate-500 dark:text-slate-400 tracking-wider font-mono uppercase">
                              INCOME
                            </span>
                            <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-mono px-2 py-0.5 rounded-full font-black">
                              {
                                categories.filter((c) => c.type === "income")
                                  .length
                              }
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsIncomeListOpen(!isIncomeListOpen);
                            }}
                            className={`px-2.5 py-1 font-extrabold text-[8.5px] uppercase font-mono rounded-lg transition-all cursor-pointer border ${
                              isIncomeListOpen
                                ? "bg-[#5B4CFF] border-[#5B4CFF] text-white hover:bg-[#4d3fe0] shadow-sm"
                                : "bg-transparent hover:bg-slate-250 dark:hover:bg-slate-800 text-[#5B4CFF] dark:text-indigo-400 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {isIncomeListOpen ? "Collapse" : "Edit / Modify"}
                          </button>
                        </div>

                        <AnimatePresence initial={false}>
                          {isIncomeListOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{
                                opacity: 1,
                                height: "auto",
                                marginTop: 8,
                              }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-3 overflow-hidden"
                            >
                              {categories.filter((c) => c.type === "income")
                                .length === 0 ? (
                                <p className="text-[9px] text-slate-400 italic text-center py-2 font-mono">
                                  No custom income categories.
                                </p>
                              ) : (
                                categories
                                  .filter((c) => c.type === "income")
                                  .map((cat) => {
                                    const isOpen = expandedCatId === cat.id;

                                    return (
                                      <div key={cat.id} className="space-y-1">
                                        {/* Main card */}
                                        <div
                                          onClick={() =>
                                            setExpandedCatId(
                                              isOpen ? null : cat.id,
                                            )
                                          }
                                          className="bg-white dark:bg-slate-800/85 rounded-2xl p-4 flex items-center justify-between cursor-pointer shadow-sm hover:opacity-95 transition-all text-slate-800 dark:text-slate-100 border border-slate-150/40 dark:border-slate-700/50"
                                        >
                                          <div className="flex flex-col gap-1 items-start">
                                            <span className="font-extrabold font-mono tracking-widest text-[#1E293B] dark:text-slate-200 text-[12px] uppercase">
                                              {cat.name}
                                            </span>
                                            <span className="text-[9px] text-[#94A3B8] font-mono tracking-wide">
                                              {cat.subcategories.length === 1
                                                ? "1 active subcategory tag"
                                                : `${cat.subcategories.length} active subcategory tags`}
                                            </span>
                                          </div>

                                          <div className="flex flex-col items-end gap-1 text-right justify-center">
                                            <div className="flex items-center gap-1">
                                              <span className="text-[8px] uppercase font-black text-slate-400 font-mono tracking-wider">
                                                TYPE:
                                              </span>
                                              <span className="font-mono text-[11.5px] font-black text-emerald-500">
                                                INCOME
                                              </span>
                                            </div>

                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedCatId(
                                                  isOpen ? null : cat.id,
                                                );
                                              }}
                                              className={`px-2.5 py-1 text-[8.5px] font-extrabold rounded-full tracking-wider uppercase cursor-pointer transition-all ${
                                                isOpen
                                                  ? "bg-[#5B4CFF] border-[#5B4CFF] text-white hover:bg-[#4d3fe0] shadow-sm"
                                                  : "bg-indigo-50 dark:bg-indigo-950/45 border border-indigo-150/50 dark:border-indigo-900/60 text-[#5B4CFF] dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                                              }`}
                                            >
                                              {isOpen ? "Collapse" : "Edit"}
                                            </button>
                                          </div>
                                        </div>

                                        {/* Expanded sub-section */}
                                        <AnimatePresence>
                                          {isOpen && (
                                            <motion.div
                                              initial={{
                                                height: 0,
                                                opacity: 0,
                                                marginTop: 0,
                                              }}
                                              animate={{
                                                height: "auto",
                                                opacity: 1,
                                                marginTop: 4,
                                              }}
                                              exit={{
                                                height: 0,
                                                opacity: 0,
                                                marginTop: 0,
                                              }}
                                              className="bg-[#0D152D]/95 rounded-2xl border border-[#1E2B4B] p-3 px-3 text-[10px] space-y-4 overflow-hidden shadow-inner font-mono text-slate-200"
                                            >
                                              {/* Subcategory tag lists container */}
                                              <div className="space-y-3">
                                                <span className="text-[8.5px] text-[#A7B1C2] font-black uppercase block font-mono tracking-wider">
                                                  TAGS
                                                </span>
                                                <div className="flex flex-wrap gap-1.5 pb-1">
                                                  {cat.subcategories.map(
                                                    (sub) => (
                                                      <div
                                                        key={sub}
                                                        className="flex items-center gap-1 bg-[#050B18] border border-[#1E2B4B] px-3 py-1 rounded-md font-semibold font-mono"
                                                      >
                                                        <span className="text-white text-[9.5px]">
                                                          {sub}
                                                        </span>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteSubcatInline(
                                                              cat.id,
                                                              sub,
                                                              cat.name,
                                                            );
                                                          }}
                                                          className="text-red-400 hover:text-red-500 font-black ml-1 text-[10.5px] cursor-pointer"
                                                          title="Delete Tag"
                                                        >
                                                          ×
                                                        </button>
                                                      </div>
                                                    ),
                                                  )}
                                                  {cat.subcategories.length ===
                                                    0 && (
                                                    <p className="text-[9px] italic text-[#A7B1C2]/40 font-mono">
                                                      No active tags registered
                                                      yet.
                                                    </p>
                                                  )}
                                                </div>

                                                {/* Add subcategory tag row */}
                                                <div className="flex gap-1.5 pt-1.5 items-center w-full">
                                                  <div className="flex-1 min-w-0">
                                                    <input
                                                      type="text"
                                                      placeholder="Add tag (e.g. Salary)"
                                                      value={
                                                        inlineSubcatInputs[
                                                          cat.id
                                                        ] || ""
                                                      }
                                                      onChange={(e) =>
                                                        setInlineSubcatInputs(
                                                          (prev) => ({
                                                            ...prev,
                                                            [cat.id]:
                                                              e.target.value,
                                                          }),
                                                        )
                                                      }
                                                      className="w-full bg-[#050B18] p-2 rounded-lg border border-[#1E2B4B] text-[10px] font-medium outline-none text-white placeholder-[#A7B1C2]/45 font-mono min-w-0"
                                                      onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                          e.preventDefault();
                                                          handleAddSubcatInline(
                                                            cat.id,
                                                            cat.name,
                                                          );
                                                        }
                                                      }}
                                                    />
                                                  </div>
                                                  <button
                                                    onClick={() =>
                                                      handleAddSubcatInline(
                                                        cat.id,
                                                        cat.name,
                                                      )
                                                    }
                                                    className="bg-[#10B981] hover:bg-emerald-600 text-white select-none px-3 py-2 rounded-lg font-black text-[9.5px] font-mono uppercase cursor-pointer transition-colors whitespace-nowrap"
                                                  >
                                                    + Tag
                                                  </button>
                                                </div>
                                              </div>

                                              {/* Delete Category Purge line */}
                                              <div className="flex items-center justify-center pt-3 border-t border-[#1E2B4B] mt-2">
                                                {deleteConfirms[cat.id] ? (
                                                  <div className="flex flex-col items-center gap-1.5 w-full bg-[#3B0712]/40 p-2.5 rounded-lg border border-[#7F1D1D]/40">
                                                    <span className="text-[8.5px] text-red-200 font-extrabold font-mono tracking-wider">
                                                      PURGE CATEGORY & ALL TAGS?
                                                    </span>
                                                    <div className="flex items-center gap-2 font-mono">
                                                      <button
                                                        onClick={() => {
                                                          const updatedCategories =
                                                            categories.filter(
                                                              (c) =>
                                                                c.id !== cat.id,
                                                            );
                                                          onUpdateCategories(
                                                            updatedCategories,
                                                          );

                                                          const updatedBudgets =
                                                            budgets.filter(
                                                              (b) =>
                                                                b.categoryName !==
                                                                cat.name,
                                                            );
                                                          onUpdateBudgets(
                                                            updatedBudgets,
                                                          );

                                                          onTriggerNotification(
                                                            "Category Purged",
                                                            `Category "${cat.name}" has been removed completely.`,
                                                          );
                                                          setDeleteConfirms(
                                                            (prev) => {
                                                              const next = {
                                                                ...prev,
                                                              };
                                                              delete next[
                                                                cat.id
                                                              ];
                                                              return next;
                                                            },
                                                          );
                                                        }}
                                                        className="bg-red-650 hover:bg-red-700 text-white font-black px-2.5 py-1 rounded text-[8.5px] uppercase cursor-pointer"
                                                      >
                                                        YES, PURGE
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          setDeleteConfirms(
                                                            (prev) => ({
                                                              ...prev,
                                                              [cat.id]: false,
                                                            }),
                                                          );
                                                        }}
                                                        className="bg-[#050B18] hover:bg-slate-800 text-slate-300 border border-slate-700 font-extrabold px-2.5 py-1 rounded text-[8.5px] uppercase cursor-pointer"
                                                      >
                                                        NO
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <button
                                                    onClick={() => {
                                                      setDeleteConfirms(
                                                        (prev) => ({
                                                          ...prev,
                                                          [cat.id]: true,
                                                        }),
                                                      );
                                                    }}
                                                    className="text-red-500 hover:text-red-400 font-mono font-black uppercase text-[10px] flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                                                  >
                                                    <Trash2 className="h-3 w-3 text-red-500" />{" "}
                                                    Delete Category
                                                  </button>
                                                )}
                                              </div>
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BLOCK 3: REPORTS & STATEMENT EXPORTER (Filtered, monthly/yearly wise dynamic selector) */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3.5">
        <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-indigo-500" /> REPORTS &
          STATEMENT EXPORTER
        </h3>

        <p className="text-[9px] text-slate-450 dark:text-slate-500 leading-normal">
          Filter your offline transaction database and generate print-ready
          statements. You can partition data by specific month, dynamic year, or
          export all records instantly.
        </p>

        {/* Timeframe Periods Input */}
        <div className="space-y-1">
          <span className="text-[8px] text-slate-400 dark:text-slate-400 font-mono font-bold uppercase tracking-wider block">
            TIMEFRAME PERIODS (COMMA-SEPARATED)
          </span>
          <input
            type="text"
            value={timeframeInput}
            onChange={(e) => setTimeframeInput(e.target.value)}
            placeholder="e.g. 2026-06, 2026-05"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 px-3 py-2 text-xs font-bold font-mono rounded-xl text-indigo-600 dark:text-indigo-400 outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Quick-Toggle Month Selection Tags */}
        <div className="space-y-1.5">
          <span className="text-[8px] text-slate-400 dark:text-slate-400 font-mono font-bold uppercase tracking-wider block">
            QUICK-TOGGLE MONTHS :
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "June 26", val: "2026-06" },
              { label: "May 26", val: "2026-05" },
              { label: "April 26", val: "2026-04" },
              { label: "March 26", val: "2026-03" },
              { label: "Full 2026", val: "2026" },
              { label: "Lifetime", val: "lifetime" },
            ].map((p) => {
              const isSelected = activeTimeframePills.includes(p.val);
              return (
                <button
                  key={p.val}
                  onClick={() => handleTogglePill(p.val)}
                  className={`text-[9px] font-bold py-1 px-2.5 rounded-full border transition-all cursor-pointer font-sans ${
                    isSelected
                      ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 font-extrabold"
                      : "bg-white border-slate-150 dark:bg-slate-800 dark:border-slate-75 * text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {isSelected ? "✓ " : "+ "}
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Export format tabs selector */}
        <div className="space-y-1">
          <span className="text-[8px] text-slate-400 dark:text-slate-400 font-mono font-bold uppercase tracking-wider block">
            EXPORT FORMAT TYPE
          </span>
          <div className="grid grid-cols-2 gap-1 bg-slate-50 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => setExportFormat("pdf")}
              className={`py-1.5 text-[8.5px] font-mono font-black uppercase text-center rounded-lg transition-all cursor-pointer border ${
                exportFormat === "pdf"
                  ? "bg-[#4f46e5] text-white border-indigo-500/20 shadow-xs"
                  : "bg-transparent text-slate-400 border-transparent hover:text-slate-500"
              }`}
            >
              PDF DOCUMENT (.PDF)
            </button>
            <button
              onClick={() => setExportFormat("excel")}
              className={`py-1.5 text-[8.5px] font-mono font-black uppercase text-center rounded-lg transition-all cursor-pointer border ${
                exportFormat === "excel"
                  ? "bg-[#4f46e5] text-white border-indigo-500/20 shadow-xs"
                  : "bg-transparent text-slate-400 border-transparent hover:text-slate-500"
              }`}
            >
              EXCEL SPREADSHEET (.CSV)
            </button>
          </div>
        </div>

        {/* Export & share action layouts side-by-side matches screenshot style */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Main Action Exporter trigger */}
          <button
            onClick={
              exportFormat === "pdf" ? handleExportToPDF : handleExportToExcel
            }
            className="flex py-2.5 bg-[#4f46e5] hover:bg-indigo-700 active:scale-95 text-white rounded-xl items-center justify-center gap-1.5 text-[10px] font-black uppercase font-mono cursor-pointer transition-all border border-indigo-500/10 shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-white/90" /> EXPORT
          </button>

          {/* Share Trigger Action */}
          <button
            onClick={handleShareAction}
            className="flex py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 active:scale-95 text-slate-700 dark:text-slate-200 rounded-xl items-center justify-center gap-1.5 text-[10px] font-black uppercase font-mono cursor-pointer transition-all border border-slate-200 dark:border-slate-700/80 shadow-xs"
          >
            <Check className="h-4 w-4 text-slate-500 dark:text-slate-400" />{" "}
            SHARE
          </button>
        </div>
      </div>

      {/* BLOCK 4: Entry Security settings PIN lock & wipes */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5 text-indigo-500" /> Modify PIN Lock
          </h3>
          <button
            onClick={() => setPinChangeOpen(!pinChangeOpen)}
            className="text-[9px] font-black text-[#4f46e5] hover:underline font-mono uppercase"
          >
            {pinChangeOpen ? "Lock Menu" : "Modify PIN"}
          </button>
        </div>
        <p className="text-[9.5px] text-slate-400 leading-normal">
          Secure your private finance records with a secure 4-digit lockout
          padlock code.
        </p>

        {pinChangeOpen && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-3 pt-4 border border-slate-200 dark:border-slate-800 animate-fade text-xs font-sans mt-2">
            {pinError && (
              <p className="text-[10px] text-rose-500 bg-rose-500/5 p-1 px-2 rounded font-bold">
                {pinError}
              </p>
            )}
            {pinSuccess && (
              <p className="text-[10px] text-emerald-500 bg-emerald-500/5 p-1 px-2 rounded font-extrabold font-mono">
                PIN SAVED SUCCESSFULLY ✓
              </p>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-0.5">
                <span className="text-[8.5px] text-slate-400 font-bold font-mono">
                  Old PIN
                </span>
                <SecurePinInput
                  value={oldPin}
                  onChange={setOldPin}
                  placeholder="••••"
                  className="w-full text-center p-2 rounded-lg bg-white dark:bg-slate-800 border focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-100 font-mono text-xs"
                />
              </div>
              <div className="space-y-0.5">
                <span className="text-[8.5px] text-slate-400 font-bold font-mono">
                  New PIN
                </span>
                <SecurePinInput
                  value={newPin}
                  onChange={setNewPin}
                  placeholder="••••"
                  className="w-full text-center p-2 rounded-lg bg-white dark:bg-slate-800 border focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-100 font-mono text-xs"
                />
              </div>
              <div className="space-y-0.5">
                <span className="text-[8.5px] text-slate-400 font-bold font-mono">
                  Confirm
                </span>
                <SecurePinInput
                  value={confirmPin}
                  onChange={setConfirmPin}
                  placeholder="••••"
                  className="w-full text-center p-2 rounded-lg bg-white dark:bg-slate-800 border focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-100 font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[8.5px] text-slate-400 font-bold">
                Custom Hint helper
              </span>
              <input
                type="text"
                value={customPinHint}
                onChange={(e) => setCustomPinHint(e.target.value)}
                placeholder="e.g. Year of graduation"
                className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg focus:border-indigo-500 outline-none"
              />
            </div>

            <button
              onClick={handlePinUpdate}
              className="w-full py-2 bg-[#4f46e5] hover:bg-indigo-700 text-white rounded-lg font-black uppercase font-mono tracking-wide text-[9px] transition-all cursor-pointer shadow-sm"
            >
              Update Security PIN
            </button>
          </div>
        )}
      </div>

      {/* GOOGLE DRIVE BACKUP TO DRIVE & RESTORE IN-APP PANEL */}
      <div className="bg-[#0D152D]/95 rounded-2xl border border-slate-800/80 p-4 space-y-3.5 shadow-lg mt-2 text-slate-200">
        <div className="flex justify-between items-center bg-[#070D1A]/50 -m-4 p-4 rounded-t-2xl border-b border-slate-800/60 mb-2">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-[#5B4CFF]" />
            <span className="text-[10px] font-black uppercase text-indigo-400 font-mono tracking-wider">
              GOOGLE DRIVE INTEGRATION
            </span>
          </div>
          <span className="text-[8px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
            Simulated
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3.5 pt-2">
          <button
            onClick={handleBackupToDrive}
            className="flex py-2.5 bg-[#4f46e5] hover:bg-indigo-700 active:scale-95 text-white rounded-xl items-center justify-center gap-1.5 text-[9px] font-black uppercase font-mono cursor-pointer transition-all border border-indigo-500/10 shadow-md"
          >
            <Cloud className="h-4 w-4 text-white/95" /> BACKUP TO DRIVE
          </button>

          <button
            onClick={handleRestoreFromDrive}
            className="flex py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-xl items-center justify-center gap-1.5 text-[9px] font-black uppercase font-mono cursor-pointer transition-all border border-slate-200 shadow-xs"
          >
            <Download className="h-4 w-4 text-slate-600" /> RESTORE BACKUP
          </button>
        </div>
      </div>

      {/* MOBILE INSTALLATION & DEVICE LOCK SECTION */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <Smartphone className="h-4 w-4 text-[#5B4CFF] dark:text-indigo-450" />
          <h3 className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider font-mono">
            MOBILE INSTALLATION & DEVICE LOCK
          </h3>
        </div>
        <p className="text-[9.5px] text-slate-400 leading-normal">
          Launch as a standalone program locked directly on your hardware and
          request a physical storage reservation.
        </p>

        <div className="space-y-2">
          {/* Box 1 (Launch Mode) */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 flex justify-between items-center">
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-black uppercase font-mono text-slate-400 tracking-wider">
                LAUNCH MODE
              </span>
              <span className="font-extrabold text-[11px] text-slate-700 dark:text-slate-250">
                Standalone App
              </span>
            </div>
            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[9px] font-mono tracking-wider font-extrabold">
              • STANDALONE
            </span>
          </div>

          {/* Box 2 (Hardware Persistence Lock) */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex justify-between items-center">
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-black uppercase font-mono text-slate-400 tracking-wider">
                HARDWARE PERSISTENCE LOCK
              </span>
              <span className="font-extrabold text-[11px] text-slate-700 dark:text-slate-250">
                Permanently Secured
              </span>
            </div>
            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[9px] font-mono tracking-wider font-extrabold">
              LOCKED
            </span>
          </div>

          {/* Alert check Box */}
          <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[9.5px] leading-relaxed flex items-start gap-1.5 font-sans font-medium">
            <span>✓</span>
            <span>
              Approved persistent storage lock. The device OS will prioritize
              and preserve this database forever, even when working fully
              offline without cellular connection.
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowMobileInstructions(!showMobileInstructions)}
          className="text-[#5B4CFF] dark:text-indigo-400 font-extrabold font-mono text-[9px] uppercase hover:underline cursor-pointer text-center block w-full pt-1"
        >
          View Mobile Setup Instructions 👁
        </button>

        {showMobileInstructions && (
          <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[9.5px] text-slate-500 space-y-2 leading-relaxed animate-fade">
            <p className="font-black font-mono text-[8px] text-indigo-400 uppercase tracking-widest">
              STEP-BY-STEP PWA INSTALLATION GUIDE:
            </p>
            <ol className="list-decimal pl-4 space-y-1.5 font-mono">
              <li>
                Tap your browser menu icon (usually three dots on Android
                Chrome, or the Share Sheet arrow on Safari iOS).
              </li>
              <li>
                Scroll down and select{" "}
                <span className="text-indigo-400 font-bold">
                  "Add to Home screen"
                </span>{" "}
                or{" "}
                <span className="text-indigo-400 font-bold">"Install App"</span>
                .
              </li>
              <li>
                Once installed, launch the app directly from your home screen
                icon.
              </li>
              <li>
                The browser chrome disappears and the application will run in a
                fast, standalone fullscreen native app sandbox!
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* RAW ACCESS DATABASE PAYLOAD SECTION */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs space-y-3.5">
        <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5 text-indigo-505 dark:text-indigo-400" />{" "}
          RAW ACCESS DATABASE PAYLOAD
        </h3>
        <p className="text-[9.5px] text-slate-400 leading-normal">
          Export your SQLite simulated schema database directly as raw JSON
          files or ingest an existing backup payload locally.
        </p>

        <div className="grid grid-cols-2 gap-2 text-[9px] font-mono uppercase font-black">
          <button
            onClick={handleDownloadBackupFile}
            className="p-2 py-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 rounded-xl text-center flex items-center justify-center gap-1 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all border border-slate-200 dark:border-slate-800"
          >
            <Download className="h-3.5 w-3.5 text-[#4f46e5] dark:text-indigo-400" />{" "}
            Export Payload
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 py-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 rounded-xl text-center flex items-center justify-center gap-1 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all border border-slate-200 dark:border-slate-800"
          >
            <Cloud className="h-3.5 w-3.5 text-emerald-505 dark:text-emerald-400" />{" "}
            Import Payload
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackupFile}
            accept=".json"
            className="hidden"
          />
        </div>

        {wipeConfirm ? (
          <div className="bg-rose-50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-250 dark:border-rose-905/40 space-y-2.5">
            <p className="text-[9px] text-red-650 dark:text-red-300 font-extrabold font-mono uppercase tracking-wide leading-relaxed text-center">
              ⚠️ ERASING DEVICE ROOT MEMORY! ARE YOU ABSOLUTELY SURE? THIS
              CANNOT BE UNDONE.
            </p>
            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono font-black uppercase text-center">
              <button
                onClick={handleWipeDatabase}
                className="py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer transition-all shadow-sm border border-red-500"
              >
                Confirm Erase
              </button>
              <button
                onClick={() => setWipeConfirm(false)}
                className="py-2 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer transition-all border dark:border-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setWipeConfirm(true)}
            className="w-full py-2.5 bg-red-950/20 hover:bg-red-950/30 dark:bg-red-950/20 text-red-500 rounded-xl text-[9px] font-black font-mono tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer border border-red-900/50"
          >
            <Trash2 className="h-3.5 w-3.5" /> PERMANENT RESET SQLITE DB
          </button>
        )}
      </div>
    </div>
  );
}

interface SecurePinInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

function SecurePinInput({
  value,
  onChange,
  placeholder = "••••",
  className,
}: SecurePinInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!value) {
      setDisplayValue("");
      return;
    }

    const stars = "★".repeat(value.length - 1);
    const lastChar = value[value.length - 1];
    setDisplayValue(stars + lastChar);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDisplayValue("★".repeat(value.length));
    }, 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    if (!inputVal) {
      onChange("");
      return;
    }

    if (inputVal.length < displayValue.length) {
      onChange(value.slice(0, inputVal.length));
      return;
    }

    const lastChar = inputVal[inputVal.length - 1];
    if (/[0-9]/.test(lastChar)) {
      const nextValue = (value + lastChar).slice(0, 4);
      onChange(nextValue);
    }
  };

  return (
    <input
      type="text"
      maxLength={4}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
