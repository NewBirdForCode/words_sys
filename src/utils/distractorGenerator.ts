import { WordItem } from '../types';
import { BUILTIN_DICTIONARY } from '../data/dictionary';
import { WORD_ANALYSIS_PRESETS } from '../data/wordAnalysisBank';
import { CURATED_SCENARIOS_BANK } from '../data/curatedScenarios';

export interface DistractorOption {
  id: string;
  word: string;
  meaning: string;
  isCorrect: boolean;
}

/**
 * 计算两个英文单词的编辑距离 (Levenshtein Distance)
 */
function getLevenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1, // deletion
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }
  return matrix[bn][an];
}

/**
 * 校验中文释义是否合法 (排除占位符、太长或空字符串)
 */
function isValidMeaning(meaning?: string, correctMeaning: string = ''): boolean {
  if (!meaning) return false;
  const trimmed = meaning.trim();
  if (trimmed.length === 0 || trimmed.length > 36) return false;
  if (trimmed.includes('暂无') || trimmed.includes('核心学术') || trimmed.includes('暂缺')) return false;

  // 避免干扰项与正确答案完全相同或互为子串重复
  if (trimmed === correctMeaning) return false;
  if (correctMeaning && (trimmed.includes(correctMeaning) || correctMeaning.includes(trimmed)) && Math.abs(trimmed.length - correctMeaning.length) <= 2) {
    return false;
  }
  return true;
}

/**
 * 提取精简的中文主义 (取前1-2个主要义项)
 */
