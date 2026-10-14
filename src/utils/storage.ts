import { ActiveSessionState, ReviewLogRecord, WordStats, ReviewStage, MistakeItem } from '../types';
import { getActiveUserId, userScopedStorageKey } from './userStorage';
import { recordLearningApi } from './api';

const STORAGE_KEY_LOGS = userScopedStorageKey('daily30_review_logs_v1');
const STORAGE_KEY_ACTIVE_SESSION = userScopedStorageKey('daily30_active_session_v1');
const STORAGE_KEY_MISTAKES = userScopedStorageKey('daily30_mistake_book_v2');

// 错题本持久化操作 (阶段四：高频错误循环使用，持续追踪不物理删除)
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

/**
 * 记录错词：新增或累计错误次数，重置连续掌握状态，进入待复习队列
 */
export function recordMistake(wordId: string): void {
  const book = getMistakeBook();
  const current = book[wordId] || {
    wordId,
    errorCount: 0,
    consecutiveCorrect: 0,
    lastWrongAt: Date.now(),
  };
  book[wordId] = {
    wordId,
    errorCount: (current.errorCount || 0) + 1,
    consecutiveCorrect: 0,
    lastWrongAt: Date.now(),
    lastReviewedAt: current.lastReviewedAt,
    isResolvedInCurrentSession: false,
    resolvedAt: null,
  };
  saveMistakeBook(book);
}

/**
 * 攻克当前轮次错词：标记本轮消除，增加连续正确计数，但永久保留历史错误统计与追踪
 */
export function resolveMistakeInSession(wordId: string): void {
  const book = getMistakeBook();
  const current = book[wordId];
  if (current) {
    book[wordId] = {
      ...current,
      consecutiveCorrect: (current.consecutiveCorrect || 0) + 1,
      lastReviewedAt: Date.now(),
      isResolvedInCurrentSession: true,
      resolvedAt: Date.now(),
    };
    saveMistakeBook(book);
  }
}

/**
 * 用户手动从错题本彻底移出 (仅限用户在设置或历史抽屉主动点击清空)
 */
export function removeMistake(wordId: string): void {
  const book = getMistakeBook();
  delete book[wordId];
  saveMistakeBook(book);
}

/**
 * 获取当前需要复习的活跃错词列表 (优先排列错误次数多、未攻克的薄弱词)
 */
export function getMistakesSorted(): MistakeItem[] {
  const book = getMistakeBook();
  return Object.values(book)
    .filter(item => item.errorCount >= 1 && !item.isResolvedInCurrentSession)
    .sort((a, b) => {
      // 1. 错误次数越多的排越前 (反复错误的词提高复习优先级)
      if (b.errorCount !== a.errorCount) {
        return b.errorCount - a.errorCount;
      }
      // 2. 连续正确次数少的排前
      const correctA = a.consecutiveCorrect || 0;
      const correctB = b.consecutiveCorrect || 0;
      if (correctA !== correctB) {
        return correctA - correctB;
      }
      // 3. 最近做错的排前
      return b.lastWrongAt - a.lastWrongAt;
    });
}

/**
 * 获取全部历史错题档案 (包含已在当前轮次攻克的词，用于历史分析与持久度追踪)
 */
export function getAllMistakeHistory(): MistakeItem[] {
  const book = getMistakeBook();
  return Object.values(book)
    .filter(item => item.errorCount >= 1)
    .sort((a, b) => {
      if (b.errorCount !== a.errorCount) {
        return b.errorCount - a.errorCount;
      }
      return b.lastWrongAt - a.lastWrongAt;
    });
}

/**
 * 重置所有错词的本轮攻克标记 (开始新的一天学习或再次强化时调用)
 */
export function resetSessionMistakeFlags(): void {
  const book = getMistakeBook();
  let modified = false;
  Object.values(book).forEach(item => {
    if (item.isResolvedInCurrentSession) {
      item.isResolvedInCurrentSession = false;
      modified = true;
    }
  });
  if (modified) {
    saveMistakeBook(book);
  }
}

// Get or generate persistent User ID
export function getUserId(): string {
  return getActiveUserId();
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
export function appendReviewLogs(newRecords: ReviewLogRecord[], syncRemote = true): void {
  if (typeof window === 'undefined' || newRecords.length === 0) return;
  try {
    const current = getAllReviewLogs();
    const updated = [...current, ...newRecords];
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated));
    if (syncRemote) {
      newRecords.forEach(record => {
        void recordLearningApi({
          wordbookId: record.wordbook_id || '',
          wordId: record.word_id,
          result: record.result,
          stage: record.review_stage,
          reviewRound: record.round_id,
        }).catch(error => console.warn('Failed to sync learning record to FastAPI:', error));
      });
    }
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
