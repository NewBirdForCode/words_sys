import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Volume2,
  Camera,
  Check,
  ArrowLeft
} from 'lucide-react';
import { WordItem, LearningMode } from '../types';
import { ThemeConfig } from '../types/theme';
import { getDefaultTheme } from '../utils/theme';
import { speakWord, speakSentence, stopAllSpeech } from '../utils/speech';
import { BUILTIN_DICTIONARY } from '../data/dictionary';
import { VOCABULARY_BANK } from '../data/vocabulary';
import {
  fetchWordImage,
  saveWordImage,
  getFallbackScene,
  FallbackScene
} from '../utils/wordImage';
import { resolveDseContent, ResolvedDseContent } from '../utils/dseContent';

interface Stage1ShadowingProps {
  words: WordItem[];
  allWordsMap?: Record<string, WordItem>;
  activeWordbookId?: string;
  learningMode?: LearningMode; // 'fast_review' | 'focused_quiz'
  onModeChange?: (mode: LearningMode) => void;
  onFinishStage1: () => void;
  onBack?: () => void;
  onProceedToStage4?: () => void;
  onSpeechError?: (msg: string) => void;
  onOpenPunchIn?: (photoUrl?: string) => void;
  currentTheme?: ThemeConfig;
}

interface ChoiceOption {
  id: string;
  word: string;
  meaning: string;
  isCorrect: boolean;
}

/**
 * 精选刷词（阶段一）
 * 定位: 刷词，不是刷题。无得分、无对错弹窗、无计时、无错题本。
 *
 * 模式说明：
 * - 「今日精选30词」= 默认模式，阶段一主体，看图 → 读高亮原句 → 选中文释义 → 下一个
 * - 「快速刷200词」= 快速回顾模式，看图 → 读高亮原句 → 下一个 (无选项)
 * - 两个模式各自记录断点位置，切换时不丢失进度
 */
