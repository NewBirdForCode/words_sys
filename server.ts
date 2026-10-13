import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { CURATED_SCENARIOS_BANK } from './src/data/curatedScenarios';

dotenv.config();

// Electron 的 esbuild CJS 包中 import.meta.url 不可用，桌面主进程会将工作目录设为 resourcesPath。
const __dirname = process.cwd();

const app = express();
app.use(express.json());

// Initialize Google GenAI client if GEMINI_API_KEY is available
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI();
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

// 严格程序规则质检：检查是否包含低质量模板句
const FORBIDDEN_PATTERNS = [
  /is very important in our life/i,
  /like .+ very much/i,
  /this is a good /i,
  /should use .+ every day/i,
  /we can .+ easily/i,
  /this is a picture of /i,
  /i .+ every day/i,
];

function isQualityPassed(sentence: string, targetWord?: string): boolean {
  if (!sentence || sentence.trim().length < 12) return false;
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sentence)) {
      return false;
    }
  }
  if (targetWord) {
    const cleanW = targetWord.trim().toLowerCase();
    const cleanSent = sentence.toLowerCase();
    // 必须包含目标词或其屈折词干 (>=3字符)
    const stem = cleanW.slice(0, Math.max(3, cleanW.length - 2));
    if (!cleanSent.includes(cleanW) && !cleanSent.includes(stem)) {
      return false;
    }
  }
  return true;
}

// 严格程序规则：校验 AI 返回的 JSON 结构与字段完整性
function validateGeneratedData(parsed: any, targetWord: string): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  if (!parsed.scenarios || !Array.isArray(parsed.scenarios) || parsed.scenarios.length < 3) return false;
  
  for (const sc of parsed.scenarios) {
    if (!sc.exampleEn || !sc.exampleCn) return false;
    if (!isQualityPassed(sc.exampleEn, targetWord)) return false;
    if (!sc.type || !['daily', 'dialogue', 'work_study'].includes(sc.type)) {
      // 允许智能补齐类型
      sc.type = 'daily';
    }
  }
  return true;
}

/**
 * POST /api/enrich-word
 * 真实生活场景例句生成接口 (免费 Flash 模型 + 多级质检与错误分类)
 */
