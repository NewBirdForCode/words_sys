import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Calendar,
  Clock,
  RotateCcw,
  Check,
  AlertTriangle,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { Wordbook } from '../types';
import { ThemeConfig } from '../types/theme';
import { getDefaultTheme } from '../utils/theme';
import {
  computeWordbookProgress,
  getWordbookDailyNewWords,
  setWordbookDailyNewWords,
  calculatePlanEstimation,
  resetWordbookProgress,
  getOrGenerateDailyTaskPool
} from '../utils/plan';

interface PlanCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordbook: Wordbook | null;
  onPlanSaved: () => void;
  onProgressReset: () => void;
  currentTheme?: ThemeConfig;
}

const PRESET_OPTIONS = [10, 15, 20, 30];

export const PlanCalculatorModal: React.FC<PlanCalculatorModalProps> = ({
  isOpen,
  onClose,
  wordbook,
  onPlanSaved,
  onProgressReset,
  currentTheme = getDefaultTheme(),
}) => {
  const [selectedPill, setSelectedPill] = useState<number | 'custom'>(30);
  const [customValue, setCustomValue] = useState<string>('30');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && wordbook) {
      const current = getWordbookDailyNewWords(wordbook.id);
      if (PRESET_OPTIONS.includes(current)) {
        setSelectedPill(current);
        setCustomValue(String(current));
      } else {
        setSelectedPill('custom');
        setCustomValue(String(current));
      }
      setShowResetConfirm(false);
    }
  }, [isOpen, wordbook]);

  if (!isOpen || !wordbook) return null;

  const currentDailyWords = selectedPill === 'custom'
    ? Math.max(1, Math.min(200, parseInt(customValue, 10) || 30))
    : selectedPill;

  const progress = computeWordbookProgress(wordbook.id);
  const taskPool = getOrGenerateDailyTaskPool(wordbook.id);
  const avgReviewWords = taskPool.reviewWords.length || 15;

  // 实时联动计算: 剩余天数, 预计完成日期, 预计每日用时
  const estimation = calculatePlanEstimation(
    progress.remainingNewWords,
    currentDailyWords,
    avgReviewWords
  );

  const handleSave = () => {
    setWordbookDailyNewWords(wordbook.id, currentDailyWords);
    onPlanSaved();
    onClose();
  };

  const handleConfirmReset = () => {
    resetWordbookProgress(wordbook.id);
    setShowResetConfirm(false);
    onProgressReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div
        style={{
          backgroundColor: currentTheme.cardBg,
          borderColor: currentTheme.borderColor,
          color: currentTheme.textColor,
        }}
        className="w-full max-w-md rounded-3xl border shadow-2xl p-5 sm:p-6 transition-all"
        role="dialog"
        aria-labelledby="calculator-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DD]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#234E35] flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 id="calculator-title" className="text-base font-bold font-serif text-[#2C2C2C]">
                计划计算器
              </h3>
              <p className="text-xs text-[#666666] truncate max-w-[190px] sm:max-w-[240px]">
                {wordbook.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* 右上角重置按钮 (清空学习进度，需二次确认) */}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs text-[#8A3B3B] hover:text-[#7A2828] hover:bg-rose-50 px-2 py-1 rounded-lg border border-rose-200/60 transition-colors flex items-center gap-1 cursor-pointer"
              title="清空该词库学习进度"
            >
              <RotateCcw className="w-3 h-3" />
              <span>重置进度</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#888888] hover:text-[#2C2C2C] hover:bg-[#F4F0E8] rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 二次确认弹窗遮罩 */}
        {showResetConfirm && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50/90 border border-rose-200 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-900">确认清空该词库学习进度？</h4>
                <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                  清空后，该词库的所有已学记录、7天抗遗忘复习节点和掌握度都将归零，此操作无法撤销。
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
                  >
                    确认重置
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 rounded-lg bg-white text-rose-800 border border-rose-200 text-xs font-semibold hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 词库现状速览 */}
        <div className="my-4 p-3 rounded-2xl bg-[#F8F6F0] border border-[#EAE6DD] flex items-center justify-between text-xs">
          <div>
            <span className="text-[#666666]">总词量：</span>
            <span className="font-bold font-mono text-[#2C2C2C]">{progress.totalWords} 词</span>
          </div>
          <div>
            <span className="text-[#666666]">已学：</span>
            <span className="font-bold font-mono text-emerald-800">{progress.learnedWords} 词</span>
          </div>
          <div>
            <span className="text-[#666666]">剩余新词：</span>
            <span className="font-bold font-mono text-amber-800">{progress.remainingNewWords} 词</span>
          </div>
        </div>

        {/* 档位选择: 每日 10 / 15 / 20 / 30 词 / 自定义 */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#444444] block">
            每日新词档位：
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {PRESET_OPTIONS.map(val => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setSelectedPill(val);
                  setCustomValue(String(val));
                }}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  selectedPill === val
                    ? 'bg-[#234E35] text-white border-[#234E35] shadow-xs'
                    : 'bg-white text-[#444444] border-[#EAE6DD] hover:bg-[#F4F0E8]'
                }`}
              >
                {val}词
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedPill('custom')}
              className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                selectedPill === 'custom'
                  ? 'bg-[#234E35] text-white border-[#234E35] shadow-xs'
                  : 'bg-white text-[#444444] border-[#EAE6DD] hover:bg-[#F4F0E8]'
              }`}
            >
              自定义
            </button>
          </div>

          {selectedPill === 'custom' && (
            <div className="pt-2 flex items-center gap-2">
              <span className="text-xs text-[#666666] shrink-0">自定义词量：</span>
              <input
                type="number"
                min="1"
                max="200"
                value={customValue}
                onChange={e => setCustomValue(e.target.value)}
                className="w-24 px-3 py-1.5 bg-white border border-[#D5CFBF] rounded-xl text-xs font-bold text-[#2C2C2C] focus:outline-hidden focus:border-[#234E35]"
                placeholder="1-200"
              />
              <span className="text-xs text-[#666666]">词 / 天</span>
            </div>
          )}
        </div>

        {/* 实时联动计算展示区 (重点要求) */}
        <div className="mt-5 p-4 rounded-2xl bg-linear-to-br from-[#FAF8F3] to-[#F3EFE6] border border-[#E5DFD0] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#2C2C2C] pb-2 border-b border-[#EAE6DD]">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>智能学习测算 (基于每日 {currentDailyWords} 词)</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 剩余天数 */}
            <div className="bg-white/80 p-2.5 rounded-xl border border-[#EAE6DD]/70">
              <div className="flex items-center gap-1.5 text-[11px] text-[#666666]">
                <Clock className="w-3 h-3 text-[#234E35]" />
                <span>剩余完成天数</span>
              </div>
              <div className="mt-1">
                <span className="text-lg font-black font-mono text-[#234E35]">
                  {progress.remainingNewWords === 0 ? '已全部刷完' : `${estimation.remainingDays} 天`}
                </span>
                {progress.remainingNewWords > 0 && (
                  <span className="text-[10px] text-[#888888] block">
                    剩 {progress.remainingNewWords} 词 ÷ 每日 {currentDailyWords} 词
                  </span>
                )}
              </div>
            </div>

            {/* 预计完成日期 */}
            <div className="bg-white/80 p-2.5 rounded-xl border border-[#EAE6DD]/70">
              <div className="flex items-center gap-1.5 text-[11px] text-[#666666]">
                <Calendar className="w-3 h-3 text-sky-700" />
                <span>预计完成日期</span>
              </div>
              <div className="mt-1">
                <span className="text-xs sm:text-sm font-bold text-[#2C2C2C] block">
                  {progress.remainingNewWords === 0 ? '已完成全库' : estimation.finishDateFormatted}
                </span>
                <span className="text-[10px] text-[#888888]">
                  {progress.remainingNewWords === 0 ? '随时滚动巩固' : '如按每日计划推进'}
                </span>
              </div>
            </div>
          </div>

          {/* 预计每日用时 */}
          <div className="bg-white/90 p-3 rounded-xl border border-[#EAE6DD]/70 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#666666] block">
                预计每日用时 ≈ (新词 {currentDailyWords} + 平均复习 {avgReviewWords}) × 8秒
              </span>
              <span className="text-xs text-[#444444] font-medium">
                节奏轻快，碎片化高效消化
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-black font-mono text-emerald-800">
                {estimation.estimatedTimeText}
              </span>
            </div>
          </div>
        </div>

        {/* 底部保存按钮 */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#666666] hover:bg-[#F4F0E8] transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#234E35] hover:bg-[#1B3E2A] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>保存计划</span>
          </button>
        </div>
      </div>
    </div>
  );
};
