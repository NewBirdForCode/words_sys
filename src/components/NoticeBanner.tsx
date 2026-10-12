import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface NoticeBannerProps {
  type: 'warning' | 'success' | 'info';
  message: string;
  onClose?: () => void;
}

export const NoticeBanner: React.FC<NoticeBannerProps> = ({
  type,
  message,
  onClose,
}) => {
  let style = 'bg-[#FAF3E8] border-[#E8DAC5] text-[#69481C]';
  let Icon = AlertCircle;

  if (type === 'success') {
    style = 'bg-[#D7E8DD] border-[#B9D8C3] text-[#234E35]';
    Icon = CheckCircle2;
  } else if (type === 'info') {
    style = 'bg-[#F4F0E8] border-[#EAE6DD] text-[#2C2C2C]';
  }

  return (
    <div
      className={`border px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs sm:text-sm transition-all max-w-xl mx-auto w-full shadow-2xs ${style}`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="font-medium">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="text-[#666666] hover:text-[#2C2C2C] p-1 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
