// ============================================================================
// [음악왕 v10.0] 레벨·타이틀(20단계) & 고해상도 캐릭터·상점(시세×10·배경8종·대폭확장) 렌더러
// - 캔버스 종횡비 자동 1:1 정배율 동기화로 캐릭터 좌우 찌그러짐 완벽 해결
// - 모든 유료 아이템 및 변경권 시세 ×10배 적용 + 배경/헤어/모자/표정/악기/의상 대폭 추가
// ============================================================================

const EXP_LEVEL_TABLE = [
  { level: 1,  reqExp: 0,      title: "🐣 방구석 리스너" },
  { level: 2,  reqExp: 1000,   title: "🎧 이어폰 유망주" },
  { level: 3,  reqExp: 2500,   title: "🎵 흥얼대는 루키" },
  { level: 4,  reqExp: 4500,   title: "🎤 코인노래방 단골" },
  { level: 5,  reqExp: 7000,   title: "📻 심야 라디오 DJ" },
  { level: 6,  reqExp: 10000,  title: "🎸 홍대 인디 루키" },
  { level: 7,  reqExp: 14000,  title: "🥁 리듬 비트메이커" },
  { level: 8,  reqExp: 19000,  title: "💿 음반 콜렉터" },
  { level: 9,  reqExp: 25000,  title: "🎹 스튜디오 세션맨" },
  { level: 10, reqExp: 32000,  title: "🌟 데뷔 직전 연습생" },
  { level: 11, reqExp: 40500,  title: "📺 음방 1위 후보" },
  { level: 12, reqExp: 50500,  title: "💃 떼창 엔딩요정" },
  { level: 13, reqExp: 62000,  title: "🏆 골든디스크 신인왕" },
  { level: 14, reqExp: 75000,  title: "🔊 음원차트 올킬러" },
  { level: 15, reqExp: 90000,  title: "🎙️ 고척돔 매진 보컬" },
  { level: 16, reqExp: 107000, title: "🎼 천재 히트 작곡가" },
  { level: 17, reqExp: 126500, title: "🌍 빌보드 핫100 스타" },
  { level: 18, reqExp: 148500, title: "⚡ 1초 컷 가요 마스터" },
  { level: 19, reqExp: 173000, title: "💎 살아있는 K-POP 백과" },
  { level: 20, reqExp: 200000, title: "👑 대한민국 전설의 음악왕" }
];

function getLevelInfo(rawExp = 0) {
  const exp = Math.max(0, Math.floor(Number(rawExp) || 0));
  let cur = EXP_LEVEL_TABLE[0];
  for (let i = 0; i < EXP_LEVEL_TABLE.length; i++) {
    if (exp >= EXP_LEVEL_TABLE[i].reqExp) {
      cur = EXP_LEVEL_TABLE[i];
    } else {
      break;
    }
  }
  const next = EXP_LEVEL_TABLE.find(item => item.level === cur.level + 1) || null;
  if (!next) {
    return {
      level: cur.level,
      title: cur.title,
      exp,
      curReq: cur.reqExp,
      nextReq: cur.reqExp,
      inLevelExp: exp - cur.reqExp,
      needInLevel: 0,
      percent: 100,
      isMax: true
    };
  }
  const inLevelExp = exp - cur.reqExp;
  const needInLevel = next.reqExp - cur.reqExp;
  const percent = Math.min(100, Math.max(0, (inLevelExp / needInLevel) * 100));
  return {
    level: cur.level,
    title: cur.title,
    exp,
    curReq: cur.reqExp,
    nextReq: next.reqExp,
    inLevelExp,
    needInLevel,
    percent,
    isMax: false
  };
}

const SHOP_CATALOG_VERSION = 10;

