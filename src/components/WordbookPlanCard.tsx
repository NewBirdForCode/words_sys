import React, { useState, useRef, useEffect } from 'react';
import {
  MoreHorizontal,
  Sliders,
  FolderSync,
  ArrowUp,
  ArrowDown,
  Trash2,
  BookOpen,
  CheckCircle2,
  Calendar,
  Sparkles,
  Play,
  RotateCcw
} from 'lucide-react';
import { Wordbook } from '../types';
import { ThemeConfig } from '../types/theme';
import { getDefaultTheme } from '../utils/theme';
import {
  computeWordbookProgress,
  getWordbookDailyNewWords,
  getOrGenerateDailyTaskPool
} from '../utils/plan';

interface WordbookPlanCardProps {
  wordbook: Wordbook;
  isActive: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelectWordbook: (wbId: string) => void;
  onStartNewWords: (wbId: string) => void;
  onStartReviewWords: (wbId: string) => void;
  onOpenCalculator: (wb: Wordbook) => void;
  onSwitchContent: (wb: Wordbook) => void;
  onMoveOrder: (wbId: string, direction: 'up' | 'down') => void;
  onRemoveFromPlan: (wb: Wordbook) => void;
  currentTheme?: ThemeConfig;
}

export const WordbookPlanCard: React.FC<WordbookPlanCardProps> = ({
  wordbook,
  isActive,
  canMoveUp,
  canMoveDown,
  onSelectWordbook,
  onStartNewWords,
  onStartReviewWords,
  onOpenCalculator,
  onSwitchContent,
  onMoveOrder,
  onRemoveFromPlan,
  currentTheme = getDefaultTheme(),
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMenuOpen]);

  const progress = computeWordbookProgress(wordbook.id);
  const dailyNewWords = getWordbookDailyNewWords(wordbook.id);
  const taskPool = getOrGenerateDailyTaskPool(wordbook.id);

  // 今日待学新词与到期复习词
  const todayDueReviewCount = taskPool.reviewWords.length;
  const todayNewWordsCount = taskPool.newWords.length;

  // 计划摘要文本: 如 "每日30词 · 剩17天" 或 "每日30词 · 已刷完"
  const planSummary = progress.remainingNewWords === 0
    ? `每日 ${dailyNewWords} 词 · 全库已刷完`
    : `每日 ${dailyNewWords} 词 · 剩 ${progress.estimatedDaysLeft} 天`;

  return (
    <div
      style={{
        backgroundColor: currentTheme.cardBg,
        borderColor: isActive ? currentTheme.accentColor : currentTheme.borderColor,
      }}
      className={`rounded-2xl border p-4 sm:p-5 shadow-2xs transition-all relative ${
        isActive ? 'ring-2 ring-emerald-800/20' : 'hover:border-[#D5CFBF]'
      }`}
    >
      {/* 顶部标题与菜单栏 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              onClick={() => onSelectWordbook(wordbook.id)}
              className="text-sm sm:text-base font-bold font-serif text-[#2C2C2C] truncate cursor-pointer hover:text-emerald-800 transition-colors"
              title={wordbook.name}
            >
              {wordbook.name}
            </h4>

            {isActive && (
              <span className="text-[10px] font-bold text-[#234E35] bg-emerald-100/90 border border-emerald-200/80 px-2 py-0.5 rounded-full shrink-0">
                当前在学
              </span>
            )}
          </div>

          {/* 计划摘要: 每日30词 · 剩17天 */}
          <div className="flex items-center gap-1.5 text-xs text-[#666666] mt-1">
            <span className="font-medium text-[#444444] bg-[#F4F0E8] px-2 py-0.5 rounded-md text-[11px]">
              {planSummary}
            </span>
            <span className="text-[11px] text-[#888888]">
              （共 {progress.totalWords} 词）
            </span>
          </div>
        </div>

        {/* 右上角 "···" 菜单 */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 text-[#666666] hover:text-[#2C2C2C] hover:bg-[#F4F0E8] rounded-xl transition-colors cursor-pointer"
            title="词库计划设置"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-8 w-44 bg-white rounded-2xl border border-[#EAE6DD] shadow-xl p-1.5 z-40 animate-fadeIn text-xs">
              {/* 1. 修改每日词量 */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenCalculator(wordbook);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-[#2C2C2C] hover:bg-[#F4F0E8] flex items-center gap-2 cursor-pointer font-medium"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-800" />
                <span>修改每日词量</span>
              </button>

              {/* 2. 换词库内容 */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onSwitchContent(wordbook);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-[#2C2C2C] hover:bg-[#F4F0E8] flex items-center gap-2 cursor-pointer font-medium"
              >
                <FolderSync className="w-3.5 h-3.5 text-blue-700" />
                <span>换词库内容</span>
              </button>

              {/* 3. 调整卡片顺序 (上移/下移) */}
              <div className="border-t border-[#EAE6DD]/70 my-1 pt-1">
                <button
                  type="button"
                  disabled={!canMoveUp}
                  onClick={() => {
                    setIsMenuOpen(false);
                    onMoveOrder(wordbook.id, 'up');
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-xl flex items-center gap-2 cursor-pointer ${
                    canMoveUp ? 'text-[#444444] hover:bg-[#F4F0E8]' : 'text-[#CCCCCC] cursor-not-allowed'
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>上移卡片</span>
                </button>
                <button
                  type="button"
                  disabled={!canMoveDown}
                  onClick={() => {
                    setIsMenuOpen(false);
                    onMoveOrder(wordbook.id, 'down');
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-xl flex items-center gap-2 cursor-pointer ${
                    canMoveDown ? 'text-[#444444] hover:bg-[#F4F0E8]' : 'text-[#CCCCCC] cursor-not-allowed'
                  }`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>下移卡片</span>
                </button>
              </div>

              {/* 4. 移出计划 (需二次确认) */}
              <div className="border-t border-[#EAE6DD]/70 my-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onRemoveFromPlan(wordbook);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>移出计划...</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 学习进度条: 已学 X / 共 Y 词 */}
      <div className="mt-3.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#666666]">
            学习进度：<strong className="text-emerald-800 font-mono">{progress.learnedWords}</strong> / {progress.totalWords} 词
          </span>
          <span className="font-mono font-bold text-xs text-[#444444]">
            {progress.progressPercent}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#EAE6DD] overflow-hidden">
          <div
            className="h-full rounded-full bg-linear-to-r from-emerald-600 to-[#234E35] transition-all duration-300"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
      </div>

      {/* 卡片底部两个主按钮: "新学(今日待学N词)"、"复习(今日到期X词)" */}
      <div className="mt-4 pt-3 border-t border-[#EAE6DD]/80 grid grid-cols-2 gap-2.5">
        {/* 新学按钮 */}
        <button
          type="button"
          onClick={() => {
            onSelectWordbook(wordbook.id);
            onStartNewWords(wordbook.id);
          }}
          className="px-3 py-2 rounded-xl text-xs font-bold bg-[#FAF7F0] hover:bg-[#F2ECE0] text-[#2C2C2C] border border-[#E0D8C8] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          title="学习今日安排的新词"
        >
          <Play className="w-3 h-3 text-emerald-800 fill-emerald-800" />
          <span>新学 (今日待学 {todayNewWordsCount} 词)</span>
        </button>

        {/* 复习按钮: 复习无到期词时显示"暂无"并置灰 */}
        {todayDueReviewCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              onSelectWordbook(wordbook.id);
              onStartReviewWords(wordbook.id);
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-[#234E35] hover:bg-[#1B3E2A] text-white shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="开始复习今日到期的复习词"
          >
            <RotateCcw className="w-3 h-3" />
            <span>复习 (今日到期 {todayDueReviewCount} 词)</span>
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F4F0E8] text-[#AAAAAA] border border-[#EAE6DD] flex items-center justify-center gap-1.5 cursor-not-allowed opacity-75"
            title="今日暂无到期复习词"
          >
            <RotateCcw className="w-3 h-3 text-[#CCCCCC]" />
            <span>复习 (暂无)</span>
          </button>
        )}
      </div>
    </div>
  );
};
