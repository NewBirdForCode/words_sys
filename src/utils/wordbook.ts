import * as XLSX from 'xlsx';
import { Wordbook, WordItem } from '../types';
import { VOCABULARY_BANK } from '../data/vocabulary';
import { SYSTEM_WORDBOOKS_PRESETS } from '../data/systemWordbooks';

import { TEST_200_WORDBOOK } from '../data/test200Wordbook';

const STORAGE_KEY_WORDBOOKS = 'daily30_wordbooks_v1';
const STORAGE_KEY_ACTIVE_WORDBOOK_ID = 'daily30_active_wb_id_v1';

// Seed default wordbook if none exists
export function getDefaultWordbook(): Wordbook {
  return {
    id: 'wb_default_core',
    book_id: 'wb_default_core',
    name: '香港 DSE 核心必备词汇 (官方语料)',
    book_name: '香港 DSE 核心必备词汇 (官方语料)',
    description: '涵盖《Oxford English for HKDSE》及官方考题 90 个高频核心词汇',
    default_mode: 'focused_quiz',
    default_batch_size: 30,
    enabled_modes: ['fast_review', 'focused_quiz'],
    category: 'DSE',
    series: 'Oxford English for HKDSE',
    publisher: '牛津大学出版社',
    grade: 'S1-S3',
    volume: 'Book 4A',
    tags: ['阅读', '核心', '基础'],
    is_system: true,
    words: VOCABULARY_BANK.map(w => ({
      id: w.id,
      word_id: w.id,
      book_id: 'wb_default_core',
      word: w.word,
      phonetic: w.phonetic,
      meaning: w.translation || w.meaning || '暂无中文释义',
      translation: w.translation || w.meaning || '暂无中文释义',
      partOfSpeech: w.partOfSpeech,
      exampleEn: w.exampleEn,
      exampleCn: w.exampleCn,
      exampleSentence: w.exampleEn,
      wordbook_id: 'wb_default_core',
    })),
    created_at: 1770000000000,
    updated_at: 1770000000000,
  };
}

export function getAllWordbooks(): Wordbook[] {
  if (typeof window === 'undefined') return [getDefaultWordbook()];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORDBOOKS);
    if (!raw) {
      const def = getDefaultWordbook();
      const initial = [def];
      localStorage.setItem(STORAGE_KEY_WORDBOOKS, JSON.stringify(initial));
      return initial;
    }
    let list = JSON.parse(raw) as Wordbook[];
    if (list.length === 0) {
      const def = getDefaultWordbook();
      const initial = [def];
      localStorage.setItem(STORAGE_KEY_WORDBOOKS, JSON.stringify(initial));
      return initial;
    }
    // 历史版本曾把系统测试词库写入个人列表，这里迁移到系统词库标签页。
    const systemIds = new Set(SYSTEM_WORDBOOKS_PRESETS.map(wb => wb.id));
    const cleanedList = list.filter(wb => !systemIds.has(wb.id) && wb.id !== TEST_200_WORDBOOK.id);
    if (cleanedList.length !== list.length) {
      list = cleanedList.length > 0 ? cleanedList : [getDefaultWordbook()];
      localStorage.setItem(STORAGE_KEY_WORDBOOKS, JSON.stringify(list));
    }
    // 保证字段完整性: 无 category 的旧词库统一归"我的词库"并标"未分类"
    return list.map(wb => ({
      ...wb,
      book_id: wb.book_id || wb.id,
      book_name: wb.book_name || wb.name,
      default_mode: wb.default_mode || 'focused_quiz',
      default_batch_size: wb.default_batch_size || (wb.default_mode === 'fast_review' ? 200 : 30),
      enabled_modes: wb.enabled_modes || ['fast_review', 'focused_quiz'],
      category: wb.category || (wb.id === 'wb_default_core' ? 'DSE' : '未分类'),
    }));
  } catch (e) {
    console.error('Failed to get wordbooks:', e);
    return [getDefaultWordbook()];
  }
}