const BASE_AVATAR_SHOP_ITEMS = {
  bg: [
    { id: "meadow", name: "초원 잔디마당", price: 0, grade: "C", desc: "따사로운 햇살과 귀여운 구름이\n두둥실 떠다니는 평화로운 뒷마당", colors: ["#5ec8f8", "#aee4ff", "#76d32d", "#58b018"] },
    { id: "neon", name: "네온 뮤직뱅크", price: 400, grade: "B", desc: "화려한 스포트라이트가 쏟아지는\n생방송 음악방송 메인 스테이지", colors: ["#1e1b4b", "#3730a3", "#f43f5e", "#312e81"] },
    { id: "sakura", name: "봄날 벚꽃동산", price: 500, grade: "B", desc: "분홍빛 벚꽃잎이 흩날리는\n설레는 봄날의 피크닉 동산", colors: ["#fda4af", "#ffe4e6", "#f472b6", "#db2777"] },
    { id: "sunset_beach", name: "노을 해변 페스티벌", price: 650, grade: "A", desc: "붉은 석양과 야자수가 어우러진\n여름 밤바다 락 페스티벌 무대", colors: ["#fb7185", "#fdba74", "#0284c7", "#0369a1"] },
    { id: "hangang_night", name: "한강 불꽃 야경", price: 850, grade: "A", desc: "서울 야경과 화려한 불꽃놀이가\n밤하늘을 수놓는 한강 야외공연장", colors: ["#0f172a", "#312e81", "#1e293b", "#0f172a"] },
    { id: "midi_cyber", name: "일렉트로 미디 룸", price: 950, grade: "A", desc: "사이버 네온 이퀄라이저가 뛰노는\n최첨단 전자 미디 녹음 스튜디오", colors: ["#171e36", "#27345e", "#0ea5e9", "#0f172a"] },
    { id: "galaxy", name: "스타라이트 우주홀", price: 1200, grade: "S", desc: "별똥별과 행성이 반짝이는 신비로운\n우주 최강 음악왕 스테이지", colors: ["#0f172a", "#1e1b4b", "#4c1d95", "#2e1065"] },
    { id: "royal", name: "황금 음악왕성", price: 2000, grade: "S", desc: "오직 전설의 음악왕만이 설 수 있는\n블링블링 순금빛 로얄 스테이지", colors: ["#fde047", "#fef9c3", "#dc2626", "#991b1b"] }
  ],
  hair: [
    { id: "default", name: "바가지 머리", price: 0, grade: "C", desc: "동글동글 귀엽게 자른\n시그니처 기본 바가지 헤어", color: "#27272a", style: "bowl" },
    { id: "blonde", name: "샤이닝 금발", price: 350, grade: "C", desc: "어디서나 눈에 확 띄는\n아이돌 센터 황금빛 염색", color: "#facc15", style: "bowl" },
    { id: "monkey_hood", name: "몽키 모자", price: 450, grade: "B", desc: "동글동글 큰 귀가 매력적인\n개구쟁이 원숭이 모자", color: "#6b3410", style: "monkey" },
    { id: "sprout_hat", name: "초록 새싹모자", price: 500, grade: "B", desc: "머리 위에서 광합성 중!\n귀여운 초록 새싹 모자", color: "#4ade80", style: "sprout" },
    { id: "mint_comma", name: "민트 쉼표머리", price: 550, grade: "B", desc: "상큼한 민트초코 컬러에\n멋스럽게 내린 아이돌 쉼표 헤어", color: "#2dd4bf", style: "bowl" },
    { id: "pink_twin", name: "핑크 양갈래", price: 600, grade: "A", desc: "상큼발랄 과즙미가 터지는\n핑크빛 트윈테일 스타일", color: "#f472b6", style: "twin" },
    { id: "rock_red", name: "불꽃 샤기컷", price: 700, grade: "A", desc: "고음이 3옥타브 더 올라가는\n정열의 레드 록스타 헤어", color: "#ef4444", style: "spiky" },
    { id: "octo_hat", name: "문어 모자", price: 750, grade: "A", desc: "동글동글 빨판이 매력적인\n엉뚱발랄 숲속 문어 모자", color: "#ea580c", style: "octo" },
    { id: "silver_perm", name: "실버 프로듀서", price: 850, grade: "A", desc: "차도남·차도녀 느낌 물씬 나는\n백금발 실버 웨이브 헤어", color: "#cbd5e1", style: "bowl" },
    { id: "violet_twin", name: "보라빛 요정트윈", price: 1100, grade: "S", desc: "신비로운 퍼플 그라데이션이\n돋보이는 요정 양갈래 헤어", color: "#a855f7", style: "twin" }
  ],
  hat: [
    { id: "none", name: "모자 벗기", price: 0, grade: "C", desc: "아무 모자도 쓰지 않은\n시원하고 깔끔한 기본 상태" },
    { id: "headset", name: "프로 헤드셋", price: 450, grade: "B", desc: "1초 듣기 문제가 잘 들리는\n블루투스 프로 헤드셋", color: "#0ea5e9" },
    { id: "bucket_hat", name: "힙합 버킷햇", price: 500, grade: "B", desc: "90년대 힙합 전사들이 즐겨 쓴\n감성 블랙 버킷햇 벙거지", color: "#1e293b" },
    { id: "acorn_hat", name: "도토리 모자", price: 550, grade: "B", desc: "가을 숲속 다람쥐가 탐내는\n동글동글 도토리 베레모", color: "#854d0e" },
    { id: "bunny_band", name: "토끼귀 머리띠", price: 600, grade: "B", desc: "팬미팅 필수 아이템!\n쫑긋쫑긋 귀여운 핑크 토끼 귀", color: "#fb7185" },
    { id: "cat_ear", name: "고양이 헤드폰", price: 650, grade: "A", desc: "냐옹~ 귀여운 고양이 귀가 달린\n인기 만점 핑크 헤드폰", color: "#f43f5e" },
    { id: "beret_art", name: "빨간 베레모", price: 700, grade: "A", desc: "작곡가 감성이 폭발하는\n세련된 파리지앵 빨간 베레모", color: "#dc2626" },
    { id: "angel", name: "천사의 링", price: 900, grade: "A", desc: "머리 위에서 둥실 빛나는\n순백의 천사 헤일로", color: "#facc15" },
    { id: "devil_horn", name: "꼬마 악마뿔", price: 950, grade: "A", desc: "강렬한 락 스피릿을 뽐내는\n귀여운 붉은 악마 뿔 머리띠", color: "#e11d48" },
    { id: "crown", name: "음악왕 왕관", price: 2000, grade: "S", desc: "가요계 모든 문제를 정복한\n절대강자의 루비 황금 왕관", color: "#f59e0b" }
  ],
  face: [
    { id: "default", name: "기본 미소", price: 0, grade: "C", desc: "보기만 해도 기분 좋아지는\n동글동글 고양이 입 미소" },
    { id: "square_glass", name: "뿔테 안경", price: 350, grade: "B", desc: "나무위키 비하인드를 꿰고 있는\n척척박사 네모 안경" },
    { id: "wink", name: "심쿵 윙크", price: 400, grade: "B", desc: "무대 엔딩요정처럼 상큼하게\n한쪽 눈을 찡긋 감은 표정" },
    { id: "singing", name: "열창 표정", price: 500, grade: "A", desc: "마이크가 찢어지도록 열창하는\n득음 직전의 표정" },
    { id: "swirl_glass", name: "골뱅이 안경", price: 550, grade: "B", desc: "빙글뱅글 어지러워~!\n코믹 지수 200% 골뱅이 안경" },
    { id: "sunglass", name: "힙합 선글라스", price: 600, grade: "A", desc: "연예인 포스가 뿜어져 나오는\n블랙 다크 선글라스" },
    { id: "heart_eyes", name: "하트 뿅뿅눈", price: 750, grade: "A", desc: "좋아하는 최애 가수를 본 듯\n두 눈에 빨간 하트가 반짝!", color: "#f43f5e" },
    { id: "neon_visor", name: "사이버 고글", price: 900, grade: "S", desc: "미래에서 온 일렉트로닉 뮤지션!\n시안 네온 바이저 고글", color: "#38bdf8" },
    { id: "star_eyes", name: "슈퍼스타 별눈", price: 1100, grade: "S", desc: "눈동자 속에서 황금별이 반짝이는\n진정한 톱스타의 눈빛", color: "#facc15" }
  ],
  outfit: [
    { id: "basic", name: "빨간 망토티", price: 0, grade: "C", desc: "귀여운 빨간 스카프가 달린\n활동성 만점 기본 티셔츠", main: "#ef4444", sub: "#ffffff" },
    { id: "overalls", name: "캔디 멜빵룩", price: 500, grade: "B", desc: "90년대 감성이 물씬 풍기는\n노란 티셔츠와 청멜빵", main: "#facc15", sub: "#2563eb" },
    { id: "hoodie_mint", name: "스트릿 후드티", price: 550, grade: "B", desc: "연습실에서 막 나온 듯 힙한\n민트색 오버핏 후드티", main: "#14b8a6", sub: "#f8fafc" },
    { id: "uniform", name: "명문고 교복", price: 600, grade: "B", desc: "단정하고 풋풋한 매력이 넘치는\n하이스쿨 스쿨룩", main: "#1e293b", sub: "#ef4444" },
    { id: "denim_90s", name: "90s 청청 힙합", price: 750, grade: "A", desc: "서태지와 90년대 댄스가수 감성\n풀장착 복고 데님 자켓", main: "#3b82f6", sub: "#fef08a" },
    { id: "rock_leather", name: "락스타 가죽자켓", price: 900, grade: "A", desc: "무대 위 카리스마 폭발!\n강렬한 레드&블랙 라이더 자켓", main: "#18181b", sub: "#e11d48" },
    { id: "idol_suit", name: "아이돌 제복", price: 1100, grade: "S", desc: "시상식 대상을 휩쓸 것 같은\n화려한 금장 스카이 제복", main: "#0284c7", sub: "#facc15" },
    { id: "astronaut", name: "우주비행사 슈트", price: 1400, grade: "S", desc: "우주 무대에 어울리는 화이트\n하이테크 아스트로 슈트", main: "#f1f5f9", sub: "#38bdf8" },
    { id: "king_robe", name: "음악왕 망토", price: 1800, grade: "S", desc: "바람에 멋지게 휘날리는\n최고급 임페리얼 골드 로브", main: "#b45309", sub: "#fde047" }
  ],
  acc: [
    { id: "none", name: "악기 미착용", price: 0, grade: "C", desc: "손에 아무것도 들지 않은\n가벼운 기본 상태" },
    { id: "mic_silver", name: "보컬 마이크", price: 0, grade: "C", desc: "촘촘한 그릴망과 스위치가 달린\n스튜디오 표준 마이크", color: "#94a3b8" },
    { id: "tambourine", name: "별빛 탬버린", price: 350, grade: "C", desc: "노래방 분위기 메이커!\n흔들면 찰랑거리는 황금 탬버린", color: "#facc15" },
    { id: "acoustic_guitar", name: "포크 통기타", price: 650, grade: "B", desc: "감미로운 어쿠스틱 발라드에\n딱 어울리는 원목 어쿠스틱 기타", color: "#d97706" },
    { id: "lightstick", name: "하트 응원봉", price: 750, grade: "A", desc: "투명 돔 안에 하트가 빛나는\n공식 팬클럽 응원봉", color: "#ec4899" },
    { id: "boombox", name: "마스터 붐박스", price: 900, grade: "A", desc: "듀얼 우퍼와 카세트 데크가 달린\n스트릿 힙합 대형 라디오", color: "#334155" },
    { id: "keytar", name: "숄더 키타", price: 950, grade: "A", desc: "어깨에 메고 건반을 연주하는\n신스팝 밴드 신디사이저", color: "#0ea5e9" },
    { id: "saxophone", name: "재즈 색소폰", price: 1150, grade: "A", desc: "매혹적인 브라스 사운드!\n곡선이 우아한 황금 색소폰", color: "#f59e0b" },
    { id: "guitar", name: "스트랫 기타", price: 1200, grade: "S", desc: "6현 줄과 픽업까지 정교한\n체리레드 커스텀 일렉기타", color: "#dc2626" },
    { id: "dj_deck", name: "DJ 턴테이블", price: 1350, grade: "S", desc: "LP 스크래칭이 가능한\n네온 LED 클럽 DJ 믹서", color: "#38bdf8" },
    { id: "mic_gold", name: "황금 마이크", price: 1400, grade: "S", desc: "가왕의 목소리를 담아내는\n눈부신 24K 순금 마이크", color: "#facc15" },
    { id: "trophy", name: "음악왕 트로피", price: 1800, grade: "S", desc: "1위 가수만 거머쥘 수 있는\n영광의 순금 음방 1위 트로피", color: "#fbbf24" }
  ],
  special: [
    {
      id: "nickname_ticket",
      name: "✨ 닉네임 변경권",
      price: 5000,
      grade: "S",
      consumable: true,
      desc: "5,000 CD를 사용하여 내 계정의 닉네임을\n원하는 새 이름으로 즉시 변경합니다."
    },
    {
      id: "gender_ticket",
      name: "⚧️ 성별 변경권",
      price: 10000,
      grade: "S",
      consumable: true,
      desc: "10,000 CD를 사용하여 기본 캐릭터 성별을\n(남자 ↔ 여자) 즉시 전환합니다."
    }
  ]
};

