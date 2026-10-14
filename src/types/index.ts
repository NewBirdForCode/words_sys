/**
 * Core type definitions for 每日30词自主批改与错题循环系统
 */

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type VerificationStatus = 'curated_verified' | 'ai_pending_verification' | 'user_confirmed';

export type EnrichmentSource =
  | 'manual'
  | 'curated_verified'
  | 'ai_pending_verification'
  | 'dictionary_api'
  | 'synthesized_context';

export type EnrichmentErrorCode =
  | 'NETWORK_TIMEOUT'
  | 'DICT_404_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'AI_GENERATION_FAILED'
  | 'NO_API_KEY'
  | 'VALIDATION_FAILED';

export interface ScenarioExample {
  type: 'daily' | 'dialogue' | 'work_study';
  label: string; // '日常生活' | '真实交流' | '工作学习'
  exampleEn: string;
  exampleCn: string;
  collocation?: string;
  contextMeaning?: string;
  scene?: string;
  tip?: string;
  difficultyLevel?: DifficultyLevel;
  targetWord?: string;
  partOfSpeech?: string;
  targetMeaning?: string;
  verificationStatus?: VerificationStatus;
}

// 原始 Free Dictionary API 响应条目结构 (独立存储于 dictionary_raw)
export interface DictionaryRawEntry {
  word: string;
  phonetic?: string;
  phonetics?: Array<{
    text?: string;
    audio?: string;
    sourceUrl?: string;
  }>;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{
      definition?: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }>;
  }>;
}

export interface DictionaryRawRecord {
  word: string;
  rawEntries: DictionaryRawEntry[];
  audioUrl?: string | null;
  phonetic?: string | null;
  fetchedAt: number;
  httpStatus: number;
  error?: string | null;
}

export type LearningMode = 'fast_review' | 'focused_quiz';

export interface UserProfile {
  id: string;
  name: string;
  className: string;
  school: string;
  createdAt: number;
  role?: 'student' | 'teacher' | 'admin';
}

export interface SynonymEntry {
  word: string;
  meaning?: string;
}

export interface CollocationEntry {
  phrase: string;
  meaning?: string;
}

export interface WordFormEntry {
  word: string;
  pos?: string; // e.g. 'v.', 'n.', 'adj.', 'adv.'
  meaning?: string;
}

export interface WordRootsInfo {
  prefix?: string;
  prefixMeaning?: string;
  root: string;
  rootMeaning?: string;
  suffix?: string;
  suffixMeaning?: string;
  chainMeaning?: string;
  rawText?: string;
}

export interface WordItem {
  id: string;
  word_id?: string; // 唯一单词 ID
  book_id?: string; // 所属词书 ID
  word: string;
  phonetic?: string;
  meaning?: string; // Standard meaning field
  translation?: string; // Compatible alias
  chineseMeaning?: string; // Compatible alias
  partOfSpeech?: string;
  example?: string; // 课本原句 (精选模式)
  exampleEn?: string;
  exampleCn?: string;
  exampleSentence?: string;
  audioUrl?: string | null;
  dictAudioUrl?: string | null; // Free Dictionary API 原生有效音频
  source?: string; // 课本原句出处 (如 Oxford English for HKDSE)
  category?: string;
  wordbook_id?: string;
  
  // DSE 课本原句与同义词体系
  textbook_sentence?: string; // 核实后的课本原句
  sentence_source_type?: 'textbook' | 'generated'; // textbook 或 generated
  source_book?: string; // 来源书册 (如《Oxford English for HKDSE》)
  source_unit?: string; // 来源单元 (如 Book 4B Unit 2)
  source_page?: string | number | null; // 来源页码
  source_reference?: string; // 内部来源编号或出处记录
  synonyms?: Array<string | SynonymEntry>; // 经过核实的同义词数组 (支持词或词+释义)
  collocations?: Array<string | CollocationEntry>; // 常见搭配短语 (支持搭配或搭配+释义)
  forms?: Array<string | WordFormEntry>; // 单词变形 (带词性标注及可选释义)
  roots?: string | WordRootsInfo; // 词根词缀构词拆解 (前缀|含义|+词根|含义|+后缀|含义|→串联释义)
  synonym_source?: string; // 同义词来源或审核记录
  sentence_status?: 'verified' | 'generated' | 'missing'; // 原句状态
  content_version?: string; // 素材版本
  updated_at?: number; // 最后更新时间

