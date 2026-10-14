import { WordItem, Wordbook } from '../types';
import { getWordbookById, getDefaultWordbook } from './wordbook';
import { getTodayDateString } from './storage';
import { userScopedStorageKey } from './userStorage';
import { fetchMemoryProgress, fetchPlanSettings, saveMemoryProgress, savePlanSettingsApi } from './apiAdmin';

export type IntervalScheduleMode = 'standard' | 'relaxed';
export type NewWordOrder = 'random' | 'alphabetical';

export interface PlanSettings {
  dailyNewWords: number; // 10~100 (默认 30)
  maxReviewLimit: number; // 0~100, 100或0为不限 (默认 30)
  intervalMode: IntervalScheduleMode; // 'standard' (D+1, D+2, D+4, D+7) or 'relaxed' (D+1, D+3, D+7)
  newWordOrder?: NewWordOrder; // 'random' | 'alphabetical' (默认 'random')
}

export interface WordMemoryProgress {
  wordId: string;
  wordbookId: string;
  firstLearnedDate: string; // YYYY-MM-DD
  lastReviewedDate: string; // YYYY-MM-DD
  nextReviewDate: string; // YYYY-MM-DD
  correctCount: number;
  wrongCount: number;
  intervalStep: number; // 0, 1, 2, 3...
  isGraduated: boolean; // 是否已完成全套抗遗忘节点
  isManuallyMastered?: boolean; // 手动标记"我已记牢", 不再进入复习队列
  lastTwoResults?: boolean[]; // 最近两次做题结果 [最新, 次新]
}

// 掌握度五档定义 (打通7天抗遗忘数据)
export type WordMasteryTier = 
  | 'initial'       // 初记: 今天新学, 还没复习
  | 'reinforcing'   // 强化: 完成 D+1 / D+2 复习
  | 'consolidating' // 巩固: 完成 D+4 复习
  | 'familiar'      // 熟识: 完成全部复习节点且最近两次全对
  | 'mastered';     // 已掌握: 手动标记"我已记牢", 不再进入复习队列

export interface MasteryTierMeta {
  tier: WordMasteryTier;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  badgeClass: string;
}

export const MASTERY_TIERS: Record<WordMasteryTier, MasteryTierMeta> = {
  initial: {
    tier: 'initial',
    label: '初记',
    description: '新学阶段，尚未复习',
    color: '#E06D53', // 珊瑚橙红
    bgColor: '#FFF3EE',
    badgeClass: 'text-orange-700 bg-orange-100/80 border-orange-200',
  },
  reinforcing: {
    tier: 'reinforcing',
    label: '强化',
    description: '完成 D+1 或 D+2 节点复习',
    color: '#D97706', // 琥珀橙
    bgColor: '#FEF3C7',
    badgeClass: 'text-amber-700 bg-amber-100/80 border-amber-200',
  },
  consolidating: {
    tier: 'consolidating',
    label: '巩固',
    description: '完成 D+4 节点复习',
    color: '#6366F1', // 靛青紫
    bgColor: '#EEF2FF',
    badgeClass: 'text-indigo-700 bg-indigo-100/80 border-indigo-200',
  },
  familiar: {
    tier: 'familiar',
    label: '熟识',
    description: '完成全部复习节点且最近两次全对',
    color: '#0284C7', // 天蓝
    bgColor: '#E0F2FE',
    badgeClass: 'text-sky-700 bg-sky-100/80 border-sky-200',
  },
  mastered: {
    tier: 'mastered',
    label: '已掌握',
    description: '手动标记记牢，不再进入复习队列',
    color: '#16A34A', // 翠绿
    bgColor: '#DCFCE7',
    badgeClass: 'text-emerald-700 bg-emerald-100/80 border-emerald-200',
  },
};

export interface DailyTaskPool {
  date: string;
  wordbookId: string;
  reviewWords: WordItem[];
  newWords: WordItem[];
  allTaskWords: WordItem[]; // 建议顺序：先复习，后新词
  isRollingMasteryMode: boolean; // 新词全部刷完后的"刷完整库巩固模式"
  totalDueReviewCount: number; // 今日全部到期复习词总数 (含超限顺延)
  pendingOverdueCount: number; // 超出上限顺延到明天的词数
}

export interface WordbookPlanProgress {
  wordbookId: string;
  totalWords: number;
  learnedWords: number;
  remainingNewWords: number;
  graduatedWords: number;
  estimatedDaysLeft: number;
  progressPercent: number;
  isFullyLearned: boolean;
}

