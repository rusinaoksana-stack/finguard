import OpenAI from "openai";
import { config } from "../../config";
import { Transaction, AiAnalysisResponse } from "../../types";

const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });

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
