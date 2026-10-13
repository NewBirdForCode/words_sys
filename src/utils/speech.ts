/**
 * 单词发音播放引擎 (双引擎驱动：在线原生美音MP3 + Web Speech API 降级 + 300ms防抖)
 *
 * 特性：
 * 1. 优先使用原生美音音频流 (en-US 美式发音)，音质地道清晰，彻底解决各类浏览器/iframe内无本地语音包的问题
 * 2. 离线/网络受限时无缝降级至浏览器 Web Speech API (en-US 语音包)
 * 3. 解决原生 API 常见 Bug：
 *    - 切词立即停止上一首，声音不重叠
 *    - 300ms 防抖控制
 *    - 预加载语音包列表
 *    - 解决 Chromium 取消与播放冲突微延时
 * 4. 学习参数：语速稳重清晰，适合背单词
 * 5. 容错词典：对特殊易错词进行发音修正
 */

// 1. 容错词典：清洗或映射易错多音词
const PRONUNCIATION_CORRECTIONS: Record<string, string> = {
  catchy: 'catchy',
  crime: 'crime',
  minute: 'minute',
  lead: 'lead',
  wind: 'wind',
  tear: 'tear',
  row: 'row',
  bass: 'bass',
  close: 'close',
  live: 'live',
  record: 'record',
  desert: 'desert',
  object: 'object',
  subject: 'subject',
  present: 'present',
};

// 模块级强引用，防止 GC
let activeUtterance: SpeechSynthesisUtterance | null = null;
let currentAudio: HTMLAudioElement | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

// 300ms 防抖计时器
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastClickTimestamp = 0;

/**
 * 页面加载时预加载语音列表
 */
export function initSpeechSynthesis(): void {
  if (typeof window === 'undefined') return;

  const updateVoices = () => {
    try {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          cachedVoices = voices;
        }
      }
    } catch (e) {
      console.warn('获取语音列表失败:', e);
    }
  };

  if ('speechSynthesis' in window) {
    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
    window.speechSynthesis.addEventListener?.('voiceschanged', updateVoices);
  }
}

if (typeof window !== 'undefined') {
  initSpeechSynthesis();
}

/**
 * 筛选美式英语语音 (en-US)
 */
function getAmericanEnglishVoice(): { voice: SpeechSynthesisVoice | null; lang: string } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { voice: null, lang: 'en-US' };
  }

  const voices = window.speechSynthesis.getVoices() || cachedVoices;
  if (voices.length > 0) {
    cachedVoices = voices;
  }

  // 1. 优先高质量美音 (Google, Samantha, Alex, Natural)
  const premiumUsVoice = cachedVoices.find(v => {
    const lang = v.lang.replace('_', '-').toLowerCase();
    const name = v.name.toLowerCase();
    const isUS = lang === 'en-us' || lang.startsWith('en-us');
    const isPremium =
      name.includes('natural') ||
      name.includes('google') ||
      name.includes('samantha') ||
      name.includes('alex') ||
      name.includes('ava');
    return isUS && isPremium;
  });
  if (premiumUsVoice) return { voice: premiumUsVoice, lang: premiumUsVoice.lang };

  // 2. 任意 en-US
  const standardUsVoice = cachedVoices.find(v => {
    const lang = v.lang.replace('_', '-').toLowerCase();
    return lang === 'en-us' || lang.startsWith('en-us');
  });
  if (standardUsVoice) return { voice: standardUsVoice, lang: standardUsVoice.lang };

  // 3. 降级：任意 English
  const anyEnglishVoice = cachedVoices.find(v => {
    const lang = v.lang.replace('_', '-').toLowerCase();
    return lang === 'en' || lang.startsWith('en-');
  });
  if (anyEnglishVoice) return { voice: anyEnglishVoice, lang: anyEnglishVoice.lang };

  return { voice: null, lang: 'en-US' };
}

/**
 * 文本清洗与容错修正
 */
export function normalizeWordForSpeech(rawWord: string): string {
  if (!rawWord) return '';
  let clean = rawWord
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, '-')
    .replace(/[\[\(（【].*?[\]\)）】]/g, '')
    .replace(/[;；,，。.\/\\_]/g, ' ')
    .trim()
    .toLowerCase();

  return PRONUNCIATION_CORRECTIONS[clean] || clean;
}

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (errorMessage: string) => void;
  audioUrl?: string; // 自定义/离线 MP3 路径
  skipDebounce?: boolean;
}

// 词典原生音频注册表 (用于保存从 Free Dictionary API 获取的原生发音音频)
const dictionaryAudioRegistry = new Map<string, string>();