const STORAGE_KEY_PLAN_SETTINGS = userScopedStorageKey('daily30_plan_settings_v2');
const STORAGE_KEY_MEMORY_PROGRESS = userScopedStorageKey('daily30_memory_progress_v2');
const STORAGE_KEY_DAILY_TASK_PREFIX = 'daily30_daily_task_pool_v2_';

// 默认设置
export const DEFAULT_PLAN_SETTINGS: PlanSettings = {
  dailyNewWords: 30,
  maxReviewLimit: 30,
  intervalMode: 'standard', // 默认 D+1, D+2, D+4, D+7
  newWordOrder: 'random', // 默认随机顺序
};

// 复习间隔节点定义 (天数)
// 标准版: D+1, D+2, D+4, D+7 (4次复习)
// 轻松版: D+1, D+3, D+7 (3次复习)
export const INTERVAL_SCHEDULES: Record<IntervalScheduleMode, number[]> = {
  standard: [1, 2, 4, 7],
  relaxed: [1, 3, 7],
};

/**
 * 日期工具：增加指定天数
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  try {
    const parts = dateStr.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}

/**
 * 获取抗遗忘计划全局设置
 */
export function getPlanSettings(): PlanSettings {
  if (typeof window === 'undefined') return DEFAULT_PLAN_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLAN_SETTINGS);
    if (!raw) return DEFAULT_PLAN_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      dailyNewWords: Math.max(10, Math.min(100, Number(parsed.dailyNewWords) || 30)),
      maxReviewLimit: Number(parsed.maxReviewLimit) >= 0 ? Number(parsed.maxReviewLimit) : 30,
      intervalMode: parsed.intervalMode === 'relaxed' ? 'relaxed' : 'standard',
      newWordOrder: parsed.newWordOrder === 'alphabetical' ? 'alphabetical' : 'random',
    };
  } catch (e) {
    console.error('Failed to load plan settings:', e);
    return DEFAULT_PLAN_SETTINGS;
  }
}

/**
 * 保存抗遗忘计划设置
 */
export function savePlanSettings(settings: PlanSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PLAN_SETTINGS, JSON.stringify(settings));
  void savePlanSettingsApi(settings).catch(error => console.warn('Failed to sync plan settings to FastAPI:', error));
}

export async function syncPlanSettingsFromApi(wordbookId?: string): Promise<void> {
  const remote = await fetchPlanSettings(wordbookId);
  const settings: PlanSettings = {
    dailyNewWords: remote.daily_new_words, maxReviewLimit: remote.max_review_limit,
    intervalMode: remote.interval_mode, newWordOrder: remote.new_word_order,
  };
  if (wordbookId) {
    const raw = localStorage.getItem(STORAGE_KEY_WORDBOOK_PLANS);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[wordbookId] = { ...(parsed[wordbookId] || {}), dailyNewWords: settings.dailyNewWords, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY_WORDBOOK_PLANS, JSON.stringify(parsed));
  } else {
    localStorage.setItem(STORAGE_KEY_PLAN_SETTINGS, JSON.stringify(settings));
  }
}

/**
 * 获取全部单词抗遗忘记录 Map
 */
export function getAllMemoryProgress(): Record<string, WordMemoryProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMORY_PROGRESS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to get memory progress:', e);
    return {};
  }
}

/**
 * 保存全部单词抗遗忘记录 Map
 */
export function saveAllMemoryProgress(data: Record<string, WordMemoryProgress>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_MEMORY_PROGRESS, JSON.stringify(data));
  Object.values(data).forEach(progress => {
    void saveMemoryProgress(progress as unknown as Record<string, unknown>).catch(error => console.warn('Failed to sync memory progress to FastAPI:', error));
  });
}

export async function syncMemoryProgressFromApi(): Promise<void> {
  const remote = await fetchMemoryProgress();
  const data: Record<string, WordMemoryProgress> = getAllMemoryProgress();
  remote.forEach(item => {
    const progress: WordMemoryProgress = {
      wordId: String(item.word_id), wordbookId: String(item.wordbook_id), firstLearnedDate: item.first_learned_date,
      lastReviewedDate: item.last_reviewed_date, nextReviewDate: item.next_review_date, correctCount: item.correct_count,
      wrongCount: item.wrong_count, intervalStep: item.interval_step, isGraduated: item.is_graduated,
      isManuallyMastered: item.is_manually_mastered, lastTwoResults: item.last_two_results,
    };
    data[getWordKey(progress.wordbookId, progress.wordId)] = progress;
  });
  localStorage.setItem(STORAGE_KEY_MEMORY_PROGRESS, JSON.stringify(data));
}

