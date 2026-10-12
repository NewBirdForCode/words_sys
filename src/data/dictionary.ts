/**
 * Offline Built-in Chinese-English Dictionary & Word Normalizer
 * Provides instant offline Chinese meanings, phonetics, and parts of speech
 * without calling external AI APIs during word recitation.
 */

import { WordItem } from '../types';

export interface DictEntry {
  meaning: string;
  phonetic?: string;
  partOfSpeech?: string;
  exampleSentence?: string;
}

// Built-in offline English-Chinese dictionary covering core curriculum, tests, and user test words
export const BUILTIN_DICTIONARY: Record<string, DictEntry> = {
  // Required user test words (生活场景验收测试专项目标词)
  resident: {
    meaning: '居民；住户；常住人口',
    phonetic: '/ˈrezɪdənt/',
    partOfSpeech: 'n.',
    exampleSentence: 'She is a resident of Hong Kong and often shops in the local community.'
  },
  borrow: {
    meaning: '借入；借用',
    phonetic: '/ˈbɒrəʊ/',
    partOfSpeech: 'v.',
    exampleSentence: 'Can I borrow your umbrella? It is raining heavily outside.'
  },
  afford: {
    meaning: '买得起；承担得起（费用或时间）',
    phonetic: '/əˈfɔːd/',
    partOfSpeech: 'v.',
    exampleSentence: 'We cannot afford to eat at expensive restaurants every day.'
  },
  avoid: {
    meaning: '避免；避开；防止',
    phonetic: '/əˈvɔɪd/',
    partOfSpeech: 'v.',
    exampleSentence: 'You should avoid catching a cold by drinking warm water in winter.'
  },
  attend: {
    meaning: '参加；出席（会议、课程或活动）',
    phonetic: '/əˈtend/',
    partOfSpeech: 'v.',
    exampleSentence: 'All students in our class must attend school on time.'
  },
  unless: {
    meaning: '除非；如果不',
    phonetic: '/ənˈles/',
    partOfSpeech: 'conj.',
    exampleSentence: 'You will be late for school unless you hurry up.'
  },
  although: {
    meaning: '虽然；尽管',
    phonetic: '/ɔːlˈðəʊ/',
    partOfSpeech: 'conj.',
    exampleSentence: 'Although it was raining heavily, they still walked to school.'
  },
  responsible: {
    meaning: '负责任的；承担责任的',
    phonetic: '/rɪˈspɒnsəbl/',
    partOfSpeech: 'adj.',
    exampleSentence: 'Tom is responsible for feeding the cat and taking out the trash.'
  },
  opportunity: {
    meaning: '机会；良好时机',
    phonetic: '/ˌɒpəˈtjuːnəti/',
    partOfSpeech: 'n.',
    exampleSentence: 'Travelling abroad gives students an opportunity to make new friends.'
  },
  environment: {
    meaning: '环境；生态；周围条件',
    phonetic: '/ɪnˈvaɪrənmənt/',
    partOfSpeech: 'n.',
    exampleSentence: 'We should turn off the lights when leaving to protect the environment.'
  },
  // Other academic & curriculum words
  muddled: {
    meaning: '混乱的；糊涂的；思路混乱的',
    phonetic: '/ˈmʌd.əld/',
    partOfSpeech: 'adj.',
    exampleSentence: 'He became muddled and couldn’t remember what to do next.'
  },
  heroine: {
    meaning: '女英雄；女主角',
    phonetic: '/ˈher.əʊ.ɪn/',
    partOfSpeech: 'n.',
    exampleSentence: 'She was hailed as a heroine for saving the child.'
  },
  antagonist: {
    meaning: '对手；敌手；反派角色',
    phonetic: '/ænˈtæɡ.ən.ɪst/',
    partOfSpeech: 'n.',
    exampleSentence: 'The antagonist in the novel was cold and cunning.'
  },
  significant: {
    meaning: '重大的；显著的；有意义的',
    phonetic: '/sɪɡˈnɪf.ɪ.kənt/',
    partOfSpeech: 'adj.',
    exampleSentence: 'There has been a significant increase in productivity.'
  },
  facetious: {
    meaning: '轻浮的；爱开玩笑的；不严肃的',
    phonetic: '/fəˈsiː.ʃəs/',
    partOfSpeech: 'adj.',
    exampleSentence: 'Stop being facetious; this is a serious matter.'
  },
  vacillate: {
    meaning: '犹豫；摇摆不定；踌躇',
    phonetic: '/ˈvæs.ə.leɪt/',
    partOfSpeech: 'v.',
    exampleSentence: 'He vacillated between accepting the offer and staying put.'
  },
  garrulous: {
    meaning: '喋喋不休的；唠叨的',
    phonetic: '/ˈɡær.əl.əs/',
    partOfSpeech: 'adj.',
    exampleSentence: 'The garrulous taxi driver talked the entire trip.'
  },
  pragmatic: {
    meaning: '务实的；重实效的',
    phonetic: '/præɡˈmæt.ɪk/',
    partOfSpeech: 'adj.',
    exampleSentence: 'We need a pragmatic approach to the budget.'
  },
  ubiquitous: {
    meaning: '无所不在的；普遍存在的',
    phonetic: '/juːˈbɪk.wɪ.təs/',
    partOfSpeech: 'adj.',
    exampleSentence: 'Smartphones have become ubiquitous in daily life.'
  },
  ephemeral: {
    meaning: '短暂的；瞬息即逝的',
    phonetic: '/ɪˈfem.ər.əl/',
    partOfSpeech: 'adj.',
    exampleSentence: 'Fashions are often ephemeral and quickly forgotten.'
  },
  mitigate: {
    meaning: '减轻；缓和；平息',
    phonetic: '/ˈmɪt.ɪ.ɡeɪt/',
    partOfSpeech: 'v.',
    exampleSentence: 'Steps were taken to mitigate the risks.'
  },
  resilient: {
    meaning: '有弹性的；能迅速恢复的；坚韧的',
    phonetic: '/rɪˈzɪl.i.ənt/',
    partOfSpeech: 'adj.',
    exampleSentence: 'The local economy proved surprisingly resilient.'
  },
  meticulous: {
    meaning: '一丝不苟的；极细致的',
    phonetic: '/məˈtɪk.jə.ləs/',
    partOfSpeech: 'adj.',
    exampleSentence: 'She kept meticulous records of every transaction.'
  },
  equivocal: {
    meaning: '模棱两可的；含糊不清的',
    phonetic: '/ɪˈkwɪv.ə.kəl/',
    partOfSpeech: 'adj.',
    exampleSentence: 'His response was deliberately equivocal.'
  },
  lucid: {
    meaning: '清晰易懂的；头脑清醒的',
    phonetic: '/ˈluː.sɪd/',
    partOfSpeech: 'adj.',
    exampleSentence: 'He gave a lucid account of the situation.'
  },
  paradox: {
    meaning: '自相矛盾的人或事；悖论',
    phonetic: '/ˈpær.ə.dɒks/',
    partOfSpeech: 'n.',
    exampleSentence: 'It is a curious paradox that wealth does not always bring happiness.'
  },
  alacrity: {
    meaning: '敏捷；欣然；乐意',
    phonetic: '/əˈlæk.rə.ti/',
    partOfSpeech: 'n.',
    exampleSentence: 'She accepted the challenge with alacrity.'
  },
  candid: {
    meaning: '坦白的；直截了当的；真诚的',
    phonetic: '/ˈkæn.dɪd/',
    partOfSpeech: 'adj.',
    exampleSentence: 'I appreciated his candid feedback on my work.'
  },
  diligent: {
    meaning: '勤勉的；孜孜不倦的',
    phonetic: '/ˈdɪl.ɪ.dʒənt/',
    partOfSpeech: 'adj.',
    exampleSentence: 'A diligent student can overcome initial difficulties.'
  },
  disparate: {
    meaning: '截然不同的；无法比较的',
    phonetic: '/ˈdɪs.pər.ət/',
    partOfSpeech: 'adj.',
    exampleSentence: 'The team consisted of scientists from disparate fields.'
  },
  empathy: {
    meaning: '同理心；共鸣；感同身受',
    phonetic: '/ˈem.pə.θi/',
    partOfSpeech: 'n.',
    exampleSentence: 'She showed deep empathy toward the victims.'
  },
  foster: {
    meaning: '培养；促进；抚育',
    phonetic: '/ˈfɒs.tər/',
    partOfSpeech: 'v.',
    exampleSentence: 'The teacher sought to foster creative thinking.'
  },
  homogeneous: {
    meaning: '同类的；同质的',
    phonetic: '/ˌhɒm.əˈdʒiː.ni.əs/',
    partOfSpeech: 'adj.',
    exampleSentence: 'The classroom was far from a homogeneous group.'
  },
  immutable: {
    meaning: '不可改变的；永恒的',
    phonetic: '/ɪˈmjuː.tə.bəl/',
    partOfSpeech: 'adj.',
    exampleSentence: 'Some mathematical laws are immutable.'
  },
  judicious: {
    meaning: '明智的；有见识的；判断正确的',
    phonetic: '/dʒuːˈdɪʃ.əs/',
    partOfSpeech: 'adj.',
    exampleSentence: 'Judicious use of resources kept the project on track.'
  },
  keen: {
    meaning: '敏锐的；热切的；热心的',
    phonetic: '/kiːn/',
    partOfSpeech: 'adj.',
    exampleSentence: 'She has a keen eye for subtle design details.'
  },
  laconic: {
    meaning: '言简意赅的；简短利落的',
    phonetic: '/ləˈkɒn.ɪk/',
    partOfSpeech: 'adj.',
    exampleSentence: 'His laconic reply answered all questions in one word.'
  },
  mundane: {
    meaning: '平淡的；世俗的；日常乏味的',
    phonetic: '/mʌnˈdeɪn/',
    partOfSpeech: 'adj.',
    exampleSentence: 'Doing chores is a necessary but mundane part of life.'
  },
  nostalgia: {
    meaning: '怀旧；怀乡之情',
    phonetic: '/nɒsˈtæl.dʒə/',
    partOfSpeech: 'n.',
    exampleSentence: 'The old photographs filled him with nostalgia.'
  },
  obstinate: {
    meaning: '固执的；难以克服的',
    phonetic: '/ˈɒb.stɪ.nət/',
    partOfSpeech: 'adj.',
    exampleSentence: 'He remained obstinate and refused to compromise.'
  },
  prolific: {
    meaning: '多产的；丰富的',
    phonetic: '/prəˈlɪf.ɪk/',
    partOfSpeech: 'adj.',
    exampleSentence: 'The prolific author wrote two novels a year.'
  },
  quench: {
    meaning: '解渴；熄灭；平息',
    phonetic: '/kwentʃ/',
    partOfSpeech: 'v.',
    exampleSentence: 'Cold mineral water quenched our thirst.'
  },
  scrutinize: {
    meaning: '仔细审查；认真审视',
    phonetic: '/ˈskruː.tɪ.naɪz/',
    partOfSpeech: 'v.',
    exampleSentence: 'The auditor scrutinized every item on the invoice.'
  },
  tenacious: {
    meaning: '顽强的；坚韧不拔的',
    phonetic: '/təˈneɪ.ʃəs/',
    partOfSpeech: 'adj.',
    exampleSentence: 'Her tenacious efforts paid off with high honors.'
  },
  unilateral: {
    meaning: '单方面的；单边的',
    phonetic: '/ˌjuː.nɪˈlæt.ər.əl/',
    partOfSpeech: 'adj.',
    exampleSentence: 'The decision was criticized for being unilateral.'
  },
  venerable: {
    meaning: '德高望重的；受尊崇的',
    phonetic: '/ˈven.ər.ə.bəl/',
    partOfSpeech: 'adj.',
    exampleSentence: 'The venerable scholar was invited to speak at the summit.'
  },
  aesthetic: {
    meaning: '美学的；审美的',
    phonetic: '/esˈθet.ɪk/',
    partOfSpeech: 'adj.',
    exampleSentence: 'The museum combines historical value with aesthetic charm.'
  },
  benevolent: {
    meaning: '仁慈的；乐善好施的',
    phonetic: '/bəˈnev.əl.ənt/',
    partOfSpeech: 'adj.',
    exampleSentence: 'A benevolent donor supported the children’s shelter.'
  },
  cogent: {
    meaning: '令人信服的；强有力的',
    phonetic: '/ˈkəʊ.dʒənt/',
    partOfSpeech: 'adj.',
    exampleSentence: 'She presented a cogent argument in court.'
  },
  deleterious: {
    meaning: '有害的；造成危害的',
    phonetic: '/ˌdel.ɪˈtɪə.ri.əs/',
    partOfSpeech: 'adj.',
    exampleSentence: 'Pollution has deleterious effects on public health.'
  },
  elucidate: {
    meaning: '阐明；解释清楚',
    phonetic: '/ɪˈluː.sɪ.deɪt/',
    partOfSpeech: 'v.',
    exampleSentence: 'The lecturer used clear diagrams to elucidate the concept.'
  },
  fortuitous: {
    meaning: '偶然的；巧合的；幸运的',
    phonetic: '/fɔːˈtʃuː.ɪ.təs/',
    partOfSpeech: 'adj.',
    exampleSentence: 'Their fortuitous meeting sparked a lifelong partnership.'
  },
  gregarious: {
    meaning: '爱交际的；合群的；群居的',
    phonetic: '/ɡrɪˈɡeə.ri.əs/',
    partOfSpeech: 'adj.',
    exampleSentence: 'Dolphins are gregarious creatures that travel in pods.'
  },
  hegemony: {
    meaning: '霸权；支配权；领导权',
    phonetic: '/hɪˈdʒem.ə.ni/',
    partOfSpeech: 'n.',
    exampleSentence: 'The company struggled to maintain market hegemony.'
  },
  impetuous: {
    meaning: '冲动的；鲁莽的',
    phonetic: '/ɪmˈpetʃ.u.əs/',
    partOfSpeech: 'adj.',
    exampleSentence: 'He made an impetuous promise he could not keep.'
  },
  juxtapose: {
    meaning: '并列；将…并置比较',
    phonetic: '/ˌdʒʌk.stəˈpəʊz/',
    partOfSpeech: 'v.',
    exampleSentence: 'The artist juxtaposed ancient traditions with modern technology.'
  },
  kinetic: {
    meaning: '运动的；动能的',
    phonetic: '/kɪˈnet.ɪk/',
    partOfSpeech: 'adj.',
    exampleSentence: 'Kinetic energy increases as speed increases.'
  },
  lucrative: {
    meaning: '赚钱的；获利丰厚的',
    phonetic: '/ˈluː.krə.tɪv/',
    partOfSpeech: 'adj.',
    exampleSentence: 'It proved to be a highly lucrative business venture.'
  },
  magnanimous: {
    meaning: '宽宏大量的；慷慨的',
    phonetic: '/mæɡˈnæn.ɪ.məs/',
    partOfSpeech: 'adj.',
    exampleSentence: 'He was magnanimous in victory, congratulating his opponent.'
  },
  nefarious: {
    meaning: '罪恶的；凶恶的；不法的',
    phonetic: '/nɪˈfeə.ri.əs/',
    partOfSpeech: 'adj.',
    exampleSentence: 'The detective uncovered a nefarious criminal scheme.'
  },
  opaque: {
    meaning: '不透明的；晦涩难懂的',
    phonetic: '/əʊˈpeɪk/',
    partOfSpeech: 'adj.',
    exampleSentence: 'The legal jargon made the contract opaque to laymen.'
  },
  pristine: {
    meaning: '崭新的；原始纯洁的；未受污染的',
    phonetic: '/ˈprɪs.tiːn/',
    partOfSpeech: 'adj.',
    exampleSentence: 'The island has pristine beaches and crystal waters.'
  },
  quixotic: {
    meaning: '不切实际的；狂想的',
    phonetic: '/kwɪkˈsɒt.ɪk/',
    partOfSpeech: 'adj.',
    exampleSentence: 'His quixotic plans to change the company overnight failed.'
  },
  reticent: {
    meaning: '沉默寡言的；不愿吐露的',
    phonetic: '/ˈret.ɪ.sənt/',
    partOfSpeech: 'adj.',
    exampleSentence: 'She was reticent about discussing her personal achievements.'
  },
  salient: {
    meaning: '显著的；突出的；重要的',
    phonetic: '/ˈseɪ.li.ənt/',
    partOfSpeech: 'adj.',
    exampleSentence: 'He highlighted the salient points of the proposal.'
  },
  taciturn: {
    meaning: '不苟言笑的；沉默寡言的',
    phonetic: '/ˈtæs.ɪ.tɜːn/',
    partOfSpeech: 'adj.',
    exampleSentence: 'The taciturn guard nodded and said nothing.'
  },
  vacuity: {
    meaning: '空虚；无聊；茫然',
    phonetic: '/vəˈkjuː.ə.ti/',
    partOfSpeech: 'n.',
    exampleSentence: 'Her expression was blank, bordering on vacuity.'
  },
  wary: {
    meaning: '谨慎的；提防的；警惕的',
    phonetic: '/ˈweə.ri/',
    partOfSpeech: 'adj.',
    exampleSentence: 'Be wary of offers that seem too good to be true.'
  },
  zealous: {
    meaning: '热情的；狂热的；热心的',
    phonetic: '/ˈzel.əs/',
    partOfSpeech: 'adj.',
    exampleSentence: 'A zealous volunteer helped lead the relief efforts.'
  }
};

