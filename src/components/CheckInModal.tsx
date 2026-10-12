import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Download,
  Share2,
  Flame,
  CheckCircle2,
  Calendar,
  Sparkles,
  Upload,
  RefreshCw,
  Award,
  Heart,
  Quote
} from 'lucide-react';
import {
  calculateStreakDays,
  saveCheckInRecord,
  CheckInRecord,
  getAllCheckInRecords
} from '../utils/checkin';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  learningDate: string;
  completedWordsCount: number;
  accuracyRate: number; // 0 - 100
  initialPhotoUrl?: string | null;
  onCheckInSaved?: () => void;
}

const MOTIVATIONAL_QUOTES = [
  '每一个认真发音的瞬间，都是通向流利表达的坚实台阶！',
  '日拱一卒无有尽，功不唐捐终成林。每天30词，坚持就会发光！',
  '自主纠错，抗遗忘循环——把每一个难词变成终身记忆！',
  '专注听、开口读、用心记，今天也是自信向上的一天！',
  '点滴积累汇成江河，坚持是世界上最酷的超能力！',
];

// Presets badge icons/avatars if user doesn't use camera
const BADGE_PRESETS = [
  { id: 'fire', label: '🔥 坚持之火', bg: '#FDE8E8', emoji: '🔥' },
  { id: 'trophy', label: '🏆 词汇学霸', bg: '#FEF3C7', emoji: '🏆' },
  { id: 'star', label: '⭐ 闪耀新星', bg: '#E0F2FE', emoji: '⭐' },
  { id: 'book', label: '📚 默读书声', bg: '#DCFCE7', emoji: '📚' },
  { id: 'lion', label: '🦁 勇敢开口', bg: '#F3E8FF', emoji: '🦁' },
];

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  learningDate,
  completedWordsCount,
  accuracyRate,
  initialPhotoUrl,
  onCheckInSaved,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl || null);
  const [quoteIndex, setQuoteIndex] = useState<number>(0);
  const [customNote, setCustomNote] = useState<string>('');
  const [selectedBadge, setSelectedBadge] = useState<string>('fire');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Web camera inside modal
  const [isModalCamActive, setIsModalCamActive] = useState<boolean>(false);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const modalStreamRef = useRef<MediaStream | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const streakDays = calculateStreakDays() + (getAllCheckInRecords().some(r => r.date === learningDate) ? 0 : 1);

  useEffect(() => {
    if (initialPhotoUrl) {
      setPhotoUrl(initialPhotoUrl);
    }
  }, [initialPhotoUrl]);

  // Turn off modal webcam on close
  useEffect(() => {
    if (!isOpen) {
      stopModalCamera();
      setPosterDataUrl(null);
      setNoticeMessage(null);
    }
  }, [isOpen]);

  // Safe callback ref for modal camera video element
  const setModalVideoRef = React.useCallback((node: HTMLVideoElement | null) => {
    modalVideoRef.current = node;
    if (node && modalStreamRef.current) {
      if (node.srcObject !== modalStreamRef.current) {
        node.srcObject = modalStreamRef.current;
      }
      node.play().catch(e => console.warn('Modal video play caught:', e));
    }
  }, []);

  const startModalCamera = async () => {
    try {
      if (modalStreamRef.current) {
        modalStreamRef.current.getTracks().forEach(t => t.stop());
        modalStreamRef.current = null;
      }
      if (!navigator?.mediaDevices?.getUserMedia) {
        setNoticeMessage('当前浏览器未开放摄像头API，请直接从相册选取或拍照');
        return;
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
      } catch (err1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err2) {
          throw err2;
        }
      }

      modalStreamRef.current = stream;
      setIsModalCamActive(true);
      if (modalVideoRef.current) {
        modalVideoRef.current.srcObject = stream;
        modalVideoRef.current.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Camera open failed in modal:', e);
      setNoticeMessage('无法访问摄像头（请检查权限），可直接从相册选取照片');
    }
  };

  const stopModalCamera = () => {
    if (modalStreamRef.current) {
      modalStreamRef.current.getTracks().forEach(t => t.stop());
      modalStreamRef.current = null;
    }
    setIsModalCamActive(false);
  };

  const takeModalSnapshot = () => {
    if (!modalVideoRef.current) return;
    try {
      const video = modalVideoRef.current;
      const cvs = document.createElement('canvas');
      cvs.width = video.videoWidth || 640;
      cvs.height = video.videoHeight || 480;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;
      ctx.translate(cvs.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, cvs.width, cvs.height);
      const url = cvs.toDataURL('image/jpeg', 0.9);
      setPhotoUrl(url);
      stopModalCamera();
    } catch (e) {
      console.error(e);
    }
  };

  // Upload photo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setPhotoUrl(ev.target.result as string);
        stopModalCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  // Generate poster canvas
  const renderPosterCanvas = async (): Promise<string | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    setIsGenerating(true);

    const width = 800;
    const height = 1140;
    canvas.width = width;
    canvas.height = height;

    // 1. Background
    ctx.fillStyle = '#FFFDF8';
    ctx.fillRect(0, 0, width, height);

    // Subtle decorative inner frame
    ctx.strokeStyle = '#EAE6DD';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    ctx.strokeStyle = '#D7E8DD';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // 2. Top Header Brand
    ctx.fillStyle = '#666666';
    ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('燃词 · 自主批改与抗遗忘复习系统', 56, 76);

    // Date formatted
    const dateObj = new Date(learningDate);
    const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const dateStr = `${learningDate} ${dayNames[dateObj.getDay()] || ''}`;

    ctx.font = 'bold 36px serif';
    ctx.fillStyle = '#2C2C2C';
    ctx.fillText('学习打卡日志', 56, 126);

    ctx.fillStyle = '#888888';
    ctx.font = '500 18px monospace';
    ctx.fillText(dateStr, 56, 156);

    // Streak badge on top right
    ctx.fillStyle = '#FFF5F5';
    ctx.beginPath();
    ctx.roundRect(width - 260, 68, 204, 72, 18);
    ctx.fill();
    ctx.strokeStyle = '#FED7D7';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#C53030';
    ctx.font = 'bold 26px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🔥 连续 ${streakDays} 天`, width - 158, 114);

    // 3. Central Media Picture / Badge Frame
    const frameX = 56;
    const frameY = 184;
    const frameW = width - 112;
    const frameH = 430;

    ctx.fillStyle = '#F8F6F0';
    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameW, frameH, 24);
    ctx.fill();
    ctx.strokeStyle = '#E2DDD0';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (photoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = photoUrl;
        });

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(frameX + 8, frameY + 8, frameW - 16, frameH - 16, 20);
        ctx.clip();

        // Object cover fit
        const imgRatio = img.width / img.height;
        const targetRatio = (frameW - 16) / (frameH - 16);
        let sw, sh, sx, sy;
        if (imgRatio > targetRatio) {
          sh = img.height;
          sw = sh * targetRatio;
          sx = (img.width - sw) / 2;
          sy = 0;
        } else {
          sw = img.width;
          sh = sw / targetRatio;
          sx = 0;
          sy = (img.height - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, frameX + 8, frameY + 8, frameW - 16, frameH - 16);
        ctx.restore();

        // Watermark badge on photo
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.roundRect(frameX + 24, frameY + frameH - 46, 160, 30, 8);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📸 跟读口型记录', frameX + 104, frameY + frameH - 26);
      } catch (err) {
        console.warn('Image draw failed, falling back:', err);
      }
    } else {
      // Decorative learning badge illustration
      const currentBadge = BADGE_PRESETS.find(b => b.id === selectedBadge) || BADGE_PRESETS[0];
      ctx.fillStyle = currentBadge.bg;
      ctx.beginPath();
      ctx.arc(width / 2, frameY + frameH / 2 - 20, 90, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '80px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentBadge.emoji, width / 2, frameY + frameH / 2 + 10);

      ctx.fillStyle = '#2C2C2C';
      ctx.font = 'bold 24px serif';
      ctx.fillText(currentBadge.label, width / 2, frameY + frameH / 2 + 75);

      ctx.fillStyle = '#888888';
      ctx.font = '16px sans-serif';
      ctx.fillText('坚持开口 · 稳步提升', width / 2, frameY + frameH / 2 + 105);
    }

    // 4. Learning Stats Metrics Cards
    const statY = 640;
    const cardW = (width - 112 - 32) / 3;

    // Stat 1: Completed words
    drawStatCard(ctx, 56, statY, cardW, 110, '今日完成', `${completedWordsCount}`, '词汇', '#2C2C2C', '#F4F0E8');
    // Stat 2: Accuracy
    drawStatCard(ctx, 56 + cardW + 16, statY, cardW, 110, '掌握正确率', `${accuracyRate}%`, '自主自评', '#234E35', '#D7E8DD');
    // Stat 3: Stages
    drawStatCard(ctx, 56 + (cardW + 16) * 2, statY, cardW, 110, '学习阶段', '3阶全部', '闭环达标', '#7A2828', '#F7E2E2');

    // 5. Quote Box
    const quoteY = 776;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(56, quoteY, width - 112, 120, 16);
    ctx.fill();
    ctx.strokeStyle = '#EAE6DD';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const currentQuote = customNote.trim() || MOTIVATIONAL_QUOTES[quoteIndex];
    ctx.fillStyle = '#2C2C2C';
    ctx.font = 'italic 500 20px -apple-system, serif';
    ctx.textAlign = 'center';
    wrapText(ctx, `“ ${currentQuote} ”`, width / 2, quoteY + 54, width - 160, 32);

    // 6. Bottom Footer
    const footerY = 930;
    ctx.strokeStyle = '#EAE6DD';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(56, footerY);
    ctx.lineTo(width - 56, footerY);
    ctx.stroke();

    ctx.fillStyle = '#2C2C2C';
    ctx.font = 'bold 22px serif';
    ctx.textAlign = 'left';
    ctx.fillText('燃词 · 循环记忆', 56, footerY + 50);

    ctx.fillStyle = '#888888';
    ctx.font = '14px sans-serif';
    ctx.fillText('看图选义 · 自主批改 · 高频错误闭环淘汰', 56, footerY + 76);

    // QR badge graphic mock
    ctx.fillStyle = '#2C2C2C';
    ctx.beginPath();
    ctx.roundRect(width - 136, footerY + 16, 80, 80, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('坚持', width - 96, footerY + 48);
    ctx.fillText('打卡', width - 96, footerY + 68);

    setIsGenerating(false);

    const generated = canvas.toDataURL('image/png');
    setPosterDataUrl(generated);

    // Automatically save check-in record to storage
    saveCheckInRecord({
      date: learningDate,
      timestamp: Date.now(),
      completedWords: completedWordsCount,
      accuracyRate,
      note: currentQuote,
      photoUrl: photoUrl || undefined,
    });
    if (onCheckInSaved) onCheckInSaved();

    return generated;
  };

  function drawStatCard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: string,
    sub: string,
    textColor: string,
    bgColor: string
  ) {
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 30px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(value, x + w / 2, y + 50);

    ctx.fillStyle = '#666666';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${label} (${sub})`, x + w / 2, y + 82);
  }

  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) {
    const words = text.split('');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n];
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  // Trigger generator when modal opens or photo changes
  useEffect(() => {
    if (isOpen) {
      renderPosterCanvas();
    }
  }, [isOpen, photoUrl, quoteIndex, selectedBadge, customNote]);

  // Download image
  const handleDownload = () => {
    if (!posterDataUrl) return;
    const a = document.createElement('a');
    a.href = posterDataUrl;
    a.download = `燃词打卡海报_${learningDate}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setNoticeMessage('海报已保存到本地！去朋友圈选这张图即可打卡。');
  };

  // Share image
  const handleShare = async () => {
    if (!posterDataUrl) return;
    if (navigator.share) {
      try {
        const blob = await (await fetch(posterDataUrl)).blob();
        const file = new File([blob], `打卡海报_${learningDate}.png`, { type: 'image/png' });
        await navigator.share({
          title: `燃词学习打卡 - 连续${streakDays}天🔥`,
          text: `我今天完成了燃词自主批改与高频错题循环！正确率${accuracyRate}%！`,
          files: [file],
        });
        setNoticeMessage('分享成功！');
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('System share error:', err);
        }
      }
    }
    // Fallback: auto download + toast
    handleDownload();
    setNoticeMessage('海报已保存！请直接在微信/朋友圈选取此图分享。');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#FFFDF8] rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#EAE6DD] animate-scaleIn overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:px-6 bg-[#FAF7F0] border-b border-[#EAE6DD] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#FDE8E8] text-red-600">
              <Flame className="w-5 h-5 fill-current" />
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#2C2C2C]">
                每日学习打卡海报
              </h3>
              <p className="text-xs text-[#666666]">
                记录跟读高光时刻 · 连续打卡 {streakDays} 天 🔥
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#888888] hover:text-[#2C2C2C] hover:bg-[#EAE6DD] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col md:flex-row gap-6">
          {/* Left: Poster Preview */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full max-w-[320px] rounded-2xl overflow-hidden shadow-lg border border-[#EAE6DD] bg-white relative">
              {posterDataUrl ? (
                <img
                  src={posterDataUrl}
                  alt="打卡海报预览"
                  className="w-full h-auto block"
                />
              ) : (
                <div className="aspect-3/4 flex items-center justify-center text-xs text-[#888888]">
                  正在渲染竖版海报...
                </div>
              )}

              {isGenerating && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex items-center justify-center text-xs text-[#2C2C2C] font-semibold">
                  <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                  海报生成中...
                </div>
              )}
            </div>

            {/* Hidden actual rendering canvas */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Right: Customization & Controls */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Notice toast */}
            {noticeMessage && (
              <div className="p-3 bg-[#D7E8DD] text-[#234E35] text-xs font-semibold rounded-xl border border-[#B9D8C3] animate-fadeIn flex items-center justify-between">
                <span>{noticeMessage}</span>
                <button
                  type="button"
                  onClick={() => setNoticeMessage(null)}
                  className="p-0.5 hover:opacity-75"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Media Choice */}
            <div className="bg-white rounded-2xl p-4 border border-[#EAE6DD] space-y-3">
              <label className="text-xs font-bold text-[#2C2C2C] flex items-center justify-between">
                <span>打卡照片 / 封面</span>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl(null);
                      stopModalCamera();
                    }}
                    className="text-[11px] text-[#888888] hover:text-red-600"
                  >
                    清除图片
                  </button>
                )}
              </label>

              {/* In-modal camera stream */}
              {isModalCamActive ? (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center">
                  <video
                    ref={setModalVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  <div className="absolute bottom-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={takeModalSnapshot}
                      className="px-4 py-1.5 bg-white text-[#2C2C2C] text-xs font-bold rounded-full shadow-md flex items-center gap-1 hover:bg-neutral-200"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>拍照并嵌入</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopModalCamera}
                      className="px-3 py-1.5 bg-black/60 text-white text-xs rounded-full hover:bg-black/80"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={startModalCamera}
                    className="py-2.5 px-3 rounded-xl border border-[#EAE6DD] hover:bg-[#F4F0E8] text-xs font-medium text-[#2C2C2C] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#666666]" />
                    <span>现场自拍一张</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl border border-[#EAE6DD] hover:bg-[#F4F0E8] text-xs font-medium text-[#2C2C2C] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#666666]" />
                    <span>从相册选取</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {/* If no photo, choose mascot badge */}
              {!photoUrl && !isModalCamActive && (
                <div className="pt-2">
                  <span className="text-[11px] text-[#888888] block mb-1.5">
                    或选择学霸主题勋章：
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {BADGE_PRESETS.map(badge => (
                      <button
                        key={badge.id}
                        type="button"
                        onClick={() => setSelectedBadge(badge.id)}
                        className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 border transition-all ${
                          selectedBadge === badge.id
                            ? 'bg-[#FAF3E8] border-[#2C2C2C] font-bold text-[#2C2C2C]'
                            : 'border-[#EAE6DD] text-[#666666] hover:bg-[#F4F0E8]'
                        }`}
                      >
                        <span>{badge.emoji}</span>
                        <span className="text-[11px]">{badge.label.split(' ')[1]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Motivational Quote */}
            <div className="bg-white rounded-2xl p-4 border border-[#EAE6DD] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#2C2C2C] flex items-center gap-1">
                  <Quote className="w-3.5 h-3.5 text-[#888888]" />
                  <span>打卡激励语</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setQuoteIndex(idx => (idx + 1) % MOTIVATIONAL_QUOTES.length)
                  }
                  className="text-[11px] text-[#666666] hover:text-[#2C2C2C] flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>换一句</span>
                </button>
              </div>

              <textarea
                value={customNote || MOTIVATIONAL_QUOTES[quoteIndex]}
                onChange={e => setCustomNote(e.target.value)}
                rows={2}
                maxLength={60}
                className="w-full text-xs p-2.5 rounded-xl border border-[#EAE6DD] bg-[#FFFDF8] focus:outline-none focus:border-[#2C2C2C] resize-none"
                placeholder="写下今日的心得或坚持誓言..."
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-3 bg-[#2C2C2C] hover:bg-[#1A1A1A] text-white font-bold rounded-xl text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>保存图片到本地 / 相册</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="w-full py-2.5 border border-[#EAE6DD] hover:bg-[#FAF7F0] text-[#2C2C2C] font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-[#666666]" />
                <span>微信 / 朋友圈分享</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
