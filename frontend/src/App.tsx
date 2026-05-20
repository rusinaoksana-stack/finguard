import { FormEvent, useEffect, useMemo, useState } from "react";
import heroImage from "./assets/finguard-hero-green.png";
import { useAuth } from "./hooks/useAuth";
import { useSocket } from "./hooks/useSocket";
import {
  fetchAccounts,
  fetchTransactions,
  fetchDisputes,
  createDispute,
  updateDisputeStatus as saveDisputeStatus,
} from "./services/api";

type TransactionStatus = "pending" | "completed" | "review";
type DisputeStatus = "open" | "resolved" | "escalated";

type Transaction = {
  id: string;
  accountId?: string;
  accountNumber?: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  createdAt: string;
  description: string;
};

type Dispute = {
  id: string;
  transactionId: string;
  accountNumber?: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
};

type BankAccount = {
  id: string;
  accountNumber: string;
  balance: number;
  currency: string;
  status: "active" | "frozen" | "closed";
  createdAt: string;
};

const demoAccounts: BankAccount[] = [
  {
    id: "acc_demo",
    accountNumber: "FG-10293847",
    balance: 2450.8,
    currency: "EUR",
    status: "active",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
  },
];

const demoTransactions: Transaction[] = [
  {
    id: "txn_001",
    accountId: "acc_demo",
    accountNumber: "FG-10293847",
    amount: 48.75,
    currency: "EUR",
    status: "review",
    createdAt: new Date().toISOString(),
    description: "Refund request for duplicate charge",
  },
  {
    id: "txn_002",
    accountId: "acc_demo",
    accountNumber: "FG-10293847",
    amount: 12.5,
    currency: "EUR",
    status: "completed",
    createdAt: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
    description: "Merchant settlement",
  },
  {
    id: "txn_003",
    accountId: "acc_demo",
    accountNumber: "FG-10293847",
    amount: 734.2,
    currency: "EUR",
    status: "pending",
    createdAt: new Date(Date.now() - 1000 * 60 * 94).toISOString(),
    description: "Cross-border wallet transfer",
  },
];

