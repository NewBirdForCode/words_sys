import { Wordbook, WordItem } from '../types';
import { VOCABULARY_BANK } from './vocabulary';

/**
 * 官方预置系统词库定义 (System Vocabularies)
 * category: 'DSE' | '雅思' | '四六级' | '校本' | '其他'
 */

// 1. DSE 核心考纲词汇 (Oxford English HKDSE)
const DSE_WORDS_SUBSET_1: WordItem[] = VOCABULARY_BANK.slice(0, 30).map(w => ({
  ...w,
  book_id: 'sys_wb_dse_core_1',
  wordbook_id: 'sys_wb_dse_core_1',
}));

// 2. DSE 进阶拓展词汇 (Longman Elect HKDSE)
const DSE_WORDS_SUBSET_2: WordItem[] = VOCABULARY_BANK.slice(30, 60).map(w => ({
  ...w,
  book_id: 'sys_wb_dse_core_2',
  wordbook_id: 'sys_wb_dse_core_2',
}));

// 3. DSE 冲刺满分词汇 (Developing Skills HKDSE)
const DSE_WORDS_SUBSET_3: WordItem[] = VOCABULARY_BANK.slice(60, 90).map(w => ({
  ...w,
  book_id: 'sys_wb_dse_core_3',
  wordbook_id: 'sys_wb_dse_core_3',
}));

// 4. 雅思精选高频核心词汇 (IELTS Academic)
const IELTS_WORDS: WordItem[] = [
  { id: 'w_ielts_01', word: 'academic', phonetic: '/ˌækəˈdemɪk/', meaning: '学术的；教学的', translation: '学术的；教学的', partOfSpeech: 'adj.', exampleEn: 'The university has high academic standards for applicants.', exampleCn: '该大学对申请者有很高的学术标准。' },
  { id: 'w_ielts_02', word: 'comprehensive', phonetic: '/ˌkɒmprɪˈhensɪv/', meaning: '全面的；综合的', translation: '全面的；综合的', partOfSpeech: 'adj.', exampleEn: 'We conducted a comprehensive review of the current research.', exampleCn: '我们对当前的研究进行了全面回顾。' },
  { id: 'w_ielts_03', word: 'crucial', phonetic: '/ˈkruːʃl/', meaning: '关键的；至关重要的', translation: '关键的；至关重要的', partOfSpeech: 'adj.', exampleEn: 'Parental support is crucial to a child’s early development.', exampleCn: '家长的支持对孩子的早期成长至关重要。' },
  { id: 'w_ielts_04', word: 'demonstrate', phonetic: '/ˈdemənstreɪt/', meaning: '论证；证实；示范', translation: '论证；证实；示范', partOfSpeech: 'v.', exampleEn: 'The experiment demonstrated the effectiveness of the treatment.', exampleCn: '该实验证明了这种治疗方法的有效性。' },
  { id: 'w_ielts_05', word: 'evaluate', phonetic: '/ɪˈvæljueɪt/', meaning: '评估；估算；评价', translation: '评估；估算；评价', partOfSpeech: 'v.', exampleEn: 'Experts will evaluate the impact of the new transport policy.', exampleCn: '专家将评估新交通政策带来的影响。' },
  { id: 'w_ielts_06', word: 'fluctuate', phonetic: '/ˈflʌktʃueɪt/', meaning: '波动；摇摆不定', translation: '波动；摇摆不定', partOfSpeech: 'v.', exampleEn: 'Global oil prices fluctuate wildly based on market supply.', exampleCn: '国际油价因市场供求关系剧烈波动。' },
  { id: 'w_ielts_07', word: 'generate', phonetic: '/ˈdʒenəreɪt/', meaning: '产生；引起；生发', translation: '产生；引起；生发', partOfSpeech: 'v.', exampleEn: 'The project aims to generate clean energy for the district.', exampleCn: '该项目旨在为该区域产生清洁能源。' },
  { id: 'w_ielts_08', word: 'hypothesis', phonetic: '/haɪˈpɒθəsɪs/', meaning: '假设；假说', translation: '假设；假说', partOfSpeech: 'n.', exampleEn: 'Researchers put forward a bold hypothesis about climate trends.', exampleCn: '研究人员对气候趋势提出了大胆的假说。' },
  { id: 'w_ielts_09', word: 'indicate', phonetic: '/ˈɪndɪkeɪt/', meaning: '表明；指出；暗示', translation: '表明；指出；暗示', partOfSpeech: 'v.', exampleEn: 'Recent survey findings indicate a shift in public attitudes.', exampleCn: '最近的调查结果表明公众态度发生了转变。' },
  { id: 'w_ielts_10', word: 'justify', phonetic: '/ˈdʒʌstɪfaɪ/', meaning: '证明…有理；辩解', translation: '证明…有理；辩解', partOfSpeech: 'v.', exampleEn: 'No reason can justify the violation of school safety rules.', exampleCn: '任何借口都不能作为违反学校安全规范的理由。' },
  { id: 'w_ielts_11', word: 'methodology', phonetic: '/ˌmeθəˈdɒlədʒi/', meaning: '方法论；研究方法', translation: '方法论；研究方法', partOfSpeech: 'n.', exampleEn: 'The paper details the methodology used in collecting data.', exampleCn: '该论文详细描述了收集数据时所采用的研究方法。' },
  { id: 'w_ielts_12', word: 'phenomenon', phonetic: '/fəˈnɒmɪnən/', meaning: '现象；非凡事物', translation: '现象；非凡事物', partOfSpeech: 'n.', exampleEn: 'Social media addiction has become a global phenomenon.', exampleCn: '社交媒体成瘾已成为一种全球性现象。' },
];

