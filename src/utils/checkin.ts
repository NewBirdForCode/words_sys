/**
 * Daily Check-in and Streak calculation utility
 */

export interface CheckInRecord {
  date: string; // YYYY-MM-DD
  timestamp: number;
  completedWords: number;
  accuracyRate: number; // 0 - 100
  note?: string;
  photoUrl?: string; // Data URL thumbnail
}

import { userScopedStorageKey } from './userStorage';

const STORAGE_KEY_CHECKIN = userScopedStorageKey('daily30_checkin_records_v1');

export function getAllCheckInRecords(): CheckInRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHECKIN);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load check-in records:', e);
    return [];
  }
}

export function saveCheckInRecord(record: CheckInRecord): void {
  if (typeof window === 'undefined') return;
  const list = getAllCheckInRecords();
  const existingIdx = list.findIndex(r => r.date === record.date);
  if (existingIdx >= 0) {
    list[existingIdx] = record;
  } else {
    list.push(record);
  }
  // Sort desc by date
  list.sort((a, b) => b.date.localeCompare(a.date));
  localStorage.setItem(STORAGE_KEY_CHECKIN, JSON.stringify(list));
}

/**
 * Calculate consecutive streak days (连续打卡天数🔥)
 */
export function calculateStreakDays(): number {
  const records = getAllCheckInRecords();
  if (records.length === 0) return 0;

  const dateSet = new Set(records.map(r => r.date));

  const today = new Date();
  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatDate(today);
  
  // Yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  let streak = 0;
  let currDate = new Date(today);

  // If checked in today, start count from today; if not checked in today yet, check if checked in yesterday
  if (dateSet.has(todayStr)) {
    currDate = new Date(today);
  } else if (dateSet.has(yesterdayStr)) {
    currDate = new Date(yesterday);
  } else {
    return 0; // Broken streak
  }

  while (true) {
    const checkStr = formatDate(currDate);
    if (dateSet.has(checkStr)) {
      streak++;
      currDate.setDate(currDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
