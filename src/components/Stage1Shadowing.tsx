import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Volume2,
  Check,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  X,
  Play,
  Pause,
  Sparkles,
  Flame,
  HelpCircle
} from 'lucide-react';
import { WordItem, LearningMode, SynonymEntry, CollocationEntry, WordFormEntry } from '../types';
import { ThemeConfig } from '../types/theme';
import { speakWord, stopAllSpeech } from '../utils/speech';
import { recordMistake, removeMistake } from '../utils/storage';
import { updateWordLearningResult } from '../utils/plan';
import { BUILTIN_DICTIONARY } from '../data/dictionary';
import { resolveDseContent } from '../utils/dseContent';
import { resolveWordAnalysis } from '../data/wordAnalysisBank';
import { fetchWordImage, getFallbackScene } from '../utils/wordImage';
import { generateDistractors, DistractorOption } from '../utils/distractorGenerator';
import { userScopedStorageKey } from '../utils/userStorage';

interface Stage1ShadowingProps {
  words: WordItem[];
  allWordsMap?: Record<string, WordItem>;
  activeWordbookId?: string;
  learningMode?: LearningMode; // 'fast_review' | 'focused_quiz'
  onModeChange?: (mode: LearningMode) => void;
  onFinishStage1: () => void;
  onBack?: () => void;
  onProceedToStage4?: () => void;
  onSpeechError?: (msg: string) => void;
  onOpenPunchIn?: (photoUrl?: string) => void;
  currentTheme?: ThemeConfig;
}

const FAST_REVIEW_DURATION_MS = 6000; // 快速模式6秒过词

/**
 * 【阶段一 · 精选刷词（今日 30 词）→ 重构为「左图右词 + 中文四选一」】
 * - 左栏：配图区 (250×250px)，优先词库图，无图时展示语义场景卡 + 场景标签
 * - 右栏：单词 (38px 衬线加粗) + 🔊 + 音标词性 + 例句高亮目标词变形 + 释义与标签
 * - 选项：2×2 高质量中文干扰项，点击立即判定
 * - 答对：0.6s 自动进入下一词，连击 +1
 * - 答错：抖动标红，展开四段式解析卡 (同义词/词组搭配/单词变形/错词循环提醒)，点击继续切词
 * - 快速 200 模式完全保留
 */