// 5. 大学英语四六级核心词汇 (CET-4/6)
const CET_WORDS: WordItem[] = [
  { id: 'w_cet_01', word: 'abandon', phonetic: '/əˈbændən/', meaning: '放弃；抛弃', translation: '放弃；抛弃', partOfSpeech: 'v.', exampleEn: 'They had to abandon the plan due to severe funding cuts.', exampleCn: '由于经费严重被削减，他们不得不放弃该计划。' },
  { id: 'w_cet_02', word: 'acquire', phonetic: '/əˈkwaɪə/', meaning: '习得；获得；学到', translation: '习得；获得；学到', partOfSpeech: 'v.', exampleEn: 'Children easily acquire language skills in natural settings.', exampleCn: '孩子们在自然语言环境中能轻松习得语言技能。' },
  { id: 'w_cet_03', word: 'benefit', phonetic: '/ˈbenɪfɪt/', meaning: '使受益；利益', translation: '使受益；利益', partOfSpeech: 'v./n.', exampleEn: 'Regular exercise brings long-term benefits to your health.', exampleCn: '规律的锻炼对你的身体健康有长期的益处。' },
  { id: 'w_cet_04', word: 'capacity', phonetic: '/kəˈpæsəti/', meaning: '容量；能力；生产力', translation: '容量；能力；生产力', partOfSpeech: 'n.', exampleEn: 'The concert hall has a seating capacity of two thousand.', exampleCn: '该音乐厅可容纳两千名观众就座。' },
  { id: 'w_cet_05', word: 'distinct', phonetic: '/dɪˈstɪŋkt/', meaning: '截然不同的；清晰的', translation: '截然不同的；清晰的', partOfSpeech: 'adj.', exampleEn: 'The two proposals offer distinct solutions to the traffic problem.', exampleCn: '这两套方案针对交通问题给出了截然不同的解法。' },
  { id: 'w_cet_06', word: 'enhance', phonetic: '/ɪnˈhɑːns/', meaning: '提高；增强；增进', translation: '提高；增强；增进', partOfSpeech: 'v.', exampleEn: 'New software features will greatly enhance work productivity.', exampleCn: '新软件功能将极大提升工作生产力。' },
  { id: 'w_cet_07', word: 'maintain', phonetic: '/meɪnˈteɪn/', meaning: '维持；保持；保养', translation: '维持；保持；保养', partOfSpeech: 'v.', exampleEn: 'It is important to maintain close contact with old friends.', exampleCn: '与老朋友保持密切联系十分重要。' },
  { id: 'w_cet_08', word: 'potential', phonetic: '/pəˈtenʃl/', meaning: '潜在的；潜能', translation: '潜在的；潜能', partOfSpeech: 'adj./n.', exampleEn: 'Every student has great potential to succeed with hard work.', exampleCn: '只要刻苦努力，每位学生都具有巨大的成功潜力。' },
  { id: 'w_cet_09', word: 'sustain', phonetic: '/səˈsteɪn/', meaning: '维持；支撑；遭受', translation: '维持；支撑；遭受', partOfSpeech: 'v.', exampleEn: 'The team managed to sustain high momentum until victory.', exampleCn: '团队成功将高昂的势头保持到了最后胜利。' },
  { id: 'w_cet_10', word: 'undertake', phonetic: '/ˌʌndəˈteɪk/', meaning: '承担；着手进行', translation: '承担；着手进行', partOfSpeech: 'v.', exampleEn: 'The scholars undertook an extensive study of ancient ruins.', exampleCn: '学者们着手对古遗址展开了一项范围广泛的研究。' },
];

