import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Trash2,
  Flame,
  Calendar as CalendarIcon,
  RotateCcw,
  BookOpen,
  ArrowRight,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Award,
  Layers
} from 'lucide-react';
import { ReviewLogRecord, WordStats, WordItem } from '../types';
import { VOCABULARY_BANK, getWordById } from '../data/vocabulary';
import { computeAllWordStats, clearAllReviewLogs, getTodayDateString } from '../utils/storage';
import { getAllCheckInRecords, calculateStreakDays, CheckInRecord } from '../utils/checkin';
import {
  computeFutureReviewSchedule,
  ReviewScheduleDay,
  MASTERY_TIERS,
  WordMasteryTier,
  getWordMasteryTier,
  getAllMemoryProgress
} from '../utils/plan';
import { getWordbookById, getDefaultWordbook } from '../utils/wordbook';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ReviewLogRecord[];
  onLogsCleared: () => void;
  onViewCheckInPoster?: (record: CheckInRecord) => void;
  activeWordbookId?: string;
  onNavigateToStage1?: () => void;
}

interface DailySummaryGroup {
  date: string;
  dateLabel: string;
  totalReviews: number;
  knownCount: number;
  wrongCount: number;
  accuracyRate: number;
  items: Array<{ wordId: string; result: 'known' | 'wrong'; timestamp: number }>;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  onLogsCleared,
  onViewCheckInPoster,
  activeWordbookId,
  onNavigateToStage1,
}) => {
  // 8. 面板 Tab 从 4 个减为 2 个: 「学习」 和 「掌握」
  const [activeTab, setActiveTab] = useState<'study' | 'mastery'>('study');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 打卡数据
  const [checkInList, setCheckInList] = useState<CheckInRecord[]>([]);

  // 1. 按天汇总展开状态
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // 3. 复习计划图是否展开分色堆叠详情
  const [showScheduleDetail, setShowScheduleDetail] = useState(false);

  // 4. "按单词" 筛选状态: 'wrong' (易错, 默认) | 'all' (全部) | 'mastered' (已掌握)
  const [wordFilter, setWordFilter] = useState<'wrong' | 'all' | 'mastered'>('wrong');

  useEffect(() => {
    if (isOpen) {
      setCheckInList(getAllCheckInRecords());
      setIsMenuOpen(false);
    }
  }, [isOpen]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // 连续打卡天数
  const streakDays = useMemo(() => calculateStreakDays(), [checkInList]);

  // 单词自评聚合统计
  const statsMap = useMemo(() => computeAllWordStats(logs), [logs]);
  const allProgress = useMemo(() => getAllMemoryProgress(), [logs, isOpen]);

  // 2. 顶部三个指标计算
  const todayStr = getTodayDateString();
  const todayLogs = useMemo(() => logs.filter(l => l.learning_date === todayStr), [logs, todayStr]);
  const todayLearnedCount = useMemo(() => {
    const ids = new Set(todayLogs.map(l => l.word_id));
    return ids.size;
  }, [todayLogs]);

  const totalLogs = logs.length;
  const totalKnown = useMemo(() => logs.filter(l => l.result === 'known').length, [logs]);
  const totalWrong = useMemo(() => logs.filter(l => l.result === 'wrong').length, [logs]);
  const overallAccuracy = useMemo(() => {
    const answered = totalKnown + totalWrong;
    return answered > 0 ? Math.round((totalKnown / answered) * 100) : 100;
  }, [totalKnown, totalWrong]);

  const stubbornWordsCount = useMemo(() => {
    return Object.values(statsMap).filter(s => s.is_stubborn).length;
  }, [statsMap]);

  // 今明复习任务
  const scheduleDays = useMemo(() => {
    return computeFutureReviewSchedule(activeWordbookId, 11, todayStr);
  }, [activeWordbookId, todayStr, isOpen]);

  const todayDueCount = scheduleDays[0]?.total || 0;
  const tomorrowDueCount = scheduleDays[1]?.total || 0;

  // 1. 按天汇总流水列表 (一行一条，如 "今天 60 次 · 正确率 62%")
  const dailySummaries = useMemo<DailySummaryGroup[]>(() => {
    const groups: Record<string, DailySummaryGroup> = {};

    logs.forEach(l => {
      const d = l.learning_date || todayStr;
      if (!groups[d]) {
        let label = d;
        if (d === todayStr) label = '今天';
        else {
          const parts = d.split('-');
          label = `${parseInt(parts[1], 10)}月${parseInt(parts[2], 10)}日`;
        }

        groups[d] = {
          date: d,
          dateLabel: label,
          totalReviews: 0,
          knownCount: 0,
          wrongCount: 0,
          accuracyRate: 100,
          items: [],
        };
      }

      groups[d].totalReviews++;
      if (l.result === 'known') groups[d].knownCount++;
      else groups[d].wrongCount++;
      groups[d].items.push({
        wordId: l.word_id,
        result: l.result,
        timestamp: l.timestamp,
      });
    });

    const list = Object.values(groups).map(g => {
      const sum = g.knownCount + g.wrongCount;
      g.accuracyRate = sum > 0 ? Math.round((g.knownCount / sum) * 100) : 100;
      return g;
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [logs, todayStr]);

  // 4. 单词列表：默认只显示错过的词(错最多的排最前)，支持全部/易错/已掌握
  const wordItemsList = useMemo(() => {
    const wb = activeWordbookId ? (getWordbookById(activeWordbookId) || getDefaultWordbook()) : getDefaultWordbook();
    const wordsPool = wb.words;

    const list = wordsPool.map(w => {
      const stats = statsMap[w.id] || {
        word_id: w.id,
        total_reviews: 0,
        total_wrongs: 0,
        total_knowns: 0,
        consecutive_wrongs: 0,
        last_result: null,
        first_mastered_at: null,
        last_reviewed_at: null,
        is_stubborn: false,
        mastery_rate: 0,
      };

      const prog = allProgress[`${wb.id}_${w.id}`] || allProgress[`wb_default_core_${w.id}`];
      const tier = getWordMasteryTier(prog);

      // 三档标签: ✅已掌握 / 🔁巩固中 / ⚠️易错
      let statusTag: { label: string; bgClass: string; textClass: string };
      if (tier === 'mastered' || (stats.total_reviews >= 2 && stats.total_wrongs === 0)) {
        statusTag = {
          label: '✅ 已掌握',
          bgClass: 'bg-emerald-50 border-emerald-200',
          textClass: 'text-emerald-800',
        };
      } else if (stats.total_wrongs >= 2 || stats.is_stubborn) {
        statusTag = {
          label: '⚠️ 易错',
          bgClass: 'bg-rose-50 border-rose-200',
          textClass: 'text-rose-700',
        };
      } else {
        statusTag = {
          label: '🔁 巩固中',
          bgClass: 'bg-amber-50 border-amber-200',
          textClass: 'text-amber-800',
        };
      }

      return {
        word: w,
        stats,
        prog,
        statusTag,
      };
    });

    // 筛选
    let filtered = list;
    if (wordFilter === 'wrong') {
      // 默认易错：只显示错过的词
      filtered = list.filter(item => item.stats.total_wrongs > 0 || item.statusTag.label.includes('易错'));
    } else if (wordFilter === 'mastered') {
      filtered = list.filter(item => item.statusTag.label.includes('已掌握'));
    }

    // 排序：错最多的排最前
    return filtered.sort((a, b) => {
      if (b.stats.total_wrongs !== a.stats.total_wrongs) {
        return b.stats.total_wrongs - a.stats.total_wrongs;
      }
      return b.stats.total_reviews - a.stats.total_reviews;
    });
  }, [activeWordbookId, statsMap, allProgress, wordFilter]);

  // 柱状图最高峰高度
  const maxDayReviewCount = useMemo(() => {
    const maxVal = Math.max(...scheduleDays.map(d => d.total), 1);
    return Math.max(maxVal, 8);
  }, [scheduleDays]);

  // 导出 JSON
  const handleExportJSON = () => {
    setIsMenuOpen(false);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `燃词自评记录_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 清空历史
  const handleClearHistory = () => {
    setIsMenuOpen(false);
    if (window.confirm('确定要清空全部自评记录吗？此操作无法撤销。')) {
      clearAllReviewLogs();
      onLogsCleared();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/35 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="w-full max-w-xl bg-[#FFFDF8] h-full shadow-2xl flex flex-col border-l border-[#EAE6DD]">
        {/* 顶部头部栏 (5. 连续打卡天数大字显示 + 6. 右上角···菜单) */}
        <div className="p-4 sm:p-5 border-b border-[#EAE6DD] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black font-serif text-[#2C2C2C] tracking-tight">
                连续打卡 {streakDays} 天
              </span>
              <span className="text-xl">🔥</span>
            </div>
            <span className="text-xs text-[#777777] font-medium block mt-0.5">
              燃词学习成效与巩固看板
            </span>
          </div>

          <div className="flex items-center gap-1.5 relative" ref={menuRef}>
            {/* 6. 右上角 "···" 菜单 */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-[#666666] hover:text-[#2C2C2C] hover:bg-[#F4F0E8] rounded-xl transition-colors cursor-pointer"
              title="更多操作"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-8 top-10 w-40 bg-white rounded-2xl border border-[#EAE6DD] shadow-xl p-1 z-50 animate-fadeIn text-xs">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="w-full text-left px-3 py-2 rounded-xl text-[#2C2C2C] hover:bg-[#F4F0E8] flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-[#555555]" />
                  <span>导出自评记录</span>
                </button>
                <div className="border-t border-[#EAE6DD]/70 my-1 pt-1">
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="w-full text-left px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>清空所有记录</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#666666] hover:text-[#2C2C2C] hover:bg-[#F4F0E8] rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. 顶部数字精简为三个: 今日学习词数、正确率%、顽固生词 (为0时隐藏) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-[#FAF7F0] border-b border-[#EAE6DD]">
          {/* 今日学习词数 */}
          <div className="bg-white/80 p-2.5 rounded-xl border border-[#EAE6DD]/80 text-center">
            <span className="text-[11px] text-[#777777] block">今日学习词数</span>
            <span className="text-lg font-bold font-mono text-[#234E35] block mt-0.5">
              {todayLearnedCount} 词
            </span>
          </div>

          {/* 正确率 % */}
          <div className="bg-white/80 p-2.5 rounded-xl border border-[#EAE6DD]/80 text-center">
            <span className="text-[11px] text-[#777777] block">综合正确率</span>
            <span className="text-lg font-bold font-mono text-[#2C2C2C] block mt-0.5">
              {overallAccuracy}%
            </span>
          </div>

          {/* 顽固生词 (为 0 时隐藏！) */}
          {stubbornWordsCount > 0 && (
            <div className="bg-rose-50/80 p-2.5 rounded-xl border border-rose-200 text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] text-rose-800 font-semibold block">顽固生词</span>
              <span className="text-lg font-bold font-mono text-rose-700 block mt-0.5">
                {stubbornWordsCount} 词
              </span>
            </div>
          )}
        </div>

        {/* 8. 面板 Tab 从 4 个减为 2 个: 「学习」 和 「掌握」 */}
        <div className="p-3 border-b border-[#EAE6DD] flex items-center justify-center">
          <div className="grid grid-cols-2 p-1 bg-[#EAE6DD]/60 rounded-xl w-full max-w-sm">
            <button
              type="button"
              onClick={() => setActiveTab('study')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                activeTab === 'study'
                  ? 'bg-white text-[#234E35] shadow-xs'
                  : 'text-[#666666] hover:text-[#2C2C2C]'
              }`}
            >
              学习（打卡与复习）
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mastery')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                activeTab === 'mastery'
                  ? 'bg-white text-[#234E35] shadow-xs'
                  : 'text-[#666666] hover:text-[#2C2C2C]'
              }`}
            >
              掌握（易错词与图表）
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* -------------------- Tab 1: 「学习」 -------------------- */}
          {activeTab === 'study' && (
            <div className="space-y-4 animate-fadeIn">
              {/* 今明复习任务卡片 */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#EAE6DD] shadow-2xs">
                <span className="text-xs font-bold text-[#2C2C2C] block mb-2.5 font-serif">
                  今明复习任务
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[#FAF7F0] border border-[#EAE6DD] flex flex-col justify-between">
                    <span className="text-[11px] text-[#777777]">今天到期</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-base font-black font-mono text-emerald-900">
                        {todayDueCount} 词
                      </span>
                      {todayDueCount > 0 && onNavigateToStage1 && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigateToStage1();
                          }}
                          className="text-[10px] text-emerald-800 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <span>去复习</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#FAF7F0] border border-[#EAE6DD] flex flex-col justify-between">
                    <span className="text-[11px] text-[#777777]">明天到期</span>
                    <div className="mt-1">
                      <span className="text-base font-black font-mono text-[#555555]">
                        {tomorrowDueCount} 词
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. 打卡日历 (保留日历，删除历史打卡明细列表) */}
              <div className="bg-white rounded-2xl p-4 border border-[#EAE6DD] shadow-2xs">
                <span className="text-xs font-bold text-[#2C2C2C] block mb-3 font-serif">
                  打卡日历
                </span>

                {(() => {
                  const now = new Date();
                  const year = now.getFullYear();
                  const month = now.getMonth();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const firstDayOfWeek = new Date(year, month, 1).getDay();
                  const checkedDates = new Set(checkInList.map(r => r.date));
                  const currentTodayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

                  const cells: (number | null)[] = [];
                  for (let i = 0; i < firstDayOfWeek; i++) {
                    cells.push(null);
                  }
                  for (let d = 1; d <= daysInMonth; d++) {
                    cells.push(d);
                  }

                  return (
                    <div>
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#888888] font-medium mb-1.5">
                        <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {cells.map((day, idx) => {
                          if (day === null) {
                            return <div key={`empty-${idx}`} className="h-8" />;
                          }
                          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const isPunched = checkedDates.has(dateKey);
                          const isToday = dateKey === currentTodayStr;

                          return (
                            <div
                              key={dateKey}
                              className={`h-8 rounded-lg flex flex-col items-center justify-center text-[11px] font-mono transition-all relative ${
                                isPunched
                                  ? 'bg-[#D7E8DD] text-[#234E35] font-bold border border-[#B9D8C3]'
                                  : isToday
                                  ? 'bg-[#F4F0E8] text-[#2C2C2C] font-semibold border border-[#EAE6DD]'
                                  : 'text-[#666666]'
                              }`}
                            >
                              <span>{day}</span>
                              {isPunched && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute bottom-1" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 1. 按天汇总一行一条 (点击展开当天自评词明细) */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#2C2C2C] block font-serif">
                  自评记录（按天汇总）
                </span>

                {dailySummaries.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#888888] bg-white rounded-2xl border border-[#EAE6DD]">
                    暂无自评记录，完成阶段二自测后自动在此汇总
                  </div>
                ) : (
                  dailySummaries.map(group => {
                    const isExpanded = expandedDate === group.date;

                    return (
                      <div
                        key={group.date}
                        className="bg-white rounded-2xl border border-[#EAE6DD] overflow-hidden shadow-2xs transition-all"
                      >
                        <div
                          onClick={() => setExpandedDate(isExpanded ? null : group.date)}
                          className="p-3 sm:p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#FAF7F0] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#2C2C2C]">
                              {group.dateLabel}
                            </span>
                            <span className="text-xs text-[#666666] font-mono">
                              {group.totalReviews} 次
                            </span>
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              正确率 {group.accuracyRate}%
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-xs text-[#888888]">
                            <span>{isExpanded ? '收起' : '详情'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </div>

                        {/* 点击才展开当天明细 */}
                        {isExpanded && (
                          <div className="p-3 bg-[#FAF8F3] border-t border-[#EAE6DD] space-y-1.5 max-h-48 overflow-y-auto">
                            {group.items.map((item, i) => {
                              const wordObj = getWordById(item.wordId);
                              return (
                                <div
                                  key={`${item.wordId}_${i}`}
                                  className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-[#EAE6DD]"
                                >
                                  <div className="min-w-0 pr-2">
                                    <span className="font-bold text-[#2C2C2C] mr-2">
                                      {wordObj?.word || item.wordId}
                                    </span>
                                    <span className="text-[11px] text-[#777777] truncate">
                                      {wordObj?.meaning || wordObj?.translation || ''}
                                    </span>
                                  </div>

                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                                      item.result === 'known'
                                        ? 'bg-emerald-50 text-emerald-800'
                                        : 'bg-rose-50 text-rose-700'
                                    }`}
                                  >
                                    {item.result === 'known' ? '✓ 掌握' : '✗ 答错'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* -------------------- Tab 2: 「掌握」 -------------------- */}
          {activeTab === 'mastery' && (
            <div className="space-y-4 animate-fadeIn">
              {/* 3. 简化复习计划图表 (默认单色，仅"今天"高亮并标注数字；分色堆叠收进详情) */}
              <div className="p-4 rounded-2xl bg-white border border-[#EAE6DD] shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE1]">
                  <div>
                    <h4 className="text-xs font-bold text-[#2C2C2C] font-serif">
                      未来 10 天复习计划
                    </h4>
                    <span className="text-[10px] text-[#777777]">
                      {showScheduleDetail ? '分色堆叠明细' : '柱状图规划'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowScheduleDetail(!showScheduleDetail)}
                    className="text-xs text-emerald-800 hover:text-emerald-900 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <span>{showScheduleDetail ? '收起详情' : '阶段详情'}</span>
                    {showScheduleDetail ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* 分色堆叠图例 (仅在详情展开时显示) */}
                {showScheduleDetail && (
                  <div className="flex items-center justify-end gap-2.5 pt-2 text-[10px] text-[#666666]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: MASTERY_TIERS.initial.color }} />
                      初记
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: MASTERY_TIERS.reinforcing.color }} />
                      强化
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: MASTERY_TIERS.consolidating.color }} />
                      巩固
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: MASTERY_TIERS.familiar.color }} />
                      熟识
                    </span>
                  </div>
                )}

                {/* 柱状图 */}
                <div className="mt-3">
                  <div className="h-32 flex items-end gap-1.5 px-1 pb-1 border-b border-[#EAE6DD]">
                    {scheduleDays.map((day, idx) => {
                      const total = day.total;
                      const heightPercent = maxDayReviewCount > 0 ? (total / maxDayReviewCount) * 100 : 0;
                      const isToday = idx === 0;

                      return (
                        <div
                          key={day.dateStr}
                          className="flex-1 h-full flex flex-col justify-end items-center group relative"
                        >
                          {/* 3. 仅"今天"柱高亮并标注数字 */}
                          {isToday && total > 0 && (
                            <span className="text-[10px] font-mono font-bold text-emerald-900 mb-1">
                              {total}
                            </span>
                          )}

                          {/* 柱体: 默认单色，今天高亮 */}
                          <div
                            style={{ height: `${Math.max(total > 0 ? 10 : 2, heightPercent)}%` }}
                            className={`w-full max-w-[24px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all ${
                              isToday
                                ? 'bg-[#234E35]'
                                : 'bg-[#C8D7CE] group-hover:bg-[#B3C8BC]'
                            }`}
                          >
                            {/* 详情展开时展示分色堆叠 */}
                            {showScheduleDetail && total > 0 && (
                              <>
                                {day.initial > 0 && (
                                  <div
                                    style={{
                                      height: `${(day.initial / total) * 100}%`,
                                      backgroundColor: MASTERY_TIERS.initial.color,
                                    }}
                                    className="w-full"
                                  />
                                )}
                                {day.reinforcing > 0 && (
                                  <div
                                    style={{
                                      height: `${(day.reinforcing / total) * 100}%`,
                                      backgroundColor: MASTERY_TIERS.reinforcing.color,
                                    }}
                                    className="w-full"
                                  />
                                )}
                                {day.consolidating > 0 && (
                                  <div
                                    style={{
                                      height: `${(day.consolidating / total) * 100}%`,
                                      backgroundColor: MASTERY_TIERS.consolidating.color,
                                    }}
                                    className="w-full"
                                  />
                                )}
                                {day.familiar > 0 && (
                                  <div
                                    style={{
                                      height: `${(day.familiar / total) * 100}%`,
                                      backgroundColor: MASTERY_TIERS.familiar.color,
                                    }}
                                    className="w-full"
                                  />
                                )}
                              </>
                            )}
                          </div>

                          <span
                            className={`text-[9px] mt-1.5 font-mono ${
                              isToday ? 'font-bold text-[#234E35]' : 'text-[#888888]'
                            }`}
                          >
                            {day.dayLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4. "按单词" 列表: 默认只显示错过的词(错最多的排最前)，筛选全部/易错/已掌握，三档标签 */}
              <div className="p-4 rounded-2xl bg-white border border-[#EAE6DD] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#2C2C2C] font-serif">
                    单词掌握状态 ({wordItemsList.length})
                  </h4>

                  {/* 筛选按钮: 全部 / 易错 / 已掌握 */}
                  <div className="flex items-center gap-1 p-0.5 bg-[#FAF7F0] border border-[#EAE6DD] rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={() => setWordFilter('wrong')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        wordFilter === 'wrong'
                          ? 'bg-white text-rose-800 shadow-2xs font-bold'
                          : 'text-[#666666] hover:text-[#2C2C2C]'
                      }`}
                    >
                      易错
                    </button>
                    <button
                      type="button"
                      onClick={() => setWordFilter('all')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        wordFilter === 'all'
                          ? 'bg-white text-[#2C2C2C] shadow-2xs font-bold'
                          : 'text-[#666666] hover:text-[#2C2C2C]'
                      }`}
                    >
                      全部
                    </button>
                    <button
                      type="button"
                      onClick={() => setWordFilter('mastered')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        wordFilter === 'mastered'
                          ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                          : 'text-[#666666] hover:text-[#2C2C2C]'
                      }`}
                    >
                      已掌握
                    </button>
                  </div>
                </div>

                {wordItemsList.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#888888] bg-[#FAF8F3] rounded-xl border border-dashed border-[#EAE6DD]">
                    暂无符合条件的单词
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto space-y-1.5 pr-0.5">
                    {wordItemsList.map(({ word, stats, statusTag }) => (
                      <div
                        key={word.id}
                        className="p-2.5 rounded-xl border border-[#EAE6DD] bg-white flex items-center justify-between text-xs transition-colors hover:border-[#D5CFBF]"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#2C2C2C]">
                              {word.word}
                            </span>
                            {stats.total_wrongs > 0 && (
                              <span className="text-[10px] text-rose-700 font-mono">
                                (错 {stats.total_wrongs} 次)
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#666666] truncate block mt-0.5">
                            {word.meaning || word.translation}
                          </span>
                        </div>

                        {/* 三档标签: ✅已掌握 / 🔁巩固中 / ⚠️易错 */}
                        <span
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border shrink-0 ${statusTag.bgClass} ${statusTag.textClass}`}
                        >
                          {statusTag.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