/**
 * 单词复合唯一键: wordbookId_wordId
 */
function getWordKey(wordbookId: string, wordId: string): string {
  return `${wordbookId}_${wordId}`;
}

const STORAGE_KEY_WORDBOOK_PLANS = userScopedStorageKey('daily30_wordbook_plan_settings_v1');

/**
 * 获取指定词库的每日新词量设置 (默认30)
 */
export function getWordbookDailyNewWords(wordbookId: string): number {
  if (typeof window === 'undefined') return 30;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORDBOOK_PLANS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed[wordbookId]?.dailyNewWords === 'number') {
        return Math.max(1, parsed[wordbookId].dailyNewWords);
      }
    }
  } catch (e) {
    console.error('Failed to get wordbook plan:', e);
  }
  return getPlanSettings().dailyNewWords || 30;
}

/**
 * 保存指定词库的每日新词量设置
 */
export function setWordbookDailyNewWords(wordbookId: string, dailyNewWords: number): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORDBOOK_PLANS);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[wordbookId] = {
      ...(parsed[wordbookId] || {}),
      dailyNewWords: Math.max(1, Math.min(200, dailyNewWords)),
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY_WORDBOOK_PLANS, JSON.stringify(parsed));
    void savePlanSettingsApi({ ...getPlanSettings(), wordbookId, dailyNewWords: parsed[wordbookId].dailyNewWords }).catch(error => console.warn('Failed to sync wordbook plan to FastAPI:', error));
    invalidateDailyTaskPool(wordbookId);
  } catch (e) {
    console.error('Failed to set wordbook plan:', e);
  }
}

/**
 * 清空指定词库的学习进度 (重置词库学习状态)
 */
export function resetWordbookProgress(wordbookId: string): void {
  if (typeof window === 'undefined') return;
  const allProgress = getAllMemoryProgress();
  const prefix = `${wordbookId}_`;
  const updated: Record<string, WordMemoryProgress> = {};
  Object.keys(allProgress).forEach(k => {
    if (!k.startsWith(prefix) && allProgress[k].wordbookId !== wordbookId) {
      updated[k] = allProgress[k];
    }
  });
  saveAllMemoryProgress(updated);
  invalidateDailyTaskPool(wordbookId);
}

/**
 * 获取单个单词的掌握度五档分类
 * 规则 9:
 * - 初记: 今天新学, 还没复习 (intervalStep === 0)
 * - 强化: 完成 D+1 / D+2 复习 (intervalStep === 1 或 2)
 * - 巩固: 完成 D+4 复习 (intervalStep === 3)
 * - 熟识: 完成全部复习节点且最近两次全对 (intervalStep >= 4 且最近两次全对)
 * - 已掌握: 手动标记"我已记牢", 不再进入复习队列
 */
export function getWordMasteryTier(prog?: WordMemoryProgress): WordMasteryTier | 'unlearned' {
  if (!prog || !prog.firstLearnedDate) return 'unlearned';
  if (prog.isManuallyMastered) return 'mastered';

  // 熟识: 完成全部复习节点且最近两次全对
  const isAllNodesCompleted = prog.isGraduated || prog.intervalStep >= 4;
  const isRecentTwoCorrect = prog.lastTwoResults 
    ? (prog.lastTwoResults.length >= 2 && prog.lastTwoResults[0] && prog.lastTwoResults[1])
    : (prog.correctCount >= 2 && prog.wrongCount === 0);

  if (isAllNodesCompleted && isRecentTwoCorrect) {
    return 'familiar';
  }

  // 巩固: 完成 D+4 复习
  if (prog.intervalStep >= 3) {
    return 'consolidating';
  }

  // 强化: 完成 D+1 / D+2 复习
  if (prog.intervalStep >= 1) {
    return 'reinforcing';
  }

  // 初记: 今天新学, 还没复习
  return 'initial';
}

/**
 * 手动标记"我已记牢" (或取消记牢)
 * 标记为已掌握后，不再进入复习队列
 */