export const Stage1Shadowing: React.FC<Stage1ShadowingProps> = ({
  words,
  allWordsMap = {},
  activeWordbookId,
  learningMode = 'focused_quiz',
  onModeChange,
  onFinishStage1,
  onBack,
  onProceedToStage4,
  onSpeechError,
}) => {
  const isFastReview = learningMode === 'fast_review';

  // 记录两种模式的进度索引
  const [focusedIndex, setFocusedIndex] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const key = userScopedStorageKey(`daily30_stage1_focused_idx_${activeWordbookId || 'default'}`);
    const saved = localStorage.getItem(key);
    return saved ? Math.max(0, parseInt(saved, 10) || 0) : 0;
  });

  const [fastIndex, setFastIndex] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const key = userScopedStorageKey(`daily30_stage1_fast_idx_${activeWordbookId || 'default'}`);
    const saved = localStorage.getItem(key);
    return saved ? Math.max(0, parseInt(saved, 10) || 0) : 0;
  });

  const currentIndex = useMemo(() => {
    if (words.length === 0) return 0;
    const target = isFastReview ? fastIndex : focusedIndex;
    return Math.min(Math.max(0, target), words.length - 1);
  }, [isFastReview, fastIndex, focusedIndex, words.length]);

  const currentWord = words[currentIndex];

  // 模式 A 答题状态
  const [options, setOptions] = useState<DistractorOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isWrongPick, setIsWrongPick] = useState<boolean>(false);
  const [consecutiveStreak, setConsecutiveStreak] = useState<number>(0);
  const [wordConsecutiveCorrect, setWordConsecutiveCorrect] = useState<Record<string, number>>({});

  // 图片加载状态
  const [fetchedImageUrl, setFetchedImageUrl] = useState<string | null>(null);

  // 模式 B 6 秒节奏状态
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // 整体完成状态
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onSpeechErrorRef = useRef(onSpeechError);
  useEffect(() => {
    onSpeechErrorRef.current = onSpeechError;
  }, [onSpeechError]);

  // 同步本地存储进度
  useEffect(() => {
    if (typeof window === 'undefined' || words.length === 0) return;
    if (isFastReview) {
      localStorage.setItem(userScopedStorageKey(`daily30_stage1_fast_idx_${activeWordbookId || 'default'}`), String(currentIndex));
    } else {
      localStorage.setItem(userScopedStorageKey(`daily30_stage1_focused_idx_${activeWordbookId || 'default'}`), String(currentIndex));
    }
  }, [currentIndex, isFastReview, activeWordbookId, words.length]);

  // 播放发音
  const playWord = useCallback((wordStr: string) => {
    speakWord(wordStr, {
      audioUrl: currentWord?.dictAudioUrl || currentWord?.audioUrl || undefined,
      onError: msg => onSpeechErrorRef.current?.(msg),
    });
  }, [currentWord]);

  // 获取课本原句与解析数据
  const targetMeaning = useMemo(() => {
    if (!currentWord) return '';
    return (
      currentWord.meaning ||
      currentWord.translation ||
      BUILTIN_DICTIONARY[currentWord.word.toLowerCase()]?.meaning ||
      '暂无中文释义'
    );
  }, [currentWord]);

  const resolvedDse = useMemo(() => {
    if (!currentWord) return { sentence: '', sourceBook: '', sourceUnit: '', sourceText: '' };
    return resolveDseContent(currentWord);
  }, [currentWord]);

  const phonetic = useMemo(() => {
    if (!currentWord) return '';
    return currentWord.phonetic || BUILTIN_DICTIONARY[currentWord.word.toLowerCase()]?.phonetic || '';
  }, [currentWord]);

  const analysis = useMemo(() => {
    if (!currentWord) return { synonyms: [], collocations: [], forms: [] };
    return resolveWordAnalysis(currentWord);
  }, [currentWord]);

  // 场景与词性标签
  const partOfSpeechDisplay = useMemo(() => {
    if (!currentWord) return 'n.';
    const raw = currentWord.partOfSpeech || BUILTIN_DICTIONARY[currentWord.word.toLowerCase()]?.partOfSpeech || 'n.';
    return raw.trim();
  }, [currentWord]);

  const scenarioTag = useMemo(() => {
    if (!currentWord) return '核心词汇';
    if (currentWord.scenario) return currentWord.scenario;
    if (currentWord.category) return currentWord.category;
    const fallback = getFallbackScene(currentWord.word, targetMeaning);
    return fallback.bgDesc || '常用表达';
  }, [currentWord, targetMeaning]);

  // 切词时重置状态、生成选项并异步拉取图片
  useEffect(() => {
    if (!currentWord) return;

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    setSelectedOptionId(null);
    setIsAnswered(false);
    setIsWrongPick(false);
    setElapsedMs(0);

    // 生成高质量 4 选 1 选项
    const newOptions = generateDistractors(currentWord, targetMeaning, words, allWordsMap);
    setOptions(newOptions);

    // 配图解析
    if (currentWord.imageUrl) {
      setFetchedImageUrl(currentWord.imageUrl);
    } else {
      setFetchedImageUrl(null);
      fetchWordImage(currentWord.word).then(img => {
        if (img) setFetchedImageUrl(img);
      });
    }
  }, [currentIndex, currentWord?.id, words, allWordsMap, targetMeaning]);

  // 模式 B (快速 200 词) 固定 6 秒节奏：切词后 2 秒发音，第 6 秒切换。
  useEffect(() => {
    if (!isFastReview || isPaused || isCompleted || !currentWord) return;

    const progressInterval = setInterval(() => {
      setElapsedMs(prev => {
        const next = prev + 100;
        return Math.min(next, FAST_REVIEW_DURATION_MS);
      });
    }, 100);

    const speechTimer = setTimeout(() => {
      // 发音固定发生在当前词展示 2 秒后，不等待网络音频结果，保证总周期不漂移。
      playWord(currentWord.word);
    }, 2000);

    const advanceTimer = setTimeout(() => {
      stopAllSpeech();
      if (currentIndex < words.length - 1) {
        setFastIndex(index => index + 1);
      } else {
        setIsCompleted(true);
      }
    }, FAST_REVIEW_DURATION_MS);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(speechTimer);
      clearTimeout(advanceTimer);
    };
  }, [isFastReview, isPaused, isCompleted, currentWord, currentIndex, words.length, playWord]);

  // 切到下一题
  const handleGoNext = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    if (currentIndex < words.length - 1) {
      if (isFastReview) {
        setFastIndex(prev => prev + 1);
      } else {
        setFocusedIndex(prev => prev + 1);
      }
    } else {
      setIsCompleted(true);
    }
  }, [currentIndex, words.length, isFastReview]);

  // 切到上一题
  const handleGoPrev = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    if (currentIndex > 0) {
      if (isFastReview) {
        setFastIndex(prev => prev - 1);
      } else {
        setFocusedIndex(prev => prev - 1);
      }
    }
  }, [currentIndex, isFastReview]);

  // 用户点击选项
  const handleSelectOption = useCallback((option: DistractorOption) => {
    if (isAnswered || !currentWord) return;

    setSelectedOptionId(option.id);
    setIsAnswered(true);

    if (option.isCorrect) {
      // 答对！
      setIsWrongPick(false);
      setConsecutiveStreak(s => s + 1);

      // 跟踪单词连续答对次数
      const currentWordCorrectCount = (wordConsecutiveCorrect[currentWord.id] || 0) + 1;
      setWordConsecutiveCorrect(prev => ({
        ...prev,
        [currentWord.id]: currentWordCorrectCount,
      }));

      // 连续答对 2 次标记为已掌握
      if (currentWordCorrectCount >= 2 && activeWordbookId) {
        updateWordLearningResult(activeWordbookId, currentWord.id, true);
        removeMistake(currentWord.id);
      }

      // 0.6 秒后自动进入下一词
      autoAdvanceTimerRef.current = setTimeout(() => {
        handleGoNext();
      }, 600);
    } else {
      // 答错！
      setIsWrongPick(true);
      setConsecutiveStreak(0);
      setWordConsecutiveCorrect(prev => ({
        ...prev,
        [currentWord.id]: 0,
      }));

      // 错词立即加入错误循环 (阶段四消消乐)
      recordMistake(currentWord.id);
      // 自动播放一遍正确发音
      playWord(currentWord.word);
    }
  }, [isAnswered, currentWord, wordConsecutiveCorrect, activeWordbookId, handleGoNext, playWord]);

  // 辅操作：「记住了」
  const handleAuxRemembered = useCallback(() => {
    if (!currentWord) return;
    removeMistake(currentWord.id);
    if (activeWordbookId) {
      updateWordLearningResult(activeWordbookId, currentWord.id, true);
    }
    handleGoNext();
  }, [currentWord, activeWordbookId, handleGoNext]);

  // 辅操作：「没记住」
  const handleAuxForgotten = useCallback(() => {
    if (!currentWord) return;
    recordMistake(currentWord.id);
    handleGoNext();
  }, [currentWord, handleGoNext]);

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (currentWord) playWord(currentWord.word);
      } else if (e.key === 'Enter') {
        if (isAnswered && isWrongPick) {
          e.preventDefault();
          handleGoNext();
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (!isAnswered) {
          handleAuxRemembered();
        } else if (isWrongPick) {
          handleGoNext();
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (!isAnswered) {
          handleAuxForgotten();
        }
      } else if (!isAnswered && ['1', '2', '3', '4'].includes(e.key)) {
        // 数字键快速选择选项
        const idx = parseInt(e.key, 10) - 1;
        if (options[idx]) {
          e.preventDefault();
          handleSelectOption(options[idx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentWord, playWord, isAnswered, isWrongPick, handleGoNext, handleAuxRemembered, handleAuxForgotten, options, handleSelectOption]);

  // 高亮例句中目标词及其变形形式（如 sprained、accommodating）
  const renderHighlightedSentence = (sentence: string, targetWord: string) => {
    if (!sentence) return null;
    if (!targetWord) return <span>{sentence}</span>;

    // 匹配词根或前缀变形 (以目标词为主干)
    const stem = targetWord.length > 4 ? targetWord.slice(0, targetWord.length - 1) : targetWord;
    const regex = new RegExp(`\\b(${stem}[a-zA-Z]*)\\b`, 'gi');
    const parts = sentence.split(regex);

    return (
      <span className="text-[#24343b] leading-relaxed">
        {parts.map((part, index) => {
          if (part.toLowerCase().startsWith(stem.toLowerCase())) {
            return (
              <span
                key={index}
                className="font-bold underline decoration-2 decoration-[#38d39f] underline-offset-4 text-[#168a62] bg-[#e8f8f1]/60 px-1 py-0.5 rounded-sm mx-0.5"
              >
                {part}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  };

  if (!currentWord || words.length === 0) {
    return (
      <div className="sunshine-card p-8 text-center text-[#60727B] my-auto max-w-md mx-auto">
        暂无可学习词汇，请返回词库选择或导入单词。
      </div>
    );
  }

  // 结算界面
  if (isCompleted) {
    return (
      <div className="sunshine-card p-8 sm:p-10 text-center max-w-lg mx-auto shadow-xs animate-fadeIn select-none my-auto">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 stroke-[3]" />
        </div>

        <h3 className="text-xl sm:text-2xl font-serif-en font-bold text-[#24343b] mb-2">
          {isFastReview ? '快速刷词已全部完成 ✓' : '今日精选 30 词已刷完 ✓'}
        </h3>

        <p className="text-xs sm:text-sm text-[#7B8F99] mb-6">
          已完成 {words.length} 词的看图刷词与四选一自测，记不住的词已自动归档进入错题循环。
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (isFastReview) setFastIndex(0);
              else setFocusedIndex(0);
              setIsCompleted(false);
            }}
            className="w-full sm:w-auto px-5 py-2.5 border border-[#CAD8DF] hover:bg-[#FAFDFB] text-[#60727B] font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>再刷一遍</span>
          </button>

          <button
            type="button"
            onClick={onFinishStage1}
            className="w-full sm:w-auto px-6 py-2.5 bg-acc-grad text-white font-bold rounded-xl text-xs sm:text-sm transition-opacity shadow-xs flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-95"
          >
            <span>进入【阶段二】自测批改</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const exampleEn = resolvedDse.sentence || currentWord.exampleEn || currentWord.exampleSentence || '';
  const exampleCn = currentWord.exampleCn || '';
  const fallbackScene = getFallbackScene(currentWord.word, targetMeaning);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col justify-between py-2 select-none animate-fadeIn">
      {/*
        ---------------- 【顶部一行：保持现状】 ----------------
        左：今日精选 30 / 快速 200 两个切换按钮
        中：进度 1 / 65
        右：← 没记住 / 记住了 → / 发音 快捷入口 (保留为辅操作)
      */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E6EEF1]/80 mb-5 px-1">
        {/* 左侧：模式切换胶囊 */}
        <div className="inline-flex bg-white/90 p-0.5 rounded-full border border-[#E6EEF1] shadow-2xs">
          <button
            type="button"
            onClick={() => onModeChange?.('focused_quiz')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              !isFastReview
                ? 'bg-acc-grad text-white shadow-2xs'
                : 'text-[#60727B] hover:text-[#24343b]'
            }`}
          >
            今日精选 30
          </button>
          <button
            type="button"
            onClick={() => onModeChange?.('fast_review')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              isFastReview
                ? 'bg-acc-grad text-white shadow-2xs'
                : 'text-[#60727B] hover:text-[#24343b]'
            }`}
          >
            快速 200
          </button>
        </div>

        {/* 中间：进度指示 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-[#24343b] bg-white border border-[#E6EEF1] px-2.5 py-0.5 rounded-full shadow-2xs">
            进度 {currentIndex + 1} / {words.length}
          </span>
          {consecutiveStreak >= 2 && !isFastReview && (
            <span className="text-xs text-amber-600 font-bold flex items-center gap-0.5 animate-scaleIn bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>连击 ×{consecutiveStreak}</span>
            </span>
          )}
        </div>

        {/* 右侧：快捷入口 (保留为辅操作) */}
        <div className="flex items-center gap-2 text-xs text-[#7B8F99]">
          <button
            type="button"
            onClick={handleAuxForgotten}
            title="快捷标记为没记住 (←)"
            className="hover:text-red-500 transition-colors cursor-pointer px-2 py-0.5 rounded-md hover:bg-red-50/60"
          >
            ← 没记住
          </button>
          <span className="text-[#CAD8DF]">·</span>
          <button
            type="button"
            onClick={handleAuxRemembered}
            title="快捷标记为已掌握 (→)"
            className="hover:text-emerald-600 transition-colors cursor-pointer px-2 py-0.5 rounded-md hover:bg-emerald-50/60"
          >
            记住了 →
          </button>
          <span className="text-[#CAD8DF]">·</span>
          <button
            type="button"
            onClick={() => playWord(currentWord.word)}
            title="播放发音 (空格键)"
            className="hover:text-emerald-600 transition-colors cursor-pointer p-1 rounded-full hover:bg-emerald-50/60"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/*
        ════════════════════════════════════════════════════════════════
        模式 A: 今日精选 30 词 (左图右词 + 中文四选一 + 错误解析卡)
        ════════════════════════════════════════════════════════════════
      */}
      {!isFastReview ? (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* 主体横版大卡片 (白底、圆角 20px、淡阴影，内部左右比例约 1 : 1.5) */}
          <div className="sunshine-card rounded-[20px] p-5 sm:p-7 flex flex-col md:flex-row items-stretch gap-6 shadow-[0_6px_20px_rgba(91,139,168,0.10)] bg-white border border-[#E6EEF1] relative">
            {/* 左栏 · 配图区 (约 250×250px，圆角 16px，占满左栏) */}
            <div className="w-full md:w-[250px] md:h-[250px] shrink-0 rounded-[16px] overflow-hidden relative border border-[#E6EEF1] bg-[#F7FAFA] flex items-center justify-center select-none shadow-2xs">
              {fetchedImageUrl ? (
                <img
                  src={fetchedImageUrl}
                  alt={currentWord.word}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  onError={() => setFetchedImageUrl(null)}
                />
              ) : (
                /* 无配图时：中性占位图 (浅渐变底 + 场景 Emoji / 意向)，不留空白 */
                <div
                  className={`w-full h-full bg-gradient-to-br ${fallbackScene.gradient} flex flex-col items-center justify-center p-4 text-center`}
                >
                  <span className="text-5xl sm:text-6xl mb-2 filter drop-shadow-xs animate-scaleIn">
                    {fallbackScene.emojis}
                  </span>
                  <span className="text-xs font-bold text-[#24343b]/80 tracking-wide font-sans">
                    {fallbackScene.bgDesc}
                  </span>
                </div>
              )}

              {/* 图片角标：场景标签 (浅色圆角胶囊) */}
              <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs text-[#24343b] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-black/5 shadow-2xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38d39f]" />
                <span>{scenarioTag}</span>
              </div>
            </div>

            {/* 右栏 · 单词信息区 (垂直排列) */}
            <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
              <div className="flex flex-col gap-2">
                {/* 1. 单词大字 (衬线体 Georgia/Palatino, 38px, 加粗, 深色 #24343b) + 圆形 🔊 发音按钮 */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-baseline gap-3">
                    <h1 className="font-serif-en text-3xl sm:text-[38px] font-bold text-[#24343b] tracking-tight leading-none select-text">
                      {currentWord.word}
                    </h1>
                    {/* 2. 音标 + 词性：如 /spreɪn/　v. 扭伤 */}
                    <span className="font-serif-en text-xs sm:text-[13px] text-[#768B94]">
                      {phonetic ? `/${phonetic}/` : ''} {partOfSpeechDisplay}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => playWord(currentWord.word)}
                    className="w-9 h-9 rounded-full bg-[#FAFDFB] border border-[#E6EEF1] hover:border-[#38d39f] flex items-center justify-center text-emerald-600 hover:text-emerald-700 transition-colors shadow-2xs cursor-pointer"
                    title="播放发音 (空格键)"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 3. 一条极浅分隔线 (#eef4f6) */}
                <div className="w-full h-[1px] bg-[#EEF4F6] my-1" />

                {/* 4. 英文例句 (14.5px, 目标词变形主色高亮加下划线) */}
                {exampleEn ? (
                  <div className="text-[14.5px] leading-relaxed select-text mt-0.5">
                    {renderHighlightedSentence(exampleEn, currentWord.word)}
                  </div>
                ) : (
                  <div className="text-[14px] text-[#768B94] italic">
                    {currentWord.word} is a key academic vocabulary word.
                  </div>
                )}

                {/* 5. 例句中文翻译 (12-13px 灰色) */}
                {exampleCn && (
                  <p className="text-xs sm:text-[13px] text-[#768B94] leading-normal mt-0.5 select-text">
                    {exampleCn}
                  </p>
                )}
              </div>

              {/* 6. 右下角两个小圆角标签：词性标签 (浅绿底) + 场景标签 (浅橙底) */}
              <div className="flex items-center gap-2 mt-4 pt-2 border-t border-[#EEF4F6]/60">
                <span className="text-[11px] font-medium text-emerald-800 bg-[#E8F8F1] px-2.5 py-0.5 rounded-full border border-emerald-200/50">
                  {partOfSpeechDisplay} 词性
                </span>
                <span className="text-[11px] font-medium text-amber-800 bg-[#FFF3E8] px-2.5 py-0.5 rounded-full border border-amber-200/60">
                  {scenarioTag}
                </span>
                {resolvedDse.sourceBook && (
                  <span className="text-[10px] text-[#96A8B0] font-mono truncate max-w-[220px] ml-auto">
                    出处: {resolvedDse.sourceBook}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/*
            ---------------- 四选一答题区 (2×2 网格) ----------------
            - 未选：白底、圆角 14px、1.5px 浅灰描边
            - 选对：浅绿底 #e8f8f1 + 绿描边 #38d39f + 绿字加粗 + 末尾 ✓
            - 选错：浅红底 #fdeeee + 红描边 #ff6b6b + 红字加粗 + 末尾 ✗，同时正确项自动标绿
            - 选错时错误项抖动动效
          */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full my-1">
            {options.map((opt, idx) => {
              const isSelected = selectedOptionId === opt.id;
              const isCorrectOption = opt.isCorrect;

              let btnStyle =
                'border-[1.5px] border-[#CAD8DF] bg-white text-[#24343b] hover:border-[#38d39f] hover:bg-[#FAFDFB] shadow-2xs';
              let badgeIcon = null;

              if (isAnswered) {
                if (isCorrectOption) {
                  btnStyle =
                    'border-[1.5px] border-[#38d39f] bg-[#e8f8f1] text-[#168a62] font-bold shadow-xs';
                  badgeIcon = <Check className="w-4 h-4 text-[#168a62] stroke-[3]" />;
                } else if (isSelected && !isCorrectOption) {
                  btnStyle =
                    'border-[1.5px] border-[#ff6b6b] bg-[#fdeeee] text-[#e03131] font-bold animate-shake shadow-xs';
                  badgeIcon = <X className="w-4 h-4 text-[#e03131] stroke-[3]" />;
                } else {
                  btnStyle = 'border-[1.5px] border-[#E6EEF1] bg-white/60 text-[#888888] opacity-60';
                }
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(opt)}
                  className={`min-h-[58px] py-3.5 px-4 rounded-[14px] flex items-center justify-between text-left transition-all duration-150 cursor-pointer ${btnStyle}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="w-5 h-5 rounded-full bg-black/5 text-[11px] font-bold text-[#60727B] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm leading-snug truncate">{opt.meaning}</span>
                  </div>
                  {badgeIcon}
                </button>
              );
            })}
          </div>

          {/*
            ---------------- 五、选错后展开的解析卡 (四段式) ----------------
            答错时平滑展开 (答对不展开)
            ① 同义词 / 近义词: 绿色小胶囊 [twist] [wrench]
            ② 词组搭配: 常见搭配 + 中文
            ③ 单词变形: 并列展示
            ④ 底部一行小字: 错词已自动加入错误循环 +「继续 (Enter)」按钮
          */}
          {isAnswered && isWrongPick && (
            <div className="w-full bg-white border border-[#E6EEF1] rounded-[18px] p-5 sm:p-6 shadow-xs animate-fadeIn flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6EEF1]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <h4 className="text-sm font-bold text-[#24343b]">
                    正确释义：
                    <span className="text-emerald-700 font-serif-en text-base ml-1">
                      {currentWord.word}
                    </span>
                    <span className="text-[#24343b] ml-1.5 font-sans font-normal">
                      —— {targetMeaning}
                    </span>
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={handleGoNext}
                  className="px-4 py-1.5 bg-acc-grad text-white text-xs font-bold rounded-xl shadow-2xs hover:opacity-95 transition-opacity flex items-center gap-1 cursor-pointer"
                >
                  <span>继续 (Enter)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* ① 同义词 / 近义词 */}
              {analysis.synonyms.length > 0 && (
                <div className="flex flex-col gap-1.5 text-left">
                  <span className="text-xs font-bold text-[#768B94]">① 同义词 / 近义词</span>
                  <div className="flex flex-wrap gap-2">
                    {analysis.synonyms.map((syn, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 bg-[#E8F8F1] border border-[#38d39f]/40 text-[#168a62] px-3 py-1 rounded-full text-xs font-mono font-medium"
                      >
                        <span>{syn.word}</span>
                        {syn.meaning && (
                          <span className="text-[11px] text-emerald-800/80">({syn.meaning})</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ② 词组搭配 */}
              {analysis.collocations.length > 0 && (
                <div className="flex flex-col gap-1.5 text-left">
                  <span className="text-xs font-bold text-[#768B94]">② 词组搭配</span>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#24343b]">
                    {analysis.collocations.map((col, idx) => (
                      <span key={idx} className="bg-[#FAFDFB] border border-[#E6EEF1] px-2.5 py-1 rounded-lg">
                        <span className="font-semibold text-[#168a62]">{col.phrase}</span>
                        {col.meaning && <span className="text-[#60727B] ml-1">{col.meaning}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ③ 单词变形 */}
              {analysis.forms.length > 0 && (
                <div className="flex flex-col gap-1.5 text-left">
                  <span className="text-xs font-bold text-[#768B94]">③ 单词变形</span>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {analysis.forms.map((fm, idx) => (
                      <span key={idx} className="bg-[#F7FAFA] border border-[#E6EEF1] px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono">
                        <span className="font-bold text-[#24343b]">{fm.word}</span>
                        {fm.pos && <span className="text-[#96A8B0] text-[10px]">({fm.pos})</span>}
                        {fm.meaning && <span className="text-[#768B94] text-[11px]">{fm.meaning}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ④ 底部一行小字 */}
              <div className="pt-2 border-t border-[#EEF4F6] text-[11px] text-[#96A8B0] flex items-center justify-between">
                <span>错词已自动加入错误循环，明天会再见到它</span>
                <span className="font-mono text-[#CAD8DF]">按 Enter 键快速继续 →</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /*
          ════════════════════════════════════════════════════════════════
          模式 B: 快速 200 词 (完全不动：6 秒自动过词、沉浸复习)
          ════════════════════════════════════════════════════════════════
        */
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div className="sunshine-card rounded-[22px] p-8 sm:p-12 flex flex-col items-center justify-center text-center relative min-h-[380px]">
            {/* 暂停/播放微型控制键 */}
            <button
              type="button"
              onClick={() => setIsPaused(p => !p)}
              className="absolute top-4 right-4 p-2 rounded-full border border-[#E6EEF1] text-[#768B94] hover:text-[#24343b] bg-[#FAFDFB] cursor-pointer"
              title={isPaused ? '恢复自动过词' : '暂停过词'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>

            {/* 单词大字 */}
            <h1 className="font-serif-en text-4xl sm:text-5xl md:text-6xl font-bold text-[#24343b] tracking-tight mb-2 select-text">
              {currentWord.word}
            </h1>

            {/* 极简音标 + 🔊发音按钮 */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {phonetic && (
                <span className="text-sm sm:text-base text-[#7B8F99] font-mono">
                  /{phonetic}/
                </span>
              )}
              <button
                type="button"
                onClick={() => playWord(currentWord.word)}
                className="w-8 h-8 rounded-full bg-[#FAFDFB] border border-[#E6EEF1] hover:border-[#38d39f] flex items-center justify-center text-emerald-600 hover:text-emerald-700 transition-colors shadow-2xs cursor-pointer"
                title="播放单词发音"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* 中文释义 */}
            <div className="w-full max-w-md mx-auto bg-[#FAFDFB] border border-[#E6EEF1] rounded-2xl p-4 text-center my-3">
              <p className="text-lg sm:text-xl font-bold text-[#24343b] leading-snug">
                {targetMeaning}
              </p>
              {analysis.synonyms.length > 0 && (
                <p className="text-xs text-[#7B8F99] mt-2 font-mono truncate">
                  同义: {analysis.synonyms.slice(0, 3).map(s => s.word).join(' / ')}
                </p>
              )}
            </div>

            {/* 6 秒收缩进度指示 */}
            <div className="w-48 h-1.5 bg-[#E6EEF1] rounded-full overflow-hidden mt-4">
              <div
                className="h-full bg-acc-grad transition-all duration-100 ease-linear rounded-full"
                style={{
                  width: `${Math.max(0, 100 - (elapsedMs / FAST_REVIEW_DURATION_MS) * 100)}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-[#A6B8BF] font-mono mt-1.5">
              {isPaused ? '已暂停' : `${Math.ceil((FAST_REVIEW_DURATION_MS - elapsedMs) / 1000)}s 自动切词`}
            </span>
          </div>

          {/* 模式 B 底部前后翻页控制 */}
          <div className="flex items-center justify-center gap-4 mt-2">
            <button
              type="button"
              onClick={handleGoPrev}
              disabled={currentIndex === 0}
              className="px-5 py-2.5 rounded-xl border border-[#CAD8DF] bg-white text-xs font-bold text-[#60727B] disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>上一词</span>
            </button>
            <button
              type="button"
              onClick={handleGoNext}
              className="px-6 py-2.5 rounded-xl bg-acc-grad text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>下一词</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/*
        ---------------- 底部细进度条 (渐变填充) ----------------
        左右显示「进度 X / Y」「连击 ×N」
      */}
      <div className="w-full mt-6 pt-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#96A8B0] mb-1.5">
          <span>进度 {currentIndex + 1} / {words.length}</span>
          <span>{consecutiveStreak > 0 ? `连击 ×${consecutiveStreak}` : '专注记忆'}</span>
        </div>
        <div className="w-full bg-[#EAE6DD]/70 h-[2.5px] rounded-full overflow-hidden">
          <div
            className="bg-acc-grad h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${Math.round(((currentIndex + 1) / words.length) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
