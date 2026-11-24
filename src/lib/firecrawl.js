// Firecrawl 남은 크레딧. 시크릿 FIRECRAWL_API_KEY 가 있을 때만 부른다 (없으면 null). 10분 캐시.
import { edgeCached } from './edgecache.js';

export async function firecrawlCredits(env, ctx) {
  const key = env?.FIRECRAWL_API_KEY;
  if (!key) return null;
  return edgeCached(ctx, 'firecrawl-credits-v1', 600, async () => {
    for (const path of ['/v2/team/credit-usage', '/v1/team/credit-usage']) {
      const res = await fetch(`https://api.firecrawl.dev${path}`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) }).catch(() => null);
      if (!res || !res.ok) continue;
      const j = await res.json().catch(() => null);
      const d = j?.data ?? j;
      const remaining = d?.remainingCredits ?? d?.remaining_credits;
      const plan = d?.planCredits ?? d?.plan_credits;
      if (remaining == null) continue;
      return { remaining: Number(remaining), plan: plan == null ? null : Number(plan), start: d.billingPeriodStart ?? d.billing_period_start ?? null, end: d.billingPeriodEnd ?? d.billing_period_end ?? null };
    }
    return { error: '크레딧을 못 읽었다 (키가 틀렸거나 서비스 오류)' };
  });
}
