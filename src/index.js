import { htmlResponse, escapeHtml } from './lib/html.js';
import { homePage } from './views/home.js';
import { reviewPage } from './views/review.js';
import { listPage } from './views/list.js';
import { aboutPage } from './views/about.js';
import { notFoundPage } from './views/notFound.js';
import {
  categories,
  categoryName,
  getReview,
  reviewsByCategory,
  searchReviews,
  sortedReviews,
} from './data/reviews.js';

const HTML_CACHE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400';
const FEED_CACHE = 'public, max-age=0, s-maxage=1800, stale-while-revalidate=86400';

function page(body, { status = 200, cache = HTML_CACHE } = {}) {
  return htmlResponse(body, { status, headers: { 'cache-control': cache } });
}

function xml(body, cache = FEED_CACHE) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': cache },
  });
}

function rssFeed(origin) {
  const items = sortedReviews()
    .map(
      (r) => `    <item>
      <title>${escapeHtml(r.title)}</title>
      <link>${origin}/review/${r.slug}</link>
      <guid isPermaLink="true">${origin}/review/${r.slug}</guid>
      <pubDate>${new Date(`${r.date}T09:00:00+09:00`).toUTCString()}</pubDate>
      <category>${escapeHtml(categoryName(r.category))}</category>
      <description>${escapeHtml(r.verdict)}</description>
    </item>`,
    )
    .join('\n');

  return xml(`<rss version="2.0">
  <channel>
    <title>USB.KR 리뷰</title>
    <link>${origin}/</link>
    <description>USB 주변기기를 직접 사서 측정하는 리뷰 매거진</description>
    <language>ko</language>
${items}
  </channel>
</rss>`);
}

function sitemap(origin) {
  const urls = [
    { loc: `${origin}/`, priority: '1.0' },
    { loc: `${origin}/reviews`, priority: '0.8' },
    { loc: `${origin}/about`, priority: '0.5' },
    ...categories.map((c) => ({ loc: `${origin}/category/${c.slug}`, priority: '0.6' })),
    ...sortedReviews().map((r) => ({ loc: `${origin}/review/${r.slug}`, lastmod: r.date, priority: '0.9' })),
  ];

  const body = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n');

  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`);
}

function route(url) {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const canonical = `${url.origin}${path}`;

  if (path === '/') {
    return page(homePage({ canonical }));
  }

  if (path === '/reviews') {
    return page(
      listPage({
        eyebrow: '전체 기사',
        title: '리뷰와 가이드 전체',
        description: '측정이 끝난 순서대로 모아 둔 목록이다.',
        items: sortedReviews(),
        canonical,
        active: '',
      }),
    );
  }

  if (path === '/about') {
    return page(aboutPage({ canonical }));
  }

  if (path === '/search') {
    const q = url.searchParams.get('q') ?? '';
    const items = searchReviews(q);
    return page(
      listPage({
        eyebrow: '검색',
        title: q ? `"${q}" 검색 결과` : '검색',
        description: q ? `${items.length}건을 찾았다.` : '제품명이나 규격을 입력해 보자.',
        items,
        canonical,
        active: '',
        empty: '일치하는 글이 없다. 다른 키워드로 찾아보자.',
      }),
      { cache: 'no-store' },
    );
  }

  const categoryMatch = path.match(/^\/category\/([a-z0-9-]+)$/);
  if (categoryMatch) {
    const slug = categoryMatch[1];
    const category = categories.find((c) => c.slug === slug);
    if (!category) return page(notFoundPage({ canonical }), { status: 404, cache: 'no-store' });
    return page(
      listPage({
        eyebrow: '카테고리',
        title: category.name,
        description: `${category.name} 분류의 리뷰와 가이드.`,
        items: reviewsByCategory(slug),
        canonical,
        active: slug,
      }),
    );
  }

  const reviewMatch = path.match(/^\/review\/([a-z0-9-]+)$/);
  if (reviewMatch) {
    const review = getReview(reviewMatch[1]);
    if (!review) return page(notFoundPage({ canonical }), { status: 404, cache: 'no-store' });
    return page(reviewPage(review, { canonical }));
  }

  if (path === '/rss.xml') return rssFeed(url.origin);
  if (path === '/sitemap.xml') return sitemap(url.origin);

  if (path === '/robots.txt') {
    return new Response(`User-agent: *\nAllow: /\nSitemap: ${url.origin}/sitemap.xml\n`, {
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': FEED_CACHE },
    });
  }

  if (path === '/healthz') {
    return Response.json({ ok: true, reviews: sortedReviews().length }, { headers: { 'cache-control': 'no-store' } });
  }

  return page(notFoundPage({ canonical }), { status: 404, cache: 'no-store' });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }

    // 후행 슬래시는 정규 주소로 리다이렉트한다.
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      const target = new URL(url);
      target.pathname = url.pathname.replace(/\/+$/, '');
      return Response.redirect(target.toString(), 301);
    }

    const response = route(url);
    if (request.method === 'HEAD') {
      return new Response(null, { status: response.status, headers: response.headers });
    }
    return response;
  },
};
