import { ActiveSessionState, ReviewLogRecord, WordStats, ReviewStage, MistakeItem } from '../types';

const STORAGE_KEY_LOGS = 'daily30_review_logs_v1';
const STORAGE_KEY_ACTIVE_SESSION = 'daily30_active_session_v1';
const STORAGE_KEY_USER_ID = 'daily30_user_id_v1';
const STORAGE_KEY_MISTAKES = 'daily30_mistake_book_v2';

// 错题本持久化操作 (阶段三：高频错误循环使用)
export function getMistakeBook(): Record<string, MistakeItem> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MISTAKES);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load mistake book:', e);
    return {};
  }
}

export function saveMistakeBook(book: Record<string, MistakeItem>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_MISTAKES, JSON.stringify(book));
}

export function recordMistake(wordId: string): void {
  const book = getMistakeBook();
  const current = book[wordId] || { wordId, errorCount: 0, lastWrongAt: Date.now() };
  book[wordId] = {
    wordId,
    errorCount: current.errorCount + 1,
    lastWrongAt: Date.now(),
  };
  saveMistakeBook(book);
}

export function removeMistake(wordId: string): void {
  const book = getMistakeBook();
  delete book[wordId];
  saveMistakeBook(book);
}

export function getMistakesSorted(): MistakeItem[] {
  const book = getMistakeBook();
  return Object.values(book)
    .filter(item => item.errorCount >= 1)
    .sort((a, b) => {
      if (b.errorCount !== a.errorCount) {
        return b.errorCount - a.errorCount; // 错误次数越多的排越前
      }
      return b.lastWrongAt - a.lastWrongAt;
    });
}

// Get or generate persistent User ID
export function getUserId(): string {
  if (typeof window === 'undefined') return 'user_default';
  let uid = localStorage.getItem(STORAGE_KEY_USER_ID);
  if (!uid) {
    uid = 'user_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(STORAGE_KEY_USER_ID, uid);
  }
  return uid;
}

// Get all append-only review logs (Never overwritten!)
export function getAllReviewLogs(): ReviewLogRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) return [];
    return JSON.parse(raw) as ReviewLogRecord[];
  } catch (e) {
    console.error('Failed to load review logs:', e);
    return [];
  }
}

// Append new records to the immutable audit log
export function appendReviewLogs(newRecords: ReviewLogRecord[]): void {
  if (typeof window === 'undefined' || newRecords.length === 0) return;
  try {
    const current = getAllReviewLogs();
    const updated = [...current, ...newRecords];
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to append review logs:', e);
  }
}

// Clear all logs (with caution, user triggered)
export function clearAllReviewLogs(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_LOGS);
}

// Save active session for "暂时退出，稍后继续"
export function saveActiveSession(session: ActiveSessionState | null): void {
  if (typeof window === 'undefined') return;
  if (!session) {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
  } else {
    localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION, JSON.stringify(session));
  }
}

// Load active session
export function loadActiveSession(): ActiveSessionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSessionState;
  } catch (e) {
    console.error('Failed to load active session:', e);
    return null;
  }
}

/**
 * Calculates per-word and global statistics from all historical logs
 * Supports:
 * - 总复习次数
 * - 总错误次数
 * - 连续错误次数
 * - 最近一次结果
 * - 第一次掌握时间
 * - 最近一次复习时间
 * - 顽固生词 (连续3次或以上标记为 ❌)
 * - 掌握率
 */
export function computeWordStats(wordId: string, logs?: ReviewLogRecord[]): WordStats {
  const allLogs = logs || getAllReviewLogs();
  const wordLogs = allLogs
    .filter(l => l.word_id === wordId)
    .sort((a, b) => a.timestamp - b.timestamp);

  const totalReviews = wordLogs.length;
  let totalWrongs = 0;
  let totalKnowns = 0;
  let firstMasteredAt: number | null = null;
  let lastReviewedAt: number | null = null;
  let lastResult: 'known' | 'wrong' | null = null;

  for (const log of wordLogs) {
    if (log.result === 'known') {
      totalKnowns++;
      if (firstMasteredAt === null) {
        firstMasteredAt = log.timestamp;
      }
    } else {
      totalWrongs++;
    }
    lastReviewedAt = log.timestamp;
    lastResult = log.result;
  }

  // Calculate consecutive wrongs counting backward from latest log
  let consecutiveWrongs = 0;
  for (let i = wordLogs.length - 1; i >= 0; i--) {
    if (wordLogs[i].result === 'wrong') {
      consecutiveWrongs++;
    } else {
      break;
    }
  }

  // A word is stubborn if marked wrong 3 or more times consecutively
  const isStubborn = consecutiveWrongs >= 3;

  const masteryRate = totalReviews > 0 ? Math.round((totalKnowns / totalReviews) * 100) : 0;

  return {
    word_id: wordId,
    total_reviews: totalReviews,
    total_wrongs: totalWrongs,
    total_knowns: totalKnowns,
    consecutive_wrongs: consecutiveWrongs,
    last_result: lastResult,
    first_mastered_at: firstMasteredAt,
    last_reviewed_at: lastReviewedAt,
    is_stubborn: isStubborn,
    mastery_rate: masteryRate
  };
}

/**
 * Get map of all words stats
 */
export function computeAllWordStats(logs?: ReviewLogRecord[]): Record<string, WordStats> {
  const allLogs = logs || getAllReviewLogs();
  const uniqueWordIds = Array.from(new Set(allLogs.map(l => l.word_id)));
  const map: Record<string, WordStats> = {};

  uniqueWordIds.forEach(id => {
    map[id] = computeWordStats(id, allLogs);
  });

  return map;
}

/**
 * Identify all stubborn words (连续3次或以上被用户标记为❌)
 */
export function getStubbornWordIds(logs?: ReviewLogRecord[]): string[] {
  const statsMap = computeAllWordStats(logs);
  return Object.values(statsMap)
    .filter(s => s.is_stubborn)
    .map(s => s.word_id);
}

/**
 * Create a new learning session ID
 */
export function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Today's default ISO date (YYYY-MM-DD)
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