// 6. 名校校本核心词库 (培正 / 拔萃 / 喇沙名校选编)
const SCHOOL_WORDS: WordItem[] = [
  { id: 'w_school_01', word: 'diligent', phonetic: '/ˈdɪlɪdʒənt/', meaning: '勤勉的；勤奋的', translation: '勤勉的；勤奋的', partOfSpeech: 'adj.', exampleEn: 'Diligent students achieve steady progress through daily practice.', exampleCn: '勤奋的学生通过每天的练习取得稳步进步。' },
  { id: 'w_school_02', word: 'integrity', phonetic: '/ɪnˈteɡrəti/', meaning: '正直；诚实；完整', translation: '正直；诚实；完整', partOfSpeech: 'n.', exampleEn: 'Our school motto encourages students to uphold honesty and integrity.', exampleCn: '我们的校训鼓励学生坚守诚实与正直。' },
  { id: 'w_school_03', word: 'persevere', phonetic: '/ˌpɜːsɪˈvɪə/', meaning: '坚持不懈；锲而不舍', translation: '坚持不懈；锲而不舍', partOfSpeech: 'v.', exampleEn: 'If you persevere through challenges, you will surely reach your goal.', exampleCn: '如果你能迎难而上、坚持不懈，你必将达成目标。' },
  { id: 'w_school_04', word: 'collaborate', phonetic: '/kəˈlæbəreɪt/', meaning: '合作；协作', translation: '合作；协作', partOfSpeech: 'v.', exampleEn: 'Students are encouraged to collaborate on community projects.', exampleCn: '学校鼓励学生在社区服务项目中开展团队协作。' },
  { id: 'w_school_05', word: 'empathy', phonetic: '/ˈempəθi/', meaning: '同理心；同情', translation: '同理心；同情', partOfSpeech: 'n.', exampleEn: 'Showing empathy towards others is a hallmark of good character.', exampleCn: '懂得换位思考并关怀他人是优良品格的重要标志。' },
  { id: 'w_school_06', word: 'articulate', phonetic: '/ɑːˈtɪkjuleɪt/', meaning: '善于表达的；清晰吐字', translation: '善于表达的；清晰吐字', partOfSpeech: 'adj./v.', exampleEn: 'She gave an articulate and persuasive speech at the debate.', exampleCn: '她在辩论赛中发表了一场清晰流畅且具说服力的演讲。' },
  { id: 'w_school_07', word: 'innovate', phonetic: '/ˈɪnəveɪt/', meaning: '革新；开拓创新', translation: '革新；开拓创新', partOfSpeech: 'v.', exampleEn: 'Science classes inspire students to innovate and solve problems.', exampleCn: '科学课程激励学生开拓创新、攻克现实难题。' },
  { id: 'w_school_08', word: 'resilience', phonetic: '/rɪˈzɪliəns/', meaning: '韧性；恢复力', translation: '韧性；恢复力', partOfSpeech: 'n.', exampleEn: 'Sports training helps teenagers build mental resilience.', exampleCn: '体育锻炼有助于青少年磨砺心理韧性与抗压能力。' },
];

