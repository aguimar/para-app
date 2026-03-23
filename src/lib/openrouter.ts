// ~$0.000010 per call — essentially free for this task
const MODELS = [
  "google/gemini-2.0-flash-lite-001",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-4o-mini",
];

const SYSTEM_PROMPT = `You are a PARA method assistant. Classify a note into exactly one of these categories:
- PROJECT: Has a specific outcome and deadline. Active work in progress.
- AREA: Ongoing responsibility with no end date (health, finances, habits, relationships).
- RESOURCE: Reference material to keep for future use (articles, ideas, how-tos, research).
- ARCHIVE: Completed, inactive, or no longer relevant.

Reply with ONLY valid JSON, no other text: {"category":"PROJECT","reason":"one short sentence in the same language as the note"}`;

async function callModel(model: string, userMessage: string, key: string) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://para-app.local",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 80,
      temperature: 0.2,
    }),
  });

  if (res.status === 429 || res.status === 404) {
    const text = await res.text();
    throw Object.assign(new Error(text), { status: res.status, retryable: true });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Unexpected response: ${content}`);

  const parsed = JSON.parse(match[0]) as { category: string; reason: string };
  const valid = ["PROJECT", "AREA", "RESOURCE", "ARCHIVE"];
  if (!valid.includes(parsed.category)) throw new Error(`Invalid category: ${parsed.category}`);

  return { category: parsed.category, reason: parsed.reason };
}

export async function suggestParaCategory(
  title: string,
  body: string
): Promise<{ category: string; reason: string }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");

  const preview = body.slice(0, 500);
  const userMessage = `Title: ${title}\nContent: ${preview}`;

  let lastError: Error | null = null;
  for (const model of MODELS) {
    try {
      return await callModel(model, userMessage, key);
    } catch (err: any) {
      lastError = err;
      if (!err.retryable) throw err;
      // try next model
    }
  }

  throw lastError ?? new Error("All models failed");
}
