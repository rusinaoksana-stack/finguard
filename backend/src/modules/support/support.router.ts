import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { createFallbackSupportChatReply, createSupportChatReply } from "../ai-agent/openai.service";
import { SupportChatMessage } from "../../types";
import { asyncHandler } from "../../lib/async-handler";
import { validateBody } from "../../lib/validation";

const router = Router();

type IncomingSupportMessage = {
  role?: unknown;
  content?: unknown;
};

const supportRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const supportChatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().trim().min(1).max(1000),
    }),
  ).min(1).max(16),
});

router.post("/chat", supportRateLimit, validateBody(supportChatSchema), asyncHandler(async (req, res) => {
  const rawMessages: IncomingSupportMessage[] = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages: SupportChatMessage[] = rawMessages
    .filter(
      (message): message is { role: SupportChatMessage["role"]; content?: unknown } =>
        message?.role === "user" || message?.role === "assistant",
    )
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").trim().slice(0, 1000),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-8);

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "A user message is required." });
  }

  try {
    const reply = await createSupportChatReply(messages);
    return res.json({ data: { reply } });
  } catch (error) {
    console.error("Support chat failed", error);
    return res.json({
      data: {
        reply: createFallbackSupportChatReply(messages),
      },
    });
  }
}));

export { router as supportRouter };