export const SYSTEM_WORDBOOKS_PRESETS: Wordbook[] = [
  {
    id: 'sys_wb_dse_core_1',
    book_id: 'sys_wb_dse_core_1',
    name: 'HKDSE 必背词汇 · Oxford 基础篇',
    book_name: 'HKDSE 必背词汇 · Oxford 基础篇',
    description: '匹配《Oxford English for HKDSE》必修模组，精选初高中衔接与基础高频词汇',
    default_mode: 'focused_quiz',
    default_batch_size: 30,
    enabled_modes: ['fast_review', 'focused_quiz'],
    words: DSE_WORDS_SUBSET_1,
    created_at: 1770000000001,
    updated_at: 1770000000001,
    category: 'DSE',
    series: 'Oxford English for HKDSE',
    publisher: '牛津大学出版社',
    grade: 'S1-S3',
    volume: 'Book 4A',
    tags: ['阅读', '核心', '基础'],
    is_system: true,
  },
  {
    id: 'sys_wb_dse_core_2',
    book_id: 'sys_wb_dse_core_2',
    name: 'HKDSE 拔高词汇 · Longman 进阶篇',
    book_name: 'HKDSE 拔高词汇 · Longman 进阶篇',
    description: '涵盖《Longman Elect HKDSE》社会议题与进阶选修模组，冲刺 Lv 4/5 必备',
    default_mode: 'focused_quiz',
    default_batch_size: 30,
    enabled_modes: ['fast_review', 'focused_quiz'],
    words: DSE_WORDS_SUBSET_2,
    created_at: 1770000000002,
    updated_at: 1770000000002,
    category: 'DSE',
    series: 'Longman Elect HKDSE',
    publisher: '培生朗文',
    grade: 'S4-S6',
    volume: 'Book 5A',
    tags: ['写作', '阅读', '进阶'],
    is_system: true,
  },
  {
    id: 'sys_wb_dse_core_3',
    book_id: 'sys_wb_dse_core_3',
    name: 'HKDSE 满分词汇 · Developing Skills 冲刺篇',
    book_name: 'HKDSE 满分词汇 · Developing Skills 冲刺篇',
    description: '针对 HKDSE 卷一精读与卷二高分写作，涵盖学术议论文高分同义词替换',
    default_mode: 'focused_quiz',
    default_batch_size: 30,
    enabled_modes: ['fast_review', 'focused_quiz'],
    words: DSE_WORDS_SUBSET_3,
    created_at: 1770000000003,
    updated_at: 1770000000003,
    category: 'DSE',
    series: 'Developing Skills for HKDSE',
    publisher: 'Aristo 教育',
    grade: 'S4-S6',
    volume: '冲刺精选卷',
    tags: ['写作', '口语', '高分冲刺'],
    is_system: true,
  },
  {
    id: 'sys_wb_ielts_core',
    book_id: 'sys_wb_ielts_core',
    name: '雅思学术类核心词汇 (IELTS Academic)',
    book_name: '雅思学术类核心词汇 (IELTS Academic)',
    description: '剑桥雅思大纲 7.0+ 高频核心动词、形容词与学术论证常用词汇',
    default_mode: 'focused_quiz',
    default_batch_size: 30,
    enabled_modes: ['fast_review', 'focused_quiz'],
    words: IELTS_WORDS,
    created_at: 1770000000004,
    updated_at: 1770000000004,
    category: '雅思',
    series: 'Cambridge IELTS 核心大纲',
    publisher: '剑桥大学出版社',
    grade: 'S4-S6',
    volume: '学术精选卷',
    tags: ['写作', '听力', '阅读'],
    is_system: true,
  },
  {
    id: 'sys_wb_cet_core',
    book_id: 'sys_wb_cet_core',
    name: '大学英语四六级 (CET 4/6) 考纲高频词',
    book_name: '大学英语四六级 (CET 4/6) 考纲高频词',
    description: '全国大学英语四六级考试常考高频动词搭配与阅读必考难词',
    default_mode: 'focused_quiz',
    default_batch_size: 30,
    enabled_modes: ['fast_review', 'focused_quiz'],
    words: CET_WORDS,
    created_at: 1770000000005,
    updated_at: 1770000000005,
    category: '四六级',
    series: '全国大学英语四六级大纲',
    publisher: '外研社',
    grade: 'S4-S6',
    volume: '全国通用卷',
    tags: ['阅读', '听力', '翻译'],
    is_system: true,
  },
  {
    id: 'sys_wb_school_core',
    book_id: 'sys_wb_school_core',
    name: '名校校本必修课内外品格与思辨词汇',
    book_name: '名校校本必修课内外品格与思辨词汇',
    description: '香港传统名校校本教研精选：涵盖学术演讲、批判性思维与思辨品格词汇',
    default_mode: 'focused_quiz',
    default_batch_size: 30,
    enabled_modes: ['fast_review', 'focused_quiz'],
    words: SCHOOL_WORDS,
    created_at: 1770000000006,
    updated_at: 1770000000006,
    category: '校本',
    series: '香港名校联合校本教材',
    publisher: '校本教研组',
    grade: 'S1-S3',
    volume: '校本核心卷',
    tags: ['口语', '写作', '思辨'],
    is_system: true,
  },
];
