// ============================================================================
// [음악왕 V3.0] 놀러가기 허브 · 오락실(환전소 NPC · 8종 오락기 · 주간 랭킹) 모듈
// ============================================================================

const ARCADE_GAMES_META = [
  {
    game_id: "star_dodge",
    title: "별피하기",
    subtitle: "우주 유성 피하기",
    marqueeBg: "#312e81",
    cabinetCol: "#6366f1",
    coin_cost: 1,
    cut_c: 1200,
    cut_a: 3200,
    cut_s: 6000,
    enabled: true
  },
  {
    game_id: "side_sort",
    title: "니꺼내꺼",
    subtitle: "태양·구름·별·달",
    marqueeBg: "#0284c7",
    cabinetCol: "#0ea5e9",
    coin_cost: 1,
    cut_c: 2000,
    cut_a: 4800,
    cut_s: 8800,
    enabled: true
  },
  {
    game_id: "animal_match",
    title: "짝맞추기",
    subtitle: "귀여운 동물 카드",
    marqueeBg: "#059669",
    cabinetCol: "#10b981",
    coin_cost: 1,
    cut_c: 1600,
    cut_a: 4000,
    cut_s: 7200,
    enabled: true
  },
  {
    game_id: "melody_memory",
    title: "기억하기",
    subtitle: "9패드 멜로디 순서",
    marqueeBg: "#9333ea",
    cabinetCol: "#a855f7",
    coin_cost: 1,
    cut_c: 1600,
    cut_a: 3600,
    cut_s: 6400,
    enabled: true
  },
  {
    game_id: "jump_runner",
    title: "점프점프",
    subtitle: "마리오풍 2단 점프",
    marqueeBg: "#dc2626",
    cabinetCol: "#ef4444",
    coin_cost: 1,
    cut_c: 1600,
    cut_a: 4000,
    cut_s: 8000,
    enabled: true
  },
  {
    game_id: "color_sort",
    title: "정리고수",
    subtitle: "세로줄 블록 정리",
    marqueeBg: "#047857",
    cabinetCol: "#10b981",
    coin_cost: 1,
    cut_c: 1600,
    cut_a: 4000,
    cut_s: 7600,
    enabled: true
  },
  {
    game_id: "brick_breaker",
    title: "뿌셔뿌셔",
    subtitle: "알록달록 벽돌깨기",
    marqueeBg: "#db2777",
    cabinetCol: "#ec4899",
    coin_cost: 1,
    cut_c: 2000,
    cut_a: 4800,
    cut_s: 9600,
    enabled: true
  },
  {
    game_id: "note_pang",
    title: "음표팡팡",
    subtitle: "3매치 음표 퍼즐",
    marqueeBg: "#0f766e",
    cabinetCol: "#14b8a6",
    coin_cost: 1,
    cut_c: 1800,
    cut_a: 4200,
    cut_s: 8000,
    enabled: true
  }
];

const ARCADE_GAME_GUIDES = {
  star_dodge: "• 화면이나 아래 슬라이드 패드를 좌우로 밀어 우주 유성을 피하세요!\n• 노랑 별보석(+55점)과 🛡️ 실드(1회 방어)를 먹으며 버티세요! (실드 없을 시 1회 충돌 종료)",
  side_sort: "• 위 표지판을 보고 가운데 천체를 왼쪽(내꺼)·오른쪽(니꺼)으로 빠르게 분류!\n• 틀리면 ⏱️ -3초! 20연속 맞히면 🔥FEVER (최대 20개 · 맞힐 때마다 +0.5초)!",
  animal_match: "• 잠깐 열렸다 닫히는 동물 카드를 외우고 같은 짝을 맞추세요!\n• 연속 매치 콤보 보너스 & 스테이지 클리어 시 +5초 연장!",
  melody_memory: "• 9개 패드가 빛나며 들려주는 색깔과 멜로디 순서를 외우세요!\n• 순서대로 터치해 라운드를 이어가세요! (기회 ❤️ 3개)",
  jump_runner: "• 터치/스페이스바로 1단·2단 점프! 3단 토관 위는 밟고 설 수 있습니다!\n• 몬스터는 위에서 밟으면 +75점! 한 번이라도 부딪히면 즉시 튕겨나며 종료!",
  color_sort: "• 세로 줄을 눌러 맨 아래 같은 색 블록 묶음을 다른 줄로 옮겨 3개 이상 맞추세요!\n• 🎵 타이머 게이지(또는 버튼)를 누르면 다음 줄이 즉시 나와 빠른 콤보 가능!",
  brick_breaker: "• 화면이나 아래 슬라이드 패드로 공을 튕겨 벽돌을 부수세요! (스테이지마다 공 가속!)\n• 공을 모두 놓치면 즉시 종료! 떨어지는 ×3 · 넓음 · 방어 아이템을 노리세요!",
  note_pang: "• 인접한 두 음표를 스와이프하거나 두 번 눌러 3개 이상 맞추세요!\n• 터질 때마다 +0.5초 (연속 터짐 = 연쇄×0.5초 추가!) · 4개=⚡번개 · 5개/십자=👑무지개!"
};

const ARCADE_LOADING_DURATION_MS = 1800;
const ARCADE_EXIT_DURATION_MS = 1400;

const arcadeState = {
  games: ARCADE_GAMES_META.map(g => ({ ...g })),
  myScoresMap: new Map(),
  currentWeekKey: "",
  npcMood: "idle",
  npcTimer: null,
  activeSessionId: null,
  activeGameId: null,
  activeStartedAt: 0,
  activeInstance: null,
  isStarting: false,
  isSubmitting: false,
  isTransitioning: false,
  loadingAnimId: null,
  exchangeQty: 1,
  exchangeSubmitting: false,
  lastHudSig: "",
  rankGameId: "star_dodge",
  rankMode: "weekly",
  weeklyRewardChecked: false,
  pendingWeeklyRewardNotice: null
};

function getArcadeGameMeta(gameId) {
  return arcadeState.games.find(g => g.game_id === gameId) || ARCADE_GAMES_META.find(g => g.game_id === gameId);
}

window.syncArcadeBalancesUI = function () {
  const cd = typeof userState !== "undefined" ? Math.max(0, Number(userState.cdCoins) || 0) : 0;
  const coins = typeof userState !== "undefined" ? Math.max(0, Number(userState.arcadeCoins) || 0) : 0;
  const golden = typeof userState !== "undefined" ? Math.max(0, Number(userState.goldenCoins) || 0) : 0;

  const setTxt = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  setTxt("outingArcadeCoins", coins.toLocaleString());
  setTxt("outingGoldenCoins", golden.toLocaleString());
  setTxt("arcadeCdBalance", cd.toLocaleString());
  setTxt("arcadeCoinsBalance", coins.toLocaleString());
  setTxt("arcadeGoldenBalance", golden.toLocaleString());
  setTxt("shopGoldenBalance", golden.toLocaleString());
};

// ============================================================================
// 1. 놀러가기 허브 화면
// ============================================================================
window.openOutingHubScreen = function () {
  if (typeof cleanupArcadeRuntime === "function") cleanupArcadeRuntime();
  syncArcadeBalancesUI();
  switchScreen("outingHubScreen");
};

