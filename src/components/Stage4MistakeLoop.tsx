import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Check,
  X,
  Eye,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Flame,
  AlertTriangle,
  Award,
  Sparkles
} from 'lucide-react';
import { WordItem, MistakeItem } from '../types';
import { ThemeConfig } from '../types/theme';
import { getDefaultTheme } from '../utils/theme';
import { speakWord } from '../utils/speech';
import {
  resolveMistakeInSession,
  recordMistake,
  appendReviewLogs,
  getUserId,
  getTodayDateString,
  getMistakeBook
} from '../utils/storage';
import { updateWordLearningResult } from '../utils/plan';
import { resolveWordEnrichment, WordEnrichmentData } from '../utils/wordEnrichment';

interface Stage4MistakeLoopProps {
  allWordsMap: Record<string, WordItem>;
  initialMistakes: MistakeItem[];
  activeWordbookId?: string;
  onFinishStage4: () => void;
  onSpeechError?: (msg: string) => void;
  autoSpeakOnReveal?: boolean;
  currentTheme?: ThemeConfig;
  onOpenPunchIn?: () => void;
}

export const Stage4MistakeLoop: React.FC<Stage4MistakeLoopProps> = ({
  allWordsMap,
  initialMistakes,
  activeWordbookId,
  onFinishStage4,
  onSpeechError,
  autoSpeakOnReveal = false,
  currentTheme = getDefaultTheme(),
  onOpenPunchIn,
}) => {
  // 当前轮次剩余待消除的错词 ID 队列
  const [activeQueue, setActiveQueue] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalInitialCount, setTotalInitialCount] = useState(0);
  const [stillWrongIdsInCurrentRound, setStillWrongIdsInCurrentRound] = useState<string[]>([]);
  const [conqueredWordIds, setConqueredWordIds] = useState<string[]>([]);

  const [isMeaningRevealed, setIsMeaningRevealed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [enriched, setEnriched] = useState<WordEnrichmentData | null>(null);
  const [revealNotice, setRevealNotice] = useState<string | null>(null);

  // 初始化错题池
  useEffect(() => {
    const sorted = [...initialMistakes].sort((a, b) => b.errorCount - a.errorCount);
    const validIds = sorted.map(m => m.wordId).filter(id => !!allWordsMap[id]);

    setActiveQueue(validIds);
    setTotalInitialCount(validIds.length);
    setCurrentIndex(0);
    setRoundNumber(1);
    setStillWrongIdsInCurrentRound([]);

    if (validIds.length === 0) {
      setIsFinished(true);
    } else {
      setIsFinished(false);
    }
  }, [initialMistakes, allWordsMap]);

  const currentWordId = activeQueue[currentIndex];
  const currentWord = currentWordId ? allWordsMap[currentWordId] : null;

  useEffect(() => {
    setIsMeaningRevealed(false);
    setIsTransitioning(false);
    setEnriched(null);

    if (currentWord) {
      resolveWordEnrichment(currentWord)
        .then(res => {
          if (res) {
            setEnriched(res);
          }
        })
        .catch(() => {});
    }
  }, [currentIndex, roundNumber, currentWord?.id]);

  const playCurrentWord = (wordStr: string) => {
    speakWord(wordStr, {
      audioUrl: currentWord?.dictAudioUrl || currentWord?.audioUrl || enriched?.audioUrl || undefined,
      onError: msg => onSpeechError?.(msg),
    });
  };

  const handleReveal = () => {
    setIsMeaningRevealed(true);
    if (autoSpeakOnReveal && currentWord) {
      playCurrentWord(currentWord.word);
    }
  };

  // 轮转推进逻辑
  const processNextStep = (isKnown: boolean) => {
    if (!currentWordId) return;

    let updatedWrongIds = [...stillWrongIdsInCurrentRound];

    if (isKnown) {
      // 攻克当前轮次错词：标记本轮消除，增加连续掌握计数，但永久保留历史错误记录！
      resolveMistakeInSession(currentWordId);
      // 更新抗遗忘记忆：掌握后延长复习间隔 (D+1 -> D+2 -> D+4)
      updateWordLearningResult(activeWordbookId || currentWord?.wordbook_id || 'wb_default_core', currentWordId, true);
      // 记录流水日志
      appendReviewLogs([
        {
          id: `log_stage4_${Date.now()}_${currentWordId}`,
          user_id: getUserId(),
          word_id: currentWordId,
          wordbook_id: activeWordbookId || currentWord?.wordbook_id || 'wb_default_core',
          session_id: `sess_stage4_${getTodayDateString()}`,
          round_id: roundNumber,
          review_stage: 'stage2_mistake_review',
          result: 'known',
          timestamp: Date.now(),
          learning_date: getTodayDateString(),
        },
      ]);
      setConqueredWordIds(prev => prev.includes(currentWordId) ? prev : [...prev, currentWordId]);
    } else {
      // 仍然答错，再次累计错误次数，提高优先级，并重置抗遗忘间隔为 D+1
      recordMistake(currentWordId);
      updateWordLearningResult(activeWordbookId || currentWord?.wordbook_id || 'wb_default_core', currentWordId, false);
      appendReviewLogs([
        {
          id: `log_stage4_${Date.now()}_${currentWordId}_wrong`,
          user_id: getUserId(),
          word_id: currentWordId,
          wordbook_id: activeWordbookId || currentWord?.wordbook_id || 'wb_default_core',
          session_id: `sess_stage4_${getTodayDateString()}`,
          round_id: roundNumber,
          review_stage: 'stage2_mistake_review',
          result: 'wrong',
          timestamp: Date.now(),
          learning_date: getTodayDateString(),
        },
      ]);
      if (!updatedWrongIds.includes(currentWordId)) {
        updatedWrongIds.push(currentWordId);
      }
      setStillWrongIdsInCurrentRound(updatedWrongIds);
    }

    // 判断本轮是否还有未答错词
    if (currentIndex < activeQueue.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 150);
    } else {
      // 本轮结束，检查是否还有残留错词
      if (updatedWrongIds.length === 0) {
        // 全部清零！
        setActiveQueue([]);
        setIsFinished(true);
      } else {
        // 开启下一轮错题清洗
        setActiveQueue(updatedWrongIds);
        setStillWrongIdsInCurrentRound([]);
        setCurrentIndex(0);
        setRoundNumber(r => r + 1);
      }
    }
  };

  const handleKnownClick = () => {
    if (isTransitioning || !currentWord) return;
    if (!isMeaningRevealed) {
      handleReveal();
      setRevealNotice('已揭晓释义！请核对是否与您回忆一致，确认记对后点击 ✓');
      return;
    }
    processNextStep(true);
  };

  const handleWrongClick = () => {
    if (isTransitioning || !currentWord) return;
    setIsMeaningRevealed(true);
    playCurrentWord(currentWord.word);
    setRevealNotice('仍未掌握 · 再次累计错误次数并留在循环中');
    setTimeout(() => {
      processNextStep(false);
    }, 1200);
  };

  // ---------------- 【空错题初始/完成界面】 ----------------
  if (totalInitialCount === 0 || isFinished) {
    const mistakeBook = getMistakeBook();
    const conqueredList = conqueredWordIds
      .map(id => ({
        word: allWordsMap[id],
        stats: mistakeBook[id],
      }))
      .filter(item => Boolean(item.word));

    return (
      <div className="w-[82%] sm:w-[78%] max-w-[420px] mx-auto bg-white rounded-[16px] border border-[#B9D8C3] p-6 sm:p-8 text-center shadow-xs animate-fadeIn select-none">
        <div className="w-14 h-14 rounded-full bg-[#D7E8DD] text-[#234E35] flex items-center justify-center mx-auto mb-3">
          <Award className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2C2C2C] mb-1">
          🎉 今日错题循环已全部攻克！
        </h2>
        <p className="text-xs sm:text-sm text-[#666666] mb-4">
          已成功攻克全部薄弱词，抗遗忘闭环达成！系统已完整保留历史错误记录，并已按记忆模型自动延后复习间隔（D+1 / D+2 / D+4），到期将按计划继续巩固。
        </p>

        {/* 本次攻克错词明细 */}
        {conqueredList.length > 0 && (
          <div className="mb-5 bg-[#FAF7F0] border border-[#EAE6DD] rounded-xl p-3 text-left">
            <span className="text-[11px] font-bold text-[#234E35] block mb-2">
              ✓ 今日已强化巩固的薄弱词 ({conqueredList.length} 词 · 已顺延复习间隔)：
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
              {conqueredList.map((item, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-white text-[#2C2C2C] border border-[#EAE6DD] px-2 py-0.5 rounded-md font-sans flex items-center gap-1 shadow-2xs"
                >
                  <strong className="font-serif">{item.word.word}</strong>
                  <span className="text-[10px] text-rose-700 bg-rose-50 px-1 rounded font-mono">
                    错 {item.stats?.errorCount || 1} 次
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onFinishStage4}
            className="w-full sm:w-auto h-[48px] px-6 bg-[#2C2C2C] hover:bg-[#1A1A1A] text-white font-bold rounded-xl text-sm transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>完成今日学习闭环</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {onOpenPunchIn && (
            <button
              type="button"
              onClick={onOpenPunchIn}
              className="w-full sm:w-auto h-[40px] px-4 bg-[#FAF3E8] border border-[#EAE6DD] hover:bg-[#F2E8D8] text-[#2C2C2C] font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>📸 生成打卡海报</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="w-[82%] sm:w-[78%] max-w-[420px] mx-auto bg-white rounded-[16px] border border-[#EAE6DD] p-8 text-center text-[#666666]">
        暂无错词。
      </div>
    );
  }

  const targetMeaning = currentWord.meaning || currentWord.translation || '暂无释义';
  const phonetic = currentWord.phonetic || enriched?.phonetic || '';
  const currentExample = currentWord.exampleEn || currentWord.exampleSentence || enriched?.exampleEn || '';
  const currentExampleCn = currentWord.exampleCn || enriched?.exampleCn || '';

  return (
    <div className="w-[82%] sm:w-[78%] max-w-[420px] mx-auto flex flex-col gap-6 animate-fadeIn select-none">
      {/* 顶部指示条 */}
      <div className="flex items-center justify-between text-xs text-[#666666] px-1 font-mono">
        <span className="font-sans font-medium text-[#2C2C2C] flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-rose-600" />
          <span>错题消除第 {roundNumber} 轮</span>
        </span>
        <span className="font-bold text-[#2C2C2C] bg-[#FAF7F0] border border-[#EAE6DD] px-2 py-0.5 rounded-md">
          {currentIndex + 1} / {activeQueue.length}
        </span>
      </div>

      {/* 提示条 (若有) */}
      {revealNotice && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 text-center text-xs text-amber-900 font-medium animate-fadeIn">
          {revealNotice}
        </div>
      )}

      {/* 核心一屏一词错题卡 */}
      <div
        key={currentWord.id}
        style={{
          backgroundColor: currentTheme.cardBg,
          borderColor: currentTheme.borderColor,
          color: currentTheme.textColor,
        }}
        onClick={!isMeaningRevealed ? handleReveal : undefined}
        className={`rounded-[16px] border p-6 sm:p-8 shadow-sm flex flex-col items-center justify-center text-center gap-5 min-h-[300px] sm:min-h-[320px] relative transition-all duration-200 ${
          !isMeaningRevealed ? 'cursor-pointer' : ''
        } group ${
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
        <div className="w-full flex flex-col items-center justify-center min-h-[72px]">
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
                  <p className="text-xs text-[#333333] leading-relaxed font-sans">
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
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-[#888888]">主动回忆该错词的中文释义与原句</p>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleReveal();
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-[#234E35] bg-[#E8F2EC] hover:bg-[#D7E8DD] border border-[#B9D8C3] px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
              >
                <Eye className="w-4 h-4 text-[#234E35]" />
                <span>点击揭晓释义与例句</span>
              </button>
            </div>
          )}
        </div>

        {/* 对/错两个圆形按钮 (直径 52px, 居中并排) */}
        <div
          onClick={e => e.stopPropagation()}
          className="flex items-center justify-center gap-8 w-full pt-1"
        >
          {/* 红✕ 按钮 (错 / 留在循环) */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={handleWrongClick}
              className="w-[52px] h-[52px] rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
              title="依然记错 (✕ 循环重测)"
            >
              <X className="w-7 h-7 stroke-[2.5]" />
            </button>
            <span className="text-[11px] font-medium text-rose-700">依然记错</span>
          </div>

          {/* 绿√ 按钮 (对 / 清除本轮错题) */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={handleKnownClick}
              className={`w-[52px] h-[52px] rounded-full text-white flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer ${
                isMeaningRevealed
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-emerald-600/70 hover:bg-emerald-600'
              }`}
              title={isMeaningRevealed ? "本轮已掌握 (✓)" : "请先揭晓答案核对"}
            >
              <Check className="w-7 h-7 stroke-[2.5]" />
            </button>
            <span className="text-[11px] font-medium text-[#234E35]">
              {isMeaningRevealed ? '本轮已掌握' : '先揭晓核对'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
