import { FormEvent, useEffect, useMemo, useState } from "react";
import heroImage from "./assets/finguard-hero-green.png";
import { useAuth } from "./hooks/useAuth";
import { useSocket } from "./hooks/useSocket";
import { fetchTransactions, fetchDisputes, updateDisputeStatus as saveDisputeStatus } from "./services/api";

type TransactionStatus = "pending" | "completed" | "review";
type DisputeStatus = "open" | "resolved" | "escalated";

type Transaction = {
  id: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  createdAt: string;
  description: string;
};

type Dispute = {
  id: string;
  transactionId: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
};

const demoTransactions: Transaction[] = [
  {
    id: "txn_001",
    amount: 48.75,
    currency: "EUR",
    status: "review",
    createdAt: new Date().toISOString(),
    description: "Refund request for duplicate charge",
  },
  {
    id: "txn_002",
    amount: 12.5,
    currency: "EUR",
    status: "completed",
    createdAt: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
    description: "Merchant settlement",
  },
  {
    id: "txn_003",
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
    reason: "Duplicate payment",
    status: "open",
    createdAt: new Date().toISOString(),
  },
  {
    id: "disp_002",
    transactionId: "txn_003",
    reason: "Unusual transfer pattern",
    status: "escalated",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
];

const statusStyles: Record<TransactionStatus | DisputeStatus, string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  pending: "border-gray-200 bg-gray-50 text-gray-800",
  review: "border-green-200 bg-green-50 text-green-800",
  open: "border-green-200 bg-green-50 text-green-800",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  escalated: "border-gray-300 bg-gray-100 text-gray-900",
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
    question: "Can FinGuard AI work without the backend running?",
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

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    Promise.all([fetchTransactions(), fetchDisputes()])
      .then(([transactionData, disputeData]) => {
        setTransactions(transactionData.length ? transactionData : demoTransactions);
        setDisputes(disputeData.length ? disputeData : demoDisputes);
      })
      .catch(() => {
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

    return [
      { label: "Items to review", value: reviewCount.toString() },
      { label: "Protected volume", value: formatCurrency(volume, "EUR") },
      { label: "Open cases", value: activeDisputes.toString() },
    ];
  }, [transactions, disputes]);

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
      setAuthError("Please enter your email and password.");
      return;
    }

    if (authMode === "register" && !name) {
      setAuthError("Please enter your full name.");
      return;
    }

    if (authForm.password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }

    if (authMode === "register" && authForm.password !== authForm.confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    if (authMode === "login") {
      await login({ email, password: authForm.password });
    } else {
      await register({ name, email, password: authForm.password });
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
    } catch {
      setDisputes((current) =>
        current.map((item) => (item.id === selectedDispute.id ? { ...item, status } : item)),
      );
      setLastEvent(`${selectedDispute.reason} marked as ${status} in demo mode`);
    }
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
  };

  const handleServiceClick = (service: string) => {
    if (service === "Download statements") {
      downloadEvidence();
      return;
    }

    if (service === "Contact support") {
      document.getElementById("support")?.scrollIntoView({ behavior: "smooth" });
      setLastEvent("Support questions opened");
      return;
    }

    document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" });
    setLastEvent(`${service} selected`);
  };

  return (
    <main className="min-h-screen bg-white text-[#101010]">
      <div className="h-2 bg-[#00843d]" />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs font-semibold text-slate-600 sm:px-6 lg:px-8">
          <div className="flex gap-5">
            <span>Personal</span>
            <span>Business</span>
            <span>Support</span>
          </div>
          <div className="hidden gap-5 sm:flex">
            <span>Help centre</span>
            <span>Contact us</span>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="brand-mark">FG</div>
            <div>
              <h1 className="text-xl font-black tracking-tight">FinGuard AI</h1>
              <p className="text-xs font-semibold text-slate-500">Secure banking intelligence</p>
            </div>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-bold text-[#101010] lg:flex">
            <a href="#accounts">Accounts</a>
            <a href="#features">Features</a>
            <a href="#benefits">Benefits</a>
            <a href="#dashboard">Demo dashboard</a>
            <a href="#support">Support</a>
          </nav>
          {user ? (
            <button className="btn-outline" onClick={logout}>
              Sign out
            </button>
          ) : (
            <button className="btn-primary" onClick={() => openAuth("login")}>
              Log in
            </button>
          )}
        </div>
      </header>

      <section className="hero-section">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-14">
          <div>
            <p className="breadcrumb">Home / Accounts / Protection</p>
            <h2 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Keep every account safer with AI-powered dispute protection
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">
              FinGuard AI helps digital banking teams spot risky activity, manage disputes, and prepare evidence with
              clear, confident workflows.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn-primary" onClick={() => openAuth("login")}>
                Start demo
              </button>
              <button className="btn-white" onClick={() => openAuth("register")}>
                Create account
              </button>
              <a className="btn-white" href="#features">
                View features
              </a>
            </div>
          </div>
          <div className="hero-image-wrap">
            <img alt="FinGuard secure banking dashboard preview" className="hero-image" src={heroImage} />
          </div>
        </div>
      </section>

      <section className="bg-gray-50">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-4 lg:px-8">
          {quickLinks.map((item) => (
            <a className="quick-link" href="#features" key={item}>
              {item}
              <span aria-hidden="true">›</span>
            </a>
          ))}
        </div>
      </section>

      <section className="section" id="accounts">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <p className="section-kicker">Banking made clearer</p>
              <h2 className="section-heading">Accounts and card services with protection built in</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                A React-powered banking experience for customers who want simple account tools and smart protection in
                one place.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {accountCards.map((item) => (
                <article className="account-card" key={item.title}>
                  <h3 className="text-xl font-black">{item.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
                  <a className="mt-5 inline-flex text-sm font-black text-[#00843d]" href="#dashboard">
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
          <div className="max-w-3xl">
            <p className="section-kicker">Features and benefits</p>
            <h2 className="section-heading">Designed for modern banking protection</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              A calm, practical experience for teams who need fast answers, consistent decisions, and a complete view of
              each customer case.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {benefits.map((item, index) => (
              <article className="benefit-card" key={item.title}>
                <div className="benefit-icon">{index + 1}</div>
                <h3 className="mt-5 text-xl font-black">{item.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="section-kicker">Popular services</p>
              <h2 className="section-heading">What would you like to do today?</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {serviceTiles.map((item) => (
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
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#8ee3a9]">Why teams choose it</p>
            <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
              Less manual checking. More time for the cases that matter.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {stats.map((item) => (
              <div className="stat-tile" key={item.label}>
                <p className="text-sm font-semibold text-slate-200">{item.label}</p>
                <p className="mt-2 text-3xl font-black text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-gray-50" id="dashboard">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="dashboard-heading">
            <div>
              <p className="section-kicker">Demo dashboard</p>
              <h2 className="section-heading">Account activity under review</h2>
            </div>
            <div className="sync-pill">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {isLoading ? "Syncing" : lastEvent}
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <section className="bank-panel">
              <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
                <label className="block">
                  <span className="sr-only">Search transactions</span>
                  <input
                    className="control-input"
                    onChange={(event) => setTransactionSearch(event.target.value)}
                    placeholder="Search by transaction, status, or ID"
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
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-3 pr-4">Transaction</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="py-3 pl-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((txn) => (
                      <tr key={txn.id}>
                        <td className="py-4 pr-4">
                          <p className="font-bold">{txn.description}</p>
                          <p className="text-xs text-slate-500">{txn.id}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{formatTime(txn.createdAt)}</td>
                        <td className="px-4 py-4 font-black">{formatCurrency(txn.amount, txn.currency)}</td>
                        <td className="py-4 pl-4">
                          <span className={`badge ${statusStyles[txn.status]}`}>{txn.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTransactions.length === 0 ? (
                  <div className="py-10 text-center text-sm font-bold text-gray-500">
                    No transactions match this search.
                  </div>
                ) : null}
              </div>
            </section>

            <aside className="bank-panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">Dispute support</h3>
                  <p className="mt-1 text-sm text-gray-500">Open a case to review evidence and update status.</p>
                </div>
                <button className="btn-small" onClick={downloadEvidence} type="button">
                  Export
                </button>
              </div>
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
                      <p className="mt-1 text-sm text-slate-500">{item.transactionId}</p>
                    </div>
                    <span className={`badge ${statusStyles[item.status]}`}>{item.status}</span>
                  </button>
                ))}
              </div>
              {selectedDispute ? (
                <div className="case-detail">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#00843d]">Selected case</p>
                    <h4 className="mt-2 text-lg font-black">{selectedDispute.reason}</h4>
                    <p className="mt-1 text-sm text-gray-500">{selectedDispute.id}</p>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="detail-row">
                      <dt>Transaction</dt>
                      <dd>{selectedDispute.transactionId}</dd>
                    </div>
                    <div className="detail-row">
                      <dt>Amount</dt>
                      <dd>
                        {selectedTransaction
                          ? formatCurrency(selectedTransaction.amount, selectedTransaction.currency)
                          : "Unknown"}
                      </dd>
                    </div>
                    <div className="detail-row">
                      <dt>Current status</dt>
                      <dd>{selectedDispute.status}</dd>
                    </div>
                  </dl>
                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <button className="btn-small" onClick={() => updateDisputeStatus("open")} type="button">
                      Open
                    </button>
                    <button className="btn-small" onClick={() => updateDisputeStatus("escalated")} type="button">
                      Escalate
                    </button>
                    <button className="btn-small" onClick={() => updateDisputeStatus("resolved")} type="button">
                      Resolve
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
            <p className="section-kicker">Need help?</p>
            <h2 className="section-heading">Clear answers for every case</h2>
          </div>
          <div className="faq-list">
            {faqItems.map((item, index) => (
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

      {isAuthOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6" role="dialog" aria-modal="true">
          <section className="w-full max-w-md rounded border border-gray-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">{authMode === "login" ? "Secure access" : "New account"}</p>
                <h2 className="mt-2 text-2xl font-black text-[#101010]">
                  {authMode === "login" ? "Log in to FinGuard" : "Create your account"}
                </h2>
              </div>
              <button
                aria-label="Close auth form"
                className="grid h-10 w-10 place-items-center rounded border border-gray-200 text-xl font-black text-gray-700 transition hover:bg-gray-50"
                onClick={() => setIsAuthOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 rounded border border-gray-200 bg-gray-50 p-1">
              <button
                className={`rounded px-4 py-2 text-sm font-black ${
                  authMode === "login" ? "bg-white text-[#00843d] shadow-sm" : "text-gray-600"
                }`}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
                type="button"
              >
                Log in
              </button>
              <button
                className={`rounded px-4 py-2 text-sm font-black ${
                  authMode === "register" ? "bg-white text-[#00843d] shadow-sm" : "text-gray-600"
                }`}
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                }}
                type="button"
              >
                Register
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleAuthSubmit}>
              {authMode === "register" ? (
                <label className="block">
                  <span className="text-sm font-bold text-gray-700">Full name</span>
                  <input
                    className="mt-2 min-h-12 w-full rounded border border-gray-300 px-4 text-base outline-none transition focus:border-[#00843d] focus:ring-4 focus:ring-[#bce8cc]"
                    onChange={(event) => updateAuthField("name", event.target.value)}
                    placeholder="Oksana Rusina"
                    type="text"
                    value={authForm.name}
                  />
                </label>
              ) : null}

              <label className="block">
                <span className="text-sm font-bold text-gray-700">Email</span>
                <input
                  className="mt-2 min-h-12 w-full rounded border border-gray-300 px-4 text-base outline-none transition focus:border-[#00843d] focus:ring-4 focus:ring-[#bce8cc]"
                  onChange={(event) => updateAuthField("email", event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={authForm.email}
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-gray-700">Password</span>
                <input
                  className="mt-2 min-h-12 w-full rounded border border-gray-300 px-4 text-base outline-none transition focus:border-[#00843d] focus:ring-4 focus:ring-[#bce8cc]"
                  onChange={(event) => updateAuthField("password", event.target.value)}
                  placeholder="Minimum 6 characters"
                  type="password"
                  value={authForm.password}
                />
              </label>

              {authMode === "register" ? (
                <label className="block">
                  <span className="text-sm font-bold text-gray-700">Confirm password</span>
                  <input
                    className="mt-2 min-h-12 w-full rounded border border-gray-300 px-4 text-base outline-none transition focus:border-[#00843d] focus:ring-4 focus:ring-[#bce8cc]"
                    onChange={(event) => updateAuthField("confirmPassword", event.target.value)}
                    placeholder="Repeat password"
                    type="password"
                    value={authForm.confirmPassword}
                  />
                </label>
              ) : null}

              {authError ? (
                <p className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-900">
                  {authError}
                </p>
              ) : null}

              <button className="btn-primary w-full" type="submit">
                {authMode === "login" ? "Log in" : "Create account"}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      <footer className="bg-[#101010] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
          <div className="md:col-span-2">
            <div className="brand-mark bg-white text-[#00843d]">FG</div>
            <h2 className="mt-4 text-2xl font-black">FinGuard AI</h2>
            <p className="mt-3 max-w-md leading-7 text-slate-200">
              A React banking frontend for secure account monitoring, dispute support, and customer protection.
            </p>
          </div>
          <div>
            <h3 className="font-black">Banking</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              <li>Current accounts</li>
              <li>Cards</li>
              <li>Payments</li>
            </ul>
          </div>
          <div>
            <h3 className="font-black">Support</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              <li>Help centre</li>
              <li>Security</li>
              <li>Contact</li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default App;