// ============================================================================
// 2. 비니 + 수염 아저씨 NPC 환전소 & 오락기 캔버스 아트 (본게임 톤앤매너 100% 통일)
// ============================================================================
function drawArcadeNpcAjusshi(canvas, mood = "idle") {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const outline = "#1e1b18";

  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // 배경 부스 벽면 + 네온 간판 기둥
  const wallG = ctx.createLinearGradient(0, 0, 0, H);
  wallG.addColorStop(0, "#1e1b4b");
  wallG.addColorStop(1, "#312e81");
  ctx.fillStyle = wallG;
  ctx.fillRect(0, 0, W, H);

  // 천장 줄무늬 어닝 (차양)
  const stripes = ["#ef4444", "#fef08a", "#ef4444", "#fef08a", "#ef4444", "#fef08a"];
  const sw = W / stripes.length;
  stripes.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.rect(i * sw, 0, sw, 36);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(i * sw + sw / 2, 36, sw / 2, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
  });

  // 환전소 아저씨 본체 (중앙 480좌표축 스타일 축소)
  ctx.save();
  const bounceY = mood === "happy" ? -8 : 0;
  ctx.translate(W / 2, H * 0.56 + bounceY);
  const s = Math.min(W, H) / 230;
  ctx.scale(s, s);

  // 어두운 앞치마/조끼 몸통 (본게임 만두 체형)
  _arcFillRoundRect(ctx, -46, 22, 92, 68, 22, "#2563eb", outline, 6);
  _arcFillRoundRect(ctx, -34, 30, 68, 60, 14, "#1e293b", outline, 4.5);
  // 반팔 & 두 팔
  ctx.fillStyle = "#fffdf9";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(-56, 46, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(56, 44 + (mood === "happy" ? -16 : 0), 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // 손 위 황금 동전 번쩍!
  ctx.fillStyle = "#facc15";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(56, 20 + (mood === "happy" ? -16 : 0), 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#b45309";
  ctx.font = "900 13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★", 56, 21 + (mood === "happy" ? -16 : 0));

  // 귀 + 둥근 얼굴 (#fffdf9 + #1e1b18)
  ctx.fillStyle = "#fffdf9";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(-62, -28, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(62, -28, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fda4af";
  ctx.beginPath(); ctx.arc(-62, -28, 8, 0, Math.PI * 2); ctx.arc(62, -28, 8, 0, Math.PI * 2); ctx.fill();

  _arcFillRoundRect(ctx, -60, -78, 120, 96, 44, "#fffdf9", outline, 6.5);

  // 아저씨 니트 비니 모자! (#475569 / #334155 골지 짜임)
  ctx.fillStyle = "#475569";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(0, -68, 56, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 3;
  [-28, -14, 0, 14, 28].forEach(bx => {
    ctx.beginPath(); ctx.moveTo(bx, -116); ctx.lineTo(bx, -72); ctx.stroke();
  });
  _arcFillRoundRect(ctx, -62, -78, 124, 20, 9, "#334155", outline, 5.5);

  // 다정한 굵은 눈썹 + 눈 + 볼터치
  ctx.strokeStyle = outline;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-36, -42); ctx.lineTo(-16, -44); ctx.moveTo(16, -44); ctx.lineTo(36, -42); ctx.stroke();

  if (mood === "happy") {
    ctx.beginPath(); ctx.arc(-26, -24, 9, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(26, -24, 9, Math.PI, 0); ctx.stroke();
  } else {
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(-26, -24, 6.5, 0, Math.PI * 2); ctx.arc(26, -24, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(-28, -26, 2.2, 0, Math.PI * 2); ctx.arc(24, -26, 2.2, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = "#fda4af";
  ctx.beginPath(); ctx.ellipse(-38, -12, 10, 5.5, 0, 0, Math.PI * 2); ctx.ellipse(38, -12, 10, 5.5, 0, 0, Math.PI * 2); ctx.fill();

  // 아저씨 콧수염 + 턱수염 (#27272a 시그니처)
  ctx.fillStyle = "#27272a";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3.5;
  // 구레나룻 턱수염
  ctx.beginPath();
  ctx.moveTo(-44, -8);
  ctx.quadraticCurveTo(0, 32, 44, -8);
  ctx.quadraticCurveTo(34, 22, 0, 24);
  ctx.quadraticCurveTo(-34, 22, -44, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 두툼한 팔자 콧수염
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.quadraticCurveTo(-24, -18, -32, 0);
  ctx.quadraticCurveTo(-14, 4, 0, -2);
  ctx.quadraticCurveTo(14, 4, 32, 0);
  ctx.quadraticCurveTo(24, -18, 0, -10);
  ctx.fill();
  ctx.stroke();
  // 씩 웃는 입
  ctx.fillStyle = "#fb7185";
  ctx.beginPath(); ctx.arc(0, 4, 8, 0, Math.PI); ctx.fill();

  ctx.restore();

  // 앞쪽 카운터 데스크 + 쌓인 동전
  _arcFillRoundRect(ctx, 8, H - 46, W - 16, 40, 10, "#d97706", outline, 4.5);
  _arcFillRoundRect(ctx, 4, H - 52, W - 8, 14, 7, "#fbbf24", outline, 4);
  // 동전 더미
  [0, 1, 2, 3].forEach(i => {
    _arcFillRoundRect(ctx, 24, H - 60 - i * 6, 26, 7, 3, "#fde047", outline, 2.5);
    _arcFillRoundRect(ctx, W - 52, H - 60 - i * 6, 26, 7, 3, "#fde047", outline, 2.5);
  });
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3.5;
  ctx.font = "900 13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeText("500 CD = 🎟️ 1동전", W / 2, H - 24);
  ctx.fillText("500 CD = 🎟️ 1동전", W / 2, H - 24);

  ctx.restore();
}

// 오락기 1대당 미니 CRT 일러스트 그리기 (오락기 상단 이름 간판 + 화면 테마)
function drawArcadeCabinetScreenArt(canvas, gameId) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  if (gameId === "star_dodge") {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);
    [[26, 20], [82, 30], [140, 22], [54, 74]].forEach(([x, y]) => {
      drawCelestialAsset(ctx, "star", x, y, 11);
    });
    _arcFillRoundRect(ctx, W / 2 - 14, H - 30, 28, 18, 6, "#38bdf8", "#1e1b18", 2.5);
  } else if (gameId === "side_sort") {
    ctx.fillStyle = "#dbeafe"; ctx.fillRect(0, 0, W / 2, H);
    ctx.fillStyle = "#ffedd5"; ctx.fillRect(W / 2, 0, W / 2, H);
    drawCelestialAsset(ctx, "sun", 42, 32, 16);
    drawCelestialAsset(ctx, "cloud", 42, 76, 16);
    drawCelestialAsset(ctx, "star", W - 42, 32, 16);
    drawCelestialAsset(ctx, "moon", W - 42, 76, 16);
  } else if (gameId === "animal_match") {
    ctx.fillStyle = "#ecfdf5"; ctx.fillRect(0, 0, W, H);
    drawAnimalChibi(ctx, "cat", 48, 56, 26);
    drawAnimalChibi(ctx, "rabbit", W - 48, 56, 26);
  } else if (gameId === "melody_memory") {
    ctx.fillStyle = "#1e1b4b"; ctx.fillRect(0, 0, W, H);
    const cols = ["#ef4444", "#f97316", "#facc15", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
    for (let i = 0; i < 9; i++) {
      const r = Math.floor(i / 3);
      const c = i % 3;
      _arcFillRoundRect(ctx, 28 + c * 42, 12 + r * 30, 36, 24, 6, cols[i], "#1e1b18", 2.5);
    }
  } else if (gameId === "jump_runner") {
    ctx.fillStyle = "#38bdf8"; ctx.fillRect(0, 0, W, H - 22);
    ctx.fillStyle = "#22c55e"; ctx.fillRect(0, H - 22, W, 22);
    drawCelestialAsset(ctx, "cloud", 46, 28, 16);
    _arcFillRoundRect(ctx, W - 52, H - 56, 26, 34, 4, "#16a34a", "#1e1b18", 2.5);
    _arcFillRoundRect(ctx, 44, H - 54, 24, 24, 12, "#fffdf9", "#1e1b18", 2.5);
  } else if (gameId === "color_sort") {
    ctx.fillStyle = "#a7f3d0"; ctx.fillRect(0, 0, W, 24);
    ctx.fillStyle = "#10b981"; ctx.fillRect(0, 20, W, 8);
    ctx.fillStyle = "#064e3b"; ctx.fillRect(0, 28, W, H - 28);
    const stacks = [
      ["#facc15", "#ef4444", "#3b82f6"],
      ["#3b82f6", "#facc15", "#3b82f6", "#ef4444"],
      ["#ef4444", "#4ade80", "#facc15"]
    ];
    stacks.forEach((colArr, ci) => {
      colArr.forEach((bCol, ri) => {
        _arcFillRoundRect(ctx, 18 + ci * 46, 33 + ri * 17, 40, 14, 4, bCol, "#1e1b18", 2);
      });
    });
  } else if (gameId === "note_pang") {
    ctx.fillStyle = "#ccfbf1"; ctx.fillRect(0, 0, W, H);
    const gems = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#38bdf8", "#a855f7"];
    const syms = ["♪", "★", "♫", "♣", "♬", "♥"];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const idx = r === 1 ? 0 : (r * 4 + c) % gems.length;
        const bx = 22 + c * 33;
        const by = 12 + r * 28;
        _arcFillRoundRect(ctx, bx, by, 28, 24, 6, gems[idx], "#1e1b18", 2.2);
        ctx.fillStyle = idx === 2 ? "#1e1b18" : "#ffffff";
        ctx.font = "900 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(syms[idx], bx + 14, by + 13);
      }
    }
  } else {
    // brick_breaker
    ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, H);
    const bCols = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#38bdf8", "#ec4899"];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        _arcFillRoundRect(ctx, 18 + c * 36, 12 + r * 16, 32, 12, 3, bCols[(r + c) % bCols.length], "#1e1b18", 2);
      }
    }
    ctx.fillStyle = "#fde047"; ctx.beginPath(); ctx.arc(W / 2, 74, 7, 0, Math.PI * 2); ctx.fill();
    _arcFillRoundRect(ctx, W / 2 - 28, H - 18, 56, 9, 4, "#38bdf8", "#1e1b18", 2);
  }
  ctx.restore();
}

function setArcadeNpcBubble(text, mood = "idle") {
  const el = document.getElementById("arcadeNpcBubble");
  if (el) el.textContent = text;
  arcadeState.npcMood = mood;
  const npcCv = document.getElementById("arcadeNpcCanvas");
  if (npcCv) drawArcadeNpcAjusshi(npcCv, mood);
  if (arcadeState.npcTimer) clearTimeout(arcadeState.npcTimer);
  if (mood !== "idle") {
    arcadeState.npcTimer = setTimeout(() => {
      arcadeState.npcMood = "idle";
      const cv = document.getElementById("arcadeNpcCanvas");
      if (cv) drawArcadeNpcAjusshi(cv, "idle");
    }, 1800);
  }
}

// ============================================================================
// 3. 황금오락실 골목길 입·퇴장 로딩 & 에셋·서버 사전 세팅
// ============================================================================
function showArcadeLoadingOverlay(labelText, durationMs = ARCADE_LOADING_DURATION_MS) {
  const overlay = document.getElementById("arcadeLoadingOverlay");
  const titleEl = document.getElementById("arcadeLoadingTitle");
  const subEl = document.getElementById("arcadeLoadingSub");
  const barEl = document.getElementById("arcadeLoadingBarFill");
  const sceneCv = document.getElementById("arcadeLoadingCanvas");
  if (!overlay) return;

  const isExit = String(labelText || "").includes("나오는");
  if (titleEl) titleEl.textContent = labelText;
  if (subEl) {
    subEl.textContent = isExit
      ? "골목길을 걸어 놀러가기 광장으로 돌아가는 중.."
      : "미니게임 에셋·사운드·오락기 정보를 불러오는 중..";
  }

  if (arcadeState.loadingAnimId) {
    cancelAnimationFrame(arcadeState.loadingAnimId);
    arcadeState.loadingAnimId = null;
  }

  if (sceneCv) {
    const ctx = sceneCv.getContext("2d");
    const W = sceneCv.width || 400;
    const H = sceneCv.height || 220;
    const playerOff =
      typeof ArcadeAssetCache !== "undefined"
        ? ArcadeAssetCache.bakePlayer(128, false)
        : typeof createBakedMiniPlayerCanvas === "function"
        ? createBakedMiniPlayerCanvas(128)
        : null;

    const startMs = performance.now();
    const outline = "#1e1b18";
    const rrect = (x, y, w, h, r, fill, stroke = outline, lw = 2.8) => {
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
      else ctx.rect(x, y, w, h);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
    };

    const drawAlleyFrame = now => {
      if (overlay.classList.contains("hidden")) {
        arcadeState.loadingAnimId = null;
        return;
      }
      const t = (now - startMs) / 1000;
      ctx.clearRect(0, 0, W, H);

      // 1) 노을진 따뜻한 저녁 골목길 하늘
      const skyG = ctx.createLinearGradient(0, 0, 0, 128);
      skyG.addColorStop(0, isExit ? "#0284c7" : "#312e81");
      skyG.addColorStop(0.6, isExit ? "#bae6fd" : "#f43f5e");
      skyG.addColorStop(1, "#fde68a");
      ctx.fillStyle = skyG;
      ctx.fillRect(0, 0, W, H);

      // 2) 골목 뒤 붉은 벽돌 담장 + 상가 어닝 + 네온 간판 (오른쪽 -> 왼쪽 흐르기)
      const wallY = 46;
      const wallH = 114;
      ctx.fillStyle = "#991b1b";
      ctx.fillRect(0, wallY, W, wallH);

      const brickScroll = (t * 145) % 44;
      ctx.strokeStyle = "rgba(30, 27, 24, 0.35)";
      ctx.lineWidth = 2;
      for (let by = wallY; by < wallY + wallH; by += 18) {
        const stagger = Math.floor((by - wallY) / 18) % 2 === 0 ? 0 : 22;
        for (let bx = -brickScroll - stagger; bx < W + 44; bx += 44) {
          ctx.strokeRect(bx, by, 44, 18);
        }
      }
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, wallY); ctx.lineTo(W, wallY); ctx.stroke();

      // 전봇대 · 골목 가로등 · 상점 어닝 · 황금오락실 간판 스크롤
      for (let i = 0; i < 3; i++) {
        const ax = ((W + 140) - ((t * 145 + i * 195) % (W + 200))) - 30;
        if (i === 0) {
          // 골목 전봇대 + 가로등
          rrect(ax - 5, 16, 10, 144, 3, "#475569", outline, 2.5);
          rrect(ax - 12, 34, 24, 10, 4, "#fde047", outline, 2.2);
          ctx.fillStyle = "rgba(253, 224, 71, 0.25)";
          ctx.beginPath(); ctx.arc(ax, 54, 28, 0, Math.PI * 2); ctx.fill();
        } else if (i === 1) {
          // 줄무늬 레트로 문방구/상점 어닝 + 간판
          rrect(ax - 44, 62, 88, 98, 4, "#fef3c7", outline, 2.5);
          for (let s = 0; s < 4; s++) {
            rrect(ax - 46 + s * 23, 56, 23, 18, 4, s % 2 === 0 ? "#ef4444" : "#ffffff", outline, 2.2);
          }
          rrect(ax - 36, 86, 72, 24, 6, "#1e1b4b", outline, 2.5);
          ctx.fillStyle = "#fde047";
          ctx.font = "900 10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(isExit ? "🏠 우리집➔" : "🕹️황금오락실", ax, 98);
        } else {
          // 음악 포스터 + 고양이/화분 데코
          rrect(ax - 22, 74, 44, 52, 6, "#dbeafe", outline, 2.5);
          ctx.fillStyle = "#2563eb";
          ctx.font = "900 18px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("♪", ax, 100);
          rrect(ax - 14, 138, 28, 22, 4, "#d97706", outline, 2.2);
        }
      }

      // 3) 골목 보도블록 바닥 (오른쪽 -> 왼쪽 흐르기)
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(0, 160, W, H - 160);
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(0, 160); ctx.lineTo(W, 160); ctx.stroke();

      const tileScroll = (t * 195) % 48;
      ctx.strokeStyle = "rgba(30, 27, 24, 0.25)";
      ctx.lineWidth = 2;
      for (let sx = -tileScroll; sx < W + 48; sx += 48) {
        ctx.beginPath(); ctx.moveTo(sx, 160); ctx.lineTo(sx - 18, H); ctx.stroke();
      }

      // 4) 발밑 먼지 & 경쾌하게 걸어가는 내 캐릭터!
      const walkCycle = t * 11;
      const hop = Math.abs(Math.sin(walkCycle)) * 12;
      const tilt = Math.sin(walkCycle) * 0.08;
      const charX = W / 2 - 10;
      const charBaseY = 178;

      for (let p = 0; p < 2; p++) {
        const age = (t * 2.4 + p * 0.5) % 1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 0.55 * (1 - age));
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(charX - 24 - age * 36, charBaseY - 4 - age * 10, 5 + age * 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // 땅 그림자
      ctx.fillStyle = "rgba(15, 23, 42, 0.25)";
      ctx.beginPath();
      ctx.ellipse(charX, charBaseY + 2, 24 - hop * 0.5, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      if (playerOff) {
        ctx.save();
        ctx.translate(charX, charBaseY - 42 - hop);
        ctx.rotate(tilt);
        ctx.drawImage(playerOff, -42, -44, 84, 84);
        ctx.restore();
      }

      arcadeState.loadingAnimId = requestAnimationFrame(drawAlleyFrame);
    };
    arcadeState.loadingAnimId = requestAnimationFrame(drawAlleyFrame);
  }

  if (barEl) {
    barEl.style.transition = "none";
    barEl.style.width = "0%";
    void barEl.offsetWidth;
    barEl.style.transition = `width ${durationMs}ms linear`;
    barEl.style.width = "100%";
  }
  overlay.classList.remove("hidden");
}

function hideArcadeLoadingOverlay() {
  if (arcadeState.loadingAnimId) {
    cancelAnimationFrame(arcadeState.loadingAnimId);
    arcadeState.loadingAnimId = null;
  }
  const overlay = document.getElementById("arcadeLoadingOverlay");
  if (overlay) overlay.classList.add("hidden");
}

// ============================================================================
// 4. 황금오락실 로비 진입 · 퇴장 · 서버 동기화 · 8종 대칭 오락기
// ============================================================================
window.claimMyArcadeWeeklyRewardsSilent = async function (showPopup = false) {
  if (!sbClient || typeof userState === "undefined" || !userState.isLoggedIn) return null;
  if (arcadeState.weeklyRewardChecked && !showPopup) return null;
  if (!arcadeState.weeklyRewardChecked) {
    arcadeState.weeklyRewardChecked = true;
    try {
      const { data, error } = await sbClient.rpc("claim_my_arcade_weekly_rewards");
      if (!error && data) {
        if (typeof data.golden_coins === "number") {
          userState.goldenCoins = Math.max(0, data.golden_coins);
          syncArcadeBalancesUI();
        }
        const claimed = Array.isArray(data.claimed) ? data.claimed : [];
        const total = Number(data.total_golden) || 0;
        if (claimed.length > 0 && total > 0) {
          arcadeState.pendingWeeklyRewardNotice = { claimed, total };
        }
      }
    } catch (e) {}
  }

  if (showPopup && arcadeState.pendingWeeklyRewardNotice && typeof gameAlert === "function") {
    const { claimed, total } = arcadeState.pendingWeeklyRewardNotice;
    arcadeState.pendingWeeklyRewardNotice = null;
    const lines = claimed.map(c => `• [${c.title}] ${c.rank}위 (+🪙${c.reward_golden})`).join("\n");
    gameAlert(
      `지난주 황금오락실 주간 랭킹 보상이 지급되었습니다!\n\n${lines}\n\n총 획득: 🪙 +${total} 황금주화!`,
      "🏆 주간 황금오락실 랭킹 정산"
    );
  }
  return null;
};

async function syncArcadeLobbyFromServer() {
  if (!sbClient || typeof userState === "undefined" || !userState.isLoggedIn) return;
  try {
    const [gamesRes, weekRes, , profRes] = await Promise.all([
      sbClient.from("v3_arcade_games").select("*").order("sort_order", { ascending: true }),
      sbClient.rpc("get_kst_week_key"),
      claimMyArcadeWeeklyRewardsSilent(false),
      sbClient.from("profiles").select("cd_coins, arcade_coins, golden_coins").eq("id", userState.id).maybeSingle()
    ]);

    if (profRes && profRes.data) {
      userState.cdCoins = Number(profRes.data.cd_coins ?? userState.cdCoins);
      userState.arcadeCoins = Number(profRes.data.arcade_coins ?? userState.arcadeCoins);
      userState.goldenCoins = Number(profRes.data.golden_coins ?? userState.goldenCoins);
    }

    if (gamesRes && Array.isArray(gamesRes.data) && gamesRes.data.length > 0) {
      const dbMap = new Map(gamesRes.data.map(g => [g.game_id, g]));
      arcadeState.games = ARCADE_GAMES_META.map(localMeta => {
        const db = dbMap.get(localMeta.game_id);
        return db ? { ...localMeta, ...db } : { ...localMeta };
      });
    }

    if (weekRes && typeof weekRes.data === "string" && weekRes.data) {
      arcadeState.currentWeekKey = weekRes.data;
      const { data: myScores } = await sbClient
        .from("arcade_scores")
        .select("game_id, weekly_score, best_score")
        .eq("user_id", userState.id)
        .eq("week_key", arcadeState.currentWeekKey);
      arcadeState.myScoresMap.clear();
      if (Array.isArray(myScores)) {
        myScores.forEach(row => arcadeState.myScoresMap.set(row.game_id, row));
      }
    }

    syncArcadeBalancesUI();
    renderArcadeCabinetsGrid();
  } catch (e) {}
}

window.openArcadeScreen = async function (opts = {}) {
  const skipLoading = Boolean(opts && opts.skipLoading);
  if (arcadeState.isTransitioning && !skipLoading) return;

  cleanupArcadeRuntime();

  if (skipLoading) {
    if (typeof ArcadeAssetCache !== "undefined") ArcadeAssetCache.warmup();
    switchScreen("arcadeScreen");
    syncArcadeBalancesUI();
    renderArcadeCabinetsGrid();
    setArcadeNpcBubble("어서오쇼~ 500 CD = 동전 1개!", "idle");
    await syncArcadeLobbyFromServer();
    await claimMyArcadeWeeklyRewardsSilent(true);
    return;
  }

  arcadeState.isTransitioning = true;
  showArcadeLoadingOverlay("🕹️ 황금오락실 가는중..", ARCADE_LOADING_DURATION_MS);

  const minWait = new Promise(resolve => setTimeout(resolve, ARCADE_LOADING_DURATION_MS));
  // 로딩 화면 동안 미니게임 전체 에셋 사전 베이킹 + 로비 렌더링 + 서버 데이터 병렬 로드!
  const preloadWork = (async () => {
    try {
      if (typeof ArcadeAssetCache !== "undefined") ArcadeAssetCache.warmup();
    } catch (e) {}
    switchScreen("arcadeScreen");
    syncArcadeBalancesUI();
    renderArcadeCabinetsGrid();
    setArcadeNpcBubble("어서오쇼~ 500 CD = 동전 1개!", "idle");
    await syncArcadeLobbyFromServer();
  })();

  await Promise.all([minWait, preloadWork]);
  hideArcadeLoadingOverlay();
  arcadeState.isTransitioning = false;
  await claimMyArcadeWeeklyRewardsSilent(true);
};

window.exitArcadeScreenWithLoading = function () {
  if (arcadeState.isTransitioning) return;
  arcadeState.isTransitioning = true;
  cleanupArcadeRuntime();
  showArcadeLoadingOverlay("🏠 황금오락실 나오는중..", ARCADE_EXIT_DURATION_MS);

  setTimeout(() => {
    hideArcadeLoadingOverlay();
    arcadeState.isTransitioning = false;
    openOutingHubScreen();
  }, ARCADE_EXIT_DURATION_MS);
};

function renderArcadeCabinetsGrid() {
  const grid = document.getElementById("arcadeCabinetsGrid");
  if (!grid) return;

  const cardsHtml = arcadeState.games
    .map(g => {
      const myRec = arcadeState.myScoresMap.get(g.game_id);
      const weeklyBest = myRec ? Number(myRec.weekly_score) || 0 : 0;
      const isOff = g.enabled === false;
      return `
      <button type="button" class="arcade-cabinet-card ${isOff ? "is-disabled" : ""}" onclick="playArcadeCabinet('${g.game_id}')" style="--cab-col:${g.cabinetCol || "#6366f1"}; --marq-bg:${g.marqueeBg || "#1e1b4b"};">
        <div class="arcade-cabinet-marquee">${g.title}</div>
        <div class="arcade-cabinet-bezel">
          <canvas id="cabArt_${g.game_id}" class="arcade-cabinet-crt" width="168" height="104"></canvas>
          ${isOff ? `<div class="arcade-cabinet-maint">🚧 공사중</div>` : ""}
        </div>
        <div class="arcade-cabinet-deck">
          <span class="arcade-joy-stick">🕹️</span>
          <span class="arcade-deck-sub">${g.subtitle || ""}</span>
          <span class="arcade-deck-btns">🔴🔵</span>
        </div>
        <div class="arcade-cabinet-footer">
          <span class="arcade-cab-best">${weeklyBest > 0 ? `내 최고 ${weeklyBest.toLocaleString()}점` : `S컷 ${Number(g.cut_s).toLocaleString()}점`}</span>
          <span class="arcade-cab-cost">${isOff ? "점검중" : `🎟️ ${g.coin_cost || 1}`}</span>
        </div>
      </button>
    `;
    })
    .join("");

  grid.innerHTML = cardsHtml;

  arcadeState.games.forEach(g => {
    const cv = document.getElementById(`cabArt_${g.game_id}`);
    if (cv) drawArcadeCabinetScreenArt(cv, g.game_id);
  });
}

// ============================================================================
// 5. 환전소 아저씨 블러 팝업 & 동전 교환: 500 CD = 오락실 동전 1개
// ============================================================================
function syncArcadeExchangeModalUI(doneMode = false) {
  const qty = Math.max(1, Math.min(50, Math.floor(Number(arcadeState.exchangeQty) || 1)));
  arcadeState.exchangeQty = qty;
  const needCd = qty * 500;
  const curCd = typeof userState !== "undefined" ? Math.max(0, Number(userState.cdCoins) || 0) : 0;
  const curCoins = typeof userState !== "undefined" ? Math.max(0, Number(userState.arcadeCoins) || 0) : 0;

  const setTxt = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  setTxt("arcadeExCurCd", curCd.toLocaleString());
  setTxt("arcadeExCurCoins", curCoins.toLocaleString());
  setTxt("arcadeExQtyValue", String(qty));
  setTxt("arcadeExNeedCd", needCd.toLocaleString());

  document.querySelectorAll(".arcade-ex-preset-btn").forEach(btn => {
    btn.classList.toggle("is-active", Number(btn.getAttribute("data-ex-qty")) === qty);
  });

  const ctrlArea = document.getElementById("arcadeExControlArea");
  const submitBtn = document.getElementById("arcadeExSubmitBtn");
  const cancelBtn = document.getElementById("arcadeExCancelBtn");
  if (ctrlArea) ctrlArea.classList.toggle("hidden", doneMode);

  if (doneMode) {
    if (cancelBtn) cancelBtn.classList.add("hidden");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "🕹️ 게임하러 가기!";
      submitBtn.onclick = () => closeModal("arcadeExchangeModal");
    }
  } else {
    if (cancelBtn) cancelBtn.classList.remove("hidden");
    if (submitBtn) {
      submitBtn.disabled = arcadeState.exchangeSubmitting;
      submitBtn.textContent = `🎟️ 동전 ${qty}개 환전! (${needCd.toLocaleString()} CD)`;
      submitBtn.onclick = () => confirmArcadeExchangeFromModal();
    }
  }
}

window.openArcadeExchangeModal = function () {
  if (typeof userState === "undefined" || !userState.isLoggedIn) {
    gameAlert("로그인 후 동전 환전소를 이용할 수 있습니다!");
    return;
  }
  arcadeState.exchangeQty = 1;
  arcadeState.exchangeSubmitting = false;
  const npcCv = document.getElementById("arcadeExNpcCanvas");
  if (npcCv) drawArcadeNpcAjusshi(npcCv, "idle");
  const bubble = document.getElementById("arcadeExNpcBubble");
  if (bubble) bubble.textContent = "얼마나 환전할텐가?";
  syncArcadeExchangeModalUI(false);
  openModal("arcadeExchangeModal");
};

window.setArcadeExchangeQty = function (qty) {
  arcadeState.exchangeQty = Math.max(1, Math.min(50, Math.floor(Number(qty) || 1)));
  syncArcadeExchangeModalUI(false);
};

window.stepArcadeExchangeQty = function (delta) {
  const next = (Number(arcadeState.exchangeQty) || 1) + (Number(delta) || 0);
  arcadeState.exchangeQty = Math.max(1, Math.min(50, next));
  syncArcadeExchangeModalUI(false);
};

window.confirmArcadeExchangeFromModal = async function () {
  if (arcadeState.exchangeSubmitting) return;
  const qty = Math.max(1, Math.min(50, Math.floor(Number(arcadeState.exchangeQty) || 1)));
  const needCd = qty * 500;
  const curCd = typeof userState !== "undefined" ? Math.max(0, Number(userState.cdCoins) || 0) : 0;

  if (curCd < needCd) {
    const bubble = document.getElementById("arcadeExNpcBubble");
    if (bubble) bubble.textContent = "어허~ CD가 모자라구만! 수량을 줄여보게나~";
    const npcCv = document.getElementById("arcadeExNpcCanvas");
    if (npcCv) drawArcadeNpcAjusshi(npcCv, "idle");
    gameAlert(
      `💿 CD가 부족합니다!\n(필요: ${needCd.toLocaleString()} CD / 보유: ${curCd.toLocaleString()} CD)\n퀴즈나 낚시로 CD를 모아오세요!`
    );
    return;
  }

  arcadeState.exchangeSubmitting = true;
  syncArcadeExchangeModalUI(false);
  const ok = await window.exchangeArcadeCoin(qty);
  arcadeState.exchangeSubmitting = false;

  if (ok) {
    const npcCv = document.getElementById("arcadeExNpcCanvas");
    if (npcCv) drawArcadeNpcAjusshi(npcCv, "happy");
    const bubble = document.getElementById("arcadeExNpcBubble");
    if (bubble) bubble.textContent = "자 이제 재밌게 게임하고 기록을 세워보게!";
    syncArcadeExchangeModalUI(true);
  } else {
    syncArcadeExchangeModalUI(false);
  }
};

window.exchangeArcadeCoin = async function (qty = 1) {
  const safeQty = Math.max(1, Math.min(50, Math.floor(Number(qty) || 1)));
  if (!sbClient || typeof userState === "undefined" || !userState.isLoggedIn) {
    gameAlert("로그인 후 오락실 동전을 교환할 수 있습니다!");
    return false;
  }
  const needCd = safeQty * 500;
  const curCd = Math.max(0, Number(userState.cdCoins) || 0);
  if (curCd < needCd) {
    setArcadeNpcBubble("어허~ CD가 조금 부족하구만!", "idle");
    gameAlert(
      `💿 CD가 부족합니다!\n(필요: ${needCd.toLocaleString()} CD / 보유: ${curCd.toLocaleString()} CD)\n퀴즈나 낚시로 CD를 모아오세요!`
    );
    return false;
  }

  try {
    if (typeof ArcadeSfx !== "undefined") ArcadeSfx.unlock();
    const { data, error } = await sbClient.rpc("exchange_cd_to_arcade_coin", { p_qty: safeQty });
    if (error) {
      gameAlert(`동전 교환 중 오류가 발생했습니다.\n(${error.message || "서버 오류"})`);
      return false;
    }
    if (data) {
      userState.cdCoins = Number(data.cd_coins ?? curCd - needCd);
      userState.arcadeCoins = Number(data.arcade_coins ?? (userState.arcadeCoins || 0) + safeQty);
    }
    if (typeof updateHeaderUserUI === "function") updateHeaderUserUI();
    syncArcadeBalancesUI();
    if (typeof ArcadeSfx !== "undefined") ArcadeSfx.coin();
    setArcadeNpcBubble(`동전 ${safeQty}개 받으쇼! 자 이제 재밌게 게임하고 기록을 세워보게!`, "happy");
    return true;
  } catch (e) {
    gameAlert("네트워크 오류로 동전 교환에 실패했습니다.");
    return false;
  }
};

// ============================================================================
// 5. 오락실 미니게임 실행 · 종료 · 황금주화 정산 RPC
// ============================================================================
window.cleanupArcadeRuntime = function () {
  if (arcadeState.activeInstance && typeof arcadeState.activeInstance.destroy === "function") {
    try { arcadeState.activeInstance.destroy(); } catch (e) {}
  }
  arcadeState.activeInstance = null;
  arcadeState.activeSessionId = null;
  arcadeState.activeGameId = null;
  arcadeState.isStarting = false;
  arcadeState.isSubmitting = false;
  arcadeState.lastHudSig = "";
};

window.resetArcadeAccountState = function () {
  cleanupArcadeRuntime();
  arcadeState.myScoresMap.clear();
  arcadeState.currentWeekKey = "";
  arcadeState.weeklyRewardChecked = false;
  arcadeState.pendingWeeklyRewardNotice = null;
};

window.playArcadeCabinet = async function (gameId, opts = {}) {
  if (arcadeState.isStarting || arcadeState.isSubmitting || arcadeState.isTransitioning) return;
  if (!sbClient || typeof userState === "undefined" || !userState.isLoggedIn) {
    gameAlert("로그인이 필요한 기능입니다!");
    return;
  }
  const meta = getArcadeGameMeta(gameId);
  if (!meta) return;
  if (meta.enabled === false) {
    gameAlert(`[${meta.title}] 오락기는 현재 점검(공사중)입니다!\n다른 오락기를 먼저 즐겨주세요.`, "🚧 공사중");
    return;
  }

  if (typeof ArcadeSfx !== "undefined") ArcadeSfx.unlock();
  const cost = Number(meta.coin_cost) || 1;
  const curCoins = Math.max(0, Number(userState.arcadeCoins) || 0);

  if (curCoins < cost) {
    const curCd = Math.max(0, Number(userState.cdCoins) || 0);
    const scroller = document.querySelector("#arcadeScreen .arcade-lobby-scroll");
    if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });
    const booth = document.querySelector("#arcadeScreen .arcade-npc-booth");
    if (booth) {
      booth.classList.remove("is-attention");
      void booth.offsetWidth;
      booth.classList.add("is-attention");
    }
    setArcadeNpcBubble("어이~ 위쪽 내 환전소에서 먼저 동전 바꿔가쇼! (500 CD = 1동전)", "happy");
    gameAlert(
      `🎟️ 오락실 동전이 부족해요! (보유 동전: ${curCoins}개 · 보유 CD: ${curCd.toLocaleString()} CD)\n\n위쪽 [🎩 아저씨 동전 환전소]에서 CD를 동전으로 먼저 교환해 주세요!`,
      "🎟️ 동전 환전 필요"
    );
    return;
  }

  // 시작 전 간단 게임 가이드 팝업 (동전 차감 전 안내!)
  if (!opts || !opts.skipGuide) {
    const gTitle = document.getElementById("arcadeGuideTitle");
    const gBody = document.getElementById("arcadeGuideBody");
    const gCuts = document.getElementById("arcadeGuideCuts");
    const gArt = document.getElementById("arcadeGuideArtCanvas");
    const gStartBtn = document.getElementById("arcadeGuideStartBtn");
    if (gTitle) gTitle.textContent = `🕹️ ${meta.title} 게임 가이드`;
    if (gBody) gBody.textContent = ARCADE_GAME_GUIDES[gameId] || `${meta.subtitle || "최고 점수에 도전하세요!"}`;
    if (gCuts) {
      gCuts.textContent = `목표 점수: C ${Number(meta.cut_c).toLocaleString()} · A ${Number(meta.cut_a).toLocaleString()} · S ${Number(meta.cut_s).toLocaleString()}`;
    }
    if (gArt) drawArcadeCabinetScreenArt(gArt, gameId);
    if (gStartBtn) {
      gStartBtn.textContent = `🎟️ 동전 ${cost}개 넣고 시작!`;
      gStartBtn.onclick = () => {
        closeModal("arcadeGuideModal");
        window.playArcadeCabinet(gameId, { skipGuide: true });
      };
    }
    openModal("arcadeGuideModal");
    return;
  }

  arcadeState.isStarting = true;
  try {
    const { data, error } = await sbClient.rpc("start_arcade_game", { p_game_id: gameId });
    if (error || !data || !data.session_id) {
      const msg = String(error?.message || "");
      if (msg.includes("GAME_UNDER_MAINTENANCE")) {
        meta.enabled = false;
        renderArcadeCabinetsGrid();
        gameAlert(`[${meta.title}] 오락기는 현재 점검(공사중)입니다!`, "🚧 공사중");
      } else if (msg.includes("INSUFFICIENT_ARCADE_COINS")) {
        setArcadeNpcBubble("동전이 모자라네~ 여기서 바꿔가쇼!", "happy");
        gameAlert("🎟️ 오락실 동전이 부족합니다!\n위쪽 [🎩 아저씨 동전 환전소]에서 먼저 동전을 교환해 주세요!", "🎟️ 동전 환전 필요");
      } else if (msg.includes("UNKNOWN_GAME")) {
        gameAlert("신규 오락기 서버 DB 반영이 필요합니다!\n관리자 SQL 업데이트 후 바로 플레이할 수 있어요.");
      } else {
        gameAlert(`오락기 시작에 실패했습니다.\n(${msg || "서버 오류"})`);
      }
      arcadeState.isStarting = false;
      return;
    }

    userState.arcadeCoins = Number(data.arcade_coins ?? Math.max(0, curCoins - cost));
    syncArcadeBalancesUI();
    if (typeof ArcadeSfx !== "undefined") ArcadeSfx.coin();

    arcadeState.activeSessionId = data.session_id;
    arcadeState.activeGameId = gameId;
    arcadeState.activeStartedAt = performance.now();
    arcadeState.lastHudSig = "";

    const cutC = Number(data.cut_c ?? meta.cut_c);
    const cutA = Number(data.cut_a ?? meta.cut_a);
    const cutS = Number(data.cut_s ?? meta.cut_s);

    const titleEl = document.getElementById("arcadePlayTitle");
    if (titleEl) titleEl.textContent = `🕹️ ${meta.title}`;

    switchScreen("arcadePlayScreen");
    const mountEl = document.getElementById("arcadePlayStage");
    if (!mountEl) {
      arcadeState.isStarting = false;
      return;
    }

    const factory = typeof ARCADE_MINI_GAME_FACTORIES !== "undefined" ? ARCADE_MINI_GAME_FACTORIES[gameId] : null;
    if (!factory) {
      gameAlert("미니게임 모듈을 불러오지 못했습니다.");
      cleanupArcadeRuntime();
      openArcadeScreen({ skipLoading: true });
      return;
    }

    const updateHud = ({ score = 0, hearts = null, timeSec = null, extra = "" } = {}) => {
      const tierTxt =
        score >= cutS
          ? "👑 S목표 (+10🪙)"
          : score >= cutA
          ? `🔥 A달성! S:${cutS}`
          : score >= cutC
          ? `✨ C달성! A:${cutA}`
          : `🎯 C:${cutC}`;
      const heartStr = hearts !== null ? "❤️".repeat(Math.max(0, hearts)) + "🖤".repeat(Math.max(0, 3 - hearts)) : "";
      const timeStr = timeSec !== null ? `⏱ ${timeSec.toFixed(1)}s` : "";
      const sig = `${score}|${heartStr}|${timeStr}|${tierTxt}|${extra}`;
      if (sig === arcadeState.lastHudSig) return;
      arcadeState.lastHudSig = sig;

      const sEl = document.getElementById("arcadePlayScore");
      const rEl = document.getElementById("arcadePlaySubHud");
      const tEl = document.getElementById("arcadePlayTier");
      if (sEl) sEl.textContent = `${Number(score).toLocaleString()}점`;
      if (tEl) tEl.textContent = tierTxt;
      if (rEl) rEl.textContent = [heartStr, timeStr, extra].filter(Boolean).join(" · ");
    };

    arcadeState.isStarting = false;
    arcadeState.activeInstance = factory(mountEl, {
      onHud: updateHud,
      onFinish: (finalScore, reasonMsg) => {
        finishAndSubmitArcadeGame(finalScore, reasonMsg);
      }
    });
  } catch (err) {
    arcadeState.isStarting = false;
    gameAlert("오락기 연결 중 오류가 발생했습니다.");
  }
};

