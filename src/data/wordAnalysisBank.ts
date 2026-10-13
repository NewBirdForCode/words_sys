import { SynonymEntry, CollocationEntry, WordFormEntry, WordItem, WordRootsInfo } from '../types';
import { DSE_TEXTBOOK_DATABASE } from './dseTextbookData';
import { CURATED_SCENARIOS_BANK } from './curatedScenarios';

export interface WordMorphologySegments {
  prefix?: string;
  root: string;
  suffix?: string;
  formattedDisplay: string; // e.g. "re·sid·ent"
}

export interface ResolvedWordAnalysis {
  synonyms: SynonymEntry[];
  collocations: CollocationEntry[];
  forms: WordFormEntry[];
  rootsExplanation?: string;
  morphology: WordMorphologySegments;
}

/**
 * 权威 DSE / 核心考纲词汇变形与搭配精编库
 */
export const WORD_ANALYSIS_PRESETS: Record<
  string,
  {
    synonyms?: Array<string | SynonymEntry>;
    collocations?: Array<string | CollocationEntry>;
    forms?: Array<string | WordFormEntry>;
    roots?: string;
    morphology?: WordMorphologySegments;
  }
> = {
  resident: {
    synonyms: [
      { word: 'inhabitant', meaning: '居民' },
      { word: 'dweller', meaning: '居住者' },
      { word: 'occupant', meaning: '入住者' },
      { word: 'citizen', meaning: '市民；公民' },
    ],
    collocations: [
      { phrase: 'local residents', meaning: '当地居民' },
      { phrase: 'resident of...', meaning: '……的住户/居民' },
      { phrase: 'permanent resident', meaning: '永久居民' },
    ],
    forms: [
      { word: 'reside', pos: 'v.', meaning: '居住；定居' },
      { word: 'resident', pos: 'n.', meaning: '居民；住户' },
      { word: 'residence', pos: 'n.', meaning: '住所；住宅' },
      { word: 'residential', pos: 'adj.', meaning: '住宅区的；适于居住的' },
    ],
    roots: 're-(回,再) + sid(坐) + -ent(……的人) → 常住的人 → 居民',
    morphology: {
      prefix: 're',
      root: 'sid',
      suffix: 'ent',
      formattedDisplay: 're·sid·ent',
    },
  },
  sprain: {
    synonyms: [
      { word: 'twist', meaning: '扭伤；拧' },
      { word: 'wrench', meaning: '猛扭；扭伤' },
      { word: 'strain', meaning: '拉伤；扭伤' },
    ],
    collocations: [
      { phrase: "sprain one's ankle", meaning: '扭伤脚踝' },
      { phrase: 'sprain a wrist', meaning: '扭伤手腕' },
      { phrase: 'severe sprain', meaning: '严重扭伤' },
    ],
    forms: [
      { word: 'sprains', pos: '三单', meaning: '扭伤' },
      { word: 'sprained', pos: '过去式', meaning: '扭伤了' },
      { word: 'spraining', pos: '现在分词', meaning: '正在扭伤' },
    ],
    roots: 'sprain (扭伤关节、韧带拉伤)',
    morphology: {
      root: 'sprain',
      formattedDisplay: 'sprain',
    },
  },
  accommodation: {
    synonyms: [
      { word: 'lodging', meaning: '寄宿；暂住处' },
      { word: 'housing', meaning: '住房；住房供给' },
      { word: 'board', meaning: '膳宿；寄宿' },
    ],
    collocations: [
      { phrase: 'make accommodation for...', meaning: '为……提供住宿/做出通融' },
      { phrase: 'book accommodation in advance', meaning: '提前预订住宿' },
      { phrase: 'temporary accommodation', meaning: '临时住处' },
    ],
    forms: [
      { word: 'accommodate', pos: 'v.', meaning: '容纳；提供住宿' },
      { word: 'accommodation', pos: 'n.', meaning: '住处；膳宿' },
      { word: 'accommodating', pos: 'adj.', meaning: '乐于助人的；好通融的' },
    ],
    roots: 'ac-(去,使) + commod(便利,合适) + -ation(名词后缀) → 提供便利的住处 → 住处、膳宿',
    morphology: {
      prefix: 'ac',
      root: 'commod',
      suffix: 'ation',
      formattedDisplay: 'ac·commod·ation',
    },
  },
  borrow: {
    synonyms: [
      { word: 'take a loan of', meaning: '借入' },
      { word: 'obtain on loan', meaning: '借调' },
      { word: 'adopt', meaning: '借用；采纳' },
    ],
    collocations: [
      { phrase: 'borrow sth from sb', meaning: '向某人借某物' },
      { phrase: 'borrow heavily', meaning: '大举借债' },
      { phrase: 'borrow ideas from...', meaning: '借鉴……的想法' },
    ],
    forms: [
      { word: 'borrow', pos: 'v.', meaning: '借入；借用' },
      { word: 'borrower', pos: 'n.', meaning: '借款人；借用者' },
      { word: 'borrowing', pos: 'n.', meaning: '借款；借用' },
    ],
    roots: '古英语 borgian(担保,借贷) → 以信用作保借入 → 借入、借用',
    morphology: {
      root: 'borrow',
      formattedDisplay: 'borrow',
    },
  },
  afford: {
    synonyms: [
      { word: 'manage to pay for', meaning: '负担得起' },
      { word: 'bear the cost of', meaning: '承担费用' },
      { word: 'sustain', meaning: '维持；经受' },
    ],
    collocations: [
      { phrase: 'cannot afford to do sth', meaning: '承受不起做某事' },
      { phrase: 'afford an opportunity', meaning: '提供机会' },
      { phrase: 'afford the expense', meaning: '承担得起这笔开销' },
    ],
    forms: [
      { word: 'afford', pos: 'v.', meaning: '买得起；承担得起' },
      { word: 'affordable', pos: 'adj.', meaning: '价格适中的；负担得起的' },
      { word: 'affordability', pos: 'n.', meaning: '支付能力；可负担性' },
    ],
    roots: 'af-(向前) + ford/forth(推进) → 能够推进完成 → 负担得起、买得起',
    morphology: {
      prefix: 'af',
      root: 'ford',
      formattedDisplay: 'af·ford',
    },
  },
  avoid: {
    synonyms: [
      { word: 'prevent', meaning: '预防' },
      { word: 'evade', meaning: '逃避' },
      { word: 'steer clear of', meaning: '避开' },
      { word: 'shun', meaning: '有意回避' },
    ],
    collocations: [
      { phrase: 'avoid doing sth', meaning: '避免做某事' },
      { phrase: 'avoid the rush hour', meaning: '避开高峰期' },
      { phrase: 'avoid mistakes', meaning: '避免犯错' },
    ],
    forms: [
      { word: 'avoid', pos: 'v.', meaning: '避免；避开' },
      { word: 'avoidance', pos: 'n.', meaning: '避免；逃避' },
      { word: 'avoidable', pos: 'adj.', meaning: '可避免的' },
      { word: 'unavoidable', pos: 'adj.', meaning: '不可避免的' },
    ],
    roots: 'a-(离开) + void(空虚) → 使之空开、离开危险 → 避免、避开',
    morphology: {
      prefix: 'a',
      root: 'void',
      formattedDisplay: 'a·void',
    },
  },
  attend: {
    synonyms: [
      { word: 'be present at', meaning: '出席' },
      { word: 'participate in', meaning: '参加' },
      { word: 'go to', meaning: '前往参加' },
    ],
    collocations: [
      { phrase: 'attend school/class', meaning: '上学/上课' },
      { phrase: 'attend a meeting/summit', meaning: '参加会议/峰会' },
      { phrase: 'attend to...', meaning: '专心于；照顾' },
    ],
    forms: [
      { word: 'attend', pos: 'v.', meaning: '出席；参加' },
      { word: 'attendance', pos: 'n.', meaning: '出席率；出勤' },
      { word: 'attendant', pos: 'n.', meaning: '服务人员；侍从' },
      { word: 'attentive', pos: 'adj.', meaning: '专注的；留心的' },
    ],
    roots: 'at-(向,朝) + tend(伸展,用心) → 身心伸展前往 → 出席、参加、专心',
    morphology: {
      prefix: 'at',
      root: 'tend',
      formattedDisplay: 'at·tend',
    },
  },
  opportunity: {
    synonyms: [
      { word: 'chance', meaning: '机会' },
      { word: 'prospect', meaning: '前景；展望' },
      { word: 'opening', meaning: '空缺；良机' },
    ],
    collocations: [
      { phrase: 'seize/grab an opportunity', meaning: '抓住机会' },
      { phrase: 'equal opportunity', meaning: '平等机会' },
      { phrase: 'opportunity for growth', meaning: '成长机会' },
    ],
    forms: [
      { word: 'opportunity', pos: 'n.', meaning: '机会；时机' },
      { word: 'opportune', pos: 'adj.', meaning: '合时宜的；适时的' },
      { word: 'opportunist', pos: 'n.', meaning: '机会主义者' },
    ],
    roots: 'op-(朝着) + port(港口) + -unity(名词后缀) → 顺风驶向港口 → 顺风良机 → 机会',
    morphology: {
      prefix: 'op',
      root: 'port',
      suffix: 'unity',
      formattedDisplay: 'op·port·unity',
    },
  },
  environment: {
    synonyms: [
      { word: 'surroundings', meaning: '周边环境' },
      { word: 'ecosystem', meaning: '生态系统' },
      { word: 'habitat', meaning: '栖息地' },
    ],
    collocations: [
      { phrase: 'protect the environment', meaning: '保护环境' },
      { phrase: 'natural environment', meaning: '自然环境' },
      { phrase: 'learning environment', meaning: '学习环境' },
    ],
    forms: [
      { word: 'environment', pos: 'n.', meaning: '环境；生态' },
      { word: 'environmental', pos: 'adj.', meaning: '环境的；环保的' },
      { word: 'environmentalist', pos: 'n.', meaning: '环保主义者' },
    ],
    roots: 'en-(在内) + viron(环绕) + -ment(名词后缀) → 周围环绕的事物 → 环境、生态',
    morphology: {
      prefix: 'en',
      root: 'viron',
      suffix: 'ment',
      formattedDisplay: 'en·viron·ment',
    },
  },
  responsible: {
    synonyms: [
      { word: 'accountable', meaning: '应负责任的' },
      { word: 'liable', meaning: '有法律责任的' },
      { word: 'dependable', meaning: '可靠的' },
    ],
    collocations: [
      { phrase: 'be responsible for...', meaning: '对……负责' },
      { phrase: 'responsible citizen', meaning: '有责任感的市民' },
      { phrase: 'hold sb responsible', meaning: '追究某人的责任' },
    ],
    forms: [
      { word: 'respond', pos: 'v.', meaning: '回应；反应' },
      { word: 'response', pos: 'n.', meaning: '回答；响应' },
      { word: 'responsible', pos: 'adj.', meaning: '负责任的' },
      { word: 'responsibility', pos: 'n.', meaning: '责任；义务' },
    ],
    roots: 're-(回) + spons(承诺,响应) + -ible(能够……的) → 能够回应承诺的 → 负责任的',
    morphology: {
      prefix: 're',
      root: 'spons',
      suffix: 'ible',
      formattedDisplay: 're·spons·ible',
    },
  },
  sustainable: {
    synonyms: [
      { word: 'renewable', meaning: '可再生的' },
      { word: 'viable', meaning: '切实可行的' },
      { word: 'eco-friendly', meaning: '环保的' },
      { word: 'enduring', meaning: '持久的' },
    ],
    collocations: [
      { phrase: 'sustainable development', meaning: '可持续发展' },
      { phrase: 'sustainable lifestyle', meaning: '可持续生活方式' },
      { phrase: 'sustainable energy', meaning: '可持续能源' },
    ],
    forms: [
      { word: 'sustain', pos: 'v.', meaning: '维持；支撑' },
      { word: 'sustainable', pos: 'adj.', meaning: '可持续的' },
      { word: 'sustainability', pos: 'n.', meaning: '可持续性' },
    ],
    roots: 'sus-(在下面) + tain(支撑) + -able(可以……的) → 可以在底层长久支撑的 → 可持续的',
    morphology: {
      prefix: 'sus',
      root: 'tain',
      suffix: 'able',
      formattedDisplay: 'sus·tain·able',
    },
  },
  ubiquitous: {
    synonyms: [
      { word: 'omnipresent', meaning: '无所不在的' },
      { word: 'pervasive', meaning: '遍及的；渗透的' },
      { word: 'widespread', meaning: '普遍的' },
    ],
    collocations: [
      { phrase: 'become ubiquitous in...', meaning: '在……中普及普遍' },
      { phrase: 'ubiquitous technology', meaning: '无处不在的技术' },
    ],
    forms: [
      { word: 'ubiquity', pos: 'n.', meaning: '普遍存在；无所不在' },
      { word: 'ubiquitous', pos: 'adj.', meaning: '无所不在的' },
      { word: 'ubiquitously', pos: 'adv.', meaning: '到处；普遍地' },
    ],
    roots: 'ubique(到处) + -ous(充满……的形容词后缀) → 到处都存在的 → 无所不在的',
    morphology: {
      root: 'ubiquit',
      suffix: 'ous',
      formattedDisplay: 'ubiquit·ous',
    },
  },
  pragmatic: {
    synonyms: [
      { word: 'practical', meaning: '务实的；实用的' },
      { word: 'realistic', meaning: '讲求实际的' },
      { word: 'sensible', meaning: '通情达理的' },
    ],
    collocations: [
      { phrase: 'adopt a pragmatic approach', meaning: '采取务实的方法' },
      { phrase: 'pragmatic solution', meaning: '务实的解决方案' },
    ],
    forms: [
      { word: 'pragmatism', pos: 'n.', meaning: '实用主义' },
      { word: 'pragmatist', pos: 'n.', meaning: '务实者' },
      { word: 'pragmatic', pos: 'adj.', meaning: '务实的' },
      { word: 'pragmatically', pos: 'adv.', meaning: '务实地' },
    ],
    roots: 'pragmat(行动,事务) + -ic(形容词后缀) → 注重实际行动的 → 务实的',
    morphology: {
      root: 'pragmat',
      suffix: 'ic',
      formattedDisplay: 'pragmat·ic',
    },
  },
  resilient: {
    synonyms: [
      { word: 'tough', meaning: '坚强的；结实的' },
      { word: 'adaptable', meaning: '适应力强的' },
      { word: 'hardy', meaning: '经得起考验的' },
    ],
    collocations: [
      { phrase: 'nurture resilient youths', meaning: '培养坚韧的青年' },
      { phrase: 'resilient economy', meaning: '具韧性的经济' },
    ],
    forms: [
      { word: 'resilience', pos: 'n.', meaning: '韧性；恢复力' },
      { word: 'resilient', pos: 'adj.', meaning: '有韧性的；能复原的' },
    ],
    roots: 're-(回,再) + sili(跳跃) + -ent(形容词后缀) → 能回跳弹起的 → 坚韧的、有弹性的',
    morphology: {
      prefix: 're',
      root: 'sili',
      suffix: 'ent',
      formattedDisplay: 're·sili·ent',
    },
  },
  advocate: {
    synonyms: [
      { word: 'champion', meaning: '捍卫；倡导' },
      { word: 'support', meaning: '支持' },
      { word: 'endorse', meaning: '背书赞同' },
      { word: 'promote', meaning: '推崇促进' },
    ],
    collocations: [
      { phrase: 'advocate for equal rights', meaning: '倡导平等权利' },
      { phrase: 'public advocate', meaning: '公众倡导者' },
    ],
    forms: [
      { word: 'advocate', pos: 'v./n.', meaning: '提倡；倡导者' },
      { word: 'advocacy', pos: 'n.', meaning: '倡导；拥护' },
    ],
    roots: 'ad-(朝向) + voc(发声,呼叫) + -ate(动词后缀) → 朝向大众呼吁发声 → 倡导、拥护',
    morphology: {
      prefix: 'ad',
      root: 'voc',
      suffix: 'ate',
      formattedDisplay: 'ad·voc·ate',
    },
  },
  alleviate: {
    synonyms: [
      { word: 'relieve', meaning: '缓解' },
      { word: 'ease', meaning: '减轻' },
      { word: 'mitigate', meaning: '缓和' },
    ],
    collocations: [
      { phrase: 'alleviate poverty', meaning: '缓解贫困' },
      { phrase: 'alleviate stress', meaning: '减轻压力' },
    ],
    forms: [
      { word: 'alleviate', pos: 'v.', meaning: '缓解；减轻' },
      { word: 'alleviation', pos: 'n.', meaning: '缓和；减轻' },
    ],
    roots: 'al-(使) + levi(轻,升起) + -ate(使动后缀) → 使负重变轻 → 减轻、缓和',
    morphology: {
      prefix: 'al',
      root: 'levi',
      suffix: 'ate',
      formattedDisplay: 'al·levi·ate',
    },
  },
  bolster: {
    synonyms: [
      { word: 'strengthen', meaning: '加强；增强' },
      { word: 'reinforce', meaning: '加固；强化' },
      { word: 'support', meaning: '支持；支撑' },
      { word: 'boost', meaning: '提振；促进' },
    ],
    collocations: [
      { phrase: 'bolster public confidence', meaning: '提振公众信心' },
      { phrase: 'bolster the economy', meaning: '促进经济增长' },
      { phrase: 'bolster security measures', meaning: '加强安全防范措施' },
    ],
    forms: [
      { word: 'bolster', pos: 'v.', meaning: '支持；增强；巩固' },
      { word: 'bolstered', pos: 'adj./v.', meaning: '受到巩固的' },
      { word: 'bolstering', pos: 'n./v.', meaning: '支持；强化' },
    ],
    roots: 'bol(膨胀,圆木,垫木支撑) + -ster(器具/使动) → 起坚固支撑作用 → 巩固、增强',
    morphology: {
      root: 'bolst',
      suffix: 'er',
      formattedDisplay: 'bol·ster',
    },
  },
};

