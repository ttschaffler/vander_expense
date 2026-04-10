'use client';

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocalStorage } from './useLocalStorage';
import type { ExportHistoryEntry, ScheduledExport } from '@/types/cloud-export';

const HISTORY_KEY = 'vander-export-history';
const SCHEDULES_KEY = 'vander-export-schedules';

export function useExportHistory() {
  const [history, setHistory] = useLocalStorage<ExportHistoryEntry[]>(HISTORY_KEY, []);
  const [schedules, setSchedules] = useLocalStorage<ScheduledExport[]>(SCHEDULES_KEY, []);

  const addHistoryEntry = useCallback(
    (entry: Omit<ExportHistoryEntry, 'id' | 'timestamp'>) => {
      const newEntry: ExportHistoryEntry = {
        ...entry,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
      };
      setHistory((prev) => [newEntry, ...prev].slice(0, 50));
      return newEntry;
    },
    [setHistory]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const addSchedule = useCallback(
    (schedule: Omit<ScheduledExport, 'id' | 'createdAt'>) => {
      const newSchedule: ScheduledExport = {
        ...schedule,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      };
      setSchedules((prev) => [...prev, newSchedule]);
      return newSchedule;
    },
    [setSchedules]
  );

  const toggleSchedule = useCallback(
    (id: string) => {
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
      );
    },
    [setSchedules]
  );

  const deleteSchedule = useCallback(
    (id: string) => {
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    },
    [setSchedules]
  );

  return {
    history,
    schedules,
    addHistoryEntry,
    clearHistory,
    addSchedule,
    toggleSchedule,
    deleteSchedule,
  };
}
