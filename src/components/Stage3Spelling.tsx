import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Award,
  Sparkles,
  Delete
} from 'lucide-react';
import { WordItem } from '../types';
import { ThemeConfig } from '../types/theme';
import { getDefaultTheme } from '../utils/theme';
import { speakWord } from '../utils/speech';
import { recordMistake } from '../utils/storage';
import { updateWordLearningResult } from '../utils/plan';
import { resolveWordEnrichment, WordEnrichmentData } from '../utils/wordEnrichment';

interface Stage3SpellingProps {
  words: WordItem[];
  activeWordbookId?: string;
  onFinishStage3: () => void;
  onProceedToStage4: () => void;
  onSpeechError?: (msg: string) => void;
  onOpenPunchIn?: () => void;
  currentTheme?: ThemeConfig;
}

interface SpellingResult {
  word: WordItem;
  userInput: string;
  isCorrect: boolean;
  usedHint: boolean;
}

export const Stage3Spelling: React.FC<Stage3SpellingProps> = ({
  words,
  activeWordbookId,
  onFinishStage3,
  onProceedToStage4,
  onSpeechError,
  onOpenPunchIn,
  currentTheme = getDefaultTheme(),
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [usedHint, setUsedHint] = useState(false);

  // 反馈状态: 'idle' | 'success' | 'error'
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [mismatchedIndices, setMismatchedIndices] = useState<number[]>([]);
  const [revealedCorrectAnswer, setRevealedCorrectAnswer] = useState<string | null>(null);
  const [enriched, setEnriched] = useState<WordEnrichmentData | null>(null);

  // 结算与计时 (仅在结算页展示总用时)
  const [results, setResults] = useState<SpellingResult[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isAdvancingRef = useRef(false);
  const speechPromiseRef = useRef<Promise<void> | null>(null);

  const currentWord = words[currentIndex];
  const targetWord = (currentWord?.word || '').trim();
  const cleanTargetLetters = targetWord.split('');
  const targetMeaning =
    (currentWord?.meaning || currentWord?.translation || '').trim() || '暂无中文释义';

  // 静默计时
  useEffect(() => {
    if (isCompleted) return;
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isCompleted]);

  // 切换单词
  useEffect(() => {
    if (!currentWord || isCompleted) return;

    setInputVal('');
    setHintsRevealed(0);
    setUsedHint(false);
    setFeedbackStatus('idle');
    setMismatchedIndices([]);
    setRevealedCorrectAnswer(null);
    setEnriched(null);
    isAdvancingRef.current = false;
    speechPromiseRef.current = null;

    resolveWordEnrichment(currentWord)
      .then(res => {
        if (res) setEnriched(res);
      })
      .catch(() => {});
  }, [currentIndex, isCompleted, currentWord?.id]);

  const playPronunciation = (wordStr: string): Promise<void> => {
    const promise = speakWord(wordStr, {
      audioUrl: currentWord?.dictAudioUrl || currentWord?.audioUrl || enriched?.audioUrl || undefined,
      onError: msg => onSpeechError?.(msg),
    });
    speechPromiseRef.current = promise;
    return promise;
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m > 0 ? `${m}分` : ''}${s}秒`;
  };

  // 提示：揭示下一个字母
  const handleUseHint = () => {
    if (feedbackStatus !== 'idle' || isAdvancingRef.current || !targetWord) return;

    setUsedHint(true);
    const nextRevealedCount = Math.min(hintsRevealed + 1, targetWord.length - 1);
    setHintsRevealed(nextRevealedCount);

    const revealedPrefix = targetWord.slice(0, 1 + nextRevealedCount);
    if (inputVal.length < revealedPrefix.length) {
      setInputVal(revealedPrefix);
    }
  };

  // 屏幕键盘与物理键盘统一字符输入
  const handleCharInput = (char: string) => {
    if (feedbackStatus !== 'idle' || isAdvancingRef.current || !targetWord) return;
    if (inputVal.length >= targetWord.length) return;

    const nextVal = inputVal + char.toLowerCase();
    setInputVal(nextVal);

    // 自动判定：当填满时自动触发校验
    if (nextVal.length === targetWord.length) {
      checkSpelling(nextVal);
    }
  };

  const handleBackspace = () => {
    if (feedbackStatus !== 'idle' || isAdvancingRef.current) return;
    setInputVal(prev => prev.slice(0, -1));
  };

  // 监听物理键盘输入
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted || !currentWord) return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleCharInput(e.key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputVal, feedbackStatus, targetWord, isCompleted, currentWord]);

  // 拼写校验
  const checkSpelling = (submittedInput: string) => {
    if (isAdvancingRef.current || !currentWord) return;
    isAdvancingRef.current = true;

    const isMatch = submittedInput.toLowerCase().trim() === targetWord.toLowerCase().trim();

    if (isMatch) {
      setFeedbackStatus('success');
      setMismatchedIndices([]);

      updateWordLearningResult(
        activeWordbookId || currentWord.wordbook_id || 'wb_default_core',
        currentWord.id,
        true
      );

      setResults(prev => [
        ...prev,
        {
          word: currentWord,
          userInput: submittedInput,
          isCorrect: true,
          usedHint,
        },
      ]);

      setTimeout(() => {
        void advanceToNextWord();
      }, 700);
    } else {
      setFeedbackStatus('error');
      setRevealedCorrectAnswer(targetWord);

      const wrongs: number[] = [];
      for (let i = 0; i < targetWord.length; i++) {
        if ((submittedInput[i] || '').toLowerCase() !== targetWord[i].toLowerCase()) {
          wrongs.push(i);
        }
      }
      setMismatchedIndices(wrongs);

      recordMistake(currentWord.id);
      updateWordLearningResult(
        activeWordbookId || currentWord.wordbook_id || 'wb_default_core',
        currentWord.id,
        false
      );

      setResults(prev => [
        ...prev,
        {
          word: currentWord,
          userInput: submittedInput,
          isCorrect: false,
          usedHint,
        },
      ]);

      playPronunciation(targetWord);

      setTimeout(() => {
        void advanceToNextWord();
      }, 1800);
    }
  };

  const advanceToNextWord = async () => {
    const speech = speechPromiseRef.current || playPronunciation(targetWord);
    await speech;
    await new Promise<void>(resolve => setTimeout(resolve, 3000));

    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setResults([]);
    setIsCompleted(false);
    setElapsedSeconds(0);
  };

  // 两行 QWERTY 键盘布局
  // 行1: 13键 (Q W E R T Y U I O P A S D)
  // 行2: 13键 + ⌫退格 (F G H J K L Z X C V B N M + ⌫)
  const keyboardRow1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D'];
  const keyboardRow2 = ['F', 'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B', 'N', 'M'];

  // ---------------- 【完成总结界面】 ----------------
  if (isCompleted) {
    const totalCount = words.length;
    const perfectCount = results.filter(r => r.isCorrect && !r.usedHint).length;
    const correctCount = results.filter(r => r.isCorrect).length;
    const accuracy = totalCount > 0 ? Math.round((perfectCount / totalCount) * 100) : 0;
    const misspelledList = results.filter(r => !r.isCorrect);

    return (
      <div className="w-[82%] sm:w-[78%] max-w-[420px] mx-auto bg-white rounded-[16px] border border-[#B9D8C3] p-6 sm:p-8 text-center shadow-xs animate-fadeIn select-none">
        <div className="w-14 h-14 rounded-full bg-[#D7E8DD] text-[#234E35] flex items-center justify-center mx-auto mb-3">
          <Award className="w-8 h-8" />
        </div>

        <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2C2C2C] mb-1">
          阶段三 · 拼写默写完成！
        </h2>
        <p className="text-xs text-[#666666] mb-5">
          拼写记忆得到深度强化，抗遗忘数据已自动同步
        </p>

        {/* 统计指标卡 */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-[#FAF7F0] p-2.5 rounded-xl border border-[#EAE6DD]">
            <span className="text-[10px] text-[#888888] block">独立全对率</span>
            <span className="text-lg font-mono font-bold text-[#234E35]">{accuracy}%</span>
          </div>
          <div className="bg-[#FAF7F0] p-2.5 rounded-xl border border-[#EAE6DD]">
            <span className="text-[10px] text-[#888888] block">全对词数</span>
            <span className="text-lg font-mono font-bold text-[#2C2C2C]">
              {correctCount} / {totalCount}
            </span>
          </div>
          <div className="bg-[#FAF7F0] p-2.5 rounded-xl border border-[#EAE6DD]">
            <span className="text-[10px] text-[#888888] block">总计用时</span>
            <span className="text-lg font-mono font-bold text-[#2C2C2C]">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* 拼错词列表 */}
        {misspelledList.length > 0 && (
          <div className="mb-5 text-left">
            <span className="text-xs font-bold text-rose-700 flex items-center gap-1 mb-1.5 px-0.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>拼错词 ({misspelledList.length} 词，已入错题本)</span>
            </span>
            <div className="max-h-40 overflow-y-auto space-y-1.5 border border-rose-200 bg-rose-50/30 rounded-xl p-2.5">
              {misspelledList.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-2 rounded-lg border border-rose-100 flex items-center justify-between text-xs"
                >
                  <span className="font-serif font-bold text-rose-800">{item.word.word}</span>
                  <span className="text-[11px] text-[#777777] truncate max-w-[150px]">
                    {item.word.meaning || item.word.translation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作动作按钮组 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {misspelledList.length > 0 ? (
            <button
              type="button"
              onClick={onProceedToStage4}
              className="w-full sm:w-auto h-[48px] px-6 bg-[#C53030] hover:bg-[#9B2C2C] text-white font-bold rounded-xl text-sm transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>进入【阶段四】消除错词</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onFinishStage3}
              className="w-full sm:w-auto h-[48px] px-6 bg-[#2C2C2C] hover:bg-[#1A1A1A] text-white font-bold rounded-xl text-sm transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>完成今日默写</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleRestart}
            className="w-full sm:w-auto h-[40px] px-4 border border-[#EAE6DD] hover:bg-[#F4F0E8] text-[#666666] font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>再练一遍</span>
          </button>

          {onOpenPunchIn && (
            <button
              type="button"
              onClick={onOpenPunchIn}
              className="w-full sm:w-auto h-[40px] px-4 bg-[#FAF3E8] border border-[#EAE6DD] hover:bg-[#F2E8D8] text-[#2C2C2C] font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>📸 打卡海报</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!currentWord || words.length === 0) {
    return (
      <div className="w-[82%] sm:w-[78%] max-w-[420px] mx-auto bg-white rounded-[16px] border border-[#EAE6DD] p-8 text-center text-[#666666]">
        暂无可拼写词汇。
      </div>
    );
  }

  // 构造字母格子 (无独立外部输入框，格子即输入区)
  const displaySlots = cleanTargetLetters.map((letter, idx) => {
    const isFirstLetter = idx === 0;
    const isRevealedByHint = idx <= hintsRevealed;
    const userChar = inputVal[idx] || '';

    let charToShow = '';
    if (userChar) {
      charToShow = idx === 0 ? userChar.toUpperCase() : userChar.toLowerCase();
    } else if (isFirstLetter) {
      charToShow = letter.toUpperCase();
    } else if (isRevealedByHint) {
      charToShow = letter.toLowerCase();
    }

    const isMismatched = mismatchedIndices.includes(idx);
    const isSuccess = feedbackStatus === 'success';

    return {
      index: idx,
      char: charToShow,
      isMismatched,
      isSuccess,
      hasChar: !!charToShow,
    };
  });

  return (
    <div className="w-[82%] sm:w-[78%] max-w-[420px] mx-auto flex flex-col gap-6 animate-fadeIn select-none">
      {/* 顶部指示条 (无实时秒表，仅显示进度与提示) */}
      <div className="flex items-center justify-between text-xs text-[#666666] px-1 font-mono">
        <span className="font-sans font-medium text-[#2C2C2C]">
          拼写默写 · 听辨与键入
        </span>
        <div className="flex items-center gap-2">
          {usedHint && (
            <span className="text-amber-800 bg-amber-100 text-[10px] px-1.5 py-0.2 rounded font-sans font-semibold">
              已用提示
            </span>
          )}
          <span className="font-bold text-[#2C2C2C] bg-[#FAF7F0] border border-[#EAE6DD] px-2 py-0.5 rounded-md">
            {currentIndex + 1} / {words.length}
          </span>
        </div>
      </div>

      {/* 
        核心内容卡片 (内含：中文释义 + 听发音 + 字母格子 + 底部固定2行QWERTY键盘)
        圆角 16px，卡片占屏焦点
      */}
      <div
        style={{
          backgroundColor: currentTheme.cardBg,
          borderColor: currentTheme.borderColor,
          color: currentTheme.textColor,
        }}
        className="rounded-[16px] border p-5 sm:p-6 shadow-sm flex flex-col items-center justify-between gap-4 min-h-[360px] relative transition-colors"
      >
        {/* 卡片上部：中文释义与听音 */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <span className="text-[11px] text-[#888888] font-medium">中文释义</span>
          <p className="font-sans text-2xl sm:text-3xl font-bold leading-snug tracking-tight text-[#2C2C2C] text-center">
            {targetMeaning}
          </p>

          <button
            type="button"
            onClick={() => playPronunciation(targetWord)}
            className="mt-1 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all bg-[#FAF7F0] border border-[#EAE6DD] hover:bg-[#F2E8D8] text-[#2C2C2C] cursor-pointer shadow-2xs"
            title="听发音辅助"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>听音辅助</span>
          </button>
        </div>

        {/* 卡片中部：字母格子 (点击键盘字母直接填充格子，无多余输入框) */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-full my-2">
          {displaySlots.map(slot => {
            let borderBgClass = 'border-[#D0C9BC] bg-white text-[#2C2C2C]';

            if (feedbackStatus === 'success') {
              borderBgClass = 'border-emerald-500 bg-emerald-50 text-emerald-800 animate-pulse';
            } else if (feedbackStatus === 'error') {
              if (slot.isMismatched) {
                borderBgClass = 'border-rose-500 bg-rose-100 text-rose-800 animate-shake';
              } else {
                borderBgClass = 'border-emerald-500 bg-emerald-50 text-emerald-800';
              }
            } else if (slot.hasChar) {
              borderBgClass = 'border-[#2C2C2C] bg-[#FAF7F0] text-[#2C2C2C] shadow-2xs';
            }

            return (
              <div
                key={slot.index}
                className={`w-8 h-10 sm:w-9 sm:h-11 rounded-xl border-2 flex items-center justify-center text-base sm:text-lg font-mono font-bold transition-all ${borderBgClass}`}
              >
                {slot.char ? slot.char : <span className="text-[#CCCCCC] font-mono text-xs">_</span>}
              </div>
            );
          })}
        </div>

        {/* 错误时的正确答案展示 */}
        {revealedCorrectAnswer && feedbackStatus === 'error' && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-1.5 rounded-xl text-xs font-mono font-bold animate-fadeIn w-full text-center">
            正确答案: <span className="underline ml-1 text-sm tracking-wide">{revealedCorrectAnswer}</span>
          </div>
        )}

        {/* 拼写反馈时的真实生活场景例句提示 */}
        {feedbackStatus !== 'idle' && enriched?.exampleEn && (
          <div className="bg-[#FAF7F0] border border-[#EAE6DD] rounded-xl p-2.5 text-left text-xs w-full animate-fadeIn shadow-2xs">
            <div className="flex items-center justify-between text-[10px] text-[#888888] mb-1">
              <span className="font-semibold text-emerald-800">生活场景例句</span>
              {enriched.collocations?.[0] && (
                <span className="text-[#666666]">搭配: {enriched.collocations[0]}</span>
              )}
            </div>
            <p className="font-serif font-medium text-[#2C2C2C] leading-snug">{enriched.exampleEn}</p>
            {enriched.exampleCn && (
              <p className="text-[11px] text-[#666666] mt-0.5">{enriched.exampleCn}</p>
            )}
          </div>
        )}

        {/* 卡片底部工具小条 (💡提示) */}
        <div className="w-full flex items-center justify-end px-1">
          <button
            type="button"
            onClick={handleUseHint}
            disabled={feedbackStatus !== 'idle'}
            className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Lightbulb className="w-3 h-3 text-amber-600 fill-current" />
            <span>提示下一个字母</span>
          </button>
        </div>

        {/* 
          卡片底部固定：两行 QWERTY 屏幕键盘 
          直接点击填充格子
        */}
        <div className="w-full bg-[#FAF7F0] border border-[#EAE6DD] rounded-xl p-2 flex flex-col gap-1.5 shadow-2xs">
          {/* 行 1: Q W E R T Y U I O P A S D (13 键) */}
          <div className="flex justify-between gap-1 w-full">
            {keyboardRow1.map(key => (
              <button
                key={key}
                type="button"
                onClick={() => handleCharInput(key)}
                disabled={feedbackStatus !== 'idle'}
                className="flex-1 h-9 sm:h-10 bg-white active:bg-[#EAE6DD] border border-[#DDD7CC] hover:border-[#2C2C2C] rounded-lg text-xs sm:text-sm font-bold text-[#2C2C2C] shadow-2xs flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
              >
                {key}
              </button>
            ))}
          </div>

          {/* 行 2: F G H J K L Z X C V B N M + ⌫退格 (14 键) */}
          <div className="flex justify-between gap-1 w-full">
            {keyboardRow2.map(key => (
              <button
                key={key}
                type="button"
                onClick={() => handleCharInput(key)}
                disabled={feedbackStatus !== 'idle'}
                className="flex-1 h-9 sm:h-10 bg-white active:bg-[#EAE6DD] border border-[#DDD7CC] hover:border-[#2C2C2C] rounded-lg text-xs sm:text-sm font-bold text-[#2C2C2C] shadow-2xs flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
              >
                {key}
              </button>
            ))}

            {/* 退格按键 */}
            <button
              type="button"
              onClick={handleBackspace}
              disabled={feedbackStatus !== 'idle' || inputVal.length === 0}
              className="flex-1.5 h-9 sm:h-10 bg-[#EFE9DC] active:bg-[#E2DAC9] border border-[#DDD7CC] rounded-lg text-xs font-bold text-[#444444] shadow-2xs flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
              title="退格"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