/**
 * 获取所有官方系统预置词汇库
 */
export function getSystemWordbooks(): Wordbook[] {
  return [getDefaultWordbook(), ...SYSTEM_WORDBOOKS_PRESETS.filter(wb => wb.id !== getDefaultWordbook().id)];
}

/**
 * 用户在"系统词汇"中点击"使用/复制到我的词库"
 * 完整克隆生成一份属于用户的个人学习词库，加入个人列表，不影响系统词库本身
 */
export function copySystemWordbookToUser(systemWb: Wordbook): Wordbook {
  const timestamp = Date.now();
  const newBookId = `user_wb_${timestamp}_${Math.random().toString(36).substring(2, 6)}`;
  
  const clonedWords: WordItem[] = systemWb.words.map((w, idx) => ({
    ...w,
    id: `w_usr_${timestamp}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
    word_id: `w_usr_${timestamp}_${idx}`,
    book_id: newBookId,
    wordbook_id: newBookId,
  }));

  const userCopy: Wordbook = {
    id: newBookId,
    book_id: newBookId,
    name: systemWb.name,
    book_name: systemWb.book_name || systemWb.name,
    description: systemWb.description || `从系统词库复制`,
    default_mode: systemWb.default_mode || 'focused_quiz',
    default_batch_size: systemWb.default_batch_size || 30,
    enabled_modes: systemWb.enabled_modes || ['fast_review', 'focused_quiz'],
    category: systemWb.category || 'DSE',
    series: systemWb.series,
    publisher: systemWb.publisher,
    grade: systemWb.grade,
    volume: systemWb.volume,
    tags: systemWb.tags,
    is_system: false, // 复制到用户个人词库后为个人词库
    words: clonedWords,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const all = getAllWordbooks();
  const updated = [userCopy, ...all];
  saveAllWordbooks(updated);
  setActiveWordbookId(userCopy.id);
  return userCopy;
}

export function saveAllWordbooks(list: Wordbook[]): void {
  if (typeof window === 'undefined') return;
  const normalized = list.map(wb => ({
    ...wb,
    book_id: wb.book_id || wb.id,
    book_name: wb.book_name || wb.name,
    default_mode: wb.default_mode || 'focused_quiz',
    default_batch_size: wb.default_batch_size || (wb.default_mode === 'fast_review' ? 200 : 30),
    enabled_modes: wb.enabled_modes || ['fast_review', 'focused_quiz'],
  }));
  localStorage.setItem(STORAGE_KEY_WORDBOOKS, JSON.stringify(normalized));
}

export function getUserModeForWordbook(wordbookId: string): 'fast_review' | 'focused_quiz' | null {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(`daily30_user_mode_${wordbookId}`);
  if (val === 'fast_review' || val === 'focused_quiz') return val;
  return null;
}

export function setUserModeForWordbook(wordbookId: string, mode: 'fast_review' | 'focused_quiz'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`daily30_user_mode_${wordbookId}`, mode);
}

export function getEffectiveModeForWordbook(wordbook: Wordbook): 'fast_review' | 'focused_quiz' {
  const wbKey = wordbook.book_id || wordbook.id;
  const userMode = getUserModeForWordbook(wbKey);
  if (userMode) return userMode;
  return wordbook.default_mode || 'focused_quiz';
}

export function updateWordbookModeConfig(
  wordbookId: string,
  config: {
    default_mode?: 'fast_review' | 'focused_quiz';
    default_batch_size?: number;
    enabled_modes?: Array<'fast_review' | 'focused_quiz'>;
  }
): void {
  const all = getAllWordbooks();
  const target = all.find(wb => wb.id === wordbookId || wb.book_id === wordbookId);
  if (target) {
    if (config.default_mode) target.default_mode = config.default_mode;
    if (config.default_batch_size !== undefined) target.default_batch_size = config.default_batch_size;
    if (config.enabled_modes) target.enabled_modes = config.enabled_modes;
    target.updated_at = Date.now();
    saveAllWordbooks(all);
  }
}

export function getActiveWordbookId(): string {
  if (typeof window === 'undefined') return 'wb_default_core';
  let activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_WORDBOOK_ID);
  const all = getAllWordbooks();
  if (!activeId || !all.some(wb => wb.id === activeId)) {
    activeId = all[0]?.id || 'wb_default_core';
    localStorage.setItem(STORAGE_KEY_ACTIVE_WORDBOOK_ID, activeId);
  }
  return activeId;
}

export function setActiveWordbookId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ACTIVE_WORDBOOK_ID, id);
}

export function getWordbookById(id: string): Wordbook | undefined {
  const all = getAllWordbooks();
  return all.find(wb => wb.id === id);
}

export function createWordbook(
  name: string,
  words: WordItem[],
  description?: string,
  defaultMode: 'fast_review' | 'focused_quiz' = 'focused_quiz',
  defaultBatchSize: number = 30
): Wordbook {
  const bookId = `wb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newWb: Wordbook = {
    id: bookId,
    book_id: bookId,
    name: name.trim() || '未命名词库',
    book_name: name.trim() || '未命名词库',
    description: description || `包含 ${words.length} 个单词`,
    default_mode: defaultMode,
    default_batch_size: defaultBatchSize || (defaultMode === 'fast_review' ? 200 : 30),
    enabled_modes: ['fast_review', 'focused_quiz'],
    words: words.map((w, idx) => ({
      ...w,
      id: w.id || `w_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      word_id: w.id || `w_${Date.now()}_${idx}`,
      book_id: bookId,
    })),
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  const all = getAllWordbooks();
  const updated = [newWb, ...all];
  saveAllWordbooks(updated);
  setActiveWordbookId(newWb.id);
  return newWb;
}

export function updateWordbookName(id: string, newName: string): void {
  const all = getAllWordbooks();
  const target = all.find(wb => wb.id === id);
  if (target) {
    target.name = newName.trim();
    target.updated_at = Date.now();
    saveAllWordbooks(all);
  }
}

export function deleteWordbook(id: string): boolean {
  const all = getAllWordbooks();
  if (all.length <= 1) {
    return false; // Don't delete the only wordbook
  }
  const filtered = all.filter(wb => wb.id !== id);
  saveAllWordbooks(filtered);
  if (getActiveWordbookId() === id) {
    setActiveWordbookId(filtered[0].id);
  }
  return true;
}

export function reorderWordbooks(newList: Wordbook[]): void {
  saveAllWordbooks(newList);
}

export function moveWordbook(id: string, direction: 'up' | 'down'): Wordbook[] {
  const all = [...getAllWordbooks()];
  const index = all.findIndex(wb => wb.id === id);
  if (index === -1) return all;

  if (direction === 'up' && index > 0) {
    const temp = all[index - 1];
    all[index - 1] = all[index];
    all[index] = temp;
    saveAllWordbooks(all);
  } else if (direction === 'down' && index < all.length - 1) {
    const temp = all[index + 1];
    all[index + 1] = all[index];
    all[index] = temp;
    saveAllWordbooks(all);
  }

  return all;
}

/**
 * Parses raw text or CSV content supporting:
 * Format A:
 * facetious
 * vacillate
 * 
 * Format B:
 * facetious,轻浮的；爱开玩笑的
 * 
 * Format C:
 * word,phonetic,meaning
 * facetious,/fəˈtiːʃəs/,轻浮的；爱开玩笑的
 */
export function parseWordbookText(rawText: string): WordItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const results: WordItem[] = [];

  // Check if first line is a header
  let startIndex = 0;
  if (lines.length > 0) {
    const firstLineLower = lines[0].toLowerCase();
    if (
      firstLineLower.includes('word') ||
      firstLineLower.includes('单词') ||
      firstLineLower.includes('meaning') ||
      firstLineLower.includes('释义')
    ) {
      startIndex = 1;
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    // Split by comma, tab, or double space
    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes(',')) {
      parts = line.split(',');
    } else if (line.includes('，')) {
      parts = line.split('，');
    } else {
      // Match boundary where Chinese characters or Chinese punctuation start
      const chineseMatch = line.search(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/);
      if (chineseMatch > 0) {
        const engPart = line.slice(0, chineseMatch).trim();
        const cnPart = line.slice(chineseMatch).trim();
        parts = [engPart, cnPart];
      } else {
        const firstSpaceIdx = line.indexOf(' ');
        if (firstSpaceIdx > 0) {
          parts = [line.slice(0, firstSpaceIdx).trim(), line.slice(firstSpaceIdx).trim()];
        } else {
          parts = [line];
        }
      }
    }

    parts = parts.map(p => p.trim());
    let word = (parts[0] || '').replace(/[\u2010\u2011\u2012\u2013\u2014]/g, '-').trim();
    word = word.replace(/[;；,，。.]+$/, '').trim();
    if (!word) continue;

    let phonetic = '';
    let meaning = '';
    let manualExample = '';

    if (parts.length === 2) {
      // Format B: word, meaning
      meaning = parts[1];
    } else if (parts.length === 3) {
      // Format C: word, phonetic, meaning OR word, meaning, example
      if (parts[1].startsWith('/') || parts[1].startsWith('[') || parts[1].includes('ˈ')) {
        phonetic = parts[1];
        meaning = parts[2];
      } else {
        meaning = parts[1];
        manualExample = parts[2];
      }
    } else if (parts.length >= 4) {
      // Format D: word, phonetic, meaning, example
      phonetic = parts[1];
      meaning = parts[2];
      manualExample = parts.slice(3).join(', ');
    }

    results.push({
      id: `w_parsed_${i}_${Math.random().toString(36).substring(2, 6)}`,
      word,
      phonetic: phonetic || undefined,
      meaning: meaning || '暂无中文释义',
      translation: meaning || '暂无中文释义',
      exampleEn: manualExample || undefined,
      exampleSentence: manualExample || undefined,
    });
  }

  return results;
}

/**
 * Parses Excel files using xlsx
 */
export async function parseExcelFile(file: File): Promise<WordItem[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  if (!rows || rows.length === 0) return [];

  const textLines: string[] = [];
  rows.forEach(row => {
    if (Array.isArray(row) && row.length > 0) {
      const line = row.map(cell => String(cell || '').trim()).join(',');
      if (line.replace(/,/g, '').trim()) {
        textLines.push(line);
      }
    }
  });

  return parseWordbookText(textLines.join('\n'));
}

/**
 * Generates or retrieves deterministic 30 words for a given date and wordbook.
 * Requirement 4:
 * "系统每天固定生成30个新词。
 * 当天重新打开页面时，必须继续显示当天已经生成的同一批30个词，不能重新随机生成。"
 */
export function getDailyWordsForWordbookAndDate(wordbookId: string, dateStr: string): WordItem[] {
  const cacheKey = `daily30_assigned_${wordbookId}_${dateStr}`;
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as WordItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // regenerate
      }
    }
  }

  const wb = getWordbookById(wordbookId) || getDefaultWordbook();
  const pool = wb.words;

  if (pool.length <= 30) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(pool));
    }
    return pool;
  }

  // Deterministic seed hash based on date string and wordbook id
  const combinedKey = `${wordbookId}_${dateStr}`;
  let hash = 0;
  for (let i = 0; i < combinedKey.length; i++) {
    hash = (hash << 5) - hash + combinedKey.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);

  // Deterministic shuffle
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(((seed * (i + 1) * 9301 + 49297) % 233280) / 233280 * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const assigned = shuffled.slice(0, 30);
  if (typeof window !== 'undefined') {
    localStorage.setItem(cacheKey, JSON.stringify(assigned));
  }
  return assigned;
}