export function setWordManuallyMastered(
  wordbookId: string,
  wordId: string,
  isMastered: boolean,
  currentDateStr: string = getTodayDateString()
): WordMemoryProgress {
  const allProgress = getAllMemoryProgress();
  const key = getWordKey(wordbookId, wordId);
  const current = allProgress[key];

  let updated: WordMemoryProgress;
  if (!current) {
    updated = {
      wordId,
      wordbookId,
      firstLearnedDate: currentDateStr,
      lastReviewedDate: currentDateStr,
      nextReviewDate: isMastered ? '2099-12-31' : addDaysToDateStr(currentDateStr, 1),
      correctCount: isMastered ? 1 : 0,
      wrongCount: 0,
      intervalStep: isMastered ? 4 : 0,
      isGraduated: isMastered,
      isManuallyMastered: isMastered,
      lastTwoResults: isMastered ? [true, true] : [],
    };
  } else {
    updated = {
      ...current,
      isManuallyMastered: isMastered,
      nextReviewDate: isMastered ? '2099-12-31' : (current.nextReviewDate > currentDateStr ? current.nextReviewDate : currentDateStr),
    };
  }

  allProgress[key] = updated;
  saveAllMemoryProgress(allProgress);
  invalidateDailyTaskPool(wordbookId);
  return updated;
}

/**
 * 更新或记录单个单词的学习/复习结果
 * 规则 11 & 13: 复习中答错的词照常进错题本(阶段四), 同时该词的抗遗忘复习间隔重置, 重新按 D+1 安排并重置记忆阶段为"初记"
 */
export function updateWordLearningResult(
  wordbookId: string,
  wordId: string,
  isCorrect: boolean,
  currentDateStr: string = getTodayDateString()
): WordMemoryProgress {
  const allProgress = getAllMemoryProgress();
  const key = getWordKey(wordbookId, wordId);
  const settings = getPlanSettings();
  const intervals = INTERVAL_SCHEDULES[settings.intervalMode];

  const current = allProgress[key];

  let updated: WordMemoryProgress;

  if (!current) {
    // 首次学习新词
    const nextInterval = intervals[0] || 1;
    updated = {
      wordId,
      wordbookId,
      firstLearnedDate: currentDateStr,
      lastReviewedDate: currentDateStr,
      nextReviewDate: addDaysToDateStr(currentDateStr, nextInterval),
      correctCount: isCorrect ? 1 : 0,
      wrongCount: isCorrect ? 0 : 1,
      intervalStep: 0,
      isGraduated: false,
      isManuallyMastered: false,
      lastTwoResults: [isCorrect],
    };
  } else {
    const newLastTwo = [isCorrect, ...(current.lastTwoResults || [])].slice(0, 2);

    if (isCorrect) {
      const nextStep = current.intervalStep + 1;
      const isNowGraduated = nextStep >= intervals.length;
      // 毕业后隔更长时间(如14天)再巩固
      const nextInterval = isNowGraduated ? 14 : intervals[nextStep];

      updated = {
        ...current,
        lastReviewedDate: currentDateStr,
        nextReviewDate: addDaysToDateStr(currentDateStr, nextInterval),
        correctCount: current.correctCount + 1,
        intervalStep: nextStep,
        isGraduated: isNowGraduated,
        lastTwoResults: newLastTwo,
      };
    } else {
      // 答错：按规则 13 重置复习节点为 0 (记忆阶段即自动回归"初记"), 重新从 D+1 安排！
      updated = {
        ...current,
        lastReviewedDate: currentDateStr,
        nextReviewDate: addDaysToDateStr(currentDateStr, 1),
        wrongCount: current.wrongCount + 1,
        intervalStep: 0,
        isGraduated: false,
        isManuallyMastered: false,
        lastTwoResults: newLastTwo,
      };
    }
  }

  allProgress[key] = updated;
  saveAllMemoryProgress(allProgress);
  return updated;
}

/**
 * 批量同步当天完成的单词结果 (例如阶段二提交或自测结束时统一校准)
 */
export function batchSyncWordLearningResults(
  wordbookId: string,
  results: Record<string, boolean>, // wordId -> isCorrect
  currentDateStr: string = getTodayDateString()
): void {
  const allProgress = getAllMemoryProgress();
  const settings = getPlanSettings();
  const intervals = INTERVAL_SCHEDULES[settings.intervalMode];

  Object.entries(results).forEach(([wordId, isCorrect]) => {
    const key = getWordKey(wordbookId, wordId);
    const current = allProgress[key];

    if (!current) {
      const nextInterval = intervals[0] || 1;
      allProgress[key] = {
        wordId,
        wordbookId,
        firstLearnedDate: currentDateStr,
        lastReviewedDate: currentDateStr,
        nextReviewDate: addDaysToDateStr(currentDateStr, nextInterval),
        correctCount: isCorrect ? 1 : 0,
        wrongCount: isCorrect ? 0 : 1,
        intervalStep: 0,
        isGraduated: false,
      };
    } else {
      if (isCorrect) {
        const nextStep = current.intervalStep + 1;
        const isNowGraduated = nextStep >= intervals.length;
        const nextInterval = isNowGraduated ? 14 : intervals[nextStep];
        allProgress[key] = {
          ...current,
          lastReviewedDate: currentDateStr,
          nextReviewDate: addDaysToDateStr(currentDateStr, nextInterval),
          correctCount: current.correctCount + 1,
          intervalStep: nextStep,
          isGraduated: isNowGraduated,
        };
      } else {
        allProgress[key] = {
          ...current,
          lastReviewedDate: currentDateStr,
          nextReviewDate: addDaysToDateStr(currentDateStr, 1),
          wrongCount: current.wrongCount + 1,
          intervalStep: 0,
          isGraduated: false,
        };
      }
    }
  });

  saveAllMemoryProgress(allProgress);
}

