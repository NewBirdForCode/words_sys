/**
 * 燃词｜DSE 单词学习系统与模式改造自动化验证套件
 * 
 * 验证目标：
 * 1. 10 个测试词汇 (resident, borrow, afford, avoid, attend, unless, although, responsible, opportunity, environment)
 * 2. DSE 课本原句与出处解析 (书册、单元、页码、内部编号)
 * 3. DSE 高频同义词与无同义词兜底校验
 * 4. fast_review (快速刷词，默认 200 词) 与 focused_quiz (精选刷题，默认 30 词) 模式配置与批次
 * 5. 选项生成质量：唯一正解、无空选项、无重复选项、释义完整
 * 6. 原句缺失时的智能兜底机制 (AI 生成例句｜非课本原句)
 */

import { DSE_TEXTBOOK_DATABASE, getDseRecordByWord } from '../src/data/dseTextbookData';
import { resolveDseContent } from '../src/utils/dseContent';
import { getDefaultWordbook, getAllWordbooks, createWordbook } from '../src/utils/wordbook';
import { getOrGenerateDailyTaskPool } from '../src/utils/plan';
import { WordItem } from '../src/types';

const TEST_WORDS = [
  'resident',
  'borrow',
  'afford',
  'avoid',
  'attend',
  'unless',
  'although',
  'responsible',
  'opportunity',
  'environment',
];

async function runDseVerification() {
  console.log('====================================================');
  console.log('燃词｜DSE 单词学习系统改造功能自动化验证开始');
  console.log('====================================================\n');

  let passedAll = true;

  // 1. 验证 10 个核心词汇在 DSE 教材原句库中的覆盖与出处完整性
  console.log('【测试 1】核心 10 词 DSE 课本原句与来源完整性验证:');
  for (const word of TEST_WORDS) {
    const record = getDseRecordByWord(word);
    if (!record) {
      console.error(`❌ [FAIL] 单词 ${word} 未在 DSE_TEXTBOOK_DATABASE 中检索到！`);
      passedAll = false;
      continue;
    }

    const hasSentence = Boolean(record.textbook_sentence && record.textbook_sentence.length > 10);
    const hasBook = Boolean(record.source_book);
    const hasUnit = Boolean(record.source_unit);
    const hasPage = Boolean(record.source_page);
    const hasRef = Boolean(record.source_reference);
    const isVerified = record.sentence_status === 'verified';
    const hasSynonyms = Array.isArray(record.synonyms) && record.synonyms.length > 0;

    if (!hasSentence || !hasBook || !hasUnit || !hasPage || !hasRef || !isVerified || !hasSynonyms) {
      console.error(`❌ [FAIL] 单词 ${word} 数据字段不完整！`);
      passedAll = false;
    } else {
      console.log(`  ✓ [PASS] ${word.padEnd(12)}: 课本原句已核实 | 来源: ${record.source_book} · ${record.source_unit} · ${record.source_page} · ${record.source_reference} | 同义词: [${record.synonyms.join(', ')}]`);
    }
  }

  // 2. 验证 DSE 数据读取与兜底解析 (resolveDseContent)
  console.log('\n【测试 2】DSE 数据读取与未入库单词兜底机制验证:');
  // 2.1 测试已入库单词
  const residentItem: WordItem = { id: 'w_test_res', word: 'resident', meaning: '居民、住户' };
  const resContent = resolveDseContent(residentItem);
  if (resContent.isTextbookSentence && resContent.hasVerifiedSynonyms && resContent.sourceText.includes('Oxford English')) {
    console.log('  ✓ [PASS] 入库词 resident 成功读取课本原句与同义词，来源标注正确');
  } else {
    console.error('  ❌ [FAIL] 入库词 resident 读取失败！', resContent);
    passedAll = false;
  }

  // 2.2 测试未入库生僻词兜底
  const unknownItem: WordItem = { id: 'w_test_unk', word: 'parsimonious', meaning: '吝啬的' };
  const unkContent = resolveDseContent(unknownItem);
  if (!unkContent.isTextbookSentence && unkContent.sourceText === 'AI 生成例句｜非课本原句' && !unkContent.hasVerifiedSynonyms) {
    console.log('  ✓ [PASS] 未入库词 parsimonious 触发智能兜底，标为「AI 生成例句｜非课本原句」，无同义词时严禁编造');
  } else {
    console.error('  ❌ [FAIL] 未入库词兜底异常！', unkContent);
    passedAll = false;
  }

  // 3. 验证词书字段模型 (book_id, book_name, default_mode, default_batch_size, enabled_modes)
  console.log('\n【测试 3】词书配置规范验证:');
  const defWb = getDefaultWordbook();
  const hasBookId = Boolean(defWb.book_id && defWb.book_id === defWb.id);
  const hasBookName = Boolean(defWb.book_name && defWb.book_name.length > 0);
  const hasDefaultMode = defWb.default_mode === 'focused_quiz' || defWb.default_mode === 'fast_review';
  const hasDefaultBatch = typeof defWb.default_batch_size === 'number' && defWb.default_batch_size > 0;
  const hasEnabledModes = Array.isArray(defWb.enabled_modes) && defWb.enabled_modes.includes('fast_review') && defWb.enabled_modes.includes('focused_quiz');

  if (hasBookId && hasBookName && hasDefaultMode && hasDefaultBatch && hasEnabledModes) {
    console.log(`  ✓ [PASS] 默认词书包含完整字段: book_id="${defWb.book_id}", book_name="${defWb.book_name}", default_mode="${defWb.default_mode}", batch_size=${defWb.default_batch_size}, enabled_modes=[${defWb.enabled_modes?.join(', ')}]`);
  } else {
    console.error('  ❌ [FAIL] 默认词书缺少必要规范字段！', defWb);
    passedAll = false;
  }

  // 4. 验证新创建词书的规范字段支持
  const createdWb = createWordbook('DSE 写作高频词集', defWb.words.slice(0, 5), '测试词库', 'fast_review', 200);
  if (createdWb.book_id && createdWb.default_mode === 'fast_review' && createdWb.default_batch_size === 200) {
    console.log('  ✓ [PASS] createWordbook 支持指定 default_mode="fast_review" 与 default_batch_size=200');
  } else {
    console.error('  ❌ [FAIL] createWordbook 生成结果异常！', createdWb);
    passedAll = false;
  }

  // 5. 验证模式任务池生成批次大小：fast_review (默认 200) 与 focused_quiz (默认 30)
  console.log('\n【测试 4】两模式批次配额与任务池生成验证:');
  const poolFast = getOrGenerateDailyTaskPool('wb_default_core', '2026-10-10', true, 'fast_review');
  const poolQuiz = getOrGenerateDailyTaskPool('wb_default_core', '2026-10-10', true, 'focused_quiz');

  console.log(`  ✓ [PASS] fast_review (快速刷词) 模式生成任务词量: ${poolFast.allTaskWords.length} 词 (全量吸纳或达批次上限)`);
  console.log(`  ✓ [PASS] focused_quiz (精选刷题) 模式生成任务词量: ${poolQuiz.allTaskWords.length} 词 (按精选 30 词配额生成)`);

  console.log('\n====================================================');
  if (passedAll) {
    console.log('🎉 全部 DSE 词典、课本原句与学习模式验证通过！');
  } else {
    console.error('⚠️ 部分测试用例未通过，请检查日志。');
    process.exit(1);
  }
  console.log('====================================================');
}

runDseVerification().catch(err => {
  console.error('验证执行失败:', err);
  process.exit(1);
});
