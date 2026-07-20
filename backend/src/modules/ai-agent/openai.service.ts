import OpenAI from "openai";
import { config } from "../../config";
import { logger } from "../../lib/logger";
import { Transaction, AiAnalysisResponse, SupportChatMessage } from "../../types";

const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
const SUPPORT_CHAT_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Support chat timed out")), timeoutMs);
    }),
  ]);
}

const supportKnowledgeBase = [
  {
    patterns: [/log ?in|sign ?in|access/i],
    answer: "Use Request access or Log in from the header. Once authorized, FinGuard opens the review workspace with payment activity, cases, evidence, and team actions.",
  },
  {
    patterns: [/register|create.*account|new account/i],
    answer: "To request workspace access, choose Request access, enter your work details, and submit the secure access form. A team admin can confirm the right role.",
  },
  {
    patterns: [/forgot|reset.*password|change.*password/i],
    answer: "For password issues, use the login screen or contact support for a secure reset. Never share passwords, one-time codes, or full card details in chat.",
  },
  {
    patterns: [/delete.*account|remove.*account|close.*account|cancel.*account|account.*delete|account.*close/i],
    answer: "For workspace removal or data retention requests, contact support for verification. Case records and evidence exports should follow your organization's compliance policy.",
  },
  {
    patterns: [/update.*profile|change.*name|change.*email|personal details/i],
    answer: "Open the profile menu and go to Settings to review profile details, notifications, and security preferences. Sensitive changes may require admin verification.",
  },
  {
    patterns: [/language|translate|україн|русск|spanish|italian/i],
    answer: "Use the language selector in the header to switch the interface language. FinGuard keeps the selected language for this browser.",
  },
  {
    patterns: [/balance|available funds|how much money/i],
    answer: "Balances and payment totals appear inside the review workspace so teams can assess transaction context without switching tools.",
  },
  {
    patterns: [/transaction history|transactions|payment activity|activity/i],
    answer: "Open Transactions to review payment activity, amounts, dates, statuses, transaction IDs, and case context.",
  },
  {
    patterns: [/search.*transaction|find.*transaction|transaction id/i],
    answer: "Use the search field in Transactions to find activity by transaction ID, status, or description.",
  },
  {
    patterns: [/statement|download.*statement|bank statement/i],
    answer: "Use Export in the review workspace to prepare case evidence, transaction details, and status records for audit or support handoff.",
  },
  {
    patterns: [/cancel.*payment|stop.*payment|void.*payment|reverse.*payment|payment.*cancel/i],
    answer: "Open Transactions, select the payment, and check its status. Pending items can move into review; completed payments usually require a dispute, chargeback, or support workflow.",
  },
  {
    patterns: [/failed.*transfer|transfer.*failed|payment failed|declined/i],
    answer: "For failed or declined payments, check status, reason, limit context, and evidence before deciding whether the case needs review or customer follow-up.",
  },
  {
    patterns: [/duplicate|charged twice|double charge|same payment/i],
    answer: "For a duplicate charge, open Transactions, select the duplicate payment, and create a review case with the reason Duplicate payment.",
  },
  {
    patterns: [/dispute|chargeback|refund|payment issue|open.*case/i],
    answer: "To dispute a payment, open Review cases, choose the transaction, add a short reason, and submit the case for review.",
  },
  {
    patterns: [/lost.*card|stolen.*card|freeze.*card|block.*card/i],
    answer: "For lost-card or stolen-card reports, create or review the related case, confirm affected transactions, and route urgent actions to the support or fraud team.",
  },
  {
    patterns: [/virtual card|digital card|card details/i],
    answer: "Card context helps reviewers connect payment activity with risk signals. Do not share full card numbers or sensitive credentials in chat.",
  },
  {
    patterns: [/card limit|spending limit|limit/i],
    answer: "Limit information should be reviewed alongside transaction status, customer context, and available evidence before a decision is recorded.",
  },
  {
    patterns: [/fee|fees|charge|pricing/i],
    answer: "Fees and charges should be checked in the transaction details and included in the evidence record when they affect a case decision.",
  },
  {
    patterns: [/fraud|suspicious|unknown merchant|unauthorized|security alert/i],
    answer: "If you see suspicious activity, open the transaction, create a review case, and contact support. Do not share passwords, card numbers, or one-time codes.",
  },
  {
    patterns: [/locked|blocked|cannot access|account blocked/i],
    answer: "For locked access, contact support or a workspace admin for verification. FinGuard keeps sensitive actions behind controlled access.",
  },
  {
    patterns: [/notification|alert|email alert|push/i],
    answer: "Open Settings from the profile menu to manage risk alerts, summaries, and security notifications.",
  },
  {
    patterns: [/export|evidence|csv|audit/i],
    answer: "Use Export in the dispute support area to download evidence, transaction details, and case status information for review.",
  },
  {
    patterns: [/contact|email|human|agent|support/i],
    answer: "For direct support, use Contact info in the header or email support@finguard.app.",
  },
  {
    patterns: [/payment status|pending|completed|review status/i],
    answer: "Payment status is shown in Transactions. Pending means still processing, Completed means settled, and Review means it needs manual attention.",
  },
  {
    patterns: [/add money|top up|deposit/i],
    answer: "FinGuard focuses on payment review rather than deposits. Use transaction and case context to decide the next support or risk action.",
  },
  {
    patterns: [/send money|transfer money|make transfer/i],
    answer: "FinGuard reviews payment activity and case evidence. Payment initiation should remain in the connected banking or payment system.",
  },
  {
    patterns: [/currency|exchange|foreign|international/i],
    answer: "International payments and currency exchange may include rates and fees. Review the transaction details before confirming.",
  },
  {
    patterns: [/subscription|direct debit|recurring payment/i],
    answer: "For subscriptions or direct debits, check recurring activity in Transactions and include relevant history in the review case.",
  },
  {
    patterns: [/how long|processing time|pending time/i],
    answer: "Processing time depends on payment type and provider status. Use FinGuard to record review decisions and keep evidence export-ready.",
  },
  {
    patterns: [/safe|secure|privacy|data|gdpr/i],
    answer: "FinGuard is designed around controlled workspace access, secure review workflows, and evidence-ready records. Never share passwords, full card numbers, or verification codes in chat.",
  },
];

