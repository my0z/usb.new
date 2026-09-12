/**
 * 제품 홍보 영상 찾기 (YouTube Data API v3 · 무료 키).
 * 키가 없으면 조용히 건너뛴다. 최근 1년 안에 올라온 영상 중 제품명과 겹치는 첫 결과만 쓴다.
 */
export function cleanName(name) {
  return String(name).split(',')[0].replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function findVideo(productName) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const q = cleanName(productName);
  const after = new Date(Date.now() - 365 * 864e5).toISOString();
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=5&regionCode=KR&relevanceLanguage=ko&order=relevance&publishedAfter=${after}&q=${encodeURIComponent(q)}&key=${key}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    console.warn(`유튜브 검색 실패 ${res.status}: ${(await res.text()).slice(0, 120)}`);
    return null;
  }
  const items = (await res.json()).items ?? [];
  const toks = q.toLowerCase().split(/\s+/).filter((t) => t.length >= 2).slice(0, 3);
  const hit = items.find((it) => {
    const title = `${it.snippet?.title ?? ''} ${it.snippet?.channelTitle ?? ''}`.toLowerCase();
    return toks.filter((t) => title.includes(t)).length >= Math.min(2, toks.length);
  });
  return hit ? { provider: 'youtube', id: hit.id.videoId, title: hit.snippet.title, channel: hit.snippet.channelTitle, publishedAt: hit.snippet.publishedAt } : null;
}
