import { WordItem } from '../types';
import { getDseRecordByWord, DseTextbookRecord } from '../data/dseTextbookData';

export interface ResolvedDseContent {
  targetWord: string;
  sentence: string;
  isTextbookSentence: boolean;
  sourceText: string;
  sourceBook?: string;
  sourceUnit?: string;
  sourcePage?: string;
  sourceReference?: string;
  synonyms: string[];
  hasVerifiedSynonyms: boolean;
  sentenceStatus: 'verified' | 'generated' | 'missing';
}

/**
 * 建立 DSE 课本原句、同义词的数据读取与兜底机制
 * 
 * 规则：
 * 1. 优先读取已入库核实的 DSE 课本原句与来源（书册、单元、页码、内部编号）
 * 2. 不得改写已经入库的原句
 * 3. 若原句不存在，展示兜底生成的句子，并明确显示「AI 生成例句｜非课本原句」
 * 4. 展示与当前目标词意义相符的高频同义词，优先已入库的 DSE 阅读/写作相关词汇
 * 5. 若无可靠同义词，严格显示「暂无已核实的同义词」，不得随意编造
 */
export function resolveDseContent(wordItem?: WordItem): ResolvedDseContent {
  if (!wordItem) {
    return {
      targetWord: '',
      sentence: '',
      isTextbookSentence: false,
      sourceText: '暂无例句',
      synonyms: [],
      hasVerifiedSynonyms: false,
      sentenceStatus: 'missing',
    };
  }

  const rawWord = wordItem.word || '';
  const dseRecord: DseTextbookRecord | undefined = getDseRecordByWord(rawWord);

  // 1. 优先使用已核验的教材数据库
  if (dseRecord) {
    const parts = [
      dseRecord.source_book,
      dseRecord.source_unit,
      dseRecord.source_page,
      dseRecord.source_reference,
    ].filter(Boolean);

    const sourceText = parts.length > 0 ? parts.join(' · ') : '香港 DSE 核心教材原句';

    return {
      targetWord: rawWord,
      sentence: dseRecord.textbook_sentence,
      isTextbookSentence: dseRecord.sentence_source_type === 'textbook',
      sourceText,
      sourceBook: dseRecord.source_book,
      sourceUnit: dseRecord.source_unit,
      sourcePage: dseRecord.source_page,
      sourceReference: dseRecord.source_reference,
      synonyms: Array.isArray(dseRecord.synonyms) ? dseRecord.synonyms : [],
      hasVerifiedSynonyms: Array.isArray(dseRecord.synonyms) && dseRecord.synonyms.length > 0,
      sentenceStatus: dseRecord.sentence_status || 'verified',
    };
  }

  // 2. 其次检查单词自带的 DSE 课本字段
  if (wordItem.textbook_sentence && wordItem.textbook_sentence.trim()) {
    const parts = [
      wordItem.source_book,
      wordItem.source_unit,
      wordItem.source_page ? (typeof wordItem.source_page === 'number' ? `p.${wordItem.source_page}` : wordItem.source_page) : undefined,
      wordItem.source_reference,
    ].filter(Boolean);

    const isTextbook = wordItem.sentence_source_type === 'textbook';
    const sourceText = parts.length > 0 
      ? parts.join(' · ') 
      : isTextbook 
        ? 'DSE 课本原句库' 
        : 'AI 生成例句｜非课本原句';

    const validSynonyms = Array.isArray(wordItem.synonyms) ? wordItem.synonyms.filter(s => Boolean(s && s.trim())) : [];

    return {
      targetWord: rawWord,
      sentence: wordItem.textbook_sentence.trim(),
      isTextbookSentence: isTextbook,
      sourceText,
      sourceBook: wordItem.source_book,
      sourceUnit: wordItem.source_unit,
      sourcePage: wordItem.source_page ? String(wordItem.source_page) : undefined,
      sourceReference: wordItem.source_reference,
      synonyms: validSynonyms,
      hasVerifiedSynonyms: validSynonyms.length > 0,
      sentenceStatus: wordItem.sentence_status || (isTextbook ? 'verified' : 'generated'),
    };
  }

  // 3. 兜底生成机制 (原句不存在)
  const candidateSentence = (wordItem.exampleSentence || wordItem.exampleEn || '').trim();
  const fallbackSentence = candidateSentence || `Understanding the fundamental application of ${rawWord} is critical in formal academic communication.`;
  const validSynonyms = Array.isArray(wordItem.synonyms) ? wordItem.synonyms.filter(s => Boolean(s && s.trim())) : [];

  return {
    targetWord: rawWord,
    sentence: fallbackSentence,
    isTextbookSentence: false,
    sourceText: 'AI 生成例句｜非课本原句',
    synonyms: validSynonyms,
    hasVerifiedSynonyms: validSynonyms.length > 0,
    sentenceStatus: 'generated',
  };
}
