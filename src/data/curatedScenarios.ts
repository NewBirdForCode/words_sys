import { ScenarioExample } from '../types';

export interface CuratedWordScenario {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaning: string;
  contextMeaning: string;
  collocations: string[];
  scenarios: ScenarioExample[];
  usageTip?: string;
  imageKeyword?: string;
}

export const CURATED_SCENARIOS_BANK: Record<string, CuratedWordScenario> = {
  // 1. resident
  resident: {
    word: 'resident',
    phonetic: '/ˈrezɪdənt/',
    partOfSpeech: 'n.',
    meaning: '居民、住户',
    contextMeaning: '居民、常住人口、大厦住户',
    collocations: ['local residents (当地居民)', 'resident of (……的住户/居民)', 'permanent resident (永久居民)'],
    imageKeyword: 'residential building apartment community',
    usageTip: 'resident 指某地区或大厦的常住居民或住户，常搭配 local residents 或 resident of...，不可与 citizen（公民）混淆。',
    scenarios: [
      {
        type: 'daily',
        label: '日常生活',
        exampleEn: 'She is a resident of Hong Kong and loves the city.',
        exampleCn: '她是香港居民，非常热爱这座城市。',
        collocation: 'resident of Hong Kong',
        contextMeaning: '居民',
        scene: '居住背景',
        tip: '日常介绍居住身份或户籍所在'
      },
      {
        type: 'dialogue',
        label: '真实交流',
        exampleEn: 'Are you a resident of this building? We have a parcel for you.',
        exampleCn: '你是这栋大厦的住户吗？我们这里有你的包裹。',
        collocation: 'resident of this building',
        contextMeaning: '大厦住户',
        scene: '物业门卫沟通',
        tip: '社区管理与邻里问询真实常用句'
      },
      {
        type: 'work_study',
        label: '学习工作',
        exampleEn: 'Local residents often shop at this community market on weekends.',
        exampleCn: '当地居民周末经常在这个社区市场购物。',
        collocation: 'local residents',
        contextMeaning: '当地居民',
        scene: '社区生活与调研',
        tip: '社会生活调查与社团活动高频搭配'
      }
    ]
  },

  // 2. borrow
  borrow: {
    word: 'borrow',
    phonetic: '/ˈbɒrəʊ/',
    partOfSpeech: 'v.',
    meaning: '借入、借用',
    contextMeaning: '向他人借入某物（区别于借出的 lend）',
    collocations: ['borrow sth from sb (向某人借某物)', 'borrow a book (借书)', 'borrow an umbrella (借雨伞)'],
    imageKeyword: 'library book borrowing umbrella',
    usageTip: '用法辨析：borrow 是“借入”（borrow sth from sb），而 lend 是“借出”（lend sth to sb），两者不可混淆。',
    scenarios: [
      {
        type: 'daily',
        label: '日常生活',
        exampleEn: 'Can I borrow your umbrella? It is raining heavily outside.',
        exampleCn: '我能借用你的雨伞吗？外面雨下得很大。',
        collocation: 'borrow an umbrella',
        contextMeaning: '借用',
        scene: '雨天互助',
        tip: '家庭及朋友间最自然的借物请求'
      },
      {
        type: 'dialogue',
        label: '真实交流',
        exampleEn: 'Could I borrow your pencil for the math test? I forgot mine.',
        exampleCn: '数学考试我能借你的铅笔用一下吗？我忘记带了。',
        collocation: 'borrow your pencil',
        contextMeaning: '借来使用',
        scene: '课堂同学交流',
        tip: '学校考场与自习时的真实对话'
      },
      {
        type: 'work_study',
        label: '学习工作',
        exampleEn: 'Students can borrow up to five books from the school library each week.',
        exampleCn: '学生每周最多可以从学校图书馆借阅五本书。',
        collocation: 'borrow from the library',
        contextMeaning: '借阅',
        scene: '图书馆借阅规则',
        tip: '学校公共服务与阅读指南常用表达'
      }
    ]
  },

  // 3. afford
  afford: {
    word: 'afford',
    phonetic: '/əˈfɔːd/',
    partOfSpeech: 'v.',
    meaning: '买得起、承担得起',
    contextMeaning: '有足够的金钱或时间承担某事',
    collocations: ['can afford to buy (买得起)', 'cannot afford (负担不起)', 'afford the time (抽得出时间)'],
    imageKeyword: 'budget shopping price tag',
    usageTip: '常见结构：can/cannot afford sth 或 can/cannot afford to do sth，常用于否定句或疑问句。',
    scenarios: [
      {
        type: 'daily',
        label: '日常生活',
        exampleEn: 'We cannot afford to eat at expensive restaurants every day.',
        exampleCn: '我们无法承受每天都在昂贵的餐厅吃饭。',
        collocation: 'cannot afford to eat',
        contextMeaning: '承担得起花销',
        scene: '家庭生活开销',
        tip: '理财与日常预算常用句'
      },
      {
        type: 'dialogue',
        label: '真实交流',
        exampleEn: 'Do you think we can afford this new computer for schoolwork?',
        exampleCn: '你觉得我们买得起这台用于学习的新电脑吗？',
        collocation: 'can afford this computer',
        contextMeaning: '买得起',
        scene: '家庭商量购物',
        tip: '与父母或同伴商量采购的真实对话'
      },
      {
        type: 'work_study',
        label: '学习工作',
        exampleEn: 'The project team cannot afford to waste any more time before the deadline.',
        exampleCn: '在截止日期前，项目团队再也耽误不起任何时间了。',
        collocation: 'afford to waste time',
        contextMeaning: '承担得起时间消耗',
        scene: '学习或工作进度',
        tip: '表示时间紧张或机会宝贵的经典地道表达'
      }
    ]
  },

  // 4. avoid
  avoid: {
    word: 'avoid',
    phonetic: '/əˈvɔɪd/',
    partOfSpeech: 'v.',
    meaning: '避免、避开',
    contextMeaning: '防止不良结果发生，避开危险或错误',
    collocations: ['avoid doing sth (避免做某事)', 'avoid rush hour (避开高峰期)', 'avoid mistakes (避免犯错)'],
    imageKeyword: 'caution traffic detour health',
    usageTip: '语法要点：avoid 后面必须接名词或动名词（avoid doing sth），不能接不定式 to do。',
    scenarios: [
      {
        type: 'daily',
        label: '日常生活',
        exampleEn: 'You should drink warm water and avoid catching a cold in winter.',
        exampleCn: '冬天你应该多喝温水，避免着凉感冒。',
        collocation: 'avoid catching a cold',
        contextMeaning: '避免（疾病或不适）',
        scene: '健康生活习惯',
        tip: '长辈叮嘱或日常养生自然表达'
      },
      {
        type: 'dialogue',
        label: '真实交流',
        exampleEn: 'How can I avoid making careless mistakes in English writing?',
        exampleCn: '我怎样才能避免在英语写作中犯粗心的错误？',
        collocation: 'avoid making mistakes',
        contextMeaning: '避免（犯错）',
        scene: '学习求教与答疑',
        tip: '向老师求助或同桌交流常用句'
      },
      {
        type: 'work_study',
        label: '学习工作',
        exampleEn: 'Drivers should take another route to avoid heavy morning traffic.',
        exampleCn: '司机应走另一条路线以避开早晨拥堵的交通。',
        collocation: 'avoid heavy traffic',
        contextMeaning: '避开（拥堵交通）',
        scene: '城市通勤路况',
        tip: '导航提示与出行建议高频地道表达'
      }
    ]
  },

  // 5. attend
  attend: {
    word: 'attend',
    phonetic: '/əˈtend/',
    partOfSpeech: 'v.',
    meaning: '参加、出席',
    contextMeaning: '出席会议、课程、活动等正式场合',
    collocations: ['attend school (上学)', 'attend a meeting (参加会议)', 'attend classes (上课)'],
    imageKeyword: 'classroom meeting lecture conference',
    usageTip: '用法辨析：attend 表示“出席、参加”，不能机械地翻译为“照顾”。表示照顾通常用 attend to。',
    scenarios: [
      {
        type: 'daily',
        label: '日常生活',
        exampleEn: 'All students in our class must attend school on time.',
        exampleCn: '我们班所有学生都必须准时到校上课。',
        collocation: 'attend school',
        contextMeaning: '按时上学',
        scene: '校园日常准则',
        tip: '学校出勤规章最规范表达'
      },
      {
        type: 'dialogue',
        label: '真实交流',
        exampleEn: 'Are you going to attend the birthday party this Saturday evening?',
        exampleCn: '这周六晚上你会去参加生日聚会吗？',
        collocation: 'attend the birthday party',
        contextMeaning: '参加聚会',
        scene: '周末同伴邀约',
        tip: '朋友间确认行程的亲切问句'
      },
      {
        type: 'work_study',
        label: '学习工作',
        exampleEn: 'The manager asked everyone to attend the morning meeting in the conference room.',
        exampleCn: '经理要求所有人到会议室参加早会。',
        collocation: 'attend the morning meeting',
        contextMeaning: '出席会议',
        scene: '职场与公事活动',
        tip: '公司会议与学术讲座正式通知常用句'
      }
    ]
  },

  // 6. unless
  unless: {
    word: 'unless',
    phonetic: '/ənˈles/',
    partOfSpeech: 'conj.',
    meaning: '除非、如果不',
    contextMeaning: '引导条件从句，表达“在某种情况不发生的前提下”',
    collocations: ['unless you hurry (除非你抓紧)', 'unless it rains (除非下雨)', 'unless permitted (除非得到允许)'],
    imageKeyword: 'clock running outdoor rain umbrella',
    usageTip: '逻辑关系：unless 相当于 if... not，引导条件状语从句，从句通常用一般现在时表将来。',
    scenarios: [
      {
        type: 'daily',
        label: '日常生活',
        exampleEn: 'You will be late for school unless you hurry up.',
        exampleCn: '如果你不快点，你上学就会迟到了。',
        collocation: 'unless you hurry up',
        contextMeaning: '如果不、除非',
        scene: '晨间出门赶路',
        tip: '家长或同伴催促时的地道口头表达'
      },
      {
        type: 'dialogue',
        label: '真实交流',
        exampleEn: 'We will not go camping this weekend unless the weather gets better.',
        exampleCn: '除非天气好转，否则我们这周末不会去露营。',
        collocation: 'unless the weather gets better',
        contextMeaning: '除非',
        scene: '周末出游计划',
        tip: '根据天气商定活动的自然陈述'
      },
      {
        type: 'work_study',
        label: '学习工作',
        exampleEn: 'You cannot submit your project unless your teacher approves the draft.',
        exampleCn: '除非老师批准了草案，否则你不能提交项目。',
        collocation: 'unless teacher approves',
        contextMeaning: '除非满足条件',
        scene: '课题与作业规范',
        tip: '学术提交与规则要求典型结构'
      }
    ]
  },

  // 7. although
  although: {
    word: 'although',
    phonetic: '/ɔːlˈðəʊ/',
    partOfSpeech: 'conj.',
    meaning: '虽然、尽管',
    contextMeaning: '引导让步状语从句，表达转折对比',
    collocations: ['although it was raining (虽然下着雨)', 'although he worked hard (尽管他很努力)'],
    imageKeyword: 'studying rain challenge victory',
    usageTip: '常见误区：英语中 although 与 but 不能在同一个句子中同时连用（二选一）。',
    scenarios: [
      {
        type: 'daily',
        label: '日常生活',
        exampleEn: 'Although it was raining heavily, they still walked to school together.',
        exampleCn: '虽然雨下得很大，他们还是结伴步行去上学了。',
        collocation: 'although it was raining',
        contextMeaning: '虽然、尽管',
        scene: '风雨上学路',
        tip: '日常记叙文最规范的让步转折结构'
      },
      {
        type: 'dialogue',
        label: '真实交流',
        exampleEn: 'Although I was very tired, I finished reading the whole adventure story.',
        exampleCn: '虽然我很累，我还是读完了整本冒险故事书。',
        collocation: 'although I was tired',
        contextMeaning: '尽管累',
        scene: '课后阅读交流',
        tip: '向朋友分享阅读成就感的真实独白'
      },
      {
        type: 'work_study',
        label: '学习工作',
        exampleEn: 'Although the exam was difficult, most students passed with flying colors.',
        exampleCn: '尽管考试很难，大多数学生还是以优异的成绩通过了。',
        collocation: 'although the exam was difficult',
        contextMeaning: '尽管考题困难',
        scene: '考后成绩公布',
        tip: '教师点评与学业总结地道句型'
      }
    ]
  },

  // 8. responsible
  responsible: {
    word: 'responsible',
    phonetic: '/rɪˈspɒnsəbl/',
    partOfSpeech: 'adj.',
    meaning: '负责任的、承担责任的',
    contextMeaning: '有责任心的，或对某项任务/事件承担直接责任',
    collocations: ['be responsible for (对……负责)', 'responsible pet owner (负责任的宠物主人)', 'responsible citizen (负责任的公民)'],
    imageKeyword: 'leadership teamwork pet caring duty',
    usageTip: '常用固定搭配：be responsible for sth / doing sth（对某事/做某事负责任）。',
    scenarios: [
      {
        type: 'daily',
        label: '日常生活',
        exampleEn: 'Tom is responsible for feeding the cat and watering the plants every day.',
        exampleCn: '汤姆负责每天喂猫和给植物浇水。',
        collocation: 'is responsible for feeding',
        contextMeaning: '负责做某事',
        scene: '家庭分工与家务',
        tip: '家庭日常角色分工最常用句型'
      },
      {
        type: 'dialogue',
        label: '真实交流',
        exampleEn: 'Who is responsible for cleaning the classroom blackboard after class?',
        exampleCn: '下课后谁负责擦教室黑板？',
        collocation: 'responsible for cleaning',
        contextMeaning: '负责处理',
        scene: '班级值日分工',
        tip: '班级日常值日生交流与确认'
      },
      {
        type: 'work_study',
        label: '学习工作',
        exampleEn: 'As the team leader, she is responsible for the entire science project.',
        exampleCn: '作为组长，她对整个科学项目负全责。',
        collocation: 'responsible for the project',
        contextMeaning: '承担责任、总负责',
        scene: '课题项目分工',
        tip: '团队合作与项目统筹核心搭配'
      }
    ]
  },

  // 9. opportunity
  opportunity: {
    word: 'opportunity',
    phonetic: '/ˌɒpəˈtjuːnəti/',
    partOfSpeech: 'n.',
    meaning: '机会、良机',
    contextMeaning: '做某事的有利时机或难得条件',
    collocations: ['a great opportunity (绝佳机会)', 'opportunity to learn (学习机会)', 'seize the opportunity (抓住机会)'],
    imageKeyword: 'opportunity success graduation career travel',
    usageTip: '常见结构：opportunity to do sth 或 opportunity for sth，表示做某事的有利时机。',
    scenarios: [
      {
        type: 'daily',
        label: '日常生活',
        exampleEn: 'Travelling abroad gives students a great opportunity to make international friends.',
        exampleCn: '出国旅行给学生提供了一个结交国际朋友的绝佳机会。',
        collocation: 'a great opportunity to make friends',
        contextMeaning: '结交朋友的好机会',
        scene: '假期旅行见闻',
        tip: '日常生活分享见识的经典表达'
      },
      {
        type: 'dialogue',
        label: '真实交流',
        exampleEn: 'This summer camp is a wonderful opportunity to practice speaking English.',
        exampleCn: '这个夏令营是一个练习英语口语的绝好机会。',
        collocation: 'opportunity to practice',
        contextMeaning: '锻炼的好机会',
        scene: '营地与活动推介',
        tip: '鼓励朋友一同报名的诚恳交流'
      },
      {
        type: 'work_study',
        label: '学习工作',
        exampleEn: 'The university offered her a rare opportunity to study biology in London.',
        exampleCn: '那所大学为她提供了一个在伦敦攻读生物学的难得机会。',
        collocation: 'rare opportunity to study',
        contextMeaning: '难得的深造机会',
        scene: '学业深造与奖学金',
        tip: '升学、奖学金与职业发展正式描述'
      }
    ]
  },

  // 10. environment
  environment: {
    word: 'environment',
    phonetic: '/ɪnˈvaɪrənmənt/',
    partOfSpeech: 'n.',
    meaning: '环境、自然生态或周围条件',
    contextMeaning: '大自然生态环境，或工作学习的周围氛围',
    collocations: ['protect the environment (保护环境)', 'learning environment (学习环境)', 'clean environment (干净的环境)'],
    imageKeyword: 'green earth nature clean classroom',
    usageTip: '用法区别：指大自然生态环境时常带 the（the environment）；指学习或工作氛围时可用 a friendly environment。',
    scenarios: [
      {
        type: 'daily',
        label: '日常生活',
        exampleEn: 'We should bring reusable bags to the supermarket to protect the environment.',
        exampleCn: '我们去超市时应该带环保袋以保护环境。',
        collocation: 'protect the environment',
        contextMeaning: '生态环境',
        scene: '绿色环保出行',
        tip: '日常家庭购物环保习惯'
      },
      {
        type: 'dialogue',
        label: '真实交流',
        exampleEn: 'A quiet room provides a comfortable environment for reading and studying.',
        exampleCn: '安静的房间为阅读和学习提供了舒适的环境。',
        collocation: 'environment for reading',
        contextMeaning: '学习环境/氛围',
        scene: '自习空间交流',
        tip: '探讨自习地点与阅读体验'
      },
      {
        type: 'work_study',
        label: '学习工作',
        exampleEn: 'The school strives to create a safe and supportive learning environment for all children.',
        exampleCn: '学校致力于为所有儿童创造一个安全且支持性的学习环境。',
        collocation: 'learning environment',
        contextMeaning: '教育育人环境',
        scene: '校园教育理念',
        tip: '学校简章与教育方针高频规范表达'
      }
    ]
  },

  // 核心词汇补充
  ubiquitous: {
    word: 'ubiquitous',
    phonetic: '/juːˈbɪkwɪtəs/',
    partOfSpeech: 'adj.',
    meaning: '无所不在的、普遍存在的',
    contextMeaning: '到处都能见到的、极普遍的',
    collocations: ['ubiquitous smartphones (随处可见的智能手机)', 'become ubiquitous (变得无处不在)'],
    imageKeyword: 'smartphones technology wifi city',
    usageTip: '常用于形容科技产品、流行文化或现象无所不在。',
    scenarios: [
      {
        type: 'daily',
        label: '日常生活',
        exampleEn: 'Free Wi-Fi networks have become ubiquitous in cafes and subway stations.',
        exampleCn: '免费无线网络在咖啡馆和地铁站里已经随处可见。',
        collocation: 'become ubiquitous',
        contextMeaning: '随处可见的',
        scene: '数字城市生活',
      },
      {
        type: 'dialogue',
        label: '真实交流',
        exampleEn: 'Why are bubble tea shops so ubiquitous on every street corner?',
        exampleCn: '为什么每个街角都有这么多奶茶店，简直无处不在？',
        collocation: 'ubiquitous shops',
        contextMeaning: '到处都是的',
        scene: '街头美食聊天',
      },
      {
        type: 'work_study',
        label: '学习工作',
        exampleEn: 'Smartphones have become ubiquitous tools in modern school education.',
        exampleCn: '智能手机已成为现代学校教育中普遍存在的工具。',
        collocation: 'ubiquitous tools',
        contextMeaning: '普遍应用的',
        scene: '现代教育科技',
      }
    ]
  },

  pragmatic: {
    word: 'pragmatic',
    phonetic: '/præɡˈmætɪk/',
    partOfSpeech: 'adj.',
    meaning: '务实的、重实效的',
    contextMeaning: '从实际出发的、讲求实效的',
    collocations: ['a pragmatic approach (务实的方法)', 'pragmatic solution (实用的解决办法)'],
    imageKeyword: 'planning puzzle practical tools',
    usageTip: '强调解决实际问题而非空谈理论，常修饰 approach, solution, advice。',
    scenarios: [
      {
        type: 'daily',
        label: '日常生活',
        exampleEn: 'My father gave me pragmatic advice on how to save pocket money.',
        exampleCn: '父亲给了我关于如何节省零花钱的实用建议。',
        collocation: 'pragmatic advice',
        contextMeaning: '务实的、实用的',
        scene: '家庭理财引导',
      },
      {
        type: 'dialogue',
        label: '真实交流',
        exampleEn: 'Let us take a pragmatic approach and fix the broken bike wheel first.',
        exampleCn: '我们务实一点，先把坏掉的自行车轮修好再说。',
        collocation: 'take a pragmatic approach',
        contextMeaning: '采取实际可行的做法',
        scene: '动手修理事宜',
      },
      {
        type: 'work_study',
        label: '学习工作',
        exampleEn: 'The team found a pragmatic solution to finish the science project within budget.',
        exampleCn: '团队找到了一个务实的方案，在预算内完成了科学项目。',
        collocation: 'pragmatic solution',
        contextMeaning: '讲求实效的解决方案',
        scene: '实验项目攻关',
      }
    ]
  },

  mitigate: {
    word: 'mitigate',
    phonetic: '/ˈmɪtɪɡeɪt/',
    partOfSpeech: 'v.',
    meaning: '减轻、缓解',
    contextMeaning: '减少有害影响或严重程度',
    collocations: ['mitigate the risk (降低风险)', 'mitigate pollution (减轻污染)', 'mitigate damage (减轻损失)'],
    imageKeyword: 'planting trees helmet safety umbrella',
    usageTip: '常用于环保、医疗或风险管理，搭配 risk, impact, effect, pollution。',
    scenarios: [
      {
        type: 'daily',
        label: '日常生活',
        exampleEn: 'Wearing a helmet can mitigate the risk of head injury while cycling.',
        exampleCn: '骑自行车时戴头盔可以减轻头部受伤的风险。',
        collocation: 'mitigate the risk',
        contextMeaning: '降低危险',
        scene: '交通安全防护',
      },
      {
        type: 'dialogue',
        label: '真实交流',
        exampleEn: 'What can we do to mitigate our stress before the final exam?',
        exampleCn: '期末考试前我们可以做些什么来缓解压力？',
        collocation: 'mitigate stress',
        contextMeaning: '减轻心理压力',
        scene: '考前心态交流',
      },
      {
        type: 'work_study',
        label: '学习工作',
        exampleEn: 'Planting trees along roads helps mitigate urban air pollution.',
        exampleCn: '沿路植树有助于减轻城市空气污染。',
        collocation: 'mitigate air pollution',
        contextMeaning: '缓解环境问题',
        scene: '社区绿化科研',
      }
    ]
  },

  resilient: {
    word: 'resilient',
    phonetic: '/rɪˈzɪliənt/',
    partOfSpeech: 'adj.',
    meaning: '有韧性的、适应力强的',
    contextMeaning: '能迅速从挫折或困难中恢复的',
    collocations: ['resilient community (有韧性的社区)', 'stay resilient (保持坚韧)'],
    imageKeyword: 'sprout spring growing through rocks courage',
    usageTip: '可形容人的坚毅品格，也可形容植物生命力强或系统抗击打能力。',
    scenarios: [
      {
        type: 'daily',
        label: '日常生活',
        exampleEn: 'Young children are often remarkably resilient when recovering from a fever.',
        exampleCn: '小孩子在发烧康复时往往具有惊人的恢复力。',
        collocation: 'remarkably resilient',
        contextMeaning: '身体恢复力强',
        scene: '家庭健康照顾',
      },
      {
        type: 'dialogue',
        label: '真实交流',
        exampleEn: 'Do not give up after one failed match; be resilient and try again!',
        exampleCn: '一场比赛输了别放弃，坚强一点再试一次！',
        collocation: 'be resilient',
        contextMeaning: '坚韧不拔的',
        scene: '体育运动鼓劲',
      },
      {
        type: 'work_study',
        label: '学习工作',
        exampleEn: 'The local community remained resilient despite the heavy storm damage.',
        exampleCn: '尽管遭受了严重的暴风雨袭击，当地社区依然展现出极强的韧性。',
        collocation: 'resilient community',
        contextMeaning: '灾后重建韧性',
        scene: '灾后互助重建',
      }
    ]
  }
};

/**
 * 快速检查一个单词是否有预置审核的真实生活场景库
 */
export function getCuratedScenario(word: string): CuratedWordScenario | null {
  const clean = word.trim().toLowerCase();
  return CURATED_SCENARIOS_BANK[clean] || null;
}
