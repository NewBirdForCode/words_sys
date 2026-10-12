import React, { useState } from 'react';
import { Volume2, Check, X, Eye, EyeOff } from 'lucide-react';
import { WordItem, WordSelection } from '../types';
import { ThemeConfig } from '../types/theme';
import { getDefaultTheme } from '../utils/theme';
import { speakWord } from '../utils/speech';

interface WordCardProps {
  wordItem: WordItem;
  selection: WordSelection;
  onSelectKnown: (wordId: string) => void;
  onSelectWrong: (wordId: string) => void;
  onSpeechError?: (errorMessage: string) => void;
  autoSpeakOnReveal?: boolean; // 可选开关：翻开卡片自动朗读发音
  currentTheme?: ThemeConfig;
}

export const WordCard: React.FC<WordCardProps> = ({
  wordItem,
  selection,
  onSelectKnown,
  onSelectWrong,
  onSpeechError,
  autoSpeakOnReveal = false,
  currentTheme = getDefaultTheme(),
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMeaningVisible, setIsMeaningVisible] = useState(false);

  const meaningText = (wordItem.meaning || wordItem.translation || '').trim() || '暂无中文释义';

  // 触发播放发音函数
  const triggerSpeak = () => {
    setIsPlayingAudio(true);
    const safetyTimer = setTimeout(() => {
      setIsPlayingAudio(false);
    }, 2800);

    speakWord(wordItem.word, {
      onStart: () => setIsPlayingAudio(true),
      onEnd: () => {
        clearTimeout(safetyTimer);
        setIsPlayingAudio(false);
      },
      onError: (msg) => {
        clearTimeout(safetyTimer);
        setIsPlayingAudio(false);
        if (onSpeechError) {
          onSpeechError(msg || '发音加载失败，请重试');
        }
      },
    });
  };

  const handleSpeakClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerSpeak();
  };

  // 翻开卡片查看中文释义
  const handleToggleMeaning = (e: React.MouseEvent) => {
    e.stopPropagation();
    const willShow = !isMeaningVisible;
    setIsMeaningVisible(willShow);

    // 5. 翻开卡片自动朗读发音（由用户点击手势触发，安全合规）
    if (willShow && autoSpeakOnReveal) {
      triggerSpeak();
    }
  };

  const handleKnown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectKnown(wordItem.id);
  };

  const handleWrong = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectWrong(wordItem.id);
  };

  return (
    <div
      id={`word-card-${wordItem.id}`}
      style={{
        backgroundColor:
          selection === 'known'
            ? `${currentTheme.buttonPositiveBg}22`
            : selection === 'wrong'
            ? `${currentTheme.buttonNegativeBg}22`
            : currentTheme.cardBg,
        borderColor:
          selection === 'known'
            ? currentTheme.buttonPositiveBg
            : selection === 'wrong'
            ? currentTheme.buttonNegativeBg
            : currentTheme.borderColor,
      }}
      className="relative rounded-2xl border p-5 sm:p-6 transition-all duration-200 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-3"
    >
      {/* 1. 单词视觉第一中心与喇叭按钮 */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span
          className="font-serif text-3xl sm:text-4xl font-bold tracking-tight select-text break-words"
          style={{ color: currentTheme.textColor }}
        >
          {wordItem.word}
        </span>

        {/* 4. 喇叭图标交互与正在朗读动效 */}
        <button
          type="button"
          onClick={handleSpeakClick}
          style={{
            backgroundColor: `${currentTheme.borderColor}66`,
            color: currentTheme.textColor,
          }}
          className={`relative p-2.5 rounded-full transition-all shrink-0 hover:opacity-80 ${
            isPlayingAudio ? 'scale-110 shadow-xs' : ''
          }`}
          title="发音朗读 (优先美音 en-US)"
          aria-label={`朗读 ${wordItem.word}`}
        >
          <Volume2 className={`w-5 h-5 stroke-[2] ${isPlayingAudio ? 'animate-pulse' : ''}`} />
          {isPlayingAudio && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
          )}
        </button>
      </div>

      {/* 4. 正在朗读轻微提示 */}
      {isPlayingAudio && (
        <div
          className="text-[11px] font-medium -mt-2 animate-fadeIn flex items-center gap-1.5"
          style={{ color: currentTheme.subtextColor }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>正在朗读...</span>
        </div>
      )}

      {/* 恢复中文释义小眼睛 */}
      <div className="py-1">
        <button
          type="button"
          onClick={handleToggleMeaning}
          style={{ color: currentTheme.subtextColor }}
          className="inline-flex items-center gap-1.5 text-xs transition-colors py-1 px-1.5 rounded-md hover:opacity-80"
          title="点击显示/隐藏中文释义"
        >
          {isMeaningVisible ? (
            <>
              <EyeOff className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium" style={{ color: currentTheme.textColor }}>{meaningText}</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span>查看中文释义</span>
            </>
          )}
        </button>
      </div>

      {/* Action Row: ✓ 对 / × 错 */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* ✓ 对 */}
        <button
          type="button"
          onClick={handleKnown}
          style={{
            backgroundColor: selection === 'known' ? currentTheme.buttonPositiveBg : currentTheme.cardBg,
            color: selection === 'known' ? currentTheme.buttonPositiveText : currentTheme.subtextColor,
            borderColor: selection === 'known' ? currentTheme.buttonPositiveBg : currentTheme.borderColor,
          }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
            selection === 'known' ? 'shadow-xs font-bold ring-1 scale-[1.01]' : 'hover:opacity-85'
          }`}
        >
          <Check className="w-4 h-4 stroke-[2.6]" />
          <span>对</span>
        </button>

        {/* × 错 */}
        <button
          type="button"
          onClick={handleWrong}
          style={{
            backgroundColor: selection === 'wrong' ? currentTheme.buttonNegativeBg : currentTheme.cardBg,
            color: selection === 'wrong' ? currentTheme.buttonNegativeText : currentTheme.subtextColor,
            borderColor: selection === 'wrong' ? currentTheme.buttonNegativeBg : currentTheme.borderColor,
          }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
            selection === 'wrong' ? 'shadow-xs font-bold ring-1 scale-[1.01]' : 'hover:opacity-85'
          }`}
        >
          <X className="w-4 h-4 stroke-[2.6]" />
          <span>错</span>
        </button>
      </div>
    </div>
  );
};
