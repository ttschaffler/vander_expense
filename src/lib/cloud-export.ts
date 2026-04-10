import { Expense, ExpenseCategory, CATEGORIES, CATEGORY_COLORS } from '@/types/expense';
import { ExportTemplate } from '@/types/cloud-export';
import { formatCurrency, formatDate } from './format';
import {
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  subMonths, subYears, format, parseISO, isWithinInterval,
} from 'date-fns';

// ── Date Preset Resolver ───────────────────────────────────────

export function resolveDatePreset(preset?: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  switch (preset) {
    case 'this-month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last-month': {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    case 'this-year':
      return { from: startOfYear(now), to: endOfYear(now) };
    case 'last-year': {
      const ly = subYears(now, 1);
      return { from: startOfYear(ly), to: endOfYear(ly) };
    }
    default:
      return { from: null, to: null };
  }
}

export function filterByTemplate(expenses: Expense[], template: ExportTemplate): Expense[] {
  const { from, to } = resolveDatePreset(template.datePreset);
  return expenses.filter((exp) => {
    if (template.categories && !template.categories.includes(exp.category)) return false;
    if (from && to) {
      const d = parseISO(exp.date);
      if (!isWithinInterval(d, { start: from, end: to })) return false;
    }
    return true;
  });
}

// ── CSV Generator ──────────────────────────────────────────────

function toCSV(expenses: Expense[]): Blob {
  const rows = [
    'Date,Category,Description,Amount',
    ...expenses.map((e) => `${e.date},${e.category},"${e.description.replace(/"/g, '""')}",${e.amount.toFixed(2)}`),
  ];
  return new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
}

// ── JSON Generator ─────────────────────────────────────────────

function toJSON(expenses: Expense[], templateName: string): Blob {
  const data = {
    meta: { exportedAt: new Date().toISOString(), template: templateName, records: expenses.length },
    summary: {
      total: expenses.reduce((s, e) => s + e.amount, 0),
      categories: Object.fromEntries(
        CATEGORIES.map((c) => [c, expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0)])
      ),
    },
    expenses: expenses.map(({ date, category, description, amount }) => ({ date, category, description, amount })),
  };
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

// ── PDF Generator ──────────────────────────────────────────────

async function toPDF(expenses: Expense[], template: ExportTemplate): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF('portrait', 'mm', 'a4');
  const W = doc.internal.pageSize.getWidth();
  const color = template.color;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // ── Header ──
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, W, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(template.name, 14, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`VanderExpense  •  ${format(new Date(), 'MMMM d, yyyy')}`, 14, 22);

  const { from, to } = resolveDatePreset(template.datePreset);
  if (from && to) {
    doc.text(`Period: ${format(from, 'MMM d, yyyy')} – ${format(to, 'MMM d, yyyy')}`, 14, 28);
  }

  // ── Summary Cards ──
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const avg = expenses.length > 0 ? total / expenses.length : 0;
  const catMap = new Map<ExpenseCategory, number>();
  expenses.forEach((e) => catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount));
  const topCat = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0];

  let y = 40;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(r, g, b);
  doc.text('SUMMARY', 14, y);
  y += 6;

  const cards = [
    { label: 'Total Spending', value: formatCurrency(total) },
    { label: 'Transactions', value: String(expenses.length) },
    { label: 'Average', value: formatCurrency(avg) },
    { label: 'Top Category', value: topCat ? `${topCat[0]} (${formatCurrency(topCat[1])})` : 'N/A' },
  ];
  const cardW = (W - 28 - 12) / 4;
  cards.forEach((card, i) => {
    const cx = 14 + i * (cardW + 4);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cx, y, cardW, 16, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text(card.label, cx + 3, y + 5);
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(card.value, cx + 3, y + 12);
  });
  y += 22;

  // ── Category Breakdown (for analysis & tax reports) ──
  if (template.id !== 'full-backup') {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(r, g, b);
    doc.text('CATEGORY BREAKDOWN', 14, y);
    y += 6;

    const maxVal = Math.max(...Array.from(catMap.values()), 1);
    Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, amount]) => {
        const cc = CATEGORY_COLORS[cat];
        const cr = parseInt(cc.slice(1, 3), 16);
        const cg = parseInt(cc.slice(3, 5), 16);
        const cb = parseInt(cc.slice(5, 7), 16);
        const pct = ((amount / total) * 100).toFixed(1);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(cat, 14, y + 3);

        const barW = (amount / maxVal) * 80;
        doc.setFillColor(cr, cg, cb);
        doc.roundedRect(48, y - 0.5, barW, 4, 1, 1, 'F');

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(`${formatCurrency(amount)}  (${pct}%)`, 48 + 82, y + 3);
        y += 7;
      });
    y += 4;
  }

  // ── Expense Table ──
  autoTable(doc, {
    startY: y,
    head: [['Date', 'Category', 'Description', 'Amount']],
    body: expenses.map((e) => [
      formatDate(e.date),
      e.category,
      e.description.length > 55 ? e.description.substring(0, 52) + '...' : e.description,
      formatCurrency(e.amount),
    ]),
    headStyles: { fillColor: [r, g, b], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
    bodyStyles: { fontSize: 7.5, cellPadding: 2.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 28 }, 3: { cellWidth: 26, halign: 'right' } },
    margin: { left: 14, right: 14 },
    didDrawPage: (data: { pageNumber: number }) => {
      const pH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(`VanderExpense · ${template.name} · Page ${data.pageNumber}`, W / 2, pH - 8, { align: 'center' });
    },
  });

  return doc.output('blob');
}

// ── Main Export Dispatcher ─────────────────────────────────────

export async function generateExport(
  expenses: Expense[],
  template: ExportTemplate
): Promise<{ blob: Blob; filename: string; recordCount: number; totalAmount: number }> {
  const filtered = filterByTemplate(expenses, template);
  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const dateSuffix = format(new Date(), 'yyyy-MM-dd');
  const slug = template.id === 'custom' ? 'export' : template.id;
  const ext = { csv: '.csv', json: '.json', pdf: '.pdf' }[template.format];
  const filename = `vander-${slug}-${dateSuffix}${ext}`;

  let blob: Blob;
  switch (template.format) {
    case 'csv':
      blob = toCSV(filtered);
      break;
    case 'json':
      blob = toJSON(filtered, template.name);
      break;
    case 'pdf':
      blob = await toPDF(filtered, template);
      break;
  }

  return { blob, filename, recordCount: filtered.length, totalAmount: total };
}

// ── Download Helper ────────────────────────────────────────────

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

// ── Share Link Generator ───────────────────────────────────────

export function generateSharePayload(expenses: Expense[]): string {
  const data = expenses.map(({ date, category, description, amount }) => ({ d: date, c: category, n: description, a: amount }));
  return btoa(JSON.stringify(data));
}
