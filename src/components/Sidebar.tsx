import React, { useState } from 'react';
import {
  Zap,
  Eye,
  PenTool,
  Gamepad2,
  BarChart2,
  Settings,
  BookOpen,
  Palette,
  Camera,
  Volume2,
  ChevronDown,
  LogOut,
  UserRound
  ,Shield
} from 'lucide-react';
import { AppStage, UserProfile } from '../types';

interface SidebarProps {
  currentStage: AppStage | 'stats';
  onStageChange: (stage: AppStage | 'stats') => void;
  mistakeCount: number;
  onOpenWordbooks: () => void;
  onOpenAppearance: () => void;
  onOpenCheckIn: () => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  currentUser: UserProfile;
  onLogout: () => void;
  onOpenRoleManagement: () => void;
  isDark?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentStage,
  onStageChange,
  mistakeCount,
  onOpenWordbooks,
  onOpenAppearance,
  onOpenCheckIn,
  autoSpeak,
  onToggleAutoSpeak,
  currentUser,
  onLogout,
  onOpenRoleManagement,
  isDark = false,
}) => {
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  const mainStages = [
    {
      id: 'stage1_shadowing' as AppStage,
      label: '阶段一 · 刷词',
      icon: <Zap className="w-3.5 h-3.5" />,
    },
    {
      id: 'stage2_self_test' as AppStage,
      label: '阶段二 · 自测',
      icon: <Eye className="w-3.5 h-3.5" />,
    },
    {
      id: 'stage3_spelling' as AppStage,
      label: '阶段三 · 拼写',
      icon: <PenTool className="w-3.5 h-3.5" />,
    },
    {
      id: 'stage4_mistake_loop' as AppStage,
      label: '阶段四 · 消消乐',
      icon: <Gamepad2 className="w-3.5 h-3.5" />,
      badge: mistakeCount,
    },
  ];

  return (
    <aside
      className={`w-[150px] shrink-0 sticky top-3 h-[calc(100vh-24px)] rounded-[20px] p-2.5 flex flex-col justify-between z-30 transition-all select-none ${
        isDark
          ? 'bg-[#18202A]/90 border border-neutral-700/80 shadow-[0_6px_24px_rgba(0,0,0,0.35)]'
          : 'bg-white/95 border border-[#E6EEF1]/90 shadow-[0_6px_20px_rgba(91,139,168,0.10)]'
      }`}
    >
      {/* 顶部品牌区 */}
      <div>
        <div className="pt-2 pb-3 px-1 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-acc-grad shadow-2xs" />
            <span
              className={`font-serif-en text-[17px] font-bold tracking-tight ${
                isDark ? 'text-white' : 'text-[#2C3E46]'
              }`}
            >
              燃词
            </span>
          </div>
          <div className="text-[9px] font-mono tracking-widest text-[#96A8B0]">
            FOCUS · REPEAT
          </div>
        </div>

        {/* 主功能导航 */}
        <nav className="flex flex-col gap-1 mt-1">
          {mainStages.map(stage => {
            const isActive = currentStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onStageChange(stage.id)}
                className={`w-full px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                  isActive
                    ? 'bg-acc-grad text-white font-bold shadow-[0_4px_12px_rgba(74,157,184,0.22)]'
                    : isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                    : 'text-[#60727B] hover:text-[#2C3E46] hover:bg-[#F3FAF7]'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {stage.icon}
                  <span className="truncate">{stage.label}</span>
                </div>
                {stage.badge !== undefined && stage.badge > 0 && (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full shrink-0 shadow-2xs ${
                      isActive ? 'bg-white text-[#ff8a65]' : 'bg-sun-grad text-white'
                    }`}
                  >
                    {stage.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 分隔线 */}
        <div className={`h-px my-2 ${isDark ? 'bg-neutral-800' : 'bg-[#E6EEF1]'}`} />

        {/* 辅助管理与设置 */}
        <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-0.5">
          {/* 词库管理 (直达常驻按钮) */}
          <button
            type="button"
            data-testid="btn-sidebar-wordbooks"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[Sidebar] Direct wordbooks button clicked');
              onOpenWordbooks();
            }}
            className={`w-full px-2.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              isDark
                ? 'text-neutral-300 hover:text-white hover:bg-neutral-800/80'
                : 'text-[#506672] hover:text-[#2C3E46] hover:bg-[#F3FAF7]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">词库</span>
          </button>

          {/* 统计功能 */}
          <button
            type="button"
            onClick={() => onStageChange('stats')}
            className={`w-full px-2.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              currentStage === 'stats'
                ? 'bg-acc-grad text-white font-bold shadow-[0_4px_12px_rgba(74,157,184,0.22)]'
                : isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                : 'text-[#60727B] hover:text-[#2C3E46] hover:bg-[#F3FAF7]'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 shrink-0" />
            <span>统计</span>
          </button>

          {/* 设置项 (点击展开子项) */}
          <div>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setIsSettingsExpanded(p => !p);
              }}
              className={`w-full px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                isSettingsExpanded
                  ? isDark
                    ? 'bg-neutral-800 text-white'
                    : 'bg-[#F0F7F5] text-[#2C3E46] font-semibold'
                  : isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                  : 'text-[#60727B] hover:text-[#2C3E46] hover:bg-[#F3FAF7]'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Settings className="w-3.5 h-3.5 shrink-0" />
                <span>设置</span>
              </div>
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 shrink-0 ${
                  isSettingsExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* 设置展开子项 */}
            {isSettingsExpanded && (
              <div
                className={`flex flex-col gap-0.5 mt-1 pl-3.5 border-l-2 py-0.5 ${
                  isDark ? 'border-neutral-700' : 'border-[#D4E8DA]'
                }`}
              >
                <button
                  type="button"
                  data-testid="btn-sub-wordbooks"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Sidebar] Submenu wordbooks button clicked');
                    onOpenWordbooks();
                  }}
                  className={`px-2 py-1.5 text-[11px] rounded-lg text-left transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      : 'text-[#60727B] hover:text-[#2C3E46] hover:bg-[#F3FAF7]'
                  }`}
                >
                  <BookOpen className="w-3 h-3 text-emerald-600" />
                  <span>词库</span>
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onOpenAppearance();
                  }}
                  className={`px-2 py-1.5 text-[11px] rounded-lg text-left transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      : 'text-[#60727B] hover:text-[#2C3E46] hover:bg-[#F3FAF7]'
                  }`}
                >
                  <Palette className="w-3 h-3 text-[#4ec3e0]" />
                  <span>背景与外观</span>
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onOpenCheckIn();
                  }}
                  className={`px-2 py-1.5 text-[11px] rounded-lg text-left transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      : 'text-[#60727B] hover:text-[#2C3E46] hover:bg-[#F3FAF7]'
                  }`}
                >
                  <Camera className="w-3 h-3 text-amber-500" />
                  <span>打卡拍照</span>
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onToggleAutoSpeak();
                  }}
                  className={`px-2 py-1.5 text-[11px] rounded-lg text-left transition-colors cursor-pointer flex items-center justify-between ${
                    isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      : 'text-[#60727B] hover:text-[#2C3E46] hover:bg-[#F3FAF7]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-3 h-3 text-sky-500" />
                    <span>自动发音</span>
                  </div>
                  <span
                    className={`text-[9px] px-1 rounded ${
                      autoSpeak ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-[#A0B0B8]'
                    }`}
                  >
                    {autoSpeak ? '开' : '关'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
          <button type="button" onClick={onOpenRoleManagement} className={`w-full px-2.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer ${isDark ? 'text-amber-200 hover:bg-neutral-800' : 'text-[#80601F] hover:bg-[#FFF8E8]'}`}>
            <Shield className="w-3.5 h-3.5" />
            <span>{currentUser.role === 'admin' ? '管理后台' : '班级管理'}</span>
          </button>
        )}
        <div className={`rounded-xl px-2.5 py-2 border ${isDark ? 'bg-neutral-800/70 border-neutral-700' : 'bg-[#F4FAF7] border-[#DDECE3]'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <UserRound className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-[#2C3E46]'}`}>{currentUser.name}</span>
          </div>
          <p className={`text-[10px] truncate ${isDark ? 'text-neutral-400' : 'text-[#71838A]'}`}>{currentUser.school}</p>
          <p className={`text-[10px] truncate ${isDark ? 'text-neutral-400' : 'text-[#71838A]'}`}>{currentUser.className}</p>
          <button
            type="button"
            onClick={onLogout}
            className={`mt-2 w-full py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer ${isDark ? 'text-red-300 bg-red-950/40 hover:bg-red-950/70' : 'text-[#A33D3D] bg-white hover:bg-[#FFF1F1] border border-[#F0D7D7]'}`}
          >
            <LogOut className="w-3 h-3" />退出登录
          </button>
        </div>
        <div className="text-[9px] text-[#A6B8BF] text-center font-mono py-1">
          v3.0 · 清爽阳光
        </div>
      </div>
    </aside>
  );
};
