import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  ArrowRight,
  Flame,
  Volume2,
  Check
} from 'lucide-react';
import { WordItem, MistakeItem } from '../types';
import { speakWord } from '../utils/speech';
import { resolveMistakeInSession, recordMistake } from '../utils/storage';

interface Stage4MatchGameProps {
  allWordsMap: Record<string, WordItem>;
  initialMistakes: MistakeItem[];
  fallbackWords?: WordItem[];
  activeWordbookId?: string;
  onFinishStage4: () => void;
  onSpeechError?: (msg: string) => void;
  isDark?: boolean;
}

interface MatchCard {
  cardId: string;
  wordId: string;
  text: string;
  type: 'cn' | 'en';
  isEliminated: boolean;
  isWrong: boolean;
  phonetic?: string;
}

export const Stage4MatchGame: React.FC<Stage4MatchGameProps> = ({
  allWordsMap,
  initialMistakes,
  fallbackWords = [],
  activeWordbookId,
  onFinishStage4,
  onSpeechError,
  isDark = false,
}) => {
  // 钉子户跟踪：记录连错次数
  const stubbornMapRef = useRef<Record<string, number>>({});

  // 待学习题库 (优先错词库，无错词时使用兜底今日词)
  const poolWords = useMemo(() => {
    if (initialMistakes.length > 0) {
      const list = initialMistakes
        .map(m => allWordsMap[m.wordId])
        .filter((w): w is WordItem => !!w);
      if (list.length > 0) return list;
    }
    return fallbackWords.length > 0 ? fallbackWords : Object.values(allWordsMap);
  }, [initialMistakes, allWordsMap, fallbackWords]);

  // 轮次控制
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundWords, setRoundWords] = useState<WordItem[]>([]);
  const [cnCards, setCnCards] = useState<MatchCard[]>([]);
  const [enCards, setEnCards] = useState<MatchCard[]>([]);

  // 选牌状态
  const [selectedCnId, setSelectedCnId] = useState<string | null>(null);
  const [selectedEnId, setSelectedEnId] = useState<string | null>(null);

  // 连击与计时
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 爆裂光刺动效位置
  const [burstPoint, setBurstPoint] = useState<{ x: number; y: number } | null>(null);

  // 连线坐标
  const [activeLine, setActiveLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  // 通关状态
  const [isRoundClear, setIsRoundClear] = useState(false);

  // 初始化或切换一轮 (6-8 对)
  const initRound = (wordsList: WordItem[]) => {
    if (wordsList.length === 0) return;

    // 优先混入连错 >= 3 次的"钉子户"词
    const stubbornIds = Object.keys(stubbornMapRef.current).filter(
      id => (stubbornMapRef.current[id] || 0) >= 3
    );
    const stubbornWords = stubbornIds
      .map(id => allWordsMap[id])
      .filter((w): w is WordItem => !!w);

    // 选取 6 - 8 词
    const batchSize = Math.min(8, Math.max(6, wordsList.length));
    const regularPool = wordsList.filter(w => !stubbornIds.includes(w.id));
    const shuffledRegular = [...regularPool].sort(() => Math.random() - 0.5);

    const selected = [...stubbornWords.slice(0, 3), ...shuffledRegular].slice(0, batchSize);
    setRoundWords(selected);

    // 生成左列 (中文) 并随机乱序
    const cns: MatchCard[] = selected.map(w => ({
      cardId: `cn_${w.id}_${Math.random()}`,
      wordId: w.id,
      text: (w.meaning || w.translation || '').trim() || '暂无释义',
      type: 'cn' as const,
      isEliminated: false,
      isWrong: false,
    })).sort(() => Math.random() - 0.5);

    // 生成右列 (英文) 并独立随机乱序
    const ens: MatchCard[] = selected.map(w => ({
      cardId: `en_${w.id}_${Math.random()}`,
      wordId: w.id,
      text: (w.word || '').trim(),
      type: 'en' as const,
      isEliminated: false,
      isWrong: false,
      phonetic: w.phonetic,
    })).sort(() => Math.random() - 0.5);

    setCnCards(cns);
    setEnCards(ens);
    setSelectedCnId(null);
    setSelectedEnId(null);
    setActiveLine(null);
    setBurstPoint(null);
    setIsRoundClear(false);
  };

  useEffect(() => {
    initRound(poolWords);
    setElapsedSeconds(0);
    setCombo(0);
    setMaxCombo(0);

    timerRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poolWords, roundIndex]);

  // 格式化时间 mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 处理配对消除判定
  const checkMatch = (cnCardId: string, enCardId: string) => {
    const cn = cnCards.find(c => c.cardId === cnCardId);
    const en = enCards.find(c => c.cardId === enCardId);
    if (!cn || !en) return;

    // 获取两张卡片在 board 容器中的中心坐标绘制连线
    const boardEl = boardRef.current;
    const cnEl = document.getElementById(cnCardId);
    const enEl = document.getElementById(enCardId);

    if (boardEl && cnEl && enEl) {
      const bRect = boardEl.getBoundingClientRect();
      const cRect = cnEl.getBoundingClientRect();
      const eRect = enEl.getBoundingClientRect();

      const x1 = cRect.right - bRect.left;
      const y1 = cRect.top + cRect.height / 2 - bRect.top;
      const x2 = eRect.left - bRect.left;
      const y2 = eRect.top + eRect.height / 2 - bRect.top;

      setActiveLine({ x1, y1, x2, y2 });
      setBurstPoint({ x: (x1 + x2) / 2, y: (y1 + y2) / 2 });
    }

    if (cn.wordId === en.wordId) {
      // 配对成功！
      // 朗读英文
      speakWord(en.text, { onError: onSpeechError });

      // 连击增加
      setCombo(prev => {
        const next = prev + 1;
        setMaxCombo(m => Math.max(m, next));
        return next;
      });

      // 减弱该词在错题本中的权重
      resolveMistakeInSession(cn.wordId);
      if (stubbornMapRef.current[cn.wordId]) {
        delete stubbornMapRef.current[cn.wordId];
      }

      setTimeout(() => {
        setCnCards(prev =>
          prev.map(c => (c.cardId === cnCardId ? { ...c, isEliminated: true } : c))
        );
        setEnCards(prev =>
          prev.map(c => (c.cardId === enCardId ? { ...c, isEliminated: true } : c))
        );
        setSelectedCnId(null);
        setSelectedEnId(null);
        setActiveLine(null);
        setBurstPoint(null);

        // 检查本轮是否全消
        const remainingCn = cnCards.filter(c => c.cardId !== cnCardId && !c.isEliminated);
        if (remainingCn.length === 0) {
          setIsRoundClear(true);
        }
      }, 350);
    } else {
      // 配对失败！抖动变红，不消除
      setCombo(0);
      stubbornMapRef.current[cn.wordId] = (stubbornMapRef.current[cn.wordId] || 0) + 1;
      stubbornMapRef.current[en.wordId] = (stubbornMapRef.current[en.wordId] || 0) + 1;

      // 记录到错题库
      recordMistake(cn.wordId);

      setCnCards(prev =>
        prev.map(c => (c.cardId === cnCardId ? { ...c, isWrong: true } : c))
      );
      setEnCards(prev =>
        prev.map(c => (c.cardId === enCardId ? { ...c, isWrong: true } : c))
      );

      setTimeout(() => {
        setCnCards(prev =>
          prev.map(c => (c.cardId === cnCardId ? { ...c, isWrong: false } : c))
        );
        setEnCards(prev =>
          prev.map(c => (c.cardId === enCardId ? { ...c, isWrong: false } : c))
        );
        setSelectedCnId(null);
        setSelectedEnId(null);
        setActiveLine(null);
        setBurstPoint(null);
      }, 500);
    }
  };

  const handleCardClick = (card: MatchCard) => {
    if (card.isEliminated) return;

    if (card.type === 'cn') {
      if (selectedCnId === card.cardId) {
        setSelectedCnId(null);
        return;
      }
      setSelectedCnId(card.cardId);
      if (selectedEnId) {
        checkMatch(card.cardId, selectedEnId);
      }
    } else {
      if (selectedEnId === card.cardId) {
        setSelectedEnId(null);
        return;
      }
      setSelectedEnId(card.cardId);
      if (selectedCnId) {
        checkMatch(selectedCnId, card.cardId);
      }
    }
  };

  const eliminatedCount = cnCards.filter(c => c.isEliminated).length;
  const totalCount = cnCards.length;

  return (
    <div className="w-full max-w-[880px] mx-auto flex flex-col justify-between min-h-[calc(100vh-140px)] select-none">
      {/* 顶部状态条：连击点缀与标题 */}
      <div className="flex items-center justify-between py-2 border-b border-[#E6EEF1]/80 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wide text-[#2C3E46]">
            阶段四 · 连线消消乐
          </span>
          <span className="text-[11px] text-[#96A8B0]">
            点中文配英文，点击即连线消除
          </span>
        </div>

        {/* 连击奖励徽标 (仅此两处使用暖色点缀) */}
        {combo > 1 && (
          <div className="flex items-center gap-1.5 animate-scaleIn">
            <span className="text-xs font-bold text-[#8899A6] tracking-wider">COMBO</span>
            <span className="font-mono text-xl font-extrabold text-sun-grad">
              × {combo}
            </span>
          </div>
        )}
      </div>

      {/* 消消乐核心游戏板 */}
      <div
        ref={boardRef}
        className="relative flex-1 flex flex-col justify-center my-auto py-2"
      >
        {/* SVG 连线图层 */}
        {activeLine && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
            <defs>
              <linearGradient id="acc-grad-svg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38d39f" />
                <stop offset="55%" stopColor="#4ec3e0" />
                <stop offset="100%" stopColor="#6ba8f5" />
              </linearGradient>
            </defs>
            <line
              x1={activeLine.x1}
              y1={activeLine.y1}
              x2={activeLine.x2}
              y2={activeLine.y2}
              stroke="url(#acc-grad-svg)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeOpacity="0.88"
            />
          </svg>
        )}

        {/* 爆点动效：四向光刺 + +1 */}
        {burstPoint && (
          <div
            className="absolute pointer-events-none z-30 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 animate-scaleIn"
            style={{ left: burstPoint.x, top: burstPoint.y }}
          >
            <div className="w-8 h-8 rounded-full bg-[#ffb84d]/30 blur-xs absolute" />
            <span className="font-mono font-extrabold text-lg text-sun-grad">
              +1
            </span>
          </div>
        )}

        {/* 左右双列排布 */}
        <div className="grid grid-cols-2 gap-4 sm:gap-8">
          {/* 左列：中文释义 */}
          <div className="flex flex-col gap-2.5">
            {cnCards.map(card => {
              const isSelected = selectedCnId === card.cardId;

              if (card.isEliminated) {
                return (
                  <div
                    key={card.cardId}
                    className="h-13 rounded-[13px] border border-dashed border-[#D2E2DC] bg-[#FAFDFB]/60 flex items-center justify-center text-xs text-emerald-600/70 font-medium select-none"
                  >
                    已消除 ✓
                  </div>
                );
              }

              return (
                <div
                  key={card.cardId}
                  id={card.cardId}
                  onClick={() => handleCardClick(card)}
                  className={`h-13 rounded-[13px] px-4 flex items-center justify-between text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer shadow-xs ${
                    card.isWrong
                      ? 'border-2 border-rose-400 bg-rose-50 text-rose-600 animate-shake'
                      : isSelected
                      ? 'bg-acc-grad text-white font-bold shadow-[0_4px_12px_rgba(74,157,184,0.22)]'
                      : isDark
                      ? 'bg-[#1E2834] text-neutral-200 border border-neutral-700 hover:border-neutral-500'
                      : 'bg-white text-[#2C3E46] border border-[#E6EEF1] hover:border-[#4ec3e0]/60 hover:shadow-sm'
                  }`}
                >
                  <span className="truncate pr-2">{card.text}</span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-white shrink-0 shadow-2xs" />
                  )}
                </div>
              );
            })}
          </div>

          {/* 右列：英文单词 */}
          <div className="flex flex-col gap-2.5">
            {enCards.map(card => {
              const isSelected = selectedEnId === card.cardId;

              if (card.isEliminated) {
                return (
                  <div
                    key={card.cardId}
                    className="h-13 rounded-[13px] border border-dashed border-[#D2E2DC] bg-[#FAFDFB]/60 flex items-center justify-center text-xs text-emerald-600/70 font-medium select-none"
                  >
                    已消除 ✓
                  </div>
                );
              }

              return (
                <div
                  key={card.cardId}
                  id={card.cardId}
                  onClick={() => handleCardClick(card)}
                  className={`h-13 rounded-[13px] px-4 flex items-center justify-between transition-all duration-150 cursor-pointer shadow-xs ${
                    card.isWrong
                      ? 'border-2 border-rose-400 bg-rose-50 text-rose-600 animate-shake'
                      : isSelected
                      ? 'bg-acc-grad text-white font-bold shadow-[0_4px_12px_rgba(74,157,184,0.22)]'
                      : isDark
                      ? 'bg-[#1E2834] text-neutral-200 border border-neutral-700 hover:border-neutral-500'
                      : 'bg-white text-[#2C3E46] border border-[#E6EEF1] hover:border-[#4ec3e0]/60 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-baseline gap-2 truncate">
                    <span className="font-serif-en text-sm sm:text-base font-bold tracking-wide">
                      {card.text}
                    </span>
                    {card.phonetic && (
                      <span
                        className={`text-[11px] font-mono hidden sm:inline ${
                          isSelected ? 'text-white/80' : 'text-[#96A8B0]'
                        }`}
                      >
                        /{card.phonetic}/
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-white shrink-0 shadow-2xs" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 本轮通关结算遮罩卡 */}
      {isRoundClear && (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[22px] max-w-sm w-full p-6 text-center shadow-xl border border-[#E6EEF1] animate-scaleIn">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-7 h-7 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-serif-en font-bold text-[#2C3E46] mb-1">
              🎉 本轮通关！
            </h3>
            <p className="text-xs text-[#7B8F99] mb-5">
              消灭 {totalCount} 词 · 最高连击 {maxCombo} · 用时 {formatTime(elapsedSeconds)}
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setRoundIndex(i => i + 1);
                }}
                className="w-full py-2.5 rounded-xl font-bold text-sm bg-acc-grad text-white shadow-xs hover:opacity-95 transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>下一轮消消乐</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onFinishStage4}
                className="w-full py-2.5 rounded-xl text-xs text-[#60727B] hover:text-[#2C3E46] transition-colors cursor-pointer"
              >
                全部完成，返回阶段一
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部细进度条与用时 */}
      <div className="w-full pt-3 pb-1 border-t border-[#E6EEF1]/60">
        <div className="flex items-center justify-between text-[11px] text-[#96A8B0] mb-1.5 font-mono">
          <span>已消除 {eliminatedCount} / {totalCount}</span>
          <div className="flex items-center gap-2">
            <span>{formatTime(elapsedSeconds)}</span>
            <button
              type="button"
              title="重玩本轮"
              onClick={() => initRound(roundWords)}
              className="text-[#96A8B0] hover:text-[#2C3E46] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 inline" />
            </button>
          </div>
        </div>

        <div className="w-full bg-[#EAE6DD] h-[2px] rounded-full overflow-hidden">
          <div
            className="bg-acc-grad h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${totalCount > 0 ? Math.round((eliminatedCount / totalCount) * 100) : 0}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
