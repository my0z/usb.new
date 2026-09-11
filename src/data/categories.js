/**
 * usb.kr 카테고리 정의.
 * 기존 사이트와 동일한 키워드 매핑을 유지해 URL 과 분류가 그대로 이어지게 한다.
 */
export const categories = [
  { slug: 'audio', name: '오디오', keywords: ['무선이어폰', '블루투스이어폰', '블루투스스피커', '헤드폰', '헤드셋', '사운드바', '게이밍헤드셋', '넥밴드이어폰', '스피커독', '미니스피커', '유선이어폰', '콘덴서마이크', '방송용마이크', '블루투스리시버', '블루투스송신기', '턴테이블', '앰프', '휴대용DAC', '골전도이어폰'] },
  { slug: 'mobile', name: '모바일 액세서리', keywords: ['보조배터리', '무선충전기', '충전기', '폰케이스', '강화유리필름', '차량용거치대', '차량용충전기', '고속충전케이블', 'C타입케이블', '젠더', '셀카봉', '스마트폰짐벌', '방수케이스', '폰스트랩', '멀티포트충전기', '스마트폰렌즈', '스마트폰그립톡', '폰투명케이스'] },
  { slug: 'pc', name: 'PC 주변기기', keywords: ['기계식키보드', '무선마우스', '게이밍마우스', '게이밍키보드', '모니터암', '웹캠', '웹캠거치대', 'usb허브', '외장SSD', '외장하드', 'usb메모리', 'hdmi케이블', '멀티탭', '노트북거치대', '노트북파우치', '마우스패드', '키보드팔레스트', '도킹스테이션', 'usb-c허브', '노트북쿨러', '노트북받침대', '캡처보드', '펜슬케이스', '외장그래픽카드', '웹캠커버', '노트북어댑터'] },
  { slug: 'display', name: '디스플레이/영상', keywords: ['휴대용모니터', '미니빔프로젝터', '게이밍모니터', '터치모니터', '모니터받침대', 'hdmi스위치', '프로젝터스크린'] },
  { slug: 'wearable', name: '웨어러블', keywords: ['스마트워치', '스마트링', '스마트밴드', '심박측정기', '스마트글래스', '스마트이어링'] },
  { slug: 'tablet', name: '태블릿/독서', keywords: ['태블릿거치대', '전자책리더기', '태블릿케이스', '태블릿펜', '필기감펜'] },
  { slug: 'smarthome', name: '스마트홈/생활가전', keywords: ['로봇청소기', '무선청소기', '공기청정기', '스마트플러그', '스마트조명', '스마트도어락', 'IoT센서', '홈캠', 'CCTV', '반려동물카메라', '스마트체중계', '가습기', '제습기', '온습도계', '도어벨카메라', '스마트초인종', '스팀청소기', '무선다리미', '자외선살균기'] },
  { slug: 'network', name: '네트워크', keywords: ['와이파이공유기', '유심라우터', '메시공유기', '랜케이블', '스위칭허브', '포켓와이파이'] },
  { slug: 'gaming', name: '게이밍/VR', keywords: ['콘솔게임패드', 'VR기기', '게이밍의자', '조이스틱', '게임패드', '콘솔거치대', '게이밍마우스패드', '스트리밍캡처카드'] },
  { slug: 'camera', name: '카메라', keywords: ['액션캠', '짐벌', '삼각대', '미러리스카메라', '웹캠라이트', '링라이트', '드론', '카메라가방', 'ND필터', '카메라스트랩', '짐벌액세서리'] },
  { slug: 'car', name: '차량용 전자기기', keywords: ['블랙박스', '차량용무선카플레이', '차량용공기청정기', '타이어공기압측정기', '차량용청소기', '차량용냉장고', '차량용선풍기', '하이패스단말기', '타이어펌프', '점프스타터'] },
  { slug: 'health', name: '건강/헬스테크', keywords: ['혈압계', '체온계', '마사지건', '안마기', '체지방측정기', '수면측정기', '스마트줄넘기', '스마트요가매트'] },
  { slug: 'office', name: '사무/교육 전자기기', keywords: ['라벨프린터', '문서스캐너', '계산기', '전자사전', '화이트보드', '문서파쇄기'] },
  { slug: 'lighting', name: '조명/전기', keywords: ['led스탠드', '무드등', '감성조명', 'usb선풍기', '캠핑랜턴'] },
  { slug: 'diy', name: '3D프린팅/DIY', keywords: ['3d프린터', '라즈베리파이', '아두이노', '납땜인두기', '멀티미터'] },
  { slug: 'pet', name: '반려동물테크', keywords: ['자동급식기', '스마트급수기', '펫도어락', '펫트래커'] },
  { slug: 'homeoffice', name: '홈오피스/생산성', keywords: ['스탠딩데스크', '모니터라이트바', '데스크매트', '케이블정리함', '무선프레젠터'] },
  { slug: 'streaming', name: '스트리밍/방송장비', keywords: ['방송용조명', '그린스크린', '마이크암', '팟캐스트믹서', '스트리밍마이크'] },
  { slug: 'power', name: '포터블파워', keywords: ['포터블파워스테이션', '태양광충전기', '캠핑용발전기'] },
];

const bySlug = new Map(categories.map((c) => [c.slug, c]));
const byKeyword = new Map();
for (const c of categories) for (const k of c.keywords) byKeyword.set(k.toLowerCase(), c);

export function getCategory(slug) {
  return bySlug.get(slug) ?? null;
}

/** 글의 keyword 로 카테고리를 찾는다. 없으면 null. */
export function categoryOfPost(post) {
  const k = String(post?.keyword ?? '').toLowerCase().replace(/\s+/g, '');
  if (byKeyword.has(k)) return byKeyword.get(k);
  for (const [kw, c] of byKeyword) if (k.includes(kw)) return c;
  return null;
}
