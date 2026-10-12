/**
 * 单词发音播放引擎
 *
 * 播放策略：优先使用词典/有道 MP3，失败后降级到 Web Speech API。
 * 通过播放代次（generation）和单次完成回调，避免 Windows Chromium 中旧音频
 * 的 onerror/onended 在新单词开始后再次触发，造成重复发音、卡顿或错误推进。
 */

const PRONUNCIATION_CORRECTIONS: Record<string, string> = {
  catchy: 'catchy', crime: 'crime', minute: 'minute', lead: 'lead', wind: 'wind',
  tear: 'tear', row: 'row', bass: 'bass', close: 'close', live: 'live', record: 'record',
  desert: 'desert', object: 'object', subject: 'subject', present: 'present',
};

let activeUtterance: SpeechSynthesisUtterance | null = null;
let currentAudio: HTMLAudioElement | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastClickTimestamp = 0;
let playbackGeneration = 0;
let activeWord = '';
let activeResolve: (() => void) | null = null;
let activePromise: Promise<void> | null = null;

export function initSpeechSynthesis(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const updateVoices = () => {
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) cachedVoices = voices;
    } catch (error) {
      console.warn('获取语音列表失败:', error);
    }
  };

  updateVoices();
  window.speechSynthesis.onvoiceschanged = updateVoices;
}

if (typeof window !== 'undefined') initSpeechSynthesis();

function getAmericanEnglishVoice(): { voice: SpeechSynthesisVoice | null; lang: string } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { voice: null, lang: 'en-US' };
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) cachedVoices = voices;

  const normalizeLang = (lang: string) => lang.replace('_', '-').toLowerCase();
  const premium = cachedVoices.find(v => {
    const lang = normalizeLang(v.lang);
    const name = v.name.toLowerCase();
    return (lang === 'en-us' || lang.startsWith('en-us')) &&
      ['natural', 'google', 'samantha', 'alex', 'ava'].some(part => name.includes(part));
  });
  if (premium) return { voice: premium, lang: premium.lang };

  const usVoice = cachedVoices.find(v => {
    const lang = normalizeLang(v.lang);
    return lang === 'en-us' || lang.startsWith('en-us');
  });
  if (usVoice) return { voice: usVoice, lang: usVoice.lang };

  const englishVoice = cachedVoices.find(v => normalizeLang(v.lang) === 'en' || normalizeLang(v.lang).startsWith('en-'));
  return englishVoice ? { voice: englishVoice, lang: englishVoice.lang } : { voice: null, lang: 'en-US' };
}

export function normalizeWordForSpeech(rawWord: string): string {
  if (!rawWord) return '';
  const clean = rawWord
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
  audioUrl?: string;
  skipDebounce?: boolean;
}

const dictionaryAudioRegistry = new Map<string, string>();

export function registerWordAudio(word: string, audioUrl: string): void {
  if (word && audioUrl) dictionaryAudioRegistry.set(word.trim().toLowerCase(), audioUrl.trim());
}

export function getRegisteredWordAudio(word: string): string | undefined {
  return word ? dictionaryAudioRegistry.get(word.trim().toLowerCase()) : undefined;
}

/** 停止当前播放，并让等待中的自动推进安全结束。 */
export function stopAllSpeech(): void {
  playbackGeneration += 1;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  try {
    currentAudio?.pause();
    if (currentAudio) currentAudio.currentTime = 0;
  } catch {}
  currentAudio = null;

  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {}
  activeUtterance = null;
  activeWord = '';

  activeResolve?.();
  activeResolve = null;
  activePromise = null;
}

function beginPlayback(word: string): { generation: number; done: Promise<void>; finish: (error?: string) => void } {
  stopAllSpeech();
  const generation = playbackGeneration;
  let finished = false;
  let resolveDone!: () => void;
  const done = new Promise<void>(resolve => { resolveDone = resolve; });
  activeResolve = resolveDone;
  activePromise = done;
  activeWord = word;

  const finish = (error?: string) => {
    if (finished || generation !== playbackGeneration) return;
    finished = true;
    activeResolve = null;
    activePromise = null;
    activeWord = '';
    currentAudio = null;
    activeUtterance = null;
    resolveDone();
    if (error) return;
  };

  return { generation, done, finish };
}

