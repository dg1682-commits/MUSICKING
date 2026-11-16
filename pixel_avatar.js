// ============================================================================
// [음악왕 v7.0] 동글 귀요미 캐릭터 & 초정밀 악기/단품 파츠 렌더러 (pixel_avatar.js)
// - 동글동글 만두형 귀요미 캐릭터 + 웃는 구름(^w^) 야외 배경 ('아쿠' 단어 완전 제거)
// - 마이크(그릴망)·일렉기타(6현/픽업/헤드머신)·키타(건반)·응원봉·붐박스 초정밀 렌더링 결합
// - 성별 변경권(1,000 CD) 및 닉네임 변경권(500 CD) 포함
// ============================================================================

const BASE_AVATAR_SHOP_ITEMS = {
  bg: [
    { id: "meadow", name: "초원 잔디마당", price: 0, grade: "C", desc: "따사로운 햇살과 귀여운 구름이\n두둥실 떠다니는 평화로운 뒷마당", colors: ["#5ec8f8", "#aee4ff", "#76d32d", "#58b018"] },
    { id: "neon", name: "네온 뮤직뱅크", price: 40, grade: "B", desc: "화려한 레이저 조명이 쏟아지는\n생방송 음악방송 메인 스테이지", colors: ["#1e1b4b", "#3730a3", "#f43f5e", "#4f46e5"] },
    { id: "sakura", name: "봄날 벚꽃동산", price: 50, grade: "B", desc: "분홍빛 벚꽃잎이 흩날리는\n설레는 봄날의 피크닉 동산", colors: ["#fda4af", "#ffe4e6", "#f472b6", "#db2777"] },
    { id: "galaxy", name: "스타라이트 우주홀", price: 80, grade: "A", desc: "별똥별이 쏟아지는 신비로운\n우주 최강 음악왕 스테이지", colors: ["#0f172a", "#1e293b", "#38bdf8", "#6366f1"] },
    { id: "royal", name: "황금 음악왕성", price: 150, grade: "S", desc: "오직 전설의 음악왕만이 설 수 있는\n블링블링 순금빛 로얄 스테이지", colors: ["#fde047", "#fef9c3", "#f59e0b", "#b45309"] }
  ],
  hair: [
    { id: "default", name: "바가지 머리", price: 0, grade: "C", desc: "동글동글 귀엽게 자른\n시그니처 기본 바가지 헤어", color: "#27272a", style: "bowl" },
    { id: "monkey_hood", name: "몽키 모자", price: 45, grade: "B", desc: "동글동글 큰 귀가 매력적인\n개구쟁이 원숭이 모자", color: "#6b3410", style: "monkey" },
    { id: "blonde", name: "샤이닝 금발", price: 35, grade: "C", desc: "어디서나 눈에 확 띄는\n아이돌 센터 황금빛 염색", color: "#facc15", style: "bowl" },
    { id: "pink_twin", name: "핑크 양갈래", price: 60, grade: "A", desc: "상큼발랄 과즙미가 터지는\n핑크빛 트윈테일 스타일", color: "#f472b6", style: "twin" },
    { id: "sprout_hat", name: "초록 새싹모자", price: 50, grade: "B", desc: "머리 위에서 광합성 중!\n귀여운 초록 새싹 모자", color: "#4ade80", style: "sprout" },
    { id: "octo_hat", name: "문어 모자", price: 75, grade: "A", desc: "쪽쪽 빨판이 살아있는\n엉뚱발랄 숲속 문어 모자", color: "#a16207", style: "octo" },
    { id: "rock_red", name: "불꽃 샤기컷", price: 70, grade: "A", desc: "고음이 3옥타브 더 올라가는\n정열의 레드 록스타 헤어", color: "#ef4444", style: "spiky" }
  ],
  hat: [
    { id: "none", name: "모자 벗기", price: 0, grade: "C", desc: "아무 모자도 쓰지 않은\n시원하고 깔끔한 기본 상태" },
    { id: "headset", name: "프로 헤드셋", price: 45, grade: "B", desc: "1초 듣기 문제가 잘 들리는\n블루투스 프로 헤드셋", color: "#0ea5e9" },
    { id: "cat_ear", name: "고양이 헤드폰", price: 65, grade: "A", desc: "냐옹~ 귀여운 고양이 귀가 달린\n인기 만점 핑크 헤드폰", color: "#f43f5e" },
    { id: "acorn_hat", name: "도토리 모자", price: 55, grade: "B", desc: "가을 숲속 다람쥐가 탐내는\n동글동글 도토리 베레모", color: "#854d0e" },
    { id: "angel", name: "천사의 링", price: 90, grade: "A", desc: "머리 위에서 둥실 빛나는\n순백의 천사 헤일로", color: "#facc15" },
    { id: "crown", name: "음악왕 왕관", price: 200, grade: "S", desc: "가요계 모든 문제를 정복한\n절대강자의 루비 황금 왕관", color: "#f59e0b" }
  ],
  face: [
    { id: "default", name: "기본 미소", price: 0, grade: "C", desc: "보기만 해도 기분 좋아지는\n동글동글 고양이 입 미소" },
    { id: "square_glass", name: "뿔테 안경", price: 35, grade: "B", desc: "나무위키 비하인드를 꿰고 있는\n척척박사 네모 안경" },
    { id: "swirl_glass", name: "골뱅이 안경", price: 55, grade: "B", desc: "빙글뱅글 어지러워~!\n코믹 지수 200% 골뱅이 안경" },
    { id: "wink", name: "심쿵 윙크", price: 40, grade: "B", desc: "무대 엔딩요정처럼 상큼하게\n한쪽 눈을 찡긋 감은 표정" },
    { id: "sunglass", name: "힙합 선글라스", price: 60, grade: "A", desc: "연예인 포스가 뿜어져 나오는\n블랙 다크 선글라스" },
    { id: "singing", name: "열창 표정", price: 50, grade: "A", desc: "마이크가 찢어지도록 열창하는\n득음 직전의 표정" }
  ],
  outfit: [
    { id: "basic", name: "빨간 망토티", price: 0, grade: "C", desc: "귀여운 빨간 스카프가 달린\n활동성 만점 기본 티셔츠", main: "#ef4444", sub: "#ffffff" },
    { id: "overalls", name: "캔디 멜빵룩", price: 50, grade: "B", desc: "90년대 감성이 물씬 풍기는\n노란 티셔츠와 청멜빵", main: "#facc15", sub: "#2563eb" },
    { id: "uniform", name: "명문고 교복", price: 60, grade: "B", desc: "단정하고 풋풋한 매력이 넘치는\n하이스쿨 스쿨룩", main: "#1e293b", sub: "#ef4444" },
    { id: "idol_suit", name: "아이돌 제복", price: 85, grade: "A", desc: "시상식 대상을 휩쓸 것 같은\n화려한 금장 스카이 제복", main: "#0284c7", sub: "#facc15" },
    { id: "king_robe", name: "음악왕 망토", price: 180, grade: "S", desc: "바람에 멋지게 휘날리는\n최고급 임페리얼 골드 로브", main: "#b45309", sub: "#fde047" }
  ],
  acc: [
    { id: "none", name: "악기 미착용", price: 0, grade: "C", desc: "손에 아무것도 들지 않은\n가벼운 기본 상태" },
    { id: "mic_silver", name: "보컬 마이크", price: 0, grade: "C", desc: "촘촘한 그릴망과 스위치가 달린\n스튜디오 표준 마이크", color: "#94a3b8" },
    { id: "lightstick", name: "하트 응원봉", price: 75, grade: "A", desc: "투명 돔 안에 하트가 빛나는\n공식 팬클럽 응원봉", color: "#ec4899" },
    { id: "keytar", name: "숄더 키타", price: 95, grade: "A", desc: "어깨에 메고 건반을 연주하는\n신스팝 밴드 신디사이저", color: "#0ea5e9" },
    { id: "boombox", name: "마스터 붐박스", price: 90, grade: "A", desc: "듀얼 우퍼와 카세트 데크가 달린\n스트릿 힙합 대형 라디오", color: "#334155" },
    { id: "guitar", name: "스트랫 기타", price: 120, grade: "S", desc: "6현 줄과 픽업까지 정교한\n체리레드 커스텀 일렉기타", color: "#dc2626" },
    { id: "mic_gold", name: "황금 마이크", price: 140, grade: "S", desc: "가왕의 목소리를 담아내는\n눈부신 24K 순금 마이크", color: "#facc15" }
  ],
  special: [
    {
      id: "nickname_ticket",
      name: "✨ 닉네임 변경권",
      price: 500,
      grade: "S",
      consumable: true,
      desc: "500 CD를 사용하여 내 계정의 닉네임을\n원하는 새 이름으로 즉시 변경합니다."
    },
    {
      id: "gender_ticket",
      name: "⚧️ 성별 변경권",
      price: 1000,
      grade: "S",
      consumable: true,
      desc: "1,000 CD를 사용하여 기본 캐릭터 성별을\n(남자 ↔ 여자) 즉시 전환합니다."
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

function applyServerShopCatalog(customCatalog) {
  if (!customCatalog || typeof customCatalog !== "object") return;
  Object.keys(customCatalog).forEach(cat => {
    if (Array.isArray(customCatalog[cat])) {
      AVATAR_SHOP_ITEMS[cat] = customCatalog[cat];
    }
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
// 정밀 악기 일러스트 드로잉 함수 (그릴망 마이크, 6현 일렉기타, 건반 키타, 응원봉, 붐박스)
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
    ctx.moveTo(-11, -6);
    ctx.lineTo(11, -6);
    ctx.lineTo(8, 44);
    ctx.lineTo(-8, 44);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    fillRoundRect(ctx, -3, 8, 6, 14, 2, "#0f172a");
    fillRoundRect(ctx, -2, 10, 4, 6, 1, "#ef4444");

    const headGrad = ctx.createRadialGradient(-6, -26, 4, 0, -22, 24);
    headGrad.addColorStop(0, isGold ? "#fef08a" : "#f8fafc");
    headGrad.addColorStop(0.6, isGold ? "#facc15" : "#94a3b8");
    headGrad.addColorStop(1, isGold ? "#b45309" : "#475569");
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, -22, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -22, 20, 0, Math.PI * 2);
    ctx.clip();
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
  } else if (accItem.id === "guitar") {
    ctx.rotate(-0.45);
    fillRoundRect(ctx, -7, -95, 14, 78, 3, "#fde68a", outline, 4);
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 1.6;
    for (let fy = -85; fy < -20; fy += 9) {
      ctx.beginPath();
      ctx.moveTo(-6, fy); ctx.lineTo(6, fy);
      ctx.stroke();
    }
    ctx.fillStyle = "#dc2626";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, -94);
    ctx.lineTo(-14, -124);
    ctx.lineTo(6, -130);
    ctx.lineTo(10, -94);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    for (let py = -122; py <= -100; py += 7) {
      ctx.beginPath();
      ctx.arc(-16, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const bodyGrad = ctx.createLinearGradient(-40, -25, 40, 55);
    bodyGrad.addColorStop(0, "#f87171");
    bodyGrad.addColorStop(0.3, "#dc2626");
    bodyGrad.addColorStop(1, "#7f1d1d");
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-12, -24);
    ctx.bezierCurveTo(-36, -38, -42, -5, -28, 12);
    ctx.bezierCurveTo(-48, 28, -44, 66, 0, 68);
    ctx.bezierCurveTo(44, 66, 48, 28, 26, 12);
    ctx.bezierCurveTo(38, -2, 34, -32, 12, -20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(2, 20, 22, 30, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    fillRoundRect(ctx, -10, 4, 20, 5, 2, "#1e293b");
    fillRoundRect(ctx, -10, 14, 20, 5, 2, "#1e293b");
    fillRoundRect(ctx, -10, 24, 20, 5, 2, "#1e293b");
    fillRoundRect(ctx, -12, 38, 24, 9, 2, "#94a3b8", outline, 2.5);

    ctx.strokeStyle = "rgba(241, 245, 249, 0.92)";
    ctx.lineWidth = 1.1;
    for (let sx = -4; sx <= 4; sx += 2.6) {
      ctx.beginPath();
      ctx.moveTo(sx, -94);
      ctx.lineTo(sx, 40);
      ctx.stroke();
    }
  } else if (accItem.id === "lightstick") {
    ctx.rotate(-0.18);
    ctx.strokeStyle = "#f472b6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 52, 8, 0, Math.PI * 2);
    ctx.stroke();
    fillRoundRect(ctx, -9, 0, 18, 48, 8, "#ffffff", outline, 4);
    fillRoundRect(ctx, -12, -6, 24, 9, 4, "#fb7185", outline, 3.5);
    fillRoundRect(ctx, -3, 14, 6, 6, 3, "#ec4899");

    const domeGrad = ctx.createRadialGradient(-8, -32, 4, 0, -28, 30);
    domeGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    domeGrad.addColorStop(0.5, "rgba(251, 207, 232, 0.75)");
    domeGrad.addColorStop(1, "rgba(244, 114, 182, 0.85)");
    ctx.fillStyle = domeGrad;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(0, -28, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

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
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5;
    for (let kx = -26; kx < 30; kx += 8) {
      ctx.beginPath();
      ctx.moveTo(kx, -2); ctx.lineTo(kx, 18);
      ctx.stroke();
    }
    for (let bkx = -29; bkx < 24; bkx += 8) {
      if (bkx === -5 || bkx === 19) continue;
      fillRoundRect(ctx, bkx, -2, 5, 11, 1, "#0f172a");
    }
  } else if (accItem.id === "boombox") {
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(22, -24); ctx.lineTo(38, -56);
    ctx.stroke();
    fillRoundRect(ctx, -28, -34, 56, 12, 5, "#94a3b8", outline, 4);
    fillRoundRect(ctx, -48, -24, 96, 58, 10, "#334155", outline, 4.5);
    fillRoundRect(ctx, -42, -18, 84, 12, 4, "#0f172a");
    [-26, 26].forEach(sx => {
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, 11, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#475569";
      ctx.beginPath();
      ctx.arc(sx, 11, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    fillRoundRect(ctx, -9, 2, 18, 16, 3, "#facc15", outline, 2.5);
  }

  ctx.restore();
}

// ============================================================================
// 1. 와이드 파노라마 배경 렌더러 (하늘 + 웃는 구름 + 나무 울타리 + 초원)
// ============================================================================
function renderApfWideBackground(ctx, W, H, bgItem) {
  const c = (bgItem && bgItem.colors) || ["#5ec8f8", "#aee4ff", "#76d32d", "#58b018"];
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  skyGrad.addColorStop(0, c[0]);
  skyGrad.addColorStop(1, c[1]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

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
    ctx.beginPath();
    ctx.arc(-16, 6, 5, 0, Math.PI * 2);
    ctx.arc(16, 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-12, 0); ctx.lineTo(-8, -3); ctx.lineTo(-4, 0);
    ctx.moveTo(4, 0); ctx.lineTo(8, -3); ctx.lineTo(12, 0);
    ctx.stroke();
    ctx.restore();
  };

  drawCuteCloud(W * 0.22, H * 0.2, 0.95);
  drawCuteCloud(W * 0.78, H * 0.16, 0.8);

  const horizonY = H * 0.56;

  ctx.fillStyle = c[3];
  for (let x = 0; x <= W + 40; x += 52) {
    ctx.beginPath();
    ctx.arc(x, horizonY, 32, 0, Math.PI * 2);
    ctx.fill();
  }

  fillRoundRect(ctx, 0, horizonY - 12, W, 8, 2, "#92400e", "#451a03", 2);
  for (let x = 10; x < W; x += 28) {
    fillRoundRect(ctx, x, horizonY - 24, 14, 28, 4, "#d97706", "#451a03", 2.5);
  }

  const lawnGrad = ctx.createLinearGradient(0, horizonY, 0, H);
  lawnGrad.addColorStop(0, c[2]);
  lawnGrad.addColorStop(1, c[3]);
  ctx.fillStyle = lawnGrad;
  ctx.fillRect(0, horizonY, W, H - horizonY);

  ctx.strokeStyle = "#3f6212";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(W, horizonY);
  ctx.stroke();
}

// ============================================================================
// 2. 동글동글 만두형 귀요미 캐릭터 렌더러 (480x480 고해상도 + 초정밀 악기 결합)
// ============================================================================
function renderPixelAvatar(canvas, config = DEFAULT_AVATAR_CONFIG, options = {}) {
  if (!canvas) return;
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

  const charSize = Math.min(W, H);
  const offsetX = options.charCenterX !== undefined ? options.charCenterX - charSize / 2 : (W - charSize) / 2;
  const offsetY = (H - charSize) / 2 + (options.charOffsetY || 12);

  ctx.translate(offsetX, offsetY);
  ctx.scale(charSize / 480, charSize / 480);

  const outline = "#1e1b18";
  const faceWhite = "#fffdf9";

  // 발밑 동그란 그림자
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.beginPath();
  ctx.ellipse(240, 405, 85, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // 망토
  if (outfitItem.id === "king_robe") {
    fillRoundRect(ctx, 130, 265, 220, 120, 36, "#dc2626", outline, 9);
    fillRoundRect(ctx, 130, 362, 220, 22, 8, "#facc15", outline, 7);
  } else {
    ctx.fillStyle = "#ef4444";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(240, 275);
    ctx.lineTo(315, 295);
    ctx.lineTo(295, 330);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 양갈래 뒷머리
  if (hairItem.style === "twin") {
    fillRoundRect(ctx, 64, 165, 68, 135, 34, hairItem.color, outline, 9);
    fillRoundRect(ctx, 348, 165, 68, 135, 34, hairItem.color, outline, 9);
  }

  // 다리
  ctx.strokeStyle = outline;
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(212, 345); ctx.lineTo(208, 392);
  ctx.moveTo(268, 345); ctx.lineTo(272, 392);
  ctx.stroke();

  // 몸통 & 의상
  const outMain = outfitItem.main || "#ef4444";
  const outSub = outfitItem.sub || "#ffffff";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(185, 290); ctx.lineTo(138, 325);
  ctx.moveTo(295, 290); ctx.lineTo(342, 325);
  ctx.stroke();

  fillRoundRect(ctx, 182, 268, 116, 86, 36, outMain, outline, 9);
  fillRoundRect(ctx, 204, 278, 72, 48, 18, outSub, outline, 6);

  if (isFemale) {
    fillRoundRect(ctx, 174, 328, 132, 28, 14, outSub, outline, 8);
  }

  // 양쪽 동글 귀
  const isMonkey = hairItem.style === "monkey";
  const earR = isMonkey ? 46 : 34;
  ctx.fillStyle = isMonkey ? "#6b3410" : faceWhite;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(105, 198, earR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(375, 198, earR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isMonkey ? "#fffdf9" : "#fda4af";
  ctx.beginPath();
  ctx.arc(105, 198, earR * 0.55, 0, Math.PI * 2);
  ctx.arc(375, 198, earR * 0.55, 0, Math.PI * 2);
  ctx.fill();
  if (isMonkey) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  // 만두형 동글 얼굴
  fillRoundRect(ctx, 112, 92, 256, 190, 92, faceWhite, outline, 10);

  if (isMonkey) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(112, 92, 256, 190, 92);
    ctx.clip();
    ctx.fillStyle = "#6b3410";
    ctx.fillRect(100, 80, 280, 72);
    ctx.fillStyle = faceWhite;
    ctx.beginPath();
    ctx.arc(195, 175, 65, 0, Math.PI * 2);
    ctx.arc(285, 175, 65, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    fillRoundRect(ctx, 112, 92, 256, 190, 92, null, outline, 10);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(232, 92); ctx.lineTo(222, 68);
    ctx.moveTo(246, 92); ctx.lineTo(254, 70);
    ctx.stroke();
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(112, 92, 256, 190, 92);
    ctx.clip();
    ctx.fillStyle = hairItem.color || "#27272a";
    ctx.fillRect(100, 80, 280, 68);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(100, 148);
    ctx.lineTo(380, 148);
    ctx.stroke();
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
    ctx.beginPath();
    ctx.arc(338, 112, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // 볼터치
  ctx.fillStyle = "#fda4af";
  ctx.beginPath();
  ctx.ellipse(164, 222, 24, 13, 0, 0, Math.PI * 2);
  ctx.ellipse(316, 222, 24, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // 표정 & 안경
  ctx.strokeStyle = outline;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (faceItem.id === "square_glass") {
    fillRoundRect(ctx, 156, 174, 72, 42, 8, "#ffffff", outline, 9);
    fillRoundRect(ctx, 252, 174, 72, 42, 8, "#ffffff", outline, 9);
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(228, 194); ctx.lineTo(252, 194);
    ctx.stroke();
  } else if (faceItem.id === "swirl_glass") {
    ctx.lineWidth = 8;
    [192, 288].forEach(cx => {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx, 194, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, 194, 18, 0, Math.PI * 1.5);
      ctx.stroke();
    });
  } else if (faceItem.id === "sunglass") {
    fillRoundRect(ctx, 150, 170, 80, 46, 12, "#0f172a", outline, 8);
    fillRoundRect(ctx, 250, 170, 80, 46, 12, "#0f172a", outline, 8);
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(230, 188); ctx.lineTo(250, 188);
    ctx.stroke();
  } else if (faceItem.id === "wink") {
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(168, 184); ctx.lineTo(208, 196); ctx.lineTo(168, 208);
    ctx.stroke();
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.arc(292, 196, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(287, 190, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (faceItem.id === "singing") {
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(168, 184); ctx.lineTo(204, 196); ctx.lineTo(168, 206);
    ctx.moveTo(312, 184); ctx.lineTo(276, 196); ctx.lineTo(312, 206);
    ctx.stroke();
  } else {
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(170, 172); ctx.lineTo(208, 172);
    ctx.moveTo(272, 172); ctx.lineTo(310, 172);
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(172, 196); ctx.lineTo(208, 196);
    ctx.moveTo(272, 196); ctx.lineTo(308, 196);
    ctx.stroke();
  }

  // 입 모양
  if (faceItem.id === "singing") {
    fillRoundRect(ctx, 214, 218, 52, 36, 18, "#e11d48", outline, 7);
  } else {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(226, 224, 14, 0, Math.PI);
    ctx.arc(254, 224, 14, 0, Math.PI);
    ctx.stroke();
  }

  // 모자 / 헤드셋 / 왕관
  if (hatItem.id === "headset" || hatItem.id === "cat_ear") {
    const hc = hatItem.color || "#0ea5e9";
    ctx.strokeStyle = hc;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(240, 190, 144, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    fillRoundRect(ctx, 82, 162, 34, 68, 16, hc, outline, 8);
    fillRoundRect(ctx, 364, 162, 34, 68, 16, hc, outline, 8);
    if (hatItem.id === "cat_ear") {
      fillRoundRect(ctx, 134, 48, 48, 44, 12, hc, outline, 8);
      fillRoundRect(ctx, 298, 48, 48, 44, 12, hc, outline, 8);
    }
  } else if (hatItem.id === "acorn_hat") {
    fillRoundRect(ctx, 132, 52, 216, 68, 34, "#a16207", outline, 9);
    fillRoundRect(ctx, 232, 30, 16, 26, 6, "#451a03", outline, 6);
  } else if (hatItem.id === "angel") {
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.ellipse(240, 42, 85, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (hatItem.id === "crown") {
    fillRoundRect(ctx, 156, 34, 168, 64, 14, "#facc15", outline, 9);
    fillRoundRect(ctx, 226, 52, 28, 28, 8, "#ef4444", outline, 6);
  }

  // 정밀 악기 렌더링 결합!
  drawDetailedInstrument(ctx, accItem, 355, 295, 1.32);

  ctx.restore();
}

// ============================================================================
// 3. 상점 타일 전용 '단품 코스튬/정밀 악기' 렌더러
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
      ctx.strokeStyle = "#57534e";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(120, 120, 44, 0, Math.PI * 2);
      ctx.moveTo(90, 90); ctx.lineTo(150, 150);
      ctx.stroke();
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
      ctx.fillStyle = item.color || "#27272a";
      ctx.strokeStyle = outline;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(120, 135, 68, Math.PI, 0, false);
      ctx.lineTo(188, 175);
      ctx.lineTo(158, 175);
      ctx.lineTo(158, 130);
      ctx.lineTo(82, 130);
      ctx.lineTo(82, 175);
      ctx.lineTo(52, 175);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (category === "face") {
    if (item.id === "square_glass") {
      fillRoundRect(ctx, 36, 94, 72, 48, 6, "#ffffff", outline, 9);
      fillRoundRect(ctx, 132, 94, 72, 48, 6, "#ffffff", outline, 9);
      ctx.strokeStyle = outline;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(108, 118); ctx.lineTo(132, 118);
      ctx.stroke();
    } else if (item.id === "swirl_glass") {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 8;
      [82, 158].forEach(cx => {
        ctx.beginPath();
        ctx.arc(cx, 120, 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, 120, 18, 0, Math.PI * 1.5);
        ctx.stroke();
      });
    } else if (item.id === "sunglass") {
      fillRoundRect(ctx, 36, 94, 74, 48, 12, "#0f172a", outline, 8);
      fillRoundRect(ctx, 130, 94, 74, 48, 12, "#0f172a", outline, 8);
    } else {
      fillRoundRect(ctx, 52, 62, 136, 116, 56, "#fffdf9", outline, 8);
      ctx.strokeStyle = outline;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(106, 134, 14, 0, Math.PI);
      ctx.arc(134, 134, 14, 0, Math.PI);
      ctx.stroke();
    }
  } else if (category === "hat") {
    if (item.id === "crown") {
      fillRoundRect(ctx, 48, 72, 144, 92, 18, "#facc15", outline, 9);
      fillRoundRect(ctx, 104, 98, 32, 32, 10, "#ef4444", outline, 6);
    } else if (item.id === "acorn_hat") {
      fillRoundRect(ctx, 48, 76, 144, 88, 42, "#a16207", outline, 9);
      fillRoundRect(ctx, 110, 48, 20, 32, 8, "#451a03", outline, 7);
    } else if (item.id === "angel") {
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.ellipse(120, 120, 68, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const hc = item.color || "#0ea5e9";
      ctx.strokeStyle = hc;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(120, 130, 58, Math.PI, 0);
      ctx.stroke();
      fillRoundRect(ctx, 44, 110, 32, 58, 14, hc, outline, 8);
      fillRoundRect(ctx, 164, 110, 32, 58, 14, hc, outline, 8);
    }
  } else if (category === "outfit") {
    fillRoundRect(ctx, 56, 66, 128, 110, 28, item.main || "#ef4444", outline, 9);
    fillRoundRect(ctx, 88, 76, 64, 62, 16, item.sub || "#ffffff", outline, 6);
  } else if (category === "bg") {
    const c = item.colors || ["#5ec8f8", "#aee4ff", "#76d32d", "#58b018"];
    fillRoundRect(ctx, 32, 42, 176, 156, 24, c[0], outline, 8);
    fillRoundRect(ctx, 36, 132, 168, 62, 18, c[2], outline, 6);
  } else {
    fillRoundRect(ctx, 32, 68, 176, 104, 22, "#fef08a", "#b45309", 9);
    ctx.fillStyle = "#b45309";
    ctx.font = "900 38px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(item.id === "gender_ticket" ? "⚧️ 1000" : "🎫 500", 120, 134);
  }

  ctx.restore();
}