const demoDisputes: Dispute[] = [
  {
    id: "disp_001",
    transactionId: "txn_001",
    accountNumber: "FG-10293847",
    reason: "Duplicate payment",
    status: "open",
    createdAt: new Date().toISOString(),
  },
  {
    id: "disp_002",
    transactionId: "txn_003",
    accountNumber: "FG-10293847",
    reason: "Unusual transfer pattern",
    status: "escalated",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
];

const statusStyles: Record<TransactionStatus | DisputeStatus, string> = {
  completed: "border-[#AEC3B0] bg-[#E3EED4] text-[#375534]",
  pending: "border-[#AEC3B0] bg-white text-[#375534]",
  review: "border-[#6B9071] bg-[#E3EED4] text-[#0F2A1D]",
  open: "border-[#6B9071] bg-[#E3EED4] text-[#0F2A1D]",
  resolved: "border-[#AEC3B0] bg-[#E3EED4] text-[#375534]",
  escalated: "border-[#375534] bg-[#AEC3B0] text-[#0F2A1D]",
};

const benefits = [
  {
    title: "Smart fraud checks",
    text: "Review suspicious card and account activity before it turns into a formal dispute.",
  },
  {
    title: "Dispute evidence in one place",
    text: "Bring customer notes, merchant signals, and transaction history into a clear case view.",
  },
  {
    title: "Compliance-ready audit trail",
    text: "Keep decisions, recommendations, and status changes ready for internal review.",
  },
];

const quickLinks = ["Current account protection", "Card dispute support", "Transaction monitoring", "AI case review"];

const accountCards = [
  {
    title: "Everyday Current Account",
    text: "Manage daily payments, transfers, and account activity with built-in AI monitoring.",
    action: "Explore account",
  },
  {
    title: "Secure Digital Card",
    text: "Track card spending, flag unusual purchases, and prepare dispute evidence faster.",
    action: "View card tools",
  },
  {
    title: "Family Banking Support",
    text: "Keep shared payments visible with helpful alerts and simple review workflows.",
    action: "Learn more",
  },
];

const serviceTiles = [
  "Open an account",
  "Report a payment issue",
  "Check transaction status",
  "Review card activity",
  "Download statements",
  "Contact support",
];

const faqItems = [
  {
    question: "Can FinGuard work without the backend running?",
    answer:
      "Yes. The frontend keeps a demo mode available, so login, registration, dashboard cards, transactions, and disputes can still be reviewed while the API is offline.",
  },
  {
    question: "How does the AI recommendation fit into the review process?",
    answer:
      "AI recommendations are shown as decision support. A reviewer can check the customer history, transaction details, and dispute context before taking any final action.",
  },
  {
    question: "Can teams export transaction and dispute evidence?",
    answer:
      "The interface is prepared for export workflows, including transaction history, case notes, status changes, and evidence summaries for internal review.",
  },
];

type AuthMode = "login" | "register";
type TransactionFilter = "all" | TransactionStatus;
type Language = "en" | "uk" | "ru" | "es" | "it";
type ToastTone = "success" | "info" | "warning";

type AuthFormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const initialAuthForm: AuthFormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const initialDisputeForm = {
  transactionId: "",
  reason: "",
};

const LANGUAGE_KEY = "finguard_language";

const languageLabels: Record<Language, string> = {
  en: "EN",
  uk: "UA",
  ru: "RU",
  es: "ES",
  it: "IT",
};

const content = {
  en: {
    topNav: ["Personal", "Business", "Support"],
    help: "Help centre",
    contact: "Contact info",
    tagline: "Secure banking intelligence",
    signedIn: "Signed in as",
    publicNav: {
      personal: "Personal",
      business: "Business",
      kids: "Kids & Teens",
      company: "Company",
    },
    nav: {
      accounts: "Accounts",
      features: "Features",
      benefits: "Benefits",
      dashboard: "Demo dashboard",
      cabinet: "My cabinet",
      support: "Support",
    },
    auth: {
      login: "Log in",
      register: "Register",
      createAccount: "Create account",
      secureAccess: "Secure access",
      newAccount: "New account",
      loginTitle: "Log in to FinGuard",
      registerTitle: "Create your account",
      fullName: "Full name",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm password",
      minPassword: "Minimum 6 characters",
      repeatPassword: "Repeat password",
      missingCredentials: "Please enter your email and password.",
      missingName: "Please enter your full name.",
      shortPassword: "Password must be at least 6 characters.",
      mismatch: "Passwords do not match.",
    },
    profile: {
      accountOverview: "Account overview",
      settings: "Settings",
      signOut: "Sign out",
      profileSecurity: "Profile and security",
      notifications: "Notifications",
      riskAlerts: "Risk alerts",
      riskAlertsText: "Receive alerts when transactions move into review.",
      monthlySummary: "Monthly summary",
      monthlySummaryText: "Send a monthly account protection report.",
      securityChecks: "Security checks",
      securityChecksText: "Require extra verification for sensitive actions.",
      name: "Name",
      email: "Email",
      role: "Role",
      accounts: "Accounts",
      note: "These preferences are saved for this browser session and are ready for backend persistence.",
      backToCabinet: "Back to cabinet",
      notAvailable: "Not available",
    },
    statusLabels: {
      pending: "Pending",
      completed: "Completed",
      review: "Review",
      open: "Open",
      resolved: "Resolved",
      escalated: "Escalated",
      active: "Active",
      frozen: "Frozen",
      closed: "Closed",
    },
    hero: {
      breadcrumb: "Home / Accounts / Protection",
      title: "Automated dispute protection for modern banking",
      text:
        "FinGuard helps digital banking teams spot risky activity, manage disputes, and prepare evidence with clear, confident workflows.",
      startDemo: "Start demo",
      viewFeatures: "View features",
    },
    cabinet: {
      kicker: "My banking cabinet",
      titleSuffix: "'s account overview",
      text: "Your bank accounts, recent transactions, and payment review cases are loaded from PostgreSQL.",
      loading: "Loading account data",
      bankAccounts: "Bank accounts",
      currentAccount: "Current account",
      availableBalance: "Available balance",
      noAccounts: "No bank accounts were found for this user.",
      recentTransactions: "Recent transactions",
      viewAll: "View all",
      noTransactions: "No transactions yet.",
      reviewCases: "Review cases",
      open: "open",
    },
    accountsSection: {
      kicker: "Banking made clearer",
      title: "Accounts and card services with protection built in",
      text: "A React-powered banking experience for customers who want simple account tools and smart protection in one place.",
    },
    featuresSection: {
      kicker: "Features and benefits",
      title: "Designed for modern banking protection",
      text:
        "A calm, practical experience for teams who need fast answers, consistent decisions, and a complete view of each customer case.",
    },
    popular: {
      kicker: "Popular services",
      title: "What would you like to do today?",
    },
    cta: {
      kicker: "Why teams choose it",
      title: "Less manual checking. More time for the cases that matter.",
    },
    app: {
      quickActions: "Quick actions",
      addMoney: "Add money",
      transfer: "Transfer",
      cards: "Cards",
      analytics: "Analytics",
      mainAccount: "Main account",
      virtualCard: "Virtual card",
      cardReady: "Ready for secure online payments",
      spending: "Spending",
      thisMonth: "This month",
      protection: "Protection",
      protected: "Protected",
    },
    dashboard: {
      demoKicker: "Demo dashboard",
      userKicker: "User cabinet",
      demoTitle: "Account activity under review",
      userTitleSuffix: "'s banking overview",
      demoText: "Log in to open the customer cabinet with account, transaction, and dispute data.",
      userText: "Review your bank accounts, recent transactions, and payment disputes in one secure workspace.",
      syncing: "Syncing",
      activeRecords: "active record(s)",
      opened: "Opened",
      transactions: "Transactions",
      transactionsHelp: "Search and filter account activity.",
      searchPlaceholder: "Search by transaction, status, or ID",
      transaction: "Transaction",
      time: "Time",
      amount: "Amount",
      status: "Status",
      noMatches: "No transactions match this search.",
      loginPrompt: "Log in to open your cabinet",
      loginPromptText:
        "The cabinet connects to PostgreSQL and shows bank accounts, transactions, and dispute cases for the signed-in user.",
      sessionSecure: "Secure session",
      databaseConnected: "Database connected",
      apiReady: "API ready",
    },
    toast: {
      dismiss: "Dismiss",
      exportTitle: "Export ready",
      exportMessage: "Evidence CSV has been downloaded.",
      supportTitle: "Support opened",
      supportMessage: "Support questions are ready below.",
      actionTitle: "Action selected",
      statusTitle: "Status updated",
      demoStatusTitle: "Demo status updated",
      loginTitle: "Welcome back",
      registerTitle: "Account created",
    },
    disputes: {
      title: "Dispute support",
      text: "Open a case to review evidence and update status.",
      export: "Export",
      create: "Create review case",
      transaction: "Transaction",
      choose: "Choose transaction",
      reason: "Reason",
      reasonPlaceholder: "Duplicate payment, unknown merchant...",
      createButton: "Create case",
      selected: "Selected case",
      account: "Account",
      currentStatus: "Current status",
      chooseError: "Choose a transaction and enter a short reason.",
      duplicateError: "This transaction already has a review case.",
      created: "New review case created",
      demoCreated: "Review case created in demo mode",
      noCases: "No dispute cases yet.",
      openButton: "Open",
      escalateButton: "Escalate",
      resolveButton: "Resolve",
    },
    support: {
      kicker: "Need help?",
      title: "Clear answers for every case",
    },
    footer: {
      text: "A React banking frontend for secure account monitoring, dispute support, and customer protection.",
      banking: "Banking",
      support: "Support",
      currentAccounts: "Current accounts",
      cards: "Cards",
      payments: "Payments",
      helpCentre: "Help centre",
      security: "Security",
      contact: "Contact",
      email: "support@finguard.app",
    },
    benefits,
    quickLinks,
    accountCards,
    serviceTiles,
    faqItems,
  },
  uk: {
    topNav: ["Приватним клієнтам", "Бізнесу", "Підтримка"],
    help: "Центр допомоги",
    contact: "Контактна інформація",
    tagline: "Безпечна банківська аналітика",
    signedIn: "Вхід виконано як",
    publicNav: {
      personal: "Приватним клієнтам",
      business: "Бізнесу",
      kids: "Дітям і підліткам",
      company: "Компанія",
    },
    nav: {
      accounts: "Акаунти",
      features: "Можливості",
      benefits: "Переваги",
      dashboard: "Демо-панель",
      cabinet: "Мій кабінет",
      support: "Підтримка",
    },
    auth: {
      login: "Увійти",
      register: "Реєстрація",
      createAccount: "Створити акаунт",
      secureAccess: "Безпечний доступ",
      newAccount: "Новий акаунт",
      loginTitle: "Увійти у FinGuard",
      registerTitle: "Створити акаунт",
      fullName: "Повне імʼя",
      email: "Email",
      password: "Пароль",
      confirmPassword: "Підтвердіть пароль",
      minPassword: "Мінімум 6 символів",
      repeatPassword: "Повторіть пароль",
      missingCredentials: "Введіть email і пароль.",
      missingName: "Введіть повне імʼя.",
      shortPassword: "Пароль має містити щонайменше 6 символів.",
      mismatch: "Паролі не збігаються.",
    },
    profile: {
      accountOverview: "Огляд акаунта",
      settings: "Налаштування",
      signOut: "Вийти",
      profileSecurity: "Профіль і безпека",
      notifications: "Сповіщення",
      riskAlerts: "Ризикові операції",
      riskAlertsText: "Отримувати сповіщення, коли транзакції переходять на перевірку.",
      monthlySummary: "Місячний звіт",
      monthlySummaryText: "Надсилати щомісячний звіт із захисту акаунта.",
      securityChecks: "Перевірки безпеки",
      securityChecksText: "Вимагати додаткову перевірку для важливих дій.",
      name: "Імʼя",
      email: "Email",
      role: "Роль",
      accounts: "Акаунти",
      note: "Ці налаштування зберігаються для поточної сесії браузера та готові до збереження на backend.",
      backToCabinet: "До кабінету",
      notAvailable: "Недоступно",
    },
    statusLabels: {
      pending: "Очікує",
      completed: "Завершено",
      review: "Перевірка",
      open: "Відкрита",
      resolved: "Закрита",
      escalated: "Ескальована",
      active: "Активний",
      frozen: "Заморожений",
      closed: "Закритий",
    },
    hero: {
      breadcrumb: "Головна / Акаунти / Захист",
      title: "Автоматизований захист спорів для сучасного банкінгу",
      text:
        "FinGuard допомагає банківським командам виявляти ризикову активність, керувати заявками та готувати докази в зрозумілому робочому процесі.",
      startDemo: "Запустити демо",
      viewFeatures: "Переглянути можливості",
    },
    cabinet: {
      kicker: "Мій банківський кабінет",
      titleSuffix: ": огляд акаунта",
      text: "Банківські акаунти, останні транзакції та заявки на перевірку завантажуються з PostgreSQL.",
      loading: "Завантаження даних",
      bankAccounts: "Банківські акаунти",
      currentAccount: "Поточний акаунт",
      availableBalance: "Доступний баланс",
      noAccounts: "Для цього користувача не знайдено банківських акаунтів.",
      recentTransactions: "Останні транзакції",
      viewAll: "Дивитися всі",
      noTransactions: "Транзакцій ще немає.",
      reviewCases: "Заявки на перевірку",
      open: "відкрито",
    },
    accountsSection: {
      kicker: "Банкінг простіше",
      title: "Акаунти та карткові сервіси з вбудованим захистом",
      text: "React-інтерфейс для клієнтів, яким потрібні прості банківські інструменти й розумний захист в одному місці.",
    },
    featuresSection: {
      kicker: "Можливості та переваги",
      title: "Створено для сучасного банківського захисту",
      text:
        "Спокійний і практичний досвід для команд, яким потрібні швидкі відповіді, послідовні рішення та повна картина кожної справи клієнта.",
    },
    popular: {
      kicker: "Популярні сервіси",
      title: "Що ви хочете зробити сьогодні?",
    },
    cta: {
      kicker: "Чому команди обирають це",
      title: "Менше ручних перевірок. Більше часу для важливих справ.",
    },
    app: {
      quickActions: "Швидкі дії",
      addMoney: "Поповнити",
      transfer: "Переказ",
      cards: "Картки",
      analytics: "Аналітика",
      mainAccount: "Головний акаунт",
      virtualCard: "Віртуальна картка",
      cardReady: "Готова для безпечних онлайн-платежів",
      spending: "Витрати",
      thisMonth: "Цього місяця",
      protection: "Захист",
      protected: "Захищено",
    },
    dashboard: {
      demoKicker: "Демо-панель",
      userKicker: "Кабінет користувача",
      demoTitle: "Активність акаунта на перевірці",
      userTitleSuffix: ": банківський огляд",
      demoText: "Увійдіть, щоб відкрити кабінет з акаунтами, транзакціями та заявками.",
      userText: "Переглядайте банківські акаунти, останні транзакції та спірні платежі в одному захищеному просторі.",
      syncing: "Синхронізація",
      activeRecords: "активних записів",
      opened: "Відкрито",
      transactions: "Транзакції",
      transactionsHelp: "Пошук і фільтрація активності акаунта.",
      searchPlaceholder: "Пошук за транзакцією, статусом або ID",
      transaction: "Транзакція",
      time: "Час",
      amount: "Сума",
      status: "Статус",
      noMatches: "Немає транзакцій за цим пошуком.",
      loginPrompt: "Увійдіть, щоб відкрити кабінет",
      loginPromptText:
        "Кабінет підключається до PostgreSQL і показує акаунти, транзакції та заявки залогіненого користувача.",
      sessionSecure: "Безпечна сесія",
      databaseConnected: "База підключена",
      apiReady: "API готовий",
    },
    toast: {
      dismiss: "Закрити",
      exportTitle: "Експорт готовий",
      exportMessage: "CSV з доказами завантажено.",
      supportTitle: "Підтримку відкрито",
      supportMessage: "Питання підтримки доступні нижче.",
      actionTitle: "Дію обрано",
      statusTitle: "Статус оновлено",
      demoStatusTitle: "Demo-статус оновлено",
      loginTitle: "Вітаємо знову",
      registerTitle: "Акаунт створено",
    },
    disputes: {
      title: "Підтримка заявок",
      text: "Відкрийте справу, щоб перевірити докази та оновити статус.",
      export: "Експорт",
      create: "Створити заявку",
      transaction: "Транзакція",
      choose: "Оберіть транзакцію",
      reason: "Причина",
      reasonPlaceholder: "Подвійний платіж, невідомий продавець...",
      createButton: "Створити",
      selected: "Обрана заявка",
      account: "Акаунт",
      currentStatus: "Поточний статус",
      chooseError: "Оберіть транзакцію і введіть коротку причину.",
      duplicateError: "Ця транзакція вже має заявку на перевірку.",
      created: "Нову заявку створено",
      demoCreated: "Заявку створено в demo mode",
      noCases: "Заявок ще немає.",
      openButton: "Відкрити",
      escalateButton: "Ескалювати",
      resolveButton: "Закрити",
    },
    support: {
      kicker: "Потрібна допомога?",
      title: "Зрозумілі відповіді для кожної справи",
    },
    footer: {
      text: "React-банкінг для моніторингу акаунтів, підтримки заявок і захисту клієнтів.",
      banking: "Банкінг",
      support: "Підтримка",
      currentAccounts: "Поточні акаунти",
      cards: "Картки",
      payments: "Платежі",
      helpCentre: "Центр допомоги",
      security: "Безпека",
      contact: "Контакти",
      email: "support@finguard.app",
    },
    benefits: [
      {
        title: "Розумні fraud-перевірки",
        text: "Перевіряйте підозрілу активність по картці та акаунту до того, як вона стане формальною заявкою.",
      },
      {
        title: "Докази по заявці в одному місці",
        text: "Обʼєднуйте нотатки клієнта, сигнали продавця та історію транзакцій у зрозумілому перегляді справи.",
      },
      {
        title: "Audit trail для compliance",
        text: "Зберігайте рішення, рекомендації та зміни статусів для внутрішньої перевірки.",
      },
    ],
    quickLinks: ["Захист поточного акаунта", "Підтримка карткових спорів", "Моніторинг транзакцій", "AI-перевірка справ"],
    accountCards: [
      {
        title: "Щоденний поточний акаунт",
        text: "Керуйте платежами, переказами та активністю акаунта з вбудованим AI-моніторингом.",
        action: "Переглянути акаунт",
      },
      {
        title: "Захищена цифрова картка",
        text: "Відстежуйте витрати, позначайте незвичні покупки та швидше готуйте докази.",
        action: "Інструменти картки",
      },
      {
        title: "Підтримка сімейного банкінгу",
        text: "Тримайте спільні платежі видимими завдяки корисним сповіщенням і простим перевіркам.",
        action: "Дізнатися більше",
      },
    ],
    serviceTiles: ["Відкрити акаунт", "Повідомити про платіж", "Перевірити статус", "Переглянути картку", "Завантажити виписку", "Звʼязатися з підтримкою"],
    faqItems: [
      {
        question: "Чи може FinGuard працювати без backend?",
        answer:
          "Так. Frontend має demo mode, тому логін, реєстрація, dashboard, транзакції та заявки залишаються доступними навіть якщо API тимчасово не запущений.",
      },
      {
        question: "Як AI-рекомендація входить у процес перевірки?",
        answer:
          "AI-рекомендації є підтримкою для рішення. Спеціаліст може перевірити історію клієнта, деталі транзакції та контекст заявки перед фінальною дією.",
      },
      {
        question: "Чи можна експортувати транзакції та докази?",
        answer:
          "Інтерфейс підготовлений для експорту історії транзакцій, нотаток, змін статусів і доказів для внутрішньої перевірки.",
      },
    ],
  },
};

type Content = typeof content.en;

const localizedContent: Record<Language, Content> = {
  en: content.en,
  uk: content.uk,
  ru: {
    ...content.en,
    topNav: ["Личный", "Бизнес", "Поддержка"],
    help: "Центр помощи",
    contact: "Контактная информация",
    tagline: "Безопасная банковская аналитика",
    signedIn: "Вход выполнен как",
    publicNav: {
      personal: "Личный",
      business: "Бизнес",
      kids: "Дети и подростки",
      company: "Компания",
    },
    nav: {
      accounts: "Счета",
      features: "Возможности",
      benefits: "Преимущества",
      dashboard: "Демо-панель",
      cabinet: "Кабинет",
      support: "Поддержка",
    },
    auth: {
      ...content.en.auth,
      login: "Войти",
      register: "Регистрация",
      createAccount: "Создать аккаунт",
      loginTitle: "Войти в FinGuard",
      registerTitle: "Создать аккаунт",
      password: "Пароль",
      confirmPassword: "Подтвердите пароль",
    },
    profile: {
      ...content.en.profile,
      accountOverview: "Обзор аккаунта",
      settings: "Настройки",
      signOut: "Выйти",
      profileSecurity: "Профиль и безопасность",
      notifications: "Уведомления",
      name: "Имя",
      role: "Роль",
      accounts: "Счета",
      backToCabinet: "К кабинету",
    },
    app: {
      ...content.en.app,
      quickActions: "Быстрые действия",
      addMoney: "Пополнить",
      transfer: "Перевод",
      cards: "Карты",
      analytics: "Аналитика",
      mainAccount: "Основной счет",
      virtualCard: "Виртуальная карта",
      cardReady: "Готова для безопасных онлайн-платежей",
      spending: "Расходы",
      protection: "Защита",
      protected: "Защищено",
    },
    cabinet: {
      ...content.en.cabinet,
      kicker: "Мой банковский кабинет",
      titleSuffix: ": обзор счета",
      text: "Счета, последние транзакции и заявки на проверку загружаются из PostgreSQL.",
      loading: "Загрузка данных",
      bankAccounts: "Банковские счета",
      recentTransactions: "Последние транзакции",
      reviewCases: "Заявки на проверку",
      viewAll: "Все",
    },
    dashboard: {
      ...content.en.dashboard,
      transactions: "Транзакции",
      searchPlaceholder: "Поиск по транзакции, статусу или ID",
      sessionSecure: "Безопасная сессия",
      databaseConnected: "База подключена",
      apiReady: "API готов",
    },
    statusLabels: {
      pending: "Ожидает",
      completed: "Завершено",
      review: "Проверка",
      open: "Открыта",
      resolved: "Закрыта",
      escalated: "Эскалация",
      active: "Активен",
      frozen: "Заморожен",
      closed: "Закрыт",
    },
    disputes: {
      ...content.en.disputes,
      title: "Поддержка заявок",
      create: "Создать заявку",
      choose: "Выберите транзакцию",
      reason: "Причина",
      createButton: "Создать",
      export: "Экспорт",
    },
  },
  es: {
    ...content.en,
    topNav: ["Personal", "Empresa", "Soporte"],
    help: "Centro de ayuda",
    contact: "Información de contacto",
    tagline: "Inteligencia bancaria segura",
    signedIn: "Sesión iniciada como",
    publicNav: {
      personal: "Personal",
      business: "Business",
      kids: "Kids & Teens",
      company: "Company",
    },
    nav: {
      accounts: "Cuentas",
      features: "Funciones",
      benefits: "Ventajas",
      dashboard: "Panel demo",
      cabinet: "Mi cuenta",
      support: "Soporte",
    },
    auth: {
      ...content.en.auth,
      login: "Entrar",
      register: "Registro",
      createAccount: "Crear cuenta",
      loginTitle: "Entrar en FinGuard",
      registerTitle: "Crear cuenta",
      password: "Contraseña",
      confirmPassword: "Confirmar contraseña",
    },
    profile: {
      ...content.en.profile,
      accountOverview: "Resumen de cuenta",
      settings: "Ajustes",
      signOut: "Salir",
      profileSecurity: "Perfil y seguridad",
      notifications: "Notificaciones",
      name: "Nombre",
      role: "Rol",
      accounts: "Cuentas",
      backToCabinet: "Volver al panel",
    },
    app: {
      ...content.en.app,
      quickActions: "Acciones rápidas",
      addMoney: "Añadir dinero",
      transfer: "Transferir",
      cards: "Tarjetas",
      analytics: "Analítica",
      mainAccount: "Cuenta principal",
      virtualCard: "Tarjeta virtual",
      cardReady: "Lista para pagos online seguros",
      spending: "Gastos",
      protection: "Protección",
      protected: "Protegido",
    },
    cabinet: {
      ...content.en.cabinet,
      kicker: "Mi panel bancario",
      titleSuffix: ": resumen de cuenta",
      text: "Tus cuentas, transacciones recientes y casos de revisión se cargan desde PostgreSQL.",
      loading: "Cargando datos",
      bankAccounts: "Cuentas bancarias",
      recentTransactions: "Transacciones recientes",
      reviewCases: "Casos de revisión",
      viewAll: "Ver todo",
    },
    dashboard: {
      ...content.en.dashboard,
      transactions: "Transacciones",
      searchPlaceholder: "Buscar por transacción, estado o ID",
      sessionSecure: "Sesión segura",
      databaseConnected: "Base conectada",
      apiReady: "API lista",
    },
    statusLabels: {
      pending: "Pendiente",
      completed: "Completado",
      review: "Revisión",
      open: "Abierto",
      resolved: "Resuelto",
      escalated: "Escalado",
      active: "Activo",
      frozen: "Bloqueado",
      closed: "Cerrado",
    },
    disputes: {
      ...content.en.disputes,
      title: "Soporte de disputas",
      create: "Crear caso",
      choose: "Elegir transacción",
      reason: "Motivo",
      createButton: "Crear",
      export: "Exportar",
    },
  },
  it: {
    ...content.en,
    topNav: ["Personale", "Business", "Supporto"],
    help: "Centro assistenza",
    contact: "Info contatto",
    tagline: "Intelligenza bancaria sicura",
    signedIn: "Accesso come",
    publicNav: {
      personal: "Personal",
      business: "Business",
      kids: "Kids & Teens",
      company: "Company",
    },
    nav: {
      accounts: "Conti",
      features: "Funzioni",
      benefits: "Vantaggi",
      dashboard: "Dashboard demo",
      cabinet: "Area personale",
      support: "Supporto",
    },
    auth: {
      ...content.en.auth,
      login: "Accedi",
      register: "Registrati",
      createAccount: "Crea account",
      loginTitle: "Accedi a FinGuard",
      registerTitle: "Crea account",
      password: "Password",
      confirmPassword: "Conferma password",
    },
    profile: {
      ...content.en.profile,
      accountOverview: "Panoramica account",
      settings: "Impostazioni",
      signOut: "Esci",
      profileSecurity: "Profilo e sicurezza",
      notifications: "Notifiche",
      name: "Nome",
      role: "Ruolo",
      accounts: "Conti",
      backToCabinet: "Torna all'area",
    },
    app: {
      ...content.en.app,
      quickActions: "Azioni rapide",
      addMoney: "Aggiungi fondi",
      transfer: "Trasferisci",
      cards: "Carte",
      analytics: "Analisi",
      mainAccount: "Conto principale",
      virtualCard: "Carta virtuale",
      cardReady: "Pronta per pagamenti online sicuri",
      spending: "Spese",
      protection: "Protezione",
      protected: "Protetto",
    },
    cabinet: {
      ...content.en.cabinet,
      kicker: "Area bancaria",
      titleSuffix: ": panoramica account",
      text: "Conti, transazioni recenti e casi di revisione vengono caricati da PostgreSQL.",
      loading: "Caricamento dati",
      bankAccounts: "Conti bancari",
      recentTransactions: "Transazioni recenti",
      reviewCases: "Casi di revisione",
      viewAll: "Vedi tutto",
    },
    dashboard: {
      ...content.en.dashboard,
      transactions: "Transazioni",
      searchPlaceholder: "Cerca per transazione, stato o ID",
      sessionSecure: "Sessione sicura",
      databaseConnected: "Database connesso",
      apiReady: "API pronta",
    },
    statusLabels: {
      pending: "In attesa",
      completed: "Completato",
      review: "Revisione",
      open: "Aperto",
      resolved: "Risolto",
      escalated: "Escalation",
      active: "Attivo",
      frozen: "Bloccato",
      closed: "Chiuso",
    },
    disputes: {
      ...content.en.disputes,
      title: "Supporto contestazioni",
      create: "Crea caso",
      choose: "Scegli transazione",
      reason: "Motivo",
      createButton: "Crea",
      export: "Esporta",
    },
  },
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function App() {
  const { user, login, register, logout } = useAuth();
  const socket = useSocket();
  const [accounts, setAccounts] = useState<BankAccount[]>(demoAccounts);
  const [transactions, setTransactions] = useState<Transaction[]>(demoTransactions);
  const [disputes, setDisputes] = useState<Dispute[]>(demoDisputes);
  const [lastEvent, setLastEvent] = useState("Monitoring is ready");
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authForm, setAuthForm] = useState<AuthFormState>(initialAuthForm);
  const [authError, setAuthError] = useState("");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>("all");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [selectedDisputeId, setSelectedDisputeId] = useState(demoDisputes[0]?.id ?? "");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [disputeForm, setDisputeForm] = useState(initialDisputeForm);
  const [disputeError, setDisputeError] = useState("");
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    return stored === "uk" || stored === "en" || stored === "ru" || stored === "es" || stored === "it" ? stored : "en";
  });
  const [toast, setToast] = useState<{ title: string; message: string; tone: ToastTone } | null>(null);
  const [preferences, setPreferences] = useState({
    riskAlerts: true,
    monthlySummary: true,
    securityChecks: true,
  });
  const c = localizedContent[language];

  const showToast = (title: string, message: string, tone: ToastTone = "success") => {
    setToast({ title, message, tone });
  };

  const statusLabel = (status: TransactionStatus | DisputeStatus | BankAccount["status"]) => {
    return c.statusLabels[status];
  };

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language === "uk" ? "uk" : "en";
  }, [language]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!user) return;

    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsLoading(true);
    Promise.all([fetchAccounts(), fetchTransactions(), fetchDisputes()])
      .then(([accountData, transactionData, disputeData]) => {
        setAccounts(accountData.length ? accountData : demoAccounts);
        setTransactions(transactionData.length ? transactionData : demoTransactions);
        setDisputes(disputeData.length ? disputeData : demoDisputes);
      })
      .catch(() => {
        setAccounts(demoAccounts);
        setTransactions(demoTransactions);
        setDisputes(demoDisputes);
        setLastEvent("Demo mode active while API is offline");
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (payload: { id?: string }) => {
      setLastEvent(`Status update received${payload.id ? ` for ${payload.id}` : ""}`);
    };

    socket.on("status:updated", handleStatusUpdate);
    return () => {
      socket.off("status:updated", handleStatusUpdate);
    };
  }, [socket]);

  const stats = useMemo(() => {
    const reviewCount = transactions.filter((item) => item.status === "review").length;
    const volume = transactions.reduce((sum, item) => sum + item.amount, 0);
    const activeDisputes = disputes.filter((item) => item.status !== "resolved").length;
    const accountBalance = accounts.reduce((sum, item) => sum + item.balance, 0);

    return [
      { label: language === "uk" ? "Загальний баланс" : "Total balance", value: formatCurrency(accountBalance, accounts[0]?.currency ?? "EUR") },
      { label: language === "uk" ? "На перевірці" : "Items to review", value: reviewCount.toString() },
      { label: language === "uk" ? "Захищений обсяг" : "Protected volume", value: formatCurrency(volume, "EUR") },
      { label: language === "uk" ? "Відкриті справи" : "Open cases", value: activeDisputes.toString() },
    ];
  }, [accounts, transactions, disputes, language]);

  const filteredTransactions = useMemo(() => {
    const search = transactionSearch.trim().toLowerCase();

    return transactions.filter((item) => {
      const matchesStatus = transactionFilter === "all" || item.status === transactionFilter;
      const matchesSearch =
        !search ||
        item.id.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        item.status.toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [transactionFilter, transactionSearch, transactions]);

  const selectedDispute = useMemo(() => {
    return disputes.find((item) => item.id === selectedDisputeId) ?? disputes[0] ?? null;
  }, [disputes, selectedDisputeId]);

  const selectedTransaction = useMemo(() => {
    if (!selectedDispute) return null;
    return transactions.find((item) => item.id === selectedDispute.transactionId) ?? null;
  }, [selectedDispute, transactions]);

  const userInitials = useMemo(() => {
    if (!user) return "FG";
    const parts = user.name.trim().split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : user.name.slice(0, 2)).toUpperCase();
  }, [user]);

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthError("");
    setIsAuthOpen(true);
  };

  const updateAuthField = (field: keyof AuthFormState, value: string) => {
    setAuthForm((current) => ({ ...current, [field]: value }));
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");

    const email = authForm.email.trim();
    const name = authForm.name.trim();

    if (!email || !authForm.password) {
      setAuthError(c.auth.missingCredentials);
      return;
    }

    if (authMode === "register" && !name) {
      setAuthError(c.auth.missingName);
      return;
    }

    if (authForm.password.length < 6) {
      setAuthError(c.auth.shortPassword);
      return;
    }

    if (authMode === "register" && authForm.password !== authForm.confirmPassword) {
      setAuthError(c.auth.mismatch);
      return;
    }

    if (authMode === "login") {
      await login({ email, password: authForm.password });
      showToast(c.toast.loginTitle, email);
    } else {
      await register({ name, email, password: authForm.password });
      showToast(c.toast.registerTitle, email);
    }

    setAuthForm(initialAuthForm);
    setIsAuthOpen(false);
  };

  const updateDisputeStatus = async (status: DisputeStatus) => {
    if (!selectedDispute) return;

    try {
      const updatedDispute = await saveDisputeStatus(selectedDispute.id, status);
      setDisputes((current) => current.map((item) => (item.id === selectedDispute.id ? updatedDispute : item)));
      setLastEvent(`${selectedDispute.reason} saved as ${status}`);
      showToast(c.toast.statusTitle, `${selectedDispute.reason}: ${statusLabel(status)}`);
    } catch {
      setDisputes((current) =>
        current.map((item) => (item.id === selectedDispute.id ? { ...item, status } : item)),
      );
      setLastEvent(`${selectedDispute.reason} marked as ${status} in demo mode`);
      showToast(c.toast.demoStatusTitle, `${selectedDispute.reason}: ${statusLabel(status)}`, "info");
    }
  };

  const submitDispute = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDisputeError("");

    if (!disputeForm.transactionId || disputeForm.reason.trim().length < 3) {
      setDisputeError(c.disputes.chooseError);
      return;
    }

    const transaction = transactions.find((item) => item.id === disputeForm.transactionId);
    const existingDispute = disputes.find((item) => item.transactionId === disputeForm.transactionId);
    if (existingDispute) {
      setSelectedDisputeId(existingDispute.id);
      setDisputeError(c.disputes.duplicateError);
      return;
    }

    try {
      const newDispute = await createDispute(disputeForm.transactionId, disputeForm.reason.trim());
      setDisputes((current) => [newDispute, ...current]);
      setSelectedDisputeId(newDispute.id);
      setLastEvent(c.disputes.created);
      showToast(c.disputes.created, newDispute.reason);
    } catch {
      const fallbackDispute: Dispute = {
        id: `disp_${Date.now()}`,
        transactionId: disputeForm.transactionId,
        accountNumber: transaction?.accountNumber,
        reason: disputeForm.reason.trim(),
        status: "open",
        createdAt: new Date().toISOString(),
      };
      setDisputes((current) => [fallbackDispute, ...current]);
      setSelectedDisputeId(fallbackDispute.id);
      setLastEvent(c.disputes.demoCreated);
      showToast(c.disputes.demoCreated, fallbackDispute.reason, "info");
    }

    setDisputeForm(initialDisputeForm);
  };

  const downloadEvidence = () => {
    const rows = [
      ["Case ID", "Transaction ID", "Reason", "Status", "Amount", "Transaction status"],
      ...disputes.map((item) => {
        const transaction = transactions.find((txn) => txn.id === item.transactionId);
        return [
          item.id,
          item.transactionId,
          item.reason,
          item.status,
          transaction ? formatCurrency(transaction.amount, transaction.currency) : "Unknown",
          transaction?.status ?? "Unknown",
        ];
      }),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "finguard-evidence.csv";
    link.click();
    URL.revokeObjectURL(url);
    setLastEvent("Evidence export downloaded");
    showToast(c.toast.exportTitle, c.toast.exportMessage);
  };

  const handleServiceClick = (service: string) => {
    if (service === c.serviceTiles[4]) {
      downloadEvidence();
      return;
    }

    if (service === c.serviceTiles[5]) {
      document.getElementById("support")?.scrollIntoView({ behavior: "smooth" });
      setLastEvent("Support questions opened");
      showToast(c.toast.supportTitle, c.toast.supportMessage, "info");
      return;
    }

    document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" });
    setLastEvent(`${service} selected`);
    showToast(c.toast.actionTitle, service, "info");
  };

  return (
    <main className="min-h-screen bg-white text-[#0F2A1D]">
      <div className="h-2 bg-[#375534]" />
      <header className="site-header">
        <div className="mx-auto flex max-w-7xl justify-end px-4 py-1.5 text-sm font-bold text-[#375534] sm:px-6 lg:px-8">
          <div className="hidden items-center gap-7 sm:flex">
            <label className="language-select-wrap">
              <span className="sr-only">Language</span>
              <select
                className="language-select language-select-inline"
                onChange={(event) => setLanguage(event.target.value as Language)}
                value={language}
              >
                {(["en", "uk", "ru", "es", "it"] as Language[]).map((item) => (
                  <option key={item} value={item}>
                    {languageLabels[item]}
                  </option>
                ))}
              </select>
            </label>
            <span>{c.help}</span>
            <a href="#footer">{c.contact}</a>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-8 lg:py-3.5">
          <div className="brand-lockup lg:-translate-x-[30px] lg:justify-self-start">
            <div className="brand-mark brand-mark-header">FG</div>
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">FinGuard</h1>
              <p className="text-base font-bold text-[#6B9071] sm:text-lg">
                {user ? `${c.signedIn} ${user.name}` : c.tagline}
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-9 text-base font-semibold text-[#0F2A1D] xl:gap-11 xl:text-lg lg:flex lg:translate-x-[-20px] lg:justify-self-center">
            {user ? (
              <>
                <a className="header-nav-link" href="#cabinet">{c.nav.cabinet}</a>
                <a className="header-nav-link" href="#dashboard">{c.dashboard.transactions}</a>
                <a className="header-nav-link" href="#support">{c.nav.support}</a>
              </>
            ) : (
              <>
                <a className="header-nav-link" href="#accounts">{c.publicNav.personal}</a>
                <a className="header-nav-link" href="#features">{c.publicNav.business}</a>
                <a className="header-nav-link" href="#benefits">{c.publicNav.kids}</a>
                <a className="header-nav-link" href="#footer">{c.publicNav.company}</a>
              </>
            )}
          </nav>
          <div className="flex items-center gap-2 lg:justify-self-end">
            <button
              aria-expanded={isMobileMenuOpen}
              aria-label="Open mobile navigation"
              className="mobile-menu-trigger lg:hidden"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              type="button"
            >
              <span />
              <span />
              <span />
            </button>

            {user ? (
              <div className="relative">
                <button
                  aria-expanded={isUserMenuOpen}
                  aria-label="Open user menu"
                  className="user-menu-trigger"
                  onClick={() => setIsUserMenuOpen((current) => !current)}
                  type="button"
                >
                  <span className="user-avatar">{userInitials}</span>
                </button>

                {isUserMenuOpen ? (
                  <div className="user-menu" role="menu">
                    <div className="border-b border-[#AEC3B0] p-4">
                      <div className="flex items-center gap-3">
                        <span className="user-avatar large">{userInitials}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[#0F2A1D]">{user.name}</p>
                          <p className="truncate text-xs font-semibold text-[#6B9071]">{user.email ?? "Signed in"}</p>
                        </div>
                      </div>
                      <div className="mt-3 rounded border border-[#AEC3B0] bg-[#E3EED4] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#375534]">
                        {user.role}
                      </div>
                    </div>

                    <div className="p-2">
                      <a
                        className="user-menu-item"
                        href="#cabinet"
                        onClick={() => setIsUserMenuOpen(false)}
                        role="menuitem"
                      >
                        {c.profile.accountOverview}
                      </a>
                      <button
                        className="user-menu-item"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsSettingsOpen(true);
                        }}
                        role="menuitem"
                        type="button"
                      >
                        {c.profile.settings}
                      </button>
                      <button
                        className="user-menu-item danger"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        role="menuitem"
                        type="button"
                      >
                        {c.profile.signOut}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <button className="btn-primary header-login-button" onClick={() => openAuth("login")}>
                {c.auth.login}
              </button>
            )}
          </div>
        </div>

        {isMobileMenuOpen ? (
          <nav className="border-t border-[#AEC3B0] bg-white px-4 py-3 lg:hidden">
            <label className="mb-3 block sm:hidden">
              <span className="sr-only">Language</span>
              <select
                className="language-select w-full"
                onChange={(event) => setLanguage(event.target.value as Language)}
                value={language}
              >
                {(["en", "uk", "ru", "es", "it"] as Language[]).map((item) => (
                  <option key={item} value={item}>
                    {languageLabels[item]}
                  </option>
                ))}
              </select>
            </label>
            {[
              ...(user
                ? [
                    [c.nav.cabinet, "#cabinet"],
                    [c.dashboard.transactions, "#dashboard"],
                    [c.nav.support, "#support"],
                  ]
                : [
                    [c.publicNav.personal, "#accounts"],
                    [c.publicNav.business, "#features"],
                    [c.publicNav.kids, "#benefits"],
                    [c.publicNav.company, "#footer"],
                  ]),
            ].map(([label, href]) => (
              <a
                className="mobile-nav-link"
                href={href}
                key={label}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {label}
              </a>
            ))}
          </nav>
        ) : null}
      </header>

      {user ? (
        <section className="app-shell py-8" id="cabinet">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="dashboard-heading">
              <div>
                <p className="section-kicker">{c.cabinet.kicker}</p>
                <h2 className="section-heading">
                  {language === "uk" ? `${user.name}${c.cabinet.titleSuffix}` : `${user.name}${c.cabinet.titleSuffix}`}
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[#375534]">
                  {c.cabinet.text}
                </p>
              </div>
              <div className="sync-pill">
                <span className="h-2 w-2 rounded-full bg-[#6B9071]" />
                {isLoading ? c.cabinet.loading : lastEvent}
              </div>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="lg:col-span-3">
                <div className="system-strip">
                  <div>
                    <span className="system-dot" />
                    {c.dashboard.sessionSecure}
                  </div>
                  <div>
                    <span className="system-dot" />
                    {c.dashboard.databaseConnected}
                  </div>
                  <div>
                    <span className="system-dot" />
                    {c.dashboard.apiReady}
                  </div>
                </div>
              </div>

              <section className="revolut-balance-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-[#E3EED4]">{c.app.mainAccount}</p>
                    <h3 className="mt-3 text-5xl font-black tracking-tight text-white">
                      {formatCurrency(accounts.reduce((sum, account) => sum + account.balance, 0), accounts[0]?.currency ?? "EUR")}
                    </h3>
                    <p className="mt-3 text-sm font-semibold text-[#E3EED4]">
                      {accounts[0]?.accountNumber ?? "FG-00000000"}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white">
                    {c.app.protected}
                  </span>
                </div>
                <div className="mt-8">
                  <p className="text-sm font-black text-[#E3EED4]">{c.app.quickActions}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[c.app.addMoney, c.app.transfer, c.app.cards, c.app.analytics].map((action) => (
                      <button className="revolut-action" key={action} type="button">
                        <span>{action.slice(0, 1)}</span>
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="revolut-side-card">
                <div className="virtual-card">
                  <div className="flex items-start justify-between">
                    <span>FinGuard</span>
                    <span>•••• 2480</span>
                  </div>
                  <div className="mt-12 text-sm font-black">{c.app.virtualCard}</div>
                </div>
                <p className="mt-4 text-sm font-bold text-[#375534]">{c.app.cardReady}</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="mini-metric">
                    <p>{c.app.spending}</p>
                    <strong>{formatCurrency(transactions.reduce((sum, txn) => sum + txn.amount, 0), "EUR")}</strong>
                  </div>
                  <div className="mini-metric">
                    <p>{c.app.protection}</p>
                    <strong>{disputes.filter((item) => item.status !== "resolved").length}</strong>
                  </div>
                </div>
              </section>

              <section className="revolut-panel">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-black">{c.cabinet.recentTransactions}</h3>
                  <a className="text-sm font-black text-[#375534]" href="#dashboard">
                    {c.cabinet.viewAll}
                  </a>
                </div>
                <div className="mt-5 divide-y divide-slate-100">
                  {transactions.slice(0, 3).map((txn) => (
                    <article className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]" key={txn.id}>
                      <div>
                        <p className="font-black">{txn.description}</p>
                        <p className="mt-1 text-sm text-[#6B9071]">
                          {txn.id}
                          {txn.accountNumber ? ` · ${txn.accountNumber}` : ""}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="font-black">{formatCurrency(txn.amount, txn.currency)}</p>
                        <span className={`badge mt-2 ${statusStyles[txn.status]}`}>{statusLabel(txn.status)}</span>
                      </div>
                    </article>
                  ))}
                  {transactions.length === 0 ? (
                    <p className="py-6 text-sm font-bold text-[#6B9071]">{c.cabinet.noTransactions}</p>
                  ) : null}
                </div>
              </section>

              <section className="revolut-panel">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-black">{c.cabinet.reviewCases}</h3>
                  <span className="badge border-[#AEC3B0] bg-[#E3EED4] text-[#375534]">
                    {disputes.filter((item) => item.status !== "resolved").length} {c.cabinet.open}
                  </span>
                </div>
                <div className="mt-5 space-y-3">
                  {disputes.slice(0, 3).map((item) => (
                    <button
                      className="case-card"
                      key={item.id}
                      onClick={() => {
                        setSelectedDisputeId(item.id);
                        document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      type="button"
                    >
                      <div>
                        <p className="font-black">{item.reason}</p>
                        <p className="mt-1 text-sm text-[#6B9071]">{item.transactionId}</p>
                      </div>
                      <span className={`badge ${statusStyles[item.status]}`}>{statusLabel(item.status)}</span>
                    </button>
                  ))}
                  {disputes.length === 0 ? (
                    <p className="rounded border border-[#AEC3B0] bg-white p-4 text-sm font-bold text-[#6B9071]">
                      {c.disputes.noCases}
                    </p>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        </section>
      ) : null}

      {!user ? (
        <>
          <section className="hero-section">
            <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-14">
              <div>
                <p className="breadcrumb">{c.hero.breadcrumb}</p>
                <h2 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                  {c.hero.title}
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-[#375534]">
                  {c.hero.text}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button className="btn-primary" onClick={() => openAuth("login")}>
                    {c.hero.startDemo}
                  </button>
                <button className="btn-white" onClick={() => openAuth("register")}>
                  {c.auth.createAccount}
                </button>
                  <a className="btn-white" href="#features">
                    {c.hero.viewFeatures}
                  </a>
                </div>
              </div>
              <div className="hero-image-wrap">
                <img alt="FinGuard secure banking dashboard preview" className="hero-image" src={heroImage} />
              </div>
            </div>
          </section>

          <section className="bg-[#E3EED4]">
            <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-4 lg:px-8">
              {c.quickLinks.map((item) => (
                <a className="quick-link" href="#features" key={item}>
                  {item}
                  <span aria-hidden="true">›</span>
                </a>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {!user ? (
        <>
          <section className="section" id="accounts">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
                <div>
                  <p className="section-kicker">{c.accountsSection.kicker}</p>
                  <h2 className="section-heading">{c.accountsSection.title}</h2>
                  <p className="mt-4 text-lg leading-8 text-[#375534]">
                    {c.accountsSection.text}
                  </p>
                </div>
                <div className="grid gap-5 md:grid-cols-3">
                  {c.accountCards.map((item) => (
                    <article className="account-card" key={item.title}>
                      <h3 className="text-xl font-black">{item.title}</h3>
                      <p className="mt-3 leading-7 text-[#375534]">{item.text}</p>
                      <a className="mt-5 inline-flex text-sm font-black text-[#375534]" href="#dashboard">
                        {item.action} ›
                      </a>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

      <section className="section" id="features">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="section-kicker">{c.featuresSection.kicker}</p>
            <h2 className="section-heading">{c.featuresSection.title}</h2>
            <p className="mt-4 text-lg leading-8 text-[#375534]">
              {c.featuresSection.text}
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {c.benefits.map((item, index) => (
              <article className="benefit-card text-center" key={item.title}>
                <div className="benefit-icon">{index + 1}</div>
                <h3 className="mt-5 text-xl font-black">{item.title}</h3>
                <p className="mt-3 leading-7 text-[#375534]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#E3EED4] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="section-kicker">{c.popular.kicker}</p>
              <h2 className="section-heading">{c.popular.title}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {c.serviceTiles.map((item) => (
                <button className="service-tile" key={item} onClick={() => handleServiceClick(item)} type="button">
                  {item}
                  <span aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

          <section className="cta-band" id="benefits">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.7fr] lg:px-8">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#8ee3a9]">{c.cta.kicker}</p>
                <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
                  {c.cta.title}
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {stats.map((item) => (
                  <div className="stat-tile" key={item.label}>
                    <p className="text-sm font-semibold text-[#AEC3B0]">{item.label}</p>
                    <p className="mt-2 text-3xl font-black text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}

      <section className="section bg-[#E3EED4]" id="dashboard">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="dashboard-heading">
            <div>
              <p className="section-kicker">{user ? c.dashboard.userKicker : c.dashboard.demoKicker}</p>
              <h2 className="section-heading">
                {user ? `${user.name}${c.dashboard.userTitleSuffix}` : c.dashboard.demoTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#375534]">
                {user ? c.dashboard.userText : c.dashboard.demoText}
              </p>
            </div>
            <div className="sync-pill">
              <span className="h-2 w-2 rounded-full bg-[#6B9071]" />
              {isLoading ? c.dashboard.syncing : lastEvent}
            </div>
          </div>

          {user ? (
            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="text-xl font-black">{c.cabinet.bankAccounts}</h3>
                <span className="text-sm font-bold text-[#6B9071]">
                  {accounts.length} {c.dashboard.activeRecords}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {accounts.map((account) => (
                  <article className="account-summary-card" key={account.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#375534]">
                          {c.cabinet.currentAccount}
                        </p>
                        <h4 className="mt-2 text-xl font-black">{account.accountNumber}</h4>
                      </div>
                      <span className={`badge ${statusStyles[account.status === "active" ? "completed" : "pending"]}`}>
                        {statusLabel(account.status)}
                      </span>
                    </div>
                    <p className="mt-6 text-sm font-bold text-[#6B9071]">{c.cabinet.availableBalance}</p>
                    <p className="mt-1 text-3xl font-black">{formatCurrency(account.balance, account.currency)}</p>
                    <p className="mt-4 text-sm text-[#6B9071]">
                      {c.dashboard.opened} {formatTime(account.createdAt)}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <div className="mt-8 rounded border border-[#AEC3B0] bg-[#E3EED4] p-5">
              <h3 className="text-xl font-black">{c.dashboard.loginPrompt}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[#375534]">
                {c.dashboard.loginPromptText}
              </p>
              <button className="btn-primary mt-4" onClick={() => openAuth("login")} type="button">
                {c.auth.login}
              </button>
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <section className="bank-panel">
              <div className="mb-5">
                <h3 className="text-xl font-black">{c.dashboard.transactions}</h3>
                <p className="mt-1 text-sm text-[#6B9071]">{c.dashboard.transactionsHelp}</p>
              </div>
              <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
                <label className="block">
                  <span className="sr-only">Search transactions</span>
                  <input
                    className="control-input"
                    onChange={(event) => setTransactionSearch(event.target.value)}
                    placeholder={c.dashboard.searchPlaceholder}
                    type="search"
                    value={transactionSearch}
                  />
                </label>
                <div className="segmented-control" aria-label="Filter transactions by status">
                  {(["all", "review", "pending", "completed"] as TransactionFilter[]).map((status) => (
                    <button
                      className={transactionFilter === status ? "segmented-option active" : "segmented-option"}
                      key={status}
                      onClick={() => setTransactionFilter(status)}
                      type="button"
                    >
                      {status === "all" ? (language === "uk" ? "усі" : "all") : statusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#AEC3B0] text-xs uppercase tracking-wide text-[#6B9071]">
                      <th className="py-3 pr-4">{c.dashboard.transaction}</th>
                      <th className="px-4 py-3">{c.dashboard.time}</th>
                      <th className="px-4 py-3">{c.dashboard.amount}</th>
                      <th className="py-3 pl-4">{c.dashboard.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((txn) => (
                      <tr key={txn.id}>
                        <td className="py-4 pr-4">
                          <p className="font-bold">{txn.description}</p>
                          <p className="text-xs text-[#6B9071]">
                            {txn.id}
                            {txn.accountNumber ? ` · ${txn.accountNumber}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-[#375534]">{formatTime(txn.createdAt)}</td>
                        <td className="px-4 py-4 font-black">{formatCurrency(txn.amount, txn.currency)}</td>
                        <td className="py-4 pl-4">
                          <span className={`badge ${statusStyles[txn.status]}`}>{statusLabel(txn.status)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTransactions.length === 0 ? (
                  <div className="py-10 text-center text-sm font-bold text-[#6B9071]">
                    {c.dashboard.noMatches}
                  </div>
                ) : null}
              </div>
            </section>

            <aside className="bank-panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">{c.disputes.title}</h3>
                  <p className="mt-1 text-sm text-[#6B9071]">{c.disputes.text}</p>
                </div>
                <button className="btn-small" onClick={downloadEvidence} type="button">
                  {c.disputes.export}
                </button>
              </div>
              {user ? (
                <form className="mt-5 rounded border border-[#AEC3B0] bg-[#E3EED4] p-4" onSubmit={submitDispute}>
                  <h4 className="text-sm font-black">{c.disputes.create}</h4>
                  <label className="mt-3 block">
                    <span className="text-xs font-bold text-[#375534]">{c.disputes.transaction}</span>
                    <select
                      className="control-input mt-2"
                      onChange={(event) =>
                        setDisputeForm((current) => ({ ...current, transactionId: event.target.value }))
                      }
                      value={disputeForm.transactionId}
                    >
                      <option value="">{c.disputes.choose}</option>
                      {transactions.map((txn) => (
                        <option key={txn.id} value={txn.id}>
                          {txn.id} - {txn.description}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-3 block">
                    <span className="text-xs font-bold text-[#375534]">{c.disputes.reason}</span>
                    <input
                      className="control-input mt-2"
                      onChange={(event) => setDisputeForm((current) => ({ ...current, reason: event.target.value }))}
                      placeholder={c.disputes.reasonPlaceholder}
                      type="text"
                      value={disputeForm.reason}
                    />
                  </label>
                  {disputeError ? <p className="mt-3 text-xs font-bold text-[#375534]">{disputeError}</p> : null}
                  <button className="btn-small mt-4 w-full" type="submit">
                    {c.disputes.createButton}
                  </button>
                </form>
              ) : null}
              <div className="mt-5 space-y-3">
                {disputes.map((item) => (
                  <button
                    className={selectedDispute?.id === item.id ? "case-card selected" : "case-card"}
                    key={item.id}
                    onClick={() => setSelectedDisputeId(item.id)}
                    type="button"
                  >
                    <div>
                  <p className="font-bold">{item.reason}</p>
                      <p className="mt-1 text-sm text-[#6B9071]">
                        {item.transactionId}
                        {item.accountNumber ? ` · ${item.accountNumber}` : ""}
                      </p>
                    </div>
                    <span className={`badge ${statusStyles[item.status]}`}>{statusLabel(item.status)}</span>
                  </button>
                ))}
              </div>
              {selectedDispute ? (
                <div className="case-detail">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#375534]">
                      {c.disputes.selected}
                    </p>
                    <h4 className="mt-2 text-lg font-black">{selectedDispute.reason}</h4>
                    <p className="mt-1 text-sm text-[#6B9071]">{selectedDispute.id}</p>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="detail-row">
                      <dt>{c.disputes.account}</dt>
                      <dd>{selectedDispute.accountNumber ?? selectedTransaction?.accountNumber ?? "Unknown"}</dd>
                    </div>
                    <div className="detail-row">
                      <dt>{c.disputes.transaction}</dt>
                      <dd>{selectedDispute.transactionId}</dd>
                    </div>
                    <div className="detail-row">
                      <dt>{c.dashboard.amount}</dt>
                      <dd>
                        {selectedTransaction
                          ? formatCurrency(selectedTransaction.amount, selectedTransaction.currency)
                          : "Unknown"}
                      </dd>
                    </div>
                    <div className="detail-row">
                      <dt>{c.disputes.currentStatus}</dt>
                      <dd>{statusLabel(selectedDispute.status)}</dd>
                    </div>
                  </dl>
                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <button className="btn-small" onClick={() => updateDisputeStatus("open")} type="button">
                      {c.disputes.openButton}
                    </button>
                    <button className="btn-small" onClick={() => updateDisputeStatus("escalated")} type="button">
                      {c.disputes.escalateButton}
                    </button>
                    <button className="btn-small" onClick={() => updateDisputeStatus("resolved")} type="button">
                      {c.disputes.resolveButton}
                    </button>
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </section>

      <section className="section" id="support">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.7fr_1fr] lg:px-8">
          <div>
            <p className="section-kicker">{c.support.kicker}</p>
            <h2 className="section-heading">{c.support.title}</h2>
          </div>
          <div className="faq-list">
            {c.faqItems.map((item, index) => (
              <article className="faq-item" key={item.question}>
                <button
                  aria-controls={`faq-answer-${index}`}
                  aria-expanded={activeFaq === index}
                  className="faq-row"
                  onClick={() => setActiveFaq((current) => (current === index ? null : index))}
                  type="button"
                >
                  <span>{item.question}</span>
                  <span className="faq-icon" aria-hidden="true">
                    {activeFaq === index ? "−" : "+"}
                  </span>
                </button>
                {activeFaq === index ? (
                  <div className="faq-answer" id={`faq-answer-${index}`}>
                    <p>{item.answer}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {isSettingsOpen && user ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6" role="dialog" aria-modal="true">
          <section className="w-full max-w-lg rounded border border-[#AEC3B0] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">{c.profile.settings}</p>
                <h2 className="mt-2 text-2xl font-black">{c.profile.profileSecurity}</h2>
              </div>
              <button
                aria-label="Close settings"
                className="grid h-10 w-10 place-items-center rounded border border-[#AEC3B0] text-xl font-black text-[#375534] transition hover:bg-[#E3EED4]"
                onClick={() => setIsSettingsOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="detail-row">
                <dt>{c.profile.name}</dt>
                <dd>{user.name}</dd>
              </div>
              <div className="detail-row">
                <dt>{c.profile.email}</dt>
                <dd>{user.email ?? c.profile.notAvailable}</dd>
              </div>
              <div className="detail-row">
                <dt>{c.profile.role}</dt>
                <dd>{user.role}</dd>
              </div>
              <div className="detail-row">
                <dt>{c.profile.accounts}</dt>
                <dd>{accounts.length}</dd>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-base font-black">{c.profile.notifications}</h3>
              <div className="mt-3 grid gap-3">
                {[
                  ["riskAlerts", c.profile.riskAlerts, c.profile.riskAlertsText],
                  ["monthlySummary", c.profile.monthlySummary, c.profile.monthlySummaryText],
                  ["securityChecks", c.profile.securityChecks, c.profile.securityChecksText],
                ].map(([key, title, text]) => (
                  <label className="preference-row" key={key}>
                    <span>
                      <span className="block text-sm font-black">{title}</span>
                      <span className="mt-1 block text-sm leading-6 text-[#6B9071]">{text}</span>
                    </span>
                    <input
                      checked={preferences[key as keyof typeof preferences]}
                      className="toggle-input"
                      onChange={(event) =>
                        setPreferences((current) => ({ ...current, [key]: event.target.checked }))
                      }
                      type="checkbox"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded border border-[#AEC3B0] bg-[#E3EED4] p-4 text-sm leading-7 text-[#0F2A1D]">
              {c.profile.note}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a className="btn-primary" href="#cabinet" onClick={() => setIsSettingsOpen(false)}>
                {c.profile.backToCabinet}
              </a>
              <button
                className="btn-outline"
                onClick={() => {
                  setIsSettingsOpen(false);
                  logout();
                }}
                type="button"
              >
                {c.profile.signOut}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isAuthOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6" role="dialog" aria-modal="true">
          <section className="w-full max-w-md rounded border border-[#AEC3B0] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">{authMode === "login" ? c.auth.secureAccess : c.auth.newAccount}</p>
                <h2 className="mt-2 text-2xl font-black text-[#0F2A1D]">
                  {authMode === "login" ? c.auth.loginTitle : c.auth.registerTitle}
                </h2>
              </div>
              <button
                aria-label="Close auth form"
                className="grid h-10 w-10 place-items-center rounded border border-[#AEC3B0] text-xl font-black text-[#375534] transition hover:bg-[#E3EED4]"
                onClick={() => setIsAuthOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 rounded border border-[#AEC3B0] bg-[#E3EED4] p-1">
              <button
                className={`rounded px-4 py-2 text-sm font-black ${
                  authMode === "login" ? "bg-white text-[#375534] shadow-sm" : "text-[#375534]"
                }`}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
                type="button"
              >
                {c.auth.login}
              </button>
              <button
                className={`rounded px-4 py-2 text-sm font-black ${
                  authMode === "register" ? "bg-white text-[#375534] shadow-sm" : "text-[#375534]"
                }`}
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                }}
                type="button"
              >
                {c.auth.register}
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleAuthSubmit}>
              {authMode === "register" ? (
                <label className="block">
                  <span className="text-sm font-bold text-[#375534]">{c.auth.fullName}</span>
                  <input
                    className="mt-2 min-h-12 w-full rounded border border-[#AEC3B0] px-4 text-base outline-none transition focus:border-[#375534] focus:ring-4 focus:ring-[#AEC3B0]"
                    onChange={(event) => updateAuthField("name", event.target.value)}
                    placeholder="Oksana Rusina"
                    type="text"
                    value={authForm.name}
                  />
                </label>
              ) : null}

              <label className="block">
                <span className="text-sm font-bold text-[#375534]">{c.auth.email}</span>
                <input
                  className="mt-2 min-h-12 w-full rounded border border-[#AEC3B0] px-4 text-base outline-none transition focus:border-[#375534] focus:ring-4 focus:ring-[#AEC3B0]"
                  onChange={(event) => updateAuthField("email", event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={authForm.email}
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-[#375534]">{c.auth.password}</span>
                <input
                  className="mt-2 min-h-12 w-full rounded border border-[#AEC3B0] px-4 text-base outline-none transition focus:border-[#375534] focus:ring-4 focus:ring-[#AEC3B0]"
                  onChange={(event) => updateAuthField("password", event.target.value)}
                  placeholder={c.auth.minPassword}
                  type="password"
                  value={authForm.password}
                />
              </label>

              {authMode === "register" ? (
                <label className="block">
                  <span className="text-sm font-bold text-[#375534]">{c.auth.confirmPassword}</span>
                  <input
                    className="mt-2 min-h-12 w-full rounded border border-[#AEC3B0] px-4 text-base outline-none transition focus:border-[#375534] focus:ring-4 focus:ring-[#AEC3B0]"
                    onChange={(event) => updateAuthField("confirmPassword", event.target.value)}
                    placeholder={c.auth.repeatPassword}
                    type="password"
                    value={authForm.confirmPassword}
                  />
                </label>
              ) : null}

              {authError ? (
                <p className="rounded border border-[#AEC3B0] bg-[#E3EED4] px-4 py-3 text-sm font-bold text-[#0F2A1D]">
                  {authError}
                </p>
              ) : null}

              <button className="btn-primary w-full" type="submit">
                {authMode === "login" ? c.auth.login : c.auth.createAccount}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {toast ? (
        <div className={`toast toast-${toast.tone}`} role="status">
          <div>
            <p className="text-sm font-black">{toast.title}</p>
            <p className="mt-1 text-sm text-[#375534]">{toast.message}</p>
          </div>
          <button className="toast-close" onClick={() => setToast(null)} type="button">
            {c.toast.dismiss}
          </button>
        </div>
      ) : null}

      <footer className="bg-[#0F2A1D] text-white" id="footer">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
          <div className="md:col-span-2">
            <div className="brand-mark bg-white text-[#375534]">FG</div>
            <h2 className="mt-4 text-2xl font-black">FinGuard</h2>
            <p className="mt-3 max-w-md leading-7 text-[#AEC3B0]">
              {c.footer.text}
            </p>
          </div>
          <div>
            <h3 className="font-black">{c.footer.banking}</h3>
            <ul className="mt-4 space-y-3 text-sm text-[#AEC3B0]">
              <li>{c.footer.currentAccounts}</li>
              <li>{c.footer.cards}</li>
              <li>{c.footer.payments}</li>
            </ul>
          </div>
          <div>
            <h3 className="font-black">{c.footer.support}</h3>
            <ul className="mt-4 space-y-3 text-sm text-[#AEC3B0]">
              <li>{c.footer.helpCentre}</li>
              <li>{c.footer.security}</li>
              <li>
                <a className="transition hover:text-white" href={`mailto:${c.footer.email}`}>
                  {c.footer.email}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default App;