function cleanMeaning(raw: string): string {
  const parts = raw.split(/[；;]/).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}；${parts[1]}`;
  }
  return parts[0] || raw.trim();
}

/**
 * 生成高质量四选一中文选项：
 * 优先级 1: 同词性、同场景的近义词（如 sprain 的干扰项用 wrench / twist 的中文）
 * 优先级 2: 拼写相近的形似词（如 cite 的干扰项：城市 / 引用 / 仪式 / 叮咬）
 * 优先级 3: 同词根或其他同词性真实词汇
 */
export function generateDistractors(
  currentWord: WordItem,
  correctMeaning: string,
  candidatePool: WordItem[] = [],
  allWordsMap: Record<string, WordItem> = {}
): DistractorOption[] {
  const cleanCorrect = cleanMeaning(correctMeaning);
  const targetLower = currentWord.word.toLowerCase();
  const currentPos = (
    currentWord.partOfSpeech ||
    BUILTIN_DICTIONARY[targetLower]?.partOfSpeech ||
    ''
  ).trim().toLowerCase();

  const chosenDistractors: Array<{ word: string; meaning: string; score: number }> = [];
  const seenMeanings = new Set<string>([cleanCorrect, correctMeaning.trim()]);
  const seenWords = new Set<string>([targetLower]);

  // 1. 尝试从同义词预设中获取候选词（优先级 1：同词性/近义词词库）
  const preset = WORD_ANALYSIS_PRESETS[targetLower];
  if (preset?.synonyms) {
    for (const syn of preset.synonyms) {
      const synWord = typeof syn === 'string' ? syn : syn.word;
      const synMeaning = typeof syn === 'string' ? '' : (syn.meaning || '');
      const sLower = synWord.toLowerCase();
      if (seenWords.has(sLower)) continue;

      let meaningToUse = synMeaning;
      if (!meaningToUse) {
        meaningToUse = BUILTIN_DICTIONARY[sLower]?.meaning || allWordsMap[sLower]?.meaning || '';
      }
      meaningToUse = cleanMeaning(meaningToUse);

      if (isValidMeaning(meaningToUse, cleanCorrect) && !seenMeanings.has(meaningToUse)) {
        seenMeanings.add(meaningToUse);
        seenWords.add(sLower);
        chosenDistractors.push({ word: synWord, meaning: meaningToUse, score: 100 });
      }
    }
  }

  // 2. 从同场景库中寻找候选
  const scenarioObj = CURATED_SCENARIOS_BANK[targetLower];
  const targetScene = currentWord.scenario || scenarioObj?.scenarios?.[0]?.scene || '';
  if (targetScene) {
    for (const [k, sc] of Object.entries(CURATED_SCENARIOS_BANK)) {
      if (seenWords.has(k)) continue;
      const scene = sc.scenarios?.[0]?.scene || '';
      if (scene && (scene.includes(targetScene) || targetScene.includes(scene))) {
        const m = cleanMeaning(sc.meaning);
        if (isValidMeaning(m, cleanCorrect) && !seenMeanings.has(m)) {
          seenMeanings.add(m);
          seenWords.add(k);
          chosenDistractors.push({ word: k, meaning: m, score: 85 });
          if (chosenDistractors.length >= 3) break;
        }
      }
    }
  }

  // 3. 优先级 2：拼写相近词 (形似词) 评分筛选
  // 结合候选词库与内置词典
  const poolAndDictWords: Array<{ word: string; meaning: string; pos: string }> = [];

  for (const item of candidatePool) {
    const wLower = item.word.toLowerCase();
    if (!seenWords.has(wLower)) {
      const m = cleanMeaning(item.meaning || item.translation || '');
      const p = (item.partOfSpeech || '').toLowerCase();
      if (isValidMeaning(m, cleanCorrect)) {
        poolAndDictWords.push({ word: item.word, meaning: m, pos: p });
      }
    }
  }

  for (const [k, v] of Object.entries(BUILTIN_DICTIONARY)) {
    if (!seenWords.has(k)) {
      const m = cleanMeaning(v.meaning || '');
      if (isValidMeaning(m, cleanCorrect)) {
        poolAndDictWords.push({ word: k, meaning: m, pos: (v.partOfSpeech || '').toLowerCase() });
      }
    }
  }

  // 对全部词评分：计算编辑距离与词性相似度
  const scoredCandidates: Array<{ word: string; meaning: string; score: number }> = [];

  for (const item of poolAndDictWords) {
    const wLower = item.word.toLowerCase();
    if (wLower === targetLower) continue;

    const dist = getLevenshteinDistance(targetLower, wLower);
    let score = 0;

    // 形似词加分 (编辑距离 <= 3，或首字母+长度相近)
    if (dist <= 2) {
      score += 70;
    } else if (dist === 3) {
      score += 45;
    } else if (targetLower.startsWith(wLower.slice(0, 3))) {
      score += 35;
    } else if (Math.abs(targetLower.length - wLower.length) <= 1) {
      score += 15;
    }

    // 同词性加分
    if (currentPos && item.pos && (currentPos.includes(item.pos) || item.pos.includes(currentPos))) {
      score += 25;
    }

    // 释义长度相近加分
    const lenDiff = Math.abs(item.meaning.length - cleanCorrect.length);
    score += Math.max(0, 10 - lenDiff);

    if (score > 10) {
      scoredCandidates.push({ word: item.word, meaning: item.meaning, score });
    }
  }

  scoredCandidates.sort((a, b) => b.score - a.score);

  for (const cand of scoredCandidates) {
    const wLower = cand.word.toLowerCase();
    if (seenWords.has(wLower) || seenMeanings.has(cand.meaning)) continue;

    seenWords.add(wLower);
    seenMeanings.add(cand.meaning);
    chosenDistractors.push(cand);
    if (chosenDistractors.length >= 3) break;
  }

  // 如果依然不足3个，从高频词典中随机补充真实中文
  if (chosenDistractors.length < 3) {
    for (const [k, v] of Object.entries(BUILTIN_DICTIONARY)) {
      const m = cleanMeaning(v.meaning || '');
      if (isValidMeaning(m, cleanCorrect) && !seenMeanings.has(m) && !seenWords.has(k)) {
        seenMeanings.add(m);
        seenWords.add(k);
        chosenDistractors.push({ word: k, meaning: m, score: 5 });
        if (chosenDistractors.length >= 3) break;
      }
    }
  }

  // 构造最终 4 个选项并随机打乱
  const finalDistractors = chosenDistractors.slice(0, 3).map((d, index) => ({
    id: `distractor_${d.word}_${index}`,
    word: d.word,
    meaning: d.meaning,
    isCorrect: false,
  }));

  const allOptions: DistractorOption[] = [
    {
      id: `correct_${currentWord.id}`,
      word: currentWord.word,
      meaning: cleanCorrect,
      isCorrect: true,
    },
    ...finalDistractors,
  ];

  return allOptions.sort(() => Math.random() - 0.5);
}
