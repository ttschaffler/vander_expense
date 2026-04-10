import { Expense, ExpenseCategory, CATEGORIES, CATEGORY_COLORS } from '@/types/expense';
import { formatCurrency, formatDate } from './format';

// ── Types ──────────────────────────────────────────────────────

export type ExportFormat = 'csv' | 'json' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  filename: string;
  dateFrom: string;
  dateTo: string;
  categories: Set<ExpenseCategory>;
  includeHeaders: boolean;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  recordCount: number;
  format: ExportFormat;
}

export const FORMAT_META: Record<ExportFormat, { label: string; ext: string; mime: string; icon: string }> = {
  csv: { label: 'CSV Spreadsheet', ext: '.csv', mime: 'text/csv;charset=utf-8;', icon: '📊' },
  json: { label: 'JSON Data', ext: '.json', mime: 'application/json;charset=utf-8;', icon: '{ }' },
  pdf: { label: 'PDF Report', ext: '.pdf', mime: 'application/pdf', icon: '📄' },
};

// ── Filter ─────────────────────────────────────────────────────

export function filterForExport(expenses: Expense[], options: ExportOptions): Expense[] {
  return expenses.filter((exp) => {
    if (options.dateFrom && exp.date < options.dateFrom) return false;
    if (options.dateTo && exp.date > options.dateTo) return false;
    if (options.categories.size > 0 && !options.categories.has(exp.category)) return false;
    return true;
  });
}

// ── Default Options ────────────────────────────────────────────

export function defaultExportOptions(): ExportOptions {
  return {
    format: 'csv',
    filename: `expenses-${new Date().toISOString().split('T')[0]}`,
    dateFrom: '',
    dateTo: '',
    categories: new Set(CATEGORIES),
    includeHeaders: true,
  };
}

// ── CSV Exporter ───────────────────────────────────────────────

function generateCSV(expenses: Expense[], includeHeaders: boolean): string {
  const headers = ['Date', 'Category', 'Description', 'Amount (USD)'];
  const rows = expenses.map((exp) => [
    exp.date,
    exp.category,
    `"${exp.description.replace(/"/g, '""')}"`,
    exp.amount.toFixed(2),
  ]);

  const lines: string[] = [];
  if (includeHeaders) lines.push(headers.join(','));
  lines.push(...rows.map((r) => r.join(',')));
  return lines.join('\n');
}

// ── JSON Exporter ──────────────────────────────────────────────

function generateJSON(expenses: Expense[]): string {
  const data = {
    exportedAt: new Date().toISOString(),
    totalRecords: expenses.length,
    totalAmount: expenses.reduce((s, e) => s + e.amount, 0),
    currency: 'USD',
    expenses: expenses.map((exp) => ({
      date: exp.date,
      category: exp.category,
      description: exp.description,
      amount: exp.amount,
    })),
  };
  return JSON.stringify(data, null, 2);
}

// ── PDF Exporter ───────────────────────────────────────────────

async function generatePDF(expenses: Expense[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('VanderExpense', 14, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Expense Report', 14, 19);
  doc.text(`Generated: ${formatDate(new Date().toISOString().split('T')[0])}`, 14, 24);

  // Summary section
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const categoryMap = new Map<string, number>();
  expenses.forEach((e) => {
    categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
  });
  const topCategory = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1])[0];

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, 38);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const summaryY = 44;
  doc.text(`Total Expenses: ${formatCurrency(total)}`, 14, summaryY);
  doc.text(`Number of Records: ${expenses.length}`, 14, summaryY + 5);
  doc.text(`Average Expense: ${formatCurrency(expenses.length > 0 ? total / expenses.length : 0)}`, 14, summaryY + 10);
  if (topCategory) {
    doc.text(`Top Category: ${topCategory[0]} (${formatCurrency(topCategory[1])})`, 14, summaryY + 15);
  }

  // Category breakdown mini-bars
  if (categoryMap.size > 0) {
    const barStartY = summaryY + 23;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Category Breakdown', 14, barStartY);

    let y = barStartY + 5;
    const maxBarWidth = 70;
    const maxVal = Math.max(...Array.from(categoryMap.values()));
    Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, amount]) => {
        const color = CATEGORY_COLORS[cat as ExpenseCategory];
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(cat, 14, y + 3);

        const barWidth = (amount / maxVal) * maxBarWidth;
        doc.setFillColor(r, g, b);
        doc.roundedRect(50, y - 1, barWidth, 4, 1, 1, 'F');

        doc.setTextColor(15, 23, 42);
        doc.text(formatCurrency(amount), 50 + maxBarWidth + 3, y + 3);
        y += 7;
      });
  }

  // Expense table
  const tableStartY = summaryY + 25 + categoryMap.size * 7 + 8;

  autoTable(doc, {
    startY: tableStartY,
    head: [['Date', 'Category', 'Description', 'Amount']],
    body: expenses.map((e) => [
      formatDate(e.date),
      e.category,
      e.description.length > 50 ? e.description.substring(0, 47) + '...' : e.description,
      formatCurrency(e.amount),
    ]),
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 30 },
      3: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data: { pageNumber: number }) => {
      // Footer on each page
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `VanderExpense Report — Page ${data.pageNumber}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    },
  });

  return doc.output('blob');
}

// ── Main Export Function ───────────────────────────────────────

export async function executeExport(
  expenses: Expense[],
  options: ExportOptions
): Promise<ExportResult> {
  const filtered = filterForExport(expenses, options);
  const meta = FORMAT_META[options.format];
  const fullFilename = `${options.filename}${meta.ext}`;

  let blob: Blob;

  switch (options.format) {
    case 'csv':
      blob = new Blob([generateCSV(filtered, options.includeHeaders)], { type: meta.mime });
      break;
    case 'json':
      blob = new Blob([generateJSON(filtered)], { type: meta.mime });
      break;
    case 'pdf':
      blob = await generatePDF(filtered);
      break;
  }

  return { blob, filename: fullFilename, recordCount: filtered.length, format: options.format };
}

// ── Download Trigger ───────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
