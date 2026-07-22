import { FormEvent, Suspense, lazy, useEffect, useMemo, useState } from "react";
import bankImage from "../images/bank_1.webp";
import heroBankImage from "../images/bank_2.webp";
import boyWithCardImage from "../images/2_boy_with_card.webp";
import girlWithCardImage from "../images/1_girl_with_card.webp";
import safetyImage from "../images/safety.webp";
import { isPreviewAccessEnabled } from "./config/preview";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  LANGUAGE_STORAGE_KEY,
  getStorageItem,
  setStorageItem,
} from "./config/storage";
import { content, languageLabels, localizedContent, statusStyles, type Language } from "./content/appContent";
import { previewProfiles } from "./data/previewProfiles";
import { useAuth } from "./hooks/useAuth";
import { useSocket } from "./hooks/useSocket";
import {
  fetchAccounts,
  fetchAuditorCustomers,
  fetchTransactions,
  fetchDisputes,
  createDispute,
  updateDisputeStatus as saveDisputeStatus,
  sendSupportChatMessage,
  SupportChatMessage,
} from "./services/api";
import { createLocalSupportReply } from "./support/localSupport";
import type { AuditorCustomer, AuditorDispute, BankAccount, Dispute, DisputeStatus, Transaction, TransactionStatus } from "./types/domain";
import { formatCurrency, formatDisplayEmail, formatTime } from "./utils/formatters";

type AuthMode = "login" | "register";
type TransactionFilter = "all" | TransactionStatus;
type ToastTone = "success" | "info" | "warning";

const BankArchitectureScene = lazy(() =>
  import("./components/BankArchitectureScene").then((module) => ({ default: module.BankArchitectureScene }))
);

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

async function loadPreviewWorkspaceData() {
  if (!isPreviewAccessEnabled) return null;
  const { createPreviewWorkspaceData } = await import("./data/previewWorkspace");
  return createPreviewWorkspaceData();
}

