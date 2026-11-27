// ============================================================================
// [음악왕 V4.0] 퀴즈광장 (OX 링 · 사막 타자왕 · 올라강 + AI 봇 엔진 + 호스트 자동 승계)
// ============================================================================

const QUIZ_PLAZA_MIN_HUMAN_PLAYERS = 1; // 추후 유저 증가 시 3으로 상향 가능
const QUIZ_PLAZA_MAX_PLAYERS = 8;
const QUIZ_PLAZA_ROUNDS_COUNT = 10;

const QUIZ_PLAZA_BOT_NAMES = [
  "모차르트봇", "고음장인", "리듬타는곰", "피아노고수", "노래방마스터",
  "사막여우", "밤바다낚시꾼", "초성탐정", "비트메이커", "기타치는고양이",
  "천지인타자왕", "상식박사", "멜로디요정", "골든마이크", "헤드셋소년",
  "강태공2세", "오락실챔피언", "한소절천재", "탬버린신동", "드럼머신",
  "새벽감성", "별왕관지망생", "도레미파", "싱어송라이터"
];

const QUIZ_PLAZA_REWARD_TABLE = {
  ox: { survivorCd: 500, survivorExp: 125 },
  typing: {
    1: { cd: 300, exp: 75 },
    2: { cd: 200, exp: 50 },
    3: { cd: 100, exp: 25 }
  },
  climb: { winnerCd: 300, winnerExp: 75 }
};

const quizPlazaState = {
  rooms: [],
  serverTimeOffsetMs: 0,
  lobbyPollTimer: null,
  lobbyCountdownTimer: null,
  lobbyRealtimeCh: null,

  currentRoom: null,
  roomChannel: null,
  roomHeartbeatTimer: null,
  roomTickTimer: null,

  // 실시간 게임 진행 상태 (호스트/클라 공통 구조)
  game: null,
  botTimers: [],
  lobbyRenderCache: "",
  lastStageRenderSig: "",
  avatarDataUrlCache: new Map(),
  isStartingRoom: false,
  isLeavingRoom: false,
  myChoiceLock: false,
  cachedAccessToken: ""
};

function getPlazaServerNowMs() {
  return Date.now() + (Number(quizPlazaState.serverTimeOffsetMs) || 0);
}

function updatePlazaServerOffset(serverNowIso) {
  if (!serverNowIso) return;
  const parsed = Date.parse(serverNowIso);
  if (Number.isFinite(parsed) && parsed > 0) {
    quizPlazaState.serverTimeOffsetMs = parsed - Date.now();
  }
}

function escapePlazaHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shufflePlazaArray(arr) {
  const copy = [...(arr || [])];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ============================================================================
// 1. 공통 문제 추첨 & 가사 1구절 파싱 + AI 봇 아바타/타자속도 엔진
// ============================================================================
function extractTypingLyricCandidates() {
  if (typeof QUESTIONS_DB === "undefined" || !Array.isArray(QUESTIONS_DB)) return [];
  const res = [];
  QUESTIONS_DB.forEach(q => {
    if (!q || !q.lyricsQuestion) return;
    const parts = String(q.lyricsQuestion).split("/");
    parts.forEach((raw, idx) => {
      const cleaned = raw
        .replace(/\([^)]*\)/g, " ")
        .replace(/["'“”‘’~!?.,:;·…]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.length >= 10 && cleaned.length <= 32) {
        res.push({
          id: `ly_${q.id}_${idx}`,
          type: "lyric",
          text: cleaned,
          author: `${q.artist} - ${q.title}`
        });
      }
    });
  });
  return res;
}

function buildQuizPlazaQuestionSet(gameType) {
  if (gameType === "ox") {
    const pool = typeof OX_QUESTIONS_DB !== "undefined" && Array.isArray(OX_QUESTIONS_DB) ? OX_QUESTIONS_DB : [];
    return shufflePlazaArray(pool).slice(0, QUIZ_PLAZA_ROUNDS_COUNT).map(q => ({
      id: q.id,
      q: q.q,
      a: Boolean(q.a),
      note: q.note || ""
    }));
  }

  if (gameType === "climb") {
    const pool = typeof CLIMB_QUESTIONS_DB !== "undefined" && Array.isArray(CLIMB_QUESTIONS_DB) ? CLIMB_QUESTIONS_DB : [];
    return shufflePlazaArray(pool).slice(0, QUIZ_PLAZA_ROUNDS_COUNT).map(q => ({
      id: q.id,
      q: q.q,
      choices: Array.isArray(q.choices) ? [...q.choices] : [],
      answerIndex: Number(q.answerIndex) || 0
    }));
  }

  // 타자왕: 속담·명언(TYPING_PROVERBS_DB) + 1구절 가사(data.js) 혼합 10문제
  const proverbs = typeof TYPING_PROVERBS_DB !== "undefined" && Array.isArray(TYPING_PROVERBS_DB)
    ? TYPING_PROVERBS_DB.map(it => ({
        id: it.id,
        type: it.type || "proverb",
        text: String(it.text || "").trim(),
        author: it.author ? String(it.author).trim() : ""
      }))
    : [];
  const lyrics = extractTypingLyricCandidates();

  const pickedProverbs = shufflePlazaArray(proverbs).slice(0, 6);
  const pickedLyrics = shufflePlazaArray(lyrics).slice(0, 4);
  const combined = shufflePlazaArray([...pickedProverbs, ...pickedLyrics]);
  if (combined.length < QUIZ_PLAZA_ROUNDS_COUNT) {
    const extra = shufflePlazaArray(proverbs).filter(p => !combined.some(c => c.id === p.id));
    combined.push(...extra.slice(0, QUIZ_PLAZA_ROUNDS_COUNT - combined.length));
  }
  return combined.slice(0, QUIZ_PLAZA_ROUNDS_COUNT);
}

function buildRandomBotAvatarConfig() {
  const shop = typeof AVATAR_SHOP_ITEMS !== "undefined" ? AVATAR_SHOP_ITEMS : null;
  const pickId = (cat, fallback) => {
    const list = shop && Array.isArray(shop[cat]) ? shop[cat] : null;
    if (!list || list.length === 0) return fallback;
    const sub = list.filter(x => x && x.purchasable !== false);
    const pool = sub.length > 0 ? sub : list;
    return pool[Math.floor(Math.random() * pool.length)].id || fallback;
  };
  const raw = {
    gender: Math.random() < 0.5 ? "male" : "female",
    bg: pickId("bg", "meadow"),
    hair: pickId("hair", "default"),
    hat: Math.random() < 0.55 ? pickId("hat", "none") : "none",
    face: pickId("face", "default"),
    outfit: pickId("outfit", "basic"),
    acc: Math.random() < 0.6 ? pickId("acc", "none") : "none",
    wing: Math.random() < 0.25 ? pickId("wing", "none") : "none",
    effect: "none",
    fishingRod: "none",
    fishingBait: "none"
  };
  return typeof sanitizeAvatarConfigShape === "function" ? sanitizeAvatarConfigShape(raw) : raw;
}

function pickWeightedBotTypingWpm() {
  // 모바일 유저 기준 100~250타/분 (빠른 봇 206~250타는 15% 확률)
  const r = Math.random();
  if (r < 0.45) return Math.round(100 + Math.random() * 55); // 100~155
  if (r < 0.85) return Math.round(156 + Math.random() * 49); // 156~205
  return Math.round(206 + Math.random() * 44); // 206~250
}

function buildBotRoster(humans, maxSlots = QUIZ_PLAZA_MAX_PLAYERS) {
  const usedNames = new Set((humans || []).map(h => h.nickname));
  const pool = shufflePlazaArray(QUIZ_PLAZA_BOT_NAMES).filter(n => !usedNames.has(n));
  const needBots = Math.max(0, maxSlots - (humans || []).length);
  const bots = [];
  for (let i = 0; i < needBots; i++) {
    const name = pool[i] || `AI도전자${i + 1}`;
    bots.push({
      id: `bot_${i + 1}_${Math.random().toString(36).slice(2, 6)}`,
      nickname: name,
      isBot: true,
      avatarConfig: buildRandomBotAvatarConfig(),
      score: 0,
      eliminated: false,
      typingSkillWpm: pickWeightedBotTypingWpm(),
      oxSkill: 0.70 + Math.random() * 0.10,
      climbSkill: 0.70 + Math.random() * 0.10
    });
  }
  return bots;
}

const _plazaAvatarCanvasCache = new Map();

function getCachedAvatarCanvas(avatarCfg) {
  const clean = typeof sanitizeAvatarConfigShape === "function"
    ? sanitizeAvatarConfigShape(avatarCfg || {})
    : (avatarCfg || {});
  const key = JSON.stringify(clean);
  if (_plazaAvatarCanvasCache.has(key)) {
    return _plazaAvatarCanvasCache.get(key);
  }
  const cv = document.createElement("canvas");
  cv.width = 480;
  cv.height = 480;
  if (typeof renderPixelAvatar === "function") {
    try {
      renderPixelAvatar(cv, clean, { transparentBg: true, matchCssAspect: false, skipEffectLoop: true });
    } catch (e) {}
  }
  _plazaAvatarCanvasCache.set(key, cv);
  if (_plazaAvatarCanvasCache.size > 48) {
    const firstKey = _plazaAvatarCanvasCache.keys().next().value;
    _plazaAvatarCanvasCache.delete(firstKey);
  }
  return cv;
}

function getCachedAvatarDataUrl(avatarCfg) {
  const clean = typeof sanitizeAvatarConfigShape === "function"
    ? sanitizeAvatarConfigShape(avatarCfg || {})
    : (avatarCfg || {});
  const key = JSON.stringify(clean);
  if (quizPlazaState.avatarDataUrlCache.has(key)) {
    return quizPlazaState.avatarDataUrlCache.get(key);
  }
  const cv = getCachedAvatarCanvas(clean);
  const url = cv.toDataURL();
  quizPlazaState.avatarDataUrlCache.set(key, url);
  if (quizPlazaState.avatarDataUrlCache.size > 48) {
    const firstKey = quizPlazaState.avatarDataUrlCache.keys().next().value;
    quizPlazaState.avatarDataUrlCache.delete(firstKey);
  }
  return url;
}

// ============================================================================
// 2. 퀴즈광장 대기실 방 목록 (#quizPlazaScreen)
// ============================================================================
window.openQuizPlazaScreen = async function () {
  if (typeof userState === "undefined" || !userState.isLoggedIn) {
    if (typeof gameConfirm === "function") {
      gameConfirm("퀴즈광장은 로그인 후 입장할 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    }
    return;
  }
  if (typeof switchScreen === "function") switchScreen("quizPlazaScreen");
  requestAnimationFrame(() => {
    try { drawQuizPlazaLobbyArt(); } catch (e) {}
  });
  startQuizPlazaLobbySync();
  await refreshQuizPlazaRoomsList();
};

window.closeQuizPlazaLobby = function () {
  stopQuizPlazaLobbySync();
  if (typeof openOutingHubScreen === "function") openOutingHubScreen();
  else if (typeof showHome === "function") showHome();
};

function stopQuizPlazaLobbySync() {
  if (quizPlazaState.lobbyPollTimer) {
    clearInterval(quizPlazaState.lobbyPollTimer);
    quizPlazaState.lobbyPollTimer = null;
  }
  if (quizPlazaState.lobbyCountdownTimer) {
    clearInterval(quizPlazaState.lobbyCountdownTimer);
    quizPlazaState.lobbyCountdownTimer = null;
  }
  if (quizPlazaState.lobbyRealtimeCh && sbClient) {
    try { sbClient.removeChannel(quizPlazaState.lobbyRealtimeCh); } catch (e) {}
    quizPlazaState.lobbyRealtimeCh = null;
  }
}

function startQuizPlazaLobbySync() {
  stopQuizPlazaLobbySync();
  if (sbClient && !quizPlazaState.lobbyRealtimeCh) {
    quizPlazaState.lobbyRealtimeCh = sbClient
      .channel("quiz_plaza_lobby_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_plaza_rooms" }, () => {
        if (typeof state !== "undefined" && state.currentScreen === "quizPlazaScreen") {
          refreshQuizPlazaRoomsList();
        }
      })
      .subscribe();
  }
  quizPlazaState.lobbyPollTimer = setInterval(() => {
    if (typeof state !== "undefined" && state.currentScreen === "quizPlazaScreen" && !document.hidden) {
      refreshQuizPlazaRoomsList();
    }
  }, 4000);
  quizPlazaState.lobbyCountdownTimer = setInterval(() => {
    if (typeof state !== "undefined" && state.currentScreen === "quizPlazaScreen") {
      renderQuizPlazaRoomCards();
    }
  }, 1000);
}

window.refreshQuizPlazaRoomsList = async function () {
  if (!sbClient) return;
  try {
    const { data, error } = await sbClient.rpc("get_quiz_plaza_rooms");
    if (error || !data || !data.ok) {
      const box = document.getElementById("quizPlazaRoomsGrid");
      if (box && quizPlazaState.rooms.length === 0) {
        box.innerHTML = `<div style="text-align:center; padding:26px; color:var(--danger); font-size:0.84rem; font-weight:800;">방 목록을 불러오지 못했습니다.<br/>Supabase SQL(supabase_v4_update.sql) 실행 여부를 확인해주세요.</div>`;
      }
      return;
    }
    updatePlazaServerOffset(data.server_now);
    quizPlazaState.rooms = Array.isArray(data.rooms) ? data.rooms : [];
    renderQuizPlazaRoomCards();
  } catch (e) {}
};

function renderQuizPlazaRoomCards() {
  const box = document.getElementById("quizPlazaRoomsGrid");
  if (!box) return;
  if (!Array.isArray(quizPlazaState.rooms) || quizPlazaState.rooms.length === 0) {
    box.innerHTML = `<div style="text-align:center; padding:26px; color:var(--text-sub); font-size:0.84rem;">퀴즈광장 방을 불러오는 중입니다...</div>`;
    return;
  }

  const nowMs = getPlazaServerNowMs();
  const typeMeta = {
    ox: { label: "🥊 OX 퀴즈", sub: "권투 링 생존전 · 7초 내 O/X 이동! 10라운드 생존 시 500 CD / 125 EXP", cls: "is-ox" },
    typing: { label: "🏜️ 타자왕", sub: "사막 궁전 선착순 · 1등 300 / 2등 200 / 3등 100 CD", cls: "is-typing" },
    climb: { label: "🏞️ 올라강", sub: "강 위 밧줄 바구니 7초 상식 퀴즈 · 최고층 전원 300 CD / 75 EXP", cls: "is-climb" }
  };

  const sections = ["ox", "typing", "climb"].map(gt => {
    const meta = typeMeta[gt];
    const rooms = quizPlazaState.rooms.filter(r => r.game_type === gt);
    const cardsHtml = rooms.map(room => {
      const players = Array.isArray(room.players) ? room.players : [];
      const isPlaying = room.status === "playing";
      const cdEndMs = room.countdown_end_at ? Date.parse(room.countdown_end_at) : 0;
      const remSec = cdEndMs > 0 ? Math.max(0, Math.ceil((cdEndMs - nowMs) / 1000)) : null;

      let statusBadge = `<span class="qplaza-status-pill is-wait">대기중</span>`;
      let timeText = "유저 입장 시 30초 카운트 시작";
      if (isPlaying) {
        statusBadge = `<span class="qplaza-status-pill is-play">게임중</span>`;
        const curR = Number(room.game_state?.roundIdx || 0) + 1;
        timeText = `진행중 (ROUND ${Math.min(QUIZ_PLAZA_ROUNDS_COUNT, curR)}/${QUIZ_PLAZA_ROUNDS_COUNT})`;
      } else if (players.length > 0 && remSec !== null) {
        timeText = remSec > 0 ? `⏳ 입장 ${remSec}초 남음` : "🚀 곧 시작됩니다!";
      }

      const maxP = Math.max(1, Number(room.max_players) || QUIZ_PLAZA_MAX_PLAYERS);
      const slotDots = Array.from({ length: maxP }, (_, idx) =>
        `<span class="qplaza-slot-dot ${idx < players.length ? "is-on" : ""}"></span>`
      ).join("");

      return `
        <button type="button" class="qplaza-room-card ${meta.cls} ${isPlaying ? "is-playing" : ""}" ${isPlaying ? "disabled" : ""} onclick="joinQuizPlazaRoom('${escapePlazaHtml(room.room_id)}')">
          <div class="qplaza-room-top">
            <strong class="qplaza-room-title">${escapePlazaHtml(room.title)}</strong>
            ${statusBadge}
          </div>
          <div class="qplaza-room-mid">
            <span class="qplaza-player-cnt">👥 ${players.length}/${maxP}명 <span class="qplaza-slot-dots">${slotDots}</span></span>
            <span class="qplaza-countdown-txt">${timeText}</span>
          </div>
        </button>
      `;
    }).join("");

    return `
      <div class="qplaza-group-box ${meta.cls}">
        <div class="qplaza-group-head">
          <strong>${meta.label}</strong>
          <span>${meta.sub}</span>
        </div>
        <div class="qplaza-group-cards">${cardsHtml}</div>
      </div>
    `;
  }).join("");

  box.innerHTML = sections;
}

// ============================================================================
// 3. 방 입장 · 서버 30초 카운트 · AI 투입 · 호스트 자동 승계
// ============================================================================
window.joinQuizPlazaRoom = async function (roomId) {
  if (!sbClient || !userState?.isLoggedIn) return;
  stopQuizPlazaLobbySync();
  try {
    const { data: sessData } = await sbClient.auth.getSession();
    quizPlazaState.cachedAccessToken = sessData?.session?.access_token || "";
  } catch (e) {}

  const myPlayer = {
    id: userState.id,
    nickname: userState.nickname || "도전자",
    exp: Number(userState.exp) || 0,
    avatarConfig: typeof getPublicFishingAvatarConfig === "function"
      ? getPublicFishingAvatarConfig()
      : (userState.avatarConfig || DEFAULT_AVATAR_CONFIG)
  };

  try {
    const { data, error } = await sbClient.rpc("join_quiz_plaza_room", {
      p_room_id: roomId,
      p_player: myPlayer
    });
    if (error || !data || !data.ok) {
      const errCode = data?.error || "";
      if (errCode === "ROOM_PLAYING") {
        if (typeof gameAlert === "function") gameAlert("이미 게임이 진행 중인 방입니다!\n다른 대기중인 방으로 입장해 주세요.");
      } else if (errCode === "ROOM_FULL") {
        if (typeof gameAlert === "function") gameAlert("방 인원이 가득 찼습니다!");
      } else {
        if (typeof gameAlert === "function") gameAlert("방 입장 중 오류가 발생했습니다.");
      }
      openQuizPlazaScreen();
      return;
    }

    updatePlazaServerOffset(data.server_now);
    quizPlazaState.currentRoom = data.room;
    quizPlazaState.game = null;
    quizPlazaState.isStartingRoom = false;
    quizPlazaState.isLeavingRoom = false;
    quizPlazaState.lastStageRenderSig = "";
    quizPlazaState.myChoiceLock = false;
    _lastDrawnPlazaArtSig = "";

    if (typeof switchScreen === "function") switchScreen("quizPlazaPlayScreen");
    setupQuizPlazaRoomRuntime(data.room);
    renderQuizPlazaPlayScreen();
  } catch (e) {
    openQuizPlazaScreen();
  }
};

function clearQuizPlazaRoomTimers() {
  stopQuizPlazaClimbAnim();
  if (quizPlazaState.roomHeartbeatTimer) {
    clearInterval(quizPlazaState.roomHeartbeatTimer);
    quizPlazaState.roomHeartbeatTimer = null;
  }
  if (quizPlazaState.roomTickTimer) {
    clearInterval(quizPlazaState.roomTickTimer);
    quizPlazaState.roomTickTimer = null;
  }
  quizPlazaState.botTimers.forEach(t => clearTimeout(t));
  quizPlazaState.botTimers = [];
}

function isCurrentQuizPlazaMaster() {
  const room = quizPlazaState.currentRoom;
  if (!room || !userState?.id) return false;
  if (room.host_id === userState.id) return true;
  const players = Array.isArray(room.players) ? room.players : [];
  return players.length > 0 && players[0].id === userState.id;
}

function setupQuizPlazaRoomRuntime(room) {
  clearQuizPlazaRoomTimers();
  if (quizPlazaState.roomChannel && sbClient) {
    try { sbClient.removeChannel(quizPlazaState.roomChannel); } catch (e) {}
    quizPlazaState.roomChannel = null;
  }
  if (!room || !sbClient) return;

  const ch = sbClient.channel(`quiz_plaza_room_${room.room_id}`, {
    config: { presence: { key: userState.id } }
  });
  quizPlazaState.roomChannel = ch;

  ch.on("postgres_changes", {
    event: "UPDATE",
    schema: "public",
    table: "quiz_plaza_rooms",
    filter: `room_id=eq.${room.room_id}`
  }, payload => {
    if (payload && payload.new) {
      handlePlazaRoomRowSync(payload.new);
    }
  })
  .on("broadcast", { event: "plaza_game_event" }, ({ payload }) => {
    handlePlazaBroadcastEvent(payload);
  })
  .on("presence", { event: "leave" }, () => {
    if (quizPlazaState.currentRoom && sbClient) {
      sbClient.rpc("heartbeat_quiz_plaza_room", { p_room_id: quizPlazaState.currentRoom.room_id })
        .then(({ data }) => {
          if (data && data.ok && data.room) {
            updatePlazaServerOffset(data.server_now);
            handlePlazaRoomRowSync(data.room);
          }
        })
        .catch(() => {});
    }
  })
  .subscribe(async status => {
    if (status === "SUBSCRIBED") {
      try { await ch.track({ userId: userState.id, joinedAt: Date.now() }); } catch (e) {}
    }
  });

  // 6초마다 하트비트 (이탈 정리 + 호스트 승계 감지)
  quizPlazaState.roomHeartbeatTimer = setInterval(async () => {
    if (!quizPlazaState.currentRoom || quizPlazaState.isLeavingRoom || !sbClient) return;
    try {
      const { data } = await sbClient.rpc("heartbeat_quiz_plaza_room", { p_room_id: quizPlazaState.currentRoom.room_id });
      if (data && data.ok && data.room) {
        updatePlazaServerOffset(data.server_now);
        handlePlazaRoomRowSync(data.room);
      }
    } catch (e) {}
  }, 6000);

  // 200ms UI/라운드/봇 틱
  quizPlazaState.roomTickTimer = setInterval(() => {
    tickQuizPlazaPlayState();
  }, 200);
}

function sendPlazaBroadcast(eventPayload) {
  if (!quizPlazaState.roomChannel) return;
  try {
    quizPlazaState.roomChannel.send({
      type: "broadcast",
      event: "plaza_game_event",
      payload: eventPayload
    });
  } catch (e) {}
}

function handlePlazaRoomRowSync(newRoom) {
  if (!newRoom || quizPlazaState.isLeavingRoom) return;
  const prevHost = quizPlazaState.currentRoom?.host_id;
  const prevStatus = quizPlazaState.currentRoom?.status;
  quizPlazaState.currentRoom = newRoom;

  // 대기중 -> 게임중 전환 감지 시 로컬 게임 상태 수화
  if (newRoom.status === "playing" && (prevStatus !== "playing" || !quizPlazaState.game)) {
    hydrateLocalGameFromRoom(newRoom);
  } else if (newRoom.status === "waiting" && prevStatus === "playing") {
    // 게임 종료 후 대기실 리셋
    clearBotRoundTimers();
    quizPlazaState.game = null;
  }

  // 마스터 승계 시 AI 봇 타이머 즉시 이어받기!
  if (
    newRoom.status === "playing" &&
    prevHost !== newRoom.host_id &&
    isCurrentQuizPlazaMaster() &&
    quizPlazaState.game &&
    quizPlazaState.game.phase === "round"
  ) {
    scheduleBotActionsForCurrentRound();
  }

  renderQuizPlazaPlayScreen();
}

function hydrateLocalGameFromRoom(room) {
  clearBotRoundTimers();
  const oxActors = document.getElementById("quizPlazaOxActorsLayer");
  if (oxActors) oxActors.innerHTML = "";
  const gs = room.game_state || {};
  const humans = Array.isArray(room.players) ? room.players : [];
  const bots = Array.isArray(gs.bots) ? gs.bots : [];
  const participants = [
    ...humans.map(h => ({
      id: h.id,
      nickname: h.nickname || "도전자",
      isBot: false,
      avatarConfig: h.avatarConfig || DEFAULT_AVATAR_CONFIG,
      score: Number(gs.scores?.[h.id]) || 0,
      eliminated: Boolean(gs.eliminated?.[h.id]),
      step: Number(gs.steps?.[h.id]) || 0,
      currentChoice: gs.choices?.[h.id] ?? null,
      typingFinishedOrder: gs.typingDone?.[h.id]?.order ?? null,
      typingProgress: gs.typingDone?.[h.id] ? 100 : 0
    })),
    ...bots.map(b => ({
      ...b,
      isBot: true,
      score: Number(gs.scores?.[b.id]) || 0,
      eliminated: Boolean(gs.eliminated?.[b.id]),
      step: Number(gs.steps?.[b.id]) || 0,
      currentChoice: gs.choices?.[b.id] ?? null,
      typingFinishedOrder: gs.typingDone?.[b.id]?.order ?? null,
      typingProgress: gs.typingDone?.[b.id] ? 100 : 0
    }))
  ];

  quizPlazaState.game = {
    gameType: room.game_type,
    questions: Array.isArray(room.question_payload) ? room.question_payload : [],
    roundIdx: Number(gs.roundIdx) || 0,
    phase: gs.phase || "round", // round | reveal | finished
    roundStartedAt: Number(gs.roundStartedAt) || getPlazaServerNowMs(),
    revealStartedAt: Number(gs.revealStartedAt) || 0,
    participants,
    roundFinishCounter: Number(gs.roundFinishCounter) || 0,
    rewardGranted: false,
    typingInputVal: ""
  };

  if (isCurrentQuizPlazaMaster() && quizPlazaState.game.phase === "round") {
    scheduleBotActionsForCurrentRound();
  }
}

async function triggerQuizPlazaAutoStart() {
  if (quizPlazaState.isStartingRoom || quizPlazaState.isLeavingRoom) return;
  const room = quizPlazaState.currentRoom;
  if (!room || room.status !== "waiting") return;
  const humans = Array.isArray(room.players) ? room.players : [];
  if (humans.length < QUIZ_PLAZA_MIN_HUMAN_PLAYERS) return;

  quizPlazaState.isStartingRoom = true;
  try {
    const questions = buildQuizPlazaQuestionSet(room.game_type);
    const bots = buildBotRoster(humans, room.max_players || QUIZ_PLAZA_MAX_PLAYERS);
    const initState = {
      phase: "round",
      roundIdx: 0,
      roundStartedAt: getPlazaServerNowMs(),
      bots,
      scores: {},
      eliminated: {},
      steps: {},
      choices: {},
      typingDone: {},
      roundFinishCounter: 0
    };
    const { data } = await sbClient.rpc("start_quiz_plaza_room", {
      p_room_id: room.room_id,
      p_question_payload: questions,
      p_game_state: initState
    });
    if (data && data.ok && data.room) {
      updatePlazaServerOffset(data.server_now);
      handlePlazaRoomRowSync(data.room);
      sendPlazaBroadcast({ type: "room_sync", room: data.room });
    }
  } finally {
    quizPlazaState.isStartingRoom = false;
  }
}

window.leaveQuizPlazaRoom = async function (opts = {}) {
  const skipNavigate = Boolean(opts && opts.skipNavigate);
  if (quizPlazaState.isLeavingRoom) return;
  quizPlazaState.isLeavingRoom = true;
  clearQuizPlazaRoomTimers();

  const room = quizPlazaState.currentRoom;
  if (quizPlazaState.roomChannel && sbClient) {
    try { await quizPlazaState.roomChannel.untrack(); } catch (e) {}
    try { sbClient.removeChannel(quizPlazaState.roomChannel); } catch (e) {}
    quizPlazaState.roomChannel = null;
  }

  quizPlazaState.currentRoom = null;
  quizPlazaState.game = null;

  if (room && sbClient) {
    try {
      await sbClient.rpc("leave_quiz_plaza_room", { p_room_id: room.room_id });
    } catch (e) {}
  }
  quizPlazaState.isLeavingRoom = false;

  const typingBar = document.getElementById("quizPlazaTypingBar");
  if (typingBar) typingBar.classList.remove("is-kb-floating");
  const typingInput = document.getElementById("quizPlazaTypingInput");
  if (typingInput) { typingInput.value = ""; typingInput.blur(); }

  if (!skipNavigate) {
    openQuizPlazaScreen();
  }
};

window.confirmExitQuizPlazaPlay = function () {
  const room = quizPlazaState.currentRoom;
  const g = quizPlazaState.game;
  const me = g?.participants?.find(p => p.id === userState?.id);
  const isWaiting = !room || room.status === "waiting";
  const isSpectating = Boolean(me && me.eliminated);
  const isFinished = Boolean(g && g.phase === "finished");

  if (isWaiting || isSpectating || isFinished) {
    leaveQuizPlazaRoom();
    return;
  }
  if (typeof gameConfirm === "function") {
    gameConfirm(
      "진행 중인 게임에서 나가시겠습니까?\n중도 퇴장 시 이번 판 보상을 받을 수 없습니다.",
      () => leaveQuizPlazaRoom(),
      "🚪 게임 나가기"
    );
  } else {
    leaveQuizPlazaRoom();
  }
};

// ============================================================================
// 4. 게임 라운드 진행 · AI 봇 스케줄러 · Realtime 브로드캐스트 동기화
// ============================================================================
function getPlazaRoundDurationMs(gameType) {
  if (gameType === "ox") return 7000;
  if (gameType === "typing") return 25000;
  return 7000; // climb (7초 선택)
}

function clearBotRoundTimers() {
  quizPlazaState.botTimers.forEach(t => clearTimeout(t));
  quizPlazaState.botTimers = [];
}

function scheduleBotActionsForCurrentRound() {
  clearBotRoundTimers();
  const g = quizPlazaState.game;
  if (!g || g.phase !== "round" || !isCurrentQuizPlazaMaster()) return;
  const q = g.questions[g.roundIdx];
  if (!q) return;

  const elapsed = Math.max(0, getPlazaServerNowMs() - g.roundStartedAt);

  g.participants.forEach(p => {
    if (!p.isBot || p.eliminated) return;
    if (g.gameType === "ox" || g.gameType === "climb") {
      if (p.currentChoice !== null && p.currentChoice !== undefined) return;
      const delay = Math.max(250, Math.round(1100 + Math.random() * 3400 - elapsed));
      const tId = setTimeout(() => {
        if (!quizPlazaState.game || quizPlazaState.game.phase !== "round" || quizPlazaState.game.roundIdx !== g.roundIdx) return;
        const skill = g.gameType === "ox" ? (p.oxSkill || 0.75) : (p.climbSkill || 0.75);
        const correct = Math.random() < skill;
        let pick;
        if (g.gameType === "ox") {
          pick = correct ? q.a : !q.a;
        } else {
          if (correct) {
            pick = q.answerIndex;
          } else {
            const wrongs = [0, 1, 2, 3].filter(idx => idx !== q.answerIndex);
            pick = wrongs[Math.floor(Math.random() * wrongs.length)];
          }
        }
        applyParticipantChoice(p.id, pick, g.roundIdx);
        sendPlazaBroadcast({ type: "choice", roundIdx: g.roundIdx, playerId: p.id, choice: pick });
      }, delay);
      quizPlazaState.botTimers.push(tId);
    } else if (g.gameType === "typing") {
      if (p.typingFinishedOrder !== null) return;
      const wpm = p.typingSkillWpm || pickWeightedBotTypingWpm();
      const totalHits = Math.max(8, String(q.text || "").length * 2.4);
      const rawCompMs = Math.round((totalHits / wpm) * 60 * 1000);
      const compMs = Math.min(24200, Math.max(2200, rawCompMs));
      const delay = Math.max(250, compMs - elapsed);
      const tId = setTimeout(() => {
        if (!quizPlazaState.game || quizPlazaState.game.phase !== "round" || quizPlazaState.game.roundIdx !== g.roundIdx) return;
        applyTypingFinish(p.id, g.roundIdx);
        sendPlazaBroadcast({ type: "typing_done", roundIdx: g.roundIdx, playerId: p.id });
      }, delay);
      quizPlazaState.botTimers.push(tId);
    }
  });
}

function handlePlazaBroadcastEvent(payload) {
  if (!payload || quizPlazaState.isLeavingRoom) return;
  if (payload.type === "room_sync" && payload.room) {
    handlePlazaRoomRowSync(payload.room);
    return;
  }
  const g = quizPlazaState.game;
  if (!g) return;

  if (payload.type === "choice" && payload.roundIdx === g.roundIdx) {
    applyParticipantChoice(payload.playerId, payload.choice, payload.roundIdx);
  } else if (payload.type === "typing_done" && payload.roundIdx === g.roundIdx) {
    applyTypingFinish(payload.playerId, payload.roundIdx);
  } else if (payload.type === "round_end" && payload.roundIdx === g.roundIdx) {
    if (g.phase === "round") {
      finalizeQuizPlazaRound(payload.revealStartedAt || getPlazaServerNowMs());
    }
  } else if (payload.type === "next_round" && typeof payload.roundIdx === "number") {
    advanceToNextQuizPlazaRound(payload.roundIdx, payload.roundStartedAt || getPlazaServerNowMs());
  } else if (payload.type === "game_finish") {
    finishQuizPlazaGame();
  }
}

function applyParticipantChoice(playerId, choice, roundIdx) {
  const g = quizPlazaState.game;
  if (!g || g.roundIdx !== roundIdx || g.phase !== "round") return;
  const p = g.participants.find(x => x.id === playerId);
  if (!p || p.eliminated) return;
  p.currentChoice = choice;
  renderQuizPlazaPlayScreen();
}

function applyTypingFinish(playerId, roundIdx) {
  const g = quizPlazaState.game;
  if (!g || g.roundIdx !== roundIdx || g.phase !== "round") return;
  const p = g.participants.find(x => x.id === playerId);
  if (!p || p.typingFinishedOrder !== null) return;
  g.roundFinishCounter += 1;
  p.typingFinishedOrder = g.roundFinishCounter;
  p.typingProgress = 100;
  // 선착순 포인트: 1등 +10, 2등 +8, 3등 +6, 이후 +4~1
  const pts = p.typingFinishedOrder === 1 ? 10 : p.typingFinishedOrder === 2 ? 8 : p.typingFinishedOrder === 3 ? 6 : Math.max(1, 7 - p.typingFinishedOrder);
  p.score += pts;
  renderQuizPlazaPlayScreen();

  // 타자왕에서 모든 살아있는 실유저가 완료했으면 1초 후 조기 마감 가능 (마스터 처리)
  if (isCurrentQuizPlazaMaster()) {
    const humansPending = g.participants.some(x => !x.isBot && x.typingFinishedOrder === null);
    const botsFinished = g.participants.filter(x => x.isBot && x.typingFinishedOrder !== null).length;
    if (!humansPending && botsFinished >= Math.min(3, g.participants.filter(x => x.isBot).length)) {
      const revealAt = getPlazaServerNowMs();
      finalizeQuizPlazaRound(revealAt);
      sendPlazaBroadcast({ type: "round_end", roundIdx: g.roundIdx, revealStartedAt: revealAt });
    }
  }
}

function tickQuizPlazaPlayState() {
  const scr = typeof state !== "undefined" ? state.currentScreen : "";
  if (scr !== "quizPlazaPlayScreen") return;
  const room = quizPlazaState.currentRoom;
  if (!room) return;

  const nowMs = getPlazaServerNowMs();

  if (room.status === "waiting") {
    const cdEnd = room.countdown_end_at ? Date.parse(room.countdown_end_at) : 0;
    const remMs = cdEnd > 0 ? cdEnd - nowMs : 99999;
    // 방장(마스터)이 0초 도달 시 즉시 게임 시작, 방장이 응답 없으면 +1.5초 뒤 생존자 승계 시작
    const isMaster = isCurrentQuizPlazaMaster();
    if (cdEnd > 0 && ((isMaster && remMs <= 0) || (!isMaster && remMs <= -1500))) {
      triggerQuizPlazaAutoStart();
    }
    renderQuizPlazaPlayScreen();
    return;
  }

  const g = quizPlazaState.game;
  if (!g) return;

  const roundDur = getPlazaRoundDurationMs(g.gameType);

  if (g.phase === "round") {
    // 타자왕 AI 봇 실시간 진행률 시각 애니메이션 업데이트
    if (g.gameType === "typing") {
      const q = g.questions[g.roundIdx];
      const elapsed = Math.max(0, nowMs - g.roundStartedAt);
      g.participants.forEach(p => {
        if (p.isBot && p.typingFinishedOrder === null && q) {
          const wpm = p.typingSkillWpm || 160;
          const estMs = Math.max(2200, Math.round(((String(q.text || "").length * 2.4) / wpm) * 60 * 1000));
          p.typingProgress = Math.min(97, Math.round((elapsed / estMs) * 100));
        }
      });
    }

    if (nowMs - g.roundStartedAt >= roundDur) {
      if (isCurrentQuizPlazaMaster() || nowMs - g.roundStartedAt >= roundDur + 1200) {
        const revAt = nowMs;
        finalizeQuizPlazaRound(revAt);
        if (isCurrentQuizPlazaMaster()) {
          sendPlazaBroadcast({ type: "round_end", roundIdx: g.roundIdx, revealStartedAt: revAt });
        }
      }
    }
  } else if (g.phase === "reveal") {
    if (nowMs - g.revealStartedAt >= 2000) {
      const nextIdx = g.roundIdx + 1;
      const aliveCount = g.gameType === "ox" ? g.participants.filter(p => !p.eliminated).length : 1;
      if (nextIdx >= g.questions.length || (g.gameType === "ox" && aliveCount === 0)) {
        if (isCurrentQuizPlazaMaster() || nowMs - g.revealStartedAt >= 3200) {
          finishQuizPlazaGame();
          if (isCurrentQuizPlazaMaster()) sendPlazaBroadcast({ type: "game_finish" });
        }
      } else {
        if (isCurrentQuizPlazaMaster() || nowMs - g.revealStartedAt >= 3200) {
          const nextStart = nowMs;
          advanceToNextQuizPlazaRound(nextIdx, nextStart);
          if (isCurrentQuizPlazaMaster()) {
            sendPlazaBroadcast({ type: "next_round", roundIdx: nextIdx, roundStartedAt: nextStart });
          }
        }
      }
    }
  }

  renderQuizPlazaPlayScreen();
}

function finalizeQuizPlazaRound(revealAt) {
  const g = quizPlazaState.game;
  if (!g || g.phase !== "round") return;
  clearBotRoundTimers();
  g.phase = "reveal";
  g.revealStartedAt = revealAt;

  const q = g.questions[g.roundIdx];
  if (q) {
    if (g.gameType === "ox") {
      g.participants.forEach(p => {
        if (p.eliminated) return;
        if (p.currentChoice === q.a) {
          p.score += 1;
        } else {
          p.eliminated = true;
        }
      });
    } else if (g.gameType === "climb") {
      g.participants.forEach(p => {
        if (Number(p.currentChoice) === Number(q.answerIndex)) {
          p.score += 1;
          p.step = Math.min(QUIZ_PLAZA_ROUNDS_COUNT, p.step + 1);
        }
      });
    }
  }

  const typingInput = document.getElementById("quizPlazaTypingInput");
  if (typingInput) typingInput.blur();

  const me = g.participants.find(p => p.id === userState?.id);
  if (me && typeof window.triggerGameHaptic === "function") {
    const ok = g.gameType === "ox" ? !me.eliminated : g.gameType === "climb" ? Number(me.currentChoice) === Number(q?.answerIndex) : me.typingFinishedOrder !== null;
    window.triggerGameHaptic(ok ? "success" : "error");
  }

  persistMasterQuizPlazaProgress();
  renderQuizPlazaPlayScreen();
}

function advanceToNextQuizPlazaRound(nextIdx, nextStartedAt) {
  const g = quizPlazaState.game;
  if (!g) return;
  g.roundIdx = nextIdx;
  g.phase = "round";
  g.roundStartedAt = nextStartedAt;
  g.roundFinishCounter = 0;
  g.typingInputVal = "";
  quizPlazaState.myChoiceLock = false;

  g.participants.forEach(p => {
    p.currentChoice = null;
    p.typingFinishedOrder = null;
    if (!p.isBot) p.typingProgress = 0;
    else p.typingProgress = 0;
  });

  const typingInput = document.getElementById("quizPlazaTypingInput");
  if (typingInput) {
    typingInput.value = "";
  }

  if (isCurrentQuizPlazaMaster()) {
    scheduleBotActionsForCurrentRound();
  }
  persistMasterQuizPlazaProgress();
  renderQuizPlazaPlayScreen();
}

async function persistMasterQuizPlazaProgress() {
  if (!isCurrentQuizPlazaMaster() || !sbClient || !quizPlazaState.currentRoom || !quizPlazaState.game) return;
  const g = quizPlazaState.game;
  const scores = {};
  const eliminated = {};
  const steps = {};
  g.participants.forEach(p => {
    scores[p.id] = p.score;
    if (p.eliminated) eliminated[p.id] = true;
    steps[p.id] = p.step;
  });
  const nextState = {
    ...(quizPlazaState.currentRoom.game_state || {}),
    phase: g.phase,
    roundIdx: g.roundIdx,
    roundStartedAt: g.roundStartedAt,
    revealStartedAt: g.revealStartedAt,
    scores,
    eliminated,
    steps
  };
  try {
    await sbClient.rpc("sync_quiz_plaza_room_state", {
      p_room_id: quizPlazaState.currentRoom.room_id,
      p_game_state: nextState,
      p_reset_to_waiting: false
    });
  } catch (e) {}
}

async function finishQuizPlazaGame() {
  const g = quizPlazaState.game;
  if (!g || g.phase === "finished") return;
  clearBotRoundTimers();
  g.phase = "finished";

  const typingInput = document.getElementById("quizPlazaTypingInput");
  if (typingInput) typingInput.blur();

  if (!g.rewardGranted && userState?.isLoggedIn) {
    g.rewardGranted = true;
    let gainedCd = 0;
    let gainedExp = 0;
    let resultMsg = "";

    const me = g.participants.find(p => p.id === userState.id);
    if (g.gameType === "ox") {
      const survived = Boolean(me && !me.eliminated);
      if (survived) {
        gainedCd = QUIZ_PLAZA_REWARD_TABLE.ox.survivorCd;
        gainedExp = QUIZ_PLAZA_REWARD_TABLE.ox.survivorExp;
        resultMsg = `🥊 축하합니다! OX 10라운드 최후 생존!\n💿 +${gainedCd} CD · ✨ +${gainedExp} EXP 획득!`;
      } else {
        resultMsg = "🥊 아쉽게 탈락했습니다. 다음 판에 다시 도전해보세요!";
      }
    } else if (g.gameType === "typing") {
      const sorted = [...g.participants].sort((a, b) => (b.score || 0) - (a.score || 0));
      const myScore = me ? Number(me.score) || 0 : 0;
      const myRank = myScore > 0 ? (sorted.findIndex(p => (p.score || 0) === myScore) + 1) : 99;
      if (myRank >= 1 && myRank <= 3) {
        const r = QUIZ_PLAZA_REWARD_TABLE.typing[myRank];
        gainedCd = r.cd;
        gainedExp = r.exp;
        resultMsg = `🏜️ 타자왕 최종 ${myRank}등! (${myScore}점)\n💿 +${gainedCd} CD · ✨ +${gainedExp} EXP 획득!`;
      } else {
        resultMsg = `🏜️ 최종 점수 ${myScore}점 (3등 이내 입상 시 보상 지급!)`;
      }
    } else if (g.gameType === "climb") {
      const maxScore = Math.max(0, ...g.participants.map(p => Number(p.score) || 0));
      const isWinner = Boolean(me && maxScore > 0 && Number(me.score) === maxScore);
      if (isWinner) {
        gainedCd = QUIZ_PLAZA_REWARD_TABLE.climb.winnerCd;
        gainedExp = QUIZ_PLAZA_REWARD_TABLE.climb.winnerExp;
        resultMsg = `🏞️ 올라강 1위 달성! (${maxScore}칸)\n💿 +${gainedCd} CD · ✨ +${gainedExp} EXP 획득!`;
      } else {
        resultMsg = `🏞️ 내 기록: ${me ? me.score : 0}칸 (최고 기록 ${maxScore}칸)`;
      }
    }

    g.finishSummaryText = resultMsg;

    if (gainedCd > 0 || gainedExp > 0) {
      userState.cdCoins = (Number(userState.cdCoins) || 0) + gainedCd;
      userState.exp = (Number(userState.exp) || 0) + gainedExp;
      if (typeof syncProfileToServer === "function") await syncProfileToServer();
      if (typeof updateHeaderUserUI === "function") updateHeaderUserUI();
      if (typeof playManualFishSfx === "function") playManualFishSfx("catch");
    }
  }

  renderQuizPlazaPlayScreen();
}

window.returnQuizPlazaToWaiting = async function () {
  if (!quizPlazaState.currentRoom || !sbClient) {
    leaveQuizPlazaRoom();
    return;
  }
  const room = quizPlazaState.currentRoom;
  const { data } = await sbClient.rpc("sync_quiz_plaza_room_state", {
    p_room_id: room.room_id,
    p_game_state: null,
    p_reset_to_waiting: true
  });
  if (data && data.ok && data.room) {
    updatePlazaServerOffset(data.server_now);
    handlePlazaRoomRowSync(data.room);
    sendPlazaBroadcast({ type: "room_sync", room: data.room });
  }
};

// ============================================================================
// 5. 플레이어 조작 (OX 선택 / 타자왕 입력 / 올라강 4지선다)
// ============================================================================
window.selectQuizPlazaOxChoice = function (sideBool) {
  const g = quizPlazaState.game;
  if (!g || g.gameType !== "ox" || g.phase !== "round") return;
  const me = g.participants.find(p => p.id === userState?.id);
  if (!me || me.eliminated) return;
  applyParticipantChoice(userState.id, Boolean(sideBool), g.roundIdx);
  sendPlazaBroadcast({ type: "choice", roundIdx: g.roundIdx, playerId: userState.id, choice: Boolean(sideBool) });
};

window.selectQuizPlazaClimbChoice = function (choiceIdx) {
  const g = quizPlazaState.game;
  if (!g || g.gameType !== "climb" || g.phase !== "round") return;
  const me = g.participants.find(p => p.id === userState?.id);
  if (!me) return;
  const nextIdx = Number(choiceIdx);
  if (me.currentChoice === nextIdx) return;
  applyParticipantChoice(userState.id, nextIdx, g.roundIdx);
  sendPlazaBroadcast({ type: "choice", roundIdx: g.roundIdx, playerId: userState.id, choice: nextIdx });
};

window.handleQuizPlazaTypingInput = function (e) {
  const g = quizPlazaState.game;
  if (!g || g.gameType !== "typing" || g.phase !== "round") return;
  const me = g.participants.find(p => p.id === userState?.id);
  if (!me || me.typingFinishedOrder !== null) return;

  const input = document.getElementById("quizPlazaTypingInput");
  if (!input) return;
  const q = g.questions[g.roundIdx];
  const target = String(q?.text || "");
  const val = String(input.value || "");
  g.typingInputVal = val;
  g.typingErrorUntil = 0;

  // 실시간 진행률
  let matchLen = 0;
  for (let i = 0; i < Math.min(val.length, target.length); i++) {
    if (val[i] === target[i]) matchLen++;
    else break;
  }
  me.typingProgress = target.length > 0 ? Math.min(99, Math.round((matchLen / target.length) * 100)) : 0;
  renderQuizPlazaTypingFeedback(val, target);

  // 조합 완료 상태고 정확 일치 시 즉시 완료
  if (!e?.isComposing && val === target) {
    applyTypingFinish(userState.id, g.roundIdx);
    sendPlazaBroadcast({ type: "typing_done", roundIdx: g.roundIdx, playerId: userState.id });
  }
};

window.submitQuizPlazaTypingAnswer = function () {
  const g = quizPlazaState.game;
  if (!g || g.gameType !== "typing" || g.phase !== "round") return;
  const me = g.participants.find(p => p.id === userState?.id);
  if (!me || me.typingFinishedOrder !== null) return;

  const input = document.getElementById("quizPlazaTypingInput");
  if (!input) return;
  const q = g.questions[g.roundIdx];
  const target = String(q?.text || "");
  const cleanedVal = String(input.value || "").replace(/^\s+|\s+$/g, "");

  if (cleanedVal === target) {
    g.typingErrorUntil = 0;
    applyTypingFinish(userState.id, g.roundIdx);
    sendPlazaBroadcast({ type: "typing_done", roundIdx: g.roundIdx, playerId: userState.id });
  } else {
    g.typingErrorUntil = Date.now() + 2000;
    renderQuizPlazaTypingFeedback(String(input.value || ""), target, true);
    if (typeof window.triggerGameHaptic === "function") window.triggerGameHaptic("error");
  }
};

function renderQuizPlazaTypingFeedback(typed, target, showMismatchHint = false) {
  const fb = document.getElementById("quizPlazaTypingLiveFeedback");
  if (!fb) return;
  const charsHtml = target.split("").map((ch, idx) => {
    const tCh = typed[idx];
    const disp = ch === " " ? "&nbsp;" : escapePlazaHtml(ch);
    if (tCh === undefined) return `<span class="qt-ch">${disp}</span>`;
    if (tCh === ch) return `<span class="qt-ch is-ok">${disp}</span>`;
    return `<span class="qt-ch is-err">${disp}</span>`;
  }).join("");

  fb.innerHTML = `${charsHtml}${showMismatchHint ? `<div class="qt-err-msg">❌ 띄어쓰기·글자가 정확히 일치해야 합니다!</div>` : ""}`;
}

// ============================================================================
// 6. 인게임 & 대기실 통합 렌더러 (#quizPlazaPlayScreen)
// ============================================================================
function renderQuizPlazaPlayScreen() {
  const room = quizPlazaState.currentRoom;
  if (!room) return;

  const playScreenEl = document.getElementById("quizPlazaPlayScreen");
  const titleEl = document.getElementById("quizPlazaPlayTitle");
  const roundEl = document.getElementById("quizPlazaPlayRoundBadge");
  const timerEl = document.getElementById("quizPlazaPlayTimerPill");
  const waitPane = document.getElementById("quizPlazaWaitingView");
  const stagePane = document.getElementById("quizPlazaGameView");
  const typingBar = document.getElementById("quizPlazaTypingBar");

  const activeTheme = (room.status === "waiting" || !quizPlazaState.game) ? "waiting" : quizPlazaState.game.gameType;
  if (playScreenEl) playScreenEl.setAttribute("data-plaza-theme", activeTheme);

  if (titleEl) titleEl.textContent = room.title || "🎪 퀴즈광장";
  const nowMs = getPlazaServerNowMs();

  // ---- A. 대기실 상태 ----
  if (room.status === "waiting" || !quizPlazaState.game) {
    if (waitPane) waitPane.classList.remove("hidden");
    if (stagePane) stagePane.classList.add("hidden");
    if (typingBar) typingBar.classList.add("hidden");
    try { drawQuizPlazaPlayStageArt("waiting", null); } catch (e) {}

    const players = Array.isArray(room.players) ? room.players : [];
    const cdEnd = room.countdown_end_at ? Date.parse(room.countdown_end_at) : 0;
    const remSec = cdEnd > 0 ? Math.max(0, Math.ceil((cdEnd - nowMs) / 1000)) : 30;

    if (roundEl) roundEl.textContent = `대기중 (${players.length}/${room.max_players || 8})`;
    if (timerEl) timerEl.textContent = `⏳ ${remSec}초`;

    const cdBanner = document.getElementById("quizPlazaWaitCountdownText");
    if (cdBanner) {
      cdBanner.textContent = remSec > 0
        ? `⏳ ${remSec}초 후 자동 시작 (빈자리는 AI 봇 자동 투입)`
        : "🚀 게임을 시작하는 중...";
    }

    const slotsEl = document.getElementById("quizPlazaWaitPlayersGrid");
    if (slotsEl) {
      const sig = JSON.stringify(players.map(p => p.id + (p.id === room.host_id ? "*" : "")));
      if (quizPlazaState.lastStageRenderSig !== sig) {
        quizPlazaState.lastStageRenderSig = sig;
        const maxS = room.max_players || QUIZ_PLAZA_MAX_PLAYERS;
        const cards = [];
        for (let i = 0; i < maxS; i++) {
          const p = players[i];
          if (p) {
            const imgUrl = getCachedAvatarDataUrl(p.avatarConfig);
            const isHost = p.id === room.host_id;
            const isMe = p.id === userState?.id;
            cards.push(`
              <div class="qplaza-wait-slot is-filled ${isMe ? "is-me" : ""}">
                <img src="${imgUrl}" class="qplaza-slot-av" alt="" />
                <div class="qplaza-slot-nick">${isHost ? "👑 " : ""}${escapePlazaHtml(p.nickname || "도전자")}</div>
              </div>
            `);
          } else {
            cards.push(`
              <div class="qplaza-wait-slot is-empty">
                <div style="font-size:1.4rem;">🤖</div>
                <div class="qplaza-slot-nick">AI 봇 대기</div>
              </div>
            `);
          }
        }
        slotsEl.innerHTML = cards.join("");
      }
    }
    return;
  }

  // ---- B. 실시간 게임 진행 / 종료 상태 ----
  const g = quizPlazaState.game;
  if (waitPane) waitPane.classList.add("hidden");
  if (stagePane) stagePane.classList.remove("hidden");

  if (roundEl) {
    roundEl.textContent = g.phase === "finished"
      ? "🏁 경기 종료"
      : `ROUND ${g.roundIdx + 1} / ${g.questions.length}`;
  }

  const durMs = getPlazaRoundDurationMs(g.gameType);
  if (timerEl) {
    if (g.phase === "finished") {
      timerEl.textContent = "🏁 완료";
    } else if (g.phase === "reveal") {
      timerEl.textContent = "✅ 정답 공개";
    } else {
      const remSec = Math.max(0, Math.ceil((durMs - (nowMs - g.roundStartedAt)) / 1000));
      timerEl.textContent = `⏱️ ${remSec}초`;
    }
  }

  const oxBox = document.getElementById("quizPlazaOxArena");
  const typBox = document.getElementById("quizPlazaTypingArena");
  const clmBox = document.getElementById("quizPlazaClimbArena");
  const finBox = document.getElementById("quizPlazaFinishPanel");

  const isFinished = g.phase === "finished";
  if (oxBox) oxBox.classList.toggle("hidden", isFinished || g.gameType !== "ox");
  if (typBox) typBox.classList.toggle("hidden", isFinished || g.gameType !== "typing");
  if (clmBox) clmBox.classList.toggle("hidden", isFinished || g.gameType !== "climb");
  if (finBox) finBox.classList.toggle("hidden", !isFinished);

  if (typingBar) {
    typingBar.classList.toggle("hidden", isFinished || !(g.gameType === "typing" && g.phase === "round"));
  }

  if (isFinished) {
    stopQuizPlazaClimbAnim();
    const finTxt = document.getElementById("quizPlazaFinishSummary");
    const finRanks = document.getElementById("quizPlazaFinishRankList");
    if (finTxt) finTxt.textContent = g.finishSummaryText || "경기가 종료되었습니다!";
    if (finRanks) {
      const sorted = [...g.participants].sort((a, b) => {
        if (g.gameType === "ox") {
          if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
        }
        return (b.score || 0) - (a.score || 0);
      });
      finRanks.innerHTML = sorted.map((p, idx) => {
        const avUrl = getCachedAvatarDataUrl(p.avatarConfig);
        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}위`;
        const valText = g.gameType === "ox"
          ? (p.eliminated ? "💀 탈락" : "👑 생존!")
          : g.gameType === "climb"
          ? `🪜 ${p.step || 0}단 (${p.score || 0}점)`
          : `${p.score || 0}점`;
        return `
          <div class="qplaza-fin-row ${p.id === userState?.id ? "is-me" : ""}">
            <span class="qplaza-fin-left">
              <strong class="qplaza-fin-rank">${medal}</strong>
              <img src="${avUrl}" class="qplaza-fin-av" alt="" />
              <span>${p.isBot ? "🤖 " : ""}${escapePlazaHtml(p.nickname)}</span>
            </span>
            <strong>${valText}</strong>
          </div>
        `;
      }).join("");
    }
    return;
  }

  if (g.gameType === "ox") {
    stopQuizPlazaClimbAnim();
    try { drawQuizPlazaPlayStageArt("ox", g); } catch (e) {}
    renderQuizPlazaOxView(g);
  } else if (g.gameType === "typing") {
    stopQuizPlazaClimbAnim();
    try { drawQuizPlazaPlayStageArt("typing", g); } catch (e) {}
    renderQuizPlazaTypingView(g);
  } else if (g.gameType === "climb") {
    renderQuizPlazaClimbView(g);
    startQuizPlazaClimbAnim();
  }
}

function renderQuizPlazaOxView(g) {
  const q = g.questions[g.roundIdx];
  const qEl = document.getElementById("quizPlazaOxQuestionText");
  const noteEl = document.getElementById("quizPlazaOxNoteText");
  const me = g.participants.find(p => p.id === userState?.id);
  const specBanner = document.getElementById("quizPlazaOxSpectatorBar");
  const ctrlRow = document.getElementById("quizPlazaOxControls");
  const actorsEl = document.getElementById("quizPlazaOxActorsLayer");

  if (qEl && q) qEl.textContent = q.q;
  if (noteEl) {
    if (g.phase === "reveal" && q) {
      noteEl.textContent = `정답은 [${q.a ? "⭕ O" : "❌ X"}]! — ${q.note}`;
      noteEl.classList.remove("hidden");
    } else {
      noteEl.classList.add("hidden");
    }
  }

  const isEliminated = Boolean(me && me.eliminated);
  if (specBanner) {
    const missed = isEliminated && (me.currentChoice === null || me.currentChoice === undefined);
    specBanner.textContent = missed
      ? "⏰ 제한시간 내 미선택! 중간 대기 구역에서 탈락했습니다 (관전 중)"
      : "👻 탈락하여 관전 중입니다 (끝나면 다시 대기실로 돌아갈 수 있습니다)";
    specBanner.classList.toggle("hidden", !isEliminated);
  }
  if (ctrlRow) ctrlRow.classList.toggle("hidden", isEliminated || g.phase !== "round");

  const oBtn = document.getElementById("quizPlazaOxBtnO");
  const xBtn = document.getElementById("quizPlazaOxBtnX");
  if (oBtn) oBtn.classList.toggle("is-picked", me?.currentChoice === true);
  if (xBtn) xBtn.classList.toggle("is-picked", me?.currentChoice === false);

  if (actorsEl) {
    const alive = g.participants.filter(p => !p.eliminated);
    const aliveIds = new Set(alive.map(p => p.id));

    // 탈락한 액터만 DOM에서 제거 (기존 노드를 유지해 부드러운 좌우 슬라이드 전환!)
    Array.from(actorsEl.children).forEach(node => {
      const aid = node.getAttribute("data-actor-id");
      if (!aliveIds.has(aid)) node.remove();
    });

    const centerGroup = alive.filter(p => p.currentChoice === null || p.currentChoice === undefined);
    const oGroup = alive.filter(p => p.currentChoice === true);
    const xGroup = alive.filter(p => p.currentChoice === false);

    const placeInZone = (group, baseLeft, colStep) => {
      const childNodes = Array.from(actorsEl.children);
      group.forEach((p, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const rows = Math.max(1, Math.ceil(group.length / 2));
        const offsetX = group.length === 1 ? 0 : (col === 0 ? -colStep : colStep);
        const leftPct = baseLeft + offsetX;
        const topPct = rows === 1 ? 58 : 34 + (row / Math.max(1, rows - 1)) * 44;
        const isMe = p.id === userState?.id;

        let el = childNodes.find(n => n.getAttribute("data-actor-id") === String(p.id));
        if (!el) {
          el = document.createElement("div");
          el.className = `qplaza-ring-actor ${isMe ? "is-me" : ""}`;
          el.setAttribute("data-actor-id", p.id);
          const imgUrl = getCachedAvatarDataUrl(p.avatarConfig);
          el.innerHTML = `<img src="${imgUrl}" class="qplaza-actor-img" alt="" /><span class="qplaza-actor-nick">${escapePlazaHtml(p.nickname)}</span>`;
          actorsEl.appendChild(el);
        }
        el.classList.toggle("is-me", isMe);
        el.classList.toggle("is-waiting-center", p.currentChoice === null || p.currentChoice === undefined);
        el.style.left = `${leftPct.toFixed(1)}%`;
        el.style.top = `${topPct.toFixed(1)}%`;
      });
    };

    placeInZone(oGroup, 17.5, 7.5);
    placeInZone(centerGroup, 50, 6.2);
    placeInZone(xGroup, 82.5, 7.5);
  }
}

function renderQuizPlazaTypingView(g) {
  const q = g.questions[g.roundIdx];
  const tagEl = document.getElementById("quizPlazaTypingTypeTag");
  const targetEl = document.getElementById("quizPlazaTypingTargetText");
  const authorEl = document.getElementById("quizPlazaTypingAuthorText");
  const raceEl = document.getElementById("quizPlazaTypingRaceList");

  if (q) {
    if (tagEl) {
      tagEl.textContent = q.type === "lyric"
        ? `🎵 가요 가사 (${q.author || "인기곡"})`
        : q.type === "quote"
        ? "💬 명언 타이핑"
        : "📜 한국 속담";
    }
    if (targetEl) targetEl.textContent = q.text || "";
    if (authorEl) {
      if (q.type === "quote" && q.author) {
        authorEl.textContent = `- ${q.author} -`;
        authorEl.classList.remove("hidden");
      } else {
        authorEl.classList.add("hidden");
      }
    }
    if (g.phase === "round") {
      renderQuizPlazaTypingFeedback(g.typingInputVal || "", String(q.text || ""), Date.now() < (g.typingErrorUntil || 0));
    }
  }

  if (raceEl) {
    const sorted = [...g.participants].sort((a, b) => (b.score || 0) - (a.score || 0));
    raceEl.innerHTML = sorted.map(p => {
      const pct = Math.max(0, Math.min(100, Number(p.typingProgress) || 0));
      const runnerLeft = Math.min(92, Math.max(6, pct));
      const doneTag = p.typingFinishedOrder ? `🏅 ${p.typingFinishedOrder}착` : `${pct}%`;
      const isMe = p.id === userState?.id;
      const imgUrl = getCachedAvatarDataUrl(p.avatarConfig);
      return `
        <div class="qplaza-race-row ${isMe ? "is-me" : ""}">
          <span class="qplaza-race-nick">${p.isBot ? "🤖 " : ""}${escapePlazaHtml(p.nickname)} (${p.score}점)</span>
          <div class="qplaza-race-track">
            <div class="qplaza-race-fill" style="width:${pct}%;"></div>
            <img src="${imgUrl}" class="qplaza-race-runner" style="left:${runnerLeft}%;" alt="" />
          </div>
          <span class="qplaza-race-pct">${doneTag}</span>
        </div>
      `;
    }).join("");
  }
}

function renderQuizPlazaClimbView(g) {
  const q = g.questions[g.roundIdx];
  const qEl = document.getElementById("quizPlazaClimbQuestionText");
  const noteEl = document.getElementById("quizPlazaClimbNoteText");
  const choicesEl = document.getElementById("quizPlazaClimbChoices");
  const me = g.participants.find(p => p.id === userState?.id);

  if (q && qEl) qEl.textContent = q.q;
  if (noteEl) {
    if (g.phase === "reveal" && q) {
      const ansIdx = Number(q.answerIndex) || 0;
      const ansText = Array.isArray(q.choices) ? (q.choices[ansIdx] || "") : "";
      noteEl.textContent = `✅ 정답: ${ansIdx + 1}. ${ansText} — 맞힌 도전자 한 칸 상승!`;
      noteEl.classList.remove("hidden");
    } else {
      noteEl.classList.add("hidden");
    }
  }

  if (choicesEl && q) {
    const myPick = me ? me.currentChoice : null;
    choicesEl.innerHTML = (q.choices || []).map((c, idx) => {
      let cls = "qplaza-climb-choice-btn";
      if (myPick === idx) cls += " is-picked";
      if (g.phase === "reveal") {
        if (idx === Number(q.answerIndex)) cls += " is-correct";
        else if (myPick === idx) cls += " is-wrong";
      }
      const disabled = g.phase !== "round";
      return `<button type="button" class="${cls}" ${disabled ? "disabled" : ""} onclick="selectQuizPlazaClimbChoice(${idx})">${idx + 1}. ${escapePlazaHtml(c)}</button>`;
    }).join("");
  }
}


// 브라우저/웹뷰 종료 시 퀴즈광장 방 안전 퇴장 keepalive 처리 (동기 토큰 사용)
window.addEventListener("pagehide", () => {
  try {
    const roomId = quizPlazaState.currentRoom?.room_id;
    const token = quizPlazaState.cachedAccessToken;
    if (!roomId || quizPlazaState.isLeavingRoom || !token) return;
    if (typeof SUPABASE_URL === "string" && typeof SUPABASE_KEY === "string") {
      fetch(`${SUPABASE_URL}/rest/v1/rpc/leave_quiz_plaza_room`, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ p_room_id: roomId })
      }).catch(() => {});
    }
  } catch (e) {}
});


// ============================================================================
// [V4.0 디자인] 퀴즈광장 전용 정배율 게임 일러스트 무대 렌더러
// ============================================================================
let _lastDrawnPlazaArtSig = "";
let _climbAnimRafId = null;
let _lastClimbFrameTs = 0;

function syncCanvasBufferToCss(cv, fallbackW, fallbackH) {
  if (!cv) return { W: fallbackW, H: fallbackH };
  const cw = cv.clientWidth || (cv.parentElement ? cv.parentElement.clientWidth : 0);
  const ch = cv.clientHeight || (cv.parentElement ? cv.parentElement.clientHeight : 0);
  const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 2));
  if (cw > 16 && ch > 16) {
    const tw = Math.round(cw * dpr);
    const th = Math.round(ch * dpr);
    if (Math.abs(cv.width - tw) > 4 || Math.abs(cv.height - th) > 4) {
      cv.width = tw;
      cv.height = th;
    }
  } else {
    if (cv.width !== fallbackW) cv.width = fallbackW;
    if (cv.height !== fallbackH) cv.height = fallbackH;
  }
  return { W: cv.width, H: cv.height };
}

function stopQuizPlazaClimbAnim() {
  if (_climbAnimRafId) {
    cancelAnimationFrame(_climbAnimRafId);
    _climbAnimRafId = null;
  }
}

function startQuizPlazaClimbAnim() {
  if (_climbAnimRafId) return;
  const loop = ts => {
    const scr = typeof state !== "undefined" ? state.currentScreen : "";
    const g = quizPlazaState.game;
    if (scr !== "quizPlazaPlayScreen" || !g || g.gameType !== "climb" || g.phase === "finished") {
      _climbAnimRafId = null;
      return;
    }
    _climbAnimRafId = requestAnimationFrame(loop);
    if (document.hidden || ts - _lastClimbFrameTs < 33) return;
    _lastClimbFrameTs = ts;
    try { drawQuizPlazaClimbArt(ts); } catch (e) {}
  };
  _climbAnimRafId = requestAnimationFrame(loop);
}

window.drawQuizPlazaLobbyArt = function () {
  const cv = document.getElementById("quizPlazaLobbyCanvas");
  if (!cv) return;
  const { W, H } = syncCanvasBufferToCss(cv, 960, 220);
  const ctx = cv.getContext("2d");
  const u = Math.min(W, H) / 220;
  const outline = "#1e1b18";

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // 축제 밤하늘 + 서치라이트
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#1e1b4b");
  sky.addColorStop(1, "#312e81");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  [[W * 0.22, -0.35], [W * 0.78, 0.35]].forEach(([sx, ang]) => {
    ctx.save();
    ctx.translate(sx, H);
    ctx.rotate(ang);
    const beam = ctx.createLinearGradient(0, 0, 0, -H * 1.4);
    beam.addColorStop(0, "rgba(253, 224, 71, 0.36)");
    beam.addColorStop(1, "rgba(253, 224, 71, 0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(-30 * u, 0);
    ctx.lineTo(-110 * u, -H * 1.3);
    ctx.lineTo(110 * u, -H * 1.3);
    ctx.lineTo(30 * u, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // 삼각 만국기 줄
  const flagCols = ["#f43f5e", "#facc15", "#38bdf8", "#4ade80", "#f97316", "#a855f7"];
  ctx.strokeStyle = "#fde68a";
  ctx.lineWidth = 3 * u;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.10);
  ctx.quadraticCurveTo(W / 2, H * 0.25, W, H * 0.10);
  ctx.stroke();
  for (let i = 0; i < 14; i++) {
    const fx = (W / 14) * i + W * 0.02;
    const t = fx / W;
    const fy = (1 - t) * (1 - t) * (H * 0.10) + 2 * (1 - t) * t * (H * 0.25) + t * t * (H * 0.10);
    ctx.fillStyle = flagCols[i % flagCols.length];
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + 26 * u, fy + 2 * u);
    ctx.lineTo(fx + 13 * u, fy + 26 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 중앙 황금 아치 간판
  const signW = Math.min(W * 0.56, 480 * u);
  const signH = 110 * u;
  const signY = H * 0.34;
  ctx.fillStyle = "#b45309";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 5 * u;
  ctx.beginPath();
  ctx.roundRect(W / 2 - signW / 2, signY, signW, signH, 22 * u);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fef08a";
  ctx.beginPath();
  ctx.roundRect(W / 2 - signW / 2 + 10 * u, signY + 9 * u, signW - 20 * u, signH - 18 * u, 16 * u);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#1e1b18";
  ctx.font = `900 ${Math.round(40 * u)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🎪 QUIZ PLAZA 🏆", W / 2, signY + signH / 2 + 2 * u);

  // 좌우 정원 메달리온
  const medR = 44 * u;
  [
    [W * 0.11, H * 0.60, "#3b82f6", "O/X"],
    [W * 0.89, H * 0.60, "#10b981", "WIN!"]
  ].forEach(([cx, cy, bg, txt]) => {
    ctx.fillStyle = bg;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5 * u;
    ctx.beginPath();
    ctx.arc(cx, cy, medR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${Math.round(23 * u)}px sans-serif`;
    ctx.fillText(txt, cx, cy + 1 * u);
  });

  ctx.restore();
};

function drawQuizPlazaPlayStageArt(theme, g) {
  const cvId = theme === "waiting" ? "quizPlazaWaitBgCanvas" : theme === "ox" ? "quizPlazaOxBgCanvas" : theme === "typing" ? "quizPlazaTypingBgCanvas" : "";
  const cv = cvId ? document.getElementById(cvId) : null;
  const cw = cv ? cv.clientWidth : 0;
  const ch = cv ? cv.clientHeight : 0;
  const roundKey = g ? `${g.roundIdx}_${g.phase}` : "wait";
  const sig = `${theme}_${roundKey}_${cw}x${ch}`;
  if (sig === _lastDrawnPlazaArtSig) return;
  _lastDrawnPlazaArtSig = sig;

  if (theme === "waiting") drawQuizPlazaWaitingArt();
  else if (theme === "ox") drawQuizPlazaOxArt(g);
  else if (theme === "typing") drawQuizPlazaTypingArt();
}

function drawQuizPlazaWaitingArt() {
  const cv = document.getElementById("quizPlazaWaitBgCanvas");
  if (!cv) return;
  const { W, H } = syncCanvasBufferToCss(cv, 960, 190);
  const ctx = cv.getContext("2d");
  const u = Math.min(W, H) / 190;
  const outline = "#1e1b18";

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, W, H);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#2563eb");
  sky.addColorStop(0.68, "#60a5fa");
  sky.addColorStop(0.7, "#fde047");
  sky.addColorStop(1, "#f59e0b");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 4 * u;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.69);
  ctx.lineTo(W, H * 0.69);
  ctx.stroke();

  const stripes = ["#ef4444", "#fef08a"];
  const nStripes = 16;
  const sw = W / nStripes;
  for (let i = 0; i < nStripes; i++) {
    ctx.fillStyle = stripes[i % 2];
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3.5 * u;
    ctx.fillRect(i * sw, 0, sw, 20 * u);
    ctx.strokeRect(i * sw, 0, sw, 20 * u);
    ctx.beginPath();
    ctx.arc(i * sw + sw / 2, 20 * u, sw / 2, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  const bw = Math.min(W * 0.56, 420 * u);
  const bh = 72 * u;
  ctx.fillStyle = "#1e1b4b";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4.5 * u;
  ctx.beginPath();
  ctx.roundRect(W / 2 - bw / 2, H * 0.34, bw, bh, 18 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fde047";
  ctx.font = `900 ${Math.round(30 * u)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✨ 도전자 집결 무대 ✨", W / 2, H * 0.34 + bh / 2);

  ctx.restore();
}

function drawQuizPlazaOxArt(g) {
  const cv = document.getElementById("quizPlazaOxBgCanvas");
  if (!cv) return;
  const { W, H } = syncCanvasBufferToCss(cv, 760, 420);
  const ctx = cv.getContext("2d");
  const u = Math.min(W, H) / 400;
  const outline = "#1e1b18";
  const isReveal = g?.phase === "reveal";
  const q = g?.questions?.[g.roundIdx];

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // 1) 아레나 천장 + 관중석 실루엣 + 스포트라이트
  const arenaBg = ctx.createLinearGradient(0, 0, 0, H * 0.34);
  arenaBg.addColorStop(0, "#0f172a");
  arenaBg.addColorStop(1, "#1e293b");
  ctx.fillStyle = arenaBg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#334155";
  const fanStep = 34 * u;
  for (let x = 22 * u; x < W; x += fanStep) {
    ctx.beginPath();
    ctx.arc(x, H * 0.25 + ((Math.round(x) % 3) * 4 * u), 11 * u, 0, Math.PI * 2);
    ctx.fill();
  }

  // 스포트라이트 (O 구역 & X 구역)
  [[W * 0.175, "#60a5fa"], [W * 0.825, "#fb7185"]].forEach(([sx, col]) => {
    const beam = ctx.createRadialGradient(sx, 14 * u, 6 * u, sx, H * 0.52, Math.max(W, H) * 0.45);
    beam.addColorStop(0, col + "50");
    beam.addColorStop(1, col + "00");
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, W, H * 0.88);
  });

  // 2) 3분할 링 매트 (좌 Blue O [0..35%] | 중앙 대기 구역 [35..65%] | 우 Red X [65..100%])
  const matTop = H * 0.28;
  const matH = H - matTop;
  const xLeftEnd = W * 0.35;
  const xRightStart = W * 0.65;

  // O 매트 & X 매트
  ctx.fillStyle = isReveal && q?.a === true ? "#bfdbfe" : "#dbeafe";
  ctx.fillRect(0, matTop, xLeftEnd, matH);
  ctx.fillStyle = isReveal && q?.a === false ? "#fecaca" : "#fee2e2";
  ctx.fillRect(xRightStart, matTop, W - xRightStart, matH);

  // 중앙 대기 다리/구역 (미선택 시 탈락)
  ctx.fillStyle = isReveal ? "#1e293b" : "#fef9c3";
  ctx.fillRect(xLeftEnd, matTop, xRightStart - xLeftEnd, matH);

  // 중앙 상하 위험 사선 띠 (대기 구역 경고)
  ctx.save();
  ctx.beginPath();
  ctx.rect(xLeftEnd, matTop, xRightStart - xLeftEnd, 22 * u);
  ctx.clip();
  ctx.fillStyle = isReveal ? "#dc2626" : "#f59e0b";
  for (let sx = xLeftEnd - 40 * u; sx < xRightStart + 40 * u; sx += 24 * u) {
    ctx.beginPath();
    ctx.moveTo(sx, matTop + 22 * u);
    ctx.lineTo(sx + 12 * u, matTop);
    ctx.lineTo(sx + 24 * u, matTop);
    ctx.lineTo(sx + 12 * u, matTop + 22 * u);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 중앙 구역 라벨
  ctx.fillStyle = isReveal ? "#fca5a5" : "#92400e";
  ctx.font = `900 ${Math.round(18 * u)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(isReveal ? "💀 미선택 탈락!" : "⏳ 대기 구역", W * 0.5, matTop + matH - 22 * u);

  // 구역 경계선 2줄
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4.5 * u;
  [xLeftEnd, xRightStart].forEach(lx => {
    ctx.beginPath();
    ctx.moveTo(lx, matTop);
    ctx.lineTo(lx, H);
    ctx.stroke();
  });

  // 링 바닥 정원 O 마크 (진정한 원!) & X 마크 (1:1 비례)
  const markCy = matTop + matH * 0.54;
  const oRad = Math.min(xLeftEnd * 0.34, matH * 0.32);
  ctx.strokeStyle = isReveal && q?.a === true ? "rgba(37, 99, 235, 0.72)" : "rgba(37, 99, 235, 0.34)";
  ctx.lineWidth = 16 * u;
  ctx.beginPath();
  ctx.arc(xLeftEnd * 0.5, markCy, oRad, 0, Math.PI * 2);
  ctx.stroke();

  const xHalf = Math.min((W - xRightStart) * 0.30, matH * 0.28);
  const xCx = xRightStart + (W - xRightStart) * 0.5;
  ctx.strokeStyle = isReveal && q?.a === false ? "rgba(220, 38, 38, 0.72)" : "rgba(220, 38, 38, 0.34)";
  ctx.lineWidth = 16 * u;
  ctx.beginPath();
  ctx.moveTo(xCx - xHalf, markCy - xHalf);
  ctx.lineTo(xCx + xHalf, markCy + xHalf);
  ctx.moveTo(xCx + xHalf, markCy - xHalf);
  ctx.lineTo(xCx - xHalf, markCy + xHalf);
  ctx.stroke();

  // 정답 구역 골든 승리 테두리 강조
  if (isReveal && q) {
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 7 * u;
    if (q.a) ctx.strokeRect(4 * u, matTop + 4 * u, xLeftEnd - 8 * u, matH - 8 * u);
    else ctx.strokeRect(xRightStart + 4 * u, matTop + 4 * u, (W - xRightStart) - 8 * u, matH - 8 * u);
  }

  // 3) 링 로프 3줄 + 좌우 포스트 + 중앙 대기 배지
  [H * 0.14, H * 0.21, H * 0.28].forEach((ry, idx) => {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 7.5 * u;
    ctx.beginPath();
    ctx.moveTo(16 * u, ry);
    ctx.lineTo(W - 16 * u, ry);
    ctx.stroke();
    ctx.strokeStyle = idx === 1 ? "#fef08a" : "#ffffff";
    ctx.lineWidth = 3.8 * u;
    ctx.stroke();
  });

  [
    [12 * u, "#2563eb", "O"],
    [W - 38 * u, "#dc2626", "X"]
  ].forEach(([px, col, lbl]) => {
    ctx.fillStyle = col;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.roundRect(px, H * 0.08, 26 * u, H * 0.24, 6 * u);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${Math.round(17 * u)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(lbl, px + 13 * u, H * 0.14);
  });

  // 중앙 VS 메달 (1:1 정원)
  ctx.fillStyle = "#facc15";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4.5 * u;
  ctx.beginPath();
  ctx.arc(W / 2, matTop, 26 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1e1b18";
  ctx.font = `900 ${Math.round(17 * u)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("VS", W / 2, matTop + 1 * u);

  ctx.restore();
}

function drawQuizPlazaTypingArt() {
  const cv = document.getElementById("quizPlazaTypingBgCanvas");
  if (!cv) return;
  const { W, H } = syncCanvasBufferToCss(cv, 960, 190);
  const ctx = cv.getContext("2d");
  const u = Math.min(W, H) / 190;
  const outline = "#1e1b18";

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.72);
  sky.addColorStop(0, "#ea580c");
  sky.addColorStop(0.55, "#fb923c");
  sky.addColorStop(1, "#fef08a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 정원 사막 태양
  ctx.fillStyle = "#fffbeb";
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 4 * u;
  ctx.beginPath();
  ctx.arc(W * 0.80, H * 0.36, 40 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 사막 궁전 실루엣
  ctx.fillStyle = "#b45309";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4 * u;
  ctx.fillRect(W * 0.28, H * 0.32, 22 * u, H * 0.44);
  ctx.strokeRect(W * 0.28, H * 0.32, 22 * u, H * 0.44);
  ctx.fillRect(W * 0.62, H * 0.32, 22 * u, H * 0.44);
  ctx.strokeRect(W * 0.62, H * 0.32, 22 * u, H * 0.44);
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.arc(W * 0.48, H * 0.56, 56 * u, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d97706";
  ctx.fillRect(W * 0.36, H * 0.56, W * 0.24, H * 0.30);
  ctx.strokeRect(W * 0.36, H * 0.56, W * 0.24, H * 0.30);

  // 앞 모래언덕
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.80);
  ctx.quadraticCurveTo(W * 0.28, H * 0.55, W * 0.58, H * 0.78);
  ctx.quadraticCurveTo(W * 0.82, H * 0.62, W, H * 0.76);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 야자수
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 8 * u;
  ctx.beginPath();
  ctx.moveTo(W * 0.12, H * 0.90);
  ctx.quadraticCurveTo(W * 0.14, H * 0.60, W * 0.17, H * 0.38);
  ctx.stroke();
  ctx.fillStyle = "#16a34a";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3.5 * u;
  [-0.6, 0, 0.6].forEach(ang => {
    ctx.save();
    ctx.translate(W * 0.17, H * 0.38);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.ellipse(22 * u, 0, 24 * u, 9 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  // 간판 배지
  ctx.fillStyle = "rgba(30, 27, 24, 0.78)";
  ctx.beginPath();
  ctx.roundRect(18 * u, 16 * u, 232 * u, 42 * u, 999);
  ctx.fill();
  ctx.fillStyle = "#fde047";
  ctx.font = `900 ${Math.round(20 * u)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🏜️ 사막 타자왕 레이스", 134 * u, 37 * u);

  ctx.restore();
}

function drawQuizPlazaClimbArt(ts = performance.now()) {
  const cv = document.getElementById("quizPlazaClimbBgCanvas");
  if (!cv) return;
  const g = quizPlazaState.game;
  const { W, H } = syncCanvasBufferToCss(cv, 760, 440);
  const ctx = cv.getContext("2d");
  const u = Math.min(W, H) / 400;
  const outline = "#1e1b18";
  const t = ts * 0.001;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // 1) 계곡 하늘 & 뭉게구름
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.85);
  sky.addColorStop(0, "#0284c7");
  sky.addColorStop(0.45, "#7dd3fc");
  sky.addColorStop(1, "#e0f2fe");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  [[0.22, 0.24, 1.0], [0.76, 0.20, 0.85]].forEach(([cxp, cyp, cs]) => {
    const cx = ((W * cxp + t * 8) % (W + 120 * u)) - 60 * u;
    const cy = H * cyp;
    ctx.beginPath();
    ctx.arc(cx - 22 * u * cs, cy + 4 * u, 16 * u * cs, 0, Math.PI * 2);
    ctx.arc(cx, cy - 4 * u, 22 * u * cs, 0, Math.PI * 2);
    ctx.arc(cx + 22 * u * cs, cy + 4 * u, 15 * u * cs, 0, Math.PI * 2);
    ctx.fill();
  });

  // 좌우 푸른 협곡 절벽
  ctx.fillStyle = "#22c55e";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4 * u;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.28);
  ctx.lineTo(W * 0.14, H * 0.42);
  ctx.lineTo(W * 0.06, H * 0.85);
  ctx.lineTo(0, H * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(W, H * 0.25);
  ctx.lineTo(W * 0.86, H * 0.40);
  ctx.lineTo(W * 0.94, H * 0.85);
  ctx.lineTo(W, H * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2) 고도 가이드선 (0단계 ~ 10단계 목표선)
  const ceilY = Math.max(24 * u, H * 0.085);
  const waterTop = H * 0.82;
  const step0Y = waterTop - 40 * u;
  const step10Y = ceilY + 62 * u;

  ctx.save();
  ctx.setLineDash([6 * u, 6 * u]);
  ctx.strokeStyle = "rgba(14, 116, 144, 0.22)";
  ctx.lineWidth = 2 * u;
  [2, 4, 6, 8, 10].forEach(lvl => {
    const gy = step0Y - (lvl / QUIZ_PLAZA_ROUNDS_COUNT) * (step0Y - step10Y);
    ctx.beginPath();
    ctx.moveTo(16 * u, gy);
    ctx.lineTo(W - 16 * u, gy);
    ctx.stroke();
    ctx.fillStyle = lvl === 10 ? "#b45309" : "rgba(15, 23, 42, 0.45)";
    ctx.font = `900 ${Math.round(11 * u)}px sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(lvl === 10 ? "👑 10단" : `${lvl}단`, W - 10 * u, gy - 8 * u);
  });
  ctx.restore();

  // 3) 천장 목재 들보 (도르래 밧줄 지지대)
  ctx.fillStyle = "#92400e";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4.5 * u;
  ctx.fillRect(0, 0, W, ceilY);
  ctx.strokeRect(-2, -2, W + 4, ceilY + 2);
  ctx.fillStyle = "#d97706";
  ctx.fillRect(0, 0, W, ceilY * 0.35);

  // 4) 천장 밧줄 + 바구니 탄 각 캐릭터들
  const list = g && Array.isArray(g.participants) ? g.participants : [];
  const q = g && g.questions ? g.questions[g.roundIdx] : null;
  const n = Math.max(1, list.length);
  const spanW = W * 0.86;
  const startX = W * 0.07;

  list.forEach((p, idx) => {
    const targetStep = Math.max(0, Math.min(QUIZ_PLAZA_ROUNDS_COUNT, Number(p.step) || 0));
    if (typeof p.visualStep !== "number") p.visualStep = targetStep;
    p.visualStep += (targetStep - p.visualStep) * 0.16;

    const laneX = startX + ((idx + 0.5) / n) * spanW;
    const laneW = spanW / n;
    const basketW = Math.min(laneW * 0.82, 62 * u);
    const basketH = basketW * 0.52;
    const isMe = p.id === userState?.id;

    // 도르래 바퀴
    ctx.fillStyle = "#fde047";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.arc(laneX, ceilY, 7.5 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const sway = Math.sin(t * 2.4 + idx * 1.1) * 2.5 * u;
    const basketCenterY = step0Y - (p.visualStep / QUIZ_PLAZA_ROUNDS_COUNT) * (step0Y - step10Y);
    const bx = laneX + sway;
    const bridleY = basketCenterY - basketH * 0.92;

    // 천장 -> 바구니까지 수직 밧줄
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5.5 * u;
    ctx.beginPath();
    ctx.moveTo(laneX, ceilY);
    ctx.lineTo(bx, bridleY);
    ctx.stroke();
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 2.8 * u;
    ctx.stroke();

    // 바구니 양옆 Y-브라이들 밧줄
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.moveTo(bx, bridleY);
    ctx.lineTo(bx - basketW * 0.42, basketCenterY - basketH * 0.25);
    ctx.moveTo(bx, bridleY);
    ctx.lineTo(bx + basketW * 0.42, basketCenterY - basketH * 0.25);
    ctx.stroke();
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 2 * u;
    ctx.stroke();

    // 바구니 뒷면 테두리
    ctx.fillStyle = "#78350f";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.ellipse(bx, basketCenterY - basketH * 0.22, basketW * 0.46, 6 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 바구니 안에 탄 480×480 유저 아바타 캐릭터
    const avCanvas = getCachedAvatarCanvas(p.avatarConfig);
    if (avCanvas) {
      const avSize = basketW * 0.96;
      ctx.drawImage(avCanvas, bx - avSize / 2, basketCenterY - basketH * 0.22 - avSize * 0.68, avSize, avSize);
    }

    // 바구니 앞면 (짜임 디테일)
    ctx.fillStyle = isMe ? "#f59e0b" : "#d97706";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3.2 * u;
    ctx.beginPath();
    ctx.moveTo(bx - basketW * 0.48, basketCenterY - basketH * 0.22);
    ctx.lineTo(bx + basketW * 0.48, basketCenterY - basketH * 0.22);
    ctx.lineTo(bx + basketW * 0.36, basketCenterY + basketH * 0.48);
    ctx.lineTo(bx - basketW * 0.36, basketCenterY + basketH * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 바구니 위 입체 짜임 라인
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.moveTo(bx - basketW * 0.42, basketCenterY + basketH * 0.08);
    ctx.lineTo(bx + basketW * 0.42, basketCenterY + basketH * 0.08);
    ctx.stroke();

    // 바구니 위 닉네임 + 층수 배지
    const labelText = isMe ? `★나(${targetStep})` : `${String(p.nickname || "").slice(0, 3)}(${targetStep})`;
    const labelY = basketCenterY + basketH * 0.48 + 11 * u;
    const pillW = Math.max(basketW * 0.92, 52 * u);
    ctx.fillStyle = isMe ? "#fde047" : "rgba(15, 23, 42, 0.84)";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.2 * u;
    ctx.beginPath();
    ctx.roundRect(bx - pillW / 2, labelY - 8 * u, pillW, 17 * u, 999);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isMe ? "#1e1b18" : "#ffffff";
    ctx.font = `900 ${Math.round(10 * u)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labelText, bx, labelY + 0.5 * u);

    // 정답 공개(reveal) 시 상승 / 오답 이펙트
    if (g && g.phase === "reveal" && q) {
      const ok = Number(p.currentChoice) === Number(q.answerIndex);
      ctx.font = `900 ${Math.round(12 * u)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = ok ? "#16a34a" : "#dc2626";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3 * u;
      const fxTxt = ok ? "▲ UP!" : "💦";
      const fxY = basketCenterY - basketH * 0.95;
      ctx.strokeText(fxTxt, bx, fxY);
      ctx.fillText(fxTxt, bx, fxY);
    }
  });

  // 5) 맨 아래 출렁이며 흐르는 강물
  const river = ctx.createLinearGradient(0, waterTop, 0, H);
  river.addColorStop(0, "#0ea5e9");
  river.addColorStop(0.35, "#0284c7");
  river.addColorStop(1, "#0369a1");
  ctx.fillStyle = river;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, waterTop);
  for (let x = 0; x <= W; x += 18 * u) {
    const wy = waterTop + Math.sin(x * 0.025 / u - t * 4.2) * 5 * u;
    ctx.lineTo(x, wy);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  // 물결 상단 하얀 물거품 테두리
  ctx.strokeStyle = "#e0f2fe";
  ctx.lineWidth = 3.5 * u;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 18 * u) {
    const wy = waterTop + Math.sin(x * 0.025 / u - t * 4.2) * 5 * u;
    if (x === 0) ctx.moveTo(x, wy);
    else ctx.lineTo(x, wy);
  }
  ctx.stroke();

  // 흐르는 물줄기 잔물결
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 2.8 * u;
  for (let r = 0; r < 6; r++) {
    const rx = ((r * (W / 5) + t * 90 * u) % (W + 80 * u)) - 40 * u;
    const ry = waterTop + 18 * u + (r % 3) * 14 * u;
    ctx.beginPath();
    ctx.moveTo(rx - 22 * u, ry);
    ctx.lineTo(rx + 22 * u, ry);
    ctx.stroke();
  }

  ctx.restore();
}