/**
 * 播放单词。返回 Promise 在发音结束、失败或被用户切换打断时完成，
 * 供自动切词流程准确等待，不依赖固定的 600ms/700ms 猜测。
 */
export function speakWord(word: string, options?: SpeakOptions): Promise<void> {
  if (!word || !word.trim()) return Promise.resolve();

  const now = Date.now();
  if (!options?.skipDebounce && now - lastClickTimestamp < 300) {
    if (debounceTimer) clearTimeout(debounceTimer);
    return new Promise(resolve => {
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        speakWord(word, { ...options, skipDebounce: true }).then(resolve);
      }, 300);
    });
  }
  lastClickTimestamp = now;

  const spokenText = normalizeWordForSpeech(word);
  if (!spokenText) return Promise.resolve();
  const { generation, done, finish } = beginPlayback(spokenText);
  const dictAudioUrl = options?.audioUrl || getRegisteredWordAudio(word);
  const targetUrl = dictAudioUrl || `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(spokenText)}&type=2`;
  let fallbackStarted = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  const startFallback = () => {
    if (fallbackStarted || generation !== playbackGeneration) return;
    fallbackStarted = true;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch {}
      currentAudio = null;
    }
    playViaWebSpeech(spokenText, options, generation, finish);
  };

  try {
    const audio = new Audio(targetUrl);
    currentAudio = audio;
    audio.preload = 'auto';
    audio.playbackRate = 0.95;
    audio.onplay = () => {
      if (generation === playbackGeneration) options?.onStart?.();
    };
    audio.onended = () => {
      if (generation !== playbackGeneration) return;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      options?.onEnd?.();
      finish();
    };
    audio.onerror = () => startFallback();
    // 某些 Windows 浏览器网络音频会长时间 pending，及时走本地语音降级。
    fallbackTimer = setTimeout(startFallback, 5000);
    const playPromise = audio.play();
    playPromise?.catch(startFallback);
  } catch {
    startFallback();
  }

  return done;
}

function playViaWebSpeech(
  spokenText: string,
  options: SpeakOptions | undefined,
  generation: number,
  finish: (error?: string) => void,
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options?.onError?.('发音加载失败，请重试');
    options?.onEnd?.();
    finish('unsupported');
    return;
  }

  try {
    const { voice, lang } = getAmericanEnglishVoice();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = lang;
    if (voice) utterance.voice = voice;
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.volume = 1;
    activeUtterance = utterance;

    utterance.onstart = () => {
      if (generation === playbackGeneration) options?.onStart?.();
    };
    utterance.onend = () => {
      if (generation !== playbackGeneration) return;
      options?.onEnd?.();
      finish();
    };
    utterance.onerror = event => {
      if (generation !== playbackGeneration) return;
      options?.onEnd?.();
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        options?.onError?.('发音加载失败，请重试');
      }
      finish(event.error);
    };

    // Windows Chromium 需要在下一个事件循环中提交 speak，减少偶发的空播。
    setTimeout(() => {
      if (generation !== playbackGeneration) return;
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        window.speechSynthesis.resume();
      } catch {
        options?.onError?.('发音加载失败，请重试');
        options?.onEnd?.();
        finish('speak_failed');
      }
    }, 20);
  } catch {
    options?.onError?.('发音加载失败，请重试');
    options?.onEnd?.();
    finish('speech_error');
  }
}

export function speakSentence(sentence: string, options?: SpeakOptions): Promise<void> {
  return sentence?.trim() ? speakWord(sentence.trim(), options) : Promise.resolve();
}

/** 返回当前播放完成 Promise；没有播放时立即完成。 */
export function getSpeechCompletion(word?: string): Promise<void> {
  if (word && activeWord && normalizeWordForSpeech(word) !== activeWord) return Promise.resolve();
  return activePromise || Promise.resolve();
}

if (typeof window !== 'undefined') {
  const globalSpeech = window as unknown as {
    speakWord: typeof speakWord;
    speakSentence: typeof speakSentence;
    stopAllSpeech: typeof stopAllSpeech;
  };
  globalSpeech.speakWord = speakWord;
  globalSpeech.speakSentence = speakSentence;
  globalSpeech.stopAllSpeech = stopAllSpeech;
}
