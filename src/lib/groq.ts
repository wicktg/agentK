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

  const targetHandle = process.env.TARGET_MENTION_HANDLE || "tryagentk";
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
 * Normalizes and guarantees that the summary clause strictly starts with an active verb.
 * If the model outputs "how Flop's...", automatically transforms to "explain how Flop's...".
 */
export function enforceActionVerb(phrase: string): string {
  let text = (phrase || "")
    .trim()
    .replace(/^["'\[]+|[\]"']+$/g, "")
    .replace(/^Summary:\s*/i, "")
    .replace(/^Contribution:\s*/i, "")
    .replace(/^Impact:\s*/i, "")
    .replace(/^where\s+I\s+/i, "")
    .replace(/^I\s+/i, "")
    .replace(/[\[\]]/g, "")
    .replace(/\.+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return "break down key ecosystem tokenomics and incentive mechanisms for Flop Network";
  }

  // Auto-correct any missing active verb
  if (/^how\b/i.test(text)) {
    text = "explain " + text;
  } else if (/^why\b/i.test(text)) {
    text = "explain " + text;
  } else if (/^what\b/i.test(text)) {
    text = "break down " + text;
  } else if (/^that\b/i.test(text)) {
    text = "demonstrate " + text;
  } else if (/^the\b/i.test(text) || /^a\b/i.test(text) || /^an\b/i.test(text)) {
    text = "analyze " + text;
  }

  // Lowercase first letter for natural continuation
  text = text.charAt(0).toLowerCase() + text.slice(1);

  const words = text.split(" ").filter(Boolean);
  if (words.length > 13) {
    return words.slice(0, 12).join(" ");
  }
  return text;
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
Analyze the provided X (Twitter) post and generate a concise 10 to 12 word phrase that completes the sentence: "I published an X contribution: <url> where I [YOUR PHRASE]".

Strict Grammatical Rules:
1. The VERY FIRST word of your response MUST be a present-tense base action verb (e.g. "explain", "analyze", "break down", "evaluate", "outline", "explore", "detail", "highlight").
2. NEVER start with "how", "that", "what", "why", "the", "a", "an", "this", "my", "I", or "where I".
3. If the topic is about how something works, you MUST write "explain how..." or "analyze how...", NEVER just "how...".
4. The phrase MUST be strictly 10 to 12 words long.
5. Do NOT include punctuation like periods (.), quotes, brackets ([]), or prefix labels.
6. Output ONLY the 10 to 12 word phrase.

Few-Shot Examples:
- Tweet on token unlocks -> explain how role-based unlock mechanics incentivize sustained miner network participation
- Tweet on validator staking -> analyze how staking validator rewards scale across the Flop testnet pipeline
- Tweet on agent DID -> break down decentralized identity verification using autonomous agent Ed25519 signatures`;

  const userPrompt = `Post Content:
"""
${tweetContent.trim().slice(0, 1500)}
"""

Generate the 10-12 word phrase starting with an active verb (no period, no brackets):`;

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
        temperature: 0.1,
        max_tokens: 50,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data?.choices?.[0]?.message?.content || "";
      const normalized = enforceActionVerb(rawText);
      const words = normalized.split(" ").filter(Boolean);
      if (words.length >= 7) {
        return normalized;
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
