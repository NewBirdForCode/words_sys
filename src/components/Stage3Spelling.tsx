import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Volume2,
  Check,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Printer,
  Sparkles,
  Lightbulb,
  X,
  Eye,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { WordItem } from '../types';
import { DailyTaskPool } from '../utils/plan';
import { ThemeConfig } from '../types/theme';
import { getDefaultTheme } from '../utils/theme';
import { speakWord } from '../utils/speech';
import { recordMistake, appendReviewLogs, getUserId, getTodayDateString } from '../utils/storage';
import { updateWordLearningResult } from '../utils/plan';
import { getWordbookById } from '../utils/wordbook';
import { userScopedStorageKey } from '../utils/userStorage';
import {
  printExamPaperDirectly,
  generatePrintPages,
  PrintPaperOptions,
  PrintPageData,
  PRINT_COMMON_STYLES
} from '../utils/wordPrint';

interface Stage3SpellingProps {
  words: WordItem[];
  activeWordbookId?: string;
  dailyTaskPool?: DailyTaskPool | null;
  totalMistakesCount?: number;
  onFinishStage3: () => void;
  onProceedToStage4: () => void;
  onSpeechError?: (msg: string) => void;
  onOpenPunchIn?: () => void;
  currentTheme?: ThemeConfig;
}

// 缓存持久化 key
const STORAGE_KEY_STAGE3_VIEW_MODE = userScopedStorageKey('daily30_stage3_view_mode_v2');
const STORAGE_KEY_STAGE3_DIRECTION = userScopedStorageKey('daily30_stage3_direction_v2');
const STORAGE_KEY_STAGE3_LIST_BATCH_SIZE = userScopedStorageKey('daily30_stage3_list_batch_v2');
const STORAGE_KEY_STAGE3_LIST_LETTER_STYLE = userScopedStorageKey('daily30_stage3_list_letter_style_v2');
const STORAGE_KEY_STAGE3_AUTO_ADVANCE = userScopedStorageKey('daily30_stage3_auto_advance_v2');