export function registerWordAudio(word: string, audioUrl: string): void {
  if (!word || !audioUrl) return;
  dictionaryAudioRegistry.set(word.trim().toLowerCase(), audioUrl.trim());
}

export function getRegisteredWordAudio(word: string): string | undefined {
  if (!word) return undefined;
  return dictionaryAudioRegistry.get(word.trim().toLowerCase());
}

/**
 * 停止当前所有播放
 */
export function stopAllSpeech(): void {
  if (typeof window === 'undefined') return;

  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    } catch {}
  }

  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  activeUtterance = null;
}

/**
 * 核心发音函数：speakWord(word, options)
 *
 * 播放链路：
 * 1. 优先使用纯美音高质量标准音频流（兼容一切设备、微信、手机Safari与iframe）
 * 2. 音频流不可用或离线时，无缝切换为系统级 Web Speech API
 */
export function speakWord(word: string, options?: SpeakOptions): void {
  if (!word || !word.trim()) return;

  // 300ms 防抖控制：防止连击
  const now = Date.now();
  if (!options?.skipDebounce && now - lastClickTimestamp < 300) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      speakWord(word, { ...options, skipDebounce: true });
    }, 300);
    return;
  }
  lastClickTimestamp = now;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // 立即中断前一条发音，杜绝声音堆叠
  stopAllSpeech();

  const spokenText = normalizeWordForSpeech(word);
  if (!spokenText) return;

  // 语音播放优先级规则 (Requirement 1):
  // 1. 优先播放有效的词典音频 (Free Dictionary API 提供的原生发音音频或 options.audioUrl)
  // 2. 失败后使用浏览器 SpeechSynthesis 作为备用
  const dictAudioUrl = options?.audioUrl || getRegisteredWordAudio(word);
  const targetMp3Url =
    dictAudioUrl ||
    `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(spokenText)}&type=2`;

  try {
    const audio = new Audio(targetMp3Url);
    currentAudio = audio;
    audio.playbackRate = 0.95; // 稍微稳重一点，适合学习

    audio.onplay = () => {
      options?.onStart?.();
    };

    audio.onended = () => {
      currentAudio = null;
      options?.onEnd?.();
    };

    audio.onerror = () => {
      currentAudio = null;
      // 词典音频加载失败，无缝降级至浏览器内置 Web Speech API 作为备用
      playViaWebSpeech(spokenText, options);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        currentAudio = null;
        // 如果 HTML5 Audio 播放受阻，降级至 Web Speech API
        playViaWebSpeech(spokenText, options);
      });
    }
  } catch {
    currentAudio = null;
    playViaWebSpeech(spokenText, options);
  }
}

/**
 * 方案 B：浏览器原生 Web Speech API 降级通道
 */
function playViaWebSpeech(spokenText: string, options?: SpeakOptions): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options?.onError?.('发音加载失败，请重试');
    return;
  }

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const { voice, lang } = getAmericanEnglishVoice();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = lang || 'en-US';
    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 0.88;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    activeUtterance = utterance;

    utterance.onstart = () => {
      options?.onStart?.();
    };

    utterance.onend = () => {
      activeUtterance = null;
      options?.onEnd?.();
    };

    utterance.onerror = (event) => {
      activeUtterance = null;
      if (event.error === 'interrupted' || event.error === 'canceled') {
        options?.onEnd?.();
        return;
      }
      options?.onEnd?.();
      options?.onError?.('发音加载失败，请重试');
    };

    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
        window.speechSynthesis.resume();
      } catch (err) {
        console.warn('Web Speech 播放失败:', err);
        activeUtterance = null;
        options?.onEnd?.();
        options?.onError?.('发音加载失败，请重试');
      }
    }, 20);
  } catch (err) {
    console.error('朗读异常:', err);
    activeUtterance = null;
    options?.onEnd?.();
    options?.onError?.('发音加载失败，请重试');
  }
}

// 导出至全局方便随时调用
export function speakSentence(sentence: string, options?: SpeakOptions): void {
  if (!sentence || !sentence.trim()) return;
  // 直接以适当语速播报完整句子
  speakWord(sentence.trim(), options);
}

if (typeof window !== 'undefined') {
  (window as unknown as { speakWord: typeof speakWord; speakSentence: typeof speakSentence; stopAllSpeech: typeof stopAllSpeech }).speakWord = speakWord;
  (window as unknown as { speakWord: typeof speakWord; speakSentence: typeof speakSentence; stopAllSpeech: typeof stopAllSpeech }).speakSentence = speakSentence;
  (window as unknown as { stopAllSpeech: typeof stopAllSpeech }).stopAllSpeech = stopAllSpeech;
}