/**
 * 智能拆分词根词缀 (通用推导规则)
 */
export function deriveWordMorphology(word: string): WordMorphologySegments {
  const w = (word || '').trim().toLowerCase();
  const commonPrefixes = [
    're', 'in', 'im', 'un', 'dis', 'con', 'com', 'pro', 'pre', 'sub',
    'ex', 'trans', 'ad', 'ac', 'af', 'al', 'op', 'sus', 'de', 'en', 'mis'
  ];
  const commonSuffixes = [
    'tion', 'sion', 'ment', 'able', 'ible', 'ence', 'ance', 'ent', 'ant',
    'ous', 'ive', 'ity', 'al', 'ing', 'ed', 'er', 'or', 'ly', 'ic', 'ate'
  ];

  for (const p of commonPrefixes) {
    if (w.startsWith(p) && w.length >= p.length + 3) {
      const rest = w.slice(p.length);
      for (const s of commonSuffixes) {
        if (rest.endsWith(s) && rest.length >= s.length + 2) {
          const r = rest.slice(0, rest.length - s.length);
          return {
            prefix: p,
            root: r,
            suffix: s,
            formattedDisplay: `${p}·${r}·${s}`,
          };
        }
      }
      return {
        prefix: p,
        root: rest,
        formattedDisplay: `${p}·${rest}`,
      };
    }
  }

  for (const s of commonSuffixes) {
    if (w.endsWith(s) && w.length >= s.length + 3) {
      const r = w.slice(0, w.length - s.length);
      return {
        root: r,
        suffix: s,
        formattedDisplay: `${r}·${s}`,
      };
    }
  }

  return {
    root: w,
    formattedDisplay: w,
  };
}

