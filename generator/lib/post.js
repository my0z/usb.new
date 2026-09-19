/**
 * 글 객체 조립과 사진 삽입.
 * KV 의 post:<slug> 형태를 그대로 따른다.
 */
import { randomInt } from 'node:crypto';
import { IMAGES_PER_POST } from '../config.js';
import { makeExcerpt } from './article.js';

/** 사이트의 /img/<token> 규칙과 동일한 base64url. */
export function imgToken(url) {
  return Buffer.from(url, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function figure(product) {
  const alt = product.name.replace(/"/g, '');
  // 두 사이트의 문단 분리기가 <p> 만 인식하므로 사진도 <p> 안에 넣는다.
  return `<p class="pfig"><img src="/img/${imgToken(product.image)}" alt="${alt}" loading="lazy" width="600" height="600"><br><small>${alt}</small></p>`;
}

/** 첫 섹션 뒤에 주인공 사진을 넣고 마지막 섹션 뒤에 비교 제품 사진을 넣는다. */
export function embedImages(article, products) {
  const sections = article.sections.map((s) => ({ ...s }));
  const picks = products.slice(0, IMAGES_PER_POST);
  if (picks[0] && sections[0]) sections[0].body_html += figure(picks[0]);
  if (picks[1] && sections.length > 1) sections[sections.length - 1].body_html += figure(picks[1]);
  return { ...article, sections };
}

const CHARS = 'abcdefghijkmnpqrstuvwxyz23456789'; // 헷갈리는 l o 0 1 제외

export function newSlug() {
  return Array.from({ length: 5 }, () => CHARS[randomInt(CHARS.length)]).join('');
}

export function buildPost({ article, keyword, products, modelUsed, slug = newSlug(), video = null, facts = [] }) {
  const main = products[0];
  return {
    slug,
    title: article.title,
    keyword,
    createdAt: new Date().toISOString(),
    tldr: article.tldr,
    verdict: article.verdict || '',
    fit: article.fit ?? [],
    unfit: article.unfit ?? [],
    pros: article.pros ?? [],
    cons: article.cons ?? [],
    specs: article.specs ?? [],
    tips: article.tips ?? [],
    intro: article.intro_html,
    sections: article.sections,
    outro: article.outro_html,
    faq: article.faq,
    products: products.map((p) => ({
      name: p.name,
      price: p.price,
      image: p.image,
      affiliateUrl: p.affiliateUrl,
      isRocket: p.isRocket,
      isFreeShipping: p.isFreeShipping,
      productId: p.productId ?? null,
      brand: p.brand ?? null,
      naverPrice: p.naverPrice ?? null,
    })),
    alternatives: [],
    video,
    sources: facts.map((f) => ({ title: f.title, link: f.link, kind: f.kind })),
    metaDescription: article.tldr || makeExcerpt(article.intro_html, 150) || `${main.name} 리뷰`,
    type: products.length > 1 ? 'comparison' : 'review',
    modelUsed,
    source: 'generator',
  };
}

export function summarize(p) {
  return {
    slug: p.slug,
    title: p.title,
    keyword: p.keyword,
    type: p.type,
    createdAt: p.createdAt,
    intro: p.intro,
    products: p.products?.[0] ? [p.products[0]] : [],
    modelUsed: p.modelUsed || '',
    videoImageToVideo: null,
    videoTextToVideo: null,
    pinnedUntil: 0,
  };
}
