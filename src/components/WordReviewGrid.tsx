import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Volume2,
  Check,
  X,
  Eye,
  RotateCcw,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { WordItem, WordSelection } from '../types';
import { ThemeConfig } from '../types/theme';
import { getDefaultTheme } from '../utils/theme';
import { speakWord } from '../utils/speech';
import { BUILTIN_DICTIONARY } from '../data/dictionary';

interface WordReviewGridProps {
  words: WordItem[];
  selections: Record<string, WordSelection>;
  onSelectKnown: (wordId: string) => void;
  onSelectWrong: (wordId: string) => void;
  onCompleteStage2?: () => void;
  onProceedToStage3?: () => void;
  onOpenPunchIn?: () => void;
  onSpeechError?: (errorMessage: string) => void;
  autoSpeakOnReveal?: boolean;
  currentTheme?: ThemeConfig;
}

/**
 * 阶段二 · 自测改造
 * - 极简自测：中文大字居中，下方输入框或「想不起来 / 看答案」
 * - 点击看答案后显示英文与发音
 * - 判定「正确」继续下一个，「错误」记入错词库
 */
export const WordReviewGrid: React.FC<WordReviewGridProps> = ({
  words,
  selections,
  onSelectKnown,
  onSelectWrong,
  onCompleteStage2,
  onProceedToStage3,
  onSpeechError,
  autoSpeakOnReveal = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [typedInput, setTypedInput] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const currentWord = words[currentIndex];

  const phonetic = useMemo(() => {
    if (!currentWord) return '';
    return currentWord.phonetic || BUILTIN_DICTIONARY[currentWord.word.toLowerCase()]?.phonetic || '';
  }, [currentWord]);

  const targetMeaning = useMemo(() => {
    if (!currentWord) return '暂无中文释义';
    return currentWord.meaning || currentWord.translation || BUILTIN_DICTIONARY[currentWord.word.toLowerCase()]?.meaning || '暂无释义';
  }, [currentWord]);

  const isAllAnswered =
    words.length > 0 &&
    words.every(w => (selections[w.id] || 'unanswered') !== 'unanswered');

  const knownCount = useMemo(() => {
    return words.filter(w => selections[w.id] === 'known').length;
  }, [words, selections]);

  const wrongCount = useMemo(() => {
    return words.filter(w => selections[w.id] === 'wrong').length;
  }, [words, selections]);

  // 切词时重置状态
  useEffect(() => {
    setIsAnswerRevealed(false);
    setTypedInput('');
    setIsAnimating(false);
    // 聚焦输入框
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, [currentIndex, currentWord?.id]);

  const playWord = useCallback((wordStr: string) => {
    speakWord(wordStr, {
      audioUrl: currentWord?.dictAudioUrl || currentWord?.audioUrl || undefined,
      onError: msg => onSpeechError?.(msg),
    });
  }, [currentWord, onSpeechError]);

  // 揭晓答案
  const handleRevealAnswer = useCallback(() => {
    setIsAnswerRevealed(true);
    if (currentWord) {
      playWord(currentWord.word);
    }
  }, [currentWord, playWord]);

  // 流转下一个
  const advanceNext = useCallback(() => {
    if (currentIndex < words.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsAnimating(false);
      }, 120);
    } else {
      onCompleteStage2?.();
    }
  }, [currentIndex, words.length, onCompleteStage2]);

  // 正确判定
  const handleMarkCorrect = useCallback(() => {
    if (!currentWord) return;
    onSelectKnown(currentWord.id);
    advanceNext();
  }, [currentWord, onSelectKnown, advanceNext]);

  // 错误判定：计入错词库
  const handleMarkWrong = useCallback(() => {
    if (!currentWord) return;
    onSelectWrong(currentWord.id);
    advanceNext();
  }, [currentWord, onSelectWrong, advanceNext]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAllAnswered) return;

      if (e.key === 'Enter') {
        if (!isAnswerRevealed) {
          e.preventDefault();
          handleRevealAnswer();
        } else {
          e.preventDefault();
          handleMarkCorrect();
        }
      } else if (e.code === 'Space' && !inputRef.current?.matches(':focus')) {
        e.preventDefault();
        if (currentWord && isAnswerRevealed) playWord(currentWord.word);
      } else if (e.code === 'ArrowRight' && isAnswerRevealed) {
        e.preventDefault();
        handleMarkCorrect();
      } else if (e.code === 'ArrowLeft' && isAnswerRevealed) {
        e.preventDefault();
        handleMarkWrong();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswerRevealed, isAllAnswered, currentWord, handleRevealAnswer, handleMarkCorrect, handleMarkWrong, playWord]);

  if (!currentWord || words.length === 0) {
    return (
      <div className="sunshine-card p-8 text-center text-[#60727B] my-auto max-w-md mx-auto">
        暂无待自测词汇。
      </div>
    );
  }

  // 全部答完展示结算卡
  if (isAllAnswered) {
    return (
      <div className="sunshine-card p-8 sm:p-10 text-center max-w-lg mx-auto shadow-xs animate-fadeIn select-none my-auto">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 stroke-[3]" />
        </div>

        <h3 className="text-xl sm:text-2xl font-serif-en font-bold text-[#2C3E46] mb-2">
          自测批改已完成
        </h3>

        <p className="text-xs sm:text-sm text-[#7B8F99] mb-5">
          共自测 {words.length} 词 · 正确 {knownCount} 词 · 需复习 {wrongCount} 词
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setCurrentIndex(0);
              setIsAnswerRevealed(false);
            }}
            className="w-full sm:w-auto px-5 py-2.5 border border-[#CAD8DF] hover:bg-[#FAFDFB] text-[#60727B] font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>再测一遍</span>
          </button>

          <button
            type="button"
            onClick={onProceedToStage3}
            className="w-full sm:w-auto px-6 py-2.5 bg-acc-grad text-white font-bold rounded-xl text-xs sm:text-sm transition-opacity shadow-xs flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-95"
          >
            <span>进入【阶段三】拼写默写</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col justify-between py-2 select-none animate-fadeIn">
      {/* 顶部单行极简控制区 */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E6EEF1]/80 mb-6 px-1">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#2C3E46] bg-white/80 border border-[#E6EEF1] px-3 py-1 rounded-full shadow-2xs">
            自测回忆
          </span>
          <span className="text-xs font-mono text-[#96A8B0]">
            {currentIndex + 1} / {words.length}
          </span>
        </div>

        <div className="text-[11px] text-[#A6B8BF] font-mono">
          {!isAnswerRevealed ? '按 Enter 查看答案' : '← 没想起来 · → 回忆正确'}
        </div>
      </div>

      {/* 核心自测卡片 */}
      <div
        className={`sunshine-card rounded-[22px] p-8 sm:p-12 flex flex-col items-center justify-center text-center relative transition-all duration-200 min-h-[380px] ${
          isAnimating ? 'opacity-40 scale-98' : 'opacity-100 scale-100'
        }`}
      >
        {/* 中文大字居中（40px-48px 醒目深炭色） */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#2C3E46] tracking-tight leading-snug mb-6 max-w-xl">
          {targetMeaning}
        </h2>

        {/* 答案未揭晓前：输入框或「想不起来 / 看答案」按钮 */}
        {!isAnswerRevealed ? (
          <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4 animate-fadeIn">
            <input
              ref={inputRef}
              type="text"
              value={typedInput}
              onChange={e => setTypedInput(e.target.value)}
              placeholder="可输入英文自查，或直接看答案..."
              className="w-full bg-[#FAFDFB] border border-[#CAD8DF] focus:border-[#38d39f] rounded-2xl px-5 py-3.5 text-center text-base sm:text-lg font-serif-en text-[#2C3E46] outline-none transition-all shadow-2xs"
            />

            <button
              type="button"
              onClick={handleRevealAnswer}
              className="w-full py-3.5 px-6 rounded-full bg-acc-grad text-white font-bold text-xs sm:text-sm transition-all shadow-xs hover:opacity-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              <span>看答案 / 想不起来了 (Enter)</span>
            </button>
          </div>
        ) : (
          /* 答案揭晓后：显示英文与发音 */
          <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-4 animate-fadeIn">
            {/* 英文大字（衬线体） */}
            <div className="flex items-center justify-center gap-3">
              <h1 className="font-serif-en text-4xl sm:text-5xl font-bold text-[#2C3E46] tracking-tight">
                {currentWord.word}
              </h1>
              <button
                type="button"
                onClick={() => playWord(currentWord.word)}
                className="w-8 h-8 rounded-full bg-[#FAFDFB] border border-[#E6EEF1] hover:border-[#38d39f] flex items-center justify-center text-emerald-600 hover:text-emerald-700 transition-colors shadow-2xs cursor-pointer"
                title="播放发音 (空格键)"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {phonetic && (
              <span className="text-sm sm:text-base text-[#7B8F99] font-mono">
                /{phonetic}/
              </span>
            )}

            {/* 用户刚才有输入时对比提示 */}
            {typedInput.trim() && (
              <div className="text-xs font-mono text-[#60727B] bg-[#FAFDFB] px-3 py-1.5 rounded-lg border border-[#E6EEF1]">
                你的输入：<span className={typedInput.trim().toLowerCase() === currentWord.word.toLowerCase() ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{typedInput}</span>
              </div>
            )}

            {/* 判定按钮：正确继续下一个，错误记入错词库 */}
            <div className="flex items-center justify-center gap-4 w-full mt-4">
              <button
                type="button"
                onClick={handleMarkWrong}
                className="flex-1 py-3 px-5 rounded-full border border-red-200 hover:border-red-300 bg-red-50/60 hover:bg-red-50 text-red-600 font-semibold text-xs sm:text-sm transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>没想起来 / 记错了 (←)</span>
              </button>

              <button
                type="button"
                onClick={handleMarkCorrect}
                className="flex-1 py-3 px-5 rounded-full bg-acc-grad text-white font-bold text-xs sm:text-sm transition-all shadow-xs hover:opacity-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>回忆正确 (→)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 底部细线进度条 */}
      <div className="w-full mt-8 pt-2">
        <div className="w-full bg-[#EAE6DD]/70 h-[2px] rounded-full overflow-hidden">
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
