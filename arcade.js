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
    subtitle: "엄마의 삼단정리",
    marqueeBg: "#d97706",
    cabinetCol: "#f59e0b",
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
    ctx.fillStyle = "#38bdf8"; ctx.fillRect(0, 0, W, 24);
    ctx.fillStyle = "#22c55e"; ctx.fillRect(0, 20, W, 8);
    ctx.fillStyle = "#451a03"; ctx.fillRect(0, 28, W, H - 28);
    const stacks = [
      ["#facc15", "#ef4444", "#3b82f6"],
      ["#3b82f6", "#facc15", "#3b82f6", "#ef4444"],
      ["#ef4444", "#22c55e", "#facc15"]
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
// 3. 오락실 로비 진입 · 서버 설정/주간보상 동기화 · 오락기 7대 대칭 배치
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
      `지난주 오락실 주간 랭킹 보상이 지급되었습니다!\n\n${lines}\n\n총 획득: 🪙 +${total} 황금주화!`,
      "🏆 주간 오락실 랭킹 정산"
    );
  }
  return null;
};

window.openArcadeScreen = async function () {
  cleanupArcadeRuntime();
  switchScreen("arcadeScreen");
  syncArcadeBalancesUI();
  renderArcadeCabinetsGrid();
  setArcadeNpcBubble("어서오쇼~ 500 CD = 동전 1개!", "idle");

  if (!sbClient || typeof userState === "undefined" || !userState.isLoggedIn) return;

  try {
    const [gamesRes, weekRes, claimRes, profRes] = await Promise.all([
      sbClient.from("v3_arcade_games").select("*").order("sort_order", { ascending: true }),
      sbClient.rpc("get_kst_week_key"),
      claimMyArcadeWeeklyRewardsSilent(true),
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
    if (claimRes && claimRes.total_golden > 0) {
      syncArcadeBalancesUI();
    }
  } catch (e) {}
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
// 4. 환전소 아저씨: 500 CD = 오락실 동전 1개 교환
// ============================================================================
window.exchangeArcadeCoin = async function (qty = 1) {
  const safeQty = Math.max(1, Math.min(50, Math.floor(Number(qty) || 1)));
  if (!sbClient || typeof userState === "undefined" || !userState.isLoggedIn) {
    gameAlert("로그인 후 오락실 동전을 교환할 수 있습니다!");
    return;
  }
  const needCd = safeQty * 500;
  const curCd = Math.max(0, Number(userState.cdCoins) || 0);
  if (curCd < needCd) {
    setArcadeNpcBubble("어허~ CD가 조금 부족하구만!", "idle");
    gameAlert(
      `💿 CD가 부족합니다!\n(필요: ${needCd.toLocaleString()} CD / 보유: ${curCd.toLocaleString()} CD)\n퀴즈나 낚시로 CD를 모아오세요!`
    );
    return;
  }

  try {
    if (typeof ArcadeSfx !== "undefined") ArcadeSfx.unlock();
    const { data, error } = await sbClient.rpc("exchange_cd_to_arcade_coin", { p_qty: safeQty });
    if (error) {
      gameAlert(`동전 교환 중 오류가 발생했습니다.\n(${error.message || "서버 오류"})`);
      return;
    }
    if (data) {
      userState.cdCoins = Number(data.cd_coins ?? curCd - needCd);
      userState.arcadeCoins = Number(data.arcade_coins ?? (userState.arcadeCoins || 0) + safeQty);
    }
    if (typeof updateHeaderUserUI === "function") updateHeaderUserUI();
    syncArcadeBalancesUI();
    if (typeof ArcadeSfx !== "undefined") ArcadeSfx.coin();
    setArcadeNpcBubble(`동전 ${safeQty}개 받으쇼! 대박 나시게~`, "happy");
  } catch (e) {
    gameAlert("네트워크 오류로 동전 교환에 실패했습니다.");
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

window.playArcadeCabinet = async function (gameId) {
  if (arcadeState.isStarting || arcadeState.isSubmitting) return;
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
      openArcadeScreen();
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
    openArcadeScreen();
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
      openArcadeScreen();
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
        playArcadeCabinet(gameId);
      };
    }
    const rankBtn = document.getElementById("arcadeResRankBtn");
    if (rankBtn) {
      rankBtn.onclick = () => {
        closeModal("arcadeResultModal");
        openArcadeScreen();
        openArcadeRankingModal(gameId);
      };
    }
    const lobbyBtn = document.getElementById("arcadeResLobbyBtn");
    if (lobbyBtn) {
      lobbyBtn.onclick = () => {
        closeModal("arcadeResultModal");
        openArcadeScreen();
      };
    }

    if (typeof ArcadeSfx !== "undefined") ArcadeSfx.clear();
    openModal("arcadeResultModal");
  } catch (err) {
    arcadeState.isSubmitting = false;
    gameAlert("서버 통신 오류로 정산을 완료하지 못했습니다.");
    openArcadeScreen();
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
