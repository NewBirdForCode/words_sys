import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sliders,
  Calendar,
  Layers,
  Clock,
  Volume2,
  Palette,
  CheckCircle2,
  Sparkles,
  Info,
  BookOpen,
  Plus,
  AlertTriangle,
  Check
} from 'lucide-react';
import {
  PlanSettings,
  getPlanSettings,
  savePlanSettings,
  IntervalScheduleMode,
  NewWordOrder
} from '../utils/plan';
import { ThemeConfig, THEME_PRESETS } from '../types/theme';
import { Wordbook, LearningMode } from '../types';
import { WordbookPlanCard } from './WordbookPlanCard';
import { updateWordbookModeConfig } from '../utils/wordbook';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // Plan settings
  onPlanSettingsSaved: (settings: PlanSettings) => void;
  // Audio preferences
  autoSpeakOnReveal: boolean;
  onToggleAutoSpeak: () => void;
  // Theme settings
  currentTheme: ThemeConfig;
  onThemeChange: (theme: ThemeConfig) => void;
  // Wordbook management
  wordbooksList?: Wordbook[];
  activeWbId?: string;
  onSelectWordbook?: (wbId: string) => void;
  onStartNewWords?: (wbId: string) => void;
  onStartReviewWords?: (wbId: string) => void;
  onOpenCalculator?: (wb: Wordbook) => void;
  onSwitchContent?: (wb: Wordbook) => void;
  onMoveOrder?: (wbId: string, direction: 'up' | 'down') => void;
  onRemoveFromPlan?: (wb: Wordbook) => void;
  onOpenImportModal?: () => void;
  // Learning Mode management
  currentMode?: LearningMode;
  onModeChange?: (mode: LearningMode) => void;
  onWordbooksUpdated?: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  onPlanSettingsSaved,
  autoSpeakOnReveal,
  onToggleAutoSpeak,
  currentTheme,
  onThemeChange,
  wordbooksList = [],
  activeWbId,
  onSelectWordbook,
  onStartNewWords,
  onStartReviewWords,
  onOpenCalculator,
  onSwitchContent,
  onMoveOrder,
  onRemoveFromPlan,
  onOpenImportModal,
  currentMode = 'focused_quiz',
  onModeChange,
  onWordbooksUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'wordbooks' | 'plan' | 'preferences' | 'theme'>('wordbooks');

  // Plan saved settings baseline
  const [persistedSettings, setPersistedSettings] = useState<PlanSettings>(() => getPlanSettings());
  // Draft plan state for slider adjustments before saving
  const [planDraft, setPlanDraft] = useState<PlanSettings>(() => getPlanSettings());

  // Save button feedback state ('idle' | 'saved')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  // Unsaved toast notification
  const [unsavedNotice, setUnsavedNotice] = useState<string | null>(null);
  const unsavedNoticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync draft from persisted when drawer opens
  useEffect(() => {
    if (isOpen) {
      const current = getPlanSettings();
      setPersistedSettings(current);
      setPlanDraft(current);
      setSaveStatus('idle');
      setUnsavedNotice(null);
    }
  }, [isOpen]);

  // Check if draft has unsaved changes compared to persistedSettings
  const hasUnsavedPlanChanges =
    planDraft.dailyNewWords !== persistedSettings.dailyNewWords ||
    planDraft.maxReviewLimit !== persistedSettings.maxReviewLimit ||
    planDraft.intervalMode !== persistedSettings.intervalMode ||
    (planDraft.newWordOrder || 'random') !== (persistedSettings.newWordOrder || 'random');

  if (!isOpen) return null;

  // Handle Close with unsaved notification
  const handleRequestClose = () => {
    if (hasUnsavedPlanChanges) {
      setUnsavedNotice('设置未保存');
      if (unsavedNoticeTimeoutRef.current) clearTimeout(unsavedNoticeTimeoutRef.current);
      unsavedNoticeTimeoutRef.current = setTimeout(() => {
        setUnsavedNotice(null);
        onClose();
      }, 1200);
      return;
    }
    onClose();
  };

  // Explicit Save Plan handler
  const handleSavePlan = () => {
    savePlanSettings(planDraft);
    setPersistedSettings(planDraft);
    onPlanSettingsSaved(planDraft);
    setSaveStatus('saved');
    setTimeout(() => {
      setSaveStatus('idle');
    }, 1500);
  };

  // Slider background track percentage calculators
  // Range 10~100 -> percentage = ((val - 10) / (100 - 10)) * 100%
  const newWordsPercent = Math.min(100, Math.max(0, ((planDraft.dailyNewWords - 10) / 90) * 100));
  // Range 0~100 -> percentage = (val / 100) * 100%
  const reviewLimitPercent = Math.min(100, Math.max(0, (planDraft.maxReviewLimit / 100) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-[#2C2C2C]/40 backdrop-blur-xs flex items-center justify-end animate-fadeIn">
      <div
        style={{
          backgroundColor: currentTheme.cardBg,
          color: currentTheme.textColor,
          borderColor: currentTheme.borderColor,
        }}
        className="w-full max-w-md h-full shadow-2xl border-l flex flex-col overflow-hidden animate-slideLeft relative"
      >
        {/* Unsaved exit toast */}
        {unsavedNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 px-4 py-2 bg-amber-700 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 animate-scaleIn">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-200" />
            <span>{unsavedNotice}</span>
          </div>
        )}

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#EAE6DD] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FAF3E8] text-[#2C2C2C] flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base font-serif">设置与偏好</h3>
              <p className="text-xs text-[#888888]">抗遗忘计划 · 朗读 · 主题外观</p>
            </div>
          </div>
          <button
            onClick={handleRequestClose}
            className="p-1.5 text-[#888888] hover:text-[#2C2C2C] rounded-lg transition-colors cursor-pointer"
            title="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-4 p-2 bg-[#FAF7F0] border-b border-[#EAE6DD] gap-1 text-[11px] sm:text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('wordbooks')}
            className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'wordbooks'
                ? 'bg-white text-[#2C2C2C] shadow-2xs'
                : 'text-[#888888] hover:text-[#2C2C2C]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>词库管理</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'plan'
                ? 'bg-white text-[#2C2C2C] shadow-2xs'
                : 'text-[#888888] hover:text-[#2C2C2C]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>每日计划</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'preferences'
                ? 'bg-white text-[#2C2C2C] shadow-2xs'
                : 'text-[#888888] hover:text-[#2C2C2C]'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>发音</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'theme'
                ? 'bg-white text-[#2C2C2C] shadow-2xs'
                : 'text-[#888888] hover:text-[#2C2C2C]'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>外观</span>
          </button>
        </div>

        {/* Tab 0: 词库管理 (从首页精简移入) */}
        {activeTab === 'wordbooks' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h4 className="text-xs font-bold font-serif text-[#2C2C2C]">
                  词库计划管理 ({wordbooksList.length})
                </h4>
                <p className="text-[11px] text-[#888888]">
                  设定每日词量、切换学习词库与排序
                </p>
              </div>

              {onOpenImportModal && (
                <button
                  type="button"
                  onClick={onOpenImportModal}
                  className="px-2.5 py-1.5 bg-[#2C2C2C] text-white hover:bg-[#1A1A1A] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加/导入</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {wordbooksList.map((wb, idx) => (
                <WordbookPlanCard
                  key={wb.id}
                  wordbook={wb}
                  isActive={wb.id === activeWbId}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < wordbooksList.length - 1}
                  onSelectWordbook={wbId => onSelectWordbook?.(wbId)}
                  onStartNewWords={wbId => {
                    onStartNewWords?.(wbId);
                    onClose();
                  }}
                  onStartReviewWords={wbId => {
                    onStartReviewWords?.(wbId);
                    onClose();
                  }}
                  onOpenCalculator={wbTarget => onOpenCalculator?.(wbTarget)}
                  onSwitchContent={wbTarget => onSwitchContent?.(wbTarget)}
                  onMoveOrder={(wbId, dir) => onMoveOrder?.(wbId, dir)}
                  onRemoveFromPlan={wbTarget => onRemoveFromPlan?.(wbTarget)}
                  currentTheme={currentTheme}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: 7天抗遗忘每日计划 (改造成滑杆式布局) */}
        {activeTab === 'plan' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex flex-col space-y-8">
              {/* 保存前面板顶部出现浅黄色提示条 */}
              <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2 shadow-2xs">
                <span className="shrink-0 text-sm">⚙</span>
                <span>如果已经开始学习单词，新设置将于下次学习生效</span>
              </div>

              {/* 1. 每日新词配额 → 改为滑杆 */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-sm text-[#2C2C2C]">每天学习新词数</span>
                  <span className="font-bold text-2xl font-mono text-emerald-800 tracking-tight">
                    {planDraft.dailyNewWords} <span className="text-base font-medium font-sans">个</span>
                  </span>
                </div>

                <div className="pt-1">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={planDraft.dailyNewWords}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      setPlanDraft(prev => ({ ...prev, dailyNewWords: val }));
                    }}
                    style={{
                      background: `linear-gradient(to right, #10B981 0%, #10B981 ${newWordsPercent}%, #E5E7EB ${newWordsPercent}%, #E5E7EB 100%)`,
                    }}
                    className="plan-slider"
                  />
                  {/* 滑杆下方标注刻度: 10 / 30 / 50 / 70 / 100 */}
                  <div className="flex justify-between text-[11px] font-mono text-[#888888] mt-2 px-0.5 select-none">
                    <span
                      onClick={() => setPlanDraft(prev => ({ ...prev, dailyNewWords: 10 }))}
                      className="cursor-pointer hover:text-[#2C2C2C]"
                    >
                      10
                    </span>
                    <span
                      onClick={() => setPlanDraft(prev => ({ ...prev, dailyNewWords: 30 }))}
                      className="cursor-pointer hover:text-[#2C2C2C]"
                    >
                      30
                    </span>
                    <span
                      onClick={() => setPlanDraft(prev => ({ ...prev, dailyNewWords: 50 }))}
                      className="cursor-pointer hover:text-[#2C2C2C]"
                    >
                      50
                    </span>
                    <span
                      onClick={() => setPlanDraft(prev => ({ ...prev, dailyNewWords: 70 }))}
                      className="cursor-pointer hover:text-[#2C2C2C]"
                    >
                      70
                    </span>
                    <span
                      onClick={() => setPlanDraft(prev => ({ ...prev, dailyNewWords: 100 }))}
                      className="cursor-pointer hover:text-[#2C2C2C]"
                    >
                      100
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. 每日复习上限 → 改为滑杆 */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-sm text-[#2C2C2C]">每日复习上限</span>
                  <span className="font-bold text-2xl font-mono text-emerald-800 tracking-tight">
                    {planDraft.maxReviewLimit === 100 || planDraft.maxReviewLimit === 0 ? (
                      <span className="text-xl font-bold font-sans">不限</span>
                    ) : (
                      <>
                        {planDraft.maxReviewLimit} <span className="text-base font-medium font-sans">个</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="pt-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={planDraft.maxReviewLimit}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      setPlanDraft(prev => ({ ...prev, maxReviewLimit: val }));
                    }}
                    style={{
                      background: `linear-gradient(to right, #10B981 0%, #10B981 ${reviewLimitPercent}%, #E5E7EB ${reviewLimitPercent}%, #E5E7EB 100%)`,
                    }}
                    className="plan-slider"
                  />
                  {/* 下方保留一行小字说明 */}
                  <p className="text-[11px] text-[#888888] mt-2">
                    超出部分的到期词自动顺延到明天，不丢失
                  </p>
                </div>
              </div>

              {/* 3. 新增"新词学习顺序": 两个并排按钮:「随机顺序」(默认选中,绿色) /「字母顺序」(灰色) */}
              <div className="space-y-2.5">
                <span className="font-bold text-sm text-[#2C2C2C] block">新词学习顺序</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPlanDraft(prev => ({ ...prev, newWordOrder: 'random' }))}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      (planDraft.newWordOrder || 'random') === 'random'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-[#F3F0E9] text-[#777777] border-[#E0DCCE] hover:bg-[#EAE6DD]'
                    }`}
                  >
                    <span>随机顺序</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanDraft(prev => ({ ...prev, newWordOrder: 'alphabetical' }))}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      planDraft.newWordOrder === 'alphabetical'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-[#F3F0E9] text-[#777777] border-[#E0DCCE] hover:bg-[#EAE6DD]'
                    }`}
                  >
                    <span>字母顺序</span>
                  </button>
                </div>
              </div>

              {/* 4. 抗遗忘节点节奏卡片保留不动，放到两个滑杆下方 */}
              <div className="space-y-2.5">
                <span className="text-sm font-bold text-[#2C2C2C] block">抗遗忘节点节奏</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setPlanDraft(prev => ({ ...prev, intervalMode: 'standard' }))}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      planDraft.intervalMode === 'standard'
                        ? 'border-[#2C2C2C] bg-white ring-1 ring-[#2C2C2C] shadow-2xs'
                        : 'border-[#EAE6DD] bg-[#FAF7F0]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[#2C2C2C] mb-1">
                      标准版 · 4次复习
                    </div>
                    <div className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                      D+1 → D+2 → D+4 → D+7
                    </div>
                  </div>

                  <div
                    onClick={() => setPlanDraft(prev => ({ ...prev, intervalMode: 'relaxed' }))}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      planDraft.intervalMode === 'relaxed'
                        ? 'border-[#2C2C2C] bg-white ring-1 ring-[#2C2C2C] shadow-2xs'
                        : 'border-[#EAE6DD] bg-[#FAF7F0]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[#2C2C2C] mb-1">
                      轻松版 · 3次复习
                    </div>
                    <div className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                      D+1 → D+3 → D+7
                    </div>
                  </div>
                </div>
              </div>

              {/* 说明 */}
              <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#EAE6DD] text-[11px] text-[#666666] leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-[#888888] shrink-0 mt-0.5" />
                <span>
                  自测批改或拼写默写中答错的词将自动重置抗遗忘间隔为 D+1，次日重新巩固。
                </span>
              </div>
            </div>

            {/* 5. 页面底部增加通栏大按钮「保存设置」(绿色 圆角, 点击后变"✓ 已保存"1.5秒) */}
            <div className="pt-6 mt-6 border-t border-[#EAE6DD]">
              <button
                type="button"
                onClick={handleSavePlan}
                disabled={saveStatus === 'saved'}
                className={`w-full py-3 px-4 text-sm font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  saveStatus === 'saved'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white'
                }`}
              >
                {saveStatus === 'saved' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>✓ 已保存</span>
                  </>
                ) : (
                  <span>保存设置</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: 学习模式与发音偏好 */}
        {activeTab === 'preferences' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* 1. 当前学习模式快速切换 */}
            <div className="p-4 bg-white border border-[#EAE6DD] rounded-2xl shadow-2xs space-y-3">
              <div>
                <span className="text-xs font-bold text-[#2C2C2C] block">
                  学习模式选择
                </span>
                <span className="text-[11px] text-[#888888] mt-0.5 block">
                  支持快速高频刷词与四选一精选刷题两种学习机制
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onModeChange?.('fast_review')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    currentMode === 'fast_review'
                      ? 'border-amber-600 bg-amber-50/70 ring-1 ring-amber-600 shadow-2xs'
                      : 'border-[#EAE6DD] bg-[#FAF7F0] hover:bg-white text-[#555555]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#2C2C2C]">⚡ 快速刷词模式</span>
                    {currentMode === 'fast_review' && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">当前</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#666666] leading-tight">
                    默认每批 200 词。逐词展示发音跟读与 DSE 原句，隐藏选择题，不判错不入错题库。
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onModeChange?.('focused_quiz')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    currentMode === 'focused_quiz'
                      ? 'border-[#2C2C2C] bg-white ring-1 ring-[#2C2C2C] shadow-2xs'
                      : 'border-[#EAE6DD] bg-[#FAF7F0] hover:bg-white text-[#555555]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#2C2C2C]">🎯 精选刷题模式</span>
                    {currentMode === 'focused_quiz' && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">当前</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#666666] leading-tight">
                    默认每批 30 词。保留看图选意 A/B/C/D 四选一，唯一正解，错题自动沉淀循环。
                  </p>
                </button>
              </div>
            </div>

            {/* 2. 词书默认模式管理 (管理员/用户可配置) */}
            {activeWbId && (
              <div className="p-4 bg-white border border-[#EAE6DD] rounded-2xl shadow-2xs space-y-3">
                <div>
                  <span className="text-xs font-bold text-[#2C2C2C] block">
                    当前词书默认模式配置
                  </span>
                  <span className="text-[11px] text-[#888888] mt-0.5 block">
                    更换或新打开该词书时，系统将自动读取该默认模式
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateWordbookModeConfig(activeWbId, {
                        default_mode: 'fast_review',
                        default_batch_size: 200,
                      });
                      onWordbooksUpdated?.();
                    }}
                    className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      wordbooksList.find(w => w.id === activeWbId)?.default_mode === 'fast_review'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-[#FAF7F0] text-[#666666] border-[#EAE6DD] hover:bg-white'
                    }`}
                  >
                    默认：快速刷词 (200词)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateWordbookModeConfig(activeWbId, {
                        default_mode: 'focused_quiz',
                        default_batch_size: 30,
                      });
                      onWordbooksUpdated?.();
                    }}
                    className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      wordbooksList.find(w => w.id === activeWbId)?.default_mode === 'focused_quiz'
                        ? 'bg-[#2C2C2C] text-white border-[#2C2C2C]'
                        : 'bg-[#FAF7F0] text-[#666666] border-[#EAE6DD] hover:bg-white'
                    }`}
                  >
                    默认：精选刷题 (30词)
                  </button>
                </div>
              </div>
            )}

            {/* 3. 翻开卡片自动发音 */}
            <div className="p-4 bg-white border border-[#EAE6DD] rounded-2xl flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-xs font-bold text-[#2C2C2C] block">
                  翻开卡片自动发音
                </span>
                <span className="text-[11px] text-[#888888] mt-0.5 block">
                  在阶段二自测与阶段四中翻开卡片时自动朗读发音
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleAutoSpeak}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  autoSpeakOnReveal ? 'bg-[#234E35]' : 'bg-[#DDD7CC]'
                }`}
              >
                <span
                  className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                    autoSpeakOnReveal ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: 外观主题 */}
        {activeTab === 'theme' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            <span className="text-xs font-bold text-[#2C2C2C] block">选择预设配色风格</span>
            <div className="grid grid-cols-2 gap-3">
              {THEME_PRESETS.slice(0, 4).map(preset => {
                const isSelected = currentTheme.id === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => onThemeChange(preset)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col gap-2 ${
                      isSelected
                        ? 'border-[#2C2C2C] ring-2 ring-[#2C2C2C]/20 shadow-xs'
                        : 'border-[#EAE6DD] hover:border-[#2C2C2C]'
                    }`}
                    style={{ backgroundColor: preset.pageBg }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-bold"
                        style={{ color: preset.textColor }}
                      >
                        {preset.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-4 h-4 rounded-full border border-black/10"
                        style={{ backgroundColor: preset.pageBg }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-black/10"
                        style={{ backgroundColor: preset.accentColor }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-black/10"
                        style={{ backgroundColor: preset.buttonPositiveBg }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        {activeTab !== 'plan' && (
          <div className="p-4 border-t border-[#EAE6DD] bg-[#FAF7F0] flex items-center justify-end">
            <button
              type="button"
              onClick={handleRequestClose}
              className="px-5 py-2 bg-[#2C2C2C] hover:bg-[#1A1A1A] text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              完成
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
