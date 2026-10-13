import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  BookOpen,
  Plus,
  Upload,
  FileText,
  FileSpreadsheet,
  Check,
  Trash2,
  Edit2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layers,
  Sparkles,
  ChevronRight,
  BookMarked
} from 'lucide-react';
import { Wordbook, WordItem, WordbookCategory, LearningMode } from '../types';
import {
  getAllWordbooks,
  saveAllWordbooks,
  getActiveWordbookId,
  setActiveWordbookId,
  createWordbook,
  updateWordbookName,
  deleteWordbook,
  parseWordbookText,
  parseExcelFile,
  getSystemWordbooks,
  copySystemWordbookToUser
} from '../utils/wordbook';
import { computeWordbookProgress } from '../utils/plan';
import { prefetchWordbookEnrichment } from '../utils/wordEnrichment';

interface WordbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActiveWordbookChange: (wordbookId: string) => void;
  onStartLearningMode?: (wordbookId: string, mode: LearningMode) => void;
}

type ModalTab = 'my_books' | 'system_books';
type ModalView = 'list' | 'input' | 'preview';

// 系统词汇筛选第一排分类选项
const CATEGORY_CHIPS: Array<{ key: string; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'DSE', label: 'DSE' },
  { key: '雅思', label: '雅思' },
  { key: '四六级', label: '四六级' },
  { key: '校本', label: '校本' },
  { key: '其他', label: '其他' },
];

// 系统词汇筛选第二排细分选项 (年级/出版社/题型)
const SUB_FILTER_CHIPS: Array<{ key: string; label: string; type: 'grade' | 'tag' | 'publisher' }> = [
  { key: 'all', label: '全部细分', type: 'tag' },
  { key: 'P4', label: 'P4', type: 'grade' },
  { key: 'P5', label: 'P5', type: 'grade' },
  { key: 'P6', label: 'P6', type: 'grade' },
  { key: 'S1-S3', label: 'S1-S3', type: 'grade' },
  { key: 'S4-S6', label: 'S4-S6', type: 'grade' },
  { key: '阅读', label: '阅读', type: 'tag' },
  { key: '听力', label: '听力', type: 'tag' },
  { key: '写作', label: '写作', type: 'tag' },
  { key: '口语', label: '口语', type: 'tag' },
  { key: '牛津', label: '牛津', type: 'publisher' },
  { key: '朗文', label: '朗文', type: 'publisher' },
];