  // 扩展生活场景备用
  scenarios?: ScenarioExample[];
  scenario?: string; // 场景标签 (如 运动、校园、生活、职场)
  imageUrl?: string; // 词库配图
  contextMeaning?: string;
  usageTip?: string;
  verificationStatus?: VerificationStatus;
  difficultyLevel?: DifficultyLevel;
}

export type WordbookCategory = 'DSE' | '雅思' | '四六级' | '校本' | '自编' | '其他' | '未分类';

export interface Wordbook {
  id: string;
  book_id?: string; // 词书 ID
  name: string;
  book_name?: string; // 词书名称
  description?: string;
  default_mode?: LearningMode; // 默认模式 (fast_review 或 focused_quiz)
  default_batch_size?: number; // 默认每批词量 (fast_review: 200, focused_quiz: 30)
  enabled_modes?: LearningMode[]; // 启用的模式列表
  words: WordItem[];
  created_at: number;
  updated_at: number;

  // 词库元数据字段 (系统分类与教材体系)
  category?: WordbookCategory; // 类别: DSE / 雅思 / 四六级 / 校本 / 自编 / 其他 / 未分类
  series?: string; // 教材系列 (例如: Oxford English for HKDSE, Longman Elect, 新东方核心词汇, 新概念英语)
  publisher?: string; // 出版社 (例如: 牛津大学出版社, 朗文, 培生, 剑桥)
  grade?: string; // 年级 (例如: P4, P5, P6, S1-S3, S4-S6, 大学)
  volume?: string; // 册别/分卷 (例如: Book 4A, Book 5B, 核心卷)
  tags?: string[]; // 题型或属性标签 (例如: 阅读, 听力, 写作, 口语, 核心, 进阶)
  is_system?: boolean; // 是否为官方预置系统词库
}

export type WordSelection = 'unanswered' | 'known' | 'wrong';

export type AppStage = 
  | 'stage1_shadowing'   // 【阶段一|快速跟读】
  | 'stage2_self_test'   // 【阶段二|自测批改】
  | 'stage3_spelling'    // 【阶段三|拼写默写】
  | 'stage4_mistake_loop' // 【阶段四|错误循环】
  | 'stage3_mistake_loop'; // 兼容旧数据别名

export interface MistakeItem {
  wordId: string;
  errorCount: number; // 历史累计错误次数 (持续追踪，不删除)
  consecutiveCorrect?: number; // 连续掌握次数 (连续答对后递增)
  lastWrongAt: number; // 最近一次答错时间戳
  lastReviewedAt?: number; // 最近一次复习时间戳
  resolvedAt?: number | null; // 当日攻克时间戳
  isResolvedInCurrentSession?: boolean; // 当日轮次是否已攻克
}

export type ReviewStage =
  | 'stage1_new_words' // 第一次抗遗忘：今日新词
  | 'stage2_mistake_review' // 错题专项循环复习
  | 'anti_forgetting_2' // 第二次抗遗忘：巩固复习
  | 'anti_forgetting_3' // 第三次抗遗忘：长效抗遗忘
  | 'stubborn_special'; // 顽固生词专项

// 每一条判断独立且不可覆盖的历史记录 (Requirement 6)
export interface ReviewLogRecord {
  id: string;
  user_id: string;
  word_id: string;
  wordbook_id?: string;
  session_id: string;
  round_id: number; // 1, 2, 3...
  review_stage: ReviewStage;
  result: 'known' | 'wrong'; // known: 用户选择掌握, wrong: 用户选择不会
  timestamp: number; // 毫秒时间戳
  learning_date: string; // YYYY-MM-DD
}

// 单词聚合统计模型
export interface WordStats {
  word_id: string;
  total_reviews: number;
  total_wrongs: number;
  total_knowns: number;
  consecutive_wrongs: number;
  last_result: 'known' | 'wrong' | null;
  first_mastered_at: number | null;
  last_reviewed_at: number | null;
  is_stubborn: boolean;
  mastery_rate: number;
}

// 当前学习 Session 状态
export interface ActiveSessionState {
  learning_date: string;
  session_id: string;
  wordbook_id: string;
  review_stage: ReviewStage;
  round_id: number;
  all_words_in_session: string[];
  active_round_word_ids: string[];
  current_selections: Record<string, WordSelection>;
  accumulated_wrong_word_ids: string[];
  accumulated_known_word_ids: string[];
  is_in_mistake_review: boolean;
  is_paused: boolean;
  paused_at?: number;
  completed_at?: number;
}
