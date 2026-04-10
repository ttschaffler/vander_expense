'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Expense, ExpenseCategory, CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from '@/types/expense';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  ExportFormat,
  ExportOptions,
  FORMAT_META,
  defaultExportOptions,
  filterForExport,
  executeExport,
  downloadBlob,
} from '@/lib/export-engine';

interface ExportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  onExportComplete: (message: string) => void;
}

type Step = 'configure' | 'preview' | 'exporting' | 'done';

export default function ExportDrawer({ isOpen, onClose, expenses, onExportComplete }: ExportDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>('configure');
  const [options, setOptions] = useState<ExportOptions>(defaultExportOptions());
  const [exportProgress, setExportProgress] = useState(0);
  const [exportResult, setExportResult] = useState<{ filename: string; recordCount: number; format: ExportFormat } | null>(null);

  // Reset state when drawer opens
  useEffect(() => {
    if (isOpen) {
      setStep('configure');
      setOptions(defaultExportOptions());
      setExportProgress(0);
      setExportResult(null);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'exporting') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, step]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const filteredExpenses = useMemo(
    () => filterForExport(expenses, options),
    [expenses, options]
  );

  const totalAmount = useMemo(
    () => filteredExpenses.reduce((s, e) => s + e.amount, 0),
    [filteredExpenses]
  );

  const categoryStats = useMemo(() => {
    const map = new Map<ExpenseCategory, { count: number; total: number }>();
    filteredExpenses.forEach((e) => {
      const curr = map.get(e.category) || { count: 0, total: 0 };
      map.set(e.category, { count: curr.count + 1, total: curr.total + e.amount });
    });
    return map;
  }, [filteredExpenses]);

  const updateOption = useCallback(<K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleCategory = useCallback((cat: ExpenseCategory) => {
    setOptions((prev) => {
      const next = new Set(prev.categories);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return { ...prev, categories: next };
    });
  }, []);

  const toggleAllCategories = useCallback(() => {
    setOptions((prev) => ({
      ...prev,
      categories: prev.categories.size === CATEGORIES.length ? new Set() : new Set(CATEGORIES),
    }));
  }, []);

  const handleExport = useCallback(async () => {
    setStep('exporting');
    setExportProgress(0);

    // Simulate realistic progress for UX
    const progressInterval = setInterval(() => {
      setExportProgress((p) => Math.min(p + Math.random() * 15, 85));
    }, 100);

    try {
      const result = await executeExport(expenses, options);
      clearInterval(progressInterval);
      setExportProgress(100);

      await new Promise((r) => setTimeout(r, 300));
      downloadBlob(result.blob, result.filename);

      setExportResult({
        filename: result.filename,
        recordCount: result.recordCount,
        format: result.format,
      });
      setStep('done');
      onExportComplete(`Exported ${result.recordCount} expenses as ${FORMAT_META[result.format].label}`);
    } catch {
      clearInterval(progressInterval);
      setStep('configure');
    }
  }, [expenses, options, onExportComplete]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => step !== 'exporting' && onClose()}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl flex flex-col animate-slide-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Export Expenses</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {step === 'configure' && 'Configure your export'}
              {step === 'preview' && 'Preview export data'}
              {step === 'exporting' && 'Generating file...'}
              {step === 'done' && 'Export complete'}
            </p>
          </div>
          {step !== 'exporting' && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {(['configure', 'preview', 'done'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px bg-gray-300" />}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s || (step === 'exporting' && s === 'preview')
                      ? 'bg-indigo-600 text-white'
                      : (['configure', 'preview', 'exporting', 'done'].indexOf(step) > ['configure', 'preview', 'done'].indexOf(s))
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {(['configure', 'preview', 'exporting', 'done'].indexOf(step) > ['configure', 'preview', 'done'].indexOf(s)) ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${
                  step === s || (step === 'exporting' && s === 'preview') ? 'text-indigo-700' : 'text-gray-500'
                }`}>
                  {s === 'configure' ? 'Configure' : s === 'preview' ? 'Preview' : 'Export'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── Configure Step ── */}
          {step === 'configure' && (
            <div className="space-y-6">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Export Format</label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.entries(FORMAT_META) as [ExportFormat, typeof FORMAT_META[ExportFormat]][]).map(
                    ([key, meta]) => (
                      <button
                        key={key}
                        onClick={() => updateOption('format', key)}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          options.format === key
                            ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                            : 'border-gray-150 bg-white hover:border-gray-300'
                        }`}
                      >
                        <span className="text-2xl">{meta.icon}</span>
                        <span className={`text-xs font-semibold ${
                          options.format === key ? 'text-indigo-700' : 'text-gray-600'
                        }`}>
                          {meta.ext.toUpperCase().slice(1)}
                        </span>
                        {options.format === key && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">{FORMAT_META[options.format].label}</p>
              </div>

              {/* Filename */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Filename</label>
                <div className="flex items-center gap-0">
                  <input
                    type="text"
                    value={options.filename}
                    onChange={(e) => updateOption('filename', e.target.value.replace(/[^a-zA-Z0-9_\-]/g, ''))}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-l-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <span className="px-3 py-2.5 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl text-sm text-gray-500 font-mono">
                    {FORMAT_META[options.format].ext}
                  </span>
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Date Range</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={options.dateFrom}
                      onChange={(e) => updateOption('dateFrom', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={options.dateTo}
                      onChange={(e) => updateOption('dateTo', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
                {(options.dateFrom || options.dateTo) && (
                  <button
                    onClick={() => { updateOption('dateFrom', ''); updateOption('dateTo', ''); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 mt-1.5 font-medium"
                  >
                    Clear dates
                  </button>
                )}
              </div>

              {/* Categories */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-900">Categories</label>
                  <button
                    onClick={toggleAllCategories}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {options.categories.size === CATEGORIES.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => {
                    const selected = options.categories.has(cat);
                    const stat = categoryStats.get(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                          selected
                            ? 'border-indigo-200 bg-indigo-50/60'
                            : 'border-gray-100 bg-gray-50/50 opacity-50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'
                        }`}>
                          {selected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{CATEGORY_ICONS[cat]}</span>
                            <span className="text-sm font-medium text-gray-800 truncate">{cat}</span>
                          </div>
                          {stat && (
                            <span className="text-xs text-gray-400">{stat.count} items</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CSV-specific option */}
              {options.format === 'csv' && (
                <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    checked={options.includeHeaders}
                    onChange={(e) => updateOption('includeHeaders', e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Include column headers</span>
                </label>
              )}

              {/* Export summary bar */}
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">
                      {filteredExpenses.length} record{filteredExpenses.length !== 1 ? 's' : ''} to export
                    </p>
                    <p className="text-xs text-indigo-600 mt-0.5">
                      Total: {formatCurrency(totalAmount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-indigo-500">
                      {options.categories.size}/{CATEGORIES.length} categories
                    </p>
                    {(options.dateFrom || options.dateTo) && (
                      <p className="text-xs text-indigo-500 mt-0.5">Date filter active</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Preview Step ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{filteredExpenses.length}</span> expenses
                  {' '}totaling <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
                </p>
              </div>

              {/* Mini category badges */}
              <div className="flex flex-wrap gap-1.5">
                {Array.from(categoryStats.entries()).map(([cat, stat]) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: `${CATEGORY_COLORS[cat]}15`,
                      color: CATEGORY_COLORS[cat],
                    }}
                  >
                    {CATEGORY_ICONS[cat]} {cat}: {stat.count}
                  </span>
                ))}
              </div>

              {/* Data table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.slice(0, 50).map((exp, i) => (
                        <tr key={exp.id} className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(exp.date)}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className="inline-block px-2 py-0.5 rounded-md text-xs font-medium"
                              style={{
                                backgroundColor: `${CATEGORY_COLORS[exp.category]}15`,
                                color: CATEGORY_COLORS[exp.category],
                              }}
                            >
                              {exp.category}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-900 max-w-[200px] truncate">{exp.description}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-900 whitespace-nowrap">{formatCurrency(exp.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {filteredExpenses.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-50 border-t-2 border-gray-200">
                          <td colSpan={3} className="px-4 py-2.5 text-sm font-semibold text-gray-700">Total</td>
                          <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-900">{formatCurrency(totalAmount)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                {filteredExpenses.length > 50 && (
                  <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-200">
                    Showing first 50 of {filteredExpenses.length} records. All records will be included in the export.
                  </div>
                )}
              </div>

              {/* Export file info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-2xl">{FORMAT_META[options.format].icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {options.filename}{FORMAT_META[options.format].ext}
                  </p>
                  <p className="text-xs text-gray-500">{FORMAT_META[options.format].label}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Exporting Step ── */}
          {step === 'exporting' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              {/* Animated spinner */}
              <div className="relative">
                <div className="w-20 h-20 border-4 border-gray-200 rounded-full" />
                <div
                  className="absolute inset-0 w-20 h-20 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-indigo-600">{Math.round(exportProgress)}%</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">Generating {FORMAT_META[options.format].label}...</p>
                <p className="text-sm text-gray-500 mt-1">
                  Processing {filteredExpenses.length} records
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-xs">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Done Step ── */}
          {step === 'done' && exportResult && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              {/* Success animation */}
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">Export Complete!</p>
                <p className="text-sm text-gray-500 mt-2">Your file has been downloaded.</p>
              </div>

              {/* Export details card */}
              <div className="w-full bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">File</span>
                  <span className="font-medium text-gray-900 font-mono text-xs">{exportResult.filename}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Format</span>
                  <span className="font-medium text-gray-900">{FORMAT_META[exportResult.format].label}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Records</span>
                  <span className="font-medium text-gray-900">{exportResult.recordCount}</span>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setStep('configure')}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Export Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions (configure + preview steps only) */}
        {(step === 'configure' || step === 'preview') && (
          <div className="px-6 py-4 border-t border-gray-100 bg-white">
            {step === 'configure' && (
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('preview')}
                  disabled={filteredExpenses.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Preview Data
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
            {step === 'preview' && (
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('configure')}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </span>
                </button>
                <button
                  onClick={handleExport}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors text-sm shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export {filteredExpenses.length} Records
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
