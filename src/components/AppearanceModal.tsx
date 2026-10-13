import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Link as LinkIcon,
  Check,
  RotateCcw,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import {
  ThemeConfig,
  BASE_COLOR_PRESETS,
  GRADIENT_PRESETS,
  DEFAULT_SUNSHINE_THEME,
  BaseColorPreset,
  GradientPreset
} from '../types/theme';
import {
  saveCustomBackgroundToDB,
  getCustomBackgroundFromDB,
  clearCustomBackgroundFromDB,
  compressImageFile
} from '../utils/backgroundStorage';

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeConfig;
  onSaveTheme: (theme: ThemeConfig) => void;
}

export const AppearanceModal: React.FC<AppearanceModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSaveTheme,
}) => {
  // 草稿配置
  const [draftTheme, setDraftTheme] = useState<ThemeConfig>({ ...currentTheme });
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 打开时同步草稿与 IndexedDB 图片
  useEffect(() => {
    if (isOpen) {
      setDraftTheme({ ...currentTheme });
      getCustomBackgroundFromDB().then(img => {
        if (img) setCustomImageUrl(img);
      });
    }
  }, [isOpen, currentTheme]);

  if (!isOpen) return null;

  // 1. 选择基础色
  const handleSelectBaseColor = (preset: BaseColorPreset) => {
    setDraftTheme(prev => ({
      ...prev,
      id: preset.id,
      name: preset.name,
      type: 'base_color',
      pageBg: preset.color,
      isDark: !!preset.isDark,
      textColor: preset.isDark ? '#F0F4F8' : '#2C3E46',
      subtextColor: preset.isDark ? '#98AAB3' : '#768B94',
      cardBg: preset.isDark ? '#1C2633' : '#FFFFFF',
      borderColor: preset.isDark ? '#2C3847' : '#E6EEF1',
    }));
  };

  // 2. 选择预设渐变
  const handleSelectGradient = (preset: GradientPreset) => {
    setDraftTheme(prev => ({
      ...prev,
      id: preset.id,
      name: preset.name,
      type: 'gradient',
      pageBg: preset.gradient,
      isDark: !!preset.isDark,
      textColor: preset.isDark ? '#F0F4F8' : '#2C3E46',
      subtextColor: preset.isDark ? '#98AAB3' : '#768B94',
      cardBg: preset.isDark ? '#1C2633' : '#FFFFFF',
      borderColor: preset.isDark ? '#2C3847' : '#E6EEF1',
    }));
  };

  // 3. 上传本地图片并压缩至 1920px
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const compressedDataUrl = await compressImageFile(file, 1920, 1080);
      setCustomImageUrl(compressedDataUrl);
      await saveCustomBackgroundToDB(compressedDataUrl);

      setDraftTheme(prev => ({
        ...prev,
        id: 'custom_image',
        name: '自定义壁纸',
        type: 'custom_image',
        bgImageUrl: compressedDataUrl,
      }));
    } catch (err) {
      console.error('Image compression failed', err);
    } finally {
      setIsUploading(false);
    }
  };

  // 4. 应用网络图片链接
  const handleApplyUrl = async () => {
    if (!urlInput.trim()) return;
    setCustomImageUrl(urlInput.trim());
    await saveCustomBackgroundToDB(urlInput.trim());

    setDraftTheme(prev => ({
      ...prev,
      id: 'custom_image',
      name: '自定义壁纸',
      type: 'custom_image',
      bgImageUrl: urlInput.trim(),
    }));
    setUrlInput('');
  };

  // 恢复默认
  const handleResetDefault = async () => {
    await clearCustomBackgroundFromDB();
    setCustomImageUrl(null);
    setDraftTheme({ ...DEFAULT_SUNSHINE_THEME });
  };

  // 保存并应用
  const handleSaveAndApply = () => {
    onSaveTheme(draftTheme);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn select-none">
      <div className="bg-white rounded-[22px] border border-[#E6EEF1] max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-scaleIn">
        {/* 顶部标题与关闭 */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E6EEF1]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-acc-grad" />
            <h3 className="text-base font-bold text-[#2C3E46]">背景与外观</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#96A8B0] hover:text-[#2C3E46] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 pt-4">
          {/* ① 基础色：8 个圆形色块 */}
          <div>
            <div className="text-xs font-bold text-[#60727B] mb-2.5">
              ① 基础纯色
            </div>
            <div className="flex items-center justify-between gap-2 px-1">
              {BASE_COLOR_PRESETS.map(preset => {
                const isSelected = draftTheme.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.name}
                    onClick={() => handleSelectBaseColor(preset)}
                    className="flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-105"
                  >
                    <div
                      className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                        isSelected
                          ? 'border-[#38d39f] ring-3 ring-[#38d39f]/20 scale-105 shadow-xs'
                          : 'border-[#E6EEF1]'
                      }`}
                      style={{ backgroundColor: preset.color }}
                    >
                      {isSelected && (
                        <Check
                          className={`w-4 h-4 stroke-[3] ${
                            preset.isDark ? 'text-white' : 'text-[#2C3E46]'
                          }`}
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-[#7B8F99] truncate max-w-[42px]">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ② 预设渐变：8 个方形预览 (2 行 × 4 个) */}
          <div>
            <div className="text-xs font-bold text-[#60727B] mb-2.5">
              ② 预设渐变
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {GRADIENT_PRESETS.map(preset => {
                const isSelected = draftTheme.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectGradient(preset)}
                    className={`h-14 rounded-xl border-2 p-2 flex flex-col justify-between text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#38d39f] ring-2 ring-[#38d39f]/25 shadow-xs'
                        : 'border-[#E6EEF1] hover:border-[#CAD8DF]'
                    }`}
                    style={{ background: preset.gradient }}
                  >
                    <span
                      className={`text-[11px] font-bold ${
                        preset.isDark ? 'text-white' : 'text-[#2C3E46]'
                      }`}
                    >
                      {preset.name}
                    </span>
                    {isSelected && (
                      <Check
                        className={`w-3.5 h-3.5 self-end ${
                          preset.isDark ? 'text-white' : 'text-emerald-700'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ③ 自定义图片 */}
          <div>
            <div className="text-xs font-bold text-[#60727B] mb-2.5">
              ③ 自定义壁纸
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* 左侧：当前图片预览 */}
              <div
                className={`h-32 rounded-xl border-2 flex flex-col items-center justify-center p-2 relative overflow-hidden bg-cover bg-center ${
                  draftTheme.type === 'custom_image' && customImageUrl
                    ? 'border-[#38d39f] ring-2 ring-[#38d39f]/20'
                    : 'border-dashed border-[#CAD8DF] bg-[#FAFDFB]'
                }`}
                style={{
                  backgroundImage: customImageUrl ? `url(${customImageUrl})` : undefined,
                }}
              >
                {customImageUrl ? (
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>✓ 当前使用中</span>
                  </div>
                ) : (
                  <div className="text-center text-[#96A8B0]">
                    <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-60" />
                    <span className="text-[11px]">暂无自定义图片</span>
                  </div>
                )}
              </div>

              {/* 右侧：虚线框上传与网络链接 */}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="h-14 rounded-xl border border-dashed border-[#CAD8DF] hover:border-[#38d39f] bg-[#FAFDFB] hover:bg-[#F3FAF7] flex flex-col items-center justify-center text-xs text-[#60727B] transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 mb-0.5 text-emerald-600" />
                  <span>{isUploading ? '正在压缩并存储...' : '点击上传本地图片'}</span>
                  <span className="text-[9px] text-[#A6B8BF]">建议 1920×1080 (JPG/PNG)</span>
                </button>

                {/* 粘贴图片链接 */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="或粘贴网络图片 URL..."
                    className="flex-1 bg-[#FAFDFB] border border-[#E6EEF1] rounded-xl px-2.5 py-1.5 text-xs text-[#2C3E46] outline-none focus:border-[#38d39f]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-2.5 py-1.5 bg-[#2C3E46] text-white rounded-xl text-xs hover:bg-[#1A282F] transition-colors cursor-pointer"
                  >
                    应用
                  </button>
                </div>
              </div>
            </div>

            {/* 下方图片遮罩滑杆 0% - 80% */}
            <div className="bg-[#FAFDFB] rounded-xl p-3 border border-[#E6EEF1]">
              <div className="flex items-center justify-between text-xs text-[#60727B] mb-1 font-medium">
                <span>图片蒙版浓度</span>
                <span className="font-mono text-[#2C3E46] font-bold">
                  {draftTheme.overlayOpacity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={draftTheme.overlayOpacity}
                onChange={e =>
                  setDraftTheme(prev => ({
                    ...prev,
                    overlayOpacity: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-[#38d39f] cursor-pointer"
              />
              <p className="text-[10px] text-[#96A8B0] mt-1">
                在图片上盖一层白色蒙版，数值越大越淡、文字越清晰
              </p>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E6EEF1]">
          <button
            type="button"
            onClick={handleResetDefault}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#60727B] hover:text-[#2C3E46] border border-[#CAD8DF] hover:bg-[#FAFDFB] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>恢复默认</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndApply}
            className="px-6 py-2 rounded-xl text-xs sm:text-sm font-bold bg-acc-grad text-white shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
          >
            保存并应用
          </button>
        </div>
      </div>
    </div>
  );
};