let AVATAR_SHOP_ITEMS = JSON.parse(JSON.stringify(BASE_AVATAR_SHOP_ITEMS));

const DEFAULT_AVATAR_CONFIG = {
  gender: "male",
  bg: "meadow",
  hair: "default",
  hat: "none",
  face: "default",
  outfit: "basic",
  acc: "mic_silver"
};

function applyServerShopCatalog(customCatalog, catalogVersion = 0) {
  if (!customCatalog || typeof customCatalog !== "object") return;
  // 구버전 DB 카탈로그(v10 미만)가 10배 시세 및 신규 아이템을 덮어쓰지 않도록 방어!
  if (Number(catalogVersion) < SHOP_CATALOG_VERSION) {
    return;
  }
  Object.keys(BASE_AVATAR_SHOP_ITEMS).forEach(cat => {
    const baseList = BASE_AVATAR_SHOP_ITEMS[cat] || [];
    const srvList = Array.isArray(customCatalog[cat]) ? customCatalog[cat] : [];
    const mergedMap = new Map(baseList.map(i => [i.id, { ...i }]));
    srvList.forEach(si => {
      if (si && si.id) mergedMap.set(si.id, { ...(mergedMap.get(si.id) || {}), ...si });
    });
    AVATAR_SHOP_ITEMS[cat] = Array.from(mergedMap.values());
  });
}

function getItemById(category, id) {
  const list = AVATAR_SHOP_ITEMS[category] || [];
  return list.find(item => item.id === id) || list[0] || { id: "none", name: "없음", price: 0, grade: "C", desc: "" };
}

function fillRoundRect(ctx, x, y, w, h, radius, fill, stroke = null, strokeWidth = 7) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