/**
 * 将任意格式的同义词解析为标准的 SynonymEntry
 */
export function normalizeSynonym(item: string | SynonymEntry): SynonymEntry {
  if (typeof item === 'object' && item !== null) {
    return {
      word: item.word,
      meaning: item.meaning,
    };
  }
  const str = String(item).trim();
  if (str.includes('(') && str.includes(')')) {
    const match = str.match(/^([^(]+)\(([^)]+)\)$/);
    if (match) {
      return { word: match[1].trim(), meaning: match[2].trim() };
    }
  }
  if (str.includes('——') || str.includes('—')) {
    const parts = str.split(/——|—/);
    return { word: parts[0].trim(), meaning: parts[1]?.trim() };
  }
  return { word: str };
}

/**
 * 将任意格式的搭配解析为标准的 CollocationEntry
 */
export function normalizeCollocation(item: string | CollocationEntry): CollocationEntry {
  if (typeof item === 'object' && item !== null) {
    return {
      phrase: item.phrase,
      meaning: item.meaning,
    };
  }
  const str = String(item).trim();
  if (str.includes('(') && str.includes(')')) {
    const match = str.match(/^([^(]+)\(([^)]+)\)$/);
    if (match) {
      return { phrase: match[1].trim(), meaning: match[2].trim() };
    }
  }
  return { phrase: str };
}

