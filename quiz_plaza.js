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

function getCachedAvatarDataUrl(avatarCfg) {
  const clean = typeof sanitizeAvatarConfigShape === "function"
    ? sanitizeAvatarConfigShape(avatarCfg || {})
    : (avatarCfg || {});
  const key = JSON.stringify(clean);
  if (quizPlazaState.avatarDataUrlCache.has(key)) {
    return quizPlazaState.avatarDataUrlCache.get(key);
  }
  const cv = document.createElement("canvas");
  cv.width = 160;
  cv.height = 160;
  if (typeof renderPixelAvatar === "function") {
    try {
      renderPixelAvatar(cv, clean, { transparentBg: true, matchCssAspect: false, skipEffectLoop: true });
    } catch (e) {}
  }
  const url = cv.toDataURL();
  quizPlazaState.avatarDataUrlCache.set(key, url);
  if (quizPlazaState.avatarDataUrlCache.size > 60) {
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
    ox: { label: "🥊 OX 퀴즈", sub: "권투 링 생존전 · 10문제 생존 시 500 CD / 125 EXP", cls: "is-ox" },
    typing: { label: "🏜️ 타자왕", sub: "사막 궁전 선착순 · 1등 300 / 2등 200 / 3등 100 CD", cls: "is-typing" },
    climb: { label: "🏞️ 올라강", sub: "강가 10계단 상식 · 최고점 전원 300 CD / 75 EXP", cls: "is-climb" }
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

      return `
        <button type="button" class="qplaza-room-card ${meta.cls} ${isPlaying ? "is-playing" : ""}" ${isPlaying ? "disabled" : ""} onclick="joinQuizPlazaRoom('${escapePlazaHtml(room.room_id)}')">
          <div class="qplaza-room-top">
            <strong class="qplaza-room-title">${escapePlazaHtml(room.title)}</strong>
            ${statusBadge}
          </div>
          <div class="qplaza-room-mid">
            <span class="qplaza-player-cnt">👥 유저 ${players.length}/${room.max_players || 8}명 (+AI충원)</span>
            <span class="qplaza-countdown-txt">${timeText}</span>
          </div>
        </button>
      `;
    }).join("");

    return `
      <div class="qplaza-group-box">
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

    if (typeof switchScreen === "function") switchScreen("quizPlazaPlayScreen");
    setupQuizPlazaRoomRuntime(data.room);
    renderQuizPlazaPlayScreen();
  } catch (e) {
    openQuizPlazaScreen();
  }
};

function clearQuizPlazaRoomTimers() {
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
  return 12000; // climb
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
      const delay = Math.max(250, Math.round(1500 + Math.random() * 3500 - elapsed));
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
  if (me.currentChoice !== null && me.currentChoice !== undefined) return; // 한 번 고르면 확정
  applyParticipantChoice(userState.id, Number(choiceIdx), g.roundIdx);
  sendPlazaBroadcast({ type: "choice", roundIdx: g.roundIdx, playerId: userState.id, choice: Number(choiceIdx) });
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

  const titleEl = document.getElementById("quizPlazaPlayTitle");
  const roundEl = document.getElementById("quizPlazaPlayRoundBadge");
  const timerEl = document.getElementById("quizPlazaPlayTimerPill");
  const waitPane = document.getElementById("quizPlazaWaitingView");
  const stagePane = document.getElementById("quizPlazaGameView");
  const typingBar = document.getElementById("quizPlazaTypingBar");

  if (titleEl) titleEl.textContent = room.title || "🎪 퀴즈광장";
  const nowMs = getPlazaServerNowMs();

  // ---- A. 대기실 상태 ----
  if (room.status === "waiting" || !quizPlazaState.game) {
    if (waitPane) waitPane.classList.remove("hidden");
    if (stagePane) stagePane.classList.add("hidden");
    if (typingBar) typingBar.classList.add("hidden");

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

  if (oxBox) oxBox.classList.toggle("hidden", g.gameType !== "ox");
  if (typBox) typBox.classList.toggle("hidden", g.gameType !== "typing");
  if (clmBox) clmBox.classList.toggle("hidden", g.gameType !== "climb");
  if (finBox) finBox.classList.toggle("hidden", g.phase !== "finished");

  if (typingBar) {
    typingBar.classList.toggle("hidden", !(g.gameType === "typing" && g.phase === "round"));
  }

  if (g.phase === "finished") {
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
      finRanks.innerHTML = sorted.map((p, idx) => `
        <div class="qplaza-fin-row ${p.id === userState?.id ? "is-me" : ""}">
          <span>${idx + 1}위 · ${p.isBot ? "🤖 " : ""}${escapePlazaHtml(p.nickname)}</span>
          <strong>${g.gameType === "ox" ? (p.eliminated ? "탈락" : "👑 생존!") : `${p.score}점`}</strong>
        </div>
      `).join("");
    }
  }

  if (g.gameType === "ox") renderQuizPlazaOxView(g);
  else if (g.gameType === "typing") renderQuizPlazaTypingView(g);
  else if (g.gameType === "climb") renderQuizPlazaClimbView(g);
}

function renderQuizPlazaOxView(g) {
  const q = g.questions[g.roundIdx];
  const qEl = document.getElementById("quizPlazaOxQuestionText");
  const noteEl = document.getElementById("quizPlazaOxNoteText");
  const me = g.participants.find(p => p.id === userState?.id);
  const specBanner = document.getElementById("quizPlazaOxSpectatorBar");
  const ctrlRow = document.getElementById("quizPlazaOxControls");
  const actorsEl = document.getElementById("quizPlazaOxActorsLayer");

  if (qEl && q) qEl.textContent = g.phase === "finished" ? "🥊 OX 서바이벌 종료!" : q.q;
  if (noteEl) {
    if (g.phase === "reveal" && q) {
      noteEl.textContent = `정답은 [${q.a ? "⭕ O" : "❌ X"}]! — ${q.note}`;
      noteEl.classList.remove("hidden");
    } else {
      noteEl.classList.add("hidden");
    }
  }

  const isEliminated = Boolean(me && me.eliminated);
  if (specBanner) specBanner.classList.toggle("hidden", !isEliminated || g.phase === "finished");
  if (ctrlRow) ctrlRow.classList.toggle("hidden", isEliminated || g.phase !== "round");

  const oBtn = document.getElementById("quizPlazaOxBtnO");
  const xBtn = document.getElementById("quizPlazaOxBtnX");
  if (oBtn) oBtn.classList.toggle("is-picked", me?.currentChoice === true);
  if (xBtn) xBtn.classList.toggle("is-picked", me?.currentChoice === false);

  if (actorsEl) {
    const alive = g.participants.filter(p => !p.eliminated);
    actorsEl.innerHTML = alive.map((p, idx) => {
      const imgUrl = getCachedAvatarDataUrl(p.avatarConfig);
      let leftPct = 42 + ((idx % 4) - 1.5) * 8;
      if (p.currentChoice === true) leftPct = 10 + (idx % 3) * 11;
      else if (p.currentChoice === false) leftPct = 62 + (idx % 3) * 11;
      const topPct = 36 + Math.floor(idx / 3) * 26;
      const isMe = p.id === userState?.id;
      return `
        <div class="qplaza-ring-actor ${isMe ? "is-me" : ""}" style="left:${leftPct}%; top:${topPct}%;">
          <img src="${imgUrl}" class="qplaza-actor-img" alt="" />
          <span class="qplaza-actor-nick">${escapePlazaHtml(p.nickname)}</span>
        </div>
      `;
    }).join("");
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
      const doneTag = p.typingFinishedOrder ? `🏅 ${p.typingFinishedOrder}착` : `${pct}%`;
      const isMe = p.id === userState?.id;
      return `
        <div class="qplaza-race-row ${isMe ? "is-me" : ""}">
          <span class="qplaza-race-nick">${p.isBot ? "🤖 " : ""}${escapePlazaHtml(p.nickname)} (${p.score}점)</span>
          <div class="qplaza-race-track">
            <div class="qplaza-race-fill" style="width:${pct}%;"></div>
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
  const choicesEl = document.getElementById("quizPlazaClimbChoices");
  const stairsEl = document.getElementById("quizPlazaClimbStairsLayer");
  const me = g.participants.find(p => p.id === userState?.id);

  if (q && qEl) qEl.textContent = g.phase === "finished" ? "🏞️ 올라강 10라운드 완료!" : q.q;

  if (choicesEl && q && g.phase !== "finished") {
    const myPick = me ? me.currentChoice : null;
    choicesEl.innerHTML = (q.choices || []).map((c, idx) => {
      let cls = "qplaza-climb-choice-btn";
      if (myPick === idx) cls += " is-picked";
      if (g.phase === "reveal") {
        if (idx === Number(q.answerIndex)) cls += " is-correct";
        else if (myPick === idx) cls += " is-wrong";
      }
      const disabled = g.phase !== "round" || (myPick !== null && myPick !== undefined);
      return `<button type="button" class="${cls}" ${disabled ? "disabled" : ""} onclick="selectQuizPlazaClimbChoice(${idx})">${idx + 1}. ${escapePlazaHtml(c)}</button>`;
    }).join("");
  }

  if (stairsEl) {
    const sorted = [...g.participants].sort((a, b) => (b.step || 0) - (a.step || 0));
    stairsEl.innerHTML = sorted.map((p, idx) => {
      const imgUrl = getCachedAvatarDataUrl(p.avatarConfig);
      const stepPct = Math.min(92, 6 + (Number(p.step) || 0) * 8.4);
      const isMe = p.id === userState?.id;
      return `
        <div class="qplaza-climb-lane ${isMe ? "is-me" : ""}">
          <span class="qplaza-climb-name">${p.isBot ? "🤖 " : ""}${escapePlazaHtml(p.nickname)}</span>
          <div class="qplaza-climb-bar">
            <div class="qplaza-climb-avatar" style="left:${stepPct}%;">
              <img src="${imgUrl}" alt="" />
            </div>
          </div>
          <span class="qplaza-climb-step">${p.step}/10</span>
        </div>
      `;
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
