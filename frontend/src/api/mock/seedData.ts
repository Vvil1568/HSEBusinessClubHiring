import type { StartupStage, VacancyTemplate } from '../../types';
import { buildLogoDataUri } from '../../utils/logo';
import { createRandom, daysAgoIso, pickOne, randomInt } from './random';
import { CURRENT_USER_ID, seedUsers } from './seedUsers';
import type { DbApplication, DbStartup, DbVacancy, DbUser, DbView, MockDatabase } from './types';

interface VacancySeed {
  title: string;
  description: string;
  requirements: string;
  reward: string;
  hidden?: boolean;
}

interface StartupSeed {
  title: string;
  shortDescription: string;
  description: string;
  stage: StartupStage;
  ownerId: string;
  logo: [string, string];
  daysOld: number;
  vacancies: VacancySeed[];
}

const startupSeeds: StartupSeed[] = [
  {
    title: 'NeuroPilot AI',
    shortDescription: 'ИИ-ассистент для первичной диагностики в клиниках.',
    description:
      'NeuroPilot AI помогает врачам первичного звена быстрее обрабатывать жалобы пациентов и формировать предварительные гипотезы. Модель обучена на обезличенных клинических данных и встраивается в существующую МИС через открытый API.\n\nПродукт уже проходит пилот в трёх клиниках Москвы. Мы собираем команду, которая закроет продуктовую аналитику и клинические сценарии, а также подготовит выход на рынки СНГ.',
    stage: 'mvp',
    ownerId: 'u-anna',
    logo: ['#7C3AED', '#2563EB'],
    daysOld: 96,
    vacancies: [
      {
        title: 'ML Engineer',
        description:
          'Разработка и дообучение моделей обработки естественного языка для клинических текстов. Работа в связке с врачом-консультантом и продуктовым аналитиком.',
        requirements: 'PyTorch, transformers, опыт NLP от 2 лет, понимание медицинских данных будет плюсом.',
        reward: 'от 250 000 ₽ на руки, гибридный формат, опционы.',
      },
      {
        title: 'Клинический аналитик',
        description:
          'Формализация клинических сценариев, разметка данных, валидация ответов модели вместе с врачами-экспертами.',
        requirements: 'Медицинское образование, опыт работы с МИС, внимательность к деталям.',
        reward: 'от 140 000 ₽, гибкий график 20–40 часов в неделю.',
      },
      {
        title: 'Product Designer',
        description:
          'Проектирование интерфейсов для врачей: от исследования рабочих мест до готовых макетов и дизайн-системы.',
        requirements: 'Портфолио с B2B-продуктами, Figma на экспертном уровне, опыт usability-тестов.',
        reward: 'от 180 000 ₽, оформление по ТК.',
      },
    ],
  },
  {
    title: 'GreenRoute',
    shortDescription: 'Сервис оптимизации маршрутов для городской логистики.',
    description:
      'GreenRoute снижает пробег курьерских автопарков на 18% за счёт динамической маршрутизации и учёта дорожной обстановки. Мы работаем с 40 компаниями и обрабатываем более 120 тысяч заказов в неделю.\n\nСейчас масштабируемся на регионы и ищем людей, готовых строить операционную модель с нуля.',
    stage: 'scaling',
    ownerId: 'u-dmitry',
    logo: ['#22C55E', '#0EA5E9'],
    daysOld: 210,
    vacancies: [
      {
        title: 'Operations Manager',
        description:
          'Запуск новых городов: подбор подрядчиков, настройка процессов, контроль SLA и метрик доставки.',
        requirements: 'Опыт операционного управления от 3 лет, готовность к командировкам.',
        reward: 'от 200 000 ₽ + бонус за запуск города.',
      },
      {
        title: 'Frontend Developer',
        description:
          'Развитие диспетчерской панели: карты, real-time трекинг, отчёты. Работа в продуктовой команде из 8 человек.',
        requirements: 'React, TypeScript, опыт с картографическими библиотеками.',
        reward: 'от 220 000 ₽, удалённый формат.',
      },
      {
        title: 'Аккаунт-менеджер',
        description:
          'Ведение ключевых клиентов, развитие действующих контрактов, сбор обратной связи для продукта.',
        requirements: 'Опыт B2B-продаж от 2 лет, уверенная коммуникация.',
        reward: 'от 150 000 ₽ + процент от продлений.',
        hidden: true,
      },
    ],
  },
  {
    title: 'FinPulse',
    shortDescription: 'Платформа аналитики личных финансов с прогнозом cash-flow.',
    description:
      'FinPulse объединяет банковские выписки, инвестиции и регулярные платежи в единую картину. Прогноз cash-flow строится на 12 месяцев вперёд и обновляется ежедневно.\n\nМы на стадии MVP с 4 000 активных пользователей и готовим запуск подписочной модели.',
    stage: 'mvp',
    ownerId: 'u-maria',
    logo: ['#EC4899', '#8B5CF6'],
    daysOld: 64,
    vacancies: [
      {
        title: 'Data Analyst',
        description:
          'Построение продуктовых метрик, исследование удержания, подготовка дашбордов для команды.',
        requirements: 'SQL, Python, продуктовые метрики, опыт A/B-тестов.',
        reward: 'от 190 000 ₽, гибкий график.',
      },
      {
        title: 'Product Manager',
        description:
          'Развитие подписочного сценария: гипотезы, исследования, приоритизация бэклога.',
        requirements: 'Опыт управления B2C-продуктом от 2 лет, аналитическое мышление.',
        reward: 'от 230 000 ₽, опционы.',
      },
    ],
  },
  {
    title: 'AgroSense',
    shortDescription: 'Сенсоры и аналитика для точного земледелия.',
    description:
      'AgroSense устанавливает автономные датчики влажности и состава почвы и передаёт данные в агрономическую панель. Фермерские хозяйства экономят до 25% воды и удобрений.\n\nРазвёрнуто 120 комплектов в трёх регионах. Ищем инженеров и специалистов по полевым внедрениям.',
    stage: 'scaling',
    ownerId: 'u-sergey',
    logo: ['#14B8A6', '#16A34A'],
    daysOld: 180,
    vacancies: [
      {
        title: 'Hardware Engineer',
        description:
          'Разработка и тестирование корпусов и плат датчиков, работа с поставщиками компонентов.',
        requirements: 'Опыт embedded-разработки, знание KiCad, понимание протоколов LoRa.',
        reward: 'от 240 000 ₽, релокация в Казань оплачивается.',
      },
      {
        title: 'Полевой инженер',
        description:
          'Монтаж и обслуживание комплектов датчиков на хозяйствах, обучение агрономов.',
        requirements: 'Техническое образование, готовность к разъездам, права категории B.',
        reward: 'от 130 000 ₽ + суточные.',
      },
    ],
  },
  {
    title: 'CityFlow',
    shortDescription: 'Платформа обратной связи горожан по городской среде.',
    description:
      'CityFlow собирает жалобы и предложения жителей и маршрутизирует их в профильные департаменты. Прозрачные сроки и открытая статистика повышают доверие к городским службам.\n\nПрототип протестирован в двух районах. Ищем продуктовую команду для пилота с администрацией.',
    stage: 'idea',
    ownerId: 'u-olga',
    logo: ['#F97316', '#EAB308'],
    daysOld: 21,
    vacancies: [
      {
        title: 'Product Manager',
        description:
          'Формирование роадмапа пилота, переговоры с администрациями, приоритизация требований.',
        requirements: 'Опыт запуска civic-tech или gov-tech продуктов будет преимуществом.',
        reward: 'от 180 000 ₽, доля в проекте.',
      },
      {
        title: 'Frontend Developer',
        description:
          'Разработка клиентского приложения и админ-панели, работа с картой и медиа.',
        requirements: 'React, TypeScript, опыт PWA.',
        reward: 'от 170 000 ₽, частичная занятость на старте.',
      },
    ],
  },
  {
    title: 'EduNova',
    shortDescription: 'Платформа персональных треков обучения для инженеров.',
    description:
      'EduNova собирает трек обучения из коротких практических модулей и проверяет результат через автоматические ревью задач. Компании используют платформу для онбординга инженеров.\n\nСейчас 9 корпоративных клиентов и 1 800 активных студентов. Ищем разработчиков и методистов.',
    stage: 'mvp',
    ownerId: CURRENT_USER_ID,
    logo: ['#6366F1', '#06B6D4'],
    daysOld: 120,
    vacancies: [
      {
        title: 'Frontend Developer',
        description:
          'Разработка студенческого интерфейса: плеер модулей, редактор кода, прогресс и геймификация.',
        requirements: 'React, TypeScript, опыт с редакторами кода (Monaco/CodeMirror) будет плюсом.',
        reward: 'от 210 000 ₽, полностью удалённо.',
      },
      {
        title: 'Методист образовательных программ',
        description:
          'Проектирование модулей, работа с экспертами-практиками, оценка результатов обучения.',
        requirements: 'Опыт проектирования образовательных программ, знание таксономии Блума.',
        reward: 'от 120 000 ₽, гибкая занятость.',
      },
      {
        title: 'Backend Developer',
        description:
          'Развитие API платформы и системы автоматической проверки решений студентов.',
        requirements: 'Python, FastAPI, PostgreSQL, опыт изоляции исполнения кода.',
        reward: 'от 230 000 ₽, удалённый формат.',
      },
    ],
  },
  {
    title: 'MedQueue',
    shortDescription: 'Электронная очередь и запись в клиники без звонков.',
    description:
      'MedQueue заменяет телефонную запись: пациент выбирает врача и слот онлайн, клиника получает прогнозируемую загрузку. Сервис интегрируется с существующими МИС.\n\nСтадия идеи: собрана команда из трёх человек, готовим пилот с сетью частных клиник.',
    stage: 'idea',
    ownerId: CURRENT_USER_ID,
    logo: ['#0EA5E9', '#7C3AED'],
    daysOld: 12,
    vacancies: [
      {
        title: 'Product Designer',
        description:
          'Проектирование сценариев записи для пациентов и администраторов клиник.',
        requirements: 'Портфолио в продуктовом дизайне, готовность работать в раннем стартапе.',
        reward: 'от 150 000 ₽ или доля в проекте.',
      },
      {
        title: 'Sales Manager',
        description:
          'Поиск и закрытие первых клиник-партнёров, проведение демонстраций продукта.',
        requirements: 'Опыт продаж в медицинском сегменте от 2 лет.',
        reward: 'оклад от 100 000 ₽ + процент от контракта.',
      },
    ],
  },
  {
    title: 'RetailSense',
    shortDescription: 'Компьютерное зрение для анализа покупательского трафика.',
    description:
      'RetailSense анализирует видеопоток в торговых залах: конверсия отделов, очереди, тепловые карты. Решение работает на существующих камерах без замены оборудования.\n\nБолее 300 установок в четырёх сетях. Ищем инженеров для развития платформы.',
    stage: 'scaling',
    ownerId: CURRENT_USER_ID,
    logo: ['#F59E0B', '#EF4444'],
    daysOld: 240,
    vacancies: [
      {
        title: 'Computer Vision Engineer',
        description:
          'Разработка и оптимизация моделей детекции и трекинга людей в реальном времени.',
        requirements: 'Python, OpenCV, опыт с детекторами и ONNX/TensorRT.',
        reward: 'от 260 000 ₽, гибридный формат.',
      },
      {
        title: 'Customer Success Manager',
        description:
          'Сопровождение сетевых клиентов: обучение, настройка отчётов, развитие аккаунтов.',
        requirements: 'Опыт работы с розничными сетями, аналитическое мышление.',
        reward: 'от 160 000 ₽ + бонусы за продление.',
      },
      {
        title: 'Data Engineer',
        description:
          'Построение хранилища событий с камер, обеспечение качества и доступности данных.',
        requirements: 'Kafka, ClickHouse, Python, опыт ETL от 2 лет.',
        reward: 'от 240 000 ₽, удалённо.',
        hidden: true,
      },
    ],
  },
  {
    title: 'TalentBridge',
    shortDescription: 'Ассистент найма для быстрорастущих команд.',
    description:
      'TalentBridge помогает техническим основателям проводить структурированные интервью и принимать решения на данных. Встроенные шаблоны и подсчёт сигналов снижают найм-ошибки.\n\nПродукт в разработке, собран первый круг пилотов.',
    stage: 'idea',
    ownerId: 'u-anna',
    logo: ['#A855F7', '#F97316'],
    daysOld: 38,
    vacancies: [
      {
        title: 'Fullstack Developer',
        description:
          'Разработка MVP под ключ: интерфейсы интервьюера, обработка записей, отчёты.',
        requirements: 'React, Node.js, PostgreSQL, готовность работать продуктово.',
        reward: 'от 200 000 ₽, опция на долю.',
      },
    ],
  },
  {
    title: 'SecureLayer',
    shortDescription: 'Защита API от ботов и парсинга на уровне шлюза.',
    description:
      'SecureLayer анализирует поведение клиентов на шлюзе и блокирует автоматизированные атаки без влияния на легитимный трафик. Внедрение занимает один день.\n\n160 команд используют сервис, мы готовим SOC-направление.',
    stage: 'mvp',
    ownerId: 'u-dmitry',
    logo: ['#1E293B', '#2563EB'],
    daysOld: 88,
    vacancies: [
      {
        title: 'Security Analyst',
        description:
          'Мониторинг атак, настройка правил детекции, разбор инцидентов клиентов.',
        requirements: 'Опыт в информационной безопасности, знание сетевых протоколов.',
        reward: 'от 210 000 ₽, сменный график частично.',
      },
      {
        title: 'DevOps Engineer',
        description:
          'Поддержка инфраструктуры шлюза, автоматизация развёртывания и мониторинга.',
        requirements: 'Kubernetes, Terraform, опыт highload-сервисов.',
        reward: 'от 250 000 ₽, удалённо.',
      },
    ],
  },
  {
    title: 'FoodLoop',
    shortDescription: 'Маркетплейс излишков еды из ресторанов.',
    description:
      'FoodLoop помогает заведениям продавать нереализованные блюда со скидкой вместо утилизации. Гость получает доступные позиции рядом и забирает заказ в удобное окно.\n\nЗапущены в двух городах, 70 партнёров. Ищем операционного лидера.',
    stage: 'mvp',
    ownerId: 'u-maria',
    logo: ['#22C55E', '#EAB308'],
    daysOld: 52,
    vacancies: [
      {
        title: 'Operations Lead',
        description:
          'Развитие партнёрской сети, запуск новых городов, контроль операционных метрик.',
        requirements: 'Опыт в маркетплейсах или HoReCa от 3 лет.',
        reward: 'от 190 000 ₽ + бонус за город.',
      },
    ],
  },
  {
    title: 'DataCraft',
    shortDescription: 'Конструктор внутренних дашбордов без кода.',
    description:
      'DataCraft позволяет командам собирать внутренние панели из готовых блоков и подключать любые источники данных. Версии и права доступа настраиваются без разработчика.\n\n400 команд в бете, готовим коммерческий запуск.',
    stage: 'scaling',
    ownerId: 'u-sergey',
    logo: ['#0891B2', '#4338CA'],
    daysOld: 150,
    vacancies: [
      {
        title: 'Backend Developer',
        description:
          'Развитие движка запросов и коннекторов к источникам данных.',
        requirements: 'Go или Python, SQL, опыт работы с аналитическими системами.',
        reward: 'от 240 000 ₽, удалённо.',
      },
      {
        title: 'Technical Writer',
        description:
          'Документация API и гайды по подключению источников данных.',
        requirements: 'Опыт технической документации, английский уровня C1.',
        reward: 'от 120 000 ₽, частичная занятость.',
      },
    ],
  },
];

