// ============================================================================
// [음악왕 v5.0] 액션퍼즐패밀리(아쿠) 스타일 480x480 캐릭터 & 단품 파츠 렌더러 (pixel_avatar.js)
// - 와이드 파노라마 배경 + 정중앙/좌측 캐릭터 렌더링 지원
// - 상점 타일용 '단품 파츠 아이콘(모자만, 안경만, 헤어만 등)' 단독 고해상도 렌더링 지원
// - 등급(C/B/A/S) 및 코믹 한줄 설명 포함
// ============================================================================

const BASE_AVATAR_SHOP_ITEMS = {
  bg: [
    { id: "meadow", name: "아쿠네 초원마당", price: 0, grade: "C", desc: "따사로운 햇살과 귀여운 구름이\n두둥실 떠다니는 평화로운 뒷마당", colors: ["#5ec8f8", "#aee4ff", "#76d32d", "#58b018"] },
    { id: "neon", name: "네온 뮤직뱅크", price: 40, grade: "B", desc: "화려한 레이저 조명이 쏟아지는\n생방송 음악방송 메인 스테이지", colors: ["#1e1b4b", "#3730a3", "#f43f5e", "#4f46e5"] },
    { id: "sakura", name: "봄날 벚꽃동산", price: 50, grade: "B", desc: "분홍빛 벚꽃잎이 흩날리는\n설레는 봄날의 피크닉 동산", colors: ["#fda4af", "#ffe4e6", "#f472b6", "#db2777"] },
    { id: "galaxy", name: "안드로메다 우주", price: 80, grade: "A", desc: "별똥별이 쏟아지는 신비로운\n우주 최강 음악왕 스테이지", colors: ["#0f172a", "#1e293b", "#38bdf8", "#6366f1"] },
    { id: "royal", name: "황금 음악왕성", price: 150, grade: "S", desc: "오직 전설의 음악왕만이 설 수 있는\n블링블링 순금빛 로얄 스테이지", colors: ["#fde047", "#fef9c3", "#f59e0b", "#b45309"] }
  ],
  hair: [
    { id: "default", name: "초코 바가지머리", price: 0, grade: "C", desc: "동글동글 귀엽게 자른\n액퍼 패밀리 기본 바가지 헤어", color: "#27272a", style: "bowl" },
    { id: "monkey_hood", name: "몽키매직", price: 45, grade: "B", desc: "끼루끼루 끼끼루~\n개구쟁이 원숭이 귀 코스튬 모자", color: "#6b3410", style: "monkey" },
    { id: "blonde", name: "샤이닝 금발", price: 35, grade: "C", desc: "어디서나 눈에 확 띄는\n아이돌 센터 데뷔용 황금빛 염색", color: "#facc15", style: "bowl" },
    { id: "pink_twin", name: "복숭아 양갈래", price: 60, grade: "A", desc: "상큼발랄 과즙미가 팡팡 터지는\n핑크빛 트윈테일 스타일", color: "#f472b6", style: "twin" },
    { id: "sprout_hat", name: "초록 새싹모자", price: 50, grade: "B", desc: "머리 위에서 광합성 중!\n귀여운 초록 새싹 인형 모자", color: "#4ade80", style: "sprout" },
    { id: "octo_hat", name: "도토리 문어모자", price: 75, grade: "A", desc: "쪽쪽 빨판이 살아있는\n엉뚱발랄 숲속 문어 코스튬", color: "#a16207", style: "octo" },
    { id: "rock_red", name: "불꽃 샤기컷", price: 70, grade: "A", desc: "고음이 3옥타브 더 올라갈 것 같은\n정열의 레드 록스타 헤어", color: "#ef4444", style: "spiky" }
  ],
  hat: [
    { id: "none", name: "모자 벗기", price: 0, grade: "C", desc: "아무 모자도 쓰지 않은\n시원하고 깔끔한 기본 상태" },
    { id: "headset", name: "스튜디오 헤드셋", price: 45, grade: "B", desc: "1초 듣기 문제가 더 잘 들릴 것 같은\n블루투스 프로 헤드셋", color: "#0ea5e9" },
    { id: "cat_ear", name: "네코미미 헤드폰", price: 65, grade: "A", desc: "냐옹~ 귀여운 고양이 귀가 달린\n인기 만점 핑크 헤드폰", color: "#f43f5e" },
    { id: "acorn_hat", name: "다람쥐 도토리모자", price: 55, grade: "B", desc: "가을 숲속 다람쥐가 탐내는\n동글동글 도토리 베레모", color: "#854d0e" },
    { id: "angel", name: "천사의 링", price: 90, grade: "A", desc: "머리 위에서 둥실둥실 빛나는\n순백의 천사 헤일로", color: "#facc15" },
    { id: "crown", name: "음악왕 절대왕관", price: 200, grade: "S", desc: "가요계 모든 문제를 정복한\n절대강자의 루비 황금 왕관", color: "#f59e0b" }
  ],
  face: [
    { id: "default", name: "아쿠 미소 (^w^)", price: 0, grade: "C", desc: "보기만 해도 기분이 좋아지는\n액퍼 시그니처 고양이 입 미소" },
    { id: "square_glass", name: "모범생 뿔테안경", price: 35, grade: "B", desc: "나무위키 비하인드를 줄줄 꿰고 있는\n척척박사 네모 안경" },
    { id: "swirl_glass", name: "뱅글뱅글 안경", price: 55, grade: "B", desc: "빙글뱅글 어지러워~!\n코믹 지수 200% 골뱅이 안경" },
    { id: "wink", name: "심쿵 윙크 (>wO)", price: 40, grade: "B", desc: "무대 엔딩요정처럼 상큼하게\n한쪽 눈을 찡긋 감은 표정" },
    { id: "sunglass", name: "힙합 선글라스", price: 60, grade: "A", desc: "연예인 포스가 뿜어져 나오는\n블랙 다크 선글라스" },
    { id: "singing", name: "초고음 열창 (OДO)", price: 50, grade: "A", desc: "마이크가 찢어지도록 열창하는\n득음 직전의 표정" }
  ],
  outfit: [
    { id: "basic", name: "빨간 망토티 (기본)", price: 0, grade: "C", desc: "아쿠가 제일 좋아하는\n활동성 만점 기본 티셔츠", main: "#ef4444", sub: "#ffffff" },
    { id: "overalls", name: "개구쟁이 멜빵룩", price: 50, grade: "B", desc: "90년대 캔디 감성이 물씬 풍기는\n노란 티셔츠와 청멜빵", main: "#facc15", sub: "#2563eb" },
    { id: "uniform", name: "명문고 교복", price: 60, grade: "B", desc: "단정하면서도 풋풋한 매력이 넘치는\n하이스쿨 스쿨룩", main: "#1e293b", sub: "#ef4444" },
    { id: "idol_suit", name: "아이돌 무대제복", price: 85, grade: "A", desc: "시상식 대상을 휩쓸 것 같은\n화려한 금장 스카이 제복", main: "#0284c7", sub: "#facc15" },
    { id: "king_robe", name: "음악왕 황금망토", price: 180, grade: "S", desc: "바람에 멋지게 휘날리는\n최고급 임페리얼 골드 로브", main: "#b45309", sub: "#fde047" }
  ],
  acc: [
    { id: "none", name: "빈손", price: 0, grade: "C", desc: "손에 아무것도 들지 않은\n가벼운 기본 상태" },
    { id: "mic_silver", name: "실버 마이크", price: 0, grade: "C", desc: "노래방 애창곡을 부르기 딱 좋은\n기본 유선 마이크", color: "#94a3b8" },
    { id: "banana", name: "노란 바나나", price: 45, grade: "B", desc: "몽키매직과 찰떡궁합!\n달콤하고 귀여운 바나나 간식", color: "#facc15" },
    { id: "tissue", name: "눈물의 휴지", price: 50, grade: "B", desc: "슬픈 발라드를 들을 때 필수품인\n돌돌 말린 두루마리 휴지", color: "#f8fafc" },
    { id: "lightstick", name: "하트 응원봉", price: 75, grade: "A", desc: "콘서트장을 핑크빛으로 물들이는\n반짝반짝 LED 응원봉", color: "#ec4899" },
    { id: "guitar", name: "일렉트릭 기타", price: 110, grade: "A", desc: "강렬한 록 사운드를 뿜어내는\n커스텀 레드 일렉기타", color: "#ef4444" },
    { id: "mic_gold", name: "전설의 황금마이크", price: 130, grade: "S", desc: "가왕의 목소리를 담아내는\n눈부신 24K 순금 마이크", color: "#facc15" }
  ],
  special: [
    {
      id: "nickname_ticket",
      name: "✨ 닉네임 변경권",
      price: 100,
      grade: "S",
      consumable: true,
      desc: "원하는 새로운 닉네임으로\n즉시 변경할 수 있는 마법 티켓!"
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
// 1. 와이드 파노라마 배경 렌더러 (액션퍼즐패밀리 스타일 하늘 + 웃는 구름 + 나무 울타리 + 초원)
// ============================================================================
function renderApfWideBackground(ctx, W, H, bgItem) {
  const c = (bgItem && bgItem.colors) || ["#5ec8f8", "#aee4ff", "#76d32d", "#58b018"];
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  skyGrad.addColorStop(0, c[0]);
  skyGrad.addColorStop(1, c[1]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // 아기자기한 웃는 구름 (^w^)
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
    // 구름 볼터치 & 눈
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

  // 뒷배경 둥근 나무 수풀
  ctx.fillStyle = c[3];
  for (let x = 0; x <= W + 40; x += 52) {
    ctx.beginPath();
    ctx.arc(x, horizonY, 32, 0, Math.PI * 2);
    ctx.fill();
  }

  // 귀여운 나무 울타리
  ctx.fillStyle = "#b45309";
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 2.5;
  fillRoundRect(ctx, 0, horizonY - 12, W, 8, 2, "#92400e", "#451a03", 2);
  for (let x = 10; x < W; x += 28) {
    fillRoundRect(ctx, x, horizonY - 24, 14, 28, 4, "#d97706", "#451a03", 2.5);
  }

  // 앞쪽 밝은 연두색 잔디 마당
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
// 2. 액션퍼즐패밀리 스타일 480x480 캐릭터 렌더러 (아쿠 감성 굵은 선 + 동글 귀요미)
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

  // 캐릭터가 와이드 캔버스에서도 정중앙(또는 지정 위치)에 비율 깨짐 없이 그려지도록 변환
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

  // 망토 (음악왕 황금망토 또는 기본 빨간 스카프 망토)
  if (outfitItem.id === "king_robe") {
    fillRoundRect(ctx, 130, 265, 220, 120, 36, "#dc2626", outline, 9);
    fillRoundRect(ctx, 130, 362, 220, 22, 8, "#facc15", outline, 7);
  } else {
    // 액퍼 아쿠 특유의 귀여운 빨간 미니 망토/스카프
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

  // 앙증맞은 다리 (액퍼 특유의 심플하고 귀여운 스틱/통통 다리)
  ctx.strokeStyle = outline;
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(212, 345);
  ctx.lineTo(208, 392);
  ctx.moveTo(268, 345);
  ctx.lineTo(272, 392);
  ctx.stroke();

  // 몸통 & 의상 (동글동글 귀요미 바디)
  const outMain = outfitItem.main || "#ef4444";
  const outSub = outfitItem.sub || "#ffffff";

  // 양팔 (만세/차렷 귀여운 포즈)
  ctx.strokeStyle = outline;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(185, 290);
  ctx.lineTo(138, 325);
  ctx.moveTo(295, 290);
  ctx.lineTo(342, 325);
  ctx.stroke();

  fillRoundRect(ctx, 182, 268, 116, 86, 36, outMain, outline, 9);
  fillRoundRect(ctx, 204, 278, 72, 48, 18, outSub, outline, 6);

  if (isFemale) {
    // 여캐 귀여운 프릴 스커트
    fillRoundRect(ctx, 174, 328, 132, 28, 14, outSub, outline, 8);
  }

  // 큼직한 귀 (양쪽 동글 귀 — 몽키매직일 때는 더 큰 원숭이 귀!)
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

  // 귀 안쪽 핑크/살구 디테일
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

  // 얼굴 본체 (액퍼 시그니처 큼직한 만두형 동글 얼굴)
  fillRoundRect(ctx, 112, 92, 256, 190, 92, faceWhite, outline, 10);

  // 몽키매직 원숭이 갈색 털 라인 (첨부 이미지 그대로!)
  if (isMonkey) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(112, 92, 256, 190, 92);
    ctx.clip();
    ctx.fillStyle = "#6b3410";
    ctx.fillRect(100, 80, 280, 72);
    // 이마 M자 원숭이 얼굴 라인
    ctx.fillStyle = faceWhite;
    ctx.beginPath();
    ctx.arc(195, 175, 65, 0, Math.PI * 2);
    ctx.arc(285, 175, 65, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 외곽선 다시 그리기
    fillRoundRect(ctx, 112, 92, 256, 190, 92, null, outline, 10);
    // 머리 위 원숭이 잔털 두 가닥
    ctx.strokeStyle = outline;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(232, 92); ctx.lineTo(222, 68);
    ctx.moveTo(246, 92); ctx.lineTo(254, 70);
    ctx.stroke();
  } else {
    // 일반 헤어 스타일 렌더링
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

    // 새싹 모자 / 문어 모자 특수 헤어
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
    // 여캐 귀여운 핑크 리본
    fillRoundRect(ctx, 312, 96, 52, 32, 12, "#f43f5e", outline, 7);
    ctx.fillStyle = "#ffe4e6";
    ctx.beginPath();
    ctx.arc(338, 112, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // 핑크빛 볼터치
  ctx.fillStyle = "#fda4af";
  ctx.beginPath();
  ctx.ellipse(164, 222, 24, 13, 0, 0, Math.PI * 2);
  ctx.ellipse(316, 222, 24, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // 표정 & 안경 (액퍼 시그니처 코믹/귀요미 표정!)
  ctx.strokeStyle = outline;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (faceItem.id === "square_glass") {
    // 네모 뿔테안경 (첨부 이미지 B등급 안경 그대로!)
    fillRoundRect(ctx, 156, 174, 72, 42, 8, "#ffffff", outline, 9);
    fillRoundRect(ctx, 252, 174, 72, 42, 8, "#ffffff", outline, 9);
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(228, 194);
    ctx.lineTo(252, 194);
    ctx.stroke();
  } else if (faceItem.id === "swirl_glass") {
    // 뱅글뱅글 안경
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
    // 기본 액퍼 아쿠 표정 (ㅡ ㅡ 눈썹 + 초롱눈 또는 실눈)
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

  // 입 모양 (액퍼 특유의 귀여운 3자 고양이 입 `w` 또는 열창 입)
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

  // 손 소품 / 악기
  if (accItem.id === "mic_silver" || accItem.id === "mic_gold") {
    fillRoundRect(ctx, 336, 272, 24, 68, 10, "#475569", outline, 7);
    fillRoundRect(ctx, 324, 234, 48, 48, 24, accItem.color || "#94a3b8", outline, 7);
  } else if (accItem.id === "banana") {
    fillRoundRect(ctx, 326, 256, 74, 34, 17, "#facc15", outline, 7);
    fillRoundRect(ctx, 338, 240, 68, 32, 16, "#fde047", outline, 7);
  } else if (accItem.id === "tissue") {
    fillRoundRect(ctx, 326, 252, 64, 58, 16, "#ffffff", outline, 7);
    fillRoundRect(ctx, 346, 268, 24, 24, 12, "#94a3b8", outline, 5);
  } else if (accItem.id === "guitar") {
    fillRoundRect(ctx, 356, 180, 26, 100, 8, "#78350f", outline, 7);
    fillRoundRect(ctx, 316, 248, 88, 88, 34, "#ef4444", outline, 8);
  } else if (accItem.id === "lightstick") {
    fillRoundRect(ctx, 342, 268, 22, 68, 10, "#ffffff", outline, 7);
    fillRoundRect(ctx, 322, 218, 62, 56, 26, "#ec4899", outline, 7);
  }

  ctx.restore();
}

// ============================================================================
// 3. 상점 타일 전용 '단품 코스튬 파츠' 고해상도 렌더러 (첨부 사진처럼 파츠만 크게 그리기!)
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

  if (category === "hair") {
    if (item.style === "monkey") {
      // 원숭이 모자 단품 아이콘 (첨부 이미지 좌하단 핑크 선택 타일 그대로!)
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
      // 바가지/헤어 단품 실루엣 (첨부 이미지 1행 1열 스타일!)
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
      // 첨부 이미지 1행 2열 네모 안경 단품 그대로!
      fillRoundRect(ctx, 36, 94, 72, 48, 6, "#ffffff", outline, 9);
      fillRoundRect(ctx, 132, 94, 72, 48, 6, "#ffffff", outline, 9);
      ctx.strokeStyle = outline;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(108, 118);
      ctx.lineTo(132, 118);
      ctx.stroke();
    } else if (item.id === "swirl_glass") {
      // 첨부 이미지 3행 2열 골뱅이 안경 단품 그대로!
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
  } else if (category === "acc") {
    if (item.id === "banana") {
      fillRoundRect(ctx, 56, 105, 128, 46, 22, "#facc15", outline, 8);
      fillRoundRect(ctx, 72, 78, 116, 44, 22, "#fde047", outline, 8);
    } else if (item.id === "tissue") {
      fillRoundRect(ctx, 64, 68, 112, 98, 24, "#ffffff", outline, 8);
      fillRoundRect(ctx, 98, 92, 44, 42, 20, "#94a3b8", outline, 6);
    } else if (item.id === "guitar") {
      fillRoundRect(ctx, 110, 38, 24, 110, 8, "#78350f", outline, 8);
      fillRoundRect(ctx, 68, 108, 104, 92, 36, "#ef4444", outline, 8);
    } else {
      fillRoundRect(ctx, 104, 112, 32, 78, 12, "#475569", outline, 8);
      fillRoundRect(ctx, 84, 54, 72, 68, 34, item.color || "#facc15", outline, 8);
    }
  } else if (category === "outfit") {
    fillRoundRect(ctx, 56, 66, 128, 110, 28, item.main || "#ef4444", outline, 9);
    fillRoundRect(ctx, 88, 76, 64, 62, 16, item.sub || "#ffffff", outline, 6);
  } else if (category === "bg") {
    const c = item.colors || ["#5ec8f8", "#aee4ff", "#76d32d", "#58b018"];
    fillRoundRect(ctx, 32, 42, 176, 156, 24, c[0], outline, 8);
    fillRoundRect(ctx, 36, 132, 168, 62, 18, c[2], outline, 6);
  } else {
    fillRoundRect(ctx, 36, 68, 168, 104, 22, "#fef08a", "#b45309", 9);
    ctx.fillStyle = "#b45309";
    ctx.font = "900 44px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎫 VIP", 120, 136);
  }

  ctx.restore();
}
