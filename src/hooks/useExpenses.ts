'use client';

import { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Expense,
  ExpenseCategory,
  ExpenseFilters,
  CATEGORY_COLORS,
  CategoryData,
  MonthlyData,
} from '@/types/expense';
import { useLocalStorage } from './useLocalStorage';
import {
  startOfMonth,
  endOfMonth,
  parseISO,
  isWithinInterval,
  format,
  subMonths,
} from 'date-fns';

const STORAGE_KEY = 'vander-expenses';

export function useExpenses() {
  const [expenses, setExpenses, isLoaded] = useLocalStorage<Expense[]>(
    STORAGE_KEY,
    []
  );

  const addExpense = useCallback(
    (data: Omit<Expense, 'id' | 'createdAt'>) => {
      const newExpense: Expense = {
        ...data,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      };
      setExpenses((prev) => [newExpense, ...prev]);
      return newExpense;
    },
    [setExpenses]
  );

  const updateExpense = useCallback(
    (id: string, data: Partial<Omit<Expense, 'id' | 'createdAt'>>) => {
      setExpenses((prev) =>
        prev.map((exp) => (exp.id === id ? { ...exp, ...data } : exp))
      );
    },
    [setExpenses]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      setExpenses((prev) => prev.filter((exp) => exp.id !== id));
    },
    [setExpenses]
  );

  const filterExpenses = useCallback(
    (filters: ExpenseFilters): Expense[] => {
      let filtered = [...expenses];

      if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(
          (exp) =>
            exp.description.toLowerCase().includes(search) ||
            exp.category.toLowerCase().includes(search)
        );
      }

      if (filters.category !== 'All') {
        filtered = filtered.filter(
          (exp) => exp.category === filters.category
        );
      }

      if (filters.dateFrom) {
        filtered = filtered.filter((exp) => exp.date >= filters.dateFrom);
      }

      if (filters.dateTo) {
        filtered = filtered.filter((exp) => exp.date <= filters.dateTo);
      }

      filtered.sort((a, b) => {
        const modifier = filters.sortOrder === 'asc' ? 1 : -1;
        if (filters.sortBy === 'date') {
          return (a.date.localeCompare(b.date)) * modifier;
        }
        return (a.amount - b.amount) * modifier;
      });

      return filtered;
    },
    [expenses]
  );

  const totalSpending = useMemo(
    () => expenses.reduce((sum, exp) => sum + exp.amount, 0),
    [expenses]
  );

  const monthlySpending = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return expenses
      .filter((exp) => {
        const date = parseISO(exp.date);
        return isWithinInterval(date, { start, end });
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  const categoryBreakdown = useMemo((): CategoryData[] => {
    const map = new Map<ExpenseCategory, { total: number; count: number }>();
    expenses.forEach((exp) => {
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
  }, [expenses]);

  const monthlyTrend = useMemo((): MonthlyData[] => {
    const now = new Date();
    const months: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const total = expenses
        .filter((exp) => {
          const date = parseISO(exp.date);
          return isWithinInterval(date, { start, end });
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
      months.push({
        month: format(monthDate, 'MMM yyyy'),
        total,
      });
    }
    return months;
  }, [expenses]);

  const averageExpense = useMemo(
    () => (expenses.length > 0 ? totalSpending / expenses.length : 0),
    [expenses.length, totalSpending]
  );

  return {
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
  };
}
