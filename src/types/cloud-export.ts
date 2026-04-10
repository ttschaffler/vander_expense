import { ExpenseCategory } from './expense';

// ── Export Templates ───────────────────────────────────────────

export type TemplateId = 'tax-report' | 'monthly-summary' | 'category-analysis' | 'full-backup' | 'custom';

export interface ExportTemplate {
  id: TemplateId;
  name: string;
  description: string;
  icon: string;
  format: 'csv' | 'json' | 'pdf';
  color: string;
  categories?: ExpenseCategory[];
  datePreset?: 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all';
}

export const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'tax-report',
    name: 'Tax Report',
    description: 'Annual expense summary organized by deductible categories, ready for your tax advisor.',
    icon: '🏛️',
    format: 'pdf',
    color: '#6366f1',
    datePreset: 'last-year',
  },
  {
    id: 'monthly-summary',
    name: 'Monthly Summary',
    description: 'Current month breakdown with category totals and spending trends.',
    icon: '📅',
    format: 'pdf',
    color: '#10b981',
    datePreset: 'this-month',
  },
  {
    id: 'category-analysis',
    name: 'Category Analysis',
    description: 'Deep dive into spending patterns across all categories.',
    icon: '📊',
    format: 'pdf',
    color: '#f59e0b',
    datePreset: 'all',
  },
  {
    id: 'full-backup',
    name: 'Full Data Backup',
    description: 'Complete JSON backup of all your expense data for safekeeping.',
    icon: '💾',
    format: 'json',
    color: '#8b5cf6',
    datePreset: 'all',
  },
  {
    id: 'custom',
    name: 'Custom Export',
    description: 'Build your own export with flexible format and filter options.',
    icon: '⚡',
    format: 'csv',
    color: '#64748b',
    datePreset: 'all',
  },
];

// ── Cloud Integrations ─────────────────────────────────────────

export type IntegrationId = 'google-sheets' | 'dropbox' | 'onedrive' | 'notion' | 'email';

export interface CloudIntegration {
  id: IntegrationId;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  connected: boolean;
}

export const CLOUD_INTEGRATIONS: CloudIntegration[] = [
  { id: 'google-sheets', name: 'Google Sheets', icon: '📗', color: '#34a853', bgColor: '#e6f4ea', description: 'Sync expenses to a Google Sheet automatically' , connected: false },
  { id: 'dropbox', name: 'Dropbox', icon: '📦', color: '#0061ff', bgColor: '#e6f0ff', description: 'Save exports to your Dropbox folder', connected: false },
  { id: 'onedrive', name: 'OneDrive', icon: '☁️', color: '#0078d4', bgColor: '#e6f2ff', description: 'Sync with Microsoft OneDrive', connected: false },
  { id: 'notion', name: 'Notion', icon: '📝', color: '#000000', bgColor: '#f0f0f0', description: 'Create expense databases in Notion', connected: false },
  { id: 'email', name: 'Email', icon: '✉️', color: '#ea4335', bgColor: '#fce8e6', description: 'Send reports directly to any email address', connected: false },
];

// ── Export History ──────────────────────────────────────────────

export interface ExportHistoryEntry {
  id: string;
  templateId: TemplateId;
  templateName: string;
  format: string;
  recordCount: number;
  totalAmount: number;
  timestamp: string;
  destination: string; // 'download', 'email:x@y.com', 'google-sheets', etc.
  status: 'completed' | 'failed' | 'scheduled';
  shareId?: string;
}

// ── Scheduled Exports ──────────────────────────────────────────

export interface ScheduledExport {
  id: string;
  templateId: TemplateId;
  templateName: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  destination: string;
  nextRun: string;
  enabled: boolean;
  createdAt: string;
}
