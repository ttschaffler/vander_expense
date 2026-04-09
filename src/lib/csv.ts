import { Expense } from '@/types/expense';
import { formatDate } from './format';

export function exportToCSV(expenses: Expense[], filename: string = 'expenses') {
  const headers = ['Date', 'Category', 'Description', 'Amount'];
  const rows = expenses.map((exp) => [
    formatDate(exp.date),
    exp.category,
    `"${exp.description.replace(/"/g, '""')}"`,
    exp.amount.toFixed(2),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