export const Stage3Spelling: React.FC<Stage3SpellingProps> = ({
  words,
  activeWordbookId,
  dailyTaskPool,
  totalMistakesCount = 0,
  onFinishStage3,
  onProceedToStage4,
  onSpeechError,
  onOpenPunchIn,
  currentTheme = getDefaultTheme(),
}) => {
  // ------------ 模式与持久化配置 ------------
  // 'word' (单词模式) | 'list' (列表模式)
  const [viewMode, setViewMode] = useState<'word' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_STAGE3_VIEW_MODE);
      if (saved === 'word' || saved === 'list') return saved;
    }
    return 'word';
  });

  // 默写方向: 'cn_to_en' (中文→默写英文) | 'en_to_cn' (英文→默写中文)
  const [direction, setDirection] = useState<'cn_to_en' | 'en_to_cn'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_STAGE3_DIRECTION);
      if (saved === 'cn_to_en' || saved === 'en_to_cn') return saved;
    }
    return 'cn_to_en';
  });

  // 列表模式每批词数: 10 | 20 | 'all'
  const [listBatchSize, setListBatchSize] = useState<number | 'all'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_STAGE3_LIST_BATCH_SIZE);
      if (saved === '10') return 10;
      if (saved === '20') return 20;
      if (saved === 'all') return 'all';
    }
    return 10;
  });

  // 列表模式字母格形式: 'boxes' (全部显示) | 'first_last' (首尾字母提示) | 'underline' (纯下划线)
  const [letterBoxStyle, setLetterBoxStyle] = useState<'boxes' | 'first_last' | 'underline'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_STAGE3_LIST_LETTER_STYLE);
      if (saved === 'boxes' || saved === 'first_last' || saved === 'underline') return saved;
    }
    return 'boxes';
  });

  // 列表模式自动跳格
  const [autoAdvance, setAutoAdvance] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_STAGE3_AUTO_ADVANCE);
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  // ------------ 模式 A (单词模式) 状态 ------------
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInputs, setUserInputs] = useState<string[]>([]);
  const [activeCursorPos, setActiveCursorPos] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [mismatchedIndices, setMismatchedIndices] = useState<number[]>([]);
  const [consecutiveStreak, setConsecutiveStreak] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasRetriedCurrentWord, setHasRetriedCurrentWord] = useState(false);

  // ------------ 模式 B (列表模式) 状态 ------------
  const [batchPageIndex, setBatchPageIndex] = useState(0);
  // wordId -> array of characters
  const [listRowInputs, setListRowInputs] = useState<Record<string, string[]>>({});
  // wordId -> focused slot index
  const [listRowActiveSlot, setListRowActiveSlot] = useState<Record<string, number>>({});
  const [isBatchSubmitted, setIsBatchSubmitted] = useState(false);
  const [batchResults, setBatchResults] = useState<Record<string, { isCorrect: boolean; wrongIndices: number[] }>>({});
  const [expandedWrongRows, setExpandedWrongRows] = useState<Record<string, boolean>>({});

  // ------------ 打印与预览模态框状态 ------------
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printPaperType, setPrintPaperType] = useState<'single' | 'table'>('single');
  const [printDirection, setPrintDirection] = useState<'cn_to_en' | 'en_to_cn'>('cn_to_en');
  const [printScope, setPrintScope] = useState<'plan' | 'mistakes' | 'custom_20' | 'custom_50' | 'custom_100'>('plan');
  const [printWithAnswerKey, setPrintWithAnswerKey] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPages, setPreviewPages] = useState<PrintPageData[]>([]);
  const [activePreviewPage, setActivePreviewPage] = useState(1);
  const [printToastMsg, setPrintToastMsg] = useState<string | null>(null);

  // 实体/隐藏键盘与控制
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTransitioningRef = useRef(false);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  // 获取当前词书信息
  const activeWordbook = useMemo(() => {
    return activeWordbookId ? getWordbookById(activeWordbookId) : null;
  }, [activeWordbookId]);
  const wordbookName = activeWordbook?.name || '燃词精选词库';

  const currentWord = words[currentIndex] || words[0];
  const targetWord = (currentWord?.word || '').trim();
  const targetMeaning =
    (currentWord?.meaning || currentWord?.translation || '').trim() || '暂无中文释义';

  // ----------------------------------------------------
  // 模式 A: 初始化单词输入格
  // ----------------------------------------------------
  useEffect(() => {
    if (!currentWord || viewMode !== 'word') return;

    // 清空状态
    const letters = targetWord.split('');
    const initialInputs = new Array(letters.length).fill('');
    // 自动填充空格和撇号
    letters.forEach((char, idx) => {
      if (char === ' ') initialInputs[idx] = ' ';
      if (char === "'") initialInputs[idx] = "'";
    });

    setUserInputs(initialInputs);
    // 找到第一个非空格/撇号的初始焦点
    const firstEditable = letters.findIndex(c => c !== ' ' && c !== "'");
    setActiveCursorPos(firstEditable !== -1 ? firstEditable : 0);
    setFeedbackStatus('idle');
    setMismatchedIndices([]);
    setUsedHint(false);
    setHasRetriedCurrentWord(false);
    isTransitioningRef.current = false;

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    // 聚焦输入层
    setTimeout(() => {
      hiddenInputRef.current?.focus();
    }, 60);
  }, [currentIndex, targetWord, viewMode]);

  // ----------------------------------------------------
  // 模式 B: 当前批次题目切片
  // ----------------------------------------------------
  const currentBatchWords = useMemo(() => {
    if (listBatchSize === 'all') return words;
    const start = batchPageIndex * listBatchSize;
    return words.slice(start, start + listBatchSize);
  }, [words, listBatchSize, batchPageIndex]);

  // 切换批次或列表配置时初始化行输入
  useEffect(() => {
    if (viewMode !== 'list') return;
    const newInputs: Record<string, string[]> = {};
    const newSlots: Record<string, number> = {};

    currentBatchWords.forEach(w => {
      const letters = (w.word || '').trim().split('');
      const arr = new Array(letters.length).fill('');
      letters.forEach((char, idx) => {
        if (char === ' ') arr[idx] = ' ';
        if (char === "'") arr[idx] = "'";
      });

      // 如果开启首尾字母提示
      if (letterBoxStyle === 'first_last' && letters.length >= 2) {
        arr[0] = letters[0];
        arr[letters.length - 1] = letters[letters.length - 1];
      }

      newInputs[w.id] = arr;
      // 找到第一个可填空位
      const firstEmpty = arr.findIndex((val, i) => {
        if (letterBoxStyle === 'first_last' && (i === 0 || i === letters.length - 1)) return false;
        return val === '';
      });
      newSlots[w.id] = firstEmpty !== -1 ? firstEmpty : 0;
    });

    setListRowInputs(newInputs);
    setListRowActiveSlot(newSlots);
    setIsBatchSubmitted(false);
    setBatchResults({});
    setExpandedWrongRows({});
  }, [currentBatchWords, viewMode, letterBoxStyle]);

  // ----------------------------------------------------
  // 模式切换与持久化
  // ----------------------------------------------------
  const handleSwitchMode = (mode: 'word' | 'list') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_STAGE3_VIEW_MODE, mode);
    }
  };

  const handleSwitchDirection = (dir: 'cn_to_en' | 'en_to_cn') => {
    setDirection(dir);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_STAGE3_DIRECTION, dir);
    }
  };

  const handleSwitchListBatchSize = (size: number | 'all') => {
    setListBatchSize(size);
    setBatchPageIndex(0);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_STAGE3_LIST_BATCH_SIZE, size.toString());
    }
  };

  const handleSwitchLetterBoxStyle = (style: 'boxes' | 'first_last' | 'underline') => {
    setLetterBoxStyle(style);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_STAGE3_LIST_LETTER_STYLE, style);
    }
  };

  const handleToggleAutoAdvance = () => {
    const nextVal = !autoAdvance;
    setAutoAdvance(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_STAGE3_AUTO_ADVANCE, nextVal ? 'true' : 'false');
    }
  };

  // ----------------------------------------------------
  // 模式 A: 字母输入与判定逻辑 (自动满格判定)
  // ----------------------------------------------------
  const evaluateWordMode = (inputs: string[]) => {
    if (isTransitioningRef.current) return;
    const cleanTarget = targetWord.toLowerCase();
    const cleanUser = inputs.join('').toLowerCase();

    // 检查错位格
    const wrongs: number[] = [];
    for (let i = 0; i < cleanTarget.length; i++) {
      if (cleanTarget[i] !== cleanUser[i]) {
        wrongs.push(i);
      }
    }

    if (wrongs.length === 0) {
      // 【全对】
      setFeedbackStatus('success');
      setMismatchedIndices([]);
      isTransitioningRef.current = true;

      // 连续全对计数
      setConsecutiveStreak(s => {
        const next = s + 1;
        if (next >= 5 && next % 5 === 0) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 2400);
        }
        return next;
      });

      // 自动朗读一遍单词
      speakWord(targetWord, {
        onError: onSpeechError,
      });

      // 记录完成状态
      if (activeWordbookId) {
        updateWordLearningResult(activeWordbookId, currentWord.id, true);
      }

      // 0.8秒后自动进入下一词
      autoAdvanceTimerRef.current = setTimeout(() => {
        handleGoNextWord();
      }, 800);
    } else {
      // 【有错】
      setFeedbackStatus('error');
      setMismatchedIndices(wrongs);
      setConsecutiveStreak(0);

      // 自动朗读正确发音
      speakWord(targetWord, {
        onError: onSpeechError,
      });

      // 自动加入阶段四"错误循环"
      if (!hasRetriedCurrentWord) {
        recordMistake(currentWord.id);
      }

      // 停留 2 秒看清后自动切入下一词 (若孩子未点"再拼一遍")
      autoAdvanceTimerRef.current = setTimeout(() => {
        handleGoNextWord();
      }, 2000);
    }
  };

  const handleGoNextWord = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (currentIndex < words.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      // 阶段三完成
      onFinishStage3();
    }
  };

  // 模式 A 实体键盘与字符输入响应
  const handleKeyInput = (char: string) => {
    if (feedbackStatus === 'success' || isTransitioningRef.current) return;
    if (feedbackStatus === 'error') {
      // 错误状态下若孩子输入，重置为重新拼写
      handleRetryCurrentWord();
      return;
    }

    const letters = targetWord.split('');
    const newInputs = [...userInputs];

    // 只接受字母 a-z, A-Z
    if (/^[a-zA-Z]$/.test(char)) {
      newInputs[activeCursorPos] = char.toLowerCase();
      setUserInputs(newInputs);

      // 寻找下一个可输入的格（跳过空格与撇号）
      let nextPos = activeCursorPos + 1;
      while (nextPos < letters.length && (letters[nextPos] === ' ' || letters[nextPos] === "'")) {
        nextPos++;
      }

      if (nextPos < letters.length) {
        setActiveCursorPos(nextPos);
      } else {
        // 最后一个格也填满，自动触发判定
        // 检查是否所有需要输入的字母都已填写
        const isAllFilled = letters.every((expected, idx) => {
          if (expected === ' ' || expected === "'") return true;
          return !!newInputs[idx] && newInputs[idx].trim() !== '';
        });

        if (isAllFilled) {
          evaluateWordMode(newInputs);
        }
      }
    }
  };

  // 模式 A 退格键响应
  const handleBackspace = () => {
    if (feedbackStatus === 'success' || isTransitioningRef.current) return;
    if (feedbackStatus === 'error') {
      handleRetryCurrentWord();
      return;
    }

    const letters = targetWord.split('');
    const newInputs = [...userInputs];

    // 如果当前格有内容，则清除当前格
    if (newInputs[activeCursorPos] && letters[activeCursorPos] !== ' ' && letters[activeCursorPos] !== "'") {
      newInputs[activeCursorPos] = '';
      setUserInputs(newInputs);
    } else {
      // 否则退回到上一个非符号格并清除
      let prevPos = activeCursorPos - 1;
      while (prevPos >= 0 && (letters[prevPos] === ' ' || letters[prevPos] === "'")) {
        prevPos--;
      }
      if (prevPos >= 0) {
        newInputs[prevPos] = '';
        setUserInputs(newInputs);
        setActiveCursorPos(prevPos);
      }
    }
  };

  // 模式 A 点击"再拼一遍"
  const handleRetryCurrentWord = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    const letters = targetWord.split('');
    const initialInputs = new Array(letters.length).fill('');
    letters.forEach((char, idx) => {
      if (char === ' ') initialInputs[idx] = ' ';
      if (char === "'") initialInputs[idx] = "'";
    });
    setUserInputs(initialInputs);
    const firstEditable = letters.findIndex(c => c !== ' ' && c !== "'");
    setActiveCursorPos(firstEditable !== -1 ? firstEditable : 0);
    setFeedbackStatus('idle');
    setMismatchedIndices([]);
    setHasRetriedCurrentWord(true);
    isTransitioningRef.current = false;
    hiddenInputRef.current?.focus();
  };

  // 右上角 "💡 提示下一个字母"
  const handleHintNextLetter = () => {
    if (feedbackStatus === 'success' || isTransitioningRef.current) return;
    const letters = targetWord.split('');
    const newInputs = [...userInputs];

    // 寻找下一个未填或填写错误的字母位
    let hintIdx = -1;
    for (let i = 0; i < letters.length; i++) {
      if (letters[i] === ' ' || letters[i] === "'") continue;
      if (!newInputs[i] || newInputs[i].toLowerCase() !== letters[i].toLowerCase()) {
        hintIdx = i;
        break;
      }
    }

    if (hintIdx !== -1) {
      newInputs[hintIdx] = letters[hintIdx].toLowerCase();
      setUserInputs(newInputs);
      setUsedHint(true);

      // 移动光标至下一未填位
      let nextPos = hintIdx + 1;
      while (nextPos < letters.length && (letters[nextPos] === ' ' || letters[nextPos] === "'")) {
        nextPos++;
      }
      if (nextPos < letters.length) {
        setActiveCursorPos(nextPos);
      } else {
        const isAllFilled = letters.every((exp, idx) => {
          if (exp === ' ' || exp === "'") return true;
          return !!newInputs[idx] && newInputs[idx].trim() !== '';
        });
        if (isAllFilled) {
          evaluateWordMode(newInputs);
        }
      }
    }
  };

  // ----------------------------------------------------
  // 模式 B: 列表模式输入与跳格
  // ----------------------------------------------------
  const handleListSlotInput = (wordId: string, slotIdx: number, char: string) => {
    if (isBatchSubmitted) return;
    const targetItem = currentBatchWords.find(w => w.id === wordId);
    if (!targetItem) return;

    const letters = (targetItem.word || '').trim().split('');
    const currentRow = listRowInputs[wordId] ? [...listRowInputs[wordId]] : new Array(letters.length).fill('');

    // 若首尾提示，不可改首尾
    if (letterBoxStyle === 'first_last' && (slotIdx === 0 || slotIdx === letters.length - 1)) {
      return;
    }

    if (/^[a-zA-Z]$/.test(char)) {
      currentRow[slotIdx] = char.toLowerCase();
      const updatedInputs = { ...listRowInputs, [wordId]: currentRow };
      setListRowInputs(updatedInputs);

      // 自动跳格
      if (autoAdvance) {
        let nextSlot = slotIdx + 1;
        while (nextSlot < letters.length && (letters[nextSlot] === ' ' || letters[nextSlot] === "'")) {
          nextSlot++;
        }
        if (letterBoxStyle === 'first_last' && nextSlot === letters.length - 1) {
          // 跳过尾字母
          nextSlot = letters.length;
        }

        if (nextSlot < letters.length) {
          setListRowActiveSlot(prev => ({ ...prev, [wordId]: nextSlot }));
        }
      }
    }
  };

  const handleListSlotBackspace = (wordId: string, slotIdx: number) => {
    if (isBatchSubmitted) return;
    const targetItem = currentBatchWords.find(w => w.id === wordId);
    if (!targetItem) return;

    const letters = (targetItem.word || '').trim().split('');
    const currentRow = listRowInputs[wordId] ? [...listRowInputs[wordId]] : new Array(letters.length).fill('');

    if (letterBoxStyle === 'first_last' && (slotIdx === 0 || slotIdx === letters.length - 1)) {
      return;
    }

    if (currentRow[slotIdx] && letters[slotIdx] !== ' ' && letters[slotIdx] !== "'") {
      currentRow[slotIdx] = '';
      setListRowInputs({ ...listRowInputs, [wordId]: currentRow });
    } else {
      let prev = slotIdx - 1;
      while (prev >= 0 && (letters[prev] === ' ' || letters[prev] === "'")) {
        prev--;
      }
      if (letterBoxStyle === 'first_last' && prev === 0) {
        return;
      }
      if (prev >= 0) {
        currentRow[prev] = '';
        setListRowInputs({ ...listRowInputs, [wordId]: currentRow });
        setListRowActiveSlot(p => ({ ...p, [wordId]: prev }));
      }
    }
  };

  // 模式 B 纯下划线模式文本变化
  const handleListUnderlineChange = (wordId: string, val: string) => {
    if (isBatchSubmitted) return;
    const targetItem = currentBatchWords.find(w => w.id === wordId);
    if (!targetItem) return;

    const letters = (targetItem.word || '').trim().split('');
    const chars = val.split('');
    const arr = new Array(letters.length).fill('');
    chars.slice(0, letters.length).forEach((c, i) => {
      arr[i] = c;
    });
    setListRowInputs({ ...listRowInputs, [wordId]: arr });
  };

  // 模式 B 提交批改
  const handleSubmitBatch = () => {
    const resultsMap: Record<string, { isCorrect: boolean; wrongIndices: number[] }> = {};
    const wrongExpandMap: Record<string, boolean> = {};

    currentBatchWords.forEach(w => {
      const targetStr = (w.word || '').trim().toLowerCase();
      const currentInputArr = listRowInputs[w.id] || [];
      const userStr = currentInputArr.join('').trim().toLowerCase();

      const wrongs: number[] = [];
      for (let i = 0; i < targetStr.length; i++) {
        if (targetStr[i] !== userStr[i]) {
          wrongs.push(i);
        }
      }

      const isCorrect = wrongs.length === 0;
      resultsMap[w.id] = { isCorrect, wrongIndices: wrongs };

      if (!isCorrect) {
        wrongExpandMap[w.id] = true;
        // 错词录入错题集
        recordMistake(w.id);
      } else {
        if (activeWordbookId) {
          updateWordLearningResult(activeWordbookId, w.id, true);
        }
      }
    });

    setBatchResults(resultsMap);
    setExpandedWrongRows(wrongExpandMap);
    setIsBatchSubmitted(true);
  };

  // 模式 B 全部重填
  const handleResetBatch = () => {
    const newInputs: Record<string, string[]> = {};
    const newSlots: Record<string, number> = {};

    currentBatchWords.forEach(w => {
      const letters = (w.word || '').trim().split('');
      const arr = new Array(letters.length).fill('');
      letters.forEach((char, idx) => {
        if (char === ' ') arr[idx] = ' ';
        if (char === "'") arr[idx] = "'";
      });
      if (letterBoxStyle === 'first_last' && letters.length >= 2) {
        arr[0] = letters[0];
        arr[letters.length - 1] = letters[letters.length - 1];
      }
      newInputs[w.id] = arr;
      newSlots[w.id] = letterBoxStyle === 'first_last' ? 1 : 0;
    });

    setListRowInputs(newInputs);
    setListRowActiveSlot(newSlots);
    setIsBatchSubmitted(false);
    setBatchResults({});
    setExpandedWrongRows({});
  };

  // 模式 B 下一组
  const handleNextBatch = () => {
    if (listBatchSize === 'all') {
      onFinishStage3();
      return;
    }
    const totalBatches = Math.ceil(words.length / listBatchSize);
    if (batchPageIndex < totalBatches - 1) {
      setBatchPageIndex(p => p + 1);
    } else {
      onFinishStage3();
    }
  };

  // 统计数据
  const listBatchStats = useMemo(() => {
    const total = currentBatchWords.length;
    let completed = 0;
    let correctCount = 0;

    currentBatchWords.forEach(w => {
      const inputArr = listRowInputs[w.id] || [];
      const hasInput = inputArr.some(c => c && c !== ' ' && c !== "'");
      if (hasInput) completed++;

      if (isBatchSubmitted && batchResults[w.id]?.isCorrect) {
        correctCount++;
      }
    });

    const accuracy = isBatchSubmitted && total > 0 ? Math.round((correctCount / total) * 100) : 100;
    const hasAnyWrong = isBatchSubmitted && correctCount < total;

    return { total, completed, correctCount, accuracy, hasAnyWrong };
  }, [currentBatchWords, listRowInputs, isBatchSubmitted, batchResults]);

  // ----------------------------------------------------
  // 打印与 A4 预览逻辑
  // ----------------------------------------------------
  const getWordsForPrint = (): WordItem[] => {
    if (printScope === 'plan') {
      return words;
    }
    if (printScope === 'mistakes') {
      // 优先从错题本取，没有则取当前全部待默写词
      return words;
    }
    if (printScope === 'custom_20') {
      return [...words].sort(() => Math.random() - 0.5).slice(0, 20);
    }
    if (printScope === 'custom_50') {
      return [...words].sort(() => Math.random() - 0.5).slice(0, 50);
    }
    if (printScope === 'custom_100') {
      return [...words].sort(() => Math.random() - 0.5).slice(0, 100);
    }
    return words;
  };

  const handleOpenPrintPreview = () => {
    const targetWords = getWordsForPrint();
    if (targetWords.length === 0) {
      setPrintToastMsg('当前选定的范围暂无待默写词汇');
      setTimeout(() => setPrintToastMsg(null), 2500);
      return;
    }

    const options: PrintPaperOptions = {
      paperType: printPaperType,
      direction: printDirection,
      withAnswerKey: printWithAnswerKey,
      wordbookName,
    };

    const pages = generatePrintPages(targetWords, options);
    setPreviewPages(pages);
    setActivePreviewPage(1);
    setIsPreviewOpen(true);
    setIsPrintModalOpen(false);
  };

  const handleDirectPrint = () => {
    const targetWords = getWordsForPrint();
    if (targetWords.length === 0) {
      setPrintToastMsg('当前选定的范围暂无待默写词汇');
      setTimeout(() => setPrintToastMsg(null), 2500);
      return;
    }

    const options: PrintPaperOptions = {
      paperType: printPaperType,
      direction: printDirection,
      withAnswerKey: printWithAnswerKey,
      wordbookName,
    };

    printExamPaperDirectly(targetWords, options);
    setIsPrintModalOpen(false);
    setPrintToastMsg('已唤起系统打印窗口');
    setTimeout(() => setPrintToastMsg(null), 3000);
  };

  // ----------------------------------------------------
  // 自适应字母格渲染 (统一规则)
  // 格数 = max(6, targetLetters.length)
  // ----------------------------------------------------
  const renderAdaptiveLetterBoxes = (
    wordStr: string,
    inputs: string[],
    activeSlot: number,
    status: 'idle' | 'success' | 'error',
    wrongs: number[],
    onSlotClick?: (idx: number) => void,
    isFirstLastHintMode: boolean = false,
    isCompact: boolean = false
  ) => {
    const targetLetters = wordStr.split('');
    const targetLen = targetLetters.length;
    const totalSlots = Math.max(6, targetLen);

    return (
      <div
        className={`flex items-center justify-center mx-auto w-full select-none ${
          isCompact ? 'max-w-[480px] gap-1 sm:gap-1.5' : 'max-w-[560px] gap-1.5 sm:gap-2.5'
        }`}
        style={{
          // 固定宽度容器，自适应等比均分，不换行
          display: 'flex',
        }}
      >
        {Array.from({ length: totalSlots }).map((_, idx) => {
          // 多余格 (少于6格时浅灰禁用)
          if (idx >= targetLen) {
            return (
              <div
                key={`empty-slot-${idx}`}
                className={`flex-1 rounded-xl border border-dashed border-[#DDD7CD] bg-[#FAF8F5]/60 flex items-center justify-center transition-all ${
                  isCompact ? 'h-9 min-w-[24px] max-w-[48px]' : 'h-13 sm:h-16 min-w-[26px] max-w-[72px]'
                }`}
                style={{ flex: '1 1 0px' }}
                aria-hidden="true"
              >
                <span className="text-[#CCC5B8] text-xs font-mono select-none">-</span>
              </div>
            );
          }

          const expectedChar = targetLetters[idx];
          const isSpace = expectedChar === ' ';
          const isApostrophe = expectedChar === "'";
          const isSymbol = isSpace || isApostrophe;
          const enteredChar = inputs[idx] || '';
          const isCursorHere = activeSlot === idx && status === 'idle';
          const isWrong = wrongs.includes(idx);
          const isFirstLastLocked =
            isFirstLastHintMode && (idx === 0 || idx === targetLen - 1);

          // 空格或撇号
          if (isSymbol) {
            return (
              <div
                key={`sym-${idx}`}
                className={`flex-1 rounded-lg flex items-center justify-center font-mono font-bold text-neutral-400 select-none ${
                  isCompact ? 'h-9 min-w-[20px] max-w-[32px]' : 'h-13 sm:h-16 min-w-[24px] max-w-[48px]'
                }`}
                style={{ flex: '0.8 1 0px' }}
              >
                {isSpace ? '_' : "'"}
              </div>
            );
          }

          // 样式状态判定
          let boxClasses = 'bg-white border-[#D6D0C4] text-[#2C2C2C] shadow-2xs';

          if (isFirstLastLocked) {
            boxClasses = 'bg-[#F5F2EB] border-[#D6D0C4] text-[#444444] font-bold cursor-default';
          } else if (status === 'success') {
            boxClasses = 'bg-emerald-50 border-emerald-500 text-emerald-700 animate-wave-success';
          } else if (status === 'error' && isWrong) {
            boxClasses = 'bg-rose-50 border-rose-500 text-rose-600 animate-shake';
          } else if (isCursorHere) {
            boxClasses = 'bg-white border-[#2C2C2C] ring-2 ring-[#2C2C2C]/15 shadow-xs';
          }

          return (
            <div
              key={`letter-${idx}`}
              onClick={() => {
                if (!isFirstLastLocked && onSlotClick) {
                  onSlotClick(idx);
                }
              }}
              className={`flex-1 rounded-xl border-2 flex items-center justify-center font-mono uppercase transition-all duration-150 cursor-pointer ${
                isCompact ? 'h-9 min-w-[24px] max-w-[48px] text-sm' : 'h-13 sm:h-16 min-w-[26px] max-w-[72px] text-xl sm:text-2xl font-bold'
              } ${boxClasses}`}
              style={{
                flex: '1 1 0px',
                animationDelay: status === 'success' ? `${idx * 45}ms` : undefined,
              }}
            >
              {isFirstLastLocked ? (
                expectedChar
              ) : enteredChar ? (
                enteredChar
              ) : isCursorHere ? (
                <span className="w-1.5 h-5 bg-[#2C2C2C] animate-pulse rounded-full" />
              ) : (
                <span className="opacity-0">A</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto flex flex-col justify-between min-h-[calc(100vh-140px)] select-none">
      {/* 隐藏的通用键盘事件捕获层 (单词模式下全自动聚焦实体打字与手机输入法) */}
      <input
        ref={hiddenInputRef}
        type="text"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck="false"
        className="fixed -top-9999 -left-9999 opacity-0 pointer-events-none"
        aria-hidden="true"
        onKeyDown={e => {
          if (viewMode !== 'word') return;
          if (e.key === 'Backspace') {
            e.preventDefault();
            handleBackspace();
          } else if (e.key === 'ArrowLeft') {
            setActiveCursorPos(p => Math.max(0, p - 1));
          } else if (e.key === 'ArrowRight') {
            setActiveCursorPos(p => Math.min(targetWord.length - 1, p + 1));
          } else if (e.key.length === 1) {
            handleKeyInput(e.key);
          }
        }}
      />

      {/* ----------------- 【一、页面顶部极简控制区】 ----------------- */}
      <div className="w-full pt-1 pb-3 flex items-center justify-between border-b border-[#EAE6DD]/60">
        {/* 左侧：模式切换小胶囊 (两选一) */}
        <div className="flex items-center bg-[#F0F5F4] p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => handleSwitchMode('word')}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              viewMode === 'word'
                ? 'bg-acc-grad text-white font-bold shadow-[0_4px_12px_rgba(74,157,184,0.18)]'
                : 'text-[#60727B] hover:text-[#2C3E46]'
            }`}
          >
            单词
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('list')}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-acc-grad text-white font-bold shadow-[0_4px_12px_rgba(74,157,184,0.18)]'
                : 'text-[#60727B] hover:text-[#2C3E46]'
            }`}
          >
            列表
          </button>
        </div>

        {/* 右侧：三个极简图标按钮 🔊 发音 · 💡 提示 · 🖨 打印 */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 🔊 发音 */}
          <button
            type="button"
            title="播放单词正确发音"
            onClick={() => {
              const wordToSpeak = viewMode === 'word' ? targetWord : currentBatchWords[0]?.word;
              if (wordToSpeak) {
                speakWord(wordToSpeak, { onError: onSpeechError });
              }
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#555555] hover:text-[#2C2C2C] hover:bg-[#EFEAE1] transition-all cursor-pointer"
          >
            <Volume2 className="w-4.5 h-4.5" />
          </button>

          {/* 💡 提示下一个字母 (单词模式专属，使用后标记) */}
          {viewMode === 'word' && (
            <button
              type="button"
              title="提示下一个正确字母"
              onClick={handleHintNextLetter}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                usedHint
                  ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                  : 'text-[#555555] hover:text-amber-600 hover:bg-[#EFEAE1]'
              }`}
            >
              <Lightbulb className="w-4.5 h-4.5" />
            </button>
          )}

          {/* 🖨 打印 */}
          <button
            type="button"
            title="导出与预览 A4 纸质默写卷"
            onClick={() => setIsPrintModalOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#555555] hover:text-[#2C2C2C] hover:bg-[#EFEAE1] transition-all cursor-pointer"
          >
            <Printer className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* 提示 Toast */}
      {printToastMsg && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-[#2C2C2C] text-white text-xs px-4 py-2 rounded-full shadow-lg animate-fadeIn">
          {printToastMsg}
        </div>
      )}

      {/* ----------------- 【二、正文区：双模式渲染】 ----------------- */}
      <div className="flex-1 flex flex-col justify-center my-auto py-4">
        {/* ===================== 【模式 A · 单词模式】 ===================== */}
        {viewMode === 'word' && (
          <div
            className="w-full flex flex-col items-center justify-center text-center py-6 cursor-text"
            onClick={() => hiddenInputRef.current?.focus()}
          >
            {/* 题目展示区 (居中大字，只有一个视觉焦点) */}
            <div className="mb-10 sm:mb-14">
              {direction === 'cn_to_en' ? (
                <>
                  <h1 className="text-3xl sm:text-[40px] font-medium text-[#2C2C2C] tracking-[4px] leading-snug max-w-2xl mx-auto">
                    {targetMeaning}
                  </h1>
                  {currentWord?.phonetic && (
                    <p className="text-xs sm:text-sm text-[#888888] font-mono mt-2.5">
                      /{currentWord.phonetic}/
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-3xl sm:text-[42px] font-serif font-bold text-[#2C2C2C] tracking-wide leading-snug">
                    {targetWord}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#888888] mt-2.5">
                    请默写对应中文或按提示拼读
                  </p>
                </>
              )}
            </div>

            {/* 自适应字母格 (固定宽度容器，6格为基准，等比自适应均分) */}
            <div className="w-full max-w-[560px] mx-auto mb-6">
              {renderAdaptiveLetterBoxes(
                targetWord,
                userInputs,
                activeCursorPos,
                feedbackStatus,
                mismatchedIndices,
                idx => {
                  setActiveCursorPos(idx);
                  hiddenInputRef.current?.focus();
                },
                false,
                false
              )}
            </div>

            {/* 判定反馈与错词解析层 */}
            <div className="min-h-[72px] flex flex-col items-center justify-center">
              {/* 正确通过反馈 */}
              {feedbackStatus === 'success' && (
                <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm sm:text-base animate-fadeIn">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>拼写完全正确！</span>
                </div>
              )}

              {/* 错误反馈展示：居中显示正确单词 (正确字母绿色，错误字母红色) */}
              {feedbackStatus === 'error' && (
                <div className="flex flex-col items-center gap-3 animate-fadeIn">
                  <div className="flex items-center gap-1 text-xl sm:text-2xl font-mono tracking-widest bg-[#FAF6F0] px-4 py-2 rounded-xl border border-[#EAE3D2]">
                    {targetWord.split('').map((char, i) => {
                      const isWrong = mismatchedIndices.includes(i);
                      return (
                        <span
                          key={`correct-disp-${i}`}
                          className={`font-bold ${
                            isWrong ? 'text-rose-600 underline' : 'text-emerald-600'
                          }`}
                        >
                          {char}
                        </span>
                      );
                    })}
                  </div>

                  {/* 清空再拼一遍按钮 */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleRetryCurrentWord();
                    }}
                    className="flex items-center gap-1.5 text-xs text-[#666666] hover:text-[#2C2C2C] bg-white hover:bg-[#F2ECE1] border border-[#DDD7CD] px-3.5 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>再拼一遍</span>
                  </button>
                </div>
              )}

              {/* 默认状态下的一行极简灰色小字说明 */}
              {feedbackStatus === 'idle' && (
                <div className="text-xs text-[#999999] flex items-center gap-2">
                  <span>键盘直接输入，填满自动判定</span>
                  {usedHint && <span className="text-amber-600 font-medium">(已使用提示)</span>}
                </div>
              )}
            </div>

            {/* 连续 5 词全对正反馈动效 */}
            {showCelebration && (
              <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-scaleIn">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-bold tracking-wide">太棒了！已连续答对 {consecutiveStreak} 词！</span>
              </div>
            )}
          </div>
        )}

        {/* ===================== 【模式 B · 列表模式】 ===================== */}
        {viewMode === 'list' && (
          <div className="w-full flex flex-col gap-4">
            {/* 1. 参数集中在一行 (极简，无背景卡片，紧贴列表上方) */}
            <div className="w-full flex flex-wrap items-center justify-between gap-y-2.5 text-xs text-[#666666] pb-2 border-b border-[#EAE6DD]/60">
              <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                {/* 模式：中文→英文 / 英文→中文 */}
                <div className="flex items-center gap-1">
                  <span>模式：</span>
                  <select
                    value={direction}
                    onChange={e => handleSwitchDirection(e.target.value as any)}
                    className="bg-transparent font-medium text-[#2C2C2C] focus:outline-none cursor-pointer"
                  >
                    <option value="cn_to_en">中文→英文</option>
                    <option value="en_to_cn">英文→中文</option>
                  </select>
                </div>

                {/* 题目数：10 / 20 / 全部待默写 */}
                <div className="flex items-center gap-1">
                  <span>题目数：</span>
                  <select
                    value={listBatchSize}
                    onChange={e => {
                      const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                      handleSwitchListBatchSize(val as any);
                    }}
                    className="bg-transparent font-medium text-[#2C2C2C] focus:outline-none cursor-pointer"
                  >
                    <option value="10">10 词</option>
                    <option value="20">20 词</option>
                    <option value="all">全部待默写 ({words.length})</option>
                  </select>
                </div>

                {/* 字母格：全部显示 / 首尾字母提示 / 纯下划线 */}
                <div className="flex items-center gap-1">
                  <span>字母格：</span>
                  <select
                    value={letterBoxStyle}
                    onChange={e => handleSwitchLetterBoxStyle(e.target.value as any)}
                    className="bg-transparent font-medium text-[#2C2C2C] focus:outline-none cursor-pointer"
                  >
                    <option value="boxes">全部显示</option>
                    <option value="first_last">首尾字母提示</option>
                    <option value="underline">纯下划线</option>
                  </select>
                </div>

                {/* 自动跳格复选框 */}
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={handleToggleAutoAdvance}
                    className="rounded border-[#CCC5B8] text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                  <span>自动跳格</span>
                </label>
              </div>

              {/* 批次提示 */}
              {listBatchSize !== 'all' && (
                <div className="text-[11px] text-[#999999]">
                  第 {batchPageIndex + 1} / {Math.ceil(words.length / (listBatchSize as number))} 组
                </div>
              )}
            </div>

            {/* 2. 表格主体 (极简线条，不要斑马纹，不要厚重边框) */}
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#EAE6DD] text-xs text-[#888888]">
                    <th className="py-2.5 px-3 w-12 text-center font-normal">序号</th>
                    <th className="py-2.5 px-4 font-normal min-w-[120px]">
                      {direction === 'cn_to_en' ? '中文释义' : '英文单词'}
                    </th>
                    <th className="py-2.5 px-4 font-normal text-center min-w-[260px]">拼写区</th>
                    <th className="py-2.5 px-3 w-16 text-center font-normal">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {currentBatchWords.map((item, rowIdx) => {
                    const globalIdx =
                      listBatchSize === 'all'
                        ? rowIdx + 1
                        : batchPageIndex * (listBatchSize as number) + rowIdx + 1;
                    const wordStr = (item.word || '').trim();
                    const meaningStr = (item.meaning || item.translation || '').trim();
                    const currentRowInputs = listRowInputs[item.id] || [];
                    const activeSlot = listRowActiveSlot[item.id] || 0;
                    const result = batchResults[item.id];
                    const isRowWrong = isBatchSubmitted && result && !result.isCorrect;
                    const isRowCorrect = isBatchSubmitted && result && result.isCorrect;
                    const hasEntered = currentRowInputs.some(c => c && c !== ' ' && c !== "'");

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          className={`border-b border-[#F0ECE2] transition-colors ${
                            isRowWrong ? 'bg-rose-50/40' : 'hover:bg-[#FAF8F5]/80'
                          }`}
                        >
                          {/* 序号 */}
                          <td className="py-3 px-3 text-center text-xs font-mono text-[#999999]">
                            {globalIdx}
                          </td>

                          {/* 题目 */}
                          <td className="py-3 px-4 text-[15px] font-medium text-[#2C2C2C]">
                            {direction === 'cn_to_en' ? (
                              meaningStr
                            ) : (
                              <span className="font-serif font-bold">{wordStr}</span>
                            )}
                          </td>

                          {/* 拼写输入区 */}
                          <td className="py-2.5 px-4">
                            {letterBoxStyle === 'underline' ? (
                              // 纯下划线无分格单行输入
                              <div className="max-w-xs mx-auto">
                                <input
                                  type="text"
                                  disabled={isBatchSubmitted}
                                  value={currentRowInputs.join('')}
                                  onChange={e => handleListUnderlineChange(item.id, e.target.value)}
                                  placeholder="输入拼写..."
                                  className="w-full bg-transparent border-b-2 border-[#D6D0C4] focus:border-[#2C2C2C] py-1 text-center font-mono font-medium text-base outline-none transition-colors"
                                />
                              </div>
                            ) : (
                              // 自适应字母格 (含首尾字母提示逻辑)
                              <div className="w-full flex justify-center">
                                {renderAdaptiveLetterBoxes(
                                  wordStr,
                                  currentRowInputs,
                                  activeSlot,
                                  isBatchSubmitted ? (isRowCorrect ? 'success' : 'error') : 'idle',
                                  result?.wrongIndices || [],
                                  slotIndex => {
                                    setListRowActiveSlot(prev => ({
                                      ...prev,
                                      [item.id]: slotIndex,
                                    }));
                                  },
                                  letterBoxStyle === 'first_last',
                                  true
                                )}
                              </div>
                            )}
                          </td>

                          {/* 状态列 */}
                          <td className="py-3 px-3 text-center">
                            {!isBatchSubmitted ? (
                              hasEntered ? (
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#2C2C2C]" />
                              ) : (
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#E0DBCF]" />
                              )
                            ) : isRowCorrect ? (
                              <Check className="w-5 h-5 text-emerald-600 inline-block stroke-[2.5]" />
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedWrongRows(p => ({
                                    ...p,
                                    [item.id]: !p[item.id],
                                  }))
                                }
                                className="cursor-pointer"
                              >
                                <AlertTriangle className="w-4.5 h-4.5 text-rose-500 inline-block" />
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* 错题展开解析详情行 */}
                        {isRowWrong && (
                          <tr className="bg-rose-50/60 border-b border-rose-100/70 text-xs text-[#555555]">
                            <td colSpan={4} className="py-2.5 px-6">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-rose-700">正确拼写：</span>
                                  <span className="font-mono text-emerald-700 font-bold text-sm tracking-wide">
                                    {wordStr}
                                  </span>
                                  {item.phonetic && (
                                    <span className="font-mono text-[#777777]">
                                      /{item.phonetic}/
                                    </span>
                                  )}
                                  <span className="text-[#444444]">{meaningStr}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => speakWord(wordStr, { onError: onSpeechError })}
                                  className="flex items-center gap-1 text-xs text-[#666666] hover:text-[#2C2C2C] cursor-pointer"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>听发音</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 3. 底部操作栏 (极简固定) */}
            <div className="w-full pt-4 flex items-center justify-between border-t border-[#EAE6DD]/80">
              <div className="text-xs sm:text-sm text-[#666666]">
                已完成 <span className="font-mono font-bold text-[#2C2C2C]">{listBatchStats.completed}</span> / {listBatchStats.total} 词
                {isBatchSubmitted && (
                  <span className="ml-3">
                    · 正确率 <span className="font-mono font-bold text-emerald-600">{listBatchStats.accuracy}%</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {!isBatchSubmitted ? (
                  <>
                    <button
                      type="button"
                      onClick={handleResetBatch}
                      className="px-4 py-2 rounded-xl text-xs sm:text-sm text-[#666666] hover:text-[#2C2C2C] transition-all cursor-pointer"
                    >
                      全部重填
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitBatch}
                      className="px-6 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#2C2C2C] text-white hover:bg-[#1A1A1A] transition-all shadow-xs cursor-pointer"
                    >
                      提交批改
                    </button>
                  </>
                ) : (
                  <>
                    {listBatchStats.hasAnyWrong && (
                      <button
                        type="button"
                        onClick={onProceedToStage4}
                        className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 transition-all cursor-pointer"
                      >
                        将错题加入强化复习
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleNextBatch}
                      className="px-6 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#2C2C2C] text-white hover:bg-[#1A1A1A] transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>
                        {listBatchSize !== 'all' && batchPageIndex < Math.ceil(words.length / (listBatchSize as number)) - 1
                          ? '下一组'
                          : '完成默写'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- 【三、底部进度条统一 (只剩一条 2px 细线)】 ----------------- */}
      <div className="w-full pt-4 pb-2">
        <div className="flex items-center justify-between text-[11px] text-[#888888] font-mono mb-1.5">
          <span>
            今日 {words.length} 词 · 剩余{' '}
            {viewMode === 'word'
              ? Math.max(0, words.length - currentIndex - 1)
              : Math.max(0, words.length - (batchPageIndex + 1) * (listBatchSize === 'all' ? words.length : (listBatchSize as number)))}{' '}
            词
          </span>
          <span>阶段三: 拼写默写</span>
        </div>
        <div className="w-full bg-[#EAE6DD] h-[2px] rounded-full overflow-hidden">
          <div
            className="bg-emerald-600 h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${
                viewMode === 'word'
                  ? Math.round(((currentIndex + 1) / words.length) * 100)
                  : Math.round(
                      (Math.min(
                        words.length,
                        (batchPageIndex + 1) * (listBatchSize === 'all' ? words.length : (listBatchSize as number))
                      ) /
                        words.length) *
                        100
                    )
              }%`,
            }}
          />
        </div>
      </div>

      {/* ----------------- 【四、打印设置弹窗】 ----------------- */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-[20px] border border-[#EAE6DD] max-w-md w-full p-6 shadow-xl relative animate-scaleIn">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(false)}
              className="absolute top-5 right-5 text-[#888888] hover:text-[#2C2C2C] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-[#2C3E46] mb-4">
              导出打印卷设置
            </h3>

            <div className="flex flex-col gap-4 text-xs sm:text-sm text-[#444444]">
              {/* 试卷类型 (不出现括号说明文字) */}
              <div>
                <label className="block text-xs text-[#888888] mb-1.5 font-medium">试卷类型</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintPaperType('single')}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                      printPaperType === 'single'
                        ? 'border-[#2C3E46] bg-[#2C3E46] text-white font-bold'
                        : 'border-[#E6EEF1] text-[#60727B] hover:bg-[#FAFDFB]'
                    }`}
                  >
                    单个拼写卷
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintPaperType('table')}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                      printPaperType === 'table'
                        ? 'border-[#2C3E46] bg-[#2C3E46] text-white font-bold'
                        : 'border-[#E6EEF1] text-[#60727B] hover:bg-[#FAFDFB]'
                    }`}
                  >
                    列表拼写卷
                  </button>
                </div>
              </div>

              {/* 默写方向 */}
              <div>
                <label className="block text-xs text-[#888888] mb-1.5 font-medium">默写方向</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintDirection('cn_to_en')}
                    className={`py-2 px-3 rounded-xl border text-center cursor-pointer transition-all text-xs font-medium ${
                      printDirection === 'cn_to_en'
                        ? 'border-[#2C3E46] bg-[#2C3E46] text-white'
                        : 'border-[#E6EEF1] text-[#60727B] hover:bg-[#FAFDFB]'
                    }`}
                  >
                    中文 → 默写英文
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintDirection('en_to_cn')}
                    className={`py-2 px-3 rounded-xl border text-center cursor-pointer transition-all text-xs font-medium ${
                      printDirection === 'en_to_cn'
                        ? 'border-[#2C3E46] bg-[#2C3E46] text-white'
                        : 'border-[#E6EEF1] text-[#60727B] hover:bg-[#FAFDFB]'
                    }`}
                  >
                    英文 → 默写中文
                  </button>
                </div>
              </div>

              {/* 题目范围 */}
              <div>
                <label className="block text-xs text-[#888888] mb-1.5 font-medium">题目范围</label>
                <select
                  value={printScope}
                  onChange={e => setPrintScope(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-[#E6EEF1] bg-white text-xs text-[#2C3E46] outline-none cursor-pointer"
                >
                  <option value="plan">今日计划</option>
                  <option value="mistakes">全部未掌握</option>
                  <option value="custom_20">自定义抽词 20 词</option>
                  <option value="custom_50">自定义抽词 50 词</option>
                  <option value="custom_100">自定义抽词 100 词</option>
                </select>
              </div>

              {/* 附带答案页 */}
              <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                <input
                  type="checkbox"
                  checked={printWithAnswerKey}
                  onChange={e => setPrintWithAnswerKey(e.target.checked)}
                  className="rounded border-[#CCC5B8] text-emerald-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-medium text-[#333333]">附带答案页</span>
              </label>
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#E6EEF1]">
              <button
                type="button"
                onClick={handleOpenPrintPreview}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-[#444444] bg-[#FAF8F5] hover:bg-[#F2ECE1] border border-[#DDD7CD] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>预览试卷</span>
              </button>
              <button
                type="button"
                onClick={handleDirectPrint}
                className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#2C2C2C] text-white hover:bg-[#1A1A1A] transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>直接打印</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- 【五、真实 A4 试卷预览模态全屏层】 ----------------- */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-[#1e2022]/90 backdrop-blur-sm overflow-y-auto flex flex-col items-center py-6 px-4 animate-fadeIn select-text">
          {/* 预览顶部工具条：← 返回修改 ｜ 第 X / Y 页 ｜ 打印 / 保存 PDF */}
          <div className="sticky top-4 z-20 bg-[#2C2C2C]/95 text-white backdrop-blur shadow-2xl rounded-full px-6 py-2.5 flex items-center gap-5 text-xs font-medium border border-neutral-700">
            <button
              type="button"
              onClick={() => {
                setIsPreviewOpen(false);
                setIsPrintModalOpen(true);
              }}
              className="text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>← 返回修改</span>
            </button>
            <div className="h-3 w-px bg-neutral-600" />
            <span className="text-neutral-300 font-mono">
              第 <span className="text-white font-bold">{activePreviewPage}</span> / {previewPages.length} 页
            </span>
            <div className="h-3 w-px bg-neutral-600" />
            <button
              type="button"
              onClick={() => {
                handleDirectPrint();
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>打印 / 保存 PDF</span>
            </button>
          </div>

          {/* A4 纸张页面列表 */}
          <div
            ref={previewContainerRef}
            className="w-full flex flex-col items-center gap-8 my-6"
            onScroll={e => {
              // 滚动时检测当前视口中最靠近的页码
              const target = e.currentTarget;
              const pages = target.querySelectorAll('[data-a4-page]');
              pages.forEach(p => {
                const rect = p.getBoundingClientRect();
                if (rect.top <= 200 && rect.bottom >= 200) {
                  const pNum = p.getAttribute('data-a4-page');
                  if (pNum) setActivePreviewPage(parseInt(pNum, 10));
                }
              });
            }}
          >
            {/* 注入打印通用样式 */}
            <style dangerouslySetInnerHTML={{ __html: PRINT_COMMON_STYLES }} />

            {previewPages.map((page, idx) => (
              <div
                key={`a4-page-${page.pageNumber}`}
                data-a4-page={page.pageNumber}
                className="w-full max-w-[794px] min-h-[1123px] bg-white text-black shadow-2xl rounded-sm p-[1.8cm_1.6cm] my-2 transition-all relative border border-neutral-300"
                style={{
                  boxSizing: 'border-box',
                }}
                dangerouslySetInnerHTML={{ __html: page.htmlContent }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
