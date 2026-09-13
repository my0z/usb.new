/**
 * 제품 홍보 영상 찾기 (YouTube Data API v3 · 무료 키).
 * 키가 없으면 조용히 건너뛴다. 최근 1년 안에 올라온 영상 중 제품명과 겹치는 첫 결과만 쓴다.
 */
export function cleanName(name) {
  return String(name).split(',')[0].replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

async function search(key, q) {
  const after = new Date(Date.now() - 365 * 864e5).toISOString();
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=5&regionCode=KR&relevanceLanguage=ko&order=relevance&publishedAfter=${after}&q=${encodeURIComponent(q)}&key=${key}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    console.warn(`유튜브 검색 실패 ${res.status}: ${(await res.text()).slice(0, 120)}`);
    return [];
  }
  return (await res.json()).items ?? [];
}

const pick = (it, match) => it && { provider: 'youtube', match, id: it.id.videoId, title: it.snippet.title, channel: it.snippet.channelTitle, publishedAt: it.snippet.publishedAt };

/** 1순위 브랜드+모델(앞 4단어)로 찾은 제품 영상. 없으면 키워드 리뷰 영상을 관련 영상으로 넣는다. */
export async function findVideo(productName, keyword = '') {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const toks = cleanName(productName).toLowerCase().split(/\s+/).filter((t) => t.length >= 2).slice(0, 4);
  const items = await search(key, toks.join(' '));
  const hit = items.find((it) => {
    const title = `${it.snippet?.title ?? ''} ${it.snippet?.channelTitle ?? ''}`.toLowerCase();
    return toks.filter((t) => title.includes(t)).length >= Math.min(2, toks.length);
  });
  if (hit) return pick(hit, 'product');
  if (!keyword) return null;
  const related = await search(key, `${keyword} 리뷰`);
  if (!related.length) console.log(`  영상 없음: ${toks.join(' ')} · ${keyword} 리뷰`);
  return pick(related[0], 'keyword');
}