window.quitArcadeGameConfirm = function () {
  if (arcadeState.isSubmitting) return;
  if (!arcadeState.activeSessionId) {
    openArcadeScreen({ skipLoading: true });
    return;
  }
  const curScore =
    arcadeState.activeInstance && typeof arcadeState.activeInstance.getScore === "function"
      ? arcadeState.activeInstance.getScore()
      : 0;
  gameConfirm(
    `게임을 종료할까요?\n현재 점수(${curScore.toLocaleString()}점)로 황금주화 정산 및 랭킹에 기록됩니다.`,
    () => {
      finishAndSubmitArcadeGame(curScore, "플레이 종료 · 현재 점수로 정산 완료!");
    },
    "🚪 게임 종료"
  );
};

async function finishAndSubmitArcadeGame(rawScore, reasonMsg = "") {
  if (arcadeState.isSubmitting || !arcadeState.activeSessionId) return;
  arcadeState.isSubmitting = true;

  const sessionId = arcadeState.activeSessionId;
  const gameId = arcadeState.activeGameId;
  const meta = getArcadeGameMeta(gameId);
  const elapsedMs = performance.now() - (arcadeState.activeStartedAt || 0);
  const safeScore = Math.max(0, Math.round(Number(rawScore) || 0));

  if (arcadeState.activeInstance && typeof arcadeState.activeInstance.destroy === "function") {
    try { arcadeState.activeInstance.destroy(); } catch (e) {}
  }
  arcadeState.activeInstance = null;
  arcadeState.activeSessionId = null;

  // 서버 최소 1초 경과 검증 안전 대기 (혹시 조기 종료 시 0점 방지)
  if (elapsedMs < 1150) {
    await new Promise(r => setTimeout(r, 1150 - elapsedMs));
  }

  try {
    const { data, error } = await sbClient.rpc("finish_arcade_game", {
      p_session_id: sessionId,
      p_score: safeScore
    });

    arcadeState.isSubmitting = false;
    if (error || !data) {
      gameAlert(`결과 정산 중 오류가 발생했습니다.\n(${error?.message || "서버 오류"})`);
      openArcadeScreen({ skipLoading: true });
      return;
    }

    if (typeof data.golden_coins === "number") {
      userState.goldenCoins = Math.max(0, data.golden_coins);
    }
    arcadeState.myScoresMap.set(gameId, {
      game_id: gameId,
      weekly_score: Number(data.weekly_score) || safeScore,
      best_score: Number(data.best_score) || safeScore
    });
    syncArcadeBalancesUI();
    if (typeof updateHeaderUserUI === "function") updateHeaderUserUI();

    // 결과 모달 표출
    const tier = data.tier || "BASE";
    const tierBadgeMap = {
      S: "👑 S목표 대성공! (+10 🪙)",
      A: "🔥 A목표 달성! (+6 🪙)",
      C: "✨ C목표 달성! (+3 🪙)",
      BASE: "🎮 참가 완료 (+1 🪙)"
    };
    const setTxt = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    setTxt("arcadeResGameTitle", `🕹️ ${meta ? meta.title : gameId}`);
    setTxt("arcadeResTierBadge", tierBadgeMap[tier] || `+${data.gained_golden || 1} 🪙`);
    setTxt("arcadeResScore", `${Number(data.score ?? safeScore).toLocaleString()}점`);
    setTxt("arcadeResGoldenGain", `🪙 +${Number(data.gained_golden || 1)}개 획득! (보유 ${userState.goldenCoins.toLocaleString()}개)`);
    setTxt(
      "arcadeResBestSummary",
      `${reasonMsg ? reasonMsg + "\n" : ""}이번주 최고: ${Number(data.weekly_score || 0).toLocaleString()}점 · 역대 최고: ${Number(data.best_score || 0).toLocaleString()}점`
    );

    const replayBtn = document.getElementById("arcadeResReplayBtn");
    if (replayBtn) {
      replayBtn.onclick = () => {
        closeModal("arcadeResultModal");
        playArcadeCabinet(gameId, { skipGuide: true });
      };
    }
    const rankBtn = document.getElementById("arcadeResRankBtn");
    if (rankBtn) {
      rankBtn.onclick = () => {
        closeModal("arcadeResultModal");
        openArcadeScreen({ skipLoading: true });
        openArcadeRankingModal(gameId);
      };
    }
    const lobbyBtn = document.getElementById("arcadeResLobbyBtn");
    if (lobbyBtn) {
      lobbyBtn.onclick = () => {
        closeModal("arcadeResultModal");
        openArcadeScreen({ skipLoading: true });
      };
    }

    if (typeof ArcadeSfx !== "undefined") {
      if (tier === "S" || tier === "A" || tier === "C") {
        ArcadeSfx.stageClear();
      } else {
        ArcadeSfx.coin();
      }
    }
    openModal("arcadeResultModal");
  } catch (err) {
    arcadeState.isSubmitting = false;
    gameAlert("서버 통신 오류로 정산을 완료하지 못했습니다.");
    openArcadeScreen({ skipLoading: true });
  }
}

