/**
 * 燃词｜四阶段闭环与底层学习记录统一性测试套件
 */

// Node.js 环境下模拟 localStorage 与 window
if (typeof (globalThis as any).window === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = String(val); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { for (const k in store) delete store[k]; },
    },
  };
  (globalThis as any).localStorage = (globalThis as any).window.localStorage;
}

import { fetchWordImage, getFallbackScene } from '../src/utils/wordImage';
import { getDseRecordByWord } from '../src/data/dseTextbookData';
import {
  recordMistake,
  resolveMistakeInSession,
  getMistakesSorted,
  getAllMistakeHistory,
  getMistakeBook,
  saveMistakeBook,
} from '../src/utils/storage';
import {
  updateWordLearningResult,
  getAllMemoryProgress,
  getWordMasteryTier,
} from '../src/utils/plan';

async function runLoopTests() {
  console.log('====================================================');
  console.log('燃词｜四阶段学习闭环与抗遗忘记录统一性测试');
  console.log('====================================================\n');

  let passed = true;

  // 1. 测试点一：图片与单词匹配，避免抽象词抓取无关网图 (以 bolster 为例)
  console.log('【测试 1】抽象词与配图精准性 (避免无关网图):');
  const bolsterImg = await fetchWordImage('bolster');
  const bolsterScene = getFallbackScene('bolster', '支持，增强，巩固');
  const bolsterDse = getDseRecordByWord('bolster');

  if (bolsterImg === null) {
    console.log('  ✓ [PASS] bolster 作为抽象动词未抓取无关网图，精准降级为优雅语义卡');
  } else {
    console.error('  ❌ [FAIL] bolster 不应随意加载网络杂乱图片！', bolsterImg);
    passed = false;
  }

  if (bolsterScene && bolsterScene.emojis.includes('🧱')) {
    console.log(`  ✓ [PASS] bolster 语义兜底匹配正确: ${bolsterScene.emojis} ${bolsterScene.bgDesc}`);
  } else {
    console.error('  ❌ [FAIL] bolster 语义兜底匹配不正确:', bolsterScene);
    passed = false;
  }

  if (bolsterDse && bolsterDse.textbook_sentence.includes('bolster')) {
    console.log(`  ✓ [PASS] bolster 课本原句已录入: "${bolsterDse.textbook_sentence}" (出处: ${bolsterDse.source_book})`);
  } else {
    console.error('  ❌ [FAIL] bolster 缺少 DSE 课本原句！');
    passed = false;
  }

  // 2. 测试点四：错词循环与间隔复习 —— 持续追踪，不永久删除错词
  console.log('\n【测试 2】阶段四错词循环：持续追踪与抗遗忘延后 (不永久物理删除错词):');

  // 模拟记录一个错词
  const testWordId = 'w_test_loop_001';
  saveMistakeBook({}); // 清空临时测试本

  recordMistake(testWordId);
  recordMistake(testWordId); // 做错两次

  let book = getMistakeBook();
  if (book[testWordId]?.errorCount === 2) {
    console.log('  ✓ [PASS] 错词连续两次答错，错误次数正确累计为 2');
  } else {
    console.error('  ❌ [FAIL] 错误次数未正确累计:', book[testWordId]);
    passed = false;
  }

  // 模拟阶段四攻克掌握
  resolveMistakeInSession(testWordId);
  updateWordLearningResult('wb_default_core', testWordId, true, '2026-10-12');

  book = getMistakeBook();
  const activeMistakes = getMistakesSorted();
  const allHistory = getAllMistakeHistory();

  // 验证活跃队列已攻克 (本轮清空)
  if (activeMistakes.some(m => m.wordId === testWordId)) {
    console.error('  ❌ [FAIL] 攻克后不应残留在本轮活跃队列！');
    passed = false;
  } else {
    console.log('  ✓ [PASS] 攻克后已从今日待消除活跃队列移出');
  }

  // 验证底层历史记录未被物理删除！
  if (book[testWordId] && book[testWordId].errorCount === 2) {
    console.log(`  ✓ [PASS] 错题记录未被删除！完整保留历史 errorCount=${book[testWordId].errorCount}, consecutiveCorrect=${book[testWordId].consecutiveCorrect}`);
  } else {
    console.error('  ❌ [FAIL] 错词记录被意外删除或覆盖！', book[testWordId]);
    passed = false;
  }

  if (allHistory.some(m => m.wordId === testWordId)) {
    console.log('  ✓ [PASS] 全局历史错题库 getAllMistakeHistory 依然能够检索到该词的做题档案');
  } else {
    console.error('  ❌ [FAIL] 全局错题档案丢失！');
    passed = false;
  }

  // 3. 验证抗遗忘记忆曲线更新
  console.log('\n【测试 3】抗遗忘复习间隔更新与状态跟踪:');
  const allProg = getAllMemoryProgress();
  const wordProg = allProg[`wb_default_core_${testWordId}`];
  if (wordProg && wordProg.nextReviewDate > '2026-10-12') {
    console.log(`  ✓ [PASS] 掌握后复习间隔顺延成功，下次复习日期设为: ${wordProg.nextReviewDate} (intervalStep=${wordProg.intervalStep})`);
  } else {
    console.error('  ❌ [FAIL] 抗遗忘复习间隔未正确顺延！', wordProg);
    passed = false;
  }

  console.log('\n====================================================');
  if (passed) {
    console.log('🎉 全部测试通过！学习记录闭环与抗遗忘模型工作正常。');
  } else {
    console.log('❌ 部分测试未通过，请核查代码。');
  }
  console.log('====================================================\n');
}

runLoopTests();
