'use client';

import { formatCurrency } from '@/lib/format';

interface SummaryCardsProps {
  totalSpending: number;
  monthlySpending: number;
  expenseCount: number;
  averageExpense: number;
}

const cards = [
  {
    key: 'total',
    label: 'Total Spending',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'from-indigo-500 to-indigo-600',
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
  {
    key: 'monthly',
    label: 'This Month',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: 'from-emerald-500 to-emerald-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
  {
    key: 'count',
    label: 'Total Expenses',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    color: 'from-amber-500 to-amber-600',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    key: 'average',
    label: 'Average Expense',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: 'from-violet-500 to-violet-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
];

export default function SummaryCards({
  totalSpending,
  monthlySpending,
  expenseCount,
  averageExpense,
}: SummaryCardsProps) {
  const values: Record<string, string> = {
    total: formatCurrency(totalSpending),
    monthly: formatCurrency(monthlySpending),
    count: expenseCount.toString(),
    average: formatCurrency(averageExpense),
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="relative overflow-hidden bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${card.bgLight} ${card.textColor}`}>
              {card.icon}
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{values[card.key]}</p>
          <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          <div
            className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.color} opacity-[0.03] rounded-full -translate-y-8 translate-x-8`}
          />
        </div>
      ))}
    </div>
  );
}