app.post('/api/enrich-word', async (req: Request, res: Response) => {
  const { word, meaning, partOfSpeech, studentLevel = 'intermediate' } = req.body;
  if (!word || typeof word !== 'string') {
    return res.status(400).json({
      status: 'error',
      errorCode: 'INVALID_PARAMS',
      error: 'Missing word parameter',
    });
  }

  const cleanWord = word.trim().toLowerCase();

  // 1. 优先使用经人工审核的权威生活场景库 (标记为 curated_verified)
  if (CURATED_SCENARIOS_BANK[cleanWord]) {
    const curated = CURATED_SCENARIOS_BANK[cleanWord];
    return res.json({
      status: 'success',
      source: 'curated_verified',
      verificationStatus: 'curated_verified',
      word: curated.word,
      phonetic: curated.phonetic,
      partOfSpeech: curated.partOfSpeech,
      meaning: curated.meaning,
      contextMeaning: curated.contextMeaning,
      collocations: curated.collocations,
      scenarios: curated.scenarios.map(s => ({
        ...s,
        targetWord: curated.word,
        partOfSpeech: curated.partOfSpeech,
        targetMeaning: curated.contextMeaning || curated.meaning,
        difficultyLevel: (s.difficultyLevel || 'intermediate') as 'beginner' | 'intermediate' | 'advanced',
        verificationStatus: 'curated_verified',
      })),
      usageTip: curated.usageTip,
    });
  }

  // 2. 检查 Gemini API 凭据
  if (!aiClient || !process.env.GEMINI_API_KEY) {
    return res.status(200).json({
      status: 'fallback',
      errorCode: 'NO_API_KEY',
      message: '服务端未配置 GEMINI_API_KEY，切换至词典数据与规则引擎',
      word: cleanWord,
    });
  }

  // 3. 调用免费 Gemini Flash 系列模型生成真实生活场景例句
  const prompt = `你是一名资深的英语母语教学专家与语言学家。请为单词 "${cleanWord}" 生成真实的日常生活场景例句。
目标指定词义: "${meaning || '常用词义'}"
指定词性: "${partOfSpeech || '未指定'}"
目标学生水平: "${studentLevel}"（适合香港小学高年级至初中阶段，注重实用口语与高频搭配）。

【严格要求】:
1. 正确音标与指定词性。
2. 2-3 个真实高频搭配（如 local residents, resident of）。
3. 生成 3 条互不相同、且极具真实语境的生活场景例句：
   - 场景 A (daily): 家庭生活、社区居住、日常购物、交通、饮食等。
   - 场景 B (dialogue): 真实人物在实际沟通中说的自然句子（日常问句、回答或交流口吻）。
   - 场景 C (work_study): 校园课堂、图书馆、社团、公共服务或职业生活场景。
4. 每条例句必须包含准确的简体中文翻译（按整句语境自然意译，不得机械直译）、目标单词在句中的具体词义、所用搭配和场景标签。
5. 【绝对禁止】生成空泛低质模板，如 "The ... is very important in our life"、"I like ... very much"、"This is a good ..." 等。
6. 严格辨析易混词（如 borrow 借入 vs lend 借出；attend 出席 vs 照顾；although 不能与 but 连用；avoid 接动名词）。

请返回严格的 JSON 格式:
{
  "word": "${cleanWord}",
  "phonetic": "正确音标",
  "partOfSpeech": "词性",
  "contextMeaning": "最贴切的核心中文含义",
  "collocations": ["搭配1", "搭配2"],
  "usageTip": "简短避坑使用提示",
  "scenarios": [
    {
      "type": "daily",
      "label": "日常生活",
      "exampleEn": "英文例句A",
      "exampleCn": "中文翻译A",
      "collocation": "本句搭配",
      "contextMeaning": "句中具体含义",
      "scene": "场景标签（如 社区生活）",
      "difficultyLevel": "intermediate"
    },
    {
      "type": "dialogue",
      "label": "真实交流",
      "exampleEn": "英文例句B",
      "exampleCn": "中文翻译B",
      "collocation": "本句搭配",
      "contextMeaning": "句中具体含义",
      "scene": "场景标签（如 课后问询）",
      "difficultyLevel": "intermediate"
    },
    {
      "type": "work_study",
      "label": "学习工作",
      "exampleEn": "英文例句C",
      "exampleCn": "中文翻译C",
      "collocation": "本句搭配",
      "contextMeaning": "句中具体含义",
      "scene": "场景标签（如 规则说明）",
      "difficultyLevel": "intermediate"
    }
  ]
}`;

  let lastError: any = null;
  let isRateLimited = false;

  // 最多尝试 3 次重试校验与质检
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text?.trim();
      if (text) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          lastError = new Error('JSON 解析失败');
          continue;
        }

        // 程序规则检查字段完整性、目标单词、词义与质量
        if (validateGeneratedData(parsed, cleanWord)) {
          // 4.2 规定：AI 生成的内容必须标记为待验证，不能直接标记为人工审核通过
          return res.json({
            status: 'success',
            source: 'ai_pending_verification',
            verificationStatus: 'ai_pending_verification',
            word: parsed.word || cleanWord,
            phonetic: parsed.phonetic || '',
            partOfSpeech: parsed.partOfSpeech || partOfSpeech || '',
            meaning: meaning || parsed.contextMeaning || '',
            contextMeaning: parsed.contextMeaning || meaning || '',
            collocations: parsed.collocations || [],
            scenarios: parsed.scenarios.map((s: any) => ({
              ...s,
              targetWord: cleanWord,
              partOfSpeech: parsed.partOfSpeech || partOfSpeech || '',
              targetMeaning: parsed.contextMeaning || meaning || '',
              difficultyLevel: s.difficultyLevel || 'intermediate',
              verificationStatus: 'ai_pending_verification',
            })),
            usageTip: parsed.usageTip || 'AI 生成例句（待人工核定），请结合具体生活语境理解记忆。',
          });
        } else {
          lastError = new Error('AI 生成未通过程序规则质量校验 (包含违禁模板或缺少目标词)');
        }
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err);
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota')) {
        isRateLimited = true;
        break; // 限流时直接退出重试，避免刷爆配额
      }
      console.warn(`Gemini generation attempt ${attempt} failed:`, err);
    }
  }

  // 区分细化错误类型 (不能把网络错误、词典 404、API 限流和模型生成失败混为一类)
  if (isRateLimited) {
    return res.status(200).json({
      status: 'error',
      errorCode: 'RATE_LIMITED',
      message: 'Gemini API 请求频率或免费配额超限 (429 Too Many Requests)，正在降级至词典与本地数据',
      word: cleanWord,
    });
  }

  return res.status(200).json({
    status: 'error',
    errorCode: 'AI_GENERATION_FAILED',
    message: `AI 例句生成重试 3 次后仍未通过质检：${lastError?.message || '生成失败'}`,
    word: cleanWord,
  });
});

