'use client';

import { useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Expense, ExpenseFilters } from '@/types/expense';
import { useExpenses } from '@/hooks/useExpenses';
import SummaryCards from '@/components/SummaryCards';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseListComponent from '@/components/ExpenseList';
import ExpenseFiltersComponent from '@/components/ExpenseFilters';
import { MonthlyChart, CategoryChart } from '@/components/Charts';
import Modal from '@/components/Modal';
import ToastContainer, { ToastMessage } from '@/components/Toast';
import ShareHub from '@/components/ShareHub';

type Tab = 'dashboard' | 'expenses' | 'share';

export default function Home() {
  const {
    expenses,
    isLoaded,
    addExpense,
    updateExpense,
    deleteExpense,
    filterExpenses,
    totalSpending,
    monthlySpending,
    categoryBreakdown,
    monthlyTrend,
    averageExpense,
  } = useExpenses();

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [filters, setFilters] = useState<ExpenseFilters>({
    search: '',
    category: 'All',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const filteredExpenses = useMemo(
    () => filterExpenses(filters),
    [filterExpenses, filters]
  );

  const recentExpenses = useMemo(
    () =>
      [...expenses]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
    [expenses]
  );

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = uuidv4();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleAddExpense = useCallback(
    (data: Omit<Expense, 'id' | 'createdAt'>) => {
      addExpense(data);
      setShowAddModal(false);
      addToast('Expense added successfully', 'success');
    },
    [addExpense, addToast]
  );

  const handleUpdateExpense = useCallback(
    (data: Omit<Expense, 'id' | 'createdAt'>) => {
      if (editingExpense) {
        updateExpense(editingExpense.id, data);
        setEditingExpense(null);
        addToast('Expense updated successfully', 'success');
      }
    },
    [editingExpense, updateExpense, addToast]
  );

  const handleDeleteExpense = useCallback(
    (id: string) => {
      deleteExpense(id);
      addToast('Expense deleted', 'success');
    },
    [deleteExpense, addToast]
  );

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading your expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-gray-900">
                Vander<span className="text-indigo-600">Expense</span>
              </h1>
            </div>

            {/* Nav tabs */}
            <nav className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('expenses')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'expenses'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setActiveTab('share')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'share'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Share & Export
              </button>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Add Expense</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="sm:hidden flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'expenses'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('share')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'share'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Share
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'dashboard' && (
          <>
            {/* Summary Cards */}
            <SummaryCards
              totalSpending={totalSpending}
              monthlySpending={monthlySpending}
              expenseCount={expenses.length}
              averageExpense={averageExpense}
            />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Monthly Spending
                </h3>
                <MonthlyChart data={monthlyTrend} />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Spending by Category
                </h3>
                <CategoryChart data={categoryBreakdown} />
              </div>
            </div>

            {/* Recent Expenses */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Expenses
                </h3>
                {expenses.length > 5 && (
                  <button
                    onClick={() => setActiveTab('expenses')}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                  >
                    View all →
                  </button>
                )}
              </div>
              <ExpenseListComponent
                expenses={recentExpenses}
                onEdit={setEditingExpense}
                onDelete={handleDeleteExpense}
              />
            </div>
          </>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <ExpenseFiltersComponent
                filters={filters}
                onChange={setFilters}
                resultCount={filteredExpenses.length}
              />
            </div>

            {/* Expense List */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <ExpenseListComponent
                expenses={filteredExpenses}
                onEdit={setEditingExpense}
                onDelete={handleDeleteExpense}
              />
            </div>
          </div>
        )}

        {activeTab === 'share' && (
          <ShareHub
            expenses={expenses}
            onToast={addToast}
          />
        )}
      </main>

      {/* Add Expense Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Expense"
      >
        <ExpenseForm
          onSubmit={handleAddExpense}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* Edit Expense Modal */}
      <Modal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="Edit Expense"
      >
        <ExpenseForm
          onSubmit={handleUpdateExpense}
          initialData={editingExpense}
          onCancel={() => setEditingExpense(null)}
        />
      </Modal>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
