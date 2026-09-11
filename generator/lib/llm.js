/**
 * 글 생성 모델.
 * 1순위 Ollama (VM 에서 무료로 돈다) · 2순위 Groq (키가 있을 때만).
 * 두 경로 모두 JSON 만 돌려받는다.
 */
import { LLM } from '../config.js';

async function ollamaChat(system, user) {
  const res = await fetch(`${LLM.ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LLM.ollamaModel,
      stream: false,
      format: 'json',
      keep_alive: '10m',
      options: { temperature: LLM.temperature, num_ctx: LLM.numCtx, num_predict: LLM.numPredict },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(15 * 60 * 1000),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return { text: data?.message?.content ?? '', model: `ollama:${LLM.ollamaModel}` };
}

async function groqChat(system, user) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM.groqKey}` },
    body: JSON.stringify({
      model: LLM.groqModel,
      temperature: LLM.temperature,
      max_tokens: LLM.numPredict,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(90 * 1000),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return { text: data?.choices?.[0]?.message?.content ?? '', model: `groq:${LLM.groqModel}` };
}

export async function generateJson(system, user) {
  const errors = [];
  try {
    return await ollamaChat(system, user);
  } catch (e) {
    errors.push(`ollama: ${e.message}`);
  }
  if (LLM.groqKey) {
    try {
      return await groqChat(system, user);
    } catch (e) {
      errors.push(`groq: ${e.message}`);
    }
  }
  throw new Error(`모델 호출 실패 — ${errors.join(' | ')}`);
}

export async function ollamaHealthy() {
  try {
    const res = await fetch(`${LLM.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const data = await res.json();
    const names = (data.models ?? []).map((m) => m.name);
    const has = names.some((n) => n === LLM.ollamaModel || n.startsWith(`${LLM.ollamaModel}:`) || n.split(':')[0] === LLM.ollamaModel.split(':')[0]);
    return { ok: has, reason: has ? '' : `모델 ${LLM.ollamaModel} 없음 (설치된 것: ${names.join(', ') || '없음'})` };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}
