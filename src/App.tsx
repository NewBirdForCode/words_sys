/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Trophy,
  BookOpen
} from 'lucide-react';
import {
  WordItem,
  WordSelection,
  ReviewLogRecord,
  AppStage,
  MistakeItem
} from './types';
import {
  getUserId,
  getAllReviewLogs,
  appendReviewLogs,
  getTodayDateString,
  getMistakesSorted,
  recordMistake,
  removeMistake,
  getMistakeBook
} from './utils/storage';
import {
  getActiveWordbookId,
  setActiveWordbookId,
  getWordbookById,
  getDailyWordsForWordbookAndDate,
  getDefaultWordbook,
  getAllWordbooks,
  deleteWordbook,
  moveWordbook,
  getEffectiveModeForWordbook,
  setUserModeForWordbook,
} from './utils/wordbook';
import { initSpeechSynthesis } from './utils/speech';
import { loadSavedTheme, saveTheme, applyThemeToDOM } from './utils/theme';
import { calculateStreakDays, CheckInRecord } from './utils/checkin';
import { ThemeConfig } from './types/theme';
import { Navbar } from './components/Navbar';
import { WordReviewGrid } from './components/WordReviewGrid';
import { NoticeBanner } from './components/NoticeBanner';
import { HistoryDrawer } from './components/HistoryDrawer';
import { WordbookModal } from './components/WordbookModal';
import { Stage1Shadowing } from './components/Stage1Shadowing';
import { Stage3Spelling } from './components/Stage3Spelling';
import { Stage4MistakeLoop } from './components/Stage4MistakeLoop';
import { CheckInModal } from './components/CheckInModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { PlanCalculatorModal } from './components/PlanCalculatorModal';
import {
  DailyTaskPool,
  getOrGenerateDailyTaskPool,
  updateWordLearningResult,
  batchSyncWordLearningResults,
  invalidateDailyTaskPool,
  PlanSettings,
} from './utils/plan';
import { Wordbook, LearningMode } from './types';

