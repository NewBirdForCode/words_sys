import React from 'react';
import {
  CalendarDays,
  Sparkles,
  ArrowRight,
  Sliders,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { DailyTaskPool } from '../utils/plan';
import { ThemeConfig } from '../types/theme';
import { getDefaultTheme } from '../utils/theme';

interface TodayTaskBannerProps {
  taskPool: DailyTaskPool;
  onStartStage1: () => void;
  onOpenPlanSettings: () => void;
  currentTheme?: ThemeConfig;
  currentStage: string;
}

export const TodayTaskBanner: React.FC<TodayTaskBannerProps> = ({
  taskPool,
  onStartStage1,
  onOpenPlanSettings,
  currentTheme = getDefaultTheme(),
  currentStage,
}) => {
  const reviewCount = taskPool.reviewWords.length;
  const newCount = taskPool.newWords.length;
  const totalCount = taskPool.allTaskWords.length;
  const isStage1 = currentStage === 'stage1_shadowing';

  return (
    <div
      style={{
        backgroundColor: currentTheme.cardBg,
        borderColor: currentTheme.borderColor,
      }}
      className="rounded-2xl border p-3.5 sm:p-4 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn"
    >
      {/* 左侧任务概要 */}
      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#234E35] border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
          <CalendarDays className="w-4 h-4" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold font-serif text-[#2C2C2C] flex items-center gap-1.5">
              <span>今日任务</span>
              <span className="text-[10px] font-sans font-semibold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.2 rounded-md">
                7天抗遗忘计划
              </span>
            </span>

            {taskPool.isRollingMasteryMode && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                整库巩固模式
              </span>
            )}

            {taskPool.pendingOverdueCount > 0 && (
              <span
                className="text-[10px] text-[#888888] bg-[#F4F0E8] px-1.5 py-0.2 rounded-md"
                title="已超出每日复习上限，多余到期词自动顺延到明天复习，不丢失"
              >
                +顺延明日 {taskPool.pendingOverdueCount} 词
              </span>
            )}
          </div>

          <p className="text-xs text-[#555555] mt-0.5 leading-tight font-medium">
            {taskPool.isRollingMasteryMode ? (
              <span>
                全词库新词已刷完，今日滚动巩固 <strong className="text-[#2C2C2C] font-mono">{totalCount}</strong> 词（最久未复习+高频错题）
              </span>
            ) : (
              <span>
                复习 <strong className="text-emerald-800 font-mono font-bold">{reviewCount}</strong> 词 + 新词 <strong className="text-[#2C2C2C] font-mono font-bold">{newCount}</strong> 词，共 <strong className="text-[#2C2C2C] font-mono font-bold">{totalCount}</strong> 词
              </span>
            )}
          </p>
        </div>
      </div>

      {/* 右侧动作按钮区 */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {/* 参数设置按钮 */}
        <button
          type="button"
          onClick={onOpenPlanSettings}
          className="p-2 text-[#666666] hover:text-[#2C2C2C] hover:bg-[#FAF7F0] border border-[#EAE6DD] rounded-xl text-xs transition-colors cursor-pointer"
          title="调整每日新词配额、复习上限与抗遗忘节奏"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>

        {/* 开始阶段一学习按钮 */}
        <button
          type="button"
          onClick={onStartStage1}
          style={{
            backgroundColor: currentTheme.accentColor,
            color: currentTheme.accentText,
          }}
          className="px-4 py-2 text-xs font-bold rounded-xl shadow-xs hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>{isStage1 ? '看图选义中' : '开始阶段一'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