/**
 * 计算词库学习进度 (用于词库管理弹窗与首页计划卡片)
 */
export function computeWordbookProgress(wordbookId: string): WordbookPlanProgress {
  try {
    const wb = getWordbookById(wordbookId) || getDefaultWordbook();
    const allProgress = getAllMemoryProgress();
    const wordsList = Array.isArray(wb?.words) ? wb.words : [];
    const totalWords = wordsList.length;
    const dailyNewWords = getWordbookDailyNewWords(wordbookId);

    let learnedWords = 0;
    let graduatedWords = 0;

    wordsList.forEach(w => {
      if (!w || !w.id) return;
      const key = getWordKey(wordbookId, w.id);
      const prog = allProgress[key];
      if (prog && prog.firstLearnedDate) {
        learnedWords++;
        if (prog.isGraduated || prog.isManuallyMastered) {
          graduatedWords++;
        }
      }
    });

    const remainingNewWords = Math.max(0, totalWords - learnedWords);
    const estimatedDaysLeft = Math.ceil(remainingNewWords / Math.max(1, dailyNewWords));
    const progressPercent = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;
    const isFullyLearned = remainingNewWords === 0;

    return {
      wordbookId,
      totalWords,
      learnedWords,
      remainingNewWords,
      graduatedWords,
      estimatedDaysLeft,
      progressPercent,
      isFullyLearned,
    };
  } catch (err) {
    console.error('computeWordbookProgress failed:', err);
    return {
      wordbookId,
      totalWords: 0,
      learnedWords: 0,
      remainingNewWords: 0,
      graduatedWords: 0,
      estimatedDaysLeft: 0,
      progressPercent: 0,
      isFullyLearned: false,
    };
  }
}

/**
 * 计划计算器估算工具
 * 5. 选中档位后实时联动显示:
 * - 剩余天数 = 剩余新词 ÷ 每日新词数(向上取整)
 * - 预计完成日期 = 今天 + 剩余天数(具体到年月日)
 * - 预计每日用时 ≈ (每日新词 + 平均复习量) × 每词约8秒
 */
export function calculatePlanEstimation(
  remainingNewWords: number,
  dailyNewWords: number,
  avgReviewWords: number = 15,
  baseDateStr: string = getTodayDateString()
) {
  const daily = Math.max(1, dailyNewWords);
  const remainingDays = remainingNewWords > 0 ? Math.ceil(remainingNewWords / daily) : 0;
  const finishDateStr = addDaysToDateStr(baseDateStr, remainingDays);

  const parts = finishDateStr.split('-');
  const finishDateFormatted = `${parts[0]}年${parseInt(parts[1], 10)}月${parseInt(parts[2], 10)}日`;

  const totalSeconds = (daily + Math.max(0, avgReviewWords)) * 8;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const estimatedTimeText = seconds > 0 && minutes < 3
    ? `约 ${minutes} 分 ${seconds} 秒`
    : `约 ${Math.max(1, Math.round(totalSeconds / 60))} 分钟`;

  return {
    remainingDays,
    finishDateStr,
    finishDateFormatted,
    estimatedTimeText,
    totalSeconds,
  };
}

/**
 * 核心机制：每天打开应用自动生成"今日任务池"
 * 每日任务 = 复习到期词 + 学习新词
 * 
 * 1. 到期复习词：已学过且 nextReviewDate <= 今天。若超出每日复习上限，超出的顺延明天，不丢失
 * 2. 补充新词：按词库顺序切分未学习的新词，直到达到该词库设置的每日新词数
 * 3. 刷完模式：当新词全学完，每天挑"最久没复习+错误最多"的词滚动巩固
 * 4. 排序：先复习、后新词
 */
