import { Router } from "express";
import { createDemoSupportChatReply, createSupportChatReply } from "../ai-agent/openai.service";
import { SupportChatMessage } from "../../types";

const router = Router();

type IncomingSupportMessage = {
  role?: unknown;
  content?: unknown;
};

router.post("/chat", async (req, res) => {
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
        reply: createDemoSupportChatReply(messages),
      },
    });
  }
});

export { router as supportRouter };
