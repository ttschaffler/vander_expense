'use client';

import { useState } from 'react';
import { Expense, CATEGORY_COLORS, CATEGORY_ICONS } from '@/types/expense';
import { formatCurrency, formatDate } from '@/lib/format';

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export default function ExpenseList({ expenses, onEdit, onDelete }: ExpenseListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (expenses.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No expenses found</h3>
        <p className="text-gray-500">Add your first expense or adjust your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => (
        <div
          key={expense.id}
          className="group flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all"
        >
          {/* Category icon */}
          <div
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-lg"
            style={{ backgroundColor: `${CATEGORY_COLORS[expense.category]}15` }}
          >
            {CATEGORY_ICONS[expense.category]}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{expense.description}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="inline-block px-2 py-0.5 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: `${CATEGORY_COLORS[expense.category]}15`,
                  color: CATEGORY_COLORS[expense.category],
                }}
              >
                {expense.category}
              </span>
              <span className="text-xs text-gray-400">{formatDate(expense.date)}</span>
            </div>
          </div>

          {/* Amount */}
          <div className="flex-shrink-0 text-right">
            <p className="font-semibold text-gray-900">{formatCurrency(expense.amount)}</p>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(expense)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            {confirmDeleteId === expense.id ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    onDelete(expense.id);
                    setConfirmDeleteId(null);
                  }}
                  className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteId(expense.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
