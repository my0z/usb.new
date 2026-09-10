import { html } from '../lib/html.js';
import { layout } from './layout.js';
import { cardGrid } from './components.js';
import { sortedReviews } from '../data/reviews.js';

export function notFoundPage({ canonical }) {
  const body = html`<div class="shell shell--narrow">
    <header class="page-head">
      <p class="eyebrow">404</p>
      <h1 class="page-title">찾는 페이지가 없다</h1>
      <p class="page-desc">주소가 바뀌었거나 삭제된 글일 수 있다. 최근 리뷰부터 확인해 보자.</p>
    </header>
  </div>
  <div class="shell">${cardGrid(sortedReviews().slice(0, 3), 'compact')}</div>`;

  return layout({ title: '페이지를 찾을 수 없다', description: '요청한 주소가 존재하지 않는다.', canonical, active: '', body });
}
