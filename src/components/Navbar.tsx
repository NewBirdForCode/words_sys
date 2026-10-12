import React from 'react';
import { BookOpen, BarChart3, Settings } from 'lucide-react';
import { AppStage, LearningMode } from '../types';
import { ThemeConfig } from '../types/theme';
import { getDefaultTheme } from '../utils/theme';

interface NavbarProps {
  currentStage: AppStage;
  onStageChange: (stage: AppStage) => void;
  activeWordbookName: string;
  onOpenWordbooks: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  mistakeCount: number;
  currentTheme?: ThemeConfig;
  currentMode?: LearningMode;
  onToggleMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStage,
  onStageChange,
  activeWordbookName,
  onOpenWordbooks,
  onOpenHistory,
  onOpenSettings,
  mistakeCount,
  currentTheme = getDefaultTheme(),
  currentMode,
  onToggleMode,
}) => {
  return (
    <header
      className="backdrop-blur-md border-b sticky top-0 z-30 transition-colors duration-200"
      style={{
        backgroundColor: `${currentTheme.pageBg}F0`,
        borderColor: currentTheme.borderColor,
        color: currentTheme.textColor,
      }}
    >
      <div className="max-w-xl mx-auto px-3 sm:px-4">
        {/* Top bar: Brand, Wordbook small text and Tools */}
        <div className="h-12 sm:h-13 flex items-center justify-between gap-2">
          {/* 左侧：品牌名 + 词库名小字 */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="font-serif text-base sm:text-lg font-bold tracking-tight shrink-0 select-none"
              style={{ color: currentTheme.textColor }}
            >
              燃词
            </span>

            {/* 学习页顶部词库名小字 */}
            <button
              type="button"
              onClick={onOpenWordbooks}
              style={{
                color: currentTheme.subtextColor,
              }}
              className="flex items-center gap-1 text-[11px] sm:text-xs font-medium hover:text-[#2C2C2C] truncate max-w-[140px] sm:max-w-[200px] cursor-pointer"
              title="点击切换或上传词库"
            >
              <BookOpen className="w-3 h-3 text-[#888888] shrink-0" />
              <span className="truncate">{activeWordbookName}</span>
            </button>
          </div>

          {/* 右侧：统计 + 设置 */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenHistory}
              style={{
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.borderColor,
                color: currentTheme.subtextColor,
              }}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-xs font-medium transition-colors hover:text-[#2C2C2C] flex items-center gap-1 cursor-pointer"
              title="学习历史与成就统计"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">统计</span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              style={{
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.borderColor,
                color: currentTheme.subtextColor,
              }}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-xs font-medium transition-colors hover:text-[#2C2C2C] flex items-center gap-1 cursor-pointer"
              title="7天计划 · 发音 · 主题外观设置"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">设置</span>
            </button>
          </div>
        </div>

        {/* 
          四个阶段顶部标签切换栏 (等宽排列，无拥挤感)
          阶段一 看图选义 / 阶段二 自测批改 / 阶段三 拼写默写 / 阶段四 错误循环
        */}
        <div className="grid grid-cols-4 gap-1 pb-2 pt-0.5">
          {/* 阶段一 */}
          <button
            type="button"
            onClick={() => onStageChange('stage1_shadowing')}
            style={{
              backgroundColor: currentStage === 'stage1_shadowing' ? currentTheme.accentColor : currentTheme.cardBg,
              color: currentStage === 'stage1_shadowing' ? currentTheme.accentText : currentTheme.subtextColor,
              borderColor: currentStage === 'stage1_shadowing' ? currentTheme.accentColor : currentTheme.borderColor,
            }}
            className="py-1.5 px-0.5 text-center rounded-xl text-[10.5px] sm:text-xs font-bold transition-all border shadow-2xs truncate cursor-pointer"
            title="阶段一 精选刷词"
          >
            阶段一 精选刷词
          </button>

          {/* 阶段二 */}
          <button
            type="button"
            onClick={() => onStageChange('stage2_self_test')}
            style={{
              backgroundColor: currentStage === 'stage2_self_test' ? currentTheme.accentColor : currentTheme.cardBg,
              color: currentStage === 'stage2_self_test' ? currentTheme.accentText : currentTheme.subtextColor,
              borderColor: currentStage === 'stage2_self_test' ? currentTheme.accentColor : currentTheme.borderColor,
            }}
            className="py-1.5 px-0.5 text-center rounded-xl text-[10.5px] sm:text-xs font-bold transition-all border shadow-2xs truncate cursor-pointer"
            title="阶段二 自测批改"
          >
            阶段二 自测批改
          </button>

          {/* 阶段三 */}
          <button
            type="button"
            onClick={() => onStageChange('stage3_spelling')}
            style={{
              backgroundColor: currentStage === 'stage3_spelling' ? currentTheme.accentColor : currentTheme.cardBg,
              color: currentStage === 'stage3_spelling' ? currentTheme.accentText : currentTheme.subtextColor,
              borderColor: currentStage === 'stage3_spelling' ? currentTheme.accentColor : currentTheme.borderColor,
            }}
            className="py-1.5 px-0.5 text-center rounded-xl text-[10.5px] sm:text-xs font-bold transition-all border shadow-2xs truncate cursor-pointer"
            title="阶段三 拼写默写"
          >
            阶段三 拼写默写
          </button>

          {/* 阶段四 */}
          <button
            type="button"
            onClick={() => onStageChange('stage4_mistake_loop')}
            style={{
              backgroundColor: (currentStage === 'stage4_mistake_loop' || (currentStage as string) === 'stage3_mistake_loop') ? currentTheme.accentColor : currentTheme.cardBg,
              color: (currentStage === 'stage4_mistake_loop' || (currentStage as string) === 'stage3_mistake_loop') ? currentTheme.accentText : currentTheme.subtextColor,
              borderColor: (currentStage === 'stage4_mistake_loop' || (currentStage as string) === 'stage3_mistake_loop') ? currentTheme.accentColor : currentTheme.borderColor,
            }}
            className="py-1.5 px-0.5 text-center rounded-xl text-[10.5px] sm:text-xs font-bold transition-all border relative shadow-2xs truncate cursor-pointer"
            title="阶段四 错误循环"
          >
            <span>阶段四 错误循环</span>
            {mistakeCount > 0 && (
              <span
                style={{
                  backgroundColor: currentTheme.buttonNegativeBg,
                  color: currentTheme.buttonNegativeText,
                }}
                className="ml-1 px-1 py-0.2 rounded-full text-[9px] font-mono"
              >
                {mistakeCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