/**
 * POST /api/translate-meaning
 * 单词中文释义缺失时的 AI 智能翻译接口 (带缓存保障)
 */
app.post('/api/translate-meaning', async (req: Request, res: Response) => {
  const { word, englishDefinition } = req.body;
  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'Missing word parameter' });
  }

  const cleanWord = word.trim().toLowerCase();

  // 优先从人工库提取
  if (CURATED_SCENARIOS_BANK[cleanWord]) {
    return res.json({
      meaning: CURATED_SCENARIOS_BANK[cleanWord].meaning,
      source: 'curated',
    });
  }

  if (!aiClient || !process.env.GEMINI_API_KEY) {
    return res.json({
      meaning: '',
      source: 'none',
      message: '无 API Key 可用',
    });
  }

  try {
    const prompt = `请为英语单词 "${cleanWord}" 提供最准确、常用且精炼的中文释义（2-8个汉字，如"居民、住户"）。
${englishDefinition ? `参考英文释义: "${englishDefinition}"` : ''}
请仅直接回复中文释义词组，不要带有多余说明。`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const meaning = response.text?.trim() || '';
    return res.json({
      meaning,
      source: 'ai_translated',
    });
  } catch (err: any) {
    return res.status(200).json({
      meaning: '',
      source: 'error',
      error: err?.message || '翻译失败',
    });
  }
});

function getListenPort(): number {
  // Check CLI arguments for --port <port>
  const portIndex = process.argv.indexOf('--port');
  if (portIndex !== -1 && process.argv[portIndex + 1]) {
    const p = parseInt(process.argv[portIndex + 1], 10);
    if (!isNaN(p) && p > 0) return p;
  }
  if (process.env.APP_PORT) {
    const p = parseInt(process.env.APP_PORT, 10);
    if (!isNaN(p) && p > 0) return p;
  }
  // In AI Studio Build, the applet server must run on port 3000 (8080 is reserved for nginx)
  return 3000;
}

async function startServer() {
  const distExists = fs.existsSync(path.join(__dirname, 'dist', 'index.html'));
  const isDev = process.env.NODE_ENV !== 'production' || !distExists;

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    // 确保开发环境下所有非API路由正确经Vite管道加载并返回 index.html
    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const port = getListenPort();
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`[RanCi App] Server running at http://0.0.0.0:${port}`);
  });

  server.on('error', (err: any) => {
    console.error(`[RanCi App] Server listen error on port ${port}:`, err);
  });
}

startServer();