/**
 * 将任意格式的词形变形解析为标准的 WordFormEntry
 */
export function normalizeWordForm(item: string | WordFormEntry): WordFormEntry {
  if (typeof item === 'object' && item !== null) {
    return {
      word: item.word,
      pos: item.pos,
      meaning: item.meaning,
    };
  }
  const str = String(item).trim();
  const match = str.match(/^([^(]+)\(([^)]+)\)(.*)$/);
  if (match) {
    const w = match[1].trim();
    const pos = match[2].trim();
    const rest = match[3]?.replace(/^[—\-\s]+/, '').trim();
    return { word: w, pos, meaning: rest || undefined };
  }
  return { word: str };
}

/**
 * 智能汇总解析单词的同义词、常用搭配、词形变形及构词词根拆解
 */
export function resolveWordAnalysis(wordItem?: WordItem): ResolvedWordAnalysis {
  if (!wordItem) {
    return {
      synonyms: [],
      collocations: [],
      forms: [],
      morphology: { root: '', formattedDisplay: '' },
    };
  }

  const rawWord = (wordItem.word || '').trim().toLowerCase();
  const preset = WORD_ANALYSIS_PRESETS[rawWord];
  const dse = DSE_TEXTBOOK_DATABASE[rawWord];
  const curated = CURATED_SCENARIOS_BANK[rawWord];

  // 1. 同义词处理
  const rawSynonyms: Array<string | SynonymEntry> = [];
  if (Array.isArray(wordItem.synonyms) && wordItem.synonyms.length > 0) {
    rawSynonyms.push(...wordItem.synonyms);
  } else if (preset?.synonyms && preset.synonyms.length > 0) {
    rawSynonyms.push(...preset.synonyms);
  } else if (dse?.synonyms && dse.synonyms.length > 0) {
    rawSynonyms.push(...dse.synonyms);
  }

  const seenSyn = new Set<string>();
  const normalizedSynonyms: SynonymEntry[] = [];
  for (const s of rawSynonyms) {
    const norm = normalizeSynonym(s);
    const key = norm.word.toLowerCase();
    if (key && key !== rawWord && !seenSyn.has(key)) {
      seenSyn.add(key);
      normalizedSynonyms.push(norm);
    }
  }

  // 2. 常用搭配处理
  const rawCollocations: Array<string | CollocationEntry> = [];
  if (Array.isArray(wordItem.collocations) && wordItem.collocations.length > 0) {
    rawCollocations.push(...wordItem.collocations);
  } else if (preset?.collocations && preset.collocations.length > 0) {
    rawCollocations.push(...preset.collocations);
  } else if (curated?.collocations && curated.collocations.length > 0) {
    rawCollocations.push(...curated.collocations);
  }

  const seenColloc = new Set<string>();
  const normalizedCollocations: CollocationEntry[] = [];
  for (const c of rawCollocations) {
    const norm = normalizeCollocation(c);
    const key = norm.phrase.toLowerCase();
    if (key && !seenColloc.has(key)) {
      seenColloc.add(key);
      normalizedCollocations.push(norm);
    }
  }

  // 3. 单词变形处理
  const rawForms: Array<string | WordFormEntry> = [];
  if (Array.isArray(wordItem.forms) && wordItem.forms.length > 0) {
    rawForms.push(...wordItem.forms);
  } else if (preset?.forms && preset.forms.length > 0) {
    rawForms.push(...preset.forms);
  }

  const seenForms = new Set<string>();
  const normalizedForms: WordFormEntry[] = [];
  for (const f of rawForms) {
    const norm = normalizeWordForm(f);
    const key = `${norm.word}_${norm.pos || ''}`.toLowerCase();
    if (norm.word && !seenForms.has(key)) {
      seenForms.add(key);
      normalizedForms.push(norm);
    }
  }

  // 4. 词根词缀构词解析
  let rootsExplanation: string | undefined;
  if (wordItem.roots) {
    if (typeof wordItem.roots === 'string') {
      rootsExplanation = wordItem.roots;
    } else {
      const r = wordItem.roots as WordRootsInfo;
      rootsExplanation = r.rawText || r.chainMeaning;
    }
  } else if (preset?.roots) {
    rootsExplanation = preset.roots;
  }

  // 5. 音节/词根拆解 (前缀橙、词根深绿、后缀灰)
  const morphology: WordMorphologySegments =
    preset?.morphology || deriveWordMorphology(wordItem.word);

  return {
    synonyms: normalizedSynonyms,
    collocations: normalizedCollocations,
    forms: normalizedForms,
    rootsExplanation,
    morphology,
  };
}