export const Stage1Shadowing: React.FC<Stage1ShadowingProps> = ({
  words,
  activeWordbookId,
  learningMode = 'focused_quiz',
  onModeChange,
  onFinishStage1,
  onBack,
  onSpeechError,
}) => {
  const isFastReview = learningMode === 'fast_review';

  // 两个模式各自记录断点位置，本地持久化
  const [focusedIndex, setFocusedIndex] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const key = `daily30_stage1_focused_idx_${activeWordbookId || 'default'}`;
    const saved = localStorage.getItem(key);
    return saved ? Math.max(0, parseInt(saved, 10) || 0) : 0;
  });

  const [fastIndex, setFastIndex] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const key = `daily30_stage1_fast_idx_${activeWordbookId || 'default'}`;
    const saved = localStorage.getItem(key);
    return saved ? Math.max(0, parseInt(saved, 10) || 0) : 0;
  });

  // 当前模式对应的词序索引 (安全越界保护)
  const currentIndex = useMemo(() => {
    if (words.length === 0) return 0;
    const target = isFastReview ? fastIndex : focusedIndex;
    return Math.min(Math.max(0, target), words.length - 1);
  }, [isFastReview, fastIndex, focusedIndex, words.length]);

  // 四选一选择态 (选中态: 墨绿描边，不做即时对错反馈，不弹窗)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // 图片加载与缓存
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [fallbackScene, setFallbackScene] = useState<FallbackScene | null>(null);

  // 完成状态
  const [isCompleted, setIsCompleted] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onSpeechErrorRef = useRef(onSpeechError);

  useEffect(() => {
    onSpeechErrorRef.current = onSpeechError;
  }, [onSpeechError]);

  const currentWord = words[currentIndex];

  // 规范化目标中文释义
  const targetMeaning = useMemo(() => {
    if (!currentWord) return '';
    return (
      currentWord.meaning ||
      currentWord.translation ||
      currentWord.chineseMeaning ||
      BUILTIN_DICTIONARY[currentWord.word.toLowerCase()]?.meaning ||
      ''
    ).trim();
  }, [currentWord]);

  // 音标
  const phonetic = useMemo(() => {
    if (!currentWord) return '';
    return (
      currentWord.phonetic ||
      BUILTIN_DICTIONARY[currentWord.word.toLowerCase()]?.phonetic ||
      ''
    ).trim();
  }, [currentWord]);

  // DSE 课本原句与出处解析
  const resolvedDse: ResolvedDseContent = useMemo(() => {
    return resolveDseContent(currentWord);
  }, [currentWord]);

  // 备选干扰词池
  const candidatePool = useMemo(() => {
    const list: WordItem[] = [...words];
    if (list.length < 15) {
      VOCABULARY_BANK.forEach(v => {
        if (!list.some(item => item.id === v.id || item.word === v.word)) {
          list.push(v);
        }
      });
    }
    return list;
  }, [words]);

  /**
   * 精选刷题模式：智能生成 4 个中文释义卡片
   * 优先选词性相同、释义字数相近的同词库干扰项
   */
  const currentOptions = useMemo((): ChoiceOption[] => {
    if (!currentWord) return [];

    const correctMeaning = targetMeaning || '核心考点释义';
    const currentPos = (
      currentWord.partOfSpeech ||
      BUILTIN_DICTIONARY[currentWord.word.toLowerCase()]?.partOfSpeech ||
      ''
    ).trim().toLowerCase();

    // 筛选有效候选词
    const otherCandidates = candidatePool.filter(
      w =>
        w.id !== currentWord.id &&
        w.word.toLowerCase() !== currentWord.word.toLowerCase() &&
        (w.meaning || w.translation || '').trim().length > 0 &&
        (w.meaning || w.translation || '').trim() !== correctMeaning
    );

    // 智能评分：同词性优先 + 长度贴近
    const scored = otherCandidates.map(item => {
      const itemMeaning = (item.meaning || item.translation || '').trim();
      const itemPos = (
        item.partOfSpeech ||
        BUILTIN_DICTIONARY[item.word.toLowerCase()]?.partOfSpeech ||
        ''
      ).trim().toLowerCase();

      let score = 0;
      if (currentPos && itemPos && (currentPos === itemPos || currentPos.includes(itemPos) || itemPos.includes(currentPos))) {
        score += 15;
      }
      const lenDiff = Math.abs(itemMeaning.length - correctMeaning.length);
      score += Math.max(0, 10 - lenDiff);
      score += Math.random() * 4;

      return { item, meaning: itemMeaning, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const seenMeanings = new Set<string>([correctMeaning]);
    const distractors: ChoiceOption[] = [];

    for (const entry of scored) {
      const m = entry.meaning.trim();
      if (m && !seenMeanings.has(m)) {
        seenMeanings.add(m);
        distractors.push({
          id: `opt_${entry.item.id}_${Math.random().toString(36).substring(2, 6)}`,
          word: entry.item.word,
          meaning: m,
          isCorrect: false,
        });
        if (distractors.length >= 3) break;
      }
    }

    // 兜底干扰项 (确保绝不为空)
    const fallbackMeanings = [
      '居民、住户',
      '借入、借用',
      '买得起、承担得起',
      '避免、避开',
      '参加、出席',
      '除非、如果不',
      '虽然、尽管',
      '负责任的',
      '机会、良机',
      '环境、生态',
      '无所不在的',
      '务实的',
      '减轻、缓和',
      '有弹性的',
      '倡导、支持',
    ];

    let fbIdx = 0;
    while (distractors.length < 3 && fbIdx < fallbackMeanings.length) {
      const fbM = fallbackMeanings[fbIdx];
      if (!seenMeanings.has(fbM)) {
        seenMeanings.add(fbM);
        distractors.push({
          id: `opt_fb_${fbIdx}_${Math.random().toString(36).substring(2, 6)}`,
          word: 'distractor',
          meaning: fbM,
          isCorrect: false,
        });
      }
      fbIdx++;
    }

    const all4: ChoiceOption[] = [
      {
        id: `opt_correct_${currentWord.id}`,
        word: currentWord.word,
        meaning: correctMeaning,
        isCorrect: true,
      },
      ...distractors.slice(0, 3),
    ];

    // 洗牌排列四个选项
    return all4.sort(() => 0.5 - Math.random());
  }, [currentWord, targetMeaning, candidatePool]);

  // 播放当前单词发音
  const playWord = useCallback((wordStr: string) => {
    speakWord(wordStr, {
      audioUrl: currentWord?.dictAudioUrl || currentWord?.audioUrl || undefined,
      onError: msg => {
        onSpeechErrorRef.current?.(msg);
      },
    });
  }, [currentWord?.dictAudioUrl, currentWord?.audioUrl]);

  // 播放例句发音
  const playSentence = useCallback((sentenceStr?: string) => {
    const toSpeak = sentenceStr || resolvedDse.sentence;
    if (!toSpeak) return;
    speakSentence(toSpeak, {
      onError: msg => {
        onSpeechErrorRef.current?.(msg);
      },
    });
  }, [resolvedDse.sentence]);

  // 换词时重置状态并自动拉取图片
  useEffect(() => {
    if (!currentWord || isCompleted) return;

    setSelectedOptionId(null);
    setImageLoadError(false);
    setIsImageLoading(true);

    const baseMeaning = targetMeaning;
    const scene = getFallbackScene(currentWord.word, baseMeaning);
    setFallbackScene(scene);

    let isCancelled = false;
    fetchWordImage(currentWord.word)
      .then(url => {
        if (!isCancelled) {
          if (url) {
            setCurrentImageUrl(url);
          } else {
            setCurrentImageUrl(null);
          }
          setIsImageLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setCurrentImageUrl(null);
          setIsImageLoading(false);
        }
      });

    // 默认短延迟轻量播音
    const voiceTimer = setTimeout(() => {
      playWord(currentWord.word);
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(voiceTimer);
      stopAllSpeech();
    };
  }, [currentIndex, isCompleted, currentWord?.id, playWord, targetMeaning]);

  // 切换到下一个词
  const goToNextWord = () => {
    if (currentIndex >= words.length - 1) {
      setIsCompleted(true);
      return;
    }
    const nextIdx = currentIndex + 1;
    if (isFastReview) {
      setFastIndex(nextIdx);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`daily30_stage1_fast_idx_${activeWordbookId || 'default'}`, String(nextIdx));
      }
    } else {
      setFocusedIndex(nextIdx);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`daily30_stage1_focused_idx_${activeWordbookId || 'default'}`, String(nextIdx));
      }
    }
    setSelectedOptionId(null);
  };

  // 切换到上一个词
  const goToPrevWord = () => {
    if (currentIndex <= 0) return;
    const prevIdx = currentIndex - 1;
    if (isFastReview) {
      setFastIndex(prevIdx);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`daily30_stage1_fast_idx_${activeWordbookId || 'default'}`, String(prevIdx));
      }
    } else {
      setFocusedIndex(prevIdx);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`daily30_stage1_focused_idx_${activeWordbookId || 'default'}`, String(prevIdx));
      }
    }
    setSelectedOptionId(null);
  };

  // 图片上传更换
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentWord) return;

    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        const dataUrl = ev.target.result as string;
        setCurrentImageUrl(dataUrl);
        saveWordImage(currentWord.word, dataUrl);
        setImageLoadError(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // 再刷一遍
  const handleRestart = () => {
    if (isFastReview) {
      setFastIndex(0);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`daily30_stage1_fast_idx_${activeWordbookId || 'default'}`, '0');
      }
    } else {
      setFocusedIndex(0);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`daily30_stage1_focused_idx_${activeWordbookId || 'default'}`, '0');
      }
    }
    setIsCompleted(false);
    setSelectedOptionId(null);
  };

  /**
   * 原句中目标单词高亮：橙色文字 + 浅橙底色 (与绿色主题明显区分)
   */
  const renderHighlightedSentence = (sentence: string, targetWord: string) => {
    if (!sentence) return null;
    if (!targetWord) return <span>{sentence}</span>;

    const regex = new RegExp(`(${targetWord}[a-zA-Z]*)`, 'gi');
    const parts = sentence.split(regex);
    return (
      <span className="text-[#2C2C2C] leading-relaxed">
        {parts.map((part, index) => {
          if (part.toLowerCase().startsWith(targetWord.toLowerCase())) {
            return (
              <span
                key={index}
                className="text-[#D9531E] bg-[#FFF0E6] px-1.5 py-0.5 rounded-md font-bold mx-0.5"
              >
                {part}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  };

  if (!currentWord || words.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-[#EAE6DD] p-8 text-center text-[#666666] my-auto">
        暂无可学习词汇，请返回词库选择或导入单词。
      </div>
    );
  }

  // ---------------- 【全部过完结算界面】 ----------------
  if (isCompleted) {
    return (
      <div className="bg-white rounded-3xl border border-[#EAE6DD] p-7 sm:p-10 text-center max-w-lg mx-auto shadow-xs animate-fadeIn select-none my-auto">
        <div className="w-16 h-16 rounded-full bg-[#D7E8DD] text-[#1C3E2A] flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8" />
        </div>

        <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1C3E2A] mb-2">
          {isFastReview ? '快速200词已全部刷完 ✓' : '今日30词已全部刷完 ✓'}
        </h3>

        <p className="text-xs sm:text-sm text-[#666666] mb-6">
          {isFastReview
            ? `共快速过完 ${words.length} 词，语境语感混脸熟达成！`
            : '今日精选任务已全部刷完，学得深、记得牢！'}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleRestart}
            className="w-full sm:w-auto px-6 py-2.5 border border-[#DDD7CC] hover:bg-[#FAF7F0] text-[#2C2C2C] font-bold rounded-xl text-sm transition-colors cursor-pointer"
          >
            再刷一遍
          </button>

          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#1C3E2A] hover:bg-[#142E1F] text-white font-bold rounded-xl text-sm transition-colors cursor-pointer shadow-xs"
          >
            返回
          </button>

          {!isFastReview && onFinishStage1 && (
            <button
              type="button"
              onClick={onFinishStage1}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#FAF3E8] hover:bg-[#F2E8D8] text-[#7A4B1A] font-bold rounded-xl text-sm transition-colors cursor-pointer border border-[#E8DCC8]"
            >
              去阶段二 自测批改 →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------------- 【卡片学习区】 ----------------
  const totalCount = words.length;
  // 剩余词数: 包含当前正在刷的词
  const remainingCount = Math.max(0, totalCount - currentIndex);
  const progressPercent = Math.min(100, Math.max(0, ((currentIndex + 1) / totalCount) * 100));

  // 来源展示文本 (优先教材原句标注)
  const sourceDisplayText = resolvedDse.sourceBook
    ? resolvedDse.sourceBook
    : resolvedDse.sourceText.includes('Oxford')
    ? resolvedDse.sourceText
    : `Oxford English for HKDSE (Theme: ${resolvedDse.sourceUnit || 'Reading & Writing'})`;

  return (
    <div className="w-full max-w-[480px] mx-auto flex flex-col animate-fadeIn select-none relative pb-6">
      {/* 隐藏的图片更换 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 
        【1|顶部固定栏】
        左侧 [←返回], 中间标题「精选刷词」, 右侧「剩余 12/30」
        标题下方一行模式切换 (胶囊按钮, 选中=墨绿实底白字): 🔘 今日精选30词(默认) | 🔘 快速刷200词
      */}
      <div className="sticky top-0 z-30 bg-[#FFFDF8]/95 backdrop-blur-md border-b border-[#EAE6DD]/70 pt-1 pb-0 mb-3">
        <div className="flex items-center justify-between h-10 px-1">
          {/* 左侧 [←返回] */}
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-[#555555] hover:text-[#1C3E2A] font-medium py-1 px-1.5 rounded-lg hover:bg-[#FAF7F0] transition-colors cursor-pointer"
            title="返回词库管理"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回</span>
          </button>

          {/* 中间标题「精选刷词」 */}
          <h1 className="font-serif font-bold text-base text-[#2C2C2C] tracking-tight">
            精选刷词
          </h1>

          {/* 右侧「剩余 12/30」 */}
          <span className="font-mono text-xs font-bold text-[#444444] bg-[#FAF7F0] border border-[#EAE6DD] px-2.5 py-0.5 rounded-full shadow-2xs">
            剩余 {remainingCount}/{totalCount}
          </span>
        </div>

        {/* 模式切换 (胶囊按钮, 选中=墨绿实底白字): 🔘 今日精选30词(默认) | 🔘 快速刷200词 */}
        <div className="flex items-center justify-center pt-1 pb-2">
          <div className="inline-flex p-1 bg-[#EFECE4] rounded-full gap-1">
            <button
              type="button"
              onClick={() => onModeChange?.('focused_quiz')}
              className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                !isFastReview
                  ? 'bg-[#1C3E2A] text-white shadow-2xs'
                  : 'bg-transparent text-[#555555] hover:text-[#1C3E2A]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  !isFastReview ? 'bg-white' : 'bg-transparent border border-[#888888]'
                }`}
              />
              <span>今日精选30词</span>
            </button>

            <button
              type="button"
              onClick={() => onModeChange?.('fast_review')}
              className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isFastReview
                  ? 'bg-[#1C3E2A] text-white shadow-2xs'
                  : 'bg-transparent text-[#555555] hover:text-[#1C3E2A]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isFastReview ? 'bg-white' : 'bg-transparent border border-[#888888]'
                }`}
              />
              <span>快速刷200词</span>
            </button>
          </div>
        </div>

        {/* 
          【2|进度条】
          细条, 仅显示进度, 高度≤4px, 贴在顶部栏下方, 不占大面积
          快速=蓝色 (bg-blue-600), 精选=绿色 (bg-[#1C3E2A])
        */}
        <div className="w-full bg-[#EAE6DD] h-[3px] overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-out ${
              isFastReview ? 'bg-blue-600' : 'bg-[#1C3E2A]'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 
        【4|单词行】
        单词/音标/播放: 放在图片区上方一行小字 (单词+音标+🔊), 不占据卡片主体
      */}
      <div className="flex items-center justify-center gap-2 py-1 text-sm select-none">
        <span className="font-serif font-bold text-lg text-[#1A1A1A] tracking-tight">
          {currentWord.word}
        </span>
        {phonetic && (
          <span className="font-mono text-xs text-[#666666] tracking-wide">
            {phonetic}
          </span>
        )}
        <button
          type="button"
          onClick={() => playWord(currentWord.word)}
          className="p-1 text-[#666666] hover:text-[#1C3E2A] rounded-full transition-colors cursor-pointer"
          title="朗读单词"
        >
          <Volume2 className="w-4 h-4 text-[#1C3E2A]" />
        </button>
      </div>

      {/* 
        【3|卡片区(垂直排布,大量留白)】
        a) 配图: 居中大图, 占页面上半部分, 不加边框装饰;
           无合适图片时用主题色底+大号emoji兜底, 不留空白
      */}
      <div
        className="w-full aspect-[4/3] max-h-[260px] sm:max-h-[300px] rounded-2xl overflow-hidden relative bg-[#FAF7F0] flex items-center justify-center select-none shadow-xs mt-1"
        onClick={() => playWord(currentWord.word)}
      >
        {currentImageUrl && !imageLoadError ? (
          <img
            src={currentImageUrl}
            alt={currentWord.word}
            onError={() => setImageLoadError(true)}
            className="w-full h-full object-cover transition-opacity duration-300"
            style={{ opacity: isImageLoading ? 0.3 : 1 }}
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${
              fallbackScene?.gradient || 'from-emerald-100/60 via-amber-50/70 to-stone-200/50'
            } flex flex-col items-center justify-center p-4 relative`}
          >
            <div className="text-[96px] sm:text-[110px] leading-none filter drop-shadow-sm select-none flex items-center justify-center">
              {fallbackScene?.emojis || '📖✨'}
            </div>
            <span className="text-[11px] font-bold text-[#555555] bg-white/85 backdrop-blur-xs px-2.5 py-0.5 rounded-full mt-2 shadow-2xs border border-white/70">
              {fallbackScene?.bgDesc || 'DSE 核心语境'}
            </span>
          </div>
        )}

        {/* 右上角换图 */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="absolute top-2.5 right-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 transition-all opacity-80 hover:opacity-100 cursor-pointer border border-white/20"
          title="点击更换图片"
        >
          <Camera className="w-3 h-3" />
          <span>换图</span>
        </button>
      </div>

      {/* b) 留白一行 */}
      <div className="h-4 sm:h-5" />

      {/* 
        c) 课本原句(核心): 完整原句, 深炭色正文;
        目标单词用"橙色文字+浅橙底色"高亮 (与现有绿色主题区分明显)
      */}
      <div className="w-full bg-[#FAF7F0] border border-[#EAE6DD] rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 text-sm sm:text-base text-[#2C2C2C] leading-relaxed">
            {renderHighlightedSentence(resolvedDse.sentence, currentWord.word)}
          </div>
          <button
            type="button"
            onClick={() => playSentence(resolvedDse.sentence)}
            className="p-1.5 rounded-full bg-white text-[#2C2C2C] border border-[#EAE6DD] hover:bg-[#F2E8D8] transition-transform active:scale-95 shrink-0 shadow-2xs cursor-pointer mt-0.5"
            title="朗读课本原句"
          >
            <Volume2 className="w-4 h-4 text-[#1C3E2A]" />
          </button>
        </div>

        {/* 来源标注 (Oxford English for HKDSE ...) */}
        <div className="text-[11px] text-[#777777] font-mono pt-1.5 border-t border-[#EAE6DD]/70 truncate">
          {sourceDisplayText}
        </div>
      </div>

      {/* d) 留白一行 */}
      <div className="h-3 sm:h-4" />

      {/* 
        e) 【仅精选30词模式】提示小字: "选择该句中高亮单词的中文意思"
        f) 【仅精选30词模式】四选一: 4个中文释义卡片, 竖向排列, 大圆角;
           点击即选中 (选中态: 墨绿描边), 不做对错即时反馈、不弹窗;
           选完后点「下一个」直接切下一词 (未选也可点下一个, 不阻拦)
      */}
      {!isFastReview && (
        <div className="w-full flex flex-col gap-2 animate-fadeIn">
          <p className="text-xs text-[#777777] text-left pl-1 font-medium">
            选择该句中高亮单词的中文意思
          </p>

          <div className="flex flex-col gap-2.5 w-full">
            {currentOptions.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`w-full py-3 px-4 rounded-2xl border text-left text-xs sm:text-sm transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-2 border-[#1C3E2A] bg-[#1C3E2A]/5 text-[#1C3E2A] font-semibold ring-1 ring-[#1C3E2A]'
                      : 'border-[#EAE6DD] bg-white text-[#2C2C2C] hover:border-[#CCCCCC] hover:bg-[#FAF7F0]'
                  }`}
                >
                  {opt.meaning}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 
        【4|底部按钮(两种模式共用)】
        仅两个大按钮: 👈 上一个 ｜ 下一个 👉
        不显示: 中文释义(默认隐藏)、同义词、计时、得分
      */}
      <div className="flex items-center gap-3 w-full mt-4">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={goToPrevWord}
          className={`flex-1 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            currentIndex === 0
              ? 'bg-[#F2EFE8] text-[#AAAAAA] cursor-not-allowed border border-[#EAE6DD]'
              : 'bg-white hover:bg-[#FAF7F0] text-[#2C2C2C] border border-[#DDD7CC] shadow-2xs'
          }`}
        >
          <span>👈 上一个</span>
        </button>

        <button
          type="button"
          onClick={goToNextWord}
          className="flex-1 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-[#1C3E2A] hover:bg-[#142E1F] text-white shadow-xs"
        >
          <span>{currentIndex >= words.length - 1 ? '完成 ✓' : '下一个 👉'}</span>
        </button>
      </div>
    </div>
  );
};
