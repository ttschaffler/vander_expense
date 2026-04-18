'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CategoryData,
  Expense,
  ExpenseCategory,
} from '@/types/expense';
import { formatCurrency } from '@/lib/format';
import {
  startOfMonth,
  endOfMonth,
  parseISO,
  isWithinInterval,
  format,
  differenceInCalendarDays,
} from 'date-fns';

interface MonthlyInsightsProps {
  expenses: Expense[];
  dailyBudget?: number;
}

export default function MonthlyInsights({
  expenses,
  dailyBudget = 50,
}: MonthlyInsightsProps) {
  const now = useMemo(() => new Date(), []);
  const monthLabel = format(now, 'MMMM yyyy');

  const monthExpenses = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return expenses.filter((exp) => {
      const date = parseISO(exp.date);
      return isWithinInterval(date, { start, end });
    });
  }, [expenses, now]);

  const monthlyTotal = useMemo(
    () => monthExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    [monthExpenses]
  );

  const categoryBreakdown = useMemo<CategoryData[]>(() => {
    const map = new Map<ExpenseCategory, { total: number; count: number }>();
    monthExpenses.forEach((exp) => {
      const existing = map.get(exp.category) || { total: 0, count: 0 };
      map.set(exp.category, {
        total: existing.total + exp.amount,
        count: existing.count + 1,
      });
    });
    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        ...data,
        color: CATEGORY_COLORS[category],
      }))
      .sort((a, b) => b.total - a.total);
  }, [monthExpenses]);

  const topThree = useMemo(
    () => categoryBreakdown.slice(0, 3),
    [categoryBreakdown]
  );

  const budgetStreak = useMemo(() => {
    if (expenses.length === 0) return 0;
    const totalsByDay = new Map<string, number>();
    expenses.forEach((exp) => {
      totalsByDay.set(
        exp.date,
        (totalsByDay.get(exp.date) || 0) + exp.amount
      );
    });
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      const key = format(day, 'yyyy-MM-dd');
      const spent = totalsByDay.get(key) || 0;
      if (spent <= dailyBudget) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [expenses, dailyBudget]);

  const daysInMonthSoFar = differenceInCalendarDays(now, startOfMonth(now)) + 1;
  const avgPerDay = monthlyTotal / Math.max(daysInMonthSoFar, 1);

  return (
    <div className="relative">
      <div
        className="relative bg-[#fdfaf3] rounded-[28px] p-6 sm:p-10 shadow-sm"
        style={{
          border: '2px dashed #1f2937',
          fontFamily:
            '"Caveat", "Kalam", "Comic Sans MS", ui-rounded, system-ui, sans-serif',
        }}
      >
        {/* Title */}
        <div className="text-center mb-2">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
            Monthly Insights
          </h2>
          <svg
            viewBox="0 0 300 12"
            className="mx-auto mt-1 w-64 h-3 text-gray-800"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M2 6 Q 15 0, 30 6 T 60 6 T 90 6 T 120 6 T 150 6 T 180 6 T 210 6 T 240 6 T 270 6 T 298 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <p className="mt-2 text-lg text-gray-600">{monthLabel}</p>
        </div>

        {/* Donut chart */}
        <div className="relative flex items-center justify-center mt-4">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72">
            {categoryBreakdown.length === 0 ? (
              <div
                className="w-full h-full rounded-full flex items-center justify-center text-center text-gray-500"
                style={{ border: '3px solid #1f2937' }}
              >
                <p className="text-xl px-6">
                  No spending yet
                  <br />
                  this month
                </p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="95%"
                      paddingAngle={1}
                      dataKey="total"
                      nameKey="category"
                      stroke="#1f2937"
                      strokeWidth={2}
                    >
                      {categoryBreakdown.map((entry) => (
                        <Cell key={entry.category} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(Number(value)),
                        'Spent',
                      ]}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #1f2937',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontFamily: 'system-ui, sans-serif',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className="bg-white px-4 py-1.5 rounded-lg"
                    style={{ border: '2px solid #1f2937' }}
                  >
                    <span className="text-xl font-bold text-gray-900">
                      Spending
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Hand-drawn annotation */}
          <div className="hidden sm:block absolute right-0 bottom-6 text-gray-700 text-xl italic rotate-[-8deg]">
            Donut chart!
            <svg
              viewBox="0 0 40 40"
              className="w-8 h-8 -mt-1 ml-6 rotate-[160deg] text-gray-700"
              aria-hidden="true"
            >
              <path
                d="M5 5 Q 20 20, 35 35"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M35 35 L 28 32 M35 35 L 32 28"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Top 3 categories */}
        <div className="relative mt-8">
          <div className="absolute -top-2 right-2 text-lg italic text-gray-700 rotate-[-6deg]">
            Top 3!
          </div>
          <ul className="space-y-4 max-w-sm mx-auto sm:mx-0">
            {topThree.length === 0 ? (
              <li className="text-center text-gray-500 text-xl">
                Add expenses to see your top categories
              </li>
            ) : (
              topThree.map((item) => (
                <li
                  key={item.category}
                  className="flex items-center gap-4 pl-3"
                  style={{
                    borderLeft: `6px solid ${item.color}`,
                  }}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {CATEGORY_ICONS[item.category]}
                  </span>
                  <span className="text-xl sm:text-2xl text-gray-900">
                    {item.category}:{' '}
                    <span className="font-bold">
                      {formatCurrency(item.total)}
                    </span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Budget Streak card */}
        <div
          className="relative mt-10 rounded-2xl p-6 text-center"
          style={{ border: '2px dashed #1f2937' }}
        >
          <p className="text-2xl text-gray-900">Budget Streak</p>
          <p className="mt-2 text-6xl font-bold text-emerald-600">
            {budgetStreak}
          </p>
          <p className="text-2xl text-gray-900 mt-1">
            {budgetStreak === 1 ? 'day!' : 'days!'}
          </p>
          <p className="mt-3 text-sm text-gray-500 italic"
             style={{ fontFamily: 'system-ui, sans-serif' }}>
            Days in a row under {formatCurrency(dailyBudget)}/day
          </p>

          {/* Pill decoration */}
          <div
            className="hidden sm:block absolute right-8 top-1/2 -translate-y-1/2 w-20 h-8 rounded-full overflow-hidden"
            style={{ border: '2px solid #1f2937' }}
            aria-hidden="true"
          >
            <div
              className="w-full h-full"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(-45deg, #e5e7eb 0, #e5e7eb 4px, #ffffff 4px, #ffffff 8px)',
              }}
            />
          </div>
        </div>

        {/* Footer stats (plain sans-serif for readability) */}
        <div
          className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Total this month
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(monthlyTotal)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Transactions
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {monthExpenses.length}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Avg / day
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(avgPerDay)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