function App() {
  const { user, login, register, logout, startPreviewSession } = useAuth();
  const socket = useSocket(Boolean(user));
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [auditorCustomers, setAuditorCustomers] = useState<AuditorCustomer[]>([]);
  const [selectedAuditorCustomerId, setSelectedAuditorCustomerId] = useState("");
  const [lastEvent, setLastEvent] = useState("Monitoring is ready");
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authForm, setAuthForm] = useState<AuthFormState>(initialAuthForm);
  const [authError, setAuthError] = useState("");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>("all");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [selectedDisputeId, setSelectedDisputeId] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCookieVisible, setIsCookieVisible] = useState(() => getStorageItem(COOKIE_CONSENT_STORAGE_KEY) !== "accepted");
  const [chatMessages, setChatMessages] = useState<SupportChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [disputeForm, setDisputeForm] = useState(initialDisputeForm);
  const [disputeError, setDisputeError] = useState("");
  const [language, setLanguage] = useState<Language>(() => {
    const stored = getStorageItem(LANGUAGE_STORAGE_KEY);
    return stored === "uk" || stored === "en" || stored === "ru" || stored === "es" || stored === "it" ? stored : "en";
  });
  const [toast, setToast] = useState<{ title: string; message: string; tone: ToastTone } | null>(null);
  const [preferences, setPreferences] = useState({
    riskAlerts: true,
    monthlySummary: true,
    securityChecks: true,
  });
  const c = user ? content.en : localizedContent[language];
  const isAuditor = user?.role === "admin";

  const showToast = (title: string, message: string, tone: ToastTone = "success") => {
    setToast({ title, message, tone });
  };

  const statusLabel = (status: TransactionStatus | DisputeStatus | BankAccount["status"]) => {
    return c.statusLabels[status];
  };

  useEffect(() => {
    setStorageItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = user ? "en" : language === "uk" ? "uk" : "en";
  }, [language, user]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!user) return;

    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsLoading(true);

    if (isAuditor) {
      fetchAuditorCustomers()
        .then(async (customerData) => {
          const previewData = customerData.length ? null : await loadPreviewWorkspaceData();
          const nextCustomers = customerData.length ? customerData : previewData?.auditorCustomers ?? [];
          setAuditorCustomers(nextCustomers);
          setSelectedAuditorCustomerId((current) => current || nextCustomers[0]?.id || "");
          setLastEvent(`${nextCustomers.length} customers loaded for audit`);
        })
        .catch(async () => {
          const previewData = await loadPreviewWorkspaceData();
          const nextCustomers = previewData?.auditorCustomers ?? [];
          setAuditorCustomers(nextCustomers);
          setSelectedAuditorCustomerId(nextCustomers[0]?.id ?? "");
          setLastEvent(previewData ? "Audit workspace ready while API is offline" : "Audit API is unavailable");
        })
        .finally(() => setIsLoading(false));
      return;
    }

    Promise.all([fetchAccounts(), fetchTransactions(), fetchDisputes()])
      .then(async ([accountData, transactionData, disputeData]) => {
        const shouldUsePreview = !accountData.length && !transactionData.length && !disputeData.length;
        const previewData = shouldUsePreview ? await loadPreviewWorkspaceData() : null;
        setAccounts(accountData.length ? accountData : previewData?.accounts ?? []);
        setTransactions(transactionData.length ? transactionData : previewData?.transactions ?? []);
        setDisputes(disputeData.length ? disputeData : previewData?.disputes ?? []);
      })
      .catch(async () => {
        const previewData = await loadPreviewWorkspaceData();
        setAccounts(previewData?.accounts ?? []);
        setTransactions(previewData?.transactions ?? []);
        setDisputes(previewData?.disputes ?? []);
        setLastEvent(previewData ? "Secure review workspace ready while API is offline" : "Review API is unavailable");
      })
      .finally(() => setIsLoading(false));
  }, [isAuditor, user]);

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

  const selectedAuditorCustomer = useMemo(() => {
    return (
      auditorCustomers.find((customer) => customer.id === selectedAuditorCustomerId) ??
      auditorCustomers[0] ??
      null
    );
  }, [auditorCustomers, selectedAuditorCustomerId]);

  const selectedAuditorTransactions = useMemo(() => {
    return selectedAuditorCustomer?.accounts.flatMap((account) => account.transactions) ?? [];
  }, [selectedAuditorCustomer]);

  const selectedAuditorDisputes = useMemo(() => {
    return selectedAuditorTransactions
      .map((transaction) => transaction.dispute)
      .filter((dispute): dispute is AuditorDispute => Boolean(dispute));
  }, [selectedAuditorTransactions]);

  const auditorTotals = useMemo(() => {
    return auditorCustomers.reduce(
      (totals, customer) => ({
        users: totals.users + 1,
        accounts: totals.accounts + customer.summary.accountCount,
        transactions: totals.transactions + customer.summary.transactionCount,
        reviews: totals.reviews + customer.summary.reviewCount,
        openCases: totals.openCases + customer.summary.openDisputeCount,
        balance: totals.balance + customer.summary.totalBalance,
      }),
      { users: 0, accounts: 0, transactions: 0, reviews: 0, openCases: 0, balance: 0 },
    );
  }, [auditorCustomers]);

  const displayUserName = useMemo(() => {
    if (!user) return "";
    return user.name;
  }, [user]);

  const displayUserEmail = useMemo(() => {
    return formatDisplayEmail(user?.email);
  }, [user]);

  const userInitials = useMemo(() => {
    if (!user) return "FG";
    const parts = displayUserName.trim().split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : displayUserName.slice(0, 2)).toUpperCase();
  }, [displayUserName, user]);

  const profileHandle = useMemo(() => {
    if (!user) return "@finguard";
    const base = displayUserName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    return `@${base || "finguard"}`;
  }, [displayUserName, user]);

  const profileMenuItems = useMemo(
    () => [
      { icon: "!", label: "Вхідні", badge: "20", action: () => setLastEvent("Inbox opened") },
      { icon: "i", label: "Особиста інформація", action: () => setIsSettingsOpen(true) },
      { icon: "B", label: "Реквізити рахунку", action: () => setLastEvent(accounts[0]?.accountNumber ?? "Account details") },
      { icon: "R", label: "Безпека", action: () => setIsSettingsOpen(true) },
      { icon: "D", label: "Документи й виписки", action: () => setLastEvent("Documents and statements opened") },
      { icon: "?", label: "Довідка", action: () => setIsChatOpen(true) },
      { icon: "*", label: "Налаштування", action: () => setIsSettingsOpen(true) },
    ],
    [accounts],
  );

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

    try {
      if (authMode === "login") {
        await login({ email, password: authForm.password });
        showToast(c.toast.loginTitle, email);
      } else {
        await register({ name, email, password: authForm.password });
        showToast(c.toast.registerTitle, email);
      }
    } catch {
      setAuthError(c.auth.missingCredentials);
      return;
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
      setLastEvent(`${selectedDispute.reason} marked as ${status}`);
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
        id: `disp_${crypto.randomUUID()}`,
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

  const openSupportChat = () => {
    setIsChatOpen(true);
    setChatError("");
  };

  const acceptCookies = () => {
    setStorageItem(COOKIE_CONSENT_STORAGE_KEY, "accepted");
    setIsCookieVisible(false);
  };

  const submitChatMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const messageText = chatInput.trim();
    if (!messageText || isChatLoading) return;

    const nextMessages: SupportChatMessage[] = [...chatMessages, { role: "user", content: messageText }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatError("");
    setIsChatLoading(true);

    try {
      const { reply } = await sendSupportChatMessage(nextMessages);
      setChatMessages((current) => [...current, { role: "assistant", content: reply }]);
    } catch {
      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: createLocalSupportReply(messageText),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F7F8] text-[#111827]">
      {user ? (
      <header className="site-header">
        <div className="mx-auto grid max-w-[1500px] grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-2 px-4 py-3 sm:px-6 lg:grid-cols-[minmax(15rem,0.72fr)_minmax(24rem,1fr)_auto] lg:grid-rows-[auto_auto_auto] lg:px-10">
          <div className="brand-lockup self-center lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <h1 className="brand-title text-[clamp(2.5rem,3vw,3.75rem)] font-medium leading-none tracking-tight text-[#111827]">
              FinGuard
            </h1>
          </div>

          <div className="hidden items-center justify-end gap-7 text-sm font-normal text-[#4B5563] sm:flex lg:col-start-2 lg:row-start-1 lg:-translate-x-7">
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
            <button className="font-normal" onClick={openSupportChat} type="button">
              {c.help}
            </button>
            <a href="#footer">{c.contact}</a>
          </div>

          <nav className="z-10 hidden items-center justify-center gap-8 text-sm font-semibold text-[#111827] lg:col-span-3 lg:col-start-1 lg:row-start-2 lg:flex xl:gap-10">
            {user ? (
              <>
                <a className="header-nav-link" href="#cabinet">{isAuditor ? "Customers" : c.nav.cabinet}</a>
                <a className="header-nav-link" href="#dashboard">{isAuditor ? "Audit details" : c.dashboard.transactions}</a>
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

          <p className="brand-subtitle col-span-2 text-sm font-normal leading-none text-[#8A8F98] sm:text-base lg:col-span-1 lg:col-start-1 lg:row-start-3">
            {`${c.signedIn} ${displayUserName}`}
          </p>

          <div className="row-span-2 row-start-1 flex items-center justify-end gap-2 lg:col-start-3 lg:row-span-3 lg:row-start-1">
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
              <div>
                <button
                  aria-expanded={isUserMenuOpen}
                  aria-label="Open user menu"
                  className="user-menu-trigger"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsUserMenuOpen(true);
                  }}
                  type="button"
                >
                  <span className="user-avatar">{userInitials}</span>
                </button>
              </div>
            ) : (
              <button className="btn-primary header-login-button" onClick={() => openAuth("login")}>
                {c.auth.login}
              </button>
            )}
          </div>
        </div>

        {isMobileMenuOpen ? (
          <nav className="border-t border-[#C0C7D1] bg-white px-4 py-3 lg:hidden">
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
                    [isAuditor ? "Customers" : c.nav.cabinet, "#cabinet"],
                    [isAuditor ? "Audit details" : c.dashboard.transactions, "#dashboard"],
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
      ) : (
        <div className="air-public-nav" aria-label="Public navigation">
          <div className="air-nav-left">
            <button
              aria-expanded={isMobileMenuOpen}
              aria-label="Open navigation"
              className="air-icon-button air-menu-button"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              type="button"
            >
              <span />
              <span />
            </button>
            <button
              aria-label="Open support"
              className="air-icon-button air-heart-button"
              onClick={openSupportChat}
              type="button"
            >
              {c.nav.support}
            </button>
          </div>
          <button className="air-open-button" onClick={() => openAuth("register")} type="button">
            {c.hero.startDemo}
            <span aria-hidden="true">⌖</span>
          </button>
          {isMobileMenuOpen ? (
            <nav className="air-menu-panel" aria-label="FinGuard public menu">
              <a href="#accounts" onClick={() => setIsMobileMenuOpen(false)}>{c.accountsSection.kicker}</a>
              <a href="#features" onClick={() => setIsMobileMenuOpen(false)}>{c.featuresSection.kicker}</a>
              <a href="#benefits" onClick={() => setIsMobileMenuOpen(false)}>{c.nav.benefits}</a>
              <button onClick={() => openAuth("login")} type="button">{c.auth.login}</button>
              <label>
                <span className="sr-only">Language</span>
                <select
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
            </nav>
          ) : null}
        </div>
      )}

      {user && isAuditor ? (
        <section className="app-shell py-8" id="cabinet">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="dashboard-heading">
              <div>
                <p className="section-kicker">Auditor cabinet</p>
                <h2 className="section-heading">Database users and payment checks</h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[#4B5563]">
                  Select a user from the database table to inspect their accounts, payments, and review cases.
                </p>
              </div>
              <div className="sync-pill">
                <span className="h-2 w-2 rounded-full bg-[#8A8F98]" />
                {isLoading ? "Loading customer data" : lastEvent}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {[
                ["Users", auditorTotals.users.toString()],
                ["Accounts", auditorTotals.accounts.toString()],
                ["Payments", auditorTotals.transactions.toString()],
                ["In review", auditorTotals.reviews.toString()],
                ["Open cases", auditorTotals.openCases.toString()],
                ["Total balance", formatCurrency(auditorTotals.balance, "EUR")],
              ].map(([label, value]) => (
                <div className="auditor-metric" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-6" id="dashboard">
              <section className="bank-panel">
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-xl font-black">Users from database</h3>
                    <p className="mt-1 text-sm text-[#8A8F98]">
                      Select a row to verify the user's payment history.
                    </p>
                  </div>
                  <span className="badge border-[#C0C7D1] bg-[#E5E7EB] text-[#4B5563]">auditor access</span>
                </div>

                <div className="auditor-table-wrap">
                  <table className="auditor-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Created</th>
                        <th>Accounts</th>
                        <th>Payments</th>
                        <th>Review</th>
                        <th>Open cases</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditorCustomers.map((customer) => (
                        <tr
                          className={selectedAuditorCustomer?.id === customer.id ? "selected" : ""}
                          key={customer.id}
                          onClick={() => setSelectedAuditorCustomerId(customer.id)}
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedAuditorCustomerId(customer.id);
                            }
                          }}
                        >
                          <td>
                            <strong>{customer.name}</strong>
                            <small>{customer.id}</small>
                          </td>
                          <td>{formatDisplayEmail(customer.email)}</td>
                          <td>{formatTime(customer.createdAt)}</td>
                          <td>{customer.summary.accountCount}</td>
                          <td>{customer.summary.transactionCount}</td>
                          <td>{customer.summary.reviewCount}</td>
                          <td>{customer.summary.openDisputeCount}</td>
                          <td>{formatCurrency(customer.summary.totalBalance, "EUR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {selectedAuditorCustomer ? (
                <>
                  <section className="bank-panel">
                    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <p className="section-kicker">Selected user</p>
                        <h3 className="mt-2 text-2xl font-black">{selectedAuditorCustomer.name}</h3>
                        <p className="mt-1 text-sm font-semibold text-[#4B5563]">
                          {formatDisplayEmail(selectedAuditorCustomer.email)}
                        </p>
                      </div>
                      <span className="badge border-[#C0C7D1] bg-[#E5E7EB] text-[#4B5563]">
                        {selectedAuditorTransactions.length} payments loaded
                      </span>
                    </div>

                    <div className="auditor-table-wrap">
                      <table className="auditor-table compact">
                        <thead>
                          <tr>
                            <th>Account number</th>
                            <th>Status</th>
                            <th>Opened</th>
                            <th>Balance</th>
                            <th>Payments</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAuditorCustomer.accounts.map((account) => (
                            <tr key={account.id}>
                              <td>
                                <strong>{account.accountNumber}</strong>
                                <small>{account.id}</small>
                              </td>
                              <td>
                                <span className={`badge ${statusStyles[account.status === "active" ? "completed" : "pending"]}`}>
                                  {statusLabel(account.status)}
                                </span>
                              </td>
                              <td>{formatTime(account.createdAt)}</td>
                              <td>{formatCurrency(account.balance, account.currency)}</td>
                              <td>{account.transactions.length}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="bank-panel">
                    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h3 className="text-xl font-black">Payment verification table</h3>
                        <p className="mt-1 text-sm text-[#8A8F98]">
                          Full payment activity for the selected database user.
                        </p>
                      </div>
                      <span className="badge border-[#C0C7D1] bg-[#E5E7EB] text-[#4B5563]">
                        {selectedAuditorCustomer.summary.reviewCount} require review
                      </span>
                    </div>

                    <div className="auditor-table-wrap">
                      <table className="auditor-table">
                        <thead>
                          <tr>
                            <th>Payment</th>
                            <th>Account</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Case</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAuditorTransactions.map((transaction) => (
                            <tr key={transaction.id}>
                              <td>
                                <strong>{transaction.description}</strong>
                                <small>{transaction.id}</small>
                              </td>
                              <td>{transaction.accountNumber}</td>
                              <td>{formatTime(transaction.createdAt)}</td>
                              <td>{formatCurrency(transaction.amount, transaction.currency)}</td>
                              <td>
                                <span className={`badge ${statusStyles[transaction.status]}`}>
                                  {statusLabel(transaction.status)}
                                </span>
                              </td>
                              <td>
                                {transaction.dispute ? (
                                  <span className={`badge ${statusStyles[transaction.dispute.status]}`}>
                                    {statusLabel(transaction.dispute.status)}
                                  </span>
                                ) : (
                                  <span className="text-sm font-bold text-[#8A8F98]">No case</span>
                                )}
                              </td>
                              <td>{transaction.dispute?.reason ?? "Verified payment"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="bank-panel">
                    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h3 className="text-xl font-black">Review cases table</h3>
                        <p className="mt-1 text-sm text-[#8A8F98]">
                          Disputes and flagged payments connected to this user.
                        </p>
                      </div>
                      <span className="badge border-[#C0C7D1] bg-[#E5E7EB] text-[#4B5563]">
                        {selectedAuditorDisputes.length} cases
                      </span>
                    </div>

                    <div className="auditor-table-wrap">
                      <table className="auditor-table compact">
                        <thead>
                          <tr>
                            <th>Case ID</th>
                            <th>Payment ID</th>
                            <th>Account</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Reason</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAuditorDisputes.map((dispute) => {
                            const transaction = selectedAuditorTransactions.find((item) => item.id === dispute.transactionId);
                            return (
                              <tr key={dispute.id}>
                                <td>
                                  <strong>{dispute.id}</strong>
                                  <small>{formatTime(dispute.createdAt)}</small>
                                </td>
                                <td>{dispute.transactionId}</td>
                                <td>{transaction?.accountNumber ?? "Unknown"}</td>
                                <td>{transaction ? formatCurrency(transaction.amount, transaction.currency) : "Unknown"}</td>
                                <td>
                                  <span className={`badge ${statusStyles[dispute.status]}`}>
                                    {statusLabel(dispute.status)}
                                  </span>
                                </td>
                                <td>{dispute.reason}</td>
                                <td>{dispute.notes ?? "No notes"}</td>
                              </tr>
                            );
                          })}
                          {selectedAuditorDisputes.length === 0 ? (
                            <tr>
                              <td colSpan={7}>No review cases for this user.</td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              ) : (
                <section className="bank-panel">
                  <h3 className="text-xl font-black">No user selected</h3>
                  <p className="mt-2 text-sm text-[#8A8F98]">Choose a user from the table to view payment details.</p>
                </section>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {user && !isAuditor ? (
        <section className="desktop-bank-shell" id="cabinet">
          <div className="mx-auto grid min-h-[calc(100vh-92px)] max-w-[1440px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
            <div className="bank-laptop-main">
              <div className="bank-dashboard-topbar">
                <div className="flex items-center gap-4">
                  <span className="user-avatar large">{userInitials}</span>
                  <div>
                    <p className="text-sm font-semibold text-white/60">Welcome back</p>
                    <h2 className="text-2xl font-semibold leading-tight text-white">{displayUserName}</h2>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button className="bank-top-icon" onClick={openSupportChat} type="button">
                    <span aria-hidden="true">?</span>
                    <span className="sr-only">Open support</span>
                  </button>
                  <button className="bank-top-icon" onClick={() => setIsSettingsOpen(true)} type="button">
                    <span aria-hidden="true">⚙</span>
                    <span className="sr-only">Open settings</span>
                  </button>
                  <span className="bank-status-pill">{isLoading ? "Syncing" : "Protected"}</span>
                </div>
              </div>

              <section className="bank-hero-card">
                <div className="bank-hero-balance">
                  <button aria-label="Add money" className="bank-round-plus" type="button">+</button>
                  <div>
                    <p>Total balance</p>
                    <strong>{formatCurrency(accounts.reduce((sum, account) => sum + account.balance, 0), accounts[0]?.currency ?? "EUR")}</strong>
                  </div>
                </div>

                <div className="bank-card-stage">
                  <article className="bank-card-visual" aria-label="FinGuard Visa card">
                    <div className="flex items-start justify-between">
                      <span>FinGuard</span>
                      <span>VISA</span>
                    </div>
                    <div className="mt-auto">
                      <p>4441 **** **** 8430</p>
                      <small>{accounts[0]?.accountNumber ?? "FG-00000000"}</small>
                    </div>
                  </article>
                </div>

                <div className="bank-card-switch">
                  <span aria-hidden="true">▣</span>
                  All cards
                </div>
              </section>

              <div className="bank-action-row" aria-label="Quick banking actions">
                {[
                  { label: "Card transfer", icon: "▰", action: () => setLastEvent("Card transfer selected") },
                  { label: "IBAN payment", icon: "▤", action: () => setLastEvent("IBAN payment selected") },
                  { label: "Other payments", icon: "▥", action: () => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" }) },
                ].map(({ label, icon, action }) => (
                  <button className="bank-action-button" key={label} onClick={action} type="button">
                    <span>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              <section className="bank-operations-panel">
                <div className="flex items-center justify-between gap-4">
                  <h3>Operations</h3>
                  <a href="#dashboard">All</a>
                </div>
                <div className="mt-4 divide-y divide-white/10">
                  {transactions.slice(0, 4).map((txn) => (
                    <article className="bank-operation-row" key={txn.id}>
                      <div className="bank-operation-icon">{txn.description.slice(0, 1).toUpperCase()}</div>
                      <div className="min-w-0 flex-1">
                        <p>{txn.description}</p>
                        <span>{formatTime(txn.createdAt)} · {txn.id}</span>
                      </div>
                      <div className="text-right">
                        <strong>-{formatCurrency(txn.amount, txn.currency)}</strong>
                        <span className={`badge mt-2 ${statusStyles[txn.status]}`}>{statusLabel(txn.status)}</span>
                      </div>
                    </article>
                  ))}
                  {transactions.length === 0 ? (
                    <p className="py-8 text-sm font-semibold text-white/55">{c.cabinet.noTransactions}</p>
                  ) : null}
                </div>
              </section>
            </div>

            <aside className="bank-laptop-sidebar">
              <section className="bank-sidebar-panel">
                <p className="bank-sidebar-label">Account health</p>
                <h3>Secure session active</h3>
                <div className="mt-5 grid gap-3">
                  {[
                    [c.dashboard.sessionSecure, "Active"],
                    [c.dashboard.databaseConnected, accounts.length ? "Online" : "Ready"],
                    [c.dashboard.apiReady, isLoading ? "Syncing" : "Ready"],
                  ].map(([label, value]) => (
                    <div className="bank-health-row" key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bank-sidebar-panel">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="bank-sidebar-label">Digital card</p>
                    <h3>{c.app.virtualCard}</h3>
                  </div>
                  <span className="bank-mini-badge">{c.app.protected}</span>
                </div>
                <div className="bank-mini-card">
                  <span>•••• 2480</span>
                  <strong>{c.app.cardReady}</strong>
                </div>
              </section>

              <section className="bank-sidebar-panel">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="bank-sidebar-label">Review cases</p>
                    <h3>{disputes.filter((item) => item.status !== "resolved").length} open</h3>
                  </div>
                  <a className="bank-sidebar-link" href="#dashboard">View</a>
                </div>
                <div className="mt-4 space-y-3">
                  {disputes.slice(0, 3).map((item) => (
                    <button
                      className="bank-case-row"
                      key={item.id}
                      onClick={() => {
                        setSelectedDisputeId(item.id);
                        document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      type="button"
                    >
                      <span>
                        <strong>{item.reason}</strong>
                        <small>{item.transactionId}</small>
                      </span>
                      <span className={`badge ${statusStyles[item.status]}`}>{statusLabel(item.status)}</span>
                    </button>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </section>
      ) : null}

      {!user ? (
        <>
          <section className="air-hero">
            <div className="air-hero-slogan">{c.hero.title}</div>
            <div className="air-hero-letters" aria-label="FinGuard">
              <span>F</span>
              <img className="air-hero-letter-image air-hero-letter-image-percent" src={girlWithCardImage} alt="" aria-hidden="true" />
              <span>G</span>
              <img className="air-hero-letter-image air-hero-letter-image-cards" src={boyWithCardImage} alt="" aria-hidden="true" />
              <span>B</span>
            </div>
            {isCookieVisible ? (
              <div className="air-cookie">
                {c.cookie.text} <strong>{c.cookie.label}</strong>
                <button onClick={acceptCookies} type="button">{c.cookie.accept}</button>
              </div>
            ) : null}
            <a className="air-scroll" href="#accounts" aria-label="Scroll down">↓</a>
          </section>

          <section className="air-photo-section" id="accounts">
            <div className="air-word-row" aria-hidden="true">
              <span>{c.accountsSection.kicker}</span>
            </div>
            <p className="air-center-copy">
              {c.hero.text}
            </p>
            <div className="air-split">
              <div className="air-split-copy">
                <h2>
                  {c.accountsSection.title}
                </h2>
                <p>{c.accountsSection.text}</p>
                <div className="air-proof-list">
                  {c.benefits.map((item) => (
                    <article key={item.title}>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </article>
                  ))}
                </div>
              </div>
              <div className="air-glass-image">
                <img alt="Secure banking operations building exterior" src={bankImage} />
              </div>
            </div>
            <button className="air-inline-card" onClick={() => openAuth("register")} type="button">
              {c.hero.startDemo}
              <span aria-hidden="true">⌖</span>
            </button>
          </section>

          <section className="air-white-feature" id="features">
            <div className="air-word-row">
              <span>{c.featuresSection.title}</span>
            </div>
            <p className="air-center-copy">
              {c.featuresSection.text}
            </p>
            <div className="air-wide-image">
              <img alt="Secure banking architecture against blue sky" src={heroBankImage} />
            </div>
          </section>

          <section className="air-dark-section" id="benefits">
            <Suspense fallback={null}>
              <BankArchitectureScene tone="dark" />
            </Suspense>
            <div className="air-dark-grid">
              {[
                ["1", "MIN", "FLAG RISK"],
                ["3", "MIN", "OPEN CASE"],
                ["7", "MIN", "AI REVIEW"],
                ["11", "MIN", "EXPORT EVIDENCE"],
              ].map(([value, unit, label]) => (
                <article className="air-dark-card" key={label}>
                  <strong>{value}</strong>
                  <span>{unit}</span>
                  <p>{label}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="air-black-info">
            <div className="air-black-image">
              <img alt="Secure banking architecture in dark tones" src={safetyImage} />
            </div>
            <div className="air-black-copy">
              <h2>
                {c.cta.title}
              </h2>
              <button className="air-dark-link" onClick={() => openSupportChat()} type="button">
                {c.hero.viewFeatures}
                <span aria-hidden="true">⌖</span>
              </button>
              <p>
                {c.footer.text}
              </p>
            </div>
          </section>
        </>
      ) : null}

      {user && !isAuditor ? (
      <section className="section bg-[#E5E7EB]" id="dashboard">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="dashboard-heading">
            <div>
              <p className="section-kicker">{user ? c.dashboard.userKicker : c.dashboard.demoKicker}</p>
              <h2 className="section-heading">
                {user ? `${displayUserName}${c.dashboard.userTitleSuffix}` : c.dashboard.demoTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#4B5563]">
                {user ? c.dashboard.userText : c.dashboard.demoText}
              </p>
            </div>
            <div className="sync-pill">
              <span className="h-2 w-2 rounded-full bg-[#8A8F98]" />
              {isLoading ? c.dashboard.syncing : lastEvent}
            </div>
          </div>

          {user ? (
            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="text-xl font-black">{c.cabinet.bankAccounts}</h3>
                <span className="text-sm font-bold text-[#8A8F98]">
                  {accounts.length} {c.dashboard.activeRecords}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {accounts.map((account) => (
                  <article className="account-summary-card" key={account.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#4B5563]">
                          {c.cabinet.currentAccount}
                        </p>
                        <h4 className="mt-2 text-xl font-black">{account.accountNumber}</h4>
                      </div>
                      <span className={`badge ${statusStyles[account.status === "active" ? "completed" : "pending"]}`}>
                        {statusLabel(account.status)}
                      </span>
                    </div>
                    <p className="mt-6 text-sm font-bold text-[#8A8F98]">{c.cabinet.availableBalance}</p>
                    <p className="mt-1 text-3xl font-black">{formatCurrency(account.balance, account.currency)}</p>
                    <p className="mt-4 text-sm text-[#8A8F98]">
                      {c.dashboard.opened} {formatTime(account.createdAt)}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <div className="mt-8 rounded border border-[#C0C7D1] bg-[#E5E7EB] p-5">
              <h3 className="text-xl font-black">{c.dashboard.loginPrompt}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[#4B5563]">
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
                <p className="mt-1 text-sm text-[#8A8F98]">{c.dashboard.transactionsHelp}</p>
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
                    <tr className="border-b border-[#C0C7D1] text-xs uppercase tracking-wide text-[#8A8F98]">
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
                          <p className="text-xs text-[#8A8F98]">
                            {txn.id}
                            {txn.accountNumber ? ` · ${txn.accountNumber}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-[#4B5563]">{formatTime(txn.createdAt)}</td>
                        <td className="px-4 py-4 font-black">{formatCurrency(txn.amount, txn.currency)}</td>
                        <td className="py-4 pl-4">
                          <span className={`badge ${statusStyles[txn.status]}`}>{statusLabel(txn.status)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTransactions.length === 0 ? (
                  <div className="py-10 text-center text-sm font-bold text-[#8A8F98]">
                    {c.dashboard.noMatches}
                  </div>
                ) : null}
              </div>
            </section>

            <aside className="bank-panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">{c.disputes.title}</h3>
                  <p className="mt-1 text-sm text-[#8A8F98]">{c.disputes.text}</p>
                </div>
                <button className="btn-small" onClick={downloadEvidence} type="button">
                  {c.disputes.export}
                </button>
              </div>
              {user ? (
                <form className="mt-5 rounded border border-[#C0C7D1] bg-[#E5E7EB] p-4" onSubmit={submitDispute}>
                  <h4 className="text-sm font-black">{c.disputes.create}</h4>
                  <label className="mt-3 block">
                    <span className="text-xs font-bold text-[#4B5563]">{c.disputes.transaction}</span>
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
                    <span className="text-xs font-bold text-[#4B5563]">{c.disputes.reason}</span>
                    <input
                      className="control-input mt-2"
                      onChange={(event) => setDisputeForm((current) => ({ ...current, reason: event.target.value }))}
                      placeholder={c.disputes.reasonPlaceholder}
                      type="text"
                      value={disputeForm.reason}
                    />
                  </label>
                  {disputeError ? <p className="mt-3 text-xs font-bold text-[#4B5563]">{disputeError}</p> : null}
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
                      <p className="mt-1 text-sm text-[#8A8F98]">
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
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#4B5563]">
                      {c.disputes.selected}
                    </p>
                    <h4 className="mt-2 text-lg font-black">{selectedDispute.reason}</h4>
                    <p className="mt-1 text-sm text-[#8A8F98]">{selectedDispute.id}</p>
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
      ) : null}

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

      {isChatOpen ? (
        <section className="support-chat" aria-label={c.chat.title}>
          <div className="support-chat-header">
            <div>
              {c.chat.subtitle ? (
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#4B5563]">{c.chat.subtitle}</p>
              ) : null}
              <h2 className="mt-1 text-xl font-black text-[#111827]">{c.chat.title}</h2>
            </div>
            <button
              aria-label={c.chat.close}
              className="support-chat-close"
              onClick={() => setIsChatOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>

          <div className="support-chat-body">
            <div className="chat-bubble assistant">{c.chat.welcome}</div>
            {chatMessages.map((message, index) => (
              <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}>
                {message.content}
              </div>
            ))}
            {isChatLoading ? <div className="chat-bubble assistant muted">{c.chat.thinking}</div> : null}
            {chatError ? <p className="chat-error">{chatError}</p> : null}
          </div>

          <form className="support-chat-form" onSubmit={submitChatMessage}>
            <input
              className="support-chat-input"
              onChange={(event) => setChatInput(event.target.value)}
              placeholder={c.chat.placeholder}
              value={chatInput}
            />
            <button className="support-chat-send" disabled={!chatInput.trim() || isChatLoading} type="submit">
              {c.chat.send}
            </button>
          </form>
        </section>
      ) : null}

      {isUserMenuOpen && user ? (
        <div className="profile-menu-overlay" role="dialog" aria-modal="true" aria-label="User profile menu">
          <section className="profile-menu-panel">
            <div className="profile-menu-topbar">
              <button
                aria-label="Close user menu"
                className="profile-close-button"
                onClick={() => setIsUserMenuOpen(false)}
                type="button"
              >
                ×
              </button>
              <div className="profile-top-name">{displayUserName}</div>
              <button
                className="profile-upgrade-button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setLastEvent("Advanced access selected");
                }}
                type="button"
              >
                <span aria-hidden="true">◇</span>
                Покращити
              </button>
            </div>

            <div className="profile-identity">
              <span className="profile-photo" aria-hidden="true">{userInitials}</span>
              <h2>{displayUserName}</h2>
              <p>{profileHandle} · {displayUserEmail}</p>
            </div>

            <button
              className="profile-premium-card"
              onClick={() => {
                setIsUserMenuOpen(false);
                setLastEvent("Advanced access benefits opened");
              }}
              type="button"
            >
              <span>
                <strong>Advanced</strong>
                <small>Розширені можливості ›</small>
              </span>
              <span className="profile-card-stack" aria-hidden="true">
                <span />
                <span />
              </span>
            </button>

            <div className="profile-action-card" role="menu">
              {profileMenuItems.map((item) => (
                <button
                  className="profile-action-row"
                  key={item.label}
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    item.action();
                  }}
                  role="menuitem"
                  type="button"
                >
                  <span className="profile-action-icon" aria-hidden="true">{item.icon}</span>
                  <span className="profile-action-label">{item.label}</span>
                  {item.badge ? <span className="profile-action-badge">{item.badge}</span> : null}
                </button>
              ))}
            </div>

            <button
              className="profile-logout-row"
              onClick={() => {
                setIsUserMenuOpen(false);
                logout();
              }}
              type="button"
            >
              <span className="profile-action-icon" aria-hidden="true">↪</span>
              <span>Вийти</span>
            </button>

            <p className="profile-version">
              Версія 10.136<br />
              FinGuard Bank UAB (Irish Branch)<br />
              Останній вхід: 9 лип. 2026 р., 22:50
            </p>
          </section>
        </div>
      ) : null}

      {isSettingsOpen && user ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6" role="dialog" aria-modal="true">
          <section className="w-full max-w-lg rounded border border-[#C0C7D1] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">{c.profile.settings}</p>
                <h2 className="mt-2 text-2xl font-black">{c.profile.profileSecurity}</h2>
              </div>
              <button
                aria-label="Close settings"
                className="grid h-10 w-10 place-items-center rounded border border-[#C0C7D1] text-xl font-black text-[#4B5563] transition hover:bg-[#E5E7EB]"
                onClick={() => setIsSettingsOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="detail-row">
                <dt>{c.profile.name}</dt>
                <dd>{displayUserName}</dd>
              </div>
              <div className="detail-row">
                <dt>{c.profile.email}</dt>
                <dd>{displayUserEmail}</dd>
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
                      <span className="mt-1 block text-sm leading-6 text-[#8A8F98]">{text}</span>
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

            <div className="mt-6 rounded border border-[#C0C7D1] bg-[#E5E7EB] p-4 text-sm leading-7 text-[#111827]">
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
          <section className="w-full max-w-md rounded border border-[#C0C7D1] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">{authMode === "login" ? c.auth.secureAccess : c.auth.newAccount}</p>
                <h2 className="mt-2 text-2xl font-black text-[#111827]">
                  {authMode === "login" ? c.auth.loginTitle : c.auth.registerTitle}
                </h2>
              </div>
              <button
                aria-label="Close auth form"
                className="grid h-10 w-10 place-items-center rounded border border-[#C0C7D1] text-xl font-black text-[#4B5563] transition hover:bg-[#E5E7EB]"
                onClick={() => setIsAuthOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 rounded border border-[#C0C7D1] bg-[#E5E7EB] p-1">
              <button
                className={`rounded px-4 py-2 text-sm font-black ${
                  authMode === "login" ? "bg-white text-[#4B5563] shadow-sm" : "text-[#4B5563]"
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
                  authMode === "register" ? "bg-white text-[#4B5563] shadow-sm" : "text-[#4B5563]"
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
              {authMode === "login" && isPreviewAccessEnabled ? (
                <div className="rounded border border-[#C0C7D1] bg-[#F9FAFB] p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-[#4B5563]">{c.auth.demoAccess}</p>
                  <div className="mt-3 grid gap-2">
                    {previewProfiles.map((profile) => (
                      <button
                        className="flex min-h-12 items-center justify-between gap-3 rounded border border-[#C0C7D1] bg-white px-3 text-left text-sm transition hover:border-[#8A8F98] hover:bg-[#E5E7EB]"
                        key={profile.email}
                        onClick={() => {
                          try {
                            startPreviewSession(profile);
                            showToast(c.toast.loginTitle, profile.email);
                            setAuthForm(initialAuthForm);
                            setAuthError("");
                            setIsAuthOpen(false);
                          } catch {
                            setAuthError(c.auth.missingCredentials);
                          }
                        }}
                        type="button"
                      >
                        <span>
                          <span className="block font-black text-[#111827]">{profile.label}</span>
                          <span className="block break-all text-xs font-semibold text-[#4B5563]">
                            Secure profile access
                          </span>
                        </span>
                        <span className="shrink-0 rounded border border-[#C0C7D1] px-2 py-1 text-xs font-black text-[#4B5563]">
                          {c.auth.fillDemo}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {authMode === "register" ? (
                <label className="block">
                  <span className="text-sm font-bold text-[#4B5563]">{c.auth.fullName}</span>
                  <input
                    className="mt-2 min-h-12 w-full rounded border border-[#C0C7D1] px-4 text-base outline-none transition focus:border-[#4B5563] focus:ring-4 focus:ring-[#C0C7D1]"
                    onChange={(event) => updateAuthField("name", event.target.value)}
                    placeholder="Emma Murphy"
                    type="text"
                    value={authForm.name}
                  />
                </label>
              ) : null}

              <label className="block">
                <span className="text-sm font-bold text-[#4B5563]">{c.auth.email}</span>
                <input
                  className="mt-2 min-h-12 w-full rounded border border-[#C0C7D1] px-4 text-base outline-none transition focus:border-[#4B5563] focus:ring-4 focus:ring-[#C0C7D1]"
                  onChange={(event) => updateAuthField("email", event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={authForm.email}
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-[#4B5563]">{c.auth.password}</span>
                <input
                  className="mt-2 min-h-12 w-full rounded border border-[#C0C7D1] px-4 text-base outline-none transition focus:border-[#4B5563] focus:ring-4 focus:ring-[#C0C7D1]"
                  onChange={(event) => updateAuthField("password", event.target.value)}
                  placeholder={c.auth.minPassword}
                  type="password"
                  value={authForm.password}
                />
              </label>

              {authMode === "register" ? (
                <label className="block">
                  <span className="text-sm font-bold text-[#4B5563]">{c.auth.confirmPassword}</span>
                  <input
                    className="mt-2 min-h-12 w-full rounded border border-[#C0C7D1] px-4 text-base outline-none transition focus:border-[#4B5563] focus:ring-4 focus:ring-[#C0C7D1]"
                    onChange={(event) => updateAuthField("confirmPassword", event.target.value)}
                    placeholder={c.auth.repeatPassword}
                    type="password"
                    value={authForm.confirmPassword}
                  />
                </label>
              ) : null}

              {authError ? (
                <p className="rounded border border-[#C0C7D1] bg-[#E5E7EB] px-4 py-3 text-sm font-bold text-[#111827]">
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
            <p className="mt-1 text-sm text-[#4B5563]">{toast.message}</p>
          </div>
          <button className="toast-close" onClick={() => setToast(null)} type="button">
            {c.toast.dismiss}
          </button>
        </div>
      ) : null}

      <footer className="metallic-footer text-white" id="footer">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
          <div className="md:col-span-2">
            <h2 className="brand-title text-2xl font-black text-white">FinGuard</h2>
            <p className="mt-3 max-w-md leading-7 text-[#C0C7D1]">
              {c.footer.text}
            </p>
          </div>
          <div>
            <h3 className="font-black">{c.footer.banking}</h3>
            <ul className="mt-4 space-y-3 text-sm text-[#C0C7D1]">
              <li>{c.footer.currentAccounts}</li>
              <li>{c.footer.cards}</li>
              <li>{c.footer.payments}</li>
            </ul>
          </div>
          <div>
            <h3 className="font-black">{c.footer.support}</h3>
            <ul className="mt-4 space-y-3 text-sm text-[#C0C7D1]">
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