export function getOrGenerateDailyTaskPool(
  wordbookId: string,
  dateStr: string = getTodayDateString(),
  forceRefresh: boolean = false,
  mode?: 'fast_review' | 'focused_quiz'
): DailyTaskPool {
  const currentMode = mode || 'focused_quiz';
  const cacheKey = userScopedStorageKey(`${STORAGE_KEY_DAILY_TASK_PREFIX}${wordbookId}_${dateStr}_${currentMode}`);

  // 1. 检查今日缓存（当天重新打开继续显示同一批任务）
  if (!forceRefresh && typeof window !== 'undefined') {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as DailyTaskPool;
        if (parsed && Array.isArray(parsed.allTaskWords) && parsed.allTaskWords.length > 0) {
          return parsed;
        }
      } catch {
        // regenerate
      }
    }
  }

  const wb = getWordbookById(wordbookId) || getDefaultWordbook();
  const pool = wb.words;
  const allProgress = getAllMemoryProgress();
  const settings = getPlanSettings();

  // 根据模式确定批次大小 (快速刷词默认 200 词，精选刷题默认 30 词)
  const defaultBatch = currentMode === 'fast_review' ? 200 : 30;
  const configuredBatch = wb.default_batch_size || defaultBatch;
  const batchLimit = currentMode === 'fast_review'
    ? Math.max(configuredBatch, 200)
    : (getWordbookDailyNewWords(wordbookId) || 30);

  // 【快速刷词模式】：整库滚动切片，支持整库循环与大批次 (200词/批)
  if (currentMode === 'fast_review') {
    let fastWords: WordItem[] = [];
    if (pool.length > 0) {
      if (pool.length <= batchLimit) {
        fastWords = [...pool];
      } else {
        // 读取整库断点游标
        let cursor = 0;
        if (typeof window !== 'undefined') {
          const savedCursor = localStorage.getItem(userScopedStorageKey(`daily30_fast_review_cursor_${wordbookId}`));
          cursor = savedCursor ? parseInt(savedCursor, 10) || 0 : 0;
        }
        cursor = cursor % pool.length;
        const slice1 = pool.slice(cursor, cursor + batchLimit);
        if (slice1.length < batchLimit) {
          const wrapNeeded = batchLimit - slice1.length;
          const slice2 = pool.slice(0, wrapNeeded);
          fastWords = [...slice1, ...slice2];
        } else {
          fastWords = slice1;
        }
      }
    }

    const result: DailyTaskPool = {
      date: dateStr,
      wordbookId,
      reviewWords: [],
      newWords: fastWords,
      allTaskWords: fastWords,
      isRollingMasteryMode: true,
      totalDueReviewCount: 0,
      pendingOverdueCount: 0,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    }

    return result;
  }

  const dailyNewWords = batchLimit;

  // 查找所有本词库已学词和未学词
  const learnedMap: Record<string, WordMemoryProgress> = {};
  const unlearnedWords: WordItem[] = [];

  pool.forEach(w => {
    const key = getWordKey(wordbookId, w.id);
    const prog = allProgress[key];
    if (prog && prog.firstLearnedDate) {
      learnedMap[w.id] = prog;
    } else {
      unlearnedWords.push(w);
    }
  });

  // 2. 筛选今天到期或积压未学的复习词 (nextReviewDate <= 今天)
  // 规则 9: 已标记"已掌握"不再进入复习队列
  const overdueWords: WordItem[] = [];
  pool.forEach(w => {
    const prog = learnedMap[w.id];
    if (prog?.isManuallyMastered) return;
    if (prog && prog.nextReviewDate && prog.nextReviewDate <= dateStr) {
      overdueWords.push(w);
    }
  });

  // 复习词排序：错误次数多的排前，其次最早到期的排前
  overdueWords.sort((a, b) => {
    const progA = learnedMap[a.id];
    const progB = learnedMap[b.id];
    if (!progA || !progB) return 0;
    if (progB.wrongCount !== progA.wrongCount) {
      return progB.wrongCount - progA.wrongCount;
    }
    return progA.nextReviewDate.localeCompare(progB.nextReviewDate);
  });

  const totalDueReviewCount = overdueWords.length;

  // 3. 应用每日复习上限 (超出上限自动顺延明天，不丢失)
  let reviewWords: WordItem[] = [];
  let pendingOverdueCount = 0;

  if (settings.maxReviewLimit > 0 && overdueWords.length > settings.maxReviewLimit) {
    reviewWords = overdueWords.slice(0, settings.maxReviewLimit);
    pendingOverdueCount = overdueWords.length - settings.maxReviewLimit;
  } else {
    reviewWords = [...overdueWords];
    pendingOverdueCount = 0;
  }

  // 4. 补充今日新词 (根据设置中的新词学习顺序: 随机顺序 / 字母顺序)
  let newWords: WordItem[] = [];
  let isRollingMasteryMode = false;

  if (unlearnedWords.length > 0) {
    const sortedUnlearned = [...unlearnedWords];
    if (settings.newWordOrder === 'alphabetical') {
      sortedUnlearned.sort((a, b) => (a.word || '').localeCompare(b.word || ''));
    } else {
      // 随机顺序 (使用基于日期和词库的伪随机打乱，保证同一天刷新一致性)
      let seed = 0;
      for (let i = 0; i < dateStr.length; i++) seed = (seed * 31 + dateStr.charCodeAt(i)) >>> 0;
      for (let i = sortedUnlearned.length - 1; i > 0; i--) {
        seed = (seed * 9301 + 49297) % 233280;
        const j = Math.floor((seed / 233280) * (i + 1));
        const temp = sortedUnlearned[i];
        sortedUnlearned[i] = sortedUnlearned[j];
        sortedUnlearned[j] = temp;
      }
    }
    // 正常推新词
    newWords = sortedUnlearned.slice(0, dailyNewWords);
  } else {
    // 【刷完整个词库模式】新词全部学完，进入滚动巩固模式！
    isRollingMasteryMode = true;

    // 如果到期复习词少于每日新词配额，从全词库挑"最久没复习+错误最多"的词补充今日任务
    const targetCount = Math.max(dailyNewWords, 20);
    if (reviewWords.length < targetCount && pool.length > 0) {
      const alreadyIncludedIds = new Set(reviewWords.map(w => w.id));
      const candidates = pool.filter(w => !alreadyIncludedIds.has(w.id) && !learnedMap[w.id]?.isManuallyMastered);

      candidates.sort((a, b) => {
        const progA = learnedMap[a.id];
        const progB = learnedMap[b.id];
        const wrongA = progA?.wrongCount || 0;
        const wrongB = progB?.wrongCount || 0;
        if (wrongB !== wrongA) return wrongB - wrongA;
        const lastA = progA?.lastReviewedDate || '1970-01-01';
        const lastB = progB?.lastReviewedDate || '1970-01-01';
        return lastA.localeCompare(lastB);
      });

      const needed = targetCount - reviewWords.length;
      const supplemental = candidates.slice(0, needed);
      reviewWords = [...reviewWords, ...supplemental];
    }
  }

  // 如果词库总数很小（例如新建词库只有几个词），且两者都为空，则保底放入词库所有词
  if (reviewWords.length === 0 && newWords.length === 0 && pool.length > 0) {
    newWords = pool.slice(0, dailyNewWords);
  }

  // 5. 组合任务池：【先复习、后新词】
  const allTaskWords = [...reviewWords, ...newWords];

  const result: DailyTaskPool = {
    date: dateStr,
    wordbookId,
    reviewWords,
    newWords,
    allTaskWords,
    isRollingMasteryMode,
    totalDueReviewCount,
    pendingOverdueCount,
  };

  // 写入今日持久化缓存
  if (typeof window !== 'undefined') {
    localStorage.setItem(cacheKey, JSON.stringify(result));
  }

  return result;
}

