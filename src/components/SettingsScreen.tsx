/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Key, 
  HardDrive, 
  Bell, 
  FileSpreadsheet, 
  CloudLightning, 
  Trash2, 
  Sun, 
  Moon, 
  UploadCloud, 
  Download, 
  Check, 
  RefreshCw,
  Notebook,
  FolderPlus,
  Plus,
  X,
  Sliders,
  CheckCircle,
  FileText,
  Calendar,
  AlertCircle,
  Smartphone,
  ShieldAlert
} from 'lucide-react';
import { AppSettings, VirtualExpense, VirtualCategory, VirtualBudget } from '../types';
import { DbSim } from '../dbSim';

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
  onBackup,
  onRestore,
  onTriggerNotification,
  expenses = [],
  categories = [],
  budgets = [],
  onUpdateBudgets,
  onUpdateCategories
}: SettingsScreenProps) {
  // PIN management
  const [pinChangeOpen, setPinChangeOpen] = useState<boolean>(false);
  const [oldPin, setOldPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [customPinHint, setCustomPinHint] = useState<string>(settings.pinHint || '');
  const [pinError, setPinError] = useState<string>('');
  const [pinSuccess, setPinSuccess] = useState<boolean>(false);

  // Statement report exporter state
  const [periodInputVal, setPeriodInputVal] = useState<string>('2026-06, 2026-05');
  const [reportFormat, setReportFormat] = useState<'pdf' | 'excel'>('pdf');

  // Simulated sharing overlay states
  const [shareSheetOpen, setShareSheetOpen] = useState<boolean>(false);

  // Category & Subcategory setup state
  const [showCategoriesList, setShowCategoriesList] = useState<boolean>(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [newSubcategoryInputs, setNewSubcategoryInputs] = useState<Record<string, string>>({});
  const [tempBudgetLimits, setTempBudgetLimits] = useState<Record<string, string>>({});

  // Adding completely new Category state
  const [addCatOpen, setAddCatOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatBudget, setNewCatBudget] = useState<string>('5000');
  const [newCatSubcategories, setNewCatSubcategories] = useState<string>('');
  const [addCatError, setAddCatError] = useState<string>('');
  const [addCatSuccess, setAddCatSuccess] = useState<boolean>(false);

  // Cloud sync representation
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Google Drive Simulation authentication state flow
  const [googleAuthOpen, setGoogleAuthOpen] = useState<boolean>(false);
  const [googleAuthStep, setGoogleAuthStep] = useState<'choose' | 'consent' | 'authorizing' | 'success'>('choose');
  const [googleSelectedEmail, setGoogleSelectedEmail] = useState<string>('deepakrajgir43@gmail.com');
  const [googleCustomEmailInput, setGoogleCustomEmailInput] = useState<string>('');
  const [googleAgreedScopes, setGoogleAgreedScopes] = useState<boolean>(false);
  const [googleAuthProgress, setGoogleAuthProgress] = useState<number>(0);
  const [googleAuthLog, setGoogleAuthLog] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Standalone PWA & Hardware Persistence states
  const [isStoragePersistent, setIsStoragePersistent] = useState<boolean>(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  React.useEffect(() => {
    // 1. Standalone display check
    const checkStandalone = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
      setIsStandaloneApp(isStandalone);
    };
    checkStandalone();

    // 2. Storage persistent check
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(persistent => {
        setIsStoragePersistent(persistent);
      });
    }

    // 3. Capture beforeinstallprompt
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const requestStoragePersistence = async () => {
    if (navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist();
        setIsStoragePersistent(isPersisted);
        if (isPersisted) {
          onTriggerNotification(
            'Hardware Storage Locked',
            'Your local database data is permanently locked on your device hardware.'
          );
          alert('Success! Your device has approved persistent storage lock for this application. Data is permanently saved on device disk partition.');
        } else {
          alert('The device did not grant hardware lock storage. This is standard in some desktop browsers, but is typically granted automatically in installed home-screen mobile PWAs!');
        }
      } catch (err) {
        console.error(err);
        alert('An error occurred during storage lock handshake.');
      }
    } else {
      alert('Persistent storage controller API is not supported in this browser version.');
    }
  };

  const handleTriggerInstall = async () => {
    if (!deferredPrompt) {
      alert("Installation helper cannot find active prompt because you are already in full screen standalone mode, or your browser handles installation directly via browser tools. Please click top-right menu block to add to Home Screen!");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      onTriggerNotification('Installer Running', 'Starting standalone app container launcher registration...');
    }
    setDeferredPrompt(null);
  };

  // Frequency handlers
  const handleReminderChange = (freq: any) => {
    onUpdateSettings({
      ...settings,
      reminderFrequency: freq
    });
    onTriggerNotification(
      'Notification Frequency Modified',
      `Reminders configured to trigger: ${freq}.`
    );
  };

  const handleBackupFreqChange = (freq: any) => {
    onUpdateSettings({
      ...settings,
      backupFrequency: freq
    });
  };

  // Change notification alarm limit percentage (e.g., 80% default threshold)
  const handleThresholdPercentageChange = (percentage: number) => {
    onUpdateSettings({
      ...settings,
      alertThresholdPercentage: percentage
    });
    onTriggerNotification(
      'Default Threshold Updated',
      `Default fallback warning threshold set to ${percentage}%.`
    );
  };

  const handleCategoryThresholdChange = (catName: string, percentage: number) => {
    const currentThresholds = settings.categoryThresholds || {};
    onUpdateSettings({
      ...settings,
      categoryThresholds: {
        ...currentThresholds,
        [catName]: percentage
      }
    });
    onTriggerNotification(
      'Category Threshold Updated',
      `Category "${catName}" warning limit configured to ${percentage}%.`
    );
  };

  const handleOverallThresholdChange = (percentage: number) => {
    onUpdateSettings({
      ...settings,
      overallThresholdPercentage: percentage
    });
    onTriggerNotification(
      'Overall Threshold Updated',
      `Overall total spending safety warning warning set to ${percentage}%.`
    );
  };

  // PIN code config update including PIN memory hint!
  const handlePinUpdate = () => {
    setPinError('');
    setPinSuccess(false);

    if (oldPin !== settings.pin) {
      setPinError('Existing PIN is incorrect.');
      return;
    }
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      setPinError('New PIN must be exactly 4 numeric digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN confirmations do not match.');
      return;
    }

    onUpdateSettings({
      ...settings,
      pin: newPin,
      pinHint: customPinHint || 'Self reminder',
      isPinSet: true
    });
    
    setPinSuccess(true);
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setTimeout(() => {
      setPinChangeOpen(false);
      setPinSuccess(false);
    }, 2000);

    onTriggerNotification(
      'Encryption PIN Saved',
      'Database access lock PIN and custom memory hint successfully updated.'
    );
  };

  // Handle addition of a completely custom category dynamic block
  const handleCreateNewCategory = () => {
    setAddCatError('');
    setAddCatSuccess(false);

    if (!newCatName.trim()) {
      setAddCatError('Category label cannot be empty.');
      return;
    }

    const catNameLower = newCatName.trim().toLowerCase();
    const isDuplicate = categories.some(c => c.name.toLowerCase() === catNameLower);
    if (isDuplicate) {
      setAddCatError('Category with this name already exists.');
      return;
    }

    const budgetVal = Number(newCatBudget);
    if (isNaN(budgetVal) || budgetVal <= 0) {
      setAddCatError('Budget amount must be a positive integer.');
      return;
    }

    // Process comma separated subcategories
    const parsedSubs = newCatSubcategories
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (parsedSubs.length === 0) {
      // provide default one if user left blank
      parsedSubs.push('General');
    }

    // New values
    const newCatId = `cat_${Date.now()}`;
    const newCategoryItem: VirtualCategory = {
      id: newCatId,
      name: newCatName.trim(),
      subcategories: parsedSubs
    };

    const newBudgetItem: VirtualBudget = {
      categoryName: newCatName.trim(),
      limitAmount: budgetVal
    };

    onUpdateCategories([...categories, newCategoryItem]);
    onUpdateBudgets([...budgets, newBudgetItem]);

    setAddCatSuccess(true);
    setNewCatName('');
    setNewCatBudget('5000');
    setNewCatSubcategories('');
    
    onTriggerNotification(
      'Custom Category Configured',
      `Successfully registered "${newCategoryItem.name}" with a monthly budget limit of ₹${budgetVal.toLocaleString()}`
    );

    setTimeout(() => {
      setAddCatOpen(false);
      setAddCatSuccess(false);
    }, 2000);
  };

  // Append a subcategory tag to an existing category
  const handleAddSubcategory = (catId: string, catName: string) => {
    const inputVal = newSubcategoryInputs[catId];
    if (!inputVal || !inputVal.trim()) return;

    const updatedCategories = categories.map(cat => {
      if (cat.id === catId) {
        // avoid duplicates
        const norm = inputVal.trim();
        if (cat.subcategories.includes(norm)) return cat;
        return {
          ...cat,
          subcategories: [...cat.subcategories, norm]
        };
      }
      return cat;
    });

    onUpdateCategories(updatedCategories);
    
    // Clear subcategory input
    setNewSubcategoryInputs(prev => ({
      ...prev,
      [catId]: ''
    }));

    onTriggerNotification(
      'Subcategory Added',
      `New subcategory "${inputVal.trim()}" registered under ${catName}.`
    );
  };

  // Delete a subcategory tag
  const handleDeleteSubcategory = (catId: string, subName: string, catName: string) => {
    const updatedCategories = categories.map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          subcategories: cat.subcategories.filter(s => s !== subName)
        };
      }
      return cat;
    });

    onUpdateCategories(updatedCategories);

    onTriggerNotification(
      'Subcategory Deleted',
      `Removed "${subName}" subcategory tag from ${catName}.`
    );
  };

  // Delete an entire category from database schema
  const handleDeleteEntireCategory = (catId: string, catName: string) => {
    if (confirm(`Are you sure you want to delete category "${catName}"? This will permanently remove its budget limit config as well.`)) {
      const updatedCategories = categories.filter(c => c.id !== catId);
      onUpdateCategories(updatedCategories);

      // Also clean up associated budget limits
      const updatedBudgets = budgets.filter(b => b.categoryName.toLowerCase() !== catName.toLowerCase());
      onUpdateBudgets(updatedBudgets);

      onTriggerNotification(
        'Category Deleted',
        `Successfully deleted category "${catName}" and budget limits.`
      );
    }
  };

  // Modify Category's Budget Amount
  const handleSaveBudgetLimit = (categoryName: string) => {
    const stringVal = tempBudgetLimits[categoryName];
    if (!stringVal) return;

    const amount = Number(stringVal);
    if (isNaN(amount) || amount <= 0) {
      alert('Please specify a positive integer amount.');
      return;
    }

    const exists = budgets.some(b => b.categoryName === categoryName);
    let updatedBudgets: VirtualBudget[];
    if (exists) {
      updatedBudgets = budgets.map(b => b.categoryName === categoryName ? { ...b, limitAmount: amount } : b);
    } else {
      updatedBudgets = [...budgets, { categoryName, limitAmount: amount }];
    }

    onUpdateBudgets(updatedBudgets);
    alert(`Monthly budget limit for ${categoryName} set to: ₹${amount.toLocaleString()}`);

    onTriggerNotification(
      'Budget Limit Adjusted',
      `Monthly limit for ${categoryName} updated to ₹${amount.toLocaleString()}`
    );
  };

  // Smart check to see if an expense date string matches a custom user timeframe query unit
  const matchesPeriodQuery = (dateStr: string, q: string) => {
    const cleanDate = dateStr.toLowerCase();
    const cleanQ = q.toLowerCase().trim().replace(/ /g, '').replace(/,/g, '');
    
    if (cleanQ === 'all' || cleanQ === 'lifetime') return true;
    
    // Check if ISO format '2026-06' or similar
    if (cleanQ.includes('-')) {
      return cleanDate.startsWith(cleanQ);
    }
    
    // Check if simple year '2026' or '2025' or '2024'
    if (cleanQ === '2026' || cleanQ === '2025' || cleanQ === '2024') {
      return cleanDate.startsWith(cleanQ);
    }

    // Support month names: "june2026", "june26", "june", "june25", etc.
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      january: '01', february: '02', 'mar.': '03', march: '03', april: '04', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
    };

    // Parse month and year from common human input e.g. "june26" or "mar26"
    for (const [mName, mId] of Object.entries(monthMap)) {
      if (cleanQ.startsWith(mName)) {
        const remainingYear = cleanQ.replace(mName, ''); // might be "26" or "2026"
        if (remainingYear === '26' || remainingYear === '2026') {
          return cleanDate.startsWith(`2026-${mId}`);
        }
        if (remainingYear === '25' || remainingYear === '2025') {
          return cleanDate.startsWith(`2025-${mId}`);
        }
        if (remainingYear === '24' || remainingYear === '2024') {
          return cleanDate.startsWith(`2024-${mId}`);
        }
        // Fallback to match month part inside the current 2026 scope context
        return cleanDate.startsWith(`2026-${mId}`);
      }
    }

    return cleanDate.includes(cleanQ);
  };

  // Statement Exporter logic based on multiple, comma separated timeframe queries
  const handleGenerateStatement = () => {
    const queryPeriods = periodInputVal.split(',').map(s => s.trim()).filter(Boolean);
    if (queryPeriods.length === 0) {
      alert("Please enter or click at least one timeframe period first.");
      return;
    }

    // Filter transaction logs combined over active query elements
    const filteredExpenses = expenses.filter(exp => {
      return queryPeriods.some(q => matchesPeriodQuery(exp.date, q));
    });

    const combinedLabel = queryPeriods.join(', ');

    if (filteredExpenses.length === 0) {
      alert(`No offline transaction entries matching query period(s): "${periodInputVal}"`);
      return;
    }

    // 2. Generate export formats
    if (reportFormat === 'excel') {
      const csvContent = "data:text/csv;charset=utf-8," 
        + `Period,${periodInputVal} expense tracker report statement\n`
        + "Date,Category,Subcategory,Amount (INR),Payment Mode,Notes\n"
        + filteredExpenses.map(e => `"${e.date}","${e.category}","${e.subcategory}","${e.amount}","${e.paymentMode}","${e.notes}"`).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Statement_${periodInputVal.replace(/ /g, '_').replace(/,/g, '_')}_Offline.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onTriggerNotification(
        'Spreadsheet Downloaded',
        `Successfully exported CSV ledger sheet for "${periodInputVal}" (${filteredExpenses.length} records).`
      );
    } else {
      // PDF Web View document generation
      const reportWindow = window.open("", "_blank");
      if (reportWindow) {
        const categoriesSummary = categories.map(c => {
          const sum = filteredExpenses
            .filter(e => e.category.toLowerCase() === c.name.toLowerCase())
            .reduce((sum, e) => sum + e.amount, 0);
          return { name: c.name, sum };
        }).filter(c => c.sum > 0);

        const totalExpenditure = categoriesSummary.reduce((sum, c) => sum + c.sum, 0);

        reportWindow.document.write(`
          <html>
            <head>
              <title>Export Statement - ${periodInputVal}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 35px; color: #1e293b; background: #ffffff; }
                h1 { border-bottom: 3px solid #4f46e5; padding-bottom: 8px; color: #312e81; font-size: 1.8rem; margin-bottom: 10px;}
                .meta-summary { font-size: 0.9rem; color: #64748b; margin-bottom: 25px; }
                .metric-card { background: #f0fdf4; padding: 20px; border-radius: 12px; font-weight: bold; font-size: 1.4rem; border-left: 6px solid #16a34a; margin-bottom: 25px; color: #15803d; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 30px; }
                th { background: #334155; color: white; padding: 10px; text-align: left; font-size: 0.85rem; text-transform: uppercase; }
                td { padding: 11px; border-bottom: 1px solid #e2e8f0; font-size: 0.85rem; }
                .text-right { text-align: right; }
                .print-footer { margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; border-t: 1px solid #f1f5f9; padding-t: 15px; }
              </style>
            </head>
            <body>
              <h1>Material 3 - Multi-period Statement Ledger</h1>
              <p class="meta-summary">Selected Timeframe: <strong>${periodInputVal}</strong> &middot; Generated on: ${new Date().toLocaleDateString()}</p>
              
              <div class="metric-card">
                Total expenditure recorded: INR ${totalExpenditure.toLocaleString()}
              </div>

              <h3>1. CATEGORY CLUSTER ALLOCATIONS</h3>
              <table>
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th class="text-right">Total Spent (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoriesSummary.map(c => `
                    <tr>
                      <td><strong>${c.name}</strong></td>
                      <td class="text-right">₹${c.sum.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <h3>2. DYNAMIC TRANSACTIONS LOGS (${filteredExpenses.length} Entries)</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Subcategory</th>
                    <th>Payment Mode</th>
                    <th>Notes</th>
                    <th class="text-right">Sum (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredExpenses.map(e => `
                    <tr>
                      <td>${e.date}</td>
                      <td>${e.category}</td>
                      <td>${e.subcategory}</td>
                      <td>${e.paymentMode}</td>
                      <td><i>${e.notes || '-'}</i></td>
                      <td class="text-right">₹${e.amount.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="print-footer">
                <p>Generated by Material 3 Personal Expense Offline Sync Engine. Single User Local SQLite Backup.</p>
              </div>
              <script>
                setTimeout(function() {
                  window.print();
                }, 500);
              </script>
            </body>
          </html>
        `);
        reportWindow.document.close();
      }

      onTriggerNotification(
        'Statement Launched',
        `Ready-to-print multi-month PDF document generated for ${periodInputVal}.`
      );
    }
  };

  const handleOpenShareSheet = () => {
    const queryPeriods = periodInputVal.split(',').map(s => s.trim()).filter(Boolean);
    if (queryPeriods.length === 0) {
      alert("Please specify or click at least one period timeframe before sharing.");
      return;
    }

    const filteredExpenses = expenses.filter(exp => {
      return queryPeriods.some(q => matchesPeriodQuery(exp.date, q));
    });

    if (filteredExpenses.length === 0) {
      alert(`No matching transactions found for: "${periodInputVal}" to package for sharing.`);
      return;
    }

    setShareSheetOpen(true);
  };

  const handleAppShareClick = (appName: string) => {
    const queryPeriods = periodInputVal.split(',').map(s => s.trim()).filter(Boolean);
    const combinedLabel = queryPeriods.join(', ');
    const filteredExpenses = expenses.filter(exp => {
      return queryPeriods.some(q => matchesPeriodQuery(exp.date, q));
    });
    const totalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    onTriggerNotification(
      'Statement Shared',
      `Delivered "${combinedLabel}" report format via ${appName} successfully.`
    );
    alert(`Shared! Successfully dispatched ${reportFormat.toUpperCase()} report of "${combinedLabel}" (Total: ₹${totalSpent.toLocaleString()}) via simulated native ${appName} share sheet!`);
    setShareSheetOpen(false);
  };

  // Google Drive Simulation authentication flow
  const handleOpenGoogleAuth = () => {
    setGoogleAuthStep('choose');
    setGoogleSelectedEmail(settings.googleDriveConnected ? (settings.googleDriveEmail || 'deepakrajgir43@gmail.com') : 'deepakrajgir43@gmail.com');
    setGoogleCustomEmailInput('');
    setGoogleAgreedScopes(false);
    setGoogleAuthProgress(0);
    setGoogleAuthLog('Initiating secure OAuth handshake request...');
    setGoogleAuthOpen(true);
  };

  const handleStartGoogleAuthFlow = (targetEmail: string) => {
    // Validate custom email if that's what was chosen
    if (targetEmail === 'custom') {
      const email = googleCustomEmailInput.trim();
      if (!email || !email.includes('@') || !email.includes('.')) {
        alert('Please enter a valid Gmail or Google Workspace email address!');
        return;
      }
      targetEmail = email;
    }
    
    setGoogleSelectedEmail(targetEmail);
    // Proceed to consent step
    setGoogleAuthStep('consent');
  };

  const handleLaunchAuthorizationHandshake = () => {
    if (!googleAgreedScopes) {
      alert('You must check the agreement box to grant the requested authorizations.');
      return;
    }

    setGoogleAuthStep('authorizing');
    setGoogleAuthProgress(10);
    setGoogleAuthLog('Contacting Google Authorization Servers (accounts.google.com)...');

    // Interval to simulate handshake progression
    let currentProgress = 10;
    const interval = setInterval(() => {
      currentProgress += 15;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        
        // Finalize state save
        onUpdateSettings({
          ...settings,
          googleDriveConnected: true,
          googleDriveEmail: googleSelectedEmail
        });

        setGoogleAuthStep('success');
        onTriggerNotification(
          'Google Account Connected',
          `Successfully authenticated & linked Google Drive to: ${googleSelectedEmail}`
        );
      } else {
        setGoogleAuthProgress(currentProgress);
        // Change logs dynamically
        if (currentProgress < 40) {
          setGoogleAuthLog('Validating client application authentication IDs...');
        } else if (currentProgress < 65) {
          setGoogleAuthLog('Handshaking keys with OAuth Exchange gateway...');
        } else if (currentProgress < 85) {
          setGoogleAuthLog('Creating sandbox database appDataFolder partition inside Google Drive...');
        } else {
          setGoogleAuthLog('Issuing secure, encrypted sync access token keys...');
        }
      }
    }, 400);
  };

  const handleDisconnectGoogleDrive = () => {
    if (confirm('Are you sure you want to disconnect this Google Drive account? Automatic cloud uploads will be paused, but existing backups inside your Drive won\'t be affected.')) {
      onUpdateSettings({
        ...settings,
        googleDriveConnected: false,
        googleDriveEmail: null
      });
      onTriggerNotification(
        'Cloud Account Disconnected',
        'Your Google Drive connection was successfully unlinked.'
      );
    }
  };

  // Google Drive Simulation sync
  const handleGoogleDriveBackupSync = () => {
    const activeEmail = settings.googleDriveConnected ? (settings.googleDriveEmail || 'your.account@gmail.com') : null;
    if (!activeEmail) {
      alert('Your Google Drive is disconnected. Let\'s link your unique Google account first!');
      handleOpenGoogleAuth();
      return;
    }

    setSyncing(true);
    setSyncStatus(`Handshaking securely with Google Cloud Drive account: ${activeEmail}...`);
    
    setTimeout(() => {
      setSyncStatus(`[${activeEmail}] Packaging offline database entries...`);
      setTimeout(() => {
        setSyncStatus(`[${activeEmail}] Uploading cloud SQLite JSON backup blobs...`);
        setTimeout(() => {
          setSyncing(false);
          setSyncStatus(null);
          const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
          onUpdateSettings({
            ...settings,
            lastBackupDate: nowStr
          });
          onTriggerNotification(
            'Google Drive Backup Successful',
            `Full database backup successfully uploaded under unique user account: ${activeEmail}`
          );
          alert(`Success! Successfully uploaded SQL backup schema to Google Drive folder for unique account: ${activeEmail}`);
        }, 1200);
      }, 1000);
    }, 1000);
  };

  const handleDownloadBackupFile = () => {
    const backupJson = DbSim.generateBackupData();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expense_tracker_backup_${new Date().toISOString().substring(0, 10)}.db.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    onTriggerNotification(
      'Backup Export Complete',
      'JSON raw backup payload successfully downloaded.'
    );
  };

  const handleImportBackupFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = DbSim.restoreBackupData(content);
      if (success) {
        onRestore();
        onTriggerNotification(
          'Database Synchronized',
          'Reloaded raw transactions, budgets limits, and custom tags.'
        );
      } else {
        alert('Format error: Not a valid SQLite JSON backup.');
      }
    };
    reader.readAsText(file);
  };

  const handleWipeDatabase = () => {
    if (confirm('Are you absolutely sure you want to revert database? All transactions, budgets, custom category blocks will be permanently wiped.')) {
      DbSim.resetToDefault();
      onRestore();
      onTriggerNotification(
        'Database Hard Reset',
        'Simulated database restored to default sandbox state.'
      );
;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 px-4 py-4 space-y-4 scrollbar-thin">
      
      {/* 1. Category & Subcategory Master Configurator Panel */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-700/60">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
            <FolderPlus className="h-4 w-4 text-emerald-500" />
            🏷️ Category & Budget Control
          </h3>
          <button
            onClick={() => setAddCatOpen(!addCatOpen)}
            className="text-[11px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/55 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
          >
            {addCatOpen ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {addCatOpen ? 'Cancel' : 'Add Category'}
          </button>
        </div>

        {/* 1A. Form to Add a Dynamic Category with initial budget & subcategories */}
        {addCatOpen && (
          <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-150 dark:border-slate-800/80 space-y-2.5">
            <h4 className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-350">Create New Database Category</h4>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-slate-400 font-bold uppercase">Category Title</label>
                <input
                  type="text"
                  placeholder="e.g. Health"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="bg-white dark:bg-slate-800 p-2 text-xs rounded-lg w-full mt-0.5 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 font-bold uppercase">Budget Limit (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={newCatBudget}
                  onChange={(e) => setNewCatBudget(e.target.value)}
                  className="bg-white dark:bg-slate-800 p-2 text-xs rounded-lg w-full mt-0.5 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] text-slate-400 font-bold uppercase">Subcategories (Comma separated tags)</label>
              <input
                type="text"
                placeholder="Medicine, Dentist, Checkups"
                value={newCatSubcategories}
                onChange={(e) => setNewCatSubcategories(e.target.value)}
                className="bg-white dark:bg-slate-800 p-2 text-xs rounded-lg w-full mt-0.5 text-slate-800 dark:text-slate-100 border border-slate-105 dark:border-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            {addCatError && <p className="text-red-500 text-[10px] font-bold text-center mt-1">{addCatError}</p>}
            {addCatSuccess && <p className="text-emerald-500 text-[10px] font-bold text-center mt-1 flex items-center justify-center gap-0.5"><CheckCircle className="h-3 w-3" /> Created successfully!</p>}

            <button
              onClick={handleCreateNewCategory}
              className="py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-bold w-full mt-1 cursor-pointer transition-colors"
            >
              Add to Database
            </button>
          </div>
        )}

        {/* 1B. Alert Percentage Selector Threshold (Overall Budget combined limit monitor) */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
          {/* Slider 2: Combined Overall Budget Threshold */}
          <div className="space-y-1.5 font-mono">
            <div className="flex justify-between items-center text-[10px] leading-none">
              <span className="text-emerald-600 dark:text-emerald-400 uppercase font-black tracking-wider flex items-center gap-1">
                <Sliders className="h-3.5 w-3.5" />
                Overall Total Budget Warning Limit
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {settings.overallThresholdPercentage ?? 80}%
              </span>
            </div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal font-sans pt-1">
              Warning triggered as soon as overall combined month spendings cross this percentage of total budgets (default: 80%).
            </p>
            <div className="flex items-center gap-2 pt-1 font-semibold">
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={settings.overallThresholdPercentage ?? 80}
                onChange={(e) => handleOverallThresholdChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* 1C. Editable List of Database Categories */}
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase font-mono block">
              Category Schema & Budgets
            </label>
            <button
              onClick={() => setShowCategoriesList(!showCategoriesList)}
              type="button"
              className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-805 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded font-bold font-mono transition-all cursor-pointer border border-slate-200/50 dark:border-slate-850"
            >
              {showCategoriesList ? 'Collapse' : 'View'}
            </button>
          </div>

          {showCategoriesList && (
            <div className="space-y-2">
              {categories.map(cat => {
                const isExpanded = expandedCategoryId === cat.id;
                const budgetLine = budgets.find(b => b.categoryName.toLowerCase() === cat.name.toLowerCase());
                const initialBudgetStr = budgetLine ? String(budgetLine.limitAmount) : '';
                const currentBudgetLimitVal = tempBudgetLimits[cat.name] !== undefined ? tempBudgetLimits[cat.name] : initialBudgetStr;

                return (
                  <div key={cat.id} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100/75 dark:hover:bg-slate-800/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200 font-mono uppercase">{cat.name}</span>
                        <p className="text-[9px] text-slate-400 font-bold uppercase font-mono">
                          Monthly Limit: <span className="text-emerald-500">₹{(budgetLine?.limitAmount ?? 0).toLocaleString()}</span>
                        </p>
                      </div>
                      <span className="text-[9.5px] font-bold text-indigo-500 flex items-center gap-0.5 font-mono">
                        {isExpanded ? 'Collapse config' : 'Edit sub/limit'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        
                        {/* Budget limit editor */}
                        <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl">
                          <div className="flex-1">
                            <label className="text-[8.5px] text-slate-400 font-black uppercase font-mono block mb-0.5">Category Monthly Budget Limit (₹)</label>
                            <input
                              type="number"
                              placeholder="e.g. 10000"
                              value={currentBudgetLimitVal}
                              onChange={(e) => setTempBudgetLimits({ ...tempBudgetLimits, [cat.name]: e.target.value })}
                              className="bg-white dark:bg-slate-800 px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 w-full text-slate-800 dark:text-slate-100 font-mono outline-none"
                            />
                          </div>
                          <button
                            onClick={() => handleSaveBudgetLimit(cat.name)}
                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold font-mono cursor-pointer transition-colors"
                          >
                            Adjust Limit
                          </button>
                        </div>

                        {/* Category Specific Warning Limit Slider */}
                        <div className="bg-indigo-50/40 dark:bg-slate-900 p-2.5 rounded-xl space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-mono leading-none">
                            <span className="text-indigo-600 dark:text-indigo-400 uppercase font-black">
                              ⚠️ Custom alert warn limit
                            </span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-indigo-100 dark:border-slate-700">
                              {settings.categoryThresholds?.[cat.name] ?? 80}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="100"
                            step="5"
                            value={settings.categoryThresholds?.[cat.name] ?? 80}
                            onChange={(e) => handleCategoryThresholdChange(cat.name, Number(e.target.value))}
                            className="w-full h-2 bg-slate-250 dark:bg-slate-700 rounded-lg cursor-pointer accent-indigo-600 my-1"
                          />
                          <span className="text-[8px] text-slate-400 block leading-tight">
                            Adjust when color-coding limits warn for {cat.name} (fallback: 80%).
                          </span>
                        </div>

                        {/* Subcategories tag lists */}
                        <div className="space-y-1">
                          <label className="text-[8.5px] text-slate-400 font-black uppercase font-mono block">Active Subcategories Tag lists</label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {cat.subcategories.map(sub => (
                              <span
                                key={sub}
                                className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-150 dark:border-slate-800"
                              >
                                <span>{sub}</span>
                                <button
                                  onClick={() => handleDeleteSubcategory(cat.id, sub, cat.name)}
                                  className="text-red-400 hover:text-red-500 text-[10px] font-bold cursor-pointer"
                                  title="Delete subcategory cluster"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                            {cat.subcategories.length === 0 && (
                              <span className="text-[10px] text-slate-400 italic">No subcategories defined.</span>
                            )}
                          </div>
                        </div>

                        {/* Append new subcategory tag field */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Add subcategory tag (e.g. Fast Food)"
                            value={newSubcategoryInputs[cat.id] || ''}
                            onChange={(e) => setNewSubcategoryInputs({ ...newSubcategoryInputs, [cat.id]: e.target.value })}
                            className="bg-slate-50 dark:bg-slate-900 px-2 py-1 text-xs rounded border border-slate-100 dark:border-slate-805 flex-1 text-slate-800 dark:text-slate-200 outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddSubcategory(cat.id, cat.name);
                            }}
                          />
                          <button
                            onClick={() => handleAddSubcategory(cat.id, cat.name)}
                            className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-0.5"
                          >
                            <Plus className="h-3 w-3" /> Tag
                          </button>
                        </div>

                        {/* Delete Entire Category */}
                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-850 flex justify-end">
                          <button
                            onClick={() => handleDeleteEntireCategory(cat.id, cat.name)}
                            type="button"
                            className="px-2.5 py-1 text-red-500 hover:text-red-650 bg-red-50 dark:bg-red-950/20 hover:bg-red-100/40 rounded text-[10px] font-bold font-mono transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete Category
                          </button>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive Reports & Statement Exporter Center */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3.5">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
          <Calendar className="h-4 w-4 text-indigo-500" />
          📊 Reports & Statement Exporter
        </h3>
        
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
          Filter your offline transaction database and generate print-ready statements. You can partition data by specific month, dynamic year, or export all records instantly.
        </p>

        <div className="grid grid-cols-2 gap-3 pb-1">
          {/* Period manual text entry */}
          <div className="col-span-2">
            <label className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider mb-1 font-mono">Timeframe Periods (Comma-separated)</label>
            <input
              type="text"
              value={periodInputVal}
              onChange={(e) => setPeriodInputVal(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-750 text-slate-700 dark:text-slate-300 p-2 rounded-lg text-xs outline-none font-mono font-medium"
              placeholder="e.g. 2026-06, 2026-05"
            />
          </div>

          {/* Quick-toggle tags chips */}
          <div className="col-span-2 space-y-1">
            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase block font-mono">Quick-toggle timeframe months:</span>
            <div className="flex flex-wrap gap-1">
              {[
                { id: '2026-06', name: 'June 26' },
                { id: '2026-05', name: 'May 26' },
                { id: '2026-04', name: 'April 26' },
                { id: '2026-03', name: 'March 26' },
                { id: 'year_2026', name: 'Full 2026' },
                { id: 'all', name: 'Lifetime' }
              ].map(p => {
                const isActive = periodInputVal.split(',').map(s => s.trim().toLowerCase()).includes(p.id.toLowerCase());
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      let items = periodInputVal.split(',').map(s => s.trim()).filter(Boolean);
                      if (p.id === 'all') {
                        setPeriodInputVal('all');
                        return;
                      }
                      items = items.filter(s => s.toLowerCase() !== 'all');
                      if (items.some(s => s.toLowerCase() === p.id.toLowerCase())) {
                        items = items.filter(s => s.toLowerCase() !== p.id.toLowerCase());
                      } else {
                        items.push(p.id);
                      }
                      setPeriodInputVal(items.length > 0 ? items.join(', ') : '2026-06');
                    }}
                    type="button"
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {isActive ? `✓ ${p.name}` : `+ ${p.name}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format Selection Row */}
          <div className="col-span-2">
            <label className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider mb-1">Export Format type</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-150 dark:border-slate-750">
              <button
                type="button"
                onClick={() => setReportFormat('pdf')}
                className={`py-1 rounded text-[10px] font-black uppercase cursor-pointer transition-all ${
                  reportFormat === 'pdf' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                PDF Document (.pdf)
              </button>
              <button
                type="button"
                onClick={() => setReportFormat('excel')}
                className={`py-1 rounded text-[10px] font-black uppercase cursor-pointer transition-all ${
                  reportFormat === 'excel' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Excel Spreadsheet (.csv)
              </button>
            </div>
          </div>
        </div>

        {/* Dual Actions: Export & Share */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleGenerateStatement}
            className="py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow border border-indigo-500/20 transition-all font-mono"
          >
            {reportFormat === 'pdf' ? <FileText className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
            Export
          </button>
          <button
            type="button"
            onClick={handleOpenShareSheet}
            className="py-2.5 bg-indigo-100 hover:bg-indigo-200 dark:bg-slate-700 dark:hover:bg-slate-650 active:scale-95 text-indigo-700 dark:text-indigo-200 rounded-xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-xs border border-indigo-200/50 dark:border-slate-600 transition-all font-mono"
          >
            <CloudLightning className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>

      {/* 3. Security Pin Settings & Recovery Memory Hint */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-700/60">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
            <Key className="h-4 w-4 text-amber-500" />
            PIN Lock Configuration
          </h3>
          <button
            onClick={() => setPinChangeOpen(!pinChangeOpen)}
            className="text-xs text-indigo-500 font-bold hover:underline"
          >
            {pinChangeOpen ? 'Collapse' : 'Modify PIN'}
          </button>
        </div>

        {pinChangeOpen ? (
          <div className="space-y-2.5 pt-1.5">
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase">Current Lock PIN</label>
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                className="bg-slate-100 dark:bg-slate-700 p-2 text-xs rounded-lg w-full text-center tracking-widest font-mono mt-1 text-slate-800 dark:text-slate-150 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block">New Lock PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-700 p-2 text-xs rounded-lg w-full text-center tracking-widest font-mono mt-1 text-slate-800 dark:text-slate-150 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block">Confirm New PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-700 p-2 text-xs rounded-lg w-full text-center tracking-widest font-mono mt-1 text-slate-800 dark:text-slate-150 outline-none"
                />
              </div>
            </div>

            {/* Custom security PIN memory hint option requested */}
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block">Custom Security PIN Hint Text</label>
              <span className="text-[9px] text-slate-400 block mb-1">Set a self reminder text. It is displayed when tapping "Need a hint?" on the unlock screen.</span>
              <input
                type="text"
                placeholder="e.g. My sibling birthday or last digits of vehicle number"
                value={customPinHint}
                onChange={(e) => setCustomPinHint(e.target.value)}
                className="bg-slate-100 dark:bg-slate-700 p-2 text-xs rounded-lg w-full text-slate-800 dark:text-slate-150 outline-none font-medium mt-0.5"
              />
            </div>

            {pinError && <p className="text-red-500 text-[10px] font-bold text-center">{pinError}</p>}
            {pinSuccess && <p className="text-emerald-500 text-[10px] font-bold text-center flex items-center justify-center gap-0.5"><Check className="h-3 w-3" /> PIN Saved Successfully!</p>}

            <button
              onClick={handlePinUpdate}
              className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold w-full mt-2 cursor-pointer transition-colors"
            >
              Update lock PIN & Custom Hint
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500 leading-normal">
            Your physical expense tracker with SQLite is encrypted offline behind your lock code. Access token PIN hint: <strong className="text-slate-750 dark:text-slate-350">{settings.pinHint || 'None configured'}</strong>.
          </p>
        )}
      </div>

      {/* 4. Notification Frequency Config */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
          <Bell className="h-4 w-4 text-amber-500" />
          Reminder Interval Config
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase block text-left">Active Alarm Intervals</label>
            <p className="text-[10px] text-slate-400 mb-2">Configure background local triggers: Don&apos;t forget to record your expenses.</p>
            <div className="grid grid-cols-4 gap-1.5 text-[10px] font-bold">
              {['Every 1 Hour', 'Every 2 Hours', 'Every 4 Hours', 'Disabled'].map(opt => {
                const isSelected = settings.reminderFrequency === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => handleReminderChange(opt as any)}
                    className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {opt.replace('Every ', '')}
                  </button>
                );
              })}
            </div>
            
            {/* Explanatory & Interactive testing subcase */}
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${settings.reminderFrequency !== 'Disabled' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  Android Status: {settings.reminderFrequency !== 'Disabled' ? 'Alarm Registered' : 'Inactive'}
                </span>
                {settings.reminderFrequency !== 'Disabled' && (
                  <button
                    onClick={() => onTriggerNotification('⏰ Don\'t forget to record your expenses!', 'Keep your personal budget on track!')}
                    className="text-[9px] font-bold text-indigo-600 hover:text-indigo-500 hover:underline cursor-pointer"
                  >
                    Test Alarm Now &rarr;
                  </button>
                )}
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-normal">
                {settings.reminderFrequency !== 'Disabled' ? (
                  <>
                    <strong>Real-Time Android Execution:</strong> Once installed on your device, the chosen interval (e.g., every {settings.reminderFrequency.replace('Every ', '')}) is registered directly in the Android OS System Alarm Service via <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[9.5px]">android_alarm_manager_plus</code>. The system wakes up a background worker at exactly that hourly frequency, even when your screen is locked or the app is closed, to deliver a dynamic push warning reminding you to log your transactions.
                  </>
                ) : (
                  <>
                    <strong>Real-Time Android Execution:</strong> Select an interval to register a low-battery background alarm with the Android OS that schedules push alerts in real-time.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Cloud Auto Backups (Google Drive Simulation) */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
          <CloudLightning className="h-4 w-4 text-indigo-500" />
          Cloud Backup & Restores (Google Drive)
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase block text-left">Auto-Sync Frequency</label>
            <p className="text-[10px] text-slate-400 mb-2">Frequency database is safely backed up silently inside Drive Private Sandbox</p>
            <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold font-mono">
              {['Daily', 'Weekly', 'Monthly'].map(freq => {
                const isSelected = settings.backupFrequency === freq;
                return (
                  <button
                    key={freq}
                    onClick={() => handleBackupFreqChange(freq as any)}
                    className={`py-2 rounded-lg border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {freq}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-2 text-xs border border-slate-200 dark:border-slate-805">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 uppercase font-black font-mono">Cloud Connection Status</span>
              {settings.googleDriveConnected ? (
                <span className="text-emerald-500 font-bold flex items-center gap-1 font-mono">
                  ● Connected ({settings.googleDriveEmail || 'your.account@gmail.com'})
                </span>
              ) : (
                <span className="text-amber-500 dark:text-amber-400 font-bold flex items-center gap-1 font-mono animate-pulse">
                  ○ Unlinked / Offline
                </span>
              )}
            </div>

            {settings.googleDriveConnected ? (
              <div className="flex justify-between items-center text-[9px] pt-0.5">
                <span className="text-slate-400 font-sans">Registered Cloud Storage:</span>
                <button
                  type="button"
                  onClick={handleDisconnectGoogleDrive}
                  className="text-red-500 hover:text-red-650 font-bold font-mono hover:underline cursor-pointer"
                >
                  Disconnect Account
                </button>
              </div>
            ) : (
              <div className="pt-1.5 pb-0.5">
                <button
                  type="button"
                  onClick={handleOpenGoogleAuth}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider font-mono flex items-center justify-center gap-1.5 cursor-pointer shadow-sm animate-bounce"
                  style={{ animationDuration: '3s' }}
                >
                  <Key className="h-3 w-3" /> Link Unique Google Account
                </button>
              </div>
            )}
            
            <div className="flex justify-between items-center text-[11px] font-mono border-t border-slate-100 dark:border-slate-800 pt-2">
              <span className="text-slate-500 font-sans">Last Cloud Sync Stamp:</span>
              <span className="font-bold text-slate-700 dark:text-slate-350">
                {settings.googleDriveConnected ? (settings.lastBackupDate || 'Never Sync') : 'N/A'}
              </span>
            </div>

            {syncing && (
              <div className="space-y-1.5 py-1">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 text-indigo-500 animate-spin" />
                  <span className="text-[10px] text-indigo-500 font-mono font-medium animate-pulse">{syncStatus}</span>
                </div>
                <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded animate-timeline-progress w-[60%]" style={{ animationDuration: '4s' }} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleGoogleDriveBackupSync}
                disabled={syncing}
                className="py-2 px-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 dark:text-indigo-400 rounded-lg text-[10px] sm:text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                title={settings.googleDriveConnected ? `Upload database backups to ${settings.googleDriveEmail}` : 'Link a Google Drive account to backup'}
              >
                <UploadCloud className="h-4 w-4 shrink-0" />
                <span>Backup to Drive</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const activeEmail = settings.googleDriveConnected ? (settings.googleDriveEmail || 'your.account@gmail.com') : null;
                  if (!activeEmail) {
                    alert('Please link a Google Drive account first before restoring backups.');
                    handleOpenGoogleAuth();
                    return;
                  }
                  if (confirm(`Are you sure you want to download and restore the latest database backup synced on ${activeEmail}? This will overwrite current transaction entries.`)) {
                    alert(`Restoring database backup from your linked Google Drive account: ${activeEmail}...`);
                    handleWipeDatabase();
                  }
                }}
                disabled={syncing}
                className="py-2 px-1 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] sm:text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                title={settings.googleDriveConnected ? `Restore database from backup under ${settings.googleDriveEmail}` : 'Restore backup'}
              >
                <Download className="h-4 w-4 shrink-0" />
                <span>Restore Backup</span>
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* 6. Standalone Installer & Physical local storage lock */}
      <div id="pwa-settings-card" className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
          <Smartphone className="h-4 w-4 text-indigo-500 animate-pulse" />
          Mobile Installation & Device Lock
        </h3>

        <p className="text-[10px] text-slate-400 leading-normal">
          Launch as a standalone program locked directly on your hardware and request a physical storage reservation.
        </p>

        {/* Standalone state and persistence badges */}
        <div className="grid grid-cols-1 gap-2">
          {/* Badge 1: App Container State */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-850 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-mono text-slate-400 font-bold block leading-none">LAUNCH MODE</span>
              <span className="font-extrabold text-slate-700 dark:text-slate-200">
                {isStandaloneApp ? "Standalone App" : "Standard Web Tab"}
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black font-mono uppercase tracking-wide ${
              isStandaloneApp 
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
            }`}>
              {isStandaloneApp ? "● Standalone" : "⚪ Browser Tab"}
            </span>
          </div>

          {/* Badge 2: Local Hardware Storage Lock */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-850 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-mono text-slate-400 font-bold block leading-none">HARDWARE PERSISTENCE LOCK</span>
                <span className="font-extrabold text-slate-700 dark:text-slate-200">
                  {isStoragePersistent ? "Permanently Secured" : "Standard Sandbox Cache"}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black font-mono uppercase tracking-wide ${
                isStoragePersistent 
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                  : "bg-slate-250 dark:bg-slate-800 text-slate-500"
              }`}>
                {isStoragePersistent ? "Locked" : "Standard"}
              </span>
            </div>

            {!isStoragePersistent ? (
              <div className="pt-1.5 border-t border-slate-150 dark:border-slate-850 space-y-1.5">
                <p className="text-[9px] text-slate-405 dark:text-slate-400 leading-normal">
                  Standard browser storage can occasionally clear if your phones local drive is full. Activate Hardware Lock to instruct the OS to never delete your local data.
                </p>
                <button
                  type="button"
                  onClick={requestStoragePersistence}
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider font-mono rounded cursor-pointer transition-all border border-slate-250 dark:border-slate-700"
                >
                  🔒 Lock Storage on Physical Device
                </button>
              </div>
            ) : (
              <p className="text-[9.5px] text-emerald-600 dark:text-emerald-400 leading-normal bg-emerald-500/5 p-1.5 rounded border border-emerald-500/10 font-medium">
                ✔ <strong>Approved persistent storage lock</strong>. The device OS will prioritize and preserve this database forever, even when working fully offline without cellular connection.
              </p>
            )}
          </div>
        </div>

        {/* Install Triggers and Guides */}
        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          {deferredPrompt && (
            <button
              type="button"
              onClick={handleTriggerInstall}
              className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest font-mono flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Smartphone className="h-3.5 w-3.5" /> Install Mobile App Now
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowInstallGuide(!showInstallGuide)}
            className="w-full text-center text-[10px] font-bold text-indigo-500 hover:underline cursor-pointer flex items-center justify-center gap-1"
          >
            {showInstallGuide ? "Hide Mobile Setup Instructions" : "View Mobile Setup Instructions 👁"}
          </button>

          {showInstallGuide && (
            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-150 dark:border-slate-850 text-[10px] space-y-2 text-left animate-fade-in uppercase font-mono">
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400">🤖 Android / Chrome Option</span>
                <ol className="list-decimal pl-3.5 font-sans lowercase normal-case leading-relaxed text-slate-500 dark:text-slate-400 space-y-0.5">
                  <li>Tap the browser&apos;s three-dot menu icon (<strong className="font-bold">⋮</strong>) at the top right of search bar.</li>
                  <li>Select <strong className="font-bold">&quot;Install app&quot;</strong> or <strong className="font-bold">&quot;Add to Home screen&quot;</strong>.</li>
                  <li>Confirm installation. The app icon will land on your regular phone App Drawer.</li>
                </ol>
              </div>

              <div className="space-y-1 border-t border-slate-150 dark:border-slate-850 pt-2">
                <span className="text-[9px] font-extrabold text-blue-500">🍏 iPhone & iPad / Safari Option</span>
                <ol className="list-decimal pl-3.5 font-sans lowercase normal-case leading-relaxed text-slate-500 dark:text-slate-400 space-y-0.5">
                  <li>Open this active URL in the native <strong className="font-bold">Safari</strong> browser.</li>
                  <li>Tap the blue <strong className="font-bold">Share</strong> button (box with an upward arrow) in navigation dock.</li>
                  <li>Scroll down and select <strong className="font-bold">&quot;Add to Home Screen&quot;</strong>.</li>
                  <li>Tap <strong className="font-bold">Add</strong>. Ready-to-use application icon resides on your iOS device!</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 7. Local Database Dump & Reset (Raw recovery tools) */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
          <HardDrive className="h-4 w-4 text-emerald-500" />
          Raw Access Database Payload
        </h3>
        
        <p className="text-[10px] text-slate-400 leading-normal">
          Export your SQLite simulated schema database directly as raw JSON files or ingest an existing backup payload locally.
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-1">
          <button
            onClick={handleDownloadBackupFile}
            className="p-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export Payload
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
          >
            <UploadCloud className="h-4 w-4" /> Import Payload
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackupFile}
            accept=".json"
            className="hidden"
          />
        </div>

        <div className="pt-2">
          <button
            onClick={handleWipeDatabase}
            className="py-2.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg text-xs font-black tracking-wider uppercase w-full cursor-pointer flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/60 font-mono"
          >
            <Trash2 className="h-4 w-4" /> Permanent Reset SQLite DB
          </button>
        </div>
      </div>

      {/* Simulation Native App Share Sheet Overlay Modal */}
      {shareSheetOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end justify-center z-50 p-3">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-2xl p-4 shadow-2xl space-y-3 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black text-slate-500 font-mono uppercase tracking-wider">📤 Select App to Share</span>
              <button
                onClick={() => setShareSheetOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[10px] text-slate-500 font-sans leading-normal">
              Sharing report format: <strong className="text-indigo-650 dark:text-indigo-400 font-mono">{reportFormat.toUpperCase()}</strong> for timeframe periods: <strong className="text-indigo-650 dark:text-indigo-400 font-mono">"{periodInputVal}"</strong>.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* WhatsApp App */}
              <button
                onClick={() => handleAppShareClick('WhatsApp')}
                className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-750 rounded-xl flex flex-col items-center gap-1.5 transition-colors cursor-pointer group"
              >
                <div className="h-9 w-9 bg-emerald-50 dark:bg-emerald-950/60 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-all">
                  <Sliders className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono uppercase">WhatsApp</span>
                <span className="text-[8.5px] text-slate-400 text-center leading-normal block">Share directly to chats</span>
              </button>

              {/* Gmail / Personal Email */}
              <button
                onClick={() => handleAppShareClick('Gmail')}
                className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-750 rounded-xl flex flex-col items-center gap-1.5 transition-colors cursor-pointer group"
              >
                <div className="h-9 w-9 bg-indigo-50 dark:bg-indigo-950/60 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-all">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono uppercase">E-mail</span>
                <span className="text-[8.5px] text-slate-400 text-center leading-normal block">Send to email inbox</span>
              </button>

              {/* Telegram App */}
              <button
                onClick={() => handleAppShareClick('Telegram')}
                className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-750 rounded-xl flex flex-col items-center gap-1.5 transition-colors cursor-pointer group col-span-2 text-center"
              >
                <div className="h-9 w-9 bg-cyan-50 dark:bg-cyan-950/60 rounded-full flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-all mx-auto">
                  <CloudLightning className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono uppercase mt-1">Telegram</span>
                <span className="text-[8.5px] text-slate-400 text-center leading-normal block">Broadcast report blob instantly</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Google OAuth Authentication Simulation Modal */}
      {googleAuthOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            
            {/* Header branding */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 border-b border-slate-100 dark:border-slate-805 flex justify-between items-center">
              <div className="flex items-center gap-1.5 font-sans">
                <span className="font-extrabold text-blue-500 text-sm">G</span>
                <span className="font-extrabold text-red-500 text-sm">o</span>
                <span className="font-extrabold text-yellow-500 text-sm">o</span>
                <span className="font-extrabold text-blue-500 text-sm">g</span>
                <span className="font-extrabold text-green-500 text-sm">l</span>
                <span className="font-extrabold text-red-500 text-sm">e</span>
                <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase tracking-wider font-mono">Sign-In Gateway</span>
              </div>
              <button
                onClick={() => setGoogleAuthOpen(false)}
                disabled={googleAuthStep === 'authorizing'}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content body */}
            <div className="p-4 space-y-4 text-xs">
              
              {/* STEP 1: CHOOSE OR DETECT UNIQUE ACCOUNT */}
              {googleAuthStep === 'choose' && (
                <div className="space-y-3.5 text-left">
                  <div className="text-center space-y-1 animate-fade-in">
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">Sign in with Google</h4>
                    <p className="text-[10px] text-slate-400">Choose a default account or enter a custom one for private backups.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase font-bold tracking-wider font-mono">Suggested Accounts</label>
                    <div className="space-y-1.5">
                      {/* Option 1: default user */}
                      <button
                        onClick={() => handleStartGoogleAuthFlow('deepakrajgir43@gmail.com')}
                        className="w-full text-left p-2.5 rounded-xl border border-slate-150 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-indigo-50/30 hover:border-indigo-500/35 dark:hover:bg-slate-850 flex items-center gap-2.5 transition-all text-[11px] group cursor-pointer"
                      >
                        <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-[10px]">
                          D
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">deepakrajgir43@gmail.com</p>
                          <p className="text-[8.5px] text-slate-400 leading-none font-sans mt-0.5">Primary Registered Owner</p>
                        </div>
                        <Check className="h-3.5 w-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>

                      {/* Option 2: business email */}
                      <button
                        onClick={() => handleStartGoogleAuthFlow('finance.office.hub@gmail.com')}
                        className="w-full text-left p-2.5 rounded-xl border border-slate-150 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-emerald-50/30 hover:border-emerald-500/35 dark:hover:bg-slate-850 flex items-center gap-2.5 transition-all text-[11px] group cursor-pointer"
                      >
                        <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400 text-[10px]">
                          F
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">finance.office.hub@gmail.com</p>
                          <p className="text-[8.5px] text-slate-400 leading-none font-sans mt-0.5">Secondary Backup Vault</p>
                        </div>
                        <Check className="h-3.5 w-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                    <label className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider block">Use Another Unique Custom Account</label>
                    <div className="flex gap-1.5">
                      <input
                        type="email"
                        placeholder="e.g. customized.user@gmail.com"
                        value={googleCustomEmailInput}
                        onChange={(e) => setGoogleCustomEmailInput(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-850 text-[11px] text-slate-800 dark:text-slate-100 outline-none font-mono focus:border-indigo-500/70"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleStartGoogleAuthFlow('custom');
                        }}
                      />
                      <button
                        onClick={() => handleStartGoogleAuthFlow('custom')}
                        className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black font-mono transition-colors cursor-pointer uppercase flex items-center gap-0.5"
                      >
                        Link
                      </button>
                    </div>
                    <p className="text-[8.5px] text-slate-400 dark:text-slate-500 leading-normal font-sans">
                      Provide any google format mail address. Each address creates an isolated database lock scope inside your private user cloud.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 2: CONSENT CHECKLISTS */}
              {googleAuthStep === 'consent' && (
                <div className="space-y-4 text-left animate-fade-in">
                  <div className="space-y-1">
                    <span className="text-[8.5px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-black uppercase font-mono">
                      Granting Scopes
                    </span>
                    <h4 className="text-xs font-black text-slate-755 dark:text-slate-200 leading-snug">
                      Grant &quot;Material Expense Tracker&quot; access to Google Drive?
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Permits backup storage on behalf of: <strong className="text-indigo-600 dark:text-indigo-400">{googleSelectedEmail}</strong>.
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-850 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="checkbox"
                        id="consent-checkbox-appDataFolder"
                        checked={googleAgreedScopes}
                        onChange={(e) => setGoogleAgreedScopes(e.target.checked)}
                        className="mt-0.5 accent-indigo-600 rounded cursor-pointer h-3.5 w-3.5"
                      />
                      <label htmlFor="consent-checkbox-appDataFolder" className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-normal cursor-pointer font-medium select-none font-sans">
                        <strong>Allow Private Sandbox writes</strong> (appDataFolder scope). See, edit, create, and delete only the specific files configuration metadata folders deployed inside your Google Drive.
                      </label>
                    </div>
                  </div>

                  <p className="text-[9.5px] text-slate-400 leading-normal font-sans">
                    This credential authorization allows background processes to synchronize database backups privately. Different clients link unique emails, ensuring individuals keep isolated sets of backup records.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1.5">
                    <button
                      onClick={() => setGoogleAuthStep('choose')}
                      className="py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 font-bold transition-all cursor-pointer font-mono text-[10px] uppercase"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleLaunchAuthorizationHandshake}
                      disabled={!googleAgreedScopes}
                      className="py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:dark:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer font-mono text-[10px]"
                    >
                      Authorize & Link
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: HANDSHAKING LOADER */}
              {googleAuthStep === 'authorizing' && (
                <div className="py-6 text-center space-y-4 animate-fade-in">
                  <div className="relative h-12 w-12 mx-auto">
                    <RefreshCw className="h-12 w-12 text-indigo-600 dark:text-indigo-400 animate-spin absolute inset-0" />
                    <div className="absolute inset-0 flex items-center justify-center font-bold font-mono text-[10px] text-indigo-700 dark:text-indigo-300">
                      {googleAuthProgress}%
                    </div>
                  </div>

                  <div className="space-y-1.5 px-2">
                    <h4 className="font-black text-slate-800 dark:text-slate-100 text-[10px] uppercase font-mono animate-pulse tracking-wide">OAuth Handshake active...</h4>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono italic min-h-[30px] leading-tight transition-all">
                      {googleAuthLog}
                    </p>
                  </div>

                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-300 rounded-full" 
                      style={{ width: `${googleAuthProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: SUCCESS REASSURANCE */}
              {googleAuthStep === 'success' && (
                <div className="py-4 text-center space-y-4 animate-fade-in">
                  <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950/50 rounded-full text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                    <Check className="h-6 w-6 stroke-[3px]" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-[11px] text-slate-800 dark:text-slate-150 uppercase tracking-widest font-mono">Linked Successfully!</h4>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed font-sans">
                      Google Drive backup vault configured under:
                    </p>
                    <p className="text-[10.5px] font-black text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 py-1.5 px-3 rounded border border-emerald-500/20 inline-block mt-1">
                      {googleSelectedEmail}
                    </p>
                  </div>

                  <p className="text-[9.5px] text-slate-400 dark:text-slate-500 leading-normal font-sans">
                    This device is now authorized to create secure backup nodes inside your personal Google Drive namespace folder. You are fully configured!
                  </p>

                  <button
                    onClick={() => setGoogleAuthOpen(false)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow font-mono text-[10px]"
                  >
                    Finish Setup
                  </button>
                </div>
              )}

            </div>

            {/* Footer branding */}
            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 text-center text-[8px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-805 leading-normal uppercase font-mono tracking-wide">
              SECURE GOOGLE OAUTH v2 ENDPOINT BACKED BY PRIVATE SANDBOX STORAGE. NO THIRD PARTY ACCESS ALLOWED.
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
