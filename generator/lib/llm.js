/**
 * 글 생성 모델.
 * 1순위 Ollama (VM 에서 무료로 돈다) · 2순위 Groq (키가 있을 때만).
 * 두 경로 모두 JSON 만 돌려받는다.
 */
import { LLM } from '../config.js';

async function ollamaChat(system, user, model = LLM.ollamaModel, o = {}) {
  const res = await fetch(`${LLM.ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      format: 'json',
      keep_alive: '10m',
      options: { temperature: o.temperature ?? LLM.temperature, num_ctx: LLM.numCtx, num_predict: o.maxTokens ?? LLM.numPredict },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(15 * 60 * 1000),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return { text: data?.message?.content ?? '', model: `ollama:${model}` };
}

async function groqChat(system, user, model = LLM.groqModel, o = {}) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM.groqKey}` },
    body: JSON.stringify({
      model,
      temperature: o.temperature ?? LLM.temperature,
      max_tokens: o.maxTokens ?? LLM.numPredict,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(90 * 1000),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return { text: data?.choices?.[0]?.message?.content ?? '', model: `groq:${model}` };
}

/** Groq 키가 있으면 70B 를 먼저 쓴다 (소형 로컬 모델보다 지어내기가 훨씬 적다). Ollama 는 예비. */
export async function generateJson(system, user) {
  // Groq 는 JSON 검증 실패(400)가 간헐적이라 한 번 더 시도한 뒤에 Ollama 로 내려간다.
  const order = LLM.groqKey ? [['groq', groqChat], ['groq', groqChat], ['ollama', ollamaChat]] : [['ollama', ollamaChat]];
  const errors = [];
  for (const [name, fn] of order) {
    try {
      return await fn(system, user);
    } catch (e) {
      console.warn(`${name} 실패 → 다음 모델로: ${e.message.slice(0, 300)}`);
      errors.push(`${name}: ${e.message}`);
    }
  }
  throw new Error(`모델 호출 실패 — ${errors.join(' | ')}`);
}

/** Cloudflare Workers AI (유료 플랜에 하루 1만 뉴런 포함). 토큰에 "Workers AI: Read" 권한이 있어야 한다. */
async function cfChat(system, user, model, o = {}) {
  if (!LLM.cfToken || !LLM.cfAccount) throw new Error('CLOUDFLARE_API_TOKEN 또는 CLOUDFLARE_ACCOUNT_ID 없음');
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${LLM.cfAccount}/ai/run/${model}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM.cfToken}` },
    body: JSON.stringify({
      temperature: o.temperature ?? LLM.temperature,
      max_tokens: o.maxTokens ?? LLM.numPredict,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(90 * 1000),
  });
  if (!res.ok) throw new Error(`Workers AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return { text: data?.result?.response ?? '', model: `cf:${model}` };
}

/** 앞뒤 설명이나 코드펜스가 붙어도 첫 { 부터 마지막 } 까지만 잘라 JSON 으로 읽는다. */
export function parseJsonLoose(text) {
  const t = String(text ?? '');
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('JSON 없음');
  const body = t.slice(a, b + 1);
  try {
    return JSON.parse(body);
  } catch (e) {
    // 모델이 자주 내는 실수만 고친다: 끝에 남은 쉼표 · 객체 사이 빠진 쉼표 · 문자열 안의 줄바꿈
    const fixed = body.replace(/,\s*([}\]])/g, '$1').replace(/}\s*{/g, '},{').replace(/"\s*\n\s*"/g, '","').replace(/[\u0000-\u001f]+/g, ' ');
    try {
      return JSON.parse(fixed);
    } catch {
      const pos = Number((/position (\d+)/.exec(e.message) || [])[1]);
      throw new Error(`${e.message} — 주변: ${body.slice(Math.max(0, pos - 60), pos + 40).replace(/\s+/g, ' ')}`);
    }
  }
}

/** "groq:모델" · "ollama:모델" · "cf:@cf/모델" 문자열로 특정 모델을 부른다 (심사용). */
export function chatWith(spec, system, user, o) {
  const [kind, ...rest] = spec.split(':');
  const model = rest.join(':');
  if (kind === 'groq') return groqChat(system, user, model, o);
  if (kind === 'ollama') return ollamaChat(system, user, model, o);
  if (kind === 'cf') return cfChat(system, user, model, o);
  throw new Error(`알 수 없는 모델 지정: ${spec}`);
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