/**
 * 清除当天缓存任务池（在用户修改设置后重新计算）
 */
export function invalidateDailyTaskPool(wordbookId: string, dateStr: string = getTodayDateString()): void {
  if (typeof window === 'undefined') return;
  const cacheKey = userScopedStorageKey(`${STORAGE_KEY_DAILY_TASK_PREFIX}${wordbookId}_${dateStr}`);
  localStorage.removeItem(cacheKey);
}

/**
 * 掌握度五档统计模型
 */
export interface WordMasteryStats {
  totalWords: number;
  learnedCount: number;
  unlearnedCount: number;
  counts: Record<WordMasteryTier, number>;
  percentages: Record<WordMasteryTier, number>;
  wordsByTier: Record<WordMasteryTier, Array<{ wordItem: WordItem; progress: WordMemoryProgress }>>;
}

/**
 * 统计指定词库的掌握度五档分布 (规则 10 & 12)
 */
export function computeWordMasteryStats(wordbookId?: string): WordMasteryStats {
  const allProgress = getAllMemoryProgress();
  const wb = wordbookId ? (getWordbookById(wordbookId) || getDefaultWordbook()) : getDefaultWordbook();
  const words = wb.words;

  const counts: Record<WordMasteryTier, number> = {
    initial: 0,
    reinforcing: 0,
    consolidating: 0,
    familiar: 0,
    mastered: 0,
  };

  const wordsByTier: Record<WordMasteryTier, Array<{ wordItem: WordItem; progress: WordMemoryProgress }>> = {
    initial: [],
    reinforcing: [],
    consolidating: [],
    familiar: [],
    mastered: [],
  };

  let learnedCount = 0;
  let unlearnedCount = 0;

  words.forEach(w => {
    const wbId = w.wordbook_id || wordbookId || wb.id;
    const key = getWordKey(wbId, w.id);
    const prog = allProgress[key];
    const tier = getWordMasteryTier(prog);
    if (tier === 'unlearned') {
      unlearnedCount++;
    } else {
      learnedCount++;
      counts[tier]++;
      if (prog) {
        wordsByTier[tier].push({ wordItem: w, progress: prog });
      }
    }
  });

  const totalWords = words.length;
  const percentages: Record<WordMasteryTier, number> = {
    initial: learnedCount > 0 ? Math.round((counts.initial / learnedCount) * 100) : 0,
    reinforcing: learnedCount > 0 ? Math.round((counts.reinforcing / learnedCount) * 100) : 0,
    consolidating: learnedCount > 0 ? Math.round((counts.consolidating / learnedCount) * 100) : 0,
    familiar: learnedCount > 0 ? Math.round((counts.familiar / learnedCount) * 100) : 0,
    mastered: learnedCount > 0 ? Math.round((counts.mastered / learnedCount) * 100) : 0,
  };

  return {
    totalWords,
    learnedCount,
    unlearnedCount,
    counts,
    percentages,
    wordsByTier,
  };
}

