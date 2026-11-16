// ============================================================================
// [음악왕 v6.0] 오리지널 K-POP SD 캐릭터 & 초정밀 악기/코스튬 일러스트 렌더러 (pixel_avatar.js)
// - 표절 요소(아쿠 등) 완전 제거 -> 음악왕 오리지널 SD 보컬/밴드 아바타 디자인
// - 고해상도 베지어 곡선 + 그라데이션 + 금속 질감으로 마이크·일렉기타·키타·응원봉·붐박스 정밀 묘사
// - 성별은 회원가입 시 설정, 이후 변경은 [성별 변경권 1000 CD], [닉네임 변경권 500 CD] 아이템으로만 가능
// ============================================================================

const BASE_AVATAR_SHOP_ITEMS = {
  bg: [
    { id: "meadow", name: "버스킹 파크 (기본)", price: 0, grade: "C", desc: "시원한 바람이 부는 한강 공원\n야외 어쿠스틱 버스킹 무대", colors: ["#38bdf8", "#bae6fd", "#4ade80", "#16a34a"] },
    { id: "neon", name: "엠카 네온 스튜디오", price: 40, grade: "B", desc: "화려한 레이저와 네온 조명이 빛나는\n생방송 음악방송 메인 스테이지", colors: ["#1e1b4b", "#312e81", "#ec4899", "#4f46e5"] },
    { id: "sakura", name: "봄날 벚꽃 페스티벌", price: 50, grade: "B", desc: "분홍빛 벚꽃잎이 흩날리는\n봄날의 야외 뮤직 페스티벌", colors: ["#fda4af", "#ffe4e6", "#f472b6", "#db2777"] },
    { id: "galaxy", name: "스타라이트 돔투어", price: 80, grade: "A", desc: "수만 개의 응원봉 별빛이 수놓아진\n월드투어 스타디움 콘서트홀", colors: ["#090d16", "#1e293b", "#38bdf8", "#6366f1"] },
    { id: "royal", name: "골든디스크 대상홀", price: 150, grade: "S", desc: "연말 가요대상 주인공만 설 수 있는\n영광의 황금빛 로얄 스테이지", colors: ["#fde047", "#fef9c3", "#f59e0b", "#b45309"] }
  ],
  hair: [
    { id: "default", name: "내추럴 다크브라운", price: 0, grade: "C", desc: "차분하고 단정한 스타일의\n기본 다크브라운 헤어", color: "#27272a", sub: "#52525b", style: "natural" },
    { id: "blonde", name: "센터 아이돌 금발", price: 45, grade: "B", desc: "조명 아래서 가장 눈부시게 빛나는\n화려한 플래티넘 블론드 헤어", color: "#eab308", sub: "#fef08a", style: "idol" },
    { id: "pink_twin", name: "체리블라썸 트윈테일", price: 65, grade: "A", desc: "양갈래 리본으로 포인트를 준\n상큼발랄 걸그룹 센터 헤어", color: "#ec4899", sub: "#fbcfe8", style: "twin" },
    { id: "retro_90s", name: "90s 하이틴 울프컷", price: 55, grade: "B", desc: "90년대 가요톱텐 시절 감성을 살린\n스타일리시 레이어드 컷", color: "#78350f", sub: "#d97706", style: "wolf" },
    { id: "mint_pop", name: "민트소다 팝스타", price: 70, grade: "A", desc: "청량한 서머송에 완벽하게 어울리는\n에메랄드 민트 컬러 헤어", color: "#14b8a6", sub: "#99f6e4", style: "idol" },
    { id: "rock_red", name: "크림슨 록스타 장발", price: 80, grade: "A", desc: "폭발적인 샤우팅을 선보일 것 같은\n강렬한 와인레드 롱 헤어", color: "#dc2626", sub: "#fca5a5", style: "long" },
    { id: "silver_star", name: "갤럭시 실버 헤어", price: 110, grade: "S", desc: "신비로운 아우라를 풍기는\n컴백 스페셜 애쉬 실버 스타일", color: "#64748b", sub: "#f1f5f9", style: "idol" }
  ],
  hat: [
    { id: "none", name: "모자 미착용", price: 0, grade: "C", desc: "헤어스타일을 그대로 보여주는\n깔끔한 기본 상태" },
    { id: "headset", name: "프로 모니터링 헤드폰", price: 50, grade: "B", desc: "녹음실 디렉터가 애용하는\n고음질 스튜디오 헤드폰", color: "#0ea5e9", sub: "#e0f2fe" },
    { id: "cat_ear", name: "네온 캣이어 헤드셋", price: 70, grade: "A", desc: "LED 고양이 귀에서 빛이 나는\n스트리머 인기 헤드셋", color: "#f43f5e", sub: "#fecdd3" },
    { id: "beret", name: "아티스트 체크 베레모", price: 55, grade: "B", desc: "감성 싱어송라이터 분위기를 더해주는\n버건디 포인트 베레모", color: "#be123c", sub: "#fda4af" },
    { id: "beanie", name: "스트릿 힙합 비니", price: 45, grade: "B", desc: "쇼미더머니 래퍼 느낌을 살려주는\n인디고 와치캡 비니", color: "#1d4ed8", sub: "#93c5fd" },
    { id: "angel", name: "엔젤릭 헤일로 링", price: 95, grade: "A", desc: "천상의 목소리를 가진 보컬에게만\n허락된 빛나는 천사 링", color: "#facc15", sub: "#fef9c3" },
    { id: "crown", name: "음악왕 임페리얼 크라운", price: 220, grade: "S", desc: "수많은 명곡 퀴즈를 제패한\n음악왕의 상징 루비 골드 왕관", color: "#f59e0b", sub: "#fef08a" }
  ],
  face: [
    { id: "default", name: "클리어 아이즈 (기본)", price: 0, grade: "C", desc: "맑고 총명하게 빛나는\n음악왕 도전자 기본 눈빛" },
    { id: "square_glass", name: "프로듀서 뿔테안경", price: 40, grade: "B", desc: "히트곡 작곡가의 지적인 포스가 느껴지는\n클래식 하프 프레임 안경" },
    { id: "tint_glass", name: "레트로 틴트 선글라스", price: 65, grade: "A", desc: "뉴트로 댄스곡 무대에 딱 어울리는\n핑크 골드 틴트 선글라스" },
    { id: "wink", name: "엔딩요정 윙크", price: 45, grade: "B", desc: "카메라 원샷을 사로잡는\n상큼한 무대 엔딩 윙크 표정" },
    { id: "sunglass", name: "슈퍼스타 블랙 선글라스", price: 60, grade: "A", desc: "공항 패션의 완성!\n시크한 올블랙 스퀘어 선글라스" },
    { id: "singing", name: "3단고음 열창 표정", price: 55, grade: "A", desc: "클라이맥스 하이라이트를 부르는\n혼신의 열창 표정" }
  ],
  outfit: [
    { id: "basic", name: "연습생 후드 집업", price: 0, grade: "C", desc: "안무 연습실에서 가장 편하게 입는\n인디고 트레이닝 후드", main: "#4f46e5", sub: "#e0e7ff" },
    { id: "overalls", name: "90s 뉴잭스윙 멜빵룩", price: 55, grade: "B", desc: "90년대 댄스 그룹 감성을 재현한\n비비드 옐로우 & 데님 오버롤", main: "#f59e0b", sub: "#2563eb" },
    { id: "uniform", name: "예고 뮤지컬과 교복", price: 65, grade: "B", desc: "네이비 자켓과 레드 타이로 멋을 낸\n예술고등학교 정복", main: "#1e293b", sub: "#ef4444" },
    { id: "idol_suit", name: "로얄 골드 무대제복", price: 90, grade: "A", desc: "금빛 견장과 테슬 장식이 빛나는\n단독 콘서트 오프닝 제복", main: "#0284c7", sub: "#facc15" },
    { id: "rock_leather", name: "록밴드 라이더 자켓", price: 85, grade: "A", desc: "메탈 스터드와 체인이 장식된\n시크한 블랙 가죽 자켓", main: "#18181b", sub: "#e11d48" },
    { id: "king_robe", name: "음악왕 대상 벨벳로브", price: 200, grade: "S", desc: "가요대상 그랜드슬램 달성자를 위한\n최고급 크림슨 & 골드 벨벳 망토", main: "#991b1b", sub: "#fde047" }
  ],
  acc: [
    { id: "none", name: "악기 미착용", price: 0, grade: "C", desc: "손에 악기를 들지 않은\n자유로운 퍼포먼스 상태" },
    { id: "mic_silver", name: "다이나믹 보컬 마이크", price: 0, grade: "C", desc: "촘촘한 스틸 그릴망과 그립감이 살아있는\n스튜디오 표준 보컬 마이크", color: "#94a3b8" },
    { id: "lightstick", name: "시그니처 하트 응원봉", price: 75, grade: "A", desc: "투명 돔 안에 네온 하트가 빛나는\n공식 팬클럽 응원봉", color: "#ec4899" },
    { id: "keytar", name: "일렉트로 숄더 키타", price: 95, grade: "A", desc: "어깨에 메고 건반을 연주하는\n신스팝 밴드 전용 숄더 신디사이저", color: "#0ea5e9" },
    { id: "boombox", name: "90s 마스터 붐박스", price: 90, grade: "A", desc: "더블 우퍼 스피커와 카세트 데크가 달린\n스트릿 힙합 대형 라디오", color: "#334155" },
    { id: "guitar", name: "커스텀 스트랫 일렉기타", price: 120, grade: "S", desc: "6현 줄과 픽업, 헤드머신까지 정교하게 제작된\n체리레드 커스텀 일렉기타", color: "#dc2626" },
    { id: "mic_gold", name: "24K 골든 보컬 마이크", price: 140, grade: "S", desc: "전설의 보컬리스트에게 수여되는\n황금빛 커스텀 콘덴서 마이크", color: "#facc15" }
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

function fillRoundRect(ctx, x, y, w, h, radius, fill, stroke = null, strokeWidth = 6) {
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
// 정밀 악기 드로잉 함수 (단순 도형이 아닌 실제 악기 디테일: 그릴망, 기타 6현/픽업/헤드, 건반, 스피커 우퍼)
// ============================================================================
function drawDetailedInstrument(ctx, accItem, cx, cy, scale = 1) {
  if (!accItem || accItem.id === "none") return;
  const outline = "#1e293b";
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  if (accItem.id === "mic_silver" || accItem.id === "mic_gold") {
    const isGold = accItem.id === "mic_gold";
    ctx.rotate(-0.22);
    // 마이크 하단 케이블 잭
    fillRoundRect(ctx, -6, 42, 12, 14, 4, "#0f172a", outline, 3);
    // 테이퍼형 마이크 손잡이 바디
    ctx.fillStyle = isGold ? "#d97706" : "#334155";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-11, -6);
    ctx.lineTo(11, -6);
    ctx.lineTo(8, 44);
    ctx.lineTo(-8, 44);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 손잡이 광택 & ON/OFF 스위치
    fillRoundRect(ctx, -3, 8, 6, 14, 2, "#0f172a");
    fillRoundRect(ctx, -2, 10, 4, 6, 1, "#ef4444");
    // 마이크 헤드 구체
    const headGrad = ctx.createRadialGradient(-6, -26, 4, 0, -22, 24);
    headGrad.addColorStop(0, isGold ? "#fef08a" : "#f8fafc");
    headGrad.addColorStop(0.6, isGold ? "#facc15" : "#94a3b8");
    headGrad.addColorStop(1, isGold ? "#b45309" : "#475569");
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, -22, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 마이크 그릴 철망 격자 무늬
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
    // 마이크 중앙 크롬/골드 링 밴드
    fillRoundRect(ctx, -22, -25, 44, 6, 3, isGold ? "#fef08a" : "#e2e8f0", outline, 3);
  } else if (accItem.id === "guitar") {
    ctx.rotate(-0.48);
    // 1) 기타 넥(지판) & 헤드스톡
    fillRoundRect(ctx, -7, -95, 14, 78, 3, "#fde68a", outline, 3.5);
    // 프렛(Fret) 구분선
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 1.5;
    for (let fy = -85; fy < -20; fy += 9) {
      ctx.beginPath();
      ctx.moveTo(-6, fy); ctx.lineTo(6, fy);
      ctx.stroke();
    }
    // 기타 헤드(Headstock)와 6개 조율 페그(Tuning Pegs)
    ctx.fillStyle = "#dc2626";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-8, -94);
    ctx.lineTo(-14, -124);
    ctx.lineTo(6, -130);
    ctx.lineTo(10, -94);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 좌측 6개 은색 페그 노브
    ctx.fillStyle = "#e2e8f0";
    for (let py = -122; py <= -100; py += 7) {
      ctx.beginPath();
      ctx.arc(-16, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 2) 스트라토캐스터 더블 컷어웨이 기타 바디 곡선
    const bodyGrad = ctx.createLinearGradient(-40, -25, 40, 55);
    bodyGrad.addColorStop(0, "#f87171");
    bodyGrad.addColorStop(0.3, "#dc2626");
    bodyGrad.addColorStop(1, "#7f1d1d");
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-12, -24);
    ctx.bezierCurveTo(-36, -38, -42, -5, -28, 12);
    ctx.bezierCurveTo(-48, 28, -44, 66, 0, 68);
    ctx.bezierCurveTo(44, 66, 48, 28, 26, 12);
    ctx.bezierCurveTo(38, -2, 34, -32, 12, -20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3) 화이트 픽가드(Pickguard)
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(2, 20, 22, 30, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4) 싱글코일 픽업 3개 & 브릿지
    fillRoundRect(ctx, -10, 4, 20, 5, 2, "#1e293b");
    fillRoundRect(ctx, -10, 14, 20, 5, 2, "#1e293b");
    fillRoundRect(ctx, -10, 24, 20, 5, 2, "#1e293b");
    fillRoundRect(ctx, -12, 38, 24, 9, 2, "#94a3b8", outline, 2);

    // 5) 6현 기타 줄 (헤드에서 브릿지까지 선명하게 연결)
    ctx.strokeStyle = "rgba(241, 245, 249, 0.9)";
    ctx.lineWidth = 1;
    for (let sx = -4; sx <= 4; sx += 2.6) {
      ctx.beginPath();
      ctx.moveTo(sx, -94);
      ctx.lineTo(sx, 40);
      ctx.stroke();
    }
  } else if (accItem.id === "lightstick") {
    ctx.rotate(-0.18);
    // 손잡이 스트랩 고리
    ctx.strokeStyle = "#f472b6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 52, 8, 0, Math.PI * 2);
    ctx.stroke();
    // 진주빛 손잡이 & 로즈골드 링
    fillRoundRect(ctx, -9, 0, 18, 48, 8, "#ffffff", outline, 3.5);
    fillRoundRect(ctx, -12, -6, 24, 9, 4, "#fb7185", outline, 3);
    fillRoundRect(ctx, -3, 14, 6, 6, 3, "#ec4899");
    // 투명 아크릴 구형 돔 (내부 발광 그라데이션)
    const domeGrad = ctx.createRadialGradient(-8, -32, 4, 0, -28, 30);
    domeGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    domeGrad.addColorStop(0.5, "rgba(251, 207, 232, 0.75)");
    domeGrad.addColorStop(1, "rgba(244, 114, 182, 0.85)");
    ctx.fillStyle = domeGrad;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -28, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 돔 내부 입체 하트 엠블럼
    ctx.fillStyle = "#e11d48";
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.bezierCurveTo(-18, -28, -16, -44, 0, -34);
    ctx.bezierCurveTo(16, -44, 18, -28, 0, -16);
    ctx.fill();
  } else if (accItem.id === "keytar") {
    ctx.rotate(-0.35);
    // 숄더 키보드(Keytar) 바디
    fillRoundRect(ctx, -42, -22, 84, 46, 12, "#0284c7", outline, 4);
    fillRoundRect(ctx, -68, -10, 28, 20, 6, "#0369a1", outline, 3.5);
    // 상단 컨트롤 패널 & LED 창
    fillRoundRect(ctx, -34, -15, 26, 8, 3, "#0f172a");
    fillRoundRect(ctx, -32, -13, 14, 4, 1, "#38bdf8");
    // 피아노 흰 건반 & 검은 건반 정밀 묘사
    fillRoundRect(ctx, -34, -2, 68, 20, 3, "#ffffff", outline, 2.5);
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
    // 상단 크롬 손잡이 & 안테나
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(22, -24); ctx.lineTo(38, -56);
    ctx.stroke();
    fillRoundRect(ctx, -28, -34, 56, 12, 5, "#94a3b8", outline, 3.5);
    // 붐박스 메인 바디
    fillRoundRect(ctx, -48, -24, 96, 58, 10, "#334155", outline, 4);
    fillRoundRect(ctx, -42, -18, 84, 12, 4, "#0f172a");
    // 좌우 듀얼 우퍼 스피커 그릴 & 콘
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
    // 중앙 카세트 테이프 데크 창
    fillRoundRect(ctx, -9, 2, 18, 16, 3, "#facc15", outline, 2.5);
  }

  ctx.restore();
}

// ============================================================================
// 1. 와이드 파노라마 배경 렌더러 (음악왕 스테이지 배경)
// ============================================================================
function renderWideStageBackground(ctx, W, H, bgItem) {
  const c = (bgItem && bgItem.colors) || ["#38bdf8", "#bae6fd", "#4ade80", "#16a34a"];
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  skyGrad.addColorStop(0, c[0]);
  skyGrad.addColorStop(1, c[1]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // 부드러운 구름 & 음표 배경 장식
  const drawCloud = (cx, cy, s = 1) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.beginPath();
    ctx.arc(-26, 6, 20, 0, Math.PI * 2);
    ctx.arc(0, -6, 26, 0, Math.PI * 2);
    ctx.arc(26, 6, 20, 0, Math.PI * 2);
    ctx.arc(0, 10, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawCloud(W * 0.18, H * 0.22, 0.9);
  drawCloud(W * 0.82, H * 0.18, 0.8);

  const horizonY = H * 0.58;

  // 뒷배경 나무/스테이지 실루엣
  ctx.fillStyle = c[3];
  for (let x = 0; x <= W + 40; x += 56) {
    ctx.beginPath();
    ctx.arc(x, horizonY, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  // 앞쪽 스테이지/잔디 바닥
  const floorGrad = ctx.createLinearGradient(0, horizonY, 0, H);
  floorGrad.addColorStop(0, c[2]);
  floorGrad.addColorStop(1, c[3]);
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, horizonY, W, H - horizonY);

  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(W, horizonY);
  ctx.stroke();
}

// ============================================================================
// 2. 오리지널 K-POP SD 캐릭터 렌더러 (480x480 고해상도)
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
    renderWideStageBackground(ctx, W, H, bgItem);
  }

  const charSize = Math.min(W, H);
  const offsetX = options.charCenterX !== undefined ? options.charCenterX - charSize / 2 : (W - charSize) / 2;
  const offsetY = (H - charSize) / 2 + (options.charOffsetY || 10);

  ctx.translate(offsetX, offsetY);
  ctx.scale(charSize / 480, charSize / 480);

  const outline = "#1e293b";
  const hairMain = hairItem.color || "#27272a";
  const hairHi = hairItem.sub || "#71717a";

  // 발밑 그림자
  ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
  ctx.beginPath();
  ctx.ellipse(240, 408, 86, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // 대상 벨벳 로브 망토
  if (outfitItem.id === "king_robe") {
    fillRoundRect(ctx, 122, 248, 236, 140, 32, "#991b1b", outline, 7);
    fillRoundRect(ctx, 122, 366, 236, 22, 8, "#facc15", outline, 5);
  }

  // 뒷머리 (장발 또는 여캐 기본 웨이브 또는 트윈테일)
  if (hairItem.style === "long" || (isFemale && hairItem.style === "natural")) {
    fillRoundRect(ctx, 126, 150, 228, 170, 48, hairMain, outline, 8);
  } else if (hairItem.style === "twin") {
    fillRoundRect(ctx, 72, 162, 64, 150, 30, hairMain, outline, 8);
    fillRoundRect(ctx, 344, 162, 64, 150, 30, hairMain, outline, 8);
    fillRoundRect(ctx, 84, 158, 40, 20, 8, "#f43f5e", outline, 5);
    fillRoundRect(ctx, 356, 158, 40, 20, 8, "#f43f5e", outline, 5);
  }

  // 다리 & 스니커즈/부츠
  fillRoundRect(ctx, 188, 332, 38, 56, 14, "#ffe4c8", outline, 7);
  fillRoundRect(ctx, 254, 332, 38, 56, 14, "#ffe4c8", outline, 7);
  const shoeColor = isFemale ? "#e11d48" : "#334155";
  fillRoundRect(ctx, 176, 370, 54, 32, 14, shoeColor, outline, 7);
  fillRoundRect(ctx, 250, 370, 54, 32, 14, shoeColor, outline, 7);
  fillRoundRect(ctx, 186, 376, 22, 9, 4, "#ffffff");
  fillRoundRect(ctx, 260, 376, 22, 9, 4, "#ffffff");

  // 몸통 & 의상
  const outMain = outfitItem.main || "#4f46e5";
  const outSub = outfitItem.sub || "#e0e7ff";

  fillRoundRect(ctx, 128, 258, 42, 72, 18, outMain, outline, 7);
  fillRoundRect(ctx, 310, 258, 42, 72, 18, outMain, outline, 7);
  fillRoundRect(ctx, 132, 312, 34, 30, 14, "#ffe4c8", outline, 6);
  fillRoundRect(ctx, 314, 312, 34, 30, 14, "#ffe4c8", outline, 6);

  fillRoundRect(ctx, 156, 250, 168, 98, 28, outMain, outline, 8);
  fillRoundRect(ctx, 210, 252, 60, 68, 12, outSub, outline, 5);

  if (outfitItem.id === "uniform") {
    fillRoundRect(ctx, 230, 262, 20, 48, 5, "#ef4444", outline, 4);
  } else if (outfitItem.id === "idol_suit") {
    fillRoundRect(ctx, 156, 252, 32, 16, 6, "#facc15", outline, 4);
    fillRoundRect(ctx, 292, 252, 32, 16, 6, "#facc15", outline, 4);
  }

  if (isFemale) {
    fillRoundRect(ctx, 148, 322, 184, 32, 14, outSub, outline, 7);
  } else {
    fillRoundRect(ctx, 162, 324, 156, 28, 10, "#1e293b", outline, 7);
  }

  // 귀 & 얼굴
  fillRoundRect(ctx, 114, 170, 34, 44, 16, "#fed7aa", outline, 7);
  fillRoundRect(ctx, 332, 170, 34, 44, 16, "#fed7aa", outline, 7);

  const faceGrad = ctx.createLinearGradient(240, 105, 240, 260);
  faceGrad.addColorStop(0, "#fff7ed");
  faceGrad.addColorStop(0.75, "#ffe4c8");
  faceGrad.addColorStop(1, "#fed7aa");
  fillRoundRect(ctx, 132, 104, 216, 156, 68, faceGrad, outline, 8);

  // 볼터치
  ctx.fillStyle = isFemale ? "rgba(251, 113, 133, 0.55)" : "rgba(253, 164, 175, 0.4)";
  ctx.beginPath();
  ctx.ellipse(168, 214, 20, 11, 0, 0, Math.PI * 2);
  ctx.ellipse(312, 214, 20, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // 눈매 & 표정 & 안경
  const drawAnimeEye = (cx, cy) => {
    fillRoundRect(ctx, cx - 21, cy - 23, 42, 46, 16, outline);
    fillRoundRect(ctx, cx - 17, cy - 17, 34, 36, 13, "#312e81");
    fillRoundRect(ctx, cx - 13, cy - 3, 26, 20, 9, "#6366f1");
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 8, 7.5, 0, Math.PI * 2);
    ctx.arc(cx + 7, cy + 7, 4, 0, Math.PI * 2);
    ctx.fill();
    if (isFemale) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(cx - 22, cy - 17);
      ctx.lineTo(cx - 30, cy - 24);
      ctx.stroke();
    }
  };

  if (faceItem.id === "wink") {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 7.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(168, 192);
    ctx.quadraticCurveTo(188, 176, 208, 192);
    ctx.stroke();
    drawAnimeEye(292, 190);
    fillRoundRect(ctx, 226, 222, 28, 16, 8, "#f43f5e", outline, 4.5);
  } else if (faceItem.id === "singing") {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 7.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(168, 188); ctx.quadraticCurveTo(188, 174, 208, 188);
    ctx.moveTo(272, 188); ctx.quadraticCurveTo(292, 174, 312, 188);
    ctx.stroke();
    fillRoundRect(ctx, 216, 214, 48, 32, 16, "#be123c", outline, 5.5);
    fillRoundRect(ctx, 226, 226, 28, 15, 7, "#fb7185");
  } else {
    drawAnimeEye(188, 190);
    drawAnimeEye(292, 190);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(240, 220, 14, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  // 안경/선글라스 레이어
  if (faceItem.id === "square_glass") {
    fillRoundRect(ctx, 152, 168, 76, 44, 10, "rgba(255,255,255,0.25)", outline, 7);
    fillRoundRect(ctx, 252, 168, 76, 44, 10, "rgba(255,255,255,0.25)", outline, 7);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(228, 188); ctx.lineTo(252, 188);
    ctx.stroke();
  } else if (faceItem.id === "tint_glass") {
    fillRoundRect(ctx, 150, 166, 78, 48, 18, "rgba(244, 63, 94, 0.55)", "#d97706", 6);
    fillRoundRect(ctx, 252, 166, 78, 48, 18, "rgba(244, 63, 94, 0.55)", "#d97706", 6);
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(228, 186); ctx.lineTo(252, 186);
    ctx.stroke();
  } else if (faceItem.id === "sunglass") {
    fillRoundRect(ctx, 148, 166, 82, 48, 12, "#0f172a", outline, 6);
    fillRoundRect(ctx, 250, 166, 82, 48, 12, "#0f172a", outline, 6);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(230, 184); ctx.lineTo(250, 184);
    ctx.stroke();
    fillRoundRect(ctx, 162, 176, 26, 9, 4, "#38bdf8");
    fillRoundRect(ctx, 264, 176, 26, 9, 4, "#38bdf8");
  }

  // 앞머리 & 헤어 결 + 엔젤링
  fillRoundRect(ctx, 124, 82, 232, 74, 38, hairMain, outline, 8);
  fillRoundRect(ctx, 122, 120, 36, 74, 16, hairMain, outline, 7);
  fillRoundRect(ctx, 322, 120, 36, 74, 16, hairMain, outline, 7);
  fillRoundRect(ctx, 166, 118, 46, 42, 16, hairMain, outline, 6);
  fillRoundRect(ctx, 216, 118, 50, 44, 16, hairMain, outline, 6);
  fillRoundRect(ctx, 268, 118, 46, 42, 16, hairMain, outline, 6);
  // 엔젤링 하이라이트
  fillRoundRect(ctx, 162, 98, 62, 14, 7, hairHi);
  fillRoundRect(ctx, 256, 98, 62, 14, 7, hairHi);

  // 모자 / 헤드셋 / 왕관
  if (hatItem.id === "headset" || hatItem.id === "cat_ear") {
    const hc = hatItem.color || "#0ea5e9";
    fillRoundRect(ctx, 112, 70, 256, 24, 12, hc, outline, 7);
    fillRoundRect(ctx, 94, 142, 36, 76, 16, hc, outline, 7);
    fillRoundRect(ctx, 350, 142, 36, 76, 16, hc, outline, 7);
    if (hatItem.id === "cat_ear") {
      fillRoundRect(ctx, 130, 34, 50, 44, 12, hc, outline, 7);
      fillRoundRect(ctx, 142, 44, 26, 24, 6, hatItem.sub || "#fecdd3");
      fillRoundRect(ctx, 300, 34, 50, 44, 12, hc, outline, 7);
      fillRoundRect(ctx, 312, 44, 26, 24, 6, hatItem.sub || "#fecdd3");
    }
  } else if (hatItem.id === "beret") {
    fillRoundRect(ctx, 120, 52, 236, 54, 26, hatItem.color || "#be123c", outline, 8);
    fillRoundRect(ctx, 232, 36, 16, 18, 6, outline);
  } else if (hatItem.id === "beanie") {
    fillRoundRect(ctx, 126, 50, 228, 64, 30, hatItem.color || "#1d4ed8", outline, 8);
    fillRoundRect(ctx, 120, 94, 240, 24, 10, hatItem.sub || "#93c5fd", outline, 6);
  } else if (hatItem.id === "angel") {
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.ellipse(240, 42, 82, 17, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (hatItem.id === "crown") {
    fillRoundRect(ctx, 154, 34, 172, 60, 14, "#facc15", outline, 8);
    fillRoundRect(ctx, 224, 18, 32, 30, 10, "#f59e0b", outline, 6);
    fillRoundRect(ctx, 228, 52, 24, 24, 8, "#ef4444", outline, 5);
  }

  // 정밀 악기 렌더링 호출!
  drawDetailedInstrument(ctx, accItem, 368, 286, 1.35);

  ctx.restore();
}

// ============================================================================
// 3. 상점 타일 전용 '단품 파츠/악기' 초정밀 아이콘 렌더러
// ============================================================================
function renderItemThumbnail(canvas, category, item) {
  if (!canvas || !item) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const outline = "#1e293b";

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.scale(W / 240, H / 240);

  if (category === "acc") {
    if (item.id === "none") {
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(120, 120, 46, 0, Math.PI * 2);
      ctx.moveTo(88, 88); ctx.lineTo(152, 152);
      ctx.stroke();
    } else {
      drawDetailedInstrument(ctx, item, 120, 128, 1.45);
    }
  } else if (category === "hair") {
    ctx.fillStyle = item.color || "#27272a";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(120, 130, 66, Math.PI, 0, false);
    ctx.lineTo(186, 176);
    ctx.lineTo(154, 176);
    ctx.lineTo(154, 128);
    ctx.lineTo(86, 128);
    ctx.lineTo(86, 176);
    ctx.lineTo(54, 176);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    fillRoundRect(ctx, 84, 84, 72, 14, 7, item.sub || "#71717a");
  } else if (category === "face") {
    if (item.id === "square_glass") {
      fillRoundRect(ctx, 36, 94, 72, 48, 8, "#ffffff", outline, 8);
      fillRoundRect(ctx, 132, 94, 72, 48, 8, "#ffffff", outline, 8);
      ctx.strokeStyle = outline;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(108, 118); ctx.lineTo(132, 118);
      ctx.stroke();
    } else if (item.id === "tint_glass") {
      fillRoundRect(ctx, 36, 92, 74, 50, 18, "rgba(244, 63, 94, 0.6)", "#d97706", 7);
      fillRoundRect(ctx, 130, 92, 74, 50, 18, "rgba(244, 63, 94, 0.6)", "#d97706", 7);
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(110, 116); ctx.lineTo(130, 116);
      ctx.stroke();
    } else if (item.id === "sunglass") {
      fillRoundRect(ctx, 36, 94, 74, 48, 12, "#0f172a", outline, 8);
      fillRoundRect(ctx, 130, 94, 74, 48, 12, "#0f172a", outline, 8);
      fillRoundRect(ctx, 48, 104, 24, 8, 4, "#38bdf8");
      fillRoundRect(ctx, 142, 104, 24, 8, 4, "#38bdf8");
    } else {
      fillRoundRect(ctx, 52, 62, 136, 116, 56, "#fff7ed", outline, 8);
      fillRoundRect(ctx, 82, 104, 24, 26, 10, "#312e81");
      fillRoundRect(ctx, 134, 104, 24, 26, 10, "#312e81");
    }
  } else if (category === "hat") {
    if (item.id === "crown") {
      fillRoundRect(ctx, 48, 76, 144, 88, 16, "#facc15", outline, 8);
      fillRoundRect(ctx, 104, 102, 32, 32, 10, "#ef4444", outline, 6);
    } else if (item.id === "beret" || item.id === "beanie") {
      fillRoundRect(ctx, 48, 78, 144, 84, 40, item.color || "#be123c", outline, 8);
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
      ctx.arc(120, 130, 56, Math.PI, 0);
      ctx.stroke();
      fillRoundRect(ctx, 44, 110, 32, 56, 14, hc, outline, 7);
      fillRoundRect(ctx, 164, 110, 32, 56, 14, hc, outline, 7);
    }
  } else if (category === "outfit") {
    fillRoundRect(ctx, 56, 66, 128, 110, 28, item.main || "#4f46e5", outline, 8);
    fillRoundRect(ctx, 88, 76, 64, 62, 16, item.sub || "#ffffff", outline, 6);
  } else if (category === "bg") {
    const c = item.colors || ["#38bdf8", "#bae6fd", "#4ade80", "#16a34a"];
    fillRoundRect(ctx, 32, 42, 176, 156, 24, c[0], outline, 8);
    fillRoundRect(ctx, 36, 132, 168, 62, 18, c[2], outline, 6);
  } else {
    fillRoundRect(ctx, 32, 68, 176, 104, 22, "#fef08a", "#b45309", 8);
    ctx.fillStyle = "#b45309";
    ctx.font = "900 38px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(item.id === "gender_ticket" ? "⚧️ 1000" : "🎫 500", 120, 134);
  }

  ctx.restore();
}
