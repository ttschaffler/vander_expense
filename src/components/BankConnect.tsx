'use client';

import { useState } from 'react';
import { MLP_BANK_DEFAULTS, BankAccount, BankTransaction, ConnectResponse, StatementsResponse } from '@/types/bank';
import { Expense, ExpenseCategory, CATEGORIES, CATEGORY_ICONS } from '@/types/expense';
import { categorizeTransaction, buildDescription } from '@/lib/categorize';
import { formatCurrency, formatDate } from '@/lib/format';

interface BankConnectProps {
  onImport: (expenses: Omit<Expense, 'id' | 'createdAt'>[]) => void;
}

type Step = 'credentials' | 'tan' | 'accounts' | 'transactions';

export default function BankConnect({ onImport }: BankConnectProps) {
  // Connection state
  const [step, setStep] = useState<Step>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Credentials
  const [bankUrl, setBankUrl] = useState(MLP_BANK_DEFAULTS.bankUrl);
  const [bankId, setBankId] = useState(MLP_BANK_DEFAULTS.bankId);
  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState('');
  const [productId, setProductId] = useState(MLP_BANK_DEFAULTS.productId);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // TAN
  const [tanChallenge, setTanChallenge] = useState('');
  const [tanReference, setTanReference] = useState('');
  const [tanInput, setTanInput] = useState('');
  const [tanMethods, setTanMethods] = useState<{ id: number; name: string }[]>([]);
  const [selectedTanMethod, setSelectedTanMethod] = useState<number | null>(null);
  const [tanContext, setTanContext] = useState<'connect' | 'statements'>('connect');

  // Bank data
  const [bankingInfo, setBankingInfo] = useState('');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Transactions
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [balance, setBalance] = useState<{ value: number; currency: string } | null>(null);
  const [selectedTxs, setSelectedTxs] = useState<Set<number>>(new Set());
  const [categoryOverrides, setCategoryOverrides] = useState<Map<number, ExpenseCategory>>(new Map());

  const handleConnect = async () => {
    if (!userId || !pin) {
      setError('Please enter your user ID and PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/bank/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankUrl, bankId, userId, pin, productId, tanMethodId: selectedTanMethod }),
      });

      const data: ConnectResponse = await res.json();

      if (!data.success) {
        setError(data.error || 'Connection failed');
        return;
      }

      if (data.tanMethods) {
        setTanMethods(data.tanMethods);
        if (!selectedTanMethod && data.tanMethods.length > 0) {
          setSelectedTanMethod(data.tanMethods[0].id);
        }
      }

      if (data.bankingInfo) setBankingInfo(data.bankingInfo);

      if (data.tanRequired) {
        setTanChallenge(data.tanChallenge || '');
        setTanReference(data.tanReference || '');
        setTanContext('connect');
        setStep('tan');
        return;
      }

      if (data.accounts && data.accounts.length > 0) {
        setAccounts(data.accounts);
        setSelectedAccount(data.accounts[0].accountNumber);
        setStep('accounts');
      }
    } catch {
      setError('Failed to connect to bank. Make sure you are running locally.');
    } finally {
      setLoading(false);
    }
  };

  const handleTanSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      if (tanContext === 'connect') {
        const res = await fetch('/api/bank/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bankUrl, bankId, userId, pin, productId,
            tanMethodId: selectedTanMethod,
            tanReference, tan: tanInput, bankingInfo,
          }),
        });

        const data: ConnectResponse = await res.json();
        if (!data.success) { setError(data.error || 'TAN verification failed'); return; }
        if (data.bankingInfo) setBankingInfo(data.bankingInfo);
        if (data.accounts && data.accounts.length > 0) {
          setAccounts(data.accounts);
          setSelectedAccount(data.accounts[0].accountNumber);
          setStep('accounts');
        }
      } else {
        const res = await fetch('/api/bank/statements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bankingInfo, userId, pin, productId,
            tanMethodId: selectedTanMethod,
            accountNumber: selectedAccount,
            tanReference, tan: tanInput,
          }),
        });

        const data: StatementsResponse = await res.json();
        if (!data.success) { setError(data.error || 'TAN verification failed'); return; }
        if (data.transactions) {
          processTransactions(data.transactions);
          if (data.balance) setBalance(data.balance);
          setStep('transactions');
        }
      }
    } catch {
      setError('TAN verification failed');
    } finally {
      setLoading(false);
      setTanInput('');
    }
  };

  const handleFetchStatements = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/bank/statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankingInfo, userId, pin, productId,
          tanMethodId: selectedTanMethod,
          accountNumber: selectedAccount,
          from: dateFrom || undefined,
          to: dateTo || undefined,
        }),
      });

      const data: StatementsResponse = await res.json();
      if (!data.success) { setError(data.error || 'Failed to fetch statements'); return; }

      if (data.tanRequired) {
        setTanChallenge(data.tanChallenge || '');
        setTanReference(data.tanReference || '');
        setTanContext('statements');
        setStep('tan');
        return;
      }

      if (data.transactions) {
        processTransactions(data.transactions);
        if (data.balance) setBalance(data.balance);
        setStep('transactions');
      }
    } catch {
      setError('Failed to fetch statements');
    } finally {
      setLoading(false);
    }
  };

  const processTransactions = (txs: BankTransaction[]) => {
    // Only show debits (expenses) by default
    const debits = txs.filter((tx) => tx.amount < 0);
    setTransactions(debits);
    setSelectedTxs(new Set(debits.map((_, i) => i)));
  };

  const toggleTransaction = (index: number) => {
    setSelectedTxs((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedTxs.size === transactions.length) {
      setSelectedTxs(new Set());
    } else {
      setSelectedTxs(new Set(transactions.map((_, i) => i)));
    }
  };

  const handleCategoryChange = (index: number, category: ExpenseCategory) => {
    setCategoryOverrides(new Map(categoryOverrides.set(index, category)));
  };

  const handleImportSelected = () => {
    const expenses: Omit<Expense, 'id' | 'createdAt'>[] = [];
    selectedTxs.forEach((index) => {
      const tx = transactions[index];
      const category = categoryOverrides.get(index) ||
        categorizeTransaction(tx.purpose, tx.remoteName, tx.bookingText);
      expenses.push({
        amount: Math.abs(tx.amount),
        category,
        description: buildDescription(tx.purpose, tx.remoteName, tx.bookingText),
        date: tx.date,
      });
    });
    onImport(expenses);
  };

  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Security Notice</p>
            <p className="text-sm text-amber-700 mt-1">
              Your banking credentials are sent directly to your bank via FinTS and are never stored.
              Only run this feature on your local machine — never on a public server.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Step 1: Credentials */}
      {step === 'credentials' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Connect to MLP Bank</h3>
          <p className="text-sm text-gray-500">
            Enter your online banking credentials to import transactions via FinTS.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">User ID / Anmeldename</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Your online banking user ID"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Your online banking PIN"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Advanced settings */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced Settings
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-5 border-l-2 border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">BLZ (Bank Code)</label>
                <input
                  type="text"
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">FinTS URL</label>
                <input
                  type="text"
                  value={bankUrl}
                  onChange={(e) => setBankUrl(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Product ID</label>
                <input
                  type="text"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">Register at fints.org for a product ID</p>
              </div>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={loading || !userId || !pin}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect to Bank
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 2: TAN */}
      {step === 'tan' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">TAN Required</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">{tanChallenge}</p>
          </div>

          {tanMethods.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">TAN Method</label>
              <select
                value={selectedTanMethod || ''}
                onChange={(e) => setSelectedTanMethod(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {tanMethods.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">TAN</label>
            <input
              type="text"
              value={tanInput}
              onChange={(e) => setTanInput(e.target.value)}
              placeholder="Enter TAN"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">Leave empty for decoupled TAN methods (e.g., app-based approval)</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setStep('credentials'); setTanInput(''); }}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleTanSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verifying...' : 'Submit TAN'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Account Selection */}
      {step === 'accounts' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Select Account</h3>
          <p className="text-sm text-gray-500">
            Connected successfully! Select an account and date range to import transactions.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Account</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {accounts.map((acc) => (
                <option key={acc.accountNumber} value={acc.accountNumber}>
                  {acc.accountName || acc.accountNumber} {acc.iban ? `(${acc.iban})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">From Date (optional)</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">To Date (optional)</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('credentials')}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleFetchStatements}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Fetching...
                </>
              ) : (
                'Fetch Transactions'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Transaction Review & Import */}
      {step === 'transactions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Review Transactions</h3>
            <button
              onClick={() => setStep('accounts')}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ← Back to accounts
            </button>
          </div>

          {balance && (
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">Account Balance</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(balance.value)}
              </span>
            </div>
          )}

          <p className="text-sm text-gray-500">
            {transactions.length} debit transactions found.
            Review categories and select which to import as expenses.
          </p>

          {transactions.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedTxs.size === transactions.length}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Select all ({selectedTxs.size}/{transactions.length})
                </label>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {transactions.map((tx, i) => {
                  const autoCategory = categorizeTransaction(tx.purpose, tx.remoteName, tx.bookingText);
                  const currentCategory = categoryOverrides.get(i) || autoCategory;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                        selectedTxs.has(i)
                          ? 'border-indigo-200 bg-indigo-50/50'
                          : 'border-gray-100 bg-white opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTxs.has(i)}
                        onChange={() => toggleTransaction(i)}
                        className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {tx.remoteName || tx.bookingText || 'Transaction'}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{tx.purpose}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">{formatDate(tx.date)}</span>
                          <select
                            value={currentCategory}
                            onChange={(e) => handleCategoryChange(i, e.target.value as ExpenseCategory)}
                            className="text-xs px-2 py-0.5 border border-gray-200 rounded-lg bg-white text-gray-600"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-red-600 whitespace-nowrap">
                        {formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleImportSelected}
                disabled={selectedTxs.size === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Import {selectedTxs.size} Transaction{selectedTxs.size !== 1 ? 's' : ''} as Expenses
              </button>
            </>
          )}

          {transactions.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p>No debit transactions found for the selected period.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