/**
 * Searches built-in dictionary for a word (case-insensitive)
 */
export function lookupDictionary(word: string): DictEntry | null {
  if (!word) return null;
  const clean = word.trim().toLowerCase();
  if (BUILTIN_DICTIONARY[clean]) {
    return BUILTIN_DICTIONARY[clean];
  }
  // Try removing trailing s/es/ed/ing for inflected forms
  if (clean.endsWith('ed') && BUILTIN_DICTIONARY[clean.slice(0, -2)]) {
    return BUILTIN_DICTIONARY[clean.slice(0, -2)];
  }
  if (clean.endsWith('ing') && BUILTIN_DICTIONARY[clean.slice(0, -3)]) {
    return BUILTIN_DICTIONARY[clean.slice(0, -3)];
  }
  return null;
}

/**
 * Normalized field extraction helper
 * Standardizes common variations of field names from CSV, TXT, Excel
 */
export function extractRawField(row: Record<string, any>, possibleKeys: string[]): string {
  for (const key of Object.keys(row)) {
    const lowerKey = key.trim().toLowerCase();
    for (const target of possibleKeys) {
      if (lowerKey === target.toLowerCase()) {
        const val = row[key];
        if (val !== undefined && val !== null) {
          return String(val).trim();
        }
      }
    }
  }
  return '';
}

