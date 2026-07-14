import OpenAI from "openai";
import { config } from "../../config";
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
    answer: "To sign in, use the Log in button in the header and enter your email and password. After login, your cabinet shows accounts, transactions, and review cases.",
  },
  {
    patterns: [/register|create.*account|new account/i],
    answer: "To create an account, choose Create account, enter your name, email, and password, then submit the registration form.",
  },
  {
    patterns: [/forgot|reset.*password|change.*password/i],
    answer: "For password issues, use the login screen and request support if reset is unavailable in the demo. Never share your password or one-time codes in chat.",
  },
  {
    patterns: [/delete.*account|remove.*account|close.*account|cancel.*account|account.*delete|account.*close/i],
    answer: "To close or delete your account, open your profile menu, go to Settings, and contact support for final verification. For security, FinGuard does not delete banking data from chat.",
  },
  {
    patterns: [/update.*profile|change.*name|change.*email|personal details/i],
    answer: "Open the profile menu and go to Settings to review your personal information. Sensitive profile changes may require support verification.",
  },
  {
    patterns: [/language|translate|україн|русск|spanish|italian/i],
    answer: "Use the language selector in the header to switch the interface language. FinGuard keeps the selected language for this browser.",
  },
  {
    patterns: [/balance|available funds|how much money/i],
    answer: "Your available balance is shown in My cabinet on the main account card. Account details are loaded from the connected banking data.",
  },
  {
    patterns: [/transaction history|transactions|payment activity|activity/i],
    answer: "Open Transactions in your cabinet to review payment activity, amounts, dates, statuses, and transaction IDs.",
  },
  {
    patterns: [/search.*transaction|find.*transaction|transaction id/i],
    answer: "Use the search field in Transactions to find activity by transaction ID, status, or description.",
  },
  {
    patterns: [/statement|download.*statement|bank statement/i],
    answer: "Use Download statements or the export tools in the dashboard to prepare account and transaction records for review.",
  },
  {
    patterns: [/cancel.*payment|stop.*payment|void.*payment|reverse.*payment|payment.*cancel/i],
    answer: "To cancel a payment, open Transactions, find the payment, and check its status. Pending payments can be reviewed or reported as a payment issue. Completed payments cannot usually be cancelled, but you can open a dispute or contact support for review.",
  },
  {
    patterns: [/failed.*transfer|transfer.*failed|payment failed|declined/i],
    answer: "If a transfer failed or was declined, check the transaction status first. Confirm the account details, available balance, and card or transfer limits before trying again.",
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
    answer: "If your card is lost or stolen, freeze or block it immediately from Cards if available, then contact support for replacement and security review.",
  },
  {
    patterns: [/virtual card|digital card|card details/i],
    answer: "The virtual card panel in your cabinet shows secure online payment readiness. Use Cards to manage digital card access and limits.",
  },
  {
    patterns: [/card limit|spending limit|limit/i],
    answer: "Card and transfer limits are usually managed from Cards or Settings. Some limit changes may require additional verification.",
  },
  {
    patterns: [/fee|fees|charge|pricing/i],
    answer: "Fees depend on the account, card, and payment type. Check the transaction details or contact support for a full fee breakdown.",
  },
  {
    patterns: [/fraud|suspicious|unknown merchant|unauthorized|security alert/i],
    answer: "If you see suspicious activity, open the transaction, create a review case, and contact support. Do not share passwords, card numbers, or one-time codes.",
  },
  {
    patterns: [/locked|blocked|cannot access|account blocked/i],
    answer: "If your account is locked, contact support for identity verification. This protects your account from unauthorized access.",
  },
  {
    patterns: [/notification|alert|email alert|push/i],
    answer: "Open Settings from the profile menu to manage alerts, monthly summaries, and security notifications.",
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
    answer: "Payment status is shown in Transactions. Pending means still processing, Completed means settled, and Review means it may need manual checking.",
  },
  {
    patterns: [/add money|top up|deposit/i],
    answer: "Use Add money in Quick actions to start a top-up flow. In this demo, the action is prepared as part of the banking dashboard experience.",
  },
  {
    patterns: [/send money|transfer money|make transfer/i],
    answer: "Use Transfer in Quick actions to start a payment flow. Always check recipient details carefully before confirming a transfer.",
  },
  {
    patterns: [/currency|exchange|foreign|international/i],
    answer: "International payments and currency exchange may include rates and fees. Review the transaction details before confirming.",
  },
  {
    patterns: [/subscription|direct debit|recurring payment/i],
    answer: "For subscriptions or direct debits, check Transactions for recurring activity. To stop future payments, contact the merchant and report the payment if needed.",
  },
  {
    patterns: [/how long|processing time|pending time/i],
    answer: "Processing time depends on the payment type. Pending card payments may settle or reverse automatically, while bank transfers can take longer.",
  },
  {
    patterns: [/safe|secure|privacy|data|gdpr/i],
    answer: "FinGuard is designed around secure account monitoring and review workflows. Never share passwords, full card numbers, or verification codes in chat.",
  },
];

export function createDemoSupportChatReply(messages: SupportChatMessage[]): string {
  const latestMessage = messages[messages.length - 1]?.content.trim().toLowerCase() || "";
  const matchedEntry = supportKnowledgeBase.find((entry) =>
    entry.patterns.some((pattern) => pattern.test(latestMessage)),
  );

  if (matchedEntry) return matchedEntry.answer;

  return "I can help you with FinGuard accounts, transactions, disputed payments, review cases, and profile settings. Tell me what you want to do, and I will guide you.";
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
    return createDemoSupportChatReply(messages);
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

    return response.output_text?.trim() || createDemoSupportChatReply(messages);
  } catch (error) {
    console.warn("OpenAI support chat unavailable, using demo assistant.", error);
    return createDemoSupportChatReply(messages);
  }
}
