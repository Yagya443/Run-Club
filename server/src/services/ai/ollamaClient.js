// The only place that talks to Ollama. The browser never calls this directly.
const cfg = () => ({ url: process.env.OLLAMA_URL || 'http://localhost:11434', model: process.env.OLLAMA_MODEL || 'qwen3:4b', timeout: Number(process.env.OLLAMA_TIMEOUT_MS || 60000) });
export const modelName = () => cfg().model;

// Asks for JSON, strips any <think> block, and validates against a zod schema. Throws on anything unusable.
export async function chatJson({ system, user, schema }) {
  const c = cfg();
  const res = await fetch(`${c.url}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(c.timeout),
    body: JSON.stringify({ model: c.model, stream: false, format: 'json', think: false, options: { temperature: 0.2 },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`Ollama responded ${res.status}`);
  const raw = (await res.json()).message?.content ?? '';
  return schema.parse(JSON.parse(raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()));
}
export async function aiStatus() {
  const c = cfg();
  try {
    const r = await fetch(`${c.url}/api/tags`, { signal: AbortSignal.timeout(3000) });
    const names = ((await r.json()).models || []).map((m) => m.name);
    const has = names.some((n) => n === c.model || n === `${c.model}:latest`);
    return { reachable: true, model: c.model, modelInstalled: has };
  } catch { return { reachable: false, model: c.model, modelInstalled: false }; }
}
