export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: string; // ISO datetime string
}

export type ExpenseCategory =
  | 'Food'
  | 'Transportation'
  | 'Entertainment'
  | 'Shopping'
  | 'Bills'
  | 'Other';

export const CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Other',
];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: '#f97316',
  Transportation: '#3b82f6',
  Entertainment: '#a855f7',
  Shopping: '#ec4899',
  Bills: '#eab308',
  Other: '#6b7280',
};

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  Food: '🍔',
  Transportation: '🚗',
  Entertainment: '🎬',
  Shopping: '🛍️',
  Bills: '📄',
  Other: '📦',
};

export interface ExpenseFilters {
  search: string;
  category: ExpenseCategory | 'All';
  dateFrom: string;
  dateTo: string;
  sortBy: 'date' | 'amount';
  sortOrder: 'asc' | 'desc';
}

export interface MonthlyData {
  month: string;
  total: number;
}

export interface CategoryData {
  category: ExpenseCategory;
  total: number;
  count: number;
  color: string;
}