export function createFallbackSupportChatReply(messages: SupportChatMessage[]): string {
  const latestMessage = messages[messages.length - 1]?.content.trim().toLowerCase() || "";
  const matchedEntry = supportKnowledgeBase.find((entry) =>
    entry.patterns.some((pattern) => pattern.test(latestMessage)),
  );

  if (matchedEntry) return matchedEntry.answer;

  return "I can help your team review payment activity, manage disputed payments, prepare evidence, and route support or risk actions. Tell me what you need to resolve.";
}

export async function analyzeTransaction(transaction: Transaction): Promise<AiAnalysisResponse> {
  if (!config.OPENAI_API_KEY) {
    return {
      score: 0,
      riskLabel: "unknown",
      recommendation: "OpenAI API key is not configured.",
    };
  }

  const prompt = `Analyze this transaction for fraud and dispute risk.\nTransaction: ${JSON.stringify(transaction)}`;

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
    temperature: 0.2,
  });

  const text = response.output_text || "";

  return {
    score: 0,
    riskLabel: "review",
    recommendation: text || "Review transaction manually.",
  };
}

export async function createSupportChatReply(messages: SupportChatMessage[]): Promise<string> {
  if (!config.OPENAI_API_KEY) {
    return createFallbackSupportChatReply(messages);
  }

  const history = messages
    .slice(-8)
    .map((message) => `${message.role === "user" ? "Customer" : "Assistant"}: ${message.content}`)
    .join("\n");

  const prompt = `You are FinGuard's secure banking support assistant.
Help users navigate the FinGuard web app, understand account monitoring, transactions, dispute cases, and general support flows.
Keep answers concise, practical, and reassuring.
Never ask for passwords, full card numbers, full bank details, one-time codes, or other sensitive credentials.
If the request needs a human, recommend contacting support at support@finguard.app.

Conversation:
${history}

Assistant:`;

  try {
    const response = await withTimeout(
      client.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.3,
      }),
      SUPPORT_CHAT_TIMEOUT_MS,
    );

    return response.output_text?.trim() || createFallbackSupportChatReply(messages);
  } catch (error) {
    logger.warn("OpenAI support chat unavailable, using fallback assistant", {
      error: error instanceof Error ? error.message : String(error),
    });
    return createFallbackSupportChatReply(messages);
  }
}