// ============================================================================
// 정밀 악기 일러스트 드로잉 함수 (12종 전종 지원!)
// ============================================================================
function drawDetailedInstrument(ctx, accItem, cx, cy, scale = 1) {
  if (!accItem || accItem.id === "none") return;
  const outline = "#1e1b18";
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  if (accItem.id === "mic_silver" || accItem.id === "mic_gold") {
    const isGold = accItem.id === "mic_gold";
    ctx.rotate(-0.22);
    fillRoundRect(ctx, -6, 42, 12, 14, 4, "#0f172a", outline, 3.5);
    ctx.fillStyle = isGold ? "#d97706" : "#334155";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-11, -6); ctx.lineTo(11, -6); ctx.lineTo(8, 44); ctx.lineTo(-8, 44);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, -3, 8, 6, 14, 2, "#0f172a");
    fillRoundRect(ctx, -2, 10, 4, 6, 1, "#ef4444");

    const headGrad = ctx.createRadialGradient(-6, -26, 4, 0, -22, 24);
    headGrad.addColorStop(0, isGold ? "#fef08a" : "#f8fafc");
    headGrad.addColorStop(0.6, isGold ? "#facc15" : "#94a3b8");
    headGrad.addColorStop(1, isGold ? "#b45309" : "#475569");
    ctx.fillStyle = headGrad;
    ctx.beginPath(); ctx.arc(0, -22, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.save();
    ctx.beginPath(); ctx.arc(0, -22, 20, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = isGold ? "rgba(146, 64, 14, 0.45)" : "rgba(15, 23, 42, 0.35)";
    ctx.lineWidth = 1.8;
    for (let i = -28; i <= 28; i += 7) {
      ctx.beginPath();
      ctx.moveTo(i, -45); ctx.lineTo(i + 18, 0);
      ctx.moveTo(i, 0); ctx.lineTo(i + 18, -45);
      ctx.stroke();
    }
    ctx.restore();
    fillRoundRect(ctx, -22, -25, 44, 6, 3, isGold ? "#fef08a" : "#e2e8f0", outline, 3.5);
  } else if (accItem.id === "guitar" || accItem.id === "acoustic_guitar") {
    const isAcoustic = accItem.id === "acoustic_guitar";
    ctx.rotate(-0.45);
    fillRoundRect(ctx, -7, -95, 14, 78, 3, isAcoustic ? "#78350f" : "#fde68a", outline, 4);
    ctx.strokeStyle = isAcoustic ? "#fde68a" : "#92400e";
    ctx.lineWidth = 1.6;
    for (let fy = -85; fy < -20; fy += 9) {
      ctx.beginPath(); ctx.moveTo(-6, fy); ctx.lineTo(6, fy); ctx.stroke();
    }
    ctx.fillStyle = isAcoustic ? "#78350f" : "#dc2626";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, -94); ctx.lineTo(-14, -124); ctx.lineTo(6, -130); ctx.lineTo(10, -94);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    for (let py = -122; py <= -100; py += 7) {
      ctx.beginPath(); ctx.arc(-16, py, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    const bodyGrad = ctx.createLinearGradient(-40, -25, 40, 55);
    if (isAcoustic) {
      bodyGrad.addColorStop(0, "#fbbf24");
      bodyGrad.addColorStop(0.5, "#d97706");
      bodyGrad.addColorStop(1, "#92400e");
    } else {
      bodyGrad.addColorStop(0, "#f87171");
      bodyGrad.addColorStop(0.3, "#dc2626");
      bodyGrad.addColorStop(1, "#7f1d1d");
    }
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-12, -24);
    ctx.bezierCurveTo(-36, -38, -42, -5, -28, 12);
    ctx.bezierCurveTo(-48, 28, -44, 66, 0, 68);
    ctx.bezierCurveTo(44, 66, 48, 28, 26, 12);
    ctx.bezierCurveTo(38, -2, 34, -32, 12, -20);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    if (isAcoustic) {
      ctx.fillStyle = "#451a03";
      ctx.strokeStyle = "#fef3c7";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 12, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      fillRoundRect(ctx, -14, 34, 28, 8, 2, "#451a03", outline, 2);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(2, 20, 22, 30, 0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      fillRoundRect(ctx, -10, 4, 20, 5, 2, "#1e293b");
      fillRoundRect(ctx, -10, 14, 20, 5, 2, "#1e293b");
      fillRoundRect(ctx, -10, 24, 20, 5, 2, "#1e293b");
      fillRoundRect(ctx, -12, 38, 24, 9, 2, "#94a3b8", outline, 2.5);
    }

    ctx.strokeStyle = "rgba(241, 245, 249, 0.92)";
    ctx.lineWidth = 1.1;
    for (let sx = -4; sx <= 4; sx += 2.6) {
      ctx.beginPath(); ctx.moveTo(sx, -94); ctx.lineTo(sx, 38); ctx.stroke();
    }
  } else if (accItem.id === "lightstick") {
    ctx.rotate(-0.18);
    ctx.strokeStyle = "#f472b6"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 52, 8, 0, Math.PI * 2); ctx.stroke();
    fillRoundRect(ctx, -9, 0, 18, 48, 8, "#ffffff", outline, 4);
    fillRoundRect(ctx, -12, -6, 24, 9, 4, "#fb7185", outline, 3.5);
    fillRoundRect(ctx, -3, 14, 6, 6, 3, "#ec4899");

    const domeGrad = ctx.createRadialGradient(-8, -32, 4, 0, -28, 30);
    domeGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    domeGrad.addColorStop(0.5, "rgba(251, 207, 232, 0.75)");
    domeGrad.addColorStop(1, "rgba(244, 114, 182, 0.85)");
    ctx.fillStyle = domeGrad; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(0, -28, 28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = "#e11d48";
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.bezierCurveTo(-18, -28, -16, -44, 0, -34);
    ctx.bezierCurveTo(16, -44, 18, -28, 0, -16);
    ctx.fill();
  } else if (accItem.id === "keytar") {
    ctx.rotate(-0.35);
    fillRoundRect(ctx, -42, -22, 84, 46, 12, "#0284c7", outline, 4.5);
    fillRoundRect(ctx, -68, -10, 28, 20, 6, "#0369a1", outline, 4);
    fillRoundRect(ctx, -34, -15, 26, 8, 3, "#0f172a");
    fillRoundRect(ctx, -32, -13, 14, 4, 1, "#38bdf8");
    fillRoundRect(ctx, -34, -2, 68, 20, 3, "#ffffff", outline, 3);
    ctx.strokeStyle = outline; ctx.lineWidth = 1.5;
    for (let kx = -26; kx < 30; kx += 8) {
      ctx.beginPath(); ctx.moveTo(kx, -2); ctx.lineTo(kx, 18); ctx.stroke();
    }
    for (let bkx = -29; bkx < 24; bkx += 8) {
      if (bkx === -5 || bkx === 19) continue;
      fillRoundRect(ctx, bkx, -2, 5, 11, 1, "#0f172a");
    }
  } else if (accItem.id === "boombox") {
    ctx.strokeStyle = "#64748b"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(22, -24); ctx.lineTo(38, -56); ctx.stroke();
    fillRoundRect(ctx, -28, -34, 56, 12, 5, "#94a3b8", outline, 4);
    fillRoundRect(ctx, -48, -24, 96, 58, 10, "#334155", outline, 4.5);
    fillRoundRect(ctx, -42, -18, 84, 12, 4, "#0f172a");
    [-26, 26].forEach(sx => {
      ctx.fillStyle = "#0f172a"; ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx, 11, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#475569";
      ctx.beginPath(); ctx.arc(sx, 11, 6, 0, Math.PI * 2); ctx.fill();
    });
    fillRoundRect(ctx, -9, 2, 18, 16, 3, "#facc15", outline, 2.5);
  } else if (accItem.id === "tambourine") {
    ctx.rotate(-0.2);
    ctx.strokeStyle = "#d97706"; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = outline; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 41, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#fef08a";
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2;
      fillRoundRect(ctx, Math.cos(ang) * 34 - 5, Math.sin(ang) * 34 - 5, 10, 10, 5, "#e2e8f0", outline, 2.5);
    }
  } else if (accItem.id === "saxophone") {
    ctx.rotate(0.15);
    ctx.strokeStyle = outline; ctx.lineWidth = 20; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-24, -46); ctx.lineTo(-4, -36); ctx.lineTo(-4, 24);
    ctx.arc(14, 24, 18, Math.PI, 0, true); ctx.lineTo(32, -4); ctx.stroke();
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(-24, -46); ctx.lineTo(-4, -36); ctx.lineTo(-4, 24);
    ctx.arc(14, 24, 18, Math.PI, 0, true); ctx.lineTo(32, -4); ctx.stroke();
    ctx.fillStyle = "#fef08a"; ctx.strokeStyle = outline; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(32, -8, 16, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (accItem.id === "dj_deck") {
    fillRoundRect(ctx, -48, -28, 96, 56, 8, "#1e293b", outline, 4.5);
    [-24, 24].forEach(lx => {
      ctx.fillStyle = "#090d16"; ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(lx, 0, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath(); ctx.arc(lx, 0, 5, 0, Math.PI * 2); ctx.fill();
    });
    fillRoundRect(ctx, -4, -16, 8, 32, 3, "#475569");
    fillRoundRect(ctx, -6, 2, 12, 6, 2, "#fde047");
  } else if (accItem.id === "trophy") {
    fillRoundRect(ctx, -18, 28, 36, 14, 4, "#78350f", outline, 4);
    fillRoundRect(ctx, -6, 12, 12, 18, 2, "#f59e0b", outline, 3.5);
    ctx.fillStyle = "#facc15"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-24, -34); ctx.lineTo(24, -34); ctx.lineTo(14, 14); ctx.lineTo(-14, 14);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(-24, -14, 11, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(24, -14, 11, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.fillStyle = "#ef4444"; ctx.font = "900 18px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("1", 0, -4);
  }

  ctx.restore();
}

// ============================================================================
// 1. 와이드 파노라마 배경 렌더러 (8종 테마 커스텀 그래픽!)
// ============================================================================
function renderApfWideBackground(ctx, W, H, bgItem) {
  const id = (bgItem && bgItem.id) || "meadow";
  const c = (bgItem && bgItem.colors) || ["#5ec8f8", "#aee4ff", "#76d32d", "#58b018"];

  const horizonY = H * 0.58;
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 10);
  skyGrad.addColorStop(0, c[0]);
  skyGrad.addColorStop(1, c[1]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  if (id === "neon" || id === "midi_cyber") {
    // 레이저 빔 & 네온 격자 스튜디오
    ctx.save();
    ctx.fillStyle = id === "neon" ? "rgba(244, 63, 94, 0.22)" : "rgba(56, 189, 248, 0.2)";
    ctx.beginPath(); ctx.moveTo(W * 0.2, 0); ctx.lineTo(W * 0.05, horizonY); ctx.lineTo(W * 0.35, horizonY); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W * 0.8, 0); ctx.lineTo(W * 0.65, horizonY); ctx.lineTo(W * 0.95, horizonY); ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.22)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, horizonY); ctx.lineTo(x + (x - W / 2) * 0.6, H); ctx.stroke();
    }
    ctx.restore();
  } else if (id === "galaxy" || id === "hangang_night") {
    // 밤하늘 별 & 도시 실루엣 / 행성
    ctx.fillStyle = "#fef08a";
    [[0.12, 0.16], [0.25, 0.3], [0.42, 0.12], [0.68, 0.22], [0.85, 0.14], [0.91, 0.34]].forEach(([rx, ry]) => {
      ctx.beginPath(); ctx.arc(W * rx, H * ry, 4, 0, Math.PI * 2); ctx.fill();
    });
    if (id === "hangang_night") {
      ctx.fillStyle = "#0f172a";
      [0.08, 0.18, 0.72, 0.84, 0.92].forEach((bx, i) => {
        ctx.fillRect(W * bx, horizonY - 40 - (i % 2) * 28, W * 0.08, 45 + (i % 2) * 28);
      });
      ctx.strokeStyle = "#f43f5e"; ctx.lineWidth = 2.5;
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(W * 0.78, H * 0.24);
        ctx.lineTo(W * 0.78 + Math.cos(ang) * 26, H * 0.24 + Math.sin(ang) * 26); ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#a855f7";
      ctx.beginPath(); ctx.arc(W * 0.82, H * 0.22, 26, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // 햇살 구름 / 벚꽃 / 석양
    const drawCuteCloud = (cx, cy, scale = 1) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-28, 6, 22, 0, Math.PI * 2);
      ctx.arc(0, -6, 28, 0, Math.PI * 2);
      ctx.arc(28, 6, 22, 0, Math.PI * 2);
      ctx.arc(0, 12, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fda4af";
      ctx.beginPath(); ctx.arc(-16, 6, 5, 0, Math.PI * 2); ctx.arc(16, 6, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#475569"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-12, 0); ctx.lineTo(-8, -3); ctx.lineTo(-4, 0);
      ctx.moveTo(4, 0); ctx.lineTo(8, -3); ctx.lineTo(12, 0);
      ctx.stroke();
      ctx.restore();
    };
    drawCuteCloud(W * 0.2, H * 0.22, 0.95);
    drawCuteCloud(W * 0.8, H * 0.18, 0.85);

    if (id === "sakura") {
      ctx.fillStyle = "#fce7f3";
      [[0.15, 0.4], [0.35, 0.28], [0.65, 0.35], [0.88, 0.42]].forEach(([px, py]) => {
        ctx.beginPath(); ctx.ellipse(W * px, H * py, 7, 4, 0.6, 0, Math.PI * 2); ctx.fill();
      });
    } else if (id === "sunset_beach") {
      ctx.fillStyle = "#fde047";
      ctx.beginPath(); ctx.arc(W * 0.5, horizonY - 12, 42, Math.PI, 0); ctx.fill();
    } else if (id === "meadow") {
      ctx.fillStyle = c[3];
      for (let x = 0; x <= W + 40; x += 52) {
        ctx.beginPath(); ctx.arc(x, horizonY, 32, 0, Math.PI * 2); ctx.fill();
      }
      fillRoundRect(ctx, 0, horizonY - 12, W, 8, 2, "#92400e", "#451a03", 2);
      for (let x = 10; x < W; x += 28) {
        fillRoundRect(ctx, x, horizonY - 24, 14, 28, 4, "#d97706", "#451a03", 2.5);
      }
    }
  }

  const lawnGrad = ctx.createLinearGradient(0, horizonY, 0, H);
  lawnGrad.addColorStop(0, c[2]);
  lawnGrad.addColorStop(1, c[3]);
  ctx.fillStyle = lawnGrad;
  ctx.fillRect(0, horizonY, W, H - horizonY);

  ctx.strokeStyle = id === "royal" ? "#facc15" : "#1e1b18";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, horizonY); ctx.lineTo(W, horizonY); ctx.stroke();
}

