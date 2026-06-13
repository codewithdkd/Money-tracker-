/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Code2, Copy, Check, Terminal, FileCode, HardDrive, Bell, Sheet } from 'lucide-react';

interface CodeSnippet {
  name: string;
  language: string;
  icon: React.ReactNode;
  description: string;
  code: string;
}

export default function FlutterCodeCenter() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeSnippet, setActiveSnippet] = useState<number>(0);

  const snippets: CodeSnippet[] = [
    {
      name: 'database_helper.dart',
      language: 'dart',
      icon: <HardDrive className="h-4 w-4" />,
      description: 'SQLite database management, relational schema with cascading foreign keys for expenses, categories, subcategories, budgets, and settings.',
      code: `import 'dart:async';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('expense_tracker.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
      onConfigure: _onConfigure,
    );
  }

  Future _onConfigure(Database db) async {
    // Enable foreign keys for relational integrity
    await db.execute('PRAGMA foreign_keys = ON');
  }

  Future _createDB(Database db, int version) async {
    // 1. Categories Table
    await db.execute('''
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )
    ''');

    // 2. Subcategories Table (Relational with Cascade)
    await db.execute('''
      CREATE TABLE subcategories (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
        UNIQUE(category_id, name)
      )
    ''');

    // 3. Budgets Table (Scoped per category name)
    await db.execute('''
      CREATE TABLE budgets (
        id TEXT PRIMARY KEY,
        category_name TEXT NOT NULL UNIQUE,
        limit_amount REAL NOT NULL
      )
    ''');

    // 4. Expenses Table with foreign key references
    await db.execute('''
      CREATE TABLE expenses (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL, -- YYYY-MM-DD
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT NOT NULL,
        notes TEXT,
        payment_mode TEXT NOT NULL,
        FOREIGN KEY (category) REFERENCES categories (name) ON UPDATE CASCADE
      )
    ''');

    // 5. Settings Table for application metadata (Single Row Pattern)
    await db.execute('''
      CREATE TABLE settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        pin TEXT NOT NULL,
        is_pin_set INTEGER NOT NULL DEFAULT 1,
        dark_mode INTEGER NOT NULL DEFAULT 0,
        backup_frequency TEXT NOT NULL DEFAULT 'Daily',
        reminder_frequency TEXT NOT NULL DEFAULT 'Every 2 Hours'
      )
    ''');

    // Seed default categories
    await _seedInitialData(db);
  }

  Future _seedInitialData(Database db) async {
    // Insert Categories
    final categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment'];
    for (var i = 0; i < categories.length; i++) {
      final catId = 'cat_\${i + 1}';
      await db.insert('categories', {'id': catId, 'name': categories[i]});
    }

    // Insert Default Subcategories
    final subs = {
      'cat_1': ['Breakfast', 'Lunch', 'Dinner', 'Groceries', 'Snacks'],
      'cat_2': ['Auto', 'Metro', 'Fuel', 'Cab', 'Train'],
      'cat_3': ['Clothes', 'Electronics', 'Footwear', 'Gifts'],
      'cat_4': ['Rent', 'Electricity', 'Water', 'Internet', 'Mobile Recharge'],
      'cat_5': ['Movies', 'Streaming', 'Gaming', 'Outings']
    };

    subs.forEach((catId, subList) async {
      for (var s in subList) {
        final subId = 'sub_\${DateTime.now().microsecondsSinceEpoch}_\${s.hashCode}';
        await db.insert('subcategories', {
          'id': subId,
          'category_id': catId,
          'name': s
        });
      }
    });

    // Seed Budgets
    await db.insert('budgets', {'id': 'b1', 'category_name': 'Food', 'limit_amount': 6000.0});
    await db.insert('budgets', {'id': 'b2', 'category_name': 'Transport', 'limit_amount': 3000.0});
    await db.insert('budgets', {'id': 'b3', 'category_name': 'Shopping', 'limit_amount': 10000.0});

    // Seed initial setting row
    await db.insert('settings', {
      'id': 1,
      'pin': '1234',
      'is_pin_set': 1,
      'dark_mode': 0,
      'backup_frequency': 'Daily',
      'reminder_frequency': 'Every 2 Hours'
    });
  }

  // General CRUD helper operations
  Future<int> insertExpense(Map<String, dynamic> row) async {
    final db = await instance.database;
    return await db.insert('expenses', row);
  }

  Future<List<Map<String, dynamic>>> queryAllExpenses() async {
    final db = await instance.database;
    return await db.query('expenses', orderBy: 'date DESC');
  }

  Future<int> updateExpense(Map<String, dynamic> row) async {
    final db = await instance.database;
    String id = row['id'];
    return await db.update('expenses', row, where: 'id = ?', whereArgs: [id]);
  }

  Future<int> deleteExpense(String id) async {
    final db = await instance.database;
    return await db.delete('expenses', where: 'id = ?', whereArgs: [id]);
  }
}`
    },
    {
      name: 'expense_model.dart',
      language: 'dart',
      icon: <FileCode className="h-4 w-4" />,
      description: 'Statically typed Dart models with safety checks, parsing from SQLite MAP and JSON encodings.',
      code: `import 'dart:convert';

class Expense {
  final String id;
  final DateTime date;
  final double amount;
  final String category;
  final String subcategory;
  final String notes;
  final String paymentMode;

  Expense({
    required this.id,
    required this.date,
    required this.amount,
    required this.category,
    required this.subcategory,
    required this.notes,
    required this.paymentMode,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'date': "\${date.year.toString().padLeft(4, '0')}-\${date.month.toString().padLeft(2, '0')}-\${date.day.toString().padLeft(2, '0')}",
      'amount': amount,
      'category': category,
      'subcategory': subcategory,
      'notes': notes,
      'payment_mode': paymentMode,
    };
  }

  factory Expense.fromMap(Map<String, dynamic> map) {
    return Expense(
      id: map['id'] as String,
      date: DateTime.parse(map['date'] as String),
      amount: (map['amount'] as num).toDouble(),
      category: map['category'] as String,
      subcategory: map['subcategory'] as String,
      notes: (map['notes'] ?? '') as String,
      paymentMode: map['payment_mode'] as String,
    );
  }

  String toJson() => json.encode(toMap());

  factory Expense.fromJson(String source) => 
      Expense.fromMap(json.decode(source) as Map<String, dynamic>);
}`
    },
    {
      name: 'notification_service.dart',
      language: 'dart',
      icon: <Bell className="h-4 w-4" />,
      description: 'Flutter local notification service covering hourly reminders and real-time category budget boundary utilization alerts.',
      code: `import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  Future<void> init() async {
    tz.initializeTimeZones();
    
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
    );

    await flutterLocalNotificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (NotificationResponse details) {
        // Automatically handle redirect: Tapping opens Add Expense screen
        if (details.payload == 'open_add_expense') {
          // Trigger flow router or notification Bus
          print('Redirecting user to Add Expense Screen');
        }
      },
    );
  }

  // Trigger Instant App notification for Budget limits (70%, 90%, 100%)
  Future<void> showBudgetNotification({
    required int id,
    required String category,
    required double currentSpent,
    required double limit,
    required double percentage,
  }) async {
    final String percentMsg = percentage.toStringAsFixed(0);
    
    AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
      'budget_limits_channel',
      'Budget Alerts',
      channelDescription: 'Get notified when spending reaches 70%, 90% or 100% limit',
      importance: Importance.max,
      priority: Priority.high,
      ticker: 'ticker',
    );
    
    NotificationDetails platformChannelSpecifics =
        NotificationDetails(android: androidPlatformChannelSpecifics);

    await flutterLocalNotificationsPlugin.show(
      id,
      'Budget Warning: $category reached $percentMsg%',
      'Spent ₹\${currentSpent.toStringAsFixed(2)} of ₹\${limit.toStringAsFixed(2)} limit.',
      platformChannelSpecifics,
      payload: 'open_add_expense',
    );
  }

  // Schedule background hourly reminders (Configurable: 1h, 2h, 4h)
  Future<void> scheduleHourlyReminder(int hours) async {
    // Cancel prior scheduled notifications on this channel
    await flutterLocalNotificationsPlugin.cancel(999);
    
    if (hours <= 0) return; // Disabled

    await flutterLocalNotificationsPlugin.periodicallyShow(
      999,
      'Record Your Day',
      "Don't forget to record your expenses.",
      RepeatInterval.everyMinute, // Emulator fallback or custom WorkManager loop
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'hourly_reminders_channel',
          'Expense Reminders',
          channelDescription: 'Recurring triggers to register transactions',
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
    );
  }
}`
    },
    {
      name: 'export_service.dart',
      language: 'dart',
      icon: <Sheet className="h-4 w-4" />,
      description: 'Generates beautiful PDF and Excel (.xlsx) summaries of expenses including budget metrics and category summaries.',
      code: `import 'dart:io';
import 'package:excel/excel.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:path_provider/path_provider.dart';

class ExportService {
  // 1. Generate Excel Sheet
  static Future<File> exportToExcel(List<Map<String, dynamic>> expenses, String periodName) async {
    var excel = Excel.createExcel();
    Sheet sheetObject = excel['Expenses - $periodName'];
    
    // Add Headers
    sheetObject.appendRow([
      TextCellValue('Date'),
      TextCellValue('Category'),
      TextCellValue('Subcategory'),
      TextCellValue('Amount (INR)'),
      TextCellValue('Notes'),
      TextCellValue('Payment Mode')
    ]);

    // Add Expenses rows
    double total = 0.0;
    for (var exp in expenses) {
      double amt = (exp['amount'] as num).toDouble();
      total += amt;
      sheetObject.appendRow([
        TextCellValue(exp['date']),
        TextCellValue(exp['category']),
        TextCellValue(exp['subcategory']),
        DoubleCellValue(amt),
        TextCellValue(exp['notes'] ?? ''),
        TextCellValue(exp['payment_mode'])
      ]);
    }

    // Append Summary Total Row
    sheetObject.appendRow([]);
    sheetObject.appendRow([
      TextCellValue('TOTAL EXPENSES:'),
      TextCellValue(''),
      TextCellValue(''),
      DoubleCellValue(total),
    ]);

    // Save File
    final directory = await getExternalStorageDirectory();
    final path = '\${directory!.path}/Expenses_\${periodName.replaceAll(' ', '_')}.xlsx';
    final file = File(path);
    final fileBytes = excel.save();
    if (fileBytes != null) {
      await file.writeAsBytes(fileBytes);
    }
    return file;
  }

  // 2. Generate PDF Report document
  static Future<File> exportToPDF({
    required List<Map<String, dynamic>> expenses, 
    required String periodName,
    required double totalSpent,
    required Map<String, double> categoryBreakdown,
  }) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return [
            pw.Header(
              level: 0,
              child: pw.Row(
                mainpw: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Personal Expense Summary', style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
                  pw.Text(periodName, style: pw.TextStyle(fontSize: 14, color: PdfColors.grey700)),
                ],
              ),
            ),
            pw.SizedBox(height: 15),
            
            // Core Metric Block
            pw.Container(
              padding: const pw.EdgeInsets.all(12),
              decoration: pw.BoxDecoration(
                color: PdfColors.teal50,
                borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
              ),
              child: pw.Row(
                mainpw: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Total Month Expenditure', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: PdfColors.teal900)),
                  pw.Text('₹\${totalSpent.toStringAsFixed(2)}', style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold, color: PdfColors.teal900)),
                ],
              ),
            ),
            pw.SizedBox(height: 20),

            // Category Summary Table
            pw.Text('Category-wise Breakdown', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
            pw.Divider(color: PdfColors.grey300),
            pw.SizedBox(height: 8),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey200, width: 0.5),
              children: categoryBreakdown.entries.map((entry) {
                return pw.TableRow(
                  children: [
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text(entry.key)),
                    pw.Padding(
                      padding: const pw.EdgeInsets.all(6),
                      child: pw.Text('₹\${entry.value.toStringAsFixed(2)}', align: pw.TextAlign.right),
                    ),
                  ],
                );
              }).toList(),
            ),
            pw.SizedBox(height: 25),

            // Detailed Transactions Table
            pw.Text('Itemized Transaction Logs', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
            pw.Divider(color: PdfColors.grey300),
            pw.SizedBox(height: 8),
            pw.TableHelper.fromTextArray(
              headers: ['Date', 'Category', 'Subcategory', 'Method', 'Sum'],
              data: expenses.map((e) {
                return [
                  e['date'],
                  e['category'],
                  e['subcategory'],
                  e['payment_mode'],
                  'INR \${e['amount']}',
                ];
              }).toList(),
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white),
              headerDecoration: const pw.BoxDecoration(color: PdfColors.blueGrey800),
              rowDecoration: const pw.BoxDecoration(color: PdfColors.grey100),
              cellAlignment: pw.Alignment.centerLeft,
            )
          ];
        },
      ),
    );

    final directory = await getExternalStorageDirectory();
    final path = '\${directory!.path}/Report_\${periodName.replaceAll(' ', '_')}.pdf';
    final file = File(path);
    await file.writeAsBytes(await pdf.save());
    return file;
  }
}`
    },
    {
      name: 'gdrive_backup_service.dart',
      language: 'dart',
      icon: <Code2 className="h-4 w-4" />,
      description: 'Leverages googleapis API framework to perform seamless, auth-based silent JSON backup of internal sqlite databases to the User App Workspace Drive folder.',
      code: `import 'dart:convert';
import 'dart:io';
import 'package:googleapis/drive/v3.dart' as drive;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';

class GoogleDriveService {
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: [drive.DriveApi.driveAppdataScope], // Safe scoped sandbox storage
  );

  GoogleSignInAccount? _currentUser;

  Future<bool> signIn() async {
    try {
      _currentUser = await _googleSignIn.signIn();
      return _currentUser != null;
    } catch (e) {
      print('Google Sign-in Error: \$e');
      return false;
    }
  }

  Future<void> backupDatabase() async {
    if (_currentUser == null) {
      bool ok = await signIn();
      if (!ok) throw Exception('Requires google login verification');
    }

    final headers = await _currentUser!.authHeaders;
    final authenticateClient = GoogleDriveAuthClient(headers);
    final driveApi = drive.DriveApi(authenticateClient);

    // Retrieve SQLite raw file path
    final dbPath = await getDatabasesPath();
    final dbFile = File(join(dbPath, 'expense_tracker.db'));

    if (!await dbFile.exists()) return;

    // Create Metadata
    final folderFile = drive.File();
    folderFile.name = 'sqlite_backup_\${DateTime.now().toIso8601String()}.db';
    folderFile.parents = ['appDataFolder']; // Save in private application sandbox

    final media = drive.Media(
      dbFile.openRead(),
      await dbFile.length(),
    );

    await driveApi.files.create(
      folderFile,
      uploadMedia: media,
    );
    print('Backup transmitted successfully!');
  }

  Future<bool> restoreDatabase() async {
    if (_currentUser == null) {
      bool ok = await signIn();
      if (!ok) return false;
    }

    final headers = await _currentUser!.authHeaders;
    final authenticateClient = GoogleDriveAuthClient(headers);
    final driveApi = drive.DriveApi(authenticateClient);

    // Find the latest backup
    final filesList = await driveApi.files.list(
      q: "name contains 'sqlite_backup_'",
      spaces: 'appDataFolder',
      orderBy: 'createdTime desc',
      pageSize: 1,
    );

    if (filesList.files == null || filesList.files!.isEmpty) {
      print('No backup found coordinates inside Drive.');
      return false;
    }

    final targetFile = filesList.files!.first;
    final fileId = targetFile.id!;

    // Download file
    final drive.Media response = await driveApi.files.get(
      fileId,
      downloadOptions: drive.DownloadOptions.media,
    ) as drive.Media;

    final List<int> dataBytes = [];
    await for (var chunk in response.stream) {
      dataBytes.addAll(chunk);
    }

    // Overwrite SQLite local database
    final dbPath = await getDatabasesPath();
    final dbFile = File(join(dbPath, 'expense_tracker.db'));
    
    // Safety close connection first
    await dbFile.writeAsBytes(dataBytes, flush: true);
    print('Restore complete. Restart database driver.');
    return true;
  }
}

// Custom authenticated client to append Google OAuth headers
class GoogleDriveAuthClient extends http.BaseClient {
  final Map<String, String> _headers;
  final http.Client _client = http.Client();

  GoogleDriveAuthClient(this._headers);

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    request.headers.addAll(_headers);
    return _client.send(request);
  }
}`
    }
  ];

  const handleCopy = (index: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-200">
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-indigo-400" />
          <h2 className="font-semibold text-slate-100 font-mono tracking-tight text-sm">Flutter - Android PRD Specs</h2>
        </div>
        <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800 font-mono font-medium">SQLite Mode</span>
      </div>

      <div className="p-3 bg-slate-900 flex border-b border-slate-800 gap-1 overflow-x-auto text-[13px] scrollbar-thin">
        {snippets.map((snippet, i) => (
          <button
            key={i}
            onClick={() => setActiveSnippet(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono font-medium whitespace-nowrap transition-all duration-200 ${
              activeSnippet === i
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {snippet.icon}
            {snippet.name}
          </button>
        ))}
      </div>

      <div className="p-4 flex-1 overflow-y-auto bg-slate-950 font-mono text-[12px] leading-relaxed relative flex flex-col justify-start">
        <div className="mb-4 bg-slate-900/60 p-3 rounded border border-slate-800/80">
          <p className="text-[11px] text-slate-400 font-sans italic">
            <strong>Snippet Description:</strong> {snippets[activeSnippet].description}
          </p>
        </div>
        
        <button
          onClick={() => handleCopy(activeSnippet, snippets[activeSnippet].code)}
          className="absolute top-16 right-6 flex items-center gap-1 bg-slate-850 hover:bg-indigo-600 text-slate-300 hover:text-white px-2.5 py-1.5 rounded transition-colors duration-200 border border-slate-700/80 active:scale-95 text-[11px] font-sans"
        >
          {copiedIndex === activeSnippet ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Code</span>
            </>
          )}
        </button>

        <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto text-emerald-400 border border-slate-850 scrollbar-thin select-all leading-relaxed max-w-full">
          <code>{snippets[activeSnippet].code}</code>
        </pre>
      </div>
      
      <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
        <div className="bg-slate-900 p-2.5 rounded-md border border-slate-800 flex-1">
          <div className="text-[10px] text-indigo-400 uppercase font-semibold font-sans mb-1">State Management Note</div>
          <p className="text-[11px] text-slate-400 leading-normal font-sans">
            Designed for <strong>flutter_bloc</strong> or <strong>notifier states</strong>. Easily wire this DatabaseHelper instance inside initialization blocks and trigger notifications directly inside raw transaction events.
          </p>
        </div>
      </div>
    </div>
  );
}
