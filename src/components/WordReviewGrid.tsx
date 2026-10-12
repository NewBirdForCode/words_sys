import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Check,
  X,
  Eye,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { WordItem, WordSelection } from '../types';
import { ThemeConfig } from '../types/theme';
import { getDefaultTheme } from '../utils/theme';
import { speakWord } from '../utils/speech';
import { resolveWordEnrichment, WordEnrichmentData } from '../utils/wordEnrichment';

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

export const WordReviewGrid: React.FC<WordReviewGridProps> = ({
  words,
  selections,
  onSelectKnown,
  onSelectWrong,
  onCompleteStage2,
  onProceedToStage3,
  onOpenPunchIn,
  onSpeechError,
  autoSpeakOnReveal = false,
  currentTheme = getDefaultTheme(),
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMeaningRevealed, setIsMeaningRevealed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [enriched, setEnriched] = useState<WordEnrichmentData | null>(null);
  const speechPromiseRef = useRef<Promise<void> | null>(null);

  const currentWord = words[currentIndex];

  // 检查是否全部答完
  const isAllAnswered = words.length > 0 && words.every(w => (selections[w.id] || 'unanswered') !== 'unanswered');
  const wrongWords = words.filter(w => selections[w.id] === 'wrong');
  const knownWords = words.filter(w => selections[w.id] === 'known');

  // 当切换到新词时，重置翻看状态并富集例句与音标
  useEffect(() => {
    setIsMeaningRevealed(false);
    setIsTransitioning(false);
    setEnriched(null);
    speechPromiseRef.current = null;

    if (currentWord) {
      resolveWordEnrichment(currentWord)
        .then(res => {
          if (res) {
            setEnriched(res);
          }
        })
        .catch(() => {});
    }
  }, [currentIndex, currentWord?.id]);

  const playCurrentWord = (wordStr: string): Promise<void> => {
    const promise = speakWord(wordStr, {
      audioUrl: currentWord?.dictAudioUrl || currentWord?.audioUrl || enriched?.audioUrl || undefined,
      onError: msg => onSpeechError?.(msg),
    });
    speechPromiseRef.current = promise;
    return promise;
  };

  const handleReveal = () => {
    setIsMeaningRevealed(true);
    if (autoSpeakOnReveal && currentWord) {
      playCurrentWord(currentWord.word);
    }
  };

  const advanceNext = async (transitionAlreadyStarted = false) => {
    if (!currentWord || (!transitionAlreadyStarted && isTransitioning)) return;
    if (!transitionAlreadyStarted) setIsTransitioning(true);

    // 不使用固定的短延迟猜测音频长度：Windows 音频可能因网络或语音包不同而变长。
    const speech = speechPromiseRef.current || playCurrentWord(currentWord.word);
    await speech;
    await new Promise<void>(resolve => setTimeout(resolve, 3000));

    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onCompleteStage2?.();
    }
  };

  const handleKnownClick = () => {
    if (!currentWord || isTransitioning) return;
    onSelectKnown(currentWord.id);
    void advanceNext();
  };

  const handleWrongClick = () => {
    if (!currentWord || isTransitioning) return;
    onSelectWrong(currentWord.id);
    setIsMeaningRevealed(true);
    setIsTransitioning(true);
    void playCurrentWord(currentWord.word).then(() => new Promise<void>(resolve => setTimeout(resolve, 600)))
      .then(() => advanceNext(true));
  };

  // 空词库状态
  if (!currentWord || words.length === 0) {
    return (
      <div className="w-[82%] sm:w-[78%] max-w-[420px] mx-auto bg-white rounded-[16px] border border-[#EAE6DD] p-8 text-center text-[#666666]">
        暂无可自测词汇。
      </div>
    );
  }

  // ---------------- 【完成总结界面】 ----------------
  if (isAllAnswered) {
    return (
      <div className="w-[82%] sm:w-[78%] max-w-[420px] mx-auto bg-white rounded-[16px] border border-[#B9D8C3] p-6 sm:p-8 text-center shadow-xs animate-fadeIn">
        <div className="w-14 h-14 rounded-full bg-[#D7E8DD] text-[#234E35] flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-serif font-bold text-[#2C2C2C] mb-1">
          阶段二自测已完成！
        </h3>
        <p className="text-xs sm:text-sm text-[#666666] mb-5">
          {wrongWords.length === 0
            ? '太棒了！本次自测全部掌握，无错词产生。接下来进入阶段三拼写默写！'
            : `本次自测共掌握 ${knownWords.length} 词，发现 ${wrongWords.length} 个错误单词已自动进入错题队列。`}
        </p>

        {/* 统计指标卡 */}
        <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-[#FAF7F0] rounded-[16px] border border-[#EAE6DD] mb-5">
          <div>
            <span className="text-[11px] text-[#888888] block">已掌握词</span>
            <span className="text-xl font-serif font-bold text-[#234E35]">
              {knownWords.length} / {words.length}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[#888888] block">待巩固错词</span>
            <span className="text-xl font-mono font-bold text-rose-700">
              {wrongWords.length} 词
            </span>
          </div>
        </div>

        {/* 操作动作按钮组 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onProceedToStage3}
            className="w-full sm:w-auto h-[48px] px-6 bg-[#2C2C2C] hover:bg-[#1A1A1A] text-white font-bold rounded-xl text-sm transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>进入【阶段三】拼写默写</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentIndex(0);
              setIsMeaningRevealed(false);
            }}
            className="w-full sm:w-auto h-[40px] px-4 border border-[#EAE6DD] hover:bg-[#F4F0E8] text-[#666666] font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>再测一遍</span>
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

  // ---------------- 【一屏一词主自测卡】 ----------------
  const targetMeaning = currentWord.meaning || currentWord.translation || '暂无中文释义';
  const phonetic = currentWord.phonetic || enriched?.phonetic || '';
  const currentExample = currentWord.exampleEn || currentWord.exampleSentence || enriched?.exampleEn || '';
  const currentExampleCn = currentWord.exampleCn || enriched?.exampleCn || '';

  return (
    <div className="w-[82%] sm:w-[78%] max-w-[420px] mx-auto flex flex-col gap-6 animate-fadeIn select-none">
      {/* 顶部指示条 */}
      <div className="flex items-center justify-between text-xs text-[#666666] px-1 font-mono">
        <span className="font-sans font-medium text-[#2C2C2C]">
          自测批改 · 口头说中文
        </span>
        <span className="font-bold text-[#2C2C2C] bg-[#FAF7F0] border border-[#EAE6DD] px-2 py-0.5 rounded-md">
          {currentIndex + 1} / {words.length}
        </span>
      </div>

      {/* 核心一屏一词卡片 */}
      <div
        key={currentWord.id}
        style={{
          backgroundColor: currentTheme.cardBg,
          borderColor: currentTheme.borderColor,
          color: currentTheme.textColor,
        }}
        onClick={handleReveal}
        className={`rounded-[16px] border p-6 sm:p-8 shadow-sm flex flex-col items-center justify-center text-center gap-5 min-h-[300px] sm:min-h-[320px] relative transition-all duration-200 cursor-pointer group ${
          isTransitioning ? 'opacity-30 scale-98' : 'opacity-100 scale-100'
        }`}
      >
        {/* 英文单词 */}
        <div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#2C2C2C]">
            {currentWord.word}
          </h2>
          {phonetic && (
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <span className="text-xs sm:text-sm text-[#777777] font-sans font-medium">
                {phonetic}
              </span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  playCurrentWord(currentWord.word);
                }}
                className="p-1 rounded-full text-emerald-800 hover:bg-emerald-50 transition-colors"
                title="播放发音"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 释义折叠/展开区 */}
        <div className="w-full flex flex-col items-center justify-center min-h-[68px]">
          {isMeaningRevealed ? (
            <div className="animate-fadeIn w-full bg-[#FAF7F0] border border-[#EAE6DD] rounded-xl p-3 flex flex-col gap-1.5 text-left">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-base sm:text-lg font-bold text-[#2C2C2C] leading-snug">
                  {targetMeaning}
                </p>
                {enriched?.collocations && enriched.collocations[0] && (
                  <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md font-medium">
                    搭配: {enriched.collocations[0]}
                  </span>
                )}
              </div>
              {currentExample && (
                <div className="pt-1 border-t border-[#EAE6DD]/70 space-y-0.5">
                  <p className="text-xs text-[#333333] leading-relaxed">
                    {currentExample}
                  </p>
                  {currentExampleCn && (
                    <p className="text-[11px] text-[#777777] leading-normal">
                      {currentExampleCn}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-[#888888] group-hover:text-[#2C2C2C] bg-[#FAF7F0] border border-[#EAE6DD] px-3.5 py-2 rounded-xl transition-colors">
              <Eye className="w-3.5 h-3.5" />
              <span>点击翻看中文释义</span>
            </div>
          )}
        </div>

        {/* 对/错两个圆形按钮 (直径 52px, 居中并排, 总宽不超过卡片 50%) */}
        <div
          onClick={e => e.stopPropagation()}
          className="flex items-center justify-center gap-8 w-full pt-2"
        >
          {/* 红✕ 按钮 (错 / 不认识) */}
          <button
            type="button"
            onClick={handleWrongClick}
            className="w-[52px] h-[52px] rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
            title="记不清/不认识 (✕)"
          >
            <X className="w-7 h-7 stroke-[2.5]" />
          </button>

          {/* 绿√ 按钮 (对 / 认识) */}
          <button
            type="button"
            onClick={handleKnownClick}
            className="w-[52px] h-[52px] rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
            title="完全认识 (✓)"
          >
            <Check className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
