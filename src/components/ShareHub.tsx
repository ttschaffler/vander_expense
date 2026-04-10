'use client';

import { useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { Expense } from '@/types/expense';
import {
  EXPORT_TEMPLATES,
  CLOUD_INTEGRATIONS,
  ExportTemplate,
  ScheduledExport,
  CloudIntegration,
} from '@/types/cloud-export';
import { useExportHistory } from '@/hooks/useExportHistory';
import { generateExport, downloadBlob, generateSharePayload } from '@/lib/cloud-export';
import { formatCurrency } from '@/lib/format';

interface ShareHubProps {
  expenses: Expense[];
  onToast: (msg: string, type: 'success' | 'error') => void;
}

type Panel = 'home' | 'exporting' | 'share' | 'email' | 'schedule' | 'history' | 'integration';

export default function ShareHub({ expenses, onToast }: ShareHubProps) {
  const { history, schedules, addHistoryEntry, clearHistory, addSchedule, toggleSchedule, deleteSchedule } = useExportHistory();
  const [panel, setPanel] = useState<Panel>('home');
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);
  const [exporting, setExporting] = useState(false);

  // Share state
  const [shareLink, setShareLink] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Email state
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('VanderExpense Report');
  const [emailSending, setEmailSending] = useState(false);

  // Schedule state
  const [schedFreq, setSchedFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [schedDest, setSchedDest] = useState('email');

  // Integration state
  const [activeIntegration, setActiveIntegration] = useState<CloudIntegration | null>(null);
  const [integrationConnecting, setIntegrationConnecting] = useState(false);
  const [connectedServices, setConnectedServices] = useState<Set<string>>(new Set());

  // ── Export Handler ──

  const handleTemplateExport = useCallback(async (template: ExportTemplate) => {
    setSelectedTemplate(template);
    setExporting(true);
    setPanel('exporting');

    try {
      const result = await generateExport(expenses, template);
      downloadBlob(result.blob, result.filename);
      addHistoryEntry({
        templateId: template.id,
        templateName: template.name,
        format: template.format,
        recordCount: result.recordCount,
        totalAmount: result.totalAmount,
        destination: 'download',
        status: 'completed',
      });
      onToast(`${template.name} exported — ${result.recordCount} records`, 'success');
    } catch {
      onToast('Export failed', 'error');
    } finally {
      setExporting(false);
      setTimeout(() => setPanel('home'), 1200);
    }
  }, [expenses, addHistoryEntry, onToast]);

  // ── Share Link Handler ──

  const handleOpenShare = useCallback(async (template: ExportTemplate) => {
    setSelectedTemplate(template);
    setPanel('share');

    const payload = generateSharePayload(expenses.slice(0, 100)); // limit for URL safety
    const link = `${window.location.origin}${window.location.pathname}?shared=${payload.slice(0, 200)}`;
    setShareLink(link);
    setCopied(false);

    try {
      const url = await QRCode.toDataURL(link, { width: 200, margin: 2, color: { dark: '#4f46e5' } });
      setQrDataUrl(url);
    } catch {
      setQrDataUrl('');
    }
  }, [expenses]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    onToast('Share link copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  }, [shareLink, onToast]);

  // ── Email Handler ──

  const handleEmailSend = useCallback(async () => {
    if (!emailTo || !selectedTemplate) return;
    setEmailSending(true);

    // Simulate sending
    await new Promise((r) => setTimeout(r, 1500));

    addHistoryEntry({
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      format: selectedTemplate.format,
      recordCount: expenses.length,
      totalAmount: expenses.reduce((s, e) => s + e.amount, 0),
      destination: `email:${emailTo}`,
      status: 'completed',
    });

    onToast(`Report sent to ${emailTo}`, 'success');
    setEmailSending(false);
    setPanel('home');
    setEmailTo('');
  }, [emailTo, selectedTemplate, expenses, addHistoryEntry, onToast]);

  // ── Schedule Handler ──

  const handleCreateSchedule = useCallback(() => {
    if (!selectedTemplate) return;
    const nextRun = new Date();
    if (schedFreq === 'daily') nextRun.setDate(nextRun.getDate() + 1);
    else if (schedFreq === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
    else nextRun.setMonth(nextRun.getMonth() + 1);

    addSchedule({
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      frequency: schedFreq,
      destination: schedDest,
      nextRun: nextRun.toISOString(),
      enabled: true,
    });
    onToast(`Scheduled ${schedFreq} export of ${selectedTemplate.name}`, 'success');
    setPanel('home');
  }, [selectedTemplate, schedFreq, schedDest, addSchedule, onToast]);

  // ── Integration Connect Handler ──

  const handleConnect = useCallback(async (integration: CloudIntegration) => {
    setActiveIntegration(integration);
    setIntegrationConnecting(true);
    setPanel('integration');

    // Simulate OAuth flow
    await new Promise((r) => setTimeout(r, 2000));

    setConnectedServices((prev) => new Set(prev).add(integration.id));
    setIntegrationConnecting(false);
    onToast(`Connected to ${integration.name}`, 'success');
  }, [onToast]);

  const handleSyncToIntegration = useCallback(async (integration: CloudIntegration) => {
    if (!connectedServices.has(integration.id)) {
      handleConnect(integration);
      return;
    }
    setExporting(true);
    await new Promise((r) => setTimeout(r, 1500));

    addHistoryEntry({
      templateId: 'full-backup',
      templateName: 'Auto Sync',
      format: 'json',
      recordCount: expenses.length,
      totalAmount: expenses.reduce((s, e) => s + e.amount, 0),
      destination: integration.id,
      status: 'completed',
    });

    setExporting(false);
    onToast(`Synced ${expenses.length} expenses to ${integration.name}`, 'success');
  }, [connectedServices, expenses, addHistoryEntry, handleConnect, onToast]);

  // ── Home Panel ──

  if (panel === 'home') {
    return (
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 rounded-2xl p-6 sm:p-8 text-white">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold">Share & Export</h2>
            <p className="text-indigo-100 mt-1 text-sm">Export reports, share data, and sync with your favorite tools.</p>
            <div className="flex flex-wrap gap-4 mt-5">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2">
                <p className="text-xs text-indigo-200">Total Records</p>
                <p className="text-lg font-bold">{expenses.length}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2">
                <p className="text-xs text-indigo-200">Total Spending</p>
                <p className="text-lg font-bold">{formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2">
                <p className="text-xs text-indigo-200">Exports Made</p>
                <p className="text-lg font-bold">{history.length}</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -right-4 -bottom-12 w-56 h-56 bg-white/5 rounded-full" />
        </div>

        {/* Export Templates */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Templates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXPORT_TEMPLATES.map((tpl) => (
              <div key={tpl.id} className="group bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{tpl.icon}</span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider"
                    style={{ backgroundColor: `${tpl.color}15`, color: tpl.color }}>
                    {tpl.format}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-900">{tpl.name}</h4>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{tpl.description}</p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleTemplateExport(tpl)}
                    disabled={expenses.length === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors disabled:opacity-40"
                    style={{ backgroundColor: `${tpl.color}10`, color: tpl.color }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export
                  </button>
                  <button
                    onClick={() => handleOpenShare(tpl)}
                    disabled={expenses.length === 0}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-40"
                    title="Share"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  </button>
                  <button
                    onClick={() => { setSelectedTemplate(tpl); setPanel('email'); }}
                    disabled={expenses.length === 0}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-40"
                    title="Email"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </button>
                  <button
                    onClick={() => { setSelectedTemplate(tpl); setPanel('schedule'); }}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                    title="Schedule"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cloud Integrations */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cloud Integrations</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CLOUD_INTEGRATIONS.map((intg) => {
              const isConnected = connectedServices.has(intg.id);
              return (
                <button
                  key={intg.id}
                  onClick={() => handleSyncToIntegration(intg)}
                  disabled={exporting}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md hover:border-gray-200 transition-all text-left disabled:opacity-50"
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: intg.bgColor }}>
                    {intg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{intg.name}</span>
                      {isConnected && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          SYNCED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{intg.description}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scheduled Exports */}
        {schedules.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Scheduled Exports</h3>
            <div className="space-y-2">
              {schedules.map((sched) => (
                <ScheduleRow key={sched.id} schedule={sched} onToggle={toggleSchedule} onDelete={deleteSchedule} />
              ))}
            </div>
          </div>
        )}

        {/* Export History */}
        {history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Export History</h3>
              <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Clear all</button>
            </div>
            <div className="space-y-2">
              {history.slice(0, 8).map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.status === 'completed' ? 'bg-emerald-500' : entry.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{entry.templateName}</p>
                    <p className="text-xs text-gray-400">
                      {entry.recordCount} records · {formatCurrency(entry.totalAmount)} · {entry.destination}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {history.length > 8 && (
                <button onClick={() => setPanel('history')} className="w-full text-center text-sm text-indigo-600 hover:text-indigo-800 py-2 font-medium">
                  View all {history.length} exports →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Exporting Panel ──

  if (panel === 'exporting') {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-t-indigo-600 animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-2xl">{selectedTemplate?.icon}</span>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            {exporting ? `Generating ${selectedTemplate?.name}...` : 'Export Complete!'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {exporting ? 'Processing your data' : 'Your file has been downloaded'}
          </p>
        </div>
        {!exporting && (
          <button onClick={() => setPanel('home')} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm">
            Back to Share Hub
          </button>
        )}
      </div>
    );
  }

  // ── Share Panel ──

  if (panel === 'share') {
    return (
      <div className="max-w-md mx-auto space-y-6 py-4">
        <button onClick={() => setPanel('home')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <div className="text-center">
          <span className="text-4xl">{selectedTemplate?.icon}</span>
          <h3 className="text-xl font-bold text-gray-900 mt-3">Share {selectedTemplate?.name}</h3>
          <p className="text-sm text-gray-500 mt-1">Anyone with the link can view a snapshot of your data.</p>
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
            </div>
          </div>
        )}

        {/* Share Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Share Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareLink}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 bg-gray-50 truncate"
            />
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                copied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Social sharing row */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quick Share</label>
          <div className="flex gap-3">
            {[
              { name: 'WhatsApp', color: '#25d366', icon: '💬' },
              { name: 'Telegram', color: '#0088cc', icon: '✈️' },
              { name: 'Slack', color: '#4a154b', icon: '💼' },
            ].map((svc) => (
              <button
                key={svc.name}
                onClick={() => onToast(`Share via ${svc.name} — coming soon!`, 'success')}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border border-gray-100 hover:shadow-md transition-all"
              >
                <span className="text-xl">{svc.icon}</span>
                <span className="text-xs font-medium text-gray-600">{svc.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Email Panel ──

  if (panel === 'email') {
    return (
      <div className="max-w-md mx-auto space-y-6 py-4">
        <button onClick={() => setPanel('home')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-red-50 rounded-2xl flex items-center justify-center text-3xl">✉️</div>
          <h3 className="text-xl font-bold text-gray-900 mt-3">Email Report</h3>
          <p className="text-sm text-gray-500 mt-1">Send <strong>{selectedTemplate?.name}</strong> directly to an inbox.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient Email</label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
            <p>Attachment: <strong>{selectedTemplate?.name}</strong> ({selectedTemplate?.format.toUpperCase()})</p>
            <p>Records: <strong>{expenses.length}</strong></p>
            <p>Total: <strong>{formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}</strong></p>
          </div>
          <button
            onClick={handleEmailSend}
            disabled={!emailTo || emailSending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {emailSending ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                Send Report
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Schedule Panel ──

  if (panel === 'schedule') {
    return (
      <div className="max-w-md mx-auto space-y-6 py-4">
        <button onClick={() => setPanel('home')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center text-3xl">⏰</div>
          <h3 className="text-xl font-bold text-gray-900 mt-3">Schedule Export</h3>
          <p className="text-sm text-gray-500 mt-1">Automatically export <strong>{selectedTemplate?.name}</strong> on a recurring basis.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
            <div className="grid grid-cols-3 gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSchedFreq(f)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all capitalize ${
                    schedFreq === f ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Deliver To</label>
            <div className="space-y-2">
              {[
                { value: 'email', label: 'Email', sub: 'Send to your inbox', icon: '✉️' },
                { value: 'google-sheets', label: 'Google Sheets', sub: 'Append to spreadsheet', icon: '📗' },
                { value: 'dropbox', label: 'Dropbox', sub: 'Save to cloud folder', icon: '📦' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSchedDest(opt.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    schedDest === opt.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreateSchedule}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Create Schedule
          </button>
        </div>
      </div>
    );
  }

  // ── Integration Panel ──

  if (panel === 'integration' && activeIntegration) {
    return (
      <div className="max-w-md mx-auto space-y-6 py-4">
        <button onClick={() => setPanel('home')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-4xl" style={{ backgroundColor: activeIntegration.bgColor }}>
            {activeIntegration.icon}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mt-4">{activeIntegration.name}</h3>
          {integrationConnecting ? (
            <>
              <div className="mt-6 flex justify-center">
                <div className="w-8 h-8 border-[3px] border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
              </div>
              <p className="text-sm text-gray-500 mt-3">Connecting to {activeIntegration.name}...</p>
              <p className="text-xs text-gray-400 mt-1">Simulating OAuth authorization flow</p>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Connected
              </span>
              <p className="text-sm text-gray-500 mt-4">{activeIntegration.description}</p>
              <button
                onClick={() => setPanel('home')}
                className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── History Panel ──

  if (panel === 'history') {
    return (
      <div className="space-y-4">
        <button onClick={() => setPanel('home')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <h3 className="text-lg font-semibold text-gray-900">Full Export History</h3>
        <div className="space-y-2">
          {history.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.status === 'completed' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{entry.templateName}</p>
                <p className="text-xs text-gray-400">{entry.recordCount} records · {formatCurrency(entry.totalAmount)} · {entry.destination}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{new Date(entry.timestamp).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// ── Schedule Row Sub-component ─────────────────────────────────

function ScheduleRow({ schedule, onToggle, onDelete }: { schedule: ScheduledExport; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-white border border-gray-100 rounded-xl">
      <button
        onClick={() => onToggle(schedule.id)}
        className={`w-10 h-6 rounded-full p-0.5 transition-colors ${schedule.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${schedule.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{schedule.templateName}</p>
        <p className="text-xs text-gray-400 capitalize">{schedule.frequency} · {schedule.destination}</p>
      </div>
      {showConfirm ? (
        <div className="flex gap-1">
          <button onClick={() => { onDelete(schedule.id); }} className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg">Delete</button>
          <button onClick={() => setShowConfirm(false)} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setShowConfirm(true)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}
    </div>
  );
}