const motivationSamples = [
  'Хочу применить опыт в продуктовой разработке и помочь команде выйти на новый рынок. Готов включиться с первых недель.',
  'Слежу за проектом несколько месяцев. Мне близка миссия и подход к решению задачи, есть релевантный опыт в похожей нише.',
  'Ищу проект с сильной командой и понятной проблемой пользователя. Готов обсуждать формат и зоны ответственности.',
  'Есть опыт запуска похожего продукта с нуля: от исследования до первых клиентов. Буду полезен на этапе роста.',
  'Интересна задача и технологический стек. Готов пройти тестовое задание и показать примеры прошлых проектов.',
];

const fileSamples = [
  { name: 'resume.pdf', size: 214_500 },
  { name: 'portfolio.pdf', size: 3_420_000 },
  { name: 'case-study.pdf', size: 1_180_000 },
];

export const buildSeedDatabase = (): MockDatabase => {
  const random = createRandom(20261020);

  const startups: DbStartup[] = [];
  const vacancies: DbVacancy[] = [];

  startupSeeds.forEach((seed, startupIndex) => {
    const startupId = `s-${startupIndex + 1}`;
    const createdAt = daysAgoIso(seed.daysOld, 9 + (startupIndex % 6), 12);

    startups.push({
      id: startupId,
      title: seed.title,
      logoUrl: buildLogoDataUri(
        seed.title.slice(0, 1).toUpperCase(),
        seed.logo[0],
        seed.logo[1],
      ),
      shortDescription: seed.shortDescription,
      description: seed.description,
      stage: seed.stage,
      ownerId: seed.ownerId,
      createdAt,
      updatedAt: daysAgoIso(randomInt(random, 0, 12), 11, randomInt(random, 0, 59)),
    });

    seed.vacancies.forEach((vacancySeed, vacancyIndex) => {
      vacancies.push({
        id: `v-${startupIndex + 1}-${vacancyIndex + 1}`,
        startupId,
        title: vacancySeed.title,
        description: vacancySeed.description,
        requirements: vacancySeed.requirements,
        reward: vacancySeed.reward,
        isHidden: vacancySeed.hidden ?? false,
        createdAt: daysAgoIso(seed.daysOld - vacancyIndex * 4 - 1, 10, 30),
        updatedAt: daysAgoIso(randomInt(random, 0, 18), 12, randomInt(random, 0, 59)),
      });
    });
  });

  const users = seedUsers;
  const otherUsers = users.filter((user) => user.id !== CURRENT_USER_ID);
  const applicantsPool = users.filter((user) => user.id !== 'u-anna' && user.id !== 'u-dmitry');

  const views: DbView[] = [];
  const applications: DbApplication[] = [];
  let applicationCounter = 0;

  vacancies.forEach((vacancy, vacancyIndex) => {
    const startup = startups.find((item) => item.id === vacancy.startupId);
    if (!startup) return;

    const viewCount = randomInt(random, 14, 46);
    for (let index = 0; index < viewCount; index += 1) {
      const viewer = pickOne(random, users);
      const daysAgo = randomInt(random, 0, 13);
      views.push({
        vacancyId: vacancy.id,
        userId: viewer.id,
        viewedAt: daysAgoIso(daysAgo, randomInt(random, 8, 20), randomInt(random, 0, 59)),
      });
    }

    const isOwnStartup = startup.ownerId === CURRENT_USER_ID;
    const applicationCount = isOwnStartup ? randomInt(random, 2, 7) : randomInt(random, 1, 4);

    const candidates = isOwnStartup ? applicantsPool : otherUsers;

    for (let index = 0; index < applicationCount; index += 1) {
      const applicant = candidates[(index + vacancyIndex) % candidates.length];
      if (applicant.id === startup.ownerId) continue;

      applicationCounter += 1;
      const statusRoll = random();
      const status = statusRoll > 0.68 ? 'approved' : statusRoll > 0.42 ? 'pending' : 'rejected';
      const filesCount = randomInt(random, 0, 2);

      applications.push({
        id: `a-${applicationCounter}`,
        vacancyId: vacancy.id,
        applicantId: applicant.id,
        motivation: pickOne(random, motivationSamples),
        files: Array.from({ length: filesCount }, (_, fileIndex) => {
          const sample = fileSamples[(fileIndex + vacancyIndex) % fileSamples.length];
          return {
            id: `f-${applicationCounter}-${fileIndex}`,
            name: sample.name,
            size: sample.size,
            url: null,
          };
        }),
        status,
        createdAt: daysAgoIso(randomInt(random, 0, 12), randomInt(random, 9, 19), randomInt(random, 0, 59)),
      });
    }
  });

  const myVacancies = vacancies.filter((vacancy) => {
    const startup = startups.find((item) => item.id === vacancy.startupId);
    return startup?.ownerId === CURRENT_USER_ID;
  });

  const myApplicationsTargets = [
    { vacancy: vacancies[0], status: 'pending' as const },
    { vacancy: vacancies[2], status: 'approved' as const },
    { vacancy: vacancies[5], status: 'pending' as const },
    { vacancy: vacancies[8], status: 'rejected' as const },
    { vacancy: vacancies[11], status: 'pending' as const },
    { vacancy: vacancies[15], status: 'pending' as const },
  ];

  myApplicationsTargets.forEach((target, index) => {
    if (!target.vacancy) return;
    if (myVacancies.some((vacancy) => vacancy.id === target.vacancy.id)) return;

    applicationCounter += 1;
    applications.push({
      id: `a-${applicationCounter}`,
      vacancyId: target.vacancy.id,
      applicantId: CURRENT_USER_ID,
      motivation: motivationSamples[index % motivationSamples.length],
      files: index % 2 === 0 ? [
        {
          id: `f-${applicationCounter}-0`,
          name: 'resume.pdf',
          size: 214_500,
          url: null,
        },
      ] : [],
      status: target.status,
      createdAt: daysAgoIso(index + 1, 10, 15),
    });
  });

  const seenViewKeys = new Set<string>();
  const uniqueViews = views.filter((view) => {
    const key = `${view.vacancyId}:${view.userId}:${view.viewedAt.slice(0, 10)}`;
    if (seenViewKeys.has(key)) return false;
    seenViewKeys.add(key);
    return true;
  });

  const templates: VacancyTemplate[] = [
    {
      id: 'tpl-frontend',
      title: 'Frontend Developer',
      description: 'Разработка пользовательских интерфейсов продукта: от макета до продакшена.',
      requirements: 'React, TypeScript, опыт от 1 года, понимание REST API.',
      reward: 'от 180 000 ₽, удалённый формат.',
    },
    {
      id: 'tpl-backend',
      title: 'Backend Developer',
      description: 'Развитие серверной части продукта, проектирование API и работа с данными.',
      requirements: 'Python или Go, PostgreSQL, опыт от 2 лет, понимание принципов масштабирования.',
      reward: 'от 220 000 ₽, гибкий график.',
    },
    {
      id: 'tpl-designer',
      title: 'Product Designer',
      description: 'Проектирование пользовательских сценариев и интерфейсов совместно с командой.',
      requirements: 'Портфолио, Figma, опыт проведения исследований.',
      reward: 'от 160 000 ₽, оформление по ТК.',
    },
    {
      id: 'tpl-analyst',
      title: 'Product Analyst',
      description: 'Построение метрик продукта, анализ воронок и подготовка решений на данных.',
      requirements: 'SQL, Python, опыт продуктовой аналитики.',
      reward: 'от 190 000 ₽, гибридный формат.',
    },
    {
      id: 'tpl-sales',
      title: 'Sales Manager',
      description: 'Поиск и развитие клиентов, работа с воронкой продаж и демонстрациями продукта.',
      requirements: 'Опыт B2B-продаж от 2 лет, сильные коммуникативные навыки.',
      reward: 'оклад от 120 000 ₽ + бонусы.',
    },
  ];

  return {
    version: 1,
    currentUserId: CURRENT_USER_ID,
    users,
    startups,
    vacancies,
    applications,
    views: uniqueViews,
    templates,
    // Seeded applications reference demo file names only; no storage object
    // exists for them, which the UI shows as a non-downloadable chip.
    files: [],
  };
};

export const findUser = (users: DbUser[], id: string): DbUser => {
  const user = users.find((item) => item.id === id);
  if (!user) {
    throw new Error('Пользователь не найден');
  }
  return user;
};