/**
 * 复习计划图表数据：未来 11 天 (今天 → 10天后) 每日到期复习词统计 (按记忆阶段分色堆叠)
 * 规则 7
 */
export interface ReviewScheduleDay {
  dateStr: string;
  dayLabel: string;
  dayOffset: number;
  total: number;
  initial: number;
  reinforcing: number;
  consolidating: number;
  familiar: number;
}

export function computeFutureReviewSchedule(
  wordbookId?: string,
  daysCount: number = 11,
  baseDateStr: string = getTodayDateString()
): ReviewScheduleDay[] {
  const allProgress = getAllMemoryProgress();
  const result: ReviewScheduleDay[] = [];

  for (let offset = 0; offset < daysCount; offset++) {
    const targetDate = addDaysToDateStr(baseDateStr, offset);
    let label = '';
    if (offset === 0) label = '今天';
    else if (offset === 1) label = '明天';
    else if (offset === 2) label = '后天';
    else {
      const parts = targetDate.split('-');
      label = `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
    }

    const dayData: ReviewScheduleDay = {
      dateStr: targetDate,
      dayLabel: label,
      dayOffset: offset,
      total: 0,
      initial: 0,
      reinforcing: 0,
      consolidating: 0,
      familiar: 0,
    };

    Object.values(allProgress).forEach(prog => {
      if (wordbookId && prog.wordbookId !== wordbookId) return;
      if (prog.isManuallyMastered) return; // 已掌握不再进入复习队列

      // 今天包含所有已到期及历史积压词
      const isDue = offset === 0 ? (prog.nextReviewDate <= targetDate) : (prog.nextReviewDate === targetDate);
      if (isDue) {
        const tier = getWordMasteryTier(prog);
        if (tier === 'initial') dayData.initial++;
        else if (tier === 'reinforcing') dayData.reinforcing++;
        else if (tier === 'consolidating') dayData.consolidating++;
        else if (tier === 'familiar') dayData.familiar++;

        dayData.total++;
      }
    });

    result.push(dayData);
  }

  return result;
}

/**
 * 进展与持久度：过去 10 天每天"新增已学词数"变化 (规则 11)
 */
export interface PastTrendDay {
  dateStr: string;
  dayLabel: string;
  dayOffset: number;
  newWordsCount: number;
}

export function computePastNewWordsTrend(
  wordbookId?: string,
  daysCount: number = 10,
  baseDateStr: string = getTodayDateString()
): PastTrendDay[] {
  const allProgress = getAllMemoryProgress();
  const result: PastTrendDay[] = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const targetDate = addDaysToDateStr(baseDateStr, -i);
    let label = '';
    if (i === 0) label = '今天';
    else if (i === 1) label = '昨天';
    else {
      const parts = targetDate.split('-');
      label = `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
    }

    let count = 0;
    Object.values(allProgress).forEach(prog => {
      if (wordbookId && prog.wordbookId !== wordbookId) return;
      if (prog.firstLearnedDate === targetDate) {
        count++;
      }
    });

    result.push({
      dateStr: targetDate,
      dayLabel: label,
      dayOffset: -i,
      newWordsCount: count,
    });
  }

  return result;
}