// ============================================================================
// 2. 동글동글 만두형 귀요미 캐릭터 렌더러 (종횡비 자동 1:1 정배율 동기화!)
// ============================================================================
function renderPixelAvatar(canvas, config = DEFAULT_AVATAR_CONFIG, options = {}) {
  if (!canvas) return;

  // CSS 렌더링 비율과 내부 캔버스 해상도 비율을 정확히 일치시켜 좌우 찌그러짐 원천 제거!
  if (options.matchCssAspect !== false && canvas.clientWidth > 20 && canvas.clientHeight > 20) {
    const targetW = Math.round(canvas.clientWidth * 2);
    const targetH = Math.round(canvas.clientHeight * 2);
    if (Math.abs(canvas.width - targetW) > 6 || Math.abs(canvas.height - targetH) > 6) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  }

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.save();
  ctx.clearRect(0, 0, W, H);

  const cfg = { ...DEFAULT_AVATAR_CONFIG, ...(config || {}) };
  const isFemale = cfg.gender === "female";

  const bgItem = getItemById("bg", cfg.bg);
  const hairItem = getItemById("hair", cfg.hair);
  const hatItem = getItemById("hat", cfg.hat);
  const faceItem = getItemById("face", cfg.face);
  const outfitItem = getItemById("outfit", cfg.outfit);
  const accItem = getItemById("acc", cfg.acc);

  if (!options.transparentBg) {
    renderApfWideBackground(ctx, W, H, bgItem);
  }

  // 정사각형 charSize를 기준으로 x, y 동일 스케일(1:1 정원) 적용!
  const charSize = Math.min(W, H) * 0.94;
  const offsetX = options.charCenterX !== undefined ? options.charCenterX - charSize / 2 : (W - charSize) / 2;
  const offsetY = (H - charSize) / 2 + (options.charOffsetY || 14);

  ctx.translate(offsetX, offsetY);
  ctx.scale(charSize / 480, charSize / 480);

  const outline = "#1e1b18";
  const faceWhite = "#fffdf9";

  // 발밑 동그란 그림자
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.beginPath(); ctx.ellipse(240, 405, 85, 20, 0, 0, Math.PI * 2); ctx.fill();

  // 망토
  if (outfitItem.id === "king_robe") {
    fillRoundRect(ctx, 130, 265, 220, 120, 36, "#dc2626", outline, 9);
    fillRoundRect(ctx, 130, 362, 220, 22, 8, "#facc15", outline, 7);
  } else {
    ctx.fillStyle = "#ef4444"; ctx.strokeStyle = outline; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(240, 275); ctx.lineTo(315, 295); ctx.lineTo(295, 330); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  // 양갈래 뒷머리
  if (hairItem.style === "twin") {
    fillRoundRect(ctx, 64, 165, 68, 135, 34, hairItem.color, outline, 9);
    fillRoundRect(ctx, 348, 165, 68, 135, 34, hairItem.color, outline, 9);
  }

  // 다리
  ctx.strokeStyle = outline; ctx.lineWidth = 14; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(212, 345); ctx.lineTo(208, 392); ctx.moveTo(268, 345); ctx.lineTo(272, 392); ctx.stroke();

  // 몸통 & 의상
  const outMain = outfitItem.main || "#ef4444";
  const outSub = outfitItem.sub || "#ffffff";

  ctx.strokeStyle = outline; ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(185, 290); ctx.lineTo(138, 325); ctx.moveTo(295, 290); ctx.lineTo(342, 325); ctx.stroke();

  fillRoundRect(ctx, 182, 268, 116, 86, 36, outMain, outline, 9);
  fillRoundRect(ctx, 204, 278, 72, 48, 18, outSub, outline, 6);
  if (isFemale) {
    fillRoundRect(ctx, 174, 328, 132, 28, 14, outSub, outline, 8);
  }

  // 양쪽 동글 귀
  const isMonkey = hairItem.style === "monkey";
  const earR = isMonkey ? 46 : 34;
  ctx.fillStyle = isMonkey ? "#6b3410" : faceWhite;
  ctx.strokeStyle = outline; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(105, 198, earR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(375, 198, earR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  ctx.fillStyle = isMonkey ? "#fffdf9" : "#fda4af";
  ctx.beginPath();
  ctx.arc(105, 198, earR * 0.55, 0, Math.PI * 2);
  ctx.arc(375, 198, earR * 0.55, 0, Math.PI * 2);
  ctx.fill();
  if (isMonkey) {
    ctx.strokeStyle = outline; ctx.lineWidth = 6; ctx.stroke();
  }

  // 만두형 동글 얼굴
  fillRoundRect(ctx, 112, 92, 256, 190, 92, faceWhite, outline, 10);

  if (isMonkey) {
    ctx.save();
    ctx.beginPath(); ctx.roundRect(112, 92, 256, 190, 92); ctx.clip();
    ctx.fillStyle = "#6b3410"; ctx.fillRect(100, 80, 280, 72);
    ctx.fillStyle = faceWhite;
    ctx.beginPath(); ctx.arc(195, 175, 65, 0, Math.PI * 2); ctx.arc(285, 175, 65, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    fillRoundRect(ctx, 112, 92, 256, 190, 92, null, outline, 10);
    ctx.strokeStyle = outline; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(232, 92); ctx.lineTo(222, 68); ctx.moveTo(246, 92); ctx.lineTo(254, 70); ctx.stroke();
  } else {
    ctx.save();
    ctx.beginPath(); ctx.roundRect(112, 92, 256, 190, 92); ctx.clip();
    ctx.fillStyle = hairItem.color || "#27272a"; ctx.fillRect(100, 80, 280, 68);
    ctx.strokeStyle = outline; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(100, 148); ctx.lineTo(380, 148); ctx.stroke();
    ctx.restore();
    fillRoundRect(ctx, 112, 92, 256, 190, 92, null, outline, 10);

    if (hairItem.style === "sprout") {
      fillRoundRect(ctx, 234, 48, 12, 46, 6, "#16a34a", outline, 6);
      fillRoundRect(ctx, 196, 36, 44, 26, 13, "#4ade80", outline, 6);
      fillRoundRect(ctx, 240, 36, 44, 26, 13, "#4ade80", outline, 6);
    } else if (hairItem.style === "octo") {
      fillRoundRect(ctx, 165, 42, 150, 74, 36, "#ea580c", outline, 8);
      fillRoundRect(ctx, 224, 92, 32, 24, 12, "#fed7aa", outline, 6);
    }
  }

  if (isFemale && hatItem.id === "none") {
    fillRoundRect(ctx, 312, 96, 52, 32, 12, "#f43f5e", outline, 7);
    ctx.fillStyle = "#ffe4e6";
    ctx.beginPath(); ctx.arc(338, 112, 7, 0, Math.PI * 2); ctx.fill();
  }

  // 볼터치
  ctx.fillStyle = "#fda4af";
  ctx.beginPath();
  ctx.ellipse(164, 222, 24, 13, 0, 0, Math.PI * 2);
  ctx.ellipse(316, 222, 24, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // 표정 & 안경
  ctx.strokeStyle = outline; ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (faceItem.id === "square_glass") {
    fillRoundRect(ctx, 156, 174, 72, 42, 8, "#ffffff", outline, 9);
    fillRoundRect(ctx, 252, 174, 72, 42, 8, "#ffffff", outline, 9);
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(228, 194); ctx.lineTo(252, 194); ctx.stroke();
  } else if (faceItem.id === "swirl_glass") {
    ctx.lineWidth = 8;
    [192, 288].forEach(cx => {
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(cx, 194, 34, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, 194, 18, 0, Math.PI * 1.5); ctx.stroke();
    });
  } else if (faceItem.id === "sunglass") {
    fillRoundRect(ctx, 150, 170, 80, 46, 12, "#0f172a", outline, 8);
    fillRoundRect(ctx, 250, 170, 80, 46, 12, "#0f172a", outline, 8);
    ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(230, 188); ctx.lineTo(250, 188); ctx.stroke();
  } else if (faceItem.id === "neon_visor") {
    fillRoundRect(ctx, 146, 166, 188, 48, 18, "#0f172a", "#38bdf8", 7);
    ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(166, 190); ctx.lineTo(314, 190); ctx.stroke();
  } else if (faceItem.id === "heart_eyes") {
    [192, 288].forEach(hx => {
      ctx.fillStyle = "#f43f5e"; ctx.beginPath();
      ctx.arc(hx - 8, 188, 11, 0, Math.PI * 2);
      ctx.arc(hx + 8, 188, 11, 0, Math.PI * 2);
      ctx.moveTo(hx - 18, 192); ctx.lineTo(hx, 214); ctx.lineTo(hx + 18, 192);
      ctx.fill();
    });
  } else if (faceItem.id === "star_eyes") {
    [192, 288].forEach(sx => {
      ctx.fillStyle = "#facc15"; ctx.strokeStyle = outline; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(sx, 194, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(sx - 6, 188, 6, 0, Math.PI * 2); ctx.fill();
    });
  } else if (faceItem.id === "wink") {
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(168, 184); ctx.lineTo(208, 196); ctx.lineTo(168, 208); ctx.stroke();
    ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(292, 196, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(287, 190, 6, 0, Math.PI * 2); ctx.fill();
  } else if (faceItem.id === "singing") {
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(168, 184); ctx.lineTo(204, 196); ctx.lineTo(168, 206);
    ctx.moveTo(312, 184); ctx.lineTo(276, 196); ctx.lineTo(312, 206);
    ctx.stroke();
  } else {
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(170, 172); ctx.lineTo(208, 172); ctx.moveTo(272, 172); ctx.lineTo(310, 172); ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(172, 196); ctx.lineTo(208, 196); ctx.moveTo(272, 196); ctx.lineTo(308, 196); ctx.stroke();
  }

  // 입 모양
  if (faceItem.id === "singing") {
    fillRoundRect(ctx, 214, 218, 52, 36, 18, "#e11d48", outline, 7);
  } else {
    ctx.strokeStyle = outline; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(226, 224, 14, 0, Math.PI); ctx.arc(254, 224, 14, 0, Math.PI); ctx.stroke();
  }

  // 모자 / 헤드셋 / 왕관 / 버킷햇 / 토끼귀 / 베레모 / 악마뿔
  if (hatItem.id === "headset" || hatItem.id === "cat_ear") {
    const hc = hatItem.color || "#0ea5e9";
    ctx.strokeStyle = hc; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(240, 190, 144, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    fillRoundRect(ctx, 82, 162, 34, 68, 16, hc, outline, 8);
    fillRoundRect(ctx, 364, 162, 34, 68, 16, hc, outline, 8);
    if (hatItem.id === "cat_ear") {
      fillRoundRect(ctx, 134, 48, 48, 44, 12, hc, outline, 8);
      fillRoundRect(ctx, 298, 48, 48, 44, 12, hc, outline, 8);
    }
  } else if (hatItem.id === "bucket_hat") {
    fillRoundRect(ctx, 140, 42, 200, 62, 22, "#1e293b", outline, 8);
    fillRoundRect(ctx, 102, 88, 276, 28, 14, "#334155", outline, 8);
  } else if (hatItem.id === "bunny_band") {
    fillRoundRect(ctx, 152, 12, 42, 86, 21, "#fb7185", outline, 8);
    fillRoundRect(ctx, 286, 12, 42, 86, 21, "#fb7185", outline, 8);
    fillRoundRect(ctx, 164, 26, 18, 56, 9, "#ffe4e6");
    fillRoundRect(ctx, 298, 26, 18, 56, 9, "#ffe4e6");
  } else if (hatItem.id === "beret_art") {
    fillRoundRect(ctx, 138, 42, 204, 64, 32, "#dc2626", outline, 9);
    fillRoundRect(ctx, 232, 24, 16, 22, 6, "#1e1b18");
  } else if (hatItem.id === "acorn_hat") {
    fillRoundRect(ctx, 132, 52, 216, 68, 34, "#a16207", outline, 9);
    fillRoundRect(ctx, 232, 30, 16, 26, 6, "#451a03", outline, 6);
  } else if (hatItem.id === "angel") {
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.ellipse(240, 42, 85, 18, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (hatItem.id === "devil_horn") {
    ctx.fillStyle = "#e11d48"; ctx.strokeStyle = outline; ctx.lineWidth = 8;
    [[168, 92, 142, 30, 198, 78], [312, 92, 338, 30, 282, 78]].forEach(([x1, y1, x2, y2, x3, y3]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
  } else if (hatItem.id === "crown") {
    fillRoundRect(ctx, 156, 34, 168, 64, 14, "#facc15", outline, 9);
    fillRoundRect(ctx, 226, 52, 28, 28, 8, "#ef4444", outline, 6);
  }

  // 정밀 악기 렌더링 결합!
  drawDetailedInstrument(ctx, accItem, 355, 295, 1.32);

  ctx.restore();
}

// ============================================================================
// 3. 상점 타일 전용 '단품 코스튬/정밀 악기/배경' 렌더러
// ============================================================================
function renderItemThumbnail(canvas, category, item) {
  if (!canvas || !item) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const outline = "#1e1b18";

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.scale(W / 240, H / 240);

  if (category === "acc") {
    if (item.id === "none") {
      ctx.strokeStyle = "#57534e"; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(120, 120, 44, 0, Math.PI * 2); ctx.moveTo(90, 90); ctx.lineTo(150, 150); ctx.stroke();
    } else {
      drawDetailedInstrument(ctx, item, 120, 128, 1.45);
    }
  } else if (category === "hair") {
    if (item.style === "monkey") {
      fillRoundRect(ctx, 20, 95, 42, 48, 21, "#ffffff", outline, 9);
      fillRoundRect(ctx, 178, 95, 42, 48, 21, "#ffffff", outline, 9);
      fillRoundRect(ctx, 48, 52, 144, 136, 65, "#6b3410", outline, 9);
      fillRoundRect(ctx, 64, 96, 112, 88, 45, "#ffffff", outline, 7);
    } else if (item.style === "sprout") {
      fillRoundRect(ctx, 112, 95, 16, 65, 8, "#16a34a", outline, 8);
      fillRoundRect(ctx, 60, 65, 62, 38, 19, "#4ade80", outline, 8);
      fillRoundRect(ctx, 118, 65, 62, 38, 19, "#4ade80", outline, 8);
    } else if (item.style === "octo") {
      fillRoundRect(ctx, 56, 60, 128, 110, 54, "#ea580c", outline, 9);
      fillRoundRect(ctx, 102, 126, 36, 32, 16, "#fed7aa", outline, 7);
    } else {
      ctx.fillStyle = item.color || "#27272a"; ctx.strokeStyle = outline; ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(120, 135, 68, Math.PI, 0, false);
      ctx.lineTo(188, 175); ctx.lineTo(158, 175); ctx.lineTo(158, 130);
      ctx.lineTo(82, 130); ctx.lineTo(82, 175); ctx.lineTo(52, 175);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  } else if (category === "face") {
    if (item.id === "square_glass") {
      fillRoundRect(ctx, 36, 94, 72, 48, 6, "#ffffff", outline, 9);
      fillRoundRect(ctx, 132, 94, 72, 48, 6, "#ffffff", outline, 9);
      ctx.strokeStyle = outline; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(108, 118); ctx.lineTo(132, 118); ctx.stroke();
    } else if (item.id === "swirl_glass") {
      ctx.strokeStyle = outline; ctx.lineWidth = 8;
      [82, 158].forEach(cx => {
        ctx.beginPath(); ctx.arc(cx, 120, 34, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, 120, 18, 0, Math.PI * 1.5); ctx.stroke();
      });
    } else if (item.id === "sunglass" || item.id === "neon_visor") {
      fillRoundRect(ctx, 36, 94, 74, 48, 12, "#0f172a", item.id === "neon_visor" ? "#38bdf8" : outline, 8);
      fillRoundRect(ctx, 130, 94, 74, 48, 12, "#0f172a", item.id === "neon_visor" ? "#38bdf8" : outline, 8);
    } else if (item.id === "heart_eyes") {
      ctx.fillStyle = "#f43f5e"; ctx.font = "900 54px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("💖", 120, 138);
    } else if (item.id === "star_eyes") {
      ctx.fillStyle = "#facc15"; ctx.font = "900 54px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("⭐", 120, 138);
    } else {
      fillRoundRect(ctx, 52, 62, 136, 116, 56, "#fffdf9", outline, 8);
      ctx.strokeStyle = outline; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(106, 134, 14, 0, Math.PI); ctx.arc(134, 134, 14, 0, Math.PI); ctx.stroke();
    }
  } else if (category === "hat") {
    if (item.id === "crown") {
      fillRoundRect(ctx, 48, 72, 144, 92, 18, "#facc15", outline, 9);
      fillRoundRect(ctx, 104, 98, 32, 32, 10, "#ef4444", outline, 6);
    } else if (item.id === "bucket_hat") {
      fillRoundRect(ctx, 64, 64, 112, 62, 18, "#1e293b", outline, 8);
      fillRoundRect(ctx, 34, 116, 172, 28, 14, "#334155", outline, 8);
    } else if (item.id === "bunny_band") {
      fillRoundRect(ctx, 68, 42, 36, 120, 18, "#fb7185", outline, 8);
      fillRoundRect(ctx, 136, 42, 36, 120, 18, "#fb7185", outline, 8);
    } else if (item.id === "beret_art") {
      fillRoundRect(ctx, 46, 80, 148, 68, 34, "#dc2626", outline, 8);
    } else if (item.id === "devil_horn") {
      ctx.fillStyle = "#e11d48"; ctx.strokeStyle = outline; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(56, 154); ctx.lineTo(82, 58); ctx.lineTo(108, 146); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(132, 146); ctx.lineTo(158, 58); ctx.lineTo(184, 154); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (item.id === "acorn_hat") {
      fillRoundRect(ctx, 48, 76, 144, 88, 42, "#a16207", outline, 9);
      fillRoundRect(ctx, 110, 48, 20, 32, 8, "#451a03", outline, 7);
    } else if (item.id === "angel") {
      ctx.strokeStyle = "#facc15"; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.ellipse(120, 120, 68, 22, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (item.id === "none") {
      ctx.strokeStyle = "#57534e"; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(120, 120, 44, 0, Math.PI * 2); ctx.moveTo(90, 90); ctx.lineTo(150, 150); ctx.stroke();
    } else {
      const hc = item.color || "#0ea5e9";
      ctx.strokeStyle = hc; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.arc(120, 130, 58, Math.PI, 0); ctx.stroke();
      fillRoundRect(ctx, 44, 110, 32, 58, 14, hc, outline, 8);
      fillRoundRect(ctx, 164, 110, 32, 58, 14, hc, outline, 8);
    }
  } else if (category === "outfit") {
    fillRoundRect(ctx, 56, 66, 128, 110, 28, item.main || "#ef4444", outline, 9);
    fillRoundRect(ctx, 88, 76, 64, 62, 16, item.sub || "#ffffff", outline, 6);
  } else if (category === "bg") {
    const c = item.colors || ["#5ec8f8", "#aee4ff", "#76d32d", "#58b018"];
    fillRoundRect(ctx, 26, 36, 188, 168, 24, c[0], outline, 8);
    fillRoundRect(ctx, 30, 128, 180, 72, 18, c[2], outline, 6);
  } else {
    fillRoundRect(ctx, 24, 66, 192, 108, 22, "#fef08a", "#b45309", 9);
    ctx.fillStyle = "#b45309"; ctx.font = "900 32px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(item.id === "gender_ticket" ? "⚧️ 10000" : "🎫 5000", 120, 132);
  }

  ctx.restore();
}

// ============================================================================
// 4. 로그인 화면 전용 '고해상도 도트 디자인 [음악왕] 대형 타이틀 로고' 렌더러
// ============================================================================
function renderPixelLogo(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;

  const gw = 140;
  const gh = 76;
  const pCanvas = document.createElement("canvas");
  pCanvas.width = gw;
  pCanvas.height = gh;
  const pCtx = pCanvas.getContext("2d");
  pCtx.imageSmoothingEnabled = false;

  pCtx.fillStyle = "#17153b";
  pCtx.fillRect(0, 0, gw, gh);
  pCtx.fillStyle = "#2e236c";
  pCtx.fillRect(3, 3, gw - 6, gh - 6);
  pCtx.fillStyle = "#433d8b";
  pCtx.fillRect(6, 6, gw - 12, gh - 12);

  pCtx.fillStyle = "rgba(255, 255, 255, 0.05)";
  for (let y = 8; y < gh - 8; y += 4) {
    pCtx.fillRect(6, y, gw - 12, 2);
  }

  pCtx.fillStyle = "#090d16";
  pCtx.fillRect(0, 0, gw, 2);
  pCtx.fillRect(0, gh - 2, gw, 2);
  pCtx.fillRect(0, 0, 2, gh);
  pCtx.fillRect(gw - 2, 0, 2, gh);

  pCtx.fillStyle = "#facc15";
  pCtx.fillRect(2, 2, gw - 4, 2);
  pCtx.fillRect(2, gh - 4, gw - 4, 2);
  pCtx.fillRect(2, 2, 2, gh - 4);
  pCtx.fillRect(gw - 4, 2, 2, gh - 4);

  [[4, 4], [gw - 8, 4], [4, gh - 8], [gw - 8, gh - 8]].forEach(([cx, cy]) => {
    pCtx.fillStyle = "#090d16"; pCtx.fillRect(cx - 1, cy - 1, 6, 6);
    pCtx.fillStyle = "#f43f5e"; pCtx.fillRect(cx, cy, 4, 4);
    pCtx.fillStyle = "#fda4af"; pCtx.fillRect(cx, cy, 2, 2);
  });

  [[14, 13], [26, 9], [114, 11], [124, 18], [13, 56], [125, 54], [44, 10], [96, 10]].forEach(([sx, sy]) => {
    pCtx.fillStyle = "#fde047";
    pCtx.fillRect(sx - 1, sy, 3, 1);
    pCtx.fillRect(sx, sy - 1, 1, 3);
    pCtx.fillStyle = "#ffffff";
    pCtx.fillRect(sx, sy, 1, 1);
  });

  pCtx.fillStyle = "#090d16"; pCtx.fillRect(55, 6, 30, 13);
  pCtx.fillStyle = "#f59e0b"; pCtx.fillRect(57, 10, 26, 7);
  pCtx.fillStyle = "#fde047";
  pCtx.fillRect(57, 7, 4, 4); pCtx.fillRect(68, 5, 4, 6); pCtx.fillRect(79, 7, 4, 4);
  pCtx.fillRect(58, 11, 24, 4);
  pCtx.fillStyle = "#ef4444"; pCtx.fillRect(68, 11, 4, 3);
  pCtx.fillStyle = "#38bdf8"; pCtx.fillRect(60, 12, 3, 2); pCtx.fillRect(77, 12, 3, 2);

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = gw;
  maskCanvas.height = gh;
  const mCtx = maskCanvas.getContext("2d");
  mCtx.fillStyle = "#ffffff";
  mCtx.font = "900 38px 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";
  mCtx.textAlign = "center";
  mCtx.textBaseline = "middle";
  mCtx.fillText("음악왕", gw / 2, 41);

  const imgData = mCtx.getImageData(0, 0, gw, gh).data;
  const isOn = (x, y) => {
    if (x < 0 || x >= gw || y < 0 || y >= gh) return false;
    return imgData[(y * gw + x) * 4 + 3] > 115;
  };

  for (let y = 16; y < 66; y++) {
    for (let x = 6; x < gw - 6; x++) {
      if (isOn(x, y)) {
        for (let dy = -2; dy <= 4; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            pCtx.fillStyle = "#090d16";
            pCtx.fillRect(x + dx, y + dy, 1, 1);
          }
        }
      }
    }
  }

  for (let y = 16; y < 66; y++) {
    for (let x = 6; x < gw - 6; x++) {
      if (isOn(x, y)) {
        pCtx.fillStyle = "#b45309";
        pCtx.fillRect(x, y + 2, 1, 1);
        pCtx.fillStyle = "#ea580c";
        pCtx.fillRect(x, y + 1, 1, 1);
      }
    }
  }

  for (let y = 16; y < 66; y++) {
    for (let x = 6; x < gw - 6; x++) {
      if (isOn(x, y)) {
        if (!isOn(x, y - 1)) pCtx.fillStyle = "#ffffff";
        else if (y < 34) pCtx.fillStyle = "#fef08a";
        else if (y < 44) pCtx.fillStyle = "#facc15";
        else pCtx.fillStyle = "#f59e0b";
        pCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  ctx.drawImage(pCanvas, 0, 0, W, H);
  ctx.restore();
}