export const WordbookModal: React.FC<WordbookModalProps> = ({
  isOpen,
  onClose,
  onActiveWordbookChange,
  onStartLearningMode,
}) => {
  // 顶部双Tab: 「我的词库」(默认) / 「系统词汇」
  const [activeTab, setActiveTab] = useState<ModalTab>('my_books');
  const [view, setView] = useState<ModalView>('list');
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([]);
  const [activeWbId, setActiveWbId] = useState<string>('');

  // 系统词库列表
  const systemWordbooks = useMemo(() => getSystemWordbooks(), []);

  // 系统词汇筛选条件
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubFilter, setSelectedSubFilter] = useState<string>('all');

  // Editing existing wordbook name
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // New Wordbook creation state
  const [newBookName, setNewBookName] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [parsedWords, setParsedWords] = useState<WordItem[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // Manual single word entry state
  const [manualWord, setManualWord] = useState('');
  const [manualMeaning, setManualMeaning] = useState('');
  const [manualExample, setManualExample] = useState('');
  const [manualPhonetic, setManualPhonetic] = useState('');

  // 复制反馈 toast
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load wordbooks on open & handle keyboard shortcuts
  React.useEffect(() => {
    if (isOpen) {
      const all = getAllWordbooks();
      setWordbooks(all);
      setActiveWbId(getActiveWordbookId());
      setView('list');
      setActiveTab('my_books');
      setEditingId(null);
      setParseError(null);
      setManualWord('');
      setManualMeaning('');
      setManualExample('');
      setManualPhonetic('');
      setCopiedFeedback(null);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle active wordbook switch
  const handleSelectActive = (wbId: string) => {
    setActiveWordbookId(wbId);
    setActiveWbId(wbId);
    onActiveWordbookChange(wbId);
  };

  // Start creating new wordbook
  const handleStartCreate = () => {
    setNewBookName(`自编词库 ${new Date().toLocaleDateString()}`);
    setPastedText('');
    setParsedWords([]);
    setParseError(null);
    setView('input');
  };

  // Handle File Upload (TXT, CSV, Excel)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileName = file.name.toLowerCase();
      if (!newBookName || newBookName.startsWith('自编词库 ')) {
        setNewBookName(file.name.replace(/\.[^/.]+$/, ''));
      }

      let words: WordItem[] = [];
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        words = await parseExcelFile(file);
      } else {
        const text = await file.text();
        words = parseWordbookText(text);
      }

      if (words.length === 0) {
        setParseError('未能在文件中识别出有效英文单词，请核对格式。');
        return;
      }

      setParsedWords(words);
      setParseError(null);
      setView('preview');
    } catch (err) {
      setParseError('文件读取失败，请检查文件编码或格式。');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Parse pasted text
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setParseError('请粘贴单词文本后再点击识别。');
      return;
    }
    const words = parseWordbookText(pastedText);
    if (words.length === 0) {
      setParseError('未能识别出有效单词，请检查每行是否包含英文单词。');
      return;
    }
    setParsedWords(words);
    setParseError(null);
    setView('preview');
  };

  // Add manual single word with optional example
  const handleAddManualWord = () => {
    if (!manualWord.trim()) {
      setParseError('请输入单词英文。');
      return;
    }
    const cleanWord = manualWord.trim();
    const item: WordItem = {
      id: `w_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      word: cleanWord,
      meaning: manualMeaning.trim() || '暂无中文释义',
      translation: manualMeaning.trim() || '暂无中文释义',
      phonetic: manualPhonetic.trim() || undefined,
      exampleEn: manualExample.trim() || undefined,
      exampleSentence: manualExample.trim() || undefined,
    };
    setParsedWords(prev => [item, ...prev]);
    setManualWord('');
    setManualMeaning('');
    setManualExample('');
    setManualPhonetic('');
    setParseError(null);
    setView('preview');
  };

  // Confirm import and write to database
  const handleConfirmImport = () => {
    if (parsedWords.length === 0) return;
    const created = createWordbook(newBookName, parsedWords);
    const updatedAll = getAllWordbooks();
    setWordbooks(updatedAll);
    setActiveWbId(created.id);
    onActiveWordbookChange(created.id);

    prefetchWordbookEnrichment(created.id);

    setView('list');
    setActiveTab('my_books');
  };

  // Delete wordbook
  const handleDeleteWordbook = (id: string, name: string) => {
    if (wordbooks.length <= 1) {
      alert('至少需要保留一个词库，无法删除。');
      return;
    }
    if (window.confirm(`确定要删除词库「${name}」吗？`)) {
      deleteWordbook(id);
      const updated = getAllWordbooks();
      setWordbooks(updated);
      const currentActive = getActiveWordbookId();
      setActiveWbId(currentActive);
      onActiveWordbookChange(currentActive);
    }
  };

  // Save renamed wordbook
  const handleSaveRename = (id: string) => {
    if (!editingName.trim()) return;
    updateWordbookName(id, editingName);
    setWordbooks(getAllWordbooks());
    setEditingId(null);
  };

  // 用户点击系统词库的「使用」按钮
  // 完整复制到个人学习列表并自动激活，不影响系统词库本身
  const handleUseSystemWordbook = (sysWb: Wordbook) => {
    const userCopy = copySystemWordbookToUser(sysWb);
    const updated = getAllWordbooks();
    setWordbooks(updated);
    setActiveWbId(userCopy.id);
    onActiveWordbookChange(userCopy.id);
    prefetchWordbookEnrichment(userCopy.id);

    setCopiedFeedback(`已将「${sysWb.name}」添加至我的词库并设为当前学习！`);
    setTimeout(() => {
      setCopiedFeedback(null);
      setActiveTab('my_books');
    }, 1200);
  };

  // 过滤后的系统词库列表
  const filteredSystemWordbooks = useMemo(() => {
    return systemWordbooks.filter(wb => {
      // 1. 第一排类别过滤
      if (selectedCategory !== 'all') {
        if (selectedCategory === '其他') {
          if (['DSE', '雅思', '四六级', '校本'].includes(wb.category || '')) {
            return false;
          }
        } else if (wb.category !== selectedCategory) {
          return false;
        }
      }

      // 2. 第二排细分过滤
      if (selectedSubFilter !== 'all') {
        const item = SUB_FILTER_CHIPS.find(c => c.key === selectedSubFilter);
        if (item) {
          if (item.type === 'grade') {
            if (wb.grade !== item.key) return false;
          } else if (item.type === 'tag') {
            if (!wb.tags?.includes(item.key)) return false;
          } else if (item.type === 'publisher') {
            if (!wb.publisher?.includes(item.key)) return false;
          }
        }
      }

      return true;
    });
  }, [systemWordbooks, selectedCategory, selectedSubFilter]);

  // 按"教材系列 / 词库来源"分组
  const groupedSystemWordbooks = useMemo(() => {
    const groups: Record<string, Wordbook[]> = {};
    filteredSystemWordbooks.forEach(wb => {
      const groupKey = wb.series || wb.publisher || '官方标准大纲系列';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(wb);
    });
    return groups;
  }, [filteredSystemWordbooks]);

  return (
    <div
      data-testid="modal-wordbook-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-[#2C2C2C]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
    >
      <div
        data-testid="modal-wordbook-container"
        onClick={e => e.stopPropagation()}
        className="bg-[#FFFDF8] rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-[#EAE6DD] flex flex-col overflow-hidden animate-scaleIn relative"
      >
        {/* 操作反馈轻提示 */}
        {copiedFeedback && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 px-4 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 animate-scaleIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{copiedFeedback}</span>
          </div>
        )}

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#EAE6DD] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FAF3E8] text-[#2C2C2C] flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#2C2C2C] text-base font-serif">
                {view === 'list' && '词库中心'}
                {view === 'input' && '新建与导入个人词库'}
                {view === 'preview' && '识别预览'}
              </h3>
              <p className="text-xs text-[#666666]">
                {view === 'list' && (activeTab === 'my_books' ? `我的词库共 ${wordbooks.length} 本 · 点击卡片设为当前学习` : `系统精选考纲语料词库 · 随心添加学习`)}
                {view === 'input' && '支持格式A（单列）、格式B（词+义）、格式C（词+音标+义）'}
                {view === 'preview' && `词库：${newBookName} · 已识别 ${parsedWords.length} 个单词`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#666666] hover:text-[#2C2C2C] rounded-lg transition-colors cursor-pointer"
            title="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 【一|顶部双Tab(修订)】: 「我的词库」(默认) / 「系统词汇」 */}
        {view === 'list' && (
          <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-[#EAE6DD] bg-[#FAF7F0] flex items-center justify-between">
            <div className="inline-flex p-1 bg-[#EFECE4] rounded-full gap-1">
              {/* Tab 1: 我的词库 (默认) */}
              <button
                type="button"
                onClick={() => setActiveTab('my_books')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'my_books'
                    ? 'bg-[#1C3E2A] text-white shadow-2xs'
                    : 'bg-transparent text-[#446655] hover:text-[#1C3E2A]'
                }`}
              >
                我的词库 ({wordbooks.length})
              </button>

              {/* Tab 2: 系统词汇 */}
              <button
                type="button"
                onClick={() => setActiveTab('system_books')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'system_books'
                    ? 'bg-[#1C3E2A] text-white shadow-2xs'
                    : 'bg-transparent text-[#446655] hover:text-[#1C3E2A]'
                }`}
              >
                <span>系统词汇</span>
                <span className={`text-[10px] font-normal ${activeTab === 'system_books' ? 'text-white/80' : 'text-[#888888]'}`}>
                  {systemWordbooks.length}
                </span>
              </button>
            </div>

            {/* 新建/导入按钮 (位于我的词库栏右侧) */}
            {activeTab === 'my_books' && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#2C2C2C] bg-white hover:bg-[#FAF7F0] border border-[#DDD7CC] rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>自建/导入</span>
              </button>
            )}
          </div>
        )}

        {/* VIEW 1: WORDBOOK LIST */}
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* ---------------- Tab A: 我的词库 ---------------- */}
            {activeTab === 'my_books' && (
              <div className="space-y-3">
                {wordbooks.length === 0 ? (
                  <div className="py-12 text-center text-[#888888] space-y-3">
                    <BookOpen className="w-10 h-10 mx-auto text-[#CCC]" />
                    <p className="text-xs">暂无个人词库，可去「系统词汇」选择预置词书，或点击上方「自建/导入」</p>
                  </div>
                ) : (
                  wordbooks.map(wb => {
                    const isActive = wb.id === activeWbId;
                    const isEditing = editingId === wb.id;

                    return (
                      <div
                        key={wb.id}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                          isActive
                            ? 'border-[#1C3E2A] bg-[#FAFDF8] ring-1 ring-[#1C3E2A]/30 shadow-2xs'
                            : 'border-[#EAE6DD] bg-white hover:border-[#D5D0C5]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={e => setEditingName(e.target.value)}
                                  className="text-sm font-bold text-[#2C2C2C] px-2 py-1 border border-[#EAE6DD] rounded-lg bg-[#FFFDF8] focus:outline-hidden"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRename(wb.id)}
                                  className="px-2.5 py-1 text-xs bg-[#1C3E2A] text-white font-bold rounded-lg cursor-pointer"
                                >
                                  保存
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="text-xs text-[#666666] cursor-pointer"
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-serif font-bold text-base text-[#2C2C2C] truncate">
                                  {wb.name}
                                </h4>
                                {isActive && (
                                  <span className="text-[10px] font-bold text-[#1C3E2A] bg-[#D7E8DD] px-2 py-0.5 rounded-full shrink-0">
                                    当前正在学习
                                  </span>
                                )}
                                {wb.category && (
                                  <span className="text-[10px] font-medium text-[#777777] bg-[#F3EFE6] px-1.5 py-0.5 rounded shrink-0">
                                    {wb.category}
                                  </span>
                                )}
                              </div>
                            )}

                            {wb.description && (
                              <p className="text-[11px] text-[#777777] mt-1 line-clamp-1">
                                {wb.description}
                              </p>
                            )}

                            {/* 7天抗遗忘每日计划与刷库进度 */}
                            {(() => {
                              const prog = computeWordbookProgress(wb.id);
                              return (
                                <div className="mt-2.5 space-y-1.5">
                                  {/* 进度数值栏 */}
                                  <div className="flex items-center gap-2 text-xs text-[#555555] font-mono flex-wrap">
                                    <span>已学 <strong className="text-[#2C2C2C]">{prog.learnedWords}</strong> / {prog.totalWords}</span>
                                    <span aria-hidden="true" className="text-[#CCC]">·</span>
                                    <span>剩余新词 <strong className="text-[#2C2C2C]">{prog.remainingNewWords}</strong></span>
                                    <span aria-hidden="true" className="text-[#CCC]">·</span>
                                    {prog.isFullyLearned ? (
                                      <span className="text-[#1C3E2A] font-sans font-bold bg-[#D7E8DD] px-1.5 py-0.5 rounded text-[10px]">
                                        🎉 全库已学完 · 滚动巩固中
                                      </span>
                                    ) : (
                                      <span className="text-[#666666]">
                                        预计还需 <strong className="text-[#1C3E2A]">{prog.estimatedDaysLeft}</strong> 天刷完
                                      </span>
                                    )}
                                  </div>

                                  {/* 进度条 */}
                                  <div className="w-full bg-[#EAE6DD] h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${prog.progressPercent}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Right actions */}
                          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                            {!isActive && (
                              <button
                                type="button"
                                onClick={() => handleSelectActive(wb.id)}
                                className="px-3 py-1.5 text-xs font-bold text-[#1C3E2A] bg-[#E8F2EC] hover:bg-[#D7E8DD] border border-[#C5DDD0] rounded-xl transition-colors cursor-pointer"
                              >
                                设为当前
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(wb.id);
                                setEditingName(wb.name);
                              }}
                              className="p-1.5 text-[#666666] hover:text-[#2C2C2C] rounded-lg transition-colors cursor-pointer"
                              title="修改名称"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {wordbooks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteWordbook(wb.id, wb.name)}
                                className="p-1.5 text-[#7A2828] hover:bg-[#F7E2E2] rounded-lg transition-colors cursor-pointer"
                                title="删除词库"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 【7|与词库管理联动】每张词库卡片增加两个按钮: 🖼️ 精选今日30刷词 | ⚡ 快速刷200词 */}
                        <div className="mt-3 pt-3 border-t border-[#EAE6DD]/70 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectActive(wb.id);
                              onStartLearningMode?.(wb.id, 'focused_quiz');
                              onClose();
                            }}
                            className="flex-1 py-2 px-3 bg-[#E8F2EC] hover:bg-[#D7E8DD] text-[#1C3E2A] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#C5DDD0] shadow-2xs"
                            title="进入今日精选30词模式"
                          >
                            <span>🖼️ 精选今日30刷词</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleSelectActive(wb.id);
                              onStartLearningMode?.(wb.id, 'fast_review');
                              onClose();
                            }}
                            className="flex-1 py-2 px-3 bg-[#FAF3E8] hover:bg-[#F2E8D8] text-[#7A4B1A] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#E8DCC8] shadow-2xs"
                            title="进入快速刷200词模式"
                          >
                            <span>⚡ 快速刷200词</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ---------------- Tab B: 系统词汇 ---------------- */}
            {activeTab === 'system_books' && (
              <div className="space-y-5">
                {/* 【三|系统词汇Tab的分类筛选(修订)】: 两排chips、可横滑 */}
                <div className="space-y-2.5 pb-2 border-b border-[#EAE6DD]">
                  {/* 第一排 (类别): 全部 / DSE / 雅思 / 四六级 / 校本 / 其他 */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {CATEGORY_CHIPS.map(chip => {
                      const isSelected = selectedCategory === chip.key;
                      return (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => setSelectedCategory(chip.key)}
                          className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#1C3E2A] text-white border border-[#1C3E2A] shadow-2xs'
                              : 'bg-white text-[#555555] border border-[#DDD7CC] hover:border-[#1C3E2A]'
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* 第二排 (细分): 全部细分 / 年级(P4·P5·P6·S1-S3·S4-S6) / 出版社 / 题型(阅读·听力·写作·口语) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {SUB_FILTER_CHIPS.map(chip => {
                      const isSelected = selectedSubFilter === chip.key;
                      return (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => setSelectedSubFilter(chip.key)}
                          className={`px-2.5 py-0.8 rounded-full text-[11px] font-medium shrink-0 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#1C3E2A] text-white border border-[#1C3E2A] shadow-2xs'
                              : 'bg-white text-[#666666] border border-[#E0DCCE] hover:border-[#1C3E2A]'
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* chips下方按"教材系列/词库来源"分组，组内卡片网格 */}
                {Object.keys(groupedSystemWordbooks).length === 0 ? (
                  <div className="py-12 text-center text-[#888888] space-y-2">
                    <Layers className="w-8 h-8 mx-auto text-[#CCC]" />
                    <p className="text-xs">未找到符合当前筛选条件的系统词库，可尝试清除筛选</p>
                  </div>
                ) : (
                  Object.entries(groupedSystemWordbooks).map(([seriesName, books]) => (
                    <div key={seriesName} className="space-y-3">
                      {/* 分组标题栏 */}
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-[#1C3E2A] rounded-full" />
                        <h4 className="font-bold text-xs text-[#2C2C2C] font-serif">
                          {seriesName}
                        </h4>
                        <span className="text-[10px] text-[#888888] font-mono">
                          ({books.length} 本)
                        </span>
                      </div>

                      {/* 组内卡片网格 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {books.map(sysWb => {
                          // 判断是否已在用户词库中
                          const isAlreadyInUser = wordbooks.some(
                            uw => uw.name === sysWb.name || uw.book_name === sysWb.name
                          );

                          return (
                            <div
                              key={sysWb.id}
                              className="p-4 bg-white border border-[#EAE6DD] hover:border-[#1C3E2A]/50 rounded-2xl shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs group"
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <h5 className="font-bold text-sm text-[#2C2C2C] font-serif group-hover:text-[#1C3E2A] transition-colors">
                                    {sysWb.name}
                                  </h5>
                                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                                    {sysWb.words.length} 词
                                  </span>
                                </div>

                                <p className="text-[11px] text-[#666666] leading-relaxed line-clamp-2">
                                  {sysWb.description}
                                </p>

                                {/* 标签展示 */}
                                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                  {sysWb.grade && (
                                    <span className="text-[10px] bg-[#FAF3E8] text-[#8C6D3F] px-1.5 py-0.5 rounded font-medium">
                                      {sysWb.grade}
                                    </span>
                                  )}
                                  {sysWb.volume && (
                                    <span className="text-[10px] bg-[#F3EFE6] text-[#666666] px-1.5 py-0.5 rounded">
                                      {sysWb.volume}
                                    </span>
                                  )}
                                  {sysWb.tags?.slice(0, 2).map(tag => (
                                    <span
                                      key={tag}
                                      className="text-[10px] bg-[#EEF5F1] text-[#2C6E49] px-1.5 py-0.5 rounded font-medium"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* 卡片底部操作按钮 */}
                              <div className="mt-4 pt-3 border-t border-[#F5F2EB] flex items-center justify-between">
                                <span className="text-[10px] text-[#888888] truncate max-w-[120px]">
                                  {sysWb.publisher || '官方标准审校'}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleUseSystemWordbook(sysWb)}
                                  className="px-3 py-1.5 bg-[#1C3E2A] hover:bg-[#153020] text-white text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>{isAlreadyInUser ? '再次加入' : '使用'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: INPUT / UPLOAD */}
        {view === 'input' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {parseError && (
              <div className="p-3 rounded-xl bg-[#F7E2E2] border border-[#EDBDBD] text-xs text-[#7A2828] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Wordbook Name */}
            <div>
              <label className="block text-xs font-bold text-[#2C2C2C] mb-1">
                词库名称：
              </label>
              <input
                type="text"
                value={newBookName}
                onChange={e => setNewBookName(e.target.value)}
                placeholder="例如：DSE 高频词汇、托福核心300..."
                className="w-full px-3 py-2 text-xs font-bold text-[#2C2C2C] bg-white border border-[#DDD7CC] rounded-xl focus:outline-hidden"
              />
            </div>

            {/* Upload Method 1: File Upload */}
            <div className="p-4 bg-white border border-[#EAE6DD] rounded-2xl space-y-3">
              <span className="text-xs font-bold text-[#2C2C2C] block">
                方式一：上传文件 (TXT / CSV / Excel)
              </span>
              <p className="text-[11px] text-[#888888]">
                支持包含单词、音标、释义的表格文件，或纯单词文本。
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[#FAF7F0] hover:bg-[#F2E8D8] border border-[#DDD7CC] text-xs font-bold text-[#2C2C2C] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>选择文件上传</span>
                </button>
              </div>
            </div>

            {/* Upload Method 2: Paste Text */}
            <div className="p-4 bg-white border border-[#EAE6DD] rounded-2xl space-y-3">
              <span className="text-xs font-bold text-[#2C2C2C] block">
                方式二：直接粘贴文本
              </span>
              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="格式示例：&#10;resident,居民、住户&#10;borrow,/ˈbɒrəʊ/,借入、借用&#10;afford"
                rows={6}
                className="w-full p-2.5 bg-[#FAF7F0] border border-[#DDD7CC] rounded-xl text-xs font-mono focus:outline-hidden"
              />
            </div>

            {/* Upload Method 3: Single Word Addition */}
            <div className="p-4 bg-white border border-[#EAE6DD] rounded-2xl space-y-2">
              <span className="text-xs font-bold text-[#2C2C2C] block">
                方式三：逐词手动添加
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="单词 (英文)*"
                  value={manualWord}
                  onChange={e => setManualWord(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-[#FAF7F0] border border-[#DDD7CC] rounded-lg"
                />
                <input
                  type="text"
                  placeholder="释义 (中文)"
                  value={manualMeaning}
                  onChange={e => setManualMeaning(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-[#FAF7F0] border border-[#DDD7CC] rounded-lg"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddManualWord}
                  className="px-3 py-1.5 text-xs font-bold bg-[#1C3E2A] text-white rounded-lg cursor-pointer"
                >
                  添加此词
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: PREVIEW */}
        {view === 'preview' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-[#2C2C2C]">
                共识别出 {parsedWords.length} 个单词：
              </span>
              <span className="text-[11px] text-[#888888]">
                检查无误后点击下方确认导入
              </span>
            </div>

            <div className="divide-y divide-[#EAE6DD] border border-[#EAE6DD] rounded-xl bg-white max-h-[50vh] overflow-y-auto">
              {parsedWords.map((w, idx) => (
                <div key={idx} className="p-2.5 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-mono text-[#888888] text-[10px] w-6 shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="font-bold text-[#2C2C2C]">{w.word}</span>
                    {w.phonetic && (
                      <span className="text-[#888888] font-mono text-[11px]">
                        {w.phonetic}
                      </span>
                    )}
                    <span className="text-[#666666] truncate">{w.meaning}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-[#FAF7F0] border-t border-[#EAE6DD] flex items-center justify-between gap-3">
          {view === 'list' && (
            <>
              <span className="text-xs text-[#666666]">
                {activeTab === 'my_books' ? '已选词库每日自动分配 30 词' : '点"使用"复制到个人学习列表，不影响系统词库'}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-[#1C3E2A] hover:bg-[#153020] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                完成
              </button>
            </>
          )}

          {view === 'input' && (
            <>
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-4 py-2 text-xs font-medium text-[#666666] hover:text-[#2C2C2C] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>返回列表</span>
              </button>
              <button
                type="button"
                onClick={handleParsePastedText}
                className="px-5 py-2 bg-[#1C3E2A] hover:bg-[#153020] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                识别并预览
              </button>
            </>
          )}

          {view === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setView('input')}
                className="px-4 py-2 text-xs font-medium text-[#666666] hover:text-[#2C2C2C] transition-colors cursor-pointer"
              >
                返回修改
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-6 py-2 bg-[#1C3E2A] hover:bg-[#153020] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                确认导入并学习
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
