import bcrypt from 'bcrypt';
import { pathToFileURL } from 'url';
import { initDb } from './database.js';

/**
 * Допоміжна функція для формування ISO-дати зі зміщенням у днях/годинах.
 */
function shiftDate({ days = 0, hours = 0, fixedHour = null, fixedMinute = 0 }) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  if (fixedHour !== null) {
    date.setHours(fixedHour, fixedMinute, 0, 0);
  } else {
    date.setHours(date.getHours() + hours);
  }
  return date.toISOString();
}

function shiftDateOnly(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Наповнює базу даних демонстраційними записами:
 * 1 користувач, 5 сфер, 7 курсів, 26 завдань і розклад занять.
 */
export async function seedDatabase(db, { force = false } = {}) {
  const existingUser = db.prepare('SELECT id FROM users LIMIT 1').get();
  if (existingUser && !force) {
    return { seeded: false, reason: 'already_populated' };
  }

  if (force) {
    db.exec('DELETE FROM events; DELETE FROM tasks; DELETE FROM courses; DELETE FROM areas; DELETE FROM users;');
  }

  const passwordHash = await bcrypt.hash('DemoStudy2026!', 10);

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
  );
  const userResult = insertUser.run(
    'Олена Коваленко',
    'olena.kovalenko@study.ua',
    passwordHash
  );
  const userId = Number(userResult.lastInsertRowid);

  // 5 життєвих і навчальних сфер
  const insertArea = db.prepare(
    'INSERT INTO areas (user_id, name, color, icon) VALUES (?, ?, ?, ?)'
  );

  const areasData = [
    { name: 'Коледж', color: '#2563EB', icon: 'GraduationCap' },
    { name: 'FullStack-курси', color: '#7C3AED', icon: 'Code2' },
    { name: 'Німецька мова', color: '#0D9488', icon: 'Languages' },
    { name: 'Робота', color: '#8B5A2B', icon: 'Briefcase' },
    { name: 'Спорт', color: '#D946EF', icon: 'Dumbbell' },
  ];

  const areaIds = {};
  for (const area of areasData) {
    const res = insertArea.run(userId, area.name, area.color, area.icon);
    areaIds[area.name] = Number(res.lastInsertRowid);
  }

  // 7 курсів та проєктів
  const insertCourse = db.prepare(
    'INSERT INTO courses (user_id, area_id, title, description, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const coursesData = [
    {
      key: 'algo',
      area: 'Коледж',
      title: 'Алгоритми та структури даних',
      description: 'Практикум із графів, динамічного програмування та підготовка до іспиту.',
      start_date: shiftDateOnly(-45),
      end_date: shiftDateOnly(30),
    },
    {
      key: 'coursework',
      area: 'Коледж',
      title: 'Курсовий проєкт: Вебпланувальник',
      description: 'Розробка full-stack застосунку на React, Express та SQLite із захистом.',
      start_date: shiftDateOnly(-30),
      end_date: shiftDateOnly(14),
    },
    {
      key: 'fullstack',
      area: 'FullStack-курси',
      title: 'React + Node.js Інтенсив',
      description: 'Модулі з REST API, JWT-авторизації, тестування та оптимізації інтерфейсу.',
      start_date: shiftDateOnly(-40),
      end_date: shiftDateOnly(25),
    },
    {
      key: 'ts',
      area: 'FullStack-курси',
      title: 'Архітектура баз даних SQL',
      description: 'Нормалізація схем, індекси, транзакції та міграції в SQLite/PostgreSQL.',
      start_date: shiftDateOnly(-25),
      end_date: shiftDateOnly(20),
    },
    {
      key: 'german',
      area: 'Німецька мова',
      title: 'Німецька мова: рівень B1.2',
      description: 'Граматика Konjunktiv II, аудіювання та розмовний клуб двічі на тиждень.',
      start_date: shiftDateOnly(-60),
      end_date: shiftDateOnly(45),
    },
    {
      key: 'work',
      area: 'Робота',
      title: 'Робочі спринти (Junior Dev & Бариста)',
      description: 'Поєднання часткової зайнятості у вебстудії та ранкових змін у кавʼярні.',
      start_date: shiftDateOnly(-30),
      end_date: shiftDateOnly(60),
    },
    {
      key: 'sport',
      area: 'Спорт',
      title: 'Функціональний тренінг і біг',
      description: 'Три силові тренування в залі та дві ранкові пробіжки щотижня.',
      start_date: shiftDateOnly(-30),
      end_date: shiftDateOnly(90),
    },
  ];

  const courseIds = {};
  for (const c of coursesData) {
    const res = insertCourse.run(
      userId,
      areaIds[c.area],
      c.title,
      c.description,
      c.start_date,
      c.end_date
    );
    courseIds[c.key] = Number(res.lastInsertRowid);
  }

  // 26 завдань з різними дедлайнами, статусами та пріоритетами
  const insertTask = db.prepare(`
    INSERT INTO tasks (user_id, course_id, title, description, deadline, priority, status, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tasksData = [
    // Прострочені завдання (deadline у минулому, status != 'done')
    {
      course: 'algo',
      title: 'Лабораторна №4: Алгоритм Дейкстри',
      description: 'Оформити звіт та додати тести на граничні випадки графа.',
      deadline: shiftDate({ days: -2, fixedHour: 18, fixedMinute: 0 }),
      priority: 'high',
      status: 'in_progress',
      completed_at: null,
    },
    {
      course: 'german',
      title: 'Вивчити 40 слів з теми «Beruf & Alltag»',
      description: 'Повторити картки та скласти 8 речень із новими дієсловами.',
      deadline: shiftDate({ days: -1, fixedHour: 20, fixedMinute: 0 }),
      priority: 'medium',
      status: 'todo',
      completed_at: null,
    },

    // Дедлайни протягом 24 годин (для сповіщень)
    {
      course: 'coursework',
      title: 'Фіналізувати REST API та валідацію Yup',
      description: 'Перевірити коди помилок 400/401/403 і підготувати Swagger-опис у README.',
      deadline: shiftDate({ hours: 6 }),
      priority: 'high',
      status: 'in_progress',
      completed_at: null,
    },
    {
      course: 'work',
      title: 'Закрити тикет верстки адаптивного меню',
      description: 'Перевірити брейкпоїнти на планшеті та телефоні перед дейлі.',
      deadline: shiftDate({ hours: 18 }),
      priority: 'high',
      status: 'todo',
      completed_at: null,
    },

    // Найближчі 3 дні
    {
      course: 'fullstack',
      title: 'Налаштувати інтеграційні тести supertest',
      description: 'Покрити реєстрацію, логін і створення завдань без токена.',
      deadline: shiftDate({ days: 1, fixedHour: 21, fixedMinute: 0 }),
      priority: 'high',
      status: 'todo',
      completed_at: null,
    },
    {
      course: 'german',
      title: 'Написати есе «Mein perfekter Arbeitstag»',
      description: 'Обсяг 180–220 слів, використати складнопідрядні речення з obwohl.',
      deadline: shiftDate({ days: 2, fixedHour: 19, fixedMinute: 0 }),
      priority: 'medium',
      status: 'in_progress',
      completed_at: null,
    },
    {
      course: 'sport',
      title: 'Пробіжка 5 км у легкому темпі',
      description: 'Розминка 10 хв, контроль пульсу в зоні 2, заминка.',
      deadline: shiftDate({ days: 2, fixedHour: 8, fixedMinute: 30 }),
      priority: 'low',
      status: 'todo',
      completed_at: null,
    },
    {
      course: 'ts',
      title: 'Скласти ER-діаграму для інтернет-бібліотеки',
      description: 'Додати звʼязки many-to-many та каскадні правила.',
      deadline: shiftDate({ days: 3, fixedHour: 17, fixedMinute: 0 }),
      priority: 'medium',
      status: 'todo',
      completed_at: null,
    },

    // Майбутні завдання (4–10 днів)
    {
      course: 'coursework',
      title: 'Підготувати презентацію до захисту курсової',
      description: '10 слайдів: актуальність, архітектура, скриншоти, результати тестів.',
      deadline: shiftDate({ days: 5, fixedHour: 16, fixedMinute: 0 }),
      priority: 'high',
      status: 'todo',
      completed_at: null,
    },
    {
      course: 'algo',
      title: 'Розвʼязати 6 задач на динамічне програмування',
      description: 'Задача про рюкзак, НЗП та шляхи в сітці.',
      deadline: shiftDate({ days: 6, fixedHour: 20, fixedMinute: 0 }),
      priority: 'medium',
      status: 'in_progress',
      completed_at: null,
    },
    {
      course: 'work',
      title: 'Оновити графік змін у кавʼярні на грудень',
      description: 'Узгодити ранкові зміни з парами в коледжі.',
      deadline: shiftDate({ days: 4, fixedHour: 14, fixedMinute: 0 }),
      priority: 'medium',
      status: 'todo',
      completed_at: null,
    },
    {
      course: 'fullstack',
      title: 'Оптимізувати Recharts графіки під мобільний екран',
      description: 'Винести підказки Tooltip і перевірити читабельність легенди.',
      deadline: shiftDate({ days: 7, fixedHour: 19, fixedMinute: 0 }),
      priority: 'low',
      status: 'todo',
      completed_at: null,
    },
    {
      course: 'sport',
      title: 'Силове тренування: спина та плечі',
      description: '4 підходи підтягувань, тяга гантелей і планка 3×60 сек.',
      deadline: shiftDate({ days: 4, fixedHour: 18, fixedMinute: 30 }),
      priority: 'medium',
      status: 'todo',
      completed_at: null,
    },

    // Виконані завдання за останні 4 тижні (для статистики по тижнях і % курсів)
    {
      course: 'algo',
      title: 'Лабораторна №1: Бінарний пошук і сортування',
      description: 'Реалізація QuickSort та MergeSort із заміром часу.',
      deadline: shiftDate({ days: -24, fixedHour: 18, fixedMinute: 0 }),
      priority: 'high',
      status: 'done',
      completed_at: shiftDate({ days: -25, fixedHour: 16, fixedMinute: 30 }),
    },
    {
      course: 'algo',
      title: 'Лабораторна №2: Стек, черга та звʼязний список',
      description: 'Базові структури даних на JavaScript.',
      deadline: shiftDate({ days: -17, fixedHour: 18, fixedMinute: 0 }),
      priority: 'medium',
      status: 'done',
      completed_at: shiftDate({ days: -18, fixedHour: 14, fixedMinute: 20 }),
    },
    {
      course: 'algo',
      title: 'Лабораторна №3: Бінарні дерева пошуку',
      description: 'Обходи DFS і BFS.',
      deadline: shiftDate({ days: -10, fixedHour: 18, fixedMinute: 0 }),
      priority: 'medium',
      status: 'done',
      completed_at: shiftDate({ days: -11, fixedHour: 19, fixedMinute: 0 }),
    },
    {
      course: 'coursework',
      title: 'Спроєктувати схему бази даних SQLite',
      description: 'Описати 5 таблиць і звʼязки ON DELETE CASCADE.',
      deadline: shiftDate({ days: -20, fixedHour: 20, fixedMinute: 0 }),
      priority: 'high',
      status: 'done',
      completed_at: shiftDate({ days: -22, fixedHour: 17, fixedMinute: 0 }),
    },
    {
      course: 'coursework',
      title: 'Реалізувати JWT-аутентифікацію та bcrypt',
      description: 'Реєстрація, вхід і middleware перевірки токена.',
      deadline: shiftDate({ days: -12, fixedHour: 20, fixedMinute: 0 }),
      priority: 'high',
      status: 'done',
      completed_at: shiftDate({ days: -13, fixedHour: 21, fixedMinute: 15 }),
    },
    {
      course: 'coursework',
      title: 'Створити модуль розрахунку прогресу',
      description: 'Покрити unit-тестами у Jest.',
      deadline: shiftDate({ days: -4, fixedHour: 20, fixedMinute: 0 }),
      priority: 'high',
      status: 'done',
      completed_at: shiftDate({ days: -5, fixedHour: 18, fixedMinute: 40 }),
    },
    {
      course: 'fullstack',
      title: 'Зібрати компоненти форм із Formik + Yup',
      description: 'Валідація полів українською мовою.',
      deadline: shiftDate({ days: -14, fixedHour: 19, fixedMinute: 0 }),
      priority: 'medium',
      status: 'done',
      completed_at: shiftDate({ days: -15, fixedHour: 15, fixedMinute: 10 }),
    },
    {
      course: 'fullstack',
      title: 'Налаштувати маршрутизацію React Router',
      description: 'Приватні маршрути та адаптивний сайдбар.',
      deadline: shiftDate({ days: -7, fixedHour: 19, fixedMinute: 0 }),
      priority: 'medium',
      status: 'done',
      completed_at: shiftDate({ days: -8, fixedHour: 20, fixedMinute: 5 }),
    },
    {
      course: 'ts',
      title: 'Практика: JOIN-запити та агрегації',
      description: 'Підрахунок групової статистики одним SQL-запитом.',
      deadline: shiftDate({ days: -9, fixedHour: 18, fixedMinute: 0 }),
      priority: 'medium',
      status: 'done',
      completed_at: shiftDate({ days: -9, fixedHour: 17, fixedMinute: 30 }),
    },
    {
      course: 'german',
      title: 'Граматичний тест: Passiv Präsens і Präteritum',
      description: 'Виконати 30 речень у робочому зошиті.',
      deadline: shiftDate({ days: -16, fixedHour: 20, fixedMinute: 0 }),
      priority: 'medium',
      status: 'done',
      completed_at: shiftDate({ days: -16, fixedHour: 19, fixedMinute: 45 }),
    },
    {
      course: 'german',
      title: 'Подкаст «Slow German» — конспект випуску #12',
      description: 'Виписати 15 сталих виразів.',
      deadline: shiftDate({ days: -3, fixedHour: 20, fixedMinute: 0 }),
      priority: 'low',
      status: 'done',
      completed_at: shiftDate({ days: -3, fixedHour: 18, fixedMinute: 10 }),
    },
    {
      course: 'work',
      title: 'Код-ревʼю форми зворотного звʼязку',
      description: 'Виправити доступність кнопок та контраст у темній темі.',
      deadline: shiftDate({ days: -2, fixedHour: 17, fixedMinute: 0 }),
      priority: 'high',
      status: 'done',
      completed_at: shiftDate({ days: -2, fixedHour: 15, fixedMinute: 20 }),
    },
    {
      course: 'sport',
      title: 'Ранкове кардіо та розтяжка 45 хв',
      description: 'Інтервальний біг на стадіоні.',
      deadline: shiftDate({ days: -1, fixedHour: 9, fixedMinute: 0 }),
      priority: 'low',
      status: 'done',
      completed_at: shiftDate({ days: -1, fixedHour: 8, fixedMinute: 50 }),
    },
  ];

  for (const t of tasksData) {
    insertTask.run(
      userId,
      courseIds[t.course],
      t.title,
      t.description,
      t.deadline,
      t.priority,
      t.status,
      t.completed_at
    );
  }

  // Заняття за розкладом (events)
  const insertEvent = db.prepare(`
    INSERT INTO events (user_id, course_id, title, start_datetime, end_datetime, recurrence)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const eventsData = [
    {
      course: 'algo',
      title: 'Лекція: Алгоритми на графах',
      start: shiftDate({ days: 0, fixedHour: 10, fixedMinute: 0 }),
      end: shiftDate({ days: 0, fixedHour: 11, fixedMinute: 30 }),
      recurrence: 'weekly',
    },
    {
      course: 'german',
      title: 'Розмовний клуб з німецької B1.2',
      start: shiftDate({ days: 0, fixedHour: 17, fixedMinute: 30 }),
      end: shiftDate({ days: 0, fixedHour: 19, fixedMinute: 0 }),
      recurrence: 'weekly',
    },
    {
      course: 'sport',
      title: 'Тренування в спортзалі',
      start: shiftDate({ days: 0, fixedHour: 19, fixedMinute: 30 }),
      end: shiftDate({ days: 0, fixedHour: 20, fixedMinute: 45 }),
      recurrence: 'weekly',
    },
    {
      course: 'work',
      title: 'Ранкова зміна у кавʼярні',
      start: shiftDate({ days: 1, fixedHour: 8, fixedMinute: 0 }),
      end: shiftDate({ days: 1, fixedHour: 13, fixedMinute: 0 }),
      recurrence: 'weekly',
    },
    {
      course: 'fullstack',
      title: 'Вебінар: Тестування React-додатків',
      start: shiftDate({ days: 1, fixedHour: 18, fixedMinute: 30 }),
      end: shiftDate({ days: 1, fixedHour: 20, fixedMinute: 30 }),
      recurrence: 'weekly',
    },
    {
      course: 'coursework',
      title: 'Консультація з керівником курсової',
      start: shiftDate({ days: 2, fixedHour: 14, fixedMinute: 0 }),
      end: shiftDate({ days: 2, fixedHour: 15, fixedMinute: 0 }),
      recurrence: 'none',
    },
    {
      course: 'ts',
      title: 'Практикум із запитів SQLite',
      start: shiftDate({ days: 3, fixedHour: 16, fixedMinute: 0 }),
      end: shiftDate({ days: 3, fixedHour: 17, fixedMinute: 30 }),
      recurrence: 'none',
    },
  ];

  for (const ev of eventsData) {
    insertEvent.run(
      userId,
      courseIds[ev.course],
      ev.title,
      ev.start,
      ev.end,
      ev.recurrence
    );
  }

  return { seeded: true, userId, email: 'olena.kovalenko@study.ua' };
}

// Можливість запуску seed-скрипта напряму з термінала: node server/db/seed.js
const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const db = initDb();
  seedDatabase(db, { force: true })
    .then((result) => {
      console.log('Демонстраційні дані успішно завантажено:', result);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Помилка під час виконання seed-скрипта:', err);
      process.exit(1);
    });
}
