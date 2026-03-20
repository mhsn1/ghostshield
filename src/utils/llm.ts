import Groq from "groq-sdk";

export async function callTarget(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  provider: "groq" | "openrouter",
  model: string
): Promise<string> {
  if (provider === "groq") {
    const groq = new Groq({ apiKey });
    const res = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 1024,
    });
    return res.choices[0]?.message?.content ?? "";
  }

  // OpenRouter
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 1024,
    }),
  });
  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content ?? "";
}

export async function callEvaluator(
  prompt: string,
  apiKey: string
): Promise<string> {
  const groq = new Groq({ apiKey });
  const res = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 512,
    temperature: 0.1,
  });
  return res.choices[0]?.message?.content ?? "";
}