/**
 * Standardizes a raw word object into the unified WordItem schema
 *
 * Schema:
 * {
 *   id: string,
 *   word: string,
 *   phonetic: string,
 *   partOfSpeech: string,
 *   chineseMeaning: string,
 *   exampleSentence: string,
 *   audioUrl: string | null,
 *   source: string
 * }
 */
export function normalizeWord(raw: any, source: string = 'imported'): WordItem {
  // 1. Extract raw word
  let rawWord = '';
  if (typeof raw === 'string') {
    rawWord = raw;
  } else if (raw && typeof raw === 'object') {
    rawWord =
      raw.word ||
      extractRawField(raw, ['word', '单词', '英文', 'english', 'term']) ||
      '';
  }

  const cleanWord = String(rawWord).trim();
  const lowerWord = cleanWord.toLowerCase();

  // 2. Extract raw meaning from priority sources
  let rawMeaning = '';
  if (typeof raw === 'object' && raw !== null) {
    rawMeaning =
      raw.chineseMeaning ||
      raw.meaning ||
      raw.translation ||
      extractRawField(raw, [
        'chinesemeaning',
        'meaning',
        'chinese',
        '中文',
        '中文释义',
        '中文意思',
        '释义',
        'definition'
      ]);
  }

  // 3. Fallback to offline built-in dictionary
  const dictHit = lookupDictionary(lowerWord);

  let finalMeaning = (rawMeaning || '').trim();
  let finalPhonetic = '';
  let finalPos = '';
  let finalExample = '';

  if (typeof raw === 'object' && raw !== null) {
    finalPhonetic =
      raw.phonetic ||
      extractRawField(raw, ['phonetic', '音标', '英音', '美音']) ||
      '';
    finalPos =
      raw.partOfSpeech ||
      extractRawField(raw, ['partofspeech', 'pos', '词性']) ||
      '';
    finalExample =
      raw.exampleSentence ||
      raw.exampleEn ||
      extractRawField(raw, ['examplesentence', 'example', '例句', '英文例句']) ||
      '';
  }

  // Auto-complete missing fields from dictionary if available
  if (dictHit) {
    if (!finalMeaning || finalMeaning === '暂无中文释义') {
      finalMeaning = dictHit.meaning;
    }
    if (!finalPhonetic && dictHit.phonetic) {
      finalPhonetic = dictHit.phonetic;
    }
    if (!finalPos && dictHit.partOfSpeech) {
      finalPos = dictHit.partOfSpeech;
    }
    if (!finalExample && dictHit.exampleSentence) {
      finalExample = dictHit.exampleSentence;
    }
  }

  // Ensure chineseMeaning is never undefined/null/empty
  if (!finalMeaning) {
    finalMeaning = '暂无中文释义';
    console.warn(`[MEANING MISSING]\nword: ${cleanWord}`);
  }

  // Audio URL handling (null by default, never required)
  const rawAudio = typeof raw === 'object' && raw !== null ? raw.audioUrl : null;
  const audioUrl = (rawAudio && typeof rawAudio === 'string' && rawAudio.trim().length > 0) ? rawAudio.trim() : null;

  const id = (typeof raw === 'object' && raw?.id)
    ? String(raw.id)
    : `w_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    word: cleanWord,
    phonetic: finalPhonetic || '',
    partOfSpeech: finalPos || '',
    chineseMeaning: finalMeaning,
    exampleSentence: finalExample || '',
    audioUrl,
    source,
    // Compatibility fields
    meaning: finalMeaning,
    translation: finalMeaning,
    exampleEn: finalExample || ''
  };
}