// ============================================================================
// 6. 오락실 주간 랭킹 & 보상 안내 모달
// ============================================================================
window.openArcadeRankingModal = async function (gameId = null) {
  arcadeState.rankGameId = gameId || arcadeState.rankGameId || "star_dodge";
  renderArcadeRankTabs();
  openModal("arcadeRankModal");
  await loadArcadeRankingList();
};

window.selectArcadeRankGame = function (gameId) {
  arcadeState.rankGameId = gameId;
  renderArcadeRankTabs();
  loadArcadeRankingList();
};

window.switchArcadeRankMode = function (mode) {
  arcadeState.rankMode = mode === "best" ? "best" : "weekly";
  document.querySelectorAll("[data-arc-rank-mode]").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-arc-rank-mode") === arcadeState.rankMode);
  });
  loadArcadeRankingList();
};

function renderArcadeRankTabs() {
  const row = document.getElementById("arcadeRankGameTabs");
  if (!row) return;
  row.innerHTML = ARCADE_GAMES_META.map(
    g =>
      `<button type="button" class="rank-chip ${arcadeState.rankGameId === g.game_id ? "active" : ""}" onclick="selectArcadeRankGame('${g.game_id}')">${g.title}</button>`
  ).join("");
  document.querySelectorAll("[data-arc-rank-mode]").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-arc-rank-mode") === arcadeState.rankMode);
  });
}

