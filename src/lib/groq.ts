/**
 * Groq LLM Integration for Tweet Classification & Contribution Summary Generation
 * Model: qwen/qwen3.8-27b
 * Evaluates whether a detected X post is a genuine contribution about:
 * - Technocore
 * - Agent Identity / DID
 * - Flop Network
 * - Flop Testnet
 * - $FLOP
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "qwen/qwen3.8-27b";

export interface ClassificationResult {
  isRelevant: boolean;
  rawResponse: string;
  model: string;
  error?: string;
}

export function getGroqApiKey(): string {
  return (process.env.GROQ_API_KEY || "").replace(/\r$/, "").trim();
}

export function isGroqConfigured(): boolean {
  const key = getGroqApiKey();
  return Boolean(
    key && !key.includes("placeholder") && !key.includes("your-api-key"),
  );
}

/**
 * Classify tweet text using Groq LLM (qwen/qwen3.8-27b)
 * Returns true only if the post is genuinely discussing Technocore, Agent Identity, Flop Network, Flop Testnet, or $FLOP.
 */
export async function classifyContributionText(
  tweetContent: string,
  authorHandle?: string,
): Promise<ClassificationResult> {
  const apiKey = getGroqApiKey();

  if (!apiKey) {
    console.warn(
      "[Groq] GROQ_API_KEY is not configured. Falling back to heuristic keyword check.",
    );
    const lower = (tweetContent || "").toLowerCase();
    const hasSubstantiveTopic =
      lower.includes("flop") ||
      lower.includes("technocore") ||
      lower.includes("testnet") ||
      lower.includes("agent identity") ||
      lower.includes("did:key") ||
      lower.includes("$flop");

    return {
      isRelevant: hasSubstantiveTopic,
      rawResponse: hasSubstantiveTopic ? "true" : "false",
      model: "heuristic_fallback",
    };
  }

  const systemPrompt = `You are an expert AI classifier for the agentK & Flop Network contribution engine.
Analyze the provided X (Twitter) post authored by @${authorHandle || "user"} and determine with high confidence whether the post is genuinely discussing relevant topics.

Relevant topics include:
- Technocore (autonomous agent infrastructure, agent runtime, Technocore DID starter)
- Agent Identity (cryptographic identity, did:key, Ed25519 identity, PKCS#8 envelopes)
- Flop Network (Flop decentralized network, compute layer, verification layer)
- Flop Testnet (Flop testnet participation, testnet inference, testnet pipeline)
- $FLOP (tokenomics, $FLOP token, ecosystem incentives, miner/validator rewards)
- Direct technical breakdowns, ecosystem research, guides, or meaningful engagement related to Flop Network and agentK.

Strict Rules:
- If the post discusses, mentions, promotes, analyzes, or references $FLOP, Flop Network, Flop Testnet, Technocore, Agent Identity, or agentK: respond ONLY with \`true\`.
- If the post is completely unrelated to Flop Network / $FLOP / Technocore / agentK (e.g., discussing other unrelated cryptocurrencies or non-Flop topics): respond ONLY with \`false\`.
- Your output must be EXACTLY one word: either \`true\` or \`false\`. Do not include any other words, punctuation, markdown formatting, or reasoning.`;

  const targetHandle = process.env.TARGET_MENTION_HANDLE || "haxexbc";
  const userPrompt = `Tweet Content to Classify:
"""
${tweetContent.trim()}
"""

Is this post discussing or referencing Technocore, Agent Identity, Flop Network, Flop Testnet, $FLOP, or @${targetHandle}? (true / false):`;

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.0, // Strict deterministic output
        max_tokens: 10,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Groq] API error (${res.status}): ${errText}`);
      throw new Error(
        `Groq API returned HTTP ${res.status}: ${errText.slice(0, 200)}`,
      );
    }

    const data = await res.json();
    const content = (data?.choices?.[0]?.message?.content || "")
      .trim()
      .toLowerCase();

    // Parse strict true/false boolean
    const isRelevant = content.startsWith("true") || content === "true";

    return {
      isRelevant,
      rawResponse: content,
      model: DEFAULT_GROQ_MODEL,
    };
  } catch (err: any) {
    console.error("[Groq] Classification error:", err.message);
    return {
      isRelevant: false,
      rawResponse: "error",
      model: DEFAULT_GROQ_MODEL,
      error: err.message,
    };
  }
}

/**
 * Generate a concise 10–12 word statement explaining what contribution this post makes to Flop Network & Technocore
 */
export async function generateContributionSummary(
  tweetContent: string,
  authorHandle?: string,
): Promise<string> {
  const apiKey = getGroqApiKey();
  const fallback =
    "break down key ecosystem tokenomics and incentive mechanisms for Flop Network";

  if (!apiKey) {
    return fallback;
  }

  const systemPrompt = `You are an AI ecosystem and research analyst for Flop Network & Technocore.
Analyze the provided X (Twitter) post and generate a concise, high-impact 10 to 12 word phrase that completes the sentence: "I published an X contribution: <url> where I [YOUR 10-12 WORDS HERE]".

Strict Rules:
- The phrase MUST start with a present-tense first-person active verb (e.g. "break down", "analyze", "explain", "outline", "explore", "evaluate", "highlight").
- Do NOT include the words "where I" or "I" at the start.
- The phrase MUST be strictly 10 to 12 words long.
- It must describe the specific technical contribution, tokenomics insight, or ecosystem value provided in the tweet regarding Flop Network, $FLOP, or Technocore.
- Do NOT include periods (.), quotes, brackets ([]), or prefix tags (e.g. "Summary:").
- Output ONLY the 10 to 12 word phrase.`;

  const userPrompt = `Post Content:
"""
${tweetContent.trim().slice(0, 1500)}
"""

Generate the 10-12 word phrase (starting with an active verb, no period, no brackets):`;

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 50,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      let summary = (data?.choices?.[0]?.message?.content || "")
        .trim()
        .replace(/^["'\[]+|[\]"']+$/g, "")
        .replace(/^Summary:\s*/i, "")
        .replace(/^Contribution:\s*/i, "")
        .replace(/^Impact:\s*/i, "")
        .replace(/^where\s+I\s+/i, "")
        .replace(/[\[\]]/g, "")
        .replace(/\.+$/, "") // Strip trailing period
        .replace(/\s+/g, " ");

      const words = summary.split(" ").filter(Boolean);
      if (words.length >= 8 && words.length <= 15) {
        return words.slice(0, 12).join(" ");
      }
    }
    return fallback;
  } catch (err: any) {
    console.warn(
      "[Groq] Summary generation error, using fallback:",
      err.message,
    );
    return fallback;
  }
}

/**
 * Generate a concise contribution title / summary
 */
export async function generateContributionTitle(
  tweetContent: string,
  authorHandle?: string,
): Promise<string> {
  return generateContributionSummary(tweetContent, authorHandle);
}
