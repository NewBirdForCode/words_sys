import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  BookmarkCheck,
  RotateCcw,
  BookOpen,
  Info,
  Calendar,
  Flame,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { WordItem, Wordbook } from '../types';
import { ThemeConfig } from '../types/theme';
import { getDefaultTheme } from '../utils/theme';
import {
  WordMasteryTier,
  MASTERY_TIERS,
  computeWordMasteryStats,
  computeFutureReviewSchedule,
  computePastNewWordsTrend,
  setWordManuallyMastered,
  ReviewScheduleDay,
  PastTrendDay
} from '../utils/plan';
import { getAllWordbooks, getActiveWordbookId } from '../utils/wordbook';

interface MemoryStatsPanelProps {
  activeWordbookId?: string;
  onNavigateToStage1: () => void;
  onWordMasteryChanged?: () => void;
  currentTheme?: ThemeConfig;
}

export const MemoryStatsPanel: React.FC<MemoryStatsPanelProps> = ({
  activeWordbookId,
  onNavigateToStage1,
  onWordMasteryChanged,
  currentTheme = getDefaultTheme(),
}) => {
  const allWordbooks = useMemo(() => getAllWordbooks(), []);
  const [selectedWbId, setSelectedWbId] = useState<string>(activeWordbookId || getActiveWordbookId());
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<ReviewScheduleDay | null>(null);
  const [expandedTier, setExpandedTier] = useState<WordMasteryTier | null>(null);

  // 1. 复习计划图表数据 (未来 11 天柱状图)
  const scheduleDays = useMemo(() => {
    return computeFutureReviewSchedule(selectedWbId, 11);
  }, [selectedWbId]);

  // 检查未来 11 天是否完全无复习任务
  const totalUpcomingReviews = useMemo(() => {
    return scheduleDays.reduce((acc, d) => acc + d.total, 0);
  }, [scheduleDays]);

  // 柱状图最高峰高度（用于纵轴缩放比例）
  const maxDayReviewCount = useMemo(() => {
    const maxVal = Math.max(...scheduleDays.map(d => d.total), 1);
    return Math.max(maxVal, 8); // 保底刻度8
  }, [scheduleDays]);

  // 2. 掌握度五档统计
  const masteryStats = useMemo(() => {
    return computeWordMasteryStats(selectedWbId);
  }, [selectedWbId]);

  // 3. 进展与持久度 (过去 10 天新增已学词数)
  const pastTrends = useMemo(() => {
    return computePastNewWordsTrend(selectedWbId, 10);
  }, [selectedWbId]);

  const maxPastNewCount = useMemo(() => {
    const maxVal = Math.max(...pastTrends.map(d => d.newWordsCount), 1);
    return Math.max(maxVal, 6);
  }, [pastTrends]);

  // 切换手动"已记牢"
  const handleToggleManualMastered = (wordId: string, currentIsMastered: boolean) => {
    setWordManuallyMastered(selectedWbId, wordId, !currentIsMastered);
    onWordMasteryChanged?.();
  };

  const currentWordbookName = allWordbooks.find(w => w.id === selectedWbId)?.name || '当前词库';

  return (
    <div className="space-y-6 text-[#2C2C2C] animate-fadeIn">
      {/* 词库切换器 */}
      {allWordbooks.length > 1 && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#F8F6F0] border border-[#EAE6DD]">
          <span className="text-xs font-semibold text-[#666666] flex items-center gap-1.5 shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-[#234E35]" />
            <span>统计词库：</span>
          </span>
          <select
            value={selectedWbId}
            onChange={e => setSelectedWbId(e.target.value)}
            className="text-xs font-bold text-[#2C2C2C] bg-white border border-[#D5CFBF] rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:border-[#234E35] cursor-pointer max-w-[200px] truncate"
          >
            {allWordbooks.map(wb => (
              <option key={wb.id} value={wb.id}>
                {wb.name} ({wb.words.length}词)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ------------------ 【三 | 复习计划图表 (柱状图堆叠)】 ------------------ */}
      <section className="bg-white rounded-3xl border border-[#EAE6DD] p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-900 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C2C2C] font-serif">
                未来 10 天到期复习计划
              </h3>
              <p className="text-[11px] text-[#777777]">
                按 7 天抗遗忘记忆阶段分色堆叠
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono text-[#555555]">
            <span>总待复习：</span>
            <strong className="text-emerald-900 font-bold">{totalUpcomingReviews} 词</strong>
          </div>
        </div>

        {/* 柱状图阶段色彩图例 (初记/强化/巩固/熟识) */}
        <div className="flex items-center justify-end gap-3 pt-3 pb-1 text-[11px] flex-wrap">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: MASTERY_TIERS.initial.color }} />
            <span className="text-[#666666]">初记</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: MASTERY_TIERS.reinforcing.color }} />
            <span className="text-[#666666]">强化</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: MASTERY_TIERS.consolidating.color }} />
            <span className="text-[#666666]">巩固</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: MASTERY_TIERS.familiar.color }} />
            <span className="text-[#666666]">熟识</span>
          </div>
        </div>

        {/* 柱状图内容区 */}
        {totalUpcomingReviews === 0 ? (
          /* 空状态引导 (规则 8) */
          <div className="my-6 p-6 rounded-2xl bg-[#FAF8F3] border border-dashed border-[#D5CFBF] text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center mb-2.5">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#2C2C2C]">
              暂无复习任务，先去学几个新词吧
            </h4>
            <p className="text-xs text-[#777777] mt-1 max-w-xs mx-auto">
              新学单词后，系统将自动按第 1、2、4、7 天的科学间隔推送到复习池。
            </p>
            <button
              type="button"
              onClick={onNavigateToStage1}
              className="mt-4 px-4 py-2 rounded-xl bg-[#234E35] text-white text-xs font-bold shadow-xs hover:bg-[#1B3E2A] inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>去学新词</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* 分色堆叠柱状图 */
          <div className="mt-4">
            <div className="h-44 sm:h-48 flex items-end gap-1.5 sm:gap-2 px-1 pt-6 pb-2 border-b border-[#EAE6DD]">
              {scheduleDays.map((day, idx) => {
                const total = day.total;
                const heightPercent = maxDayReviewCount > 0 ? (total / maxDayReviewCount) * 100 : 0;
                const isSelected = selectedScheduleDay?.dateStr === day.dateStr;

                // 各层高度比例
                const initialPct = total > 0 ? (day.initial / total) * 100 : 0;
                const reinforcingPct = total > 0 ? (day.reinforcing / total) * 100 : 0;
                const consolidatingPct = total > 0 ? (day.consolidating / total) * 100 : 0;
                const familiarPct = total > 0 ? (day.familiar / total) * 100 : 0;

                return (
                  <div
                    key={day.dateStr}
                    onClick={() => setSelectedScheduleDay(isSelected ? null : day)}
                    className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
                  >
                    {/* 顶部数字 */}
                    {total > 0 && (
                      <span className="text-[10px] font-mono font-bold text-[#555555] mb-1 group-hover:text-emerald-900 transition-colors">
                        {total}
                      </span>
                    )}

                    {/* 堆叠柱主体 */}
                    <div
                      style={{ height: `${Math.max(total > 0 ? 12 : 2, heightPercent)}%` }}
                      className={`w-full max-w-[28px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all ${
                        isSelected ? 'ring-2 ring-emerald-900 shadow-md' : 'group-hover:brightness-95'
                      }`}
                    >
                      {total === 0 ? (
                        <div className="w-full h-1 bg-[#EAE6DD]" />
                      ) : (
                        <>
                          {day.initial > 0 && (
                            <div
                              style={{
                                height: `${initialPct}%`,
                                backgroundColor: MASTERY_TIERS.initial.color,
                              }}
                              className="w-full"
                              title={`初记: ${day.initial} 词`}
                            />
                          )}
                          {day.reinforcing > 0 && (
                            <div
                              style={{
                                height: `${reinforcingPct}%`,
                                backgroundColor: MASTERY_TIERS.reinforcing.color,
                              }}
                              className="w-full"
                              title={`强化: ${day.reinforcing} 词`}
                            />
                          )}
                          {day.consolidating > 0 && (
                            <div
                              style={{
                                height: `${consolidatingPct}%`,
                                backgroundColor: MASTERY_TIERS.consolidating.color,
                              }}
                              className="w-full"
                              title={`巩固: ${day.consolidating} 词`}
                            />
                          )}
                          {day.familiar > 0 && (
                            <div
                              style={{
                                height: `${familiarPct}%`,
                                backgroundColor: MASTERY_TIERS.familiar.color,
                              }}
                              className="w-full"
                              title={`熟识: ${day.familiar} 词`}
                            />
                          )}
                        </>
                      )}
                    </div>

                    {/* 横轴日期标签 */}
                    <span
                      className={`text-[10px] mt-2 font-mono whitespace-nowrap transition-colors ${
                        idx === 0
                          ? 'font-bold text-emerald-900'
                          : isSelected
                          ? 'font-bold text-[#2C2C2C]'
                          : 'text-[#888888]'
                      }`}
                    >
                      {day.dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 点击柱子详情浮层 */}
            {selectedScheduleDay && (
              <div className="mt-3 p-3 rounded-2xl bg-[#F8F6F0] border border-[#EAE6DD] text-xs flex items-center justify-between animate-fadeIn">
                <div className="space-y-0.5">
                  <span className="font-bold text-[#2C2C2C]">
                    {selectedScheduleDay.dayLabel} ({selectedScheduleDay.dateStr})
                  </span>
                  <div className="text-[11px] text-[#666666] flex items-center gap-2 flex-wrap">
                    <span>到期总数: <strong>{selectedScheduleDay.total}</strong> 词</span>
                    <span>· 初记 {selectedScheduleDay.initial}</span>
                    <span>· 强化 {selectedScheduleDay.reinforcing}</span>
                    <span>· 巩固 {selectedScheduleDay.consolidating}</span>
                    <span>· 熟识 {selectedScheduleDay.familiar}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedScheduleDay(null)}
                  className="text-xs text-[#888888] hover:text-[#2C2C2C] px-2 py-1 rounded-lg"
                >
                  收起
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ------------------ 【四 | 掌握度五档 (横向条形统计)】 ------------------ */}
      <section className="bg-white rounded-3xl border border-[#EAE6DD] p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C2C2C] font-serif">
                掌握度五档分布
              </h3>
              <p className="text-[11px] text-[#777777]">
                已学 {masteryStats.learnedCount} 词 · 未学 {masteryStats.unlearnedCount} 词
              </p>
            </div>
          </div>

          <span className="text-[11px] font-medium text-[#777777]">
            点击展开各档词表
          </span>
        </div>

        {/* 横向条形列表 (规则 10) */}
        <div className="mt-4 space-y-3">
          {(['initial', 'reinforcing', 'consolidating', 'familiar', 'mastered'] as WordMasteryTier[]).map(tierKey => {
            const meta = MASTERY_TIERS[tierKey];
            const count = masteryStats.counts[tierKey];
            const pct = masteryStats.percentages[tierKey];
            const isExpanded = expandedTier === tierKey;
            const wordsInTier = masteryStats.wordsByTier[tierKey];

            return (
              <div
                key={tierKey}
                className="p-3 rounded-2xl bg-[#FAF8F3] border border-[#EAE6DD] transition-all"
              >
                <div
                  onClick={() => setExpandedTier(isExpanded ? null : tierKey)}
                  className="flex items-center justify-between gap-3 cursor-pointer"
                >
                  {/* 左侧档位标签与描述 */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      style={{ backgroundColor: meta.color }}
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#2C2C2C]">
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-[#888888] hidden sm:inline">
                          ({meta.description})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 右侧词数与百分比 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-[#2C2C2C]">
                      {count} 词
                    </span>
                    <span className="text-[11px] font-mono text-[#777777] w-10 text-right">
                      {pct}%
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#888888]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#888888]" />
                    )}
                  </div>
                </div>

                {/* 横向进度条 */}
                <div className="mt-2 w-full h-1.5 rounded-full bg-[#EAE6DD] overflow-hidden">
                  <div
                    style={{
                      width: `${pct}%`,
                      backgroundColor: meta.color,
                    }}
                    className="h-full rounded-full transition-all duration-300"
                  />
                </div>

                {/* 展开查看该档位单词列表，并可点击标记"我已记牢" */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-[#EAE6DD] animate-fadeIn">
                    <div className="text-[11px] text-[#666666] mb-2 flex items-center justify-between">
                      <span>包含单词（共 {wordsInTier.length} 词）：</span>
                      <span className="text-[10px] text-[#888888]">
                        点击右侧可快捷切换掌握状态
                      </span>
                    </div>

                    {wordsInTier.length === 0 ? (
                      <p className="text-xs text-[#999999] py-2 text-center">暂无该阶段单词</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {wordsInTier.map(({ wordItem, progress }) => (
                          <div
                            key={wordItem.id}
                            className="p-2 rounded-xl bg-white border border-[#EAE6DD] flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-[#2C2C2C] mr-2">
                                {wordItem.word}
                              </span>
                              <span className="text-[#666666] text-[11px] truncate">
                                {wordItem.meaning || wordItem.translation}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleManualMastered(wordItem.id, !!progress.isManuallyMastered)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                                progress.isManuallyMastered
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-[#F4F0E8] text-[#555555] hover:text-[#2C2C2C]'
                              }`}
                              title={progress.isManuallyMastered ? '点击取消手动已掌握' : '标记为我已记牢，不再进入复习队列'}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{progress.isManuallyMastered ? '已记牢' : '记牢'}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------ 【五 | 进展与持久度 (面积/折线图 + 持久度分布)】 ------------------ */}
      <section className="bg-white rounded-3xl border border-[#EAE6DD] p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C2C2C] font-serif">
                进展与持久度趋势
              </h3>
              <p className="text-[11px] text-[#777777]">
                过去 10 天每日新增已学词数
              </p>
            </div>
          </div>
        </div>

        {/* 过去 10 天面积/折线图 (规则 11) */}
        <div className="mt-4">
          <div className="h-36 sm:h-40 w-full relative pt-4 pb-2">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 360 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#234E35" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#234E35" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* 折线与面积路径 */}
              {(() => {
                const step = 360 / (pastTrends.length - 1);
                const points = pastTrends.map((d, i) => {
                  const x = i * step;
                  const y = 90 - (d.newWordsCount / maxPastNewCount) * 80;
                  return { x, y, count: d.newWordsCount };
                });

                const linePath = points
                  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                  .join(' ');

                const areaPath = `${linePath} L 360 95 L 0 95 Z`;

                return (
                  <>
                    {/* 渐变面积 */}
                    <path d={areaPath} fill="url(#areaGradient)" />

                    {/* 折线主体 */}
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#234E35"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* 各数据点标记与文字 */}
                    {points.map((p, idx) => (
                      <g key={idx}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={p.count > 0 ? "3.5" : "2"}
                          fill="#FFFFFF"
                          stroke="#234E35"
                          strokeWidth="2"
                        />
                        {p.count > 0 && (
                          <text
                            x={p.x}
                            y={Math.max(12, p.y - 7)}
                            textAnchor="middle"
                            fill="#234E35"
                            fontSize="8"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {p.count}
                          </text>
                        )}
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>

          {/* 横轴日期标签 */}
          <div className="flex justify-between items-center px-1 pt-1 border-t border-[#EAE6DD] text-[10px] font-mono text-[#888888]">
            {pastTrends.map((d, i) => (
              <span key={d.dateStr} className={i === pastTrends.length - 1 ? 'font-bold text-emerald-900' : ''}>
                {d.dayLabel}
              </span>
            ))}
          </div>
        </div>

        {/* 记忆持久度分布百分比 (规则 12) */}
        <div className="mt-5 p-3.5 rounded-2xl bg-[#F8F6F0] border border-[#EAE6DD]">
          <h4 className="text-xs font-bold text-[#2C2C2C] mb-2 flex items-center gap-1.5">
            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-800" />
            <span>记忆持久度分布</span>
          </h4>
          <div className="grid grid-cols-5 gap-1 text-center">
            {(['initial', 'reinforcing', 'consolidating', 'familiar', 'mastered'] as WordMasteryTier[]).map(t => (
              <div key={t} className="bg-white/80 p-2 rounded-xl border border-[#EAE6DD]">
                <span className="text-[10px] text-[#666666] block">{MASTERY_TIERS[t].label}</span>
                <span
                  style={{ color: MASTERY_TIERS[t].color }}
                  className="text-xs sm:text-sm font-black font-mono block mt-0.5"
                >
                  {masteryStats.percentages[t]}%
                </span>
                <span className="text-[9px] text-[#888888] font-mono">
                  {masteryStats.counts[t]}词
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