async function loadArcadeRankingList() {
  const listEl = document.getElementById("arcadeRankList");
  const weekBadge = document.getElementById("arcadeRankWeekLabel");
  if (!listEl) return;

  listEl.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-sub); font-weight:800;">랭킹 불러오는 중...</div>`;

  if (!sbClient) {
    listEl.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-sub);">서버 연결이 필요합니다.</div>`;
    return;
  }

  try {
    let wk = arcadeState.currentWeekKey;
    if (!wk) {
      const { data: wData } = await sbClient.rpc("get_kst_week_key");
      if (wData) wk = arcadeState.currentWeekKey = wData;
    }
    if (weekBadge) {
      weekBadge.textContent = arcadeState.rankMode === "weekly" ? `📅 ${wk || "이번 주"} 주간 TOP 30` : "👑 역대 최고기록 TOP 30";
    }

    let query = sbClient
      .from("arcade_scores")
      .select("user_id, nickname, weekly_score, best_score, week_key, updated_at")
      .eq("game_id", arcadeState.rankGameId);

    if (arcadeState.rankMode === "weekly" && wk) {
      query = query.eq("week_key", wk).order("weekly_score", { ascending: false }).order("updated_at", { ascending: true });
    } else {
      query = query.order("best_score", { ascending: false }).order("updated_at", { ascending: true });
    }

    const { data: rows, error } = await query.limit(30);
    if (error || !Array.isArray(rows) || rows.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding:22px; color:var(--text-sub); font-weight:800;">아직 등록된 기록이 없습니다.<br/>첫 1위에 도전해보세요! 🏆</div>`;
      return;
    }

    // 역대 탭에서는 유저당 최고 기록만 1줄로 dedup
    let displayRows = rows;
    if (arcadeState.rankMode === "best") {
      const seen = new Set();
      displayRows = [];
      for (const r of rows) {
        if (seen.has(r.user_id)) continue;
        seen.add(r.user_id);
        displayRows.push(r);
      }
    }

    const medal = ["🥇", "🥈", "🥉"];
    listEl.innerHTML = displayRows
      .map((r, i) => {
        const val = arcadeState.rankMode === "weekly" ? Number(r.weekly_score) || 0 : Number(r.best_score) || 0;
        const isMe = typeof userState !== "undefined" && userState.id && r.user_id === userState.id;
        const safeId = typeof escapeJsSingleArg === "function" ? escapeJsSingleArg(r.user_id || "") : "";
        const safeNick = typeof escapeJsSingleArg === "function" ? escapeJsSingleArg(r.nickname || "") : "";
        const bonusTag = arcadeState.rankMode === "weekly" && i < 3 ? `<span class="badge gold" style="font-size:0.65rem;">+${[30, 20, 10][i]}🪙</span>` : "";
        return `
        <div class="pixel-list-item ${isMe ? "is-me-rank" : ""}" onclick="inspectOtherUser('${safeId}', '${safeNick}')" style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px; min-width:0;">
            <strong style="min-width:26px; font-size:0.9rem;">${i < 3 ? medal[i] : `${i + 1}`}</strong>
            <span style="font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${typeof escapeFishingHtml === "function" ? escapeFishingHtml(r.nickname) : r.nickname}</span>
            ${bonusTag}
          </div>
          <strong style="color:#b45309; white-space:nowrap;">${val.toLocaleString()}점</strong>
        </div>
      `;
      })
      .join("");
  } catch (e) {
    listEl.innerHTML = `<div style="text-align:center; padding:18px; color:var(--danger);">랭킹을 불러오지 못했습니다.</div>`;
  }
}