export default function App() {
  const [learningDate, setLearningDate] = useState<string>(getTodayDateString());

  // 四阶段学习流程：默认每次进入从【阶段一】开始
  const [appStage, setAppStage] = useState<AppStage>('stage1_shadowing');

  // 当前词库
  const [activeWbId, setActiveWbId] = useState<string>(getActiveWordbookId());
  const [wordbooksList, setWordbooksList] = useState<Wordbook[]>(() => getAllWordbooks());

  // 学习模式：fast_review (快速刷词，默认200) 或 focused_quiz (精选刷题，默认30)
  const [currentMode, setCurrentMode] = useState<LearningMode>(() => {
    const wb = getWordbookById(getActiveWordbookId()) || getDefaultWordbook();
    return getEffectiveModeForWordbook(wb);
  });

  // 词库计划计算器弹窗
  const [calculatorWordbook, setCalculatorWordbook] = useState<Wordbook | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);

  // 7天抗遗忘每日计划任务池 (复习到期词 + 今日新词)
  const [dailyTaskPool, setDailyTaskPool] = useState<DailyTaskPool | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // 今日任务词汇 (由任务池提供)
  const [todayWords, setTodayWords] = useState<WordItem[]>([]);

  // 阶段二（自测批改）状态
  const [stage2Selections, setStage2Selections] = useState<Record<string, WordSelection>>({});
  const [stage2Completed, setStage2Completed] = useState<boolean>(false);

  // 错题本版本计数器（用于触发阶段三数据刷新）
  const [mistakeVersion, setMistakeVersion] = useState<number>(0);

  // 翻开卡片自动朗读开关
  const [autoSpeakOnReveal, setAutoSpeakOnReveal] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('daily30_auto_speak_v1') === 'true';
  });

  // 打卡海报状态
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState<boolean>(false);
  const [checkInPhotoUrl, setCheckInPhotoUrl] = useState<string | null>(null);

  // 主题换肤状态
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(() => loadSavedTheme());

  // 提示横幅
  const [notice, setNotice] = useState<{
    type: 'warning' | 'success' | 'info';
    message: string;
  } | null>(null);

  // 弹窗状态
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isWordbookModalOpen, setIsWordbookModalOpen] = useState<boolean>(false);
  const [allLogs, setAllLogs] = useState<ReviewLogRecord[]>([]);

  const topAnchorRef = useRef<HTMLDivElement>(null);

  // 应用主题到DOM
  useEffect(() => {
    applyThemeToDOM(currentTheme);
  }, [currentTheme]);

  // 初始化加载
  useEffect(() => {
    initSpeechSynthesis();
    setAllLogs(getAllReviewLogs());

    const currentWbId = getActiveWordbookId();
    setActiveWbId(currentWbId);
    const wb = getWordbookById(currentWbId) || getDefaultWordbook();
    // 每天首次进入默认打开精选刷题；用户当天主动切换后遵循设置
    const todayFirstEntryKey = `daily30_first_entry_default_${learningDate}`;
    let effMode: LearningMode;
    if (typeof window !== 'undefined' && !localStorage.getItem(todayFirstEntryKey)) {
      localStorage.setItem(todayFirstEntryKey, 'true');
      effMode = 'focused_quiz';
      setUserModeForWordbook(currentWbId, 'focused_quiz');
    } else {
      effMode = getEffectiveModeForWordbook(wb);
    }
    setCurrentMode(effMode);

    // 7天抗遗忘每日计划任务池 (复习到期词 + 今日新词)
    const pool = getOrGenerateDailyTaskPool(currentWbId, learningDate, false, effMode);
    setDailyTaskPool(pool);
    setTodayWords(pool.allTaskWords);

    // 初始化阶段二自测选择
    const initSel: Record<string, WordSelection> = {};
    pool.allTaskWords.forEach(w => {
      initSel[w.id] = 'unanswered';
    });
    setStage2Selections(initSel);
    setStage2Completed(false);

    // 默认进入阶段一
    setAppStage('stage1_shadowing');
  }, [learningDate]);

  // 主动切换学习模式 (快速刷词 / 精选刷题)
  const handleSwitchMode = (newMode: LearningMode) => {
    setCurrentMode(newMode);
    setUserModeForWordbook(activeWbId, newMode);

    // 模式切换必须同步更新当前学习批次、答题区域、进度显示及统计规则。切换模式时，不得删除已有学习记录或错题记录。
    const pool = getOrGenerateDailyTaskPool(activeWbId, learningDate, true, newMode);
    setDailyTaskPool(pool);
    setTodayWords(pool.allTaskWords);

    const newSel: Record<string, WordSelection> = {};
    pool.allTaskWords.forEach(w => {
      newSel[w.id] = 'unanswered';
    });
    setStage2Selections(newSel);

    setNotice({
      type: 'info',
      message:
        newMode === 'fast_review'
          ? '⚡ 已切换为【快速刷词模式】(默认 200 词/批，逐词发音跟读与 DSE 原句强化)'
          : '🎯 已切换为【精选刷题模式】(默认 30 词/批，四选一精细作答与错题入库)',
    });
  };

  // 获取当前词库对象
  const activeWordbook = useMemo(() => {
    return getWordbookById(activeWbId) || getDefaultWordbook();
  }, [activeWbId]);

  // 全量单词映射表（供错题本按ID查找单词）
  const allWordsMap = useMemo(() => {
    const map: Record<string, WordItem> = {};
    // 先塞内置词库，再塞当前词库
    getDefaultWordbook().words.forEach(w => {
      map[w.id] = w;
    });
    activeWordbook.words.forEach(w => {
      map[w.id] = w;
    });
    todayWords.forEach(w => {
      map[w.id] = w;
    });
    return map;
  }, [activeWordbook, todayWords]);

  // 获取当前错题列表
  const currentMistakes = useMemo(() => {
    return getMistakesSorted();
  }, [mistakeVersion]);

  // 自动读开关切换
  const handleToggleAutoSpeak = () => {
    setAutoSpeakOnReveal(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('daily30_auto_speak_v1', String(next));
      }
      setNotice({
        type: 'info',
        message: next ? '已开启【翻开卡片自动朗读发音】' : '已关闭【翻开卡片自动朗读发音】',
      });
      return next;
    });
  };

  // 阶段二：用户选择 ✓ 对
  const handleStage2Known = (wordId: string) => {
    setStage2Selections(prev => ({ ...prev, [wordId]: 'known' }));
    updateWordLearningResult(activeWbId, wordId, true, learningDate);
    setNotice(null);
  };

  // 阶段二：用户选择 × 错
  const handleStage2Wrong = (wordId: string) => {
    setStage2Selections(prev => ({ ...prev, [wordId]: 'wrong' }));
    // 自动记入错题本并累计错误次数
    recordMistake(wordId);
    // 更新抗遗忘记忆：错误次数+1，复习节点重置为明天(D+1)
    updateWordLearningResult(activeWbId, wordId, false, learningDate);
    setMistakeVersion(v => v + 1);
    setNotice(null);
  };

  // 阶段二：重置选择
  const handleResetStage2 = () => {
    const resetSel: Record<string, WordSelection> = {};
    todayWords.forEach(w => {
      resetSel[w.id] = 'unanswered';
    });
    setStage2Selections(resetSel);
    setStage2Completed(false);
    setNotice({
      type: 'info',
      message: '本轮自测勾选已重置。',
    });
  };

  const answeredCount = todayWords.filter(
    w => (stage2Selections[w.id] || 'unanswered') !== 'unanswered'
  ).length;
  const unansweredCount = todayWords.length - answeredCount;
  const wrongCount = todayWords.filter(w => stage2Selections[w.id] === 'wrong').length;

  // 阶段二：提交自测
  const handleSubmitStage2 = () => {
    if (unansweredCount > 0) {
      setNotice({
        type: 'warning',
        message: `还有 ${unansweredCount} 个单词未完成，请完成全部自评后提交。`,
      });
      const firstUnanswered = todayWords.find(
        w => (stage2Selections[w.id] || 'unanswered') === 'unanswered'
      );
      if (firstUnanswered) {
        const el = document.getElementById(`word-card-${firstUnanswered.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 生成永久独立流水记录
    const currentUserId = getUserId();
    const timestamp = Date.now();
    const newLogs: ReviewLogRecord[] = todayWords.map(w => ({
      id: `log_${timestamp}_${w.id}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: currentUserId,
      word_id: w.id,
      wordbook_id: activeWbId,
      session_id: `sess_stage2_${learningDate}`,
      round_id: 1,
      review_stage: 'stage1_new_words',
      result: stage2Selections[w.id] === 'known' ? 'known' : 'wrong',
      timestamp,
      learning_date: learningDate,
    }));

    appendReviewLogs(newLogs);
    setAllLogs(getAllReviewLogs());

    // 批量同步抗遗忘记忆库
    const resultsMap: Record<string, boolean> = {};
    todayWords.forEach(w => {
      resultsMap[w.id] = stage2Selections[w.id] === 'known';
    });
    batchSyncWordLearningResults(activeWbId, resultsMap, learningDate);

    setStage2Completed(true);

    if (wrongCount === 0) {
      setNotice({
        type: 'success',
        message: '🎉 太棒了！阶段二所有单词自评全部掌握！无错题产生。接下来进入阶段三拼写默写！',
      });
    } else {
      setNotice({
        type: 'warning',
        message: `阶段二自测完成：发现 ${wrongCount} 个错词已记入错题本并重置抗遗忘间隔为D+1，准备进入阶段三！`,
      });
    }
  };

  // 切换词库
  const handleSwitchWordbook = (newWbId: string) => {
    setActiveWbId(newWbId);
    setActiveWordbookId(newWbId);
    const targetWb = getWordbookById(newWbId) || getDefaultWordbook();
    
    // 更换词书时，按新词书默认配置初始化
    const initMode = targetWb.default_mode || 'focused_quiz';
    setCurrentMode(initMode);
    setUserModeForWordbook(newWbId, initMode);

    setWordbooksList(getAllWordbooks());
    const pool = getOrGenerateDailyTaskPool(newWbId, learningDate, true, initMode);
    setDailyTaskPool(pool);
    setTodayWords(pool.allTaskWords);

    const initSel: Record<string, WordSelection> = {};
    pool.allTaskWords.forEach(w => {
      initSel[w.id] = 'unanswered';
    });
    setStage2Selections(initSel);
    setStage2Completed(false);

    // 每次进入新词库默认从阶段一开始
    setAppStage('stage1_shadowing');
    setNotice({
      type: 'success',
      message: `已切换至「${targetWb.book_name || targetWb.name}」，已初始化为【${initMode === 'fast_review' ? '快速刷词' : '精选刷题'}模式】(批次 ${pool.allTaskWords.length} 词)。`,
    });
  };

  // 词库计划卡片操作 handlers
  const handleSelectWordbook = (wbId: string) => {
    handleSwitchWordbook(wbId);
  };

  const handleStartNewWords = (wbId: string) => {
    handleSwitchWordbook(wbId);
    setAppStage('stage1_shadowing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartReviewWords = (wbId: string) => {
    handleSwitchWordbook(wbId);
    setAppStage('stage1_shadowing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCalculator = (wb: Wordbook) => {
    setCalculatorWordbook(wb);
    setIsCalculatorOpen(true);
  };

  const handleSwitchContent = (wb: Wordbook) => {
    handleSwitchWordbook(wb.id);
    setIsWordbookModalOpen(true);
  };

  const handleMoveOrder = (wbId: string, direction: 'up' | 'down') => {
    const updated = moveWordbook(wbId, direction);
    setWordbooksList(updated);
  };

  const handleRemoveFromPlan = (wb: Wordbook) => {
    if (wordbooksList.length <= 1) {
      alert('至少需要保留一个词库在计划中，无法移出。');
      return;
    }
    if (window.confirm(`确定将词库「${wb.name}」移出计划吗？此操作将删除该词库及其学习计划。`)) {
      deleteWordbook(wb.id);
      const updated = getAllWordbooks();
      setWordbooksList(updated);
      if (activeWbId === wb.id) {
        handleSwitchWordbook(updated[0].id);
      }
      setNotice({
        type: 'info',
        message: `已将词库「${wb.name}」移出计划。`,
      });
    }
  };

  const handlePlanSaved = () => {
    invalidateDailyTaskPool(activeWbId, learningDate);
    const pool = getOrGenerateDailyTaskPool(activeWbId, learningDate, true);
    setDailyTaskPool(pool);
    setTodayWords(pool.allTaskWords);
    setWordbooksList(getAllWordbooks());
    setNotice({
      type: 'success',
      message: '每日词量计划已保存并实时生效！',
    });
  };

  const handleProgressReset = () => {
    invalidateDailyTaskPool(activeWbId, learningDate);
    const pool = getOrGenerateDailyTaskPool(activeWbId, learningDate, true);
    setDailyTaskPool(pool);
    setTodayWords(pool.allTaskWords);
    setWordbooksList(getAllWordbooks());
    setStage2Selections({});
    setStage2Completed(false);
    setNotice({
      type: 'info',
      message: '该词库学习进度已清空归零。',
    });
  };

  // 7天抗遗忘计划设置修改后重新生成任务池
  const handlePlanSettingsSaved = (newSettings: PlanSettings) => {
    invalidateDailyTaskPool(activeWbId, learningDate);
    const pool = getOrGenerateDailyTaskPool(activeWbId, learningDate, true);
    setDailyTaskPool(pool);
    setTodayWords(pool.allTaskWords);

    const initSel: Record<string, WordSelection> = {};
    pool.allTaskWords.forEach(w => {
      initSel[w.id] = 'unanswered';
    });
    setStage2Selections(initSel);
    setStage2Completed(false);

    setNotice({
      type: 'success',
      message: `已保存7天抗遗忘计划！今日任务已按最新配额调整为：复习 ${pool.reviewWords.length} 词 + 新词 ${pool.newWords.length} 词。`,
    });
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans relative transition-colors duration-200"
      style={{
        backgroundColor: currentTheme.pageBg,
        color: currentTheme.textColor,
      }}
    >
      <div ref={topAnchorRef} />

      {/* Wallpaper background image if configured */}
      {currentTheme.bgImageUrl && (
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center transition-all duration-300"
          style={{
            backgroundImage: `url(${currentTheme.bgImageUrl})`,
            filter: currentTheme.overlayBlur ? `blur(${currentTheme.overlayBlur}px)` : undefined,
            transform: currentTheme.overlayBlur ? 'scale(1.05)' : undefined,
          }}
        />
      )}
      {currentTheme.bgImageUrl && (
        <div
          className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-300"
          style={{
            backgroundColor: currentTheme.pageBg,
            opacity: currentTheme.overlayOpacity / 100,
          }}
        />
      )}

      {/* 顶部导航与四阶段切换标签 */}
      <Navbar
        currentStage={appStage}
        onStageChange={stage => {
          setAppStage(stage);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        activeWordbookName={activeWordbook.name}
        onOpenWordbooks={() => setIsWordbookModalOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        mistakeCount={currentMistakes.length}
        currentTheme={currentTheme}
        currentMode={currentMode}
        onToggleMode={() => handleSwitchMode(currentMode === 'fast_review' ? 'focused_quiz' : 'fast_review')}
      />

      {/* 主操作内容区 (精简为纯粹三行动线：阶段Tab已在Navbar，此处为主学习内容卡与底部进度条) */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-3 flex flex-col justify-between gap-4 relative z-10 min-h-[calc(100vh-130px)]">
        {/* 通知提示条 */}
        {notice && (
          <NoticeBanner
            type={notice.type}
            message={notice.message}
            onClose={() => setNotice(null)}
          />
        )}

        {/* 空词库友好引导卡片 */}
        {todayWords.length === 0 && appStage !== 'stage4_mistake_loop' && (
          <div className="bg-white rounded-[16px] border border-[#EAE6DD] p-8 sm:p-10 text-center max-w-lg mx-auto shadow-xs my-auto animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-[#FAF3E8] text-[#2C2C2C] flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#2C2C2C] mb-2">当前词库暂无词汇</h3>
            <p className="text-xs sm:text-sm text-[#666666] mb-6">
              词库可能为空或尚未导入单词。请点击下方按钮切换预置词库或上传自定义词表。
            </p>
            <button
              type="button"
              onClick={() => setIsWordbookModalOpen(true)}
              className="px-6 py-2.5 bg-[#2C2C2C] text-white font-bold rounded-xl text-sm transition-all shadow-xs cursor-pointer hover:bg-[#1A1A1A]"
            >
              管理 / 切换词库
            </button>
          </div>
        )}

        {/* ----------------- 【第 2 行：当前内容卡 (占屏 70% 视觉焦点)】 ----------------- */}
        <div className="flex-1 flex flex-col justify-center my-auto">
          {/* 阶段一 | 看图选义 / 精选刷词 (支持今日精选30词与快速刷200词模式) */}
          {appStage === 'stage1_shadowing' && todayWords.length > 0 && (
            <Stage1Shadowing
              words={todayWords}
              allWordsMap={allWordsMap}
              activeWordbookId={activeWbId}
              learningMode={currentMode}
              onModeChange={handleSwitchMode}
              onBack={() => setIsWordbookModalOpen(true)}
              onFinishStage1={() => {
                setAppStage('stage2_self_test');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onProceedToStage4={() => {
                setMistakeVersion(v => v + 1);
                setAppStage('stage4_mistake_loop');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSpeechError={msg => setNotice({ type: 'warning', message: msg })}
              onOpenPunchIn={photoUrl => {
                setCheckInPhotoUrl(photoUrl || null);
                setIsCheckInModalOpen(true);
              }}
              currentTheme={currentTheme}
            />
          )}

          {/* 阶段二 | 自测批改 (一屏一词，答完自动切词，双圆形52px对错按钮) */}
          {appStage === 'stage2_self_test' && todayWords.length > 0 && (
            <WordReviewGrid
              words={todayWords}
              selections={stage2Selections}
              onSelectKnown={handleStage2Known}
              onSelectWrong={handleStage2Wrong}
              onCompleteStage2={() => {
                setStage2Completed(true);
              }}
              onProceedToStage3={() => {
                setAppStage('stage3_spelling');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSpeechError={msg => setNotice({ type: 'warning', message: msg })}
              autoSpeakOnReveal={autoSpeakOnReveal}
              currentTheme={currentTheme}
              onOpenPunchIn={() => {
                setCheckInPhotoUrl(null);
                setIsCheckInModalOpen(true);
              }}
            />
          )}

          {/* 阶段三 | 拼写默写 (无独立输入框，字母格子即输入区，2行QWERTY键盘) */}
          {appStage === 'stage3_spelling' && todayWords.length > 0 && (
            <Stage3Spelling
              words={todayWords}
              activeWordbookId={activeWbId}
              onFinishStage3={() => {
                setMistakeVersion(v => v + 1);
                setAppStage('stage4_mistake_loop');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onProceedToStage4={() => {
                setMistakeVersion(v => v + 1);
                setAppStage('stage4_mistake_loop');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSpeechError={msg => setNotice({ type: 'warning', message: msg })}
              onOpenPunchIn={() => {
                setCheckInPhotoUrl(null);
                setIsCheckInModalOpen(true);
              }}
              currentTheme={currentTheme}
            />
          )}

          {/* 阶段四 | 错误循环 (一屏一词，双圆形52px消除按钮，错题清零闭环) */}
          {(appStage === 'stage4_mistake_loop' || (appStage as string) === 'stage3_mistake_loop') && (
            <Stage4MistakeLoop
              allWordsMap={allWordsMap}
              initialMistakes={currentMistakes}
              onFinishStage4={() => {
                setMistakeVersion(v => v + 1);
                setAppStage('stage1_shadowing');
                setNotice({
                  type: 'success',
                  message: '🎉 恭喜！四阶段错题已全部清零，今日抗遗忘任务圆满达成！',
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSpeechError={msg => setNotice({ type: 'warning', message: msg })}
              autoSpeakOnReveal={autoSpeakOnReveal}
              currentTheme={currentTheme}
              onOpenPunchIn={() => {
                setCheckInPhotoUrl(null);
                setIsCheckInModalOpen(true);
              }}
            />
          )}
        </div>

        {/* ----------------- 【第 3 行：进度条 + 同行小字】(阶段一精选刷词已在顶部固定栏展示进度，移除底部重复页脚) ----------------- */}
        {appStage !== 'stage1_shadowing' && (
          <div className="w-[82%] sm:w-[78%] max-w-[420px] mx-auto py-2 flex flex-col gap-1.5 text-xs select-none">
            <div className="flex items-center justify-between text-[#777777] font-medium">
              <span className="font-mono text-[11px] sm:text-xs">
                今日 {dailyTaskPool?.newWords.length || 0} 词 · 复习 {dailyTaskPool?.reviewWords.length || 0} 词
              </span>
              <span className="text-[11px] text-[#888888]">
                {appStage === 'stage2_self_test' && '阶段二: 自测批改'}
                {appStage === 'stage3_spelling' && '阶段三: 拼写默写'}
                {appStage === 'stage4_mistake_loop' && '阶段四: 错题循环'}
              </span>
            </div>

            <div className="w-full bg-[#EAE6DD] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${
                    appStage === 'stage2_self_test' ? '33%' :
                    appStage === 'stage3_spelling' ? '66%' : '100%'
                  }`,
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* 每日学习打卡海报弹窗 */}
      <CheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        learningDate={learningDate}
        completedWordsCount={todayWords.length}
        accuracyRate={
          answeredCount > 0
            ? Math.round(((answeredCount - wrongCount) / answeredCount) * 100)
            : 100
        }
        initialPhotoUrl={checkInPhotoUrl}
        onCheckInSaved={() => {
          setMistakeVersion(v => v + 1);
        }}
      />

      {/* 词库计划计算器弹窗 */}
      <PlanCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        wordbook={calculatorWordbook}
        onPlanSaved={handlePlanSaved}
        onProgressReset={handleProgressReset}
        currentTheme={currentTheme}
      />

      {/* 词库管理弹窗 */}
      <WordbookModal
        isOpen={isWordbookModalOpen}
        onClose={() => {
          setIsWordbookModalOpen(false);
          setWordbooksList(getAllWordbooks());
        }}
        onActiveWordbookChange={handleSwitchWordbook}
        onStartLearningMode={(wbId, mode) => {
          handleSwitchWordbook(wbId);
          handleSwitchMode(mode);
          setAppStage('stage1_shadowing');
          setIsWordbookModalOpen(false);
          setWordbooksList(getAllWordbooks());
        }}
      />

      {/* 综合设置与偏好抽屉 (含词库计划管理、每日计划、发音、外观主题、学习模式) */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onPlanSettingsSaved={handlePlanSettingsSaved}
        autoSpeakOnReveal={autoSpeakOnReveal}
        onToggleAutoSpeak={handleToggleAutoSpeak}
        currentTheme={currentTheme}
        onThemeChange={newTheme => {
          setCurrentTheme(newTheme);
          saveTheme(newTheme);
        }}
        wordbooksList={wordbooksList}
        activeWbId={activeWbId}
        onSelectWordbook={handleSelectWordbook}
        onStartNewWords={handleStartNewWords}
        onStartReviewWords={handleStartReviewWords}
        onOpenCalculator={handleOpenCalculator}
        onSwitchContent={handleSwitchContent}
        onMoveOrder={handleMoveOrder}
        onRemoveFromPlan={handleRemoveFromPlan}
        onOpenImportModal={() => {
          setIsSettingsOpen(false);
          setIsWordbookModalOpen(true);
        }}
        currentMode={currentMode}
        onModeChange={handleSwitchMode}
        onWordbooksUpdated={() => setWordbooksList(getAllWordbooks())}
      />

      {/* 历史统计与记忆计划抽屉 */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        logs={allLogs}
        activeWordbookId={activeWbId}
        onNavigateToStage1={() => {
          setAppStage('stage1_shadowing');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onViewCheckInPoster={record => {
          setCheckInPhotoUrl(record.photoUrl || null);
          setIsCheckInModalOpen(true);
        }}
        onLogsCleared={() => {
          setAllLogs([]);
          setStage2Selections({});
          setStage2Completed(false);
          setMistakeVersion(v => v + 1);
          setAppStage('stage1_shadowing');
        }}
      />
    </div>
  );
}
