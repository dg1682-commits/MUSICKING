// ============================================================================
// [음악왕 v4.0] Supabase 클라우드 연동 · 대기실/방 분리 · 프로필 전적 · 상용 친구창 (online.js)
// - 대기실: 방 목록 + 접속 유저 리스트(닉네임 왼쪽에 480x480 캐릭터 아이콘)
// - 방 내부: 방에 입장한 유저들의 캐릭터만 맵에 표시 + 방 내부 전용 채팅 + 혼자 나갈 시 방 자동 삭제
// - 좌측 상단 내 닉네임 클릭 시: 통산 전적 & 최고 점수 & 내 랭킹 순위 프로필 팝업 표시
// ============================================================================

// [V2.0 본섭(Production) Supabase]
// 테섭(Staging): "https://ntayjjpakcbtrqdppjle.supabase.co" / "sb_publishable_tGc8gA_738CIahaHy71CUQ_SlHhT7JE"
const SUPABASE_URL = "https://szafomntmenppcbczrwl.supabase.co";
const SUPABASE_KEY = "sb_publishable_msR49lWjgSJQnMQxSzIaug_XXlJUd4Z";

let sbClient = null;
window.mkSupabaseAccessToken = "";
if (window.supabase && window.supabase.createClient) {
  sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  try {
    sbClient.auth.onAuthStateChange((_event, session) => {
      window.mkSupabaseAccessToken = session?.access_token || "";
    });
  } catch (e) {}
}

// ============================================================================
// 커스텀 상용 게임 모달 팝업 (시스템 alert/confirm/prompt 완전 대체)
// ============================================================================
window.gameAlert = function (message, title = "👑 음악왕 알림") {
  const modal = document.getElementById("customDialogModal");
  if (!modal) return;
  document.getElementById("dialogTitle").textContent = title;
  document.getElementById("dialogMessage").innerHTML = String(message).replace(/\n/g, "<br/>");
  document.getElementById("dialogInputWrap").classList.add("hidden");
  document.getElementById("dialogCancelBtn").classList.add("hidden");

  const okBtn = document.getElementById("dialogConfirmBtn");
  okBtn.textContent = "확인";
  okBtn.onclick = () => modal.classList.add("hidden");
  modal.classList.remove("hidden");
};

window.gameConfirm = function (message, onConfirm, title = "✨ 확인해주세요", onCancel = null) {
  const modal = document.getElementById("customDialogModal");
  if (!modal) return;
  document.getElementById("dialogTitle").textContent = title;
  document.getElementById("dialogMessage").innerHTML = String(message).replace(/\n/g, "<br/>");
  document.getElementById("dialogInputWrap").classList.add("hidden");

  const cancelBtn = document.getElementById("dialogCancelBtn");
  cancelBtn.classList.remove("hidden");
  cancelBtn.textContent = "취소";
  cancelBtn.onclick = () => {
    modal.classList.add("hidden");
    if (typeof onCancel === "function") onCancel();
  };

  const okBtn = document.getElementById("dialogConfirmBtn");
  okBtn.textContent = "확인";
  okBtn.onclick = () => {
    modal.classList.add("hidden");
    if (typeof onConfirm === "function") onConfirm();
  };
  modal.classList.remove("hidden");
};

window.gamePrompt = function (message, defaultValue = "", onConfirm, title = "✏️ 입력하기") {
  const modal = document.getElementById("customDialogModal");
  if (!modal) return;
  document.getElementById("dialogTitle").textContent = title;
  document.getElementById("dialogMessage").innerHTML = String(message).replace(/\n/g, "<br/>");

  const inputWrap = document.getElementById("dialogInputWrap");
  const inputEl = document.getElementById("dialogPromptInput");
  inputWrap.classList.remove("hidden");
  inputEl.value = defaultValue;

  const cancelBtn = document.getElementById("dialogCancelBtn");
  cancelBtn.classList.remove("hidden");
  cancelBtn.textContent = "취소";
  cancelBtn.onclick = () => modal.classList.add("hidden");

  const okBtn = document.getElementById("dialogConfirmBtn");
  okBtn.textContent = "완료";
  okBtn.onclick = () => {
    const val = inputEl.value.trim();
    modal.classList.add("hidden");
    if (typeof onConfirm === "function") onConfirm(val);
  };
  modal.classList.remove("hidden");
  setTimeout(() => inputEl.focus(), 60);
};

// ============================================================================
// 유저 상태 및 헤더/로비 동기화
// ============================================================================
const DEFAULT_BATTLE_STATS = {
  "1v1": { wins: 0, losses: 0 },
  "4p": { wins: 0, losses: 0 }
};

function normalizeBattleStats(raw) {
  const s = raw || {};
  return {
    "1v1": { wins: Number(s["1v1"]?.wins) || 0, losses: Number(s["1v1"]?.losses) || 0 },
    "4p": { wins: Number(s["4p"]?.wins) || 0, losses: Number(s["4p"]?.losses) || 0 }
  };
}

function formatBattleStatText(statObj) {
  const w = Number(statObj?.wins) || 0;
  const l = Number(statObj?.losses) || 0;
  const total = w + l;
  const pct = total > 0 ? Math.round((w / total) * 100) : 0;
  return `${total}전 ${w}승 ${l}패 (${pct}%)`;
}

const userState = {
  id: null,
  nickname: "게스트도전자",
  bio: "안녕하세요! 음악왕 도전자입니다.",
  cdCoins: 100,
  arcadeCoins: 0,
  goldenCoins: 0,
  ownedEffects: [],
  exp: 0,
  claimedTopRanks: {},
  battleStats: normalizeBattleStats(DEFAULT_BATTLE_STATS),
  blockedUsers: [],
  hiddenDmPeers: {},
  fishingDaily: null,
  fishingLive: null,
  fishBag: [],
  fishDex: {},
  inventory: {},
  equippedItems: [],
  dailyState: null,
  v2BaitMigrated: false,
  v32WelcomeGranted: false,
  v32WelcomeOpened: false,
  v32TutorialDone: false,
  newBagItems: [],
  avatarConfig: { ...DEFAULT_AVATAR_CONFIG },
  ownedItems: ["meadow", "default", "none", "basic", "mic_silver"],
  isLoggedIn: false
};

function getV2KstDayKey(nowMs = Date.now()) {
  const shifted = new Date(nowMs + (9 * 60 * 60 * 1000) - (6 * 60 * 60 * 1000));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function v32RandInt(min, max) {
  const lo = Math.ceil(Number(min) || 0);
  const hi = Math.floor(Number(max) || lo);
  return lo + Math.floor(Math.random() * (Math.max(0, hi - lo) + 1));
}

function pickRandomDailyQuestReward() {
  const types = ["cd", "arcade_coin", "golden_coin", "exp"];
  const type = types[Math.floor(Math.random() * types.length)];
  if (type === "cd") {
    const amount = v32RandInt(100, 200);
    return { type, amount, label: `💿 ${amount} CD` };
  }
  if (type === "arcade_coin") {
    const amount = v32RandInt(1, 3);
    return { type, amount, label: `🎟️ 오락실 동전 ${amount}개` };
  }
  if (type === "golden_coin") {
    const amount = v32RandInt(1, 3);
    return { type, amount, label: `🪙 황금주화 ${amount}개` };
  }
  const amount = v32RandInt(500, 1000);
  return { type: "exp", amount, label: `✨ ${amount.toLocaleString()} EXP` };
}

function createFreshDailyQuestsForDay(dayKey = getV2KstDayKey()) {
  const quizTarget = v32RandInt(1, 3);
  const fishingTargetMin = v32RandInt(3, 10);
  const arcadeTarget = v32RandInt(1, 3);
  const pool =
    typeof ARCADE_GAMES_META !== "undefined" && Array.isArray(ARCADE_GAMES_META) && ARCADE_GAMES_META.length > 0
      ? ARCADE_GAMES_META.filter(g => g && g.enabled !== false)
      : [];
  const pickSpecific = pool.length > 0 && Math.random() < 0.5;
  const specMeta = pickSpecific ? pool[Math.floor(Math.random() * pool.length)] : null;

  return {
    kstDate: dayKey,
    items: [
      {
        id: "quiz",
        type: "quiz",
        label: `🎵 음악 퀴즈 ${quizTarget}판 완료하기`,
        target: quizTarget,
        unit: "판",
        progress: 0,
        claimed: false,
        reward: pickRandomDailyQuestReward()
      },
      {
        id: "fishing",
        type: "fishing",
        label: `🎣 낚시터에서 ${fishingTargetMin}분 놀기`,
        target: fishingTargetMin,
        unit: "분",
        secAccum: 0,
        progress: 0,
        claimed: false,
        reward: pickRandomDailyQuestReward()
      },
      {
        id: "arcade",
        type: "arcade",
        gameId: specMeta ? specMeta.game_id : "any",
        label: specMeta ? `🕹️ 오락실 [${specMeta.title}] ${arcadeTarget}판` : `🕹️ 오락실 아무 게임 ${arcadeTarget}판`,
        target: arcadeTarget,
        unit: "판",
        progress: 0,
        claimed: false,
        reward: pickRandomDailyQuestReward()
      }
    ]
  };
}

function createFreshDailyState(dayKey = getV2KstDayKey()) {
  return {
    kstDate: dayKey,
    dailyCdClaimed: false,
    randomBoxClaimed: false,
    attendanceClaimedToday: false,
    attendanceStreak: 0,
    shopAdCount: 0,
    itemAdCounts: {},
    fishing2xExpiresAt: 0,
    fishing2xKstDate: dayKey,
    dailyQuests: createFreshDailyQuestsForDay(dayKey)
  };
}

function ensureV2DailyState() {
  const today = getV2KstDayKey();
  const cur = userState.dailyState && typeof userState.dailyState === "object"
    ? { ...userState.dailyState }
    : createFreshDailyState(today);
  if (cur.kstDate !== today) {
    cur.kstDate = today;
    cur.dailyCdClaimed = false;
    cur.randomBoxClaimed = false;
    cur.attendanceClaimedToday = false;
    cur.shopAdCount = 0;
    cur.itemAdCounts = {};
    cur.fishing2xExpiresAt = 0;
    cur.fishing2xKstDate = today;
    cur.dailyQuests = createFreshDailyQuestsForDay(today);
    if (Number(cur.attendanceStreak) >= 28) {
      cur.attendanceStreak = 0;
    }
  }
  if (!cur.itemAdCounts || typeof cur.itemAdCounts !== "object") {
    cur.itemAdCounts = {};
  }
  if (
    !cur.dailyQuests ||
    cur.dailyQuests.kstDate !== today ||
    !Array.isArray(cur.dailyQuests.items) ||
    cur.dailyQuests.items.length !== 3
  ) {
    cur.dailyQuests = createFreshDailyQuestsForDay(today);
  }
  userState.dailyState = cur;
  return cur;
}

function escapeJsSingleArg(str) {
  return String(str || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;");
}

function getBlockedStorageKey(uid = userState.id) {
  return `mk_blocked_users_${uid || "guest"}`;
}

function normalizeBlockedList(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const res = [];
  for (const item of arr) {
    if (!item) continue;
    const id = item.id ? String(item.id) : "";
    const nickname = item.nickname ? String(item.nickname) : "";
    const key = id || (nickname ? `nick:${nickname}` : "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    res.push({ id, nickname, blockedAt: item.blockedAt || new Date().toISOString() });
  }
  return res;
}

function loadBlockedUsersFromStorage(profileBlocked = null) {
  let localArr = [];
  try {
    localArr = JSON.parse(localStorage.getItem(getBlockedStorageKey()) || "[]");
  } catch (e) {}
  const merged = normalizeBlockedList([...(Array.isArray(profileBlocked) ? profileBlocked : []), ...(Array.isArray(localArr) ? localArr : [])]);
  userState.blockedUsers = merged;
  try {
    localStorage.setItem(getBlockedStorageKey(), JSON.stringify(merged));
  } catch (e) {}
  return merged;
}

function saveBlockedUsersToStorage() {
  userState.blockedUsers = normalizeBlockedList(userState.blockedUsers);
  try {
    localStorage.setItem(getBlockedStorageKey(), JSON.stringify(userState.blockedUsers));
  } catch (e) {}
}

function isUserBlocked(targetId, targetNick = "") {
  const list = userState.blockedUsers || [];
  if (list.length === 0) return false;
  return list.some(b => {
    if (targetId && b.id && String(b.id) === String(targetId)) return true;
    if (targetNick && b.nickname && !b.id && b.nickname === targetNick) return true;
    return false;
  });
}

function getHiddenDmPeersStorageKey(uid = userState.id) {
  return `mk_hidden_dm_peers_${uid || "guest"}`;
}

function normalizeHiddenDmPeersMap(rawObj) {
  const res = {};
  if (!rawObj || typeof rawObj !== "object" || Array.isArray(rawObj)) return res;
  Object.entries(rawObj).forEach(([peerId, iso]) => {
    if (!peerId || !iso) return;
    const ms = Date.parse(String(iso));
    if (Number.isFinite(ms) && ms > 0) {
      res[String(peerId)] = new Date(ms).toISOString();
    }
  });
  return res;
}

function loadHiddenDmPeersFromStorage(profileMap = null) {
  let localObj = {};
  try {
    localObj = JSON.parse(localStorage.getItem(getHiddenDmPeersStorageKey()) || "{}");
  } catch (e) {}
  const pNorm = normalizeHiddenDmPeersMap(profileMap);
  const lNorm = normalizeHiddenDmPeersMap(localObj);
  const merged = { ...pNorm };
  Object.entries(lNorm).forEach(([pid, iso]) => {
    const prevMs = merged[pid] ? Date.parse(merged[pid]) : 0;
    const curMs = Date.parse(iso);
    if (!prevMs || curMs > prevMs) merged[pid] = iso;
  });
  userState.hiddenDmPeers = merged;
  try {
    localStorage.setItem(getHiddenDmPeersStorageKey(), JSON.stringify(merged));
  } catch (e) {}
  return merged;
}

function saveHiddenDmPeersToStorage() {
  userState.hiddenDmPeers = normalizeHiddenDmPeersMap(userState.hiddenDmPeers);
  try {
    localStorage.setItem(getHiddenDmPeersStorageKey(), JSON.stringify(userState.hiddenDmPeers));
  } catch (e) {}
}

function getHiddenDmCutoffMs(peerId) {
  if (!peerId || !userState.hiddenDmPeers) return 0;
  const iso = userState.hiddenDmPeers[String(peerId)];
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

const shopPreviewState = {
  config: { ...DEFAULT_AVATAR_CONFIG },
  selectedCat: "hair",
  selectedItem: null
};

let pendingSignupGender = "male";

function resetUserStateToFreshDefaults() {
  if (typeof cleanupFishingRuntime === "function") {
    try { cleanupFishingRuntime(false); } catch (e) {}
  }
  if (typeof resetArcadeAccountState === "function") {
    try { resetArcadeAccountState(); } catch (e) {}
  } else if (typeof cleanupArcadeRuntime === "function") {
    try { cleanupArcadeRuntime(); } catch (e) {}
  }
  userState.id = null;
  userState.nickname = "게스트도전자";
  userState.bio = "안녕하세요! 음악왕 도전자입니다.";
  userState.cdCoins = 100;
  userState.arcadeCoins = 0;
  userState.goldenCoins = 0;
  userState.ownedEffects = [];
  userState.exp = 0;
  userState.claimedTopRanks = {};
  userState.battleStats = normalizeBattleStats(DEFAULT_BATTLE_STATS);
  userState.blockedUsers = [];
  userState.hiddenDmPeers = {};
  userState.fishingDaily = null;
  userState.fishingLive = null;
  userState.fishBag = [];
  userState.fishDex = {};
  userState.inventory = {};
  userState.equippedItems = [];
  userState.dailyState = createFreshDailyState();
  userState.v2BaitMigrated = false;
  userState.v32WelcomeGranted = false;
  userState.v32WelcomeOpened = false;
  userState.v32TutorialDone = false;
  userState.newBagItems = [];
  userState.avatarConfig = { ...DEFAULT_AVATAR_CONFIG };
  userState.ownedItems = ["meadow", "default", "none", "basic", "mic_silver"];
  userState.isLoggedIn = false;

  shopPreviewState.config = { ...DEFAULT_AVATAR_CONFIG };
  shopPreviewState.selectedCat = "hair";
  shopPreviewState.selectedItem = null;

  if (typeof dmNotiState !== "undefined") {
    dmNotiState.unreadList = [];
    if (dmNotiState.profileMap) dmNotiState.profileMap.clear();
  }
  if (typeof dmState !== "undefined") {
    dmState.peerId = null;
    dmState.peerNick = "";
    dmState.peerAvatar = { ...DEFAULT_AVATAR_CONFIG };
  }
  if (typeof plazaState !== "undefined") {
    if (plazaState.onlinePlayers) plazaState.onlinePlayers.clear();
    plazaState.currentRoom = null;
    plazaState.lastRenderedQIndex = null;
    plazaState.lastRoomId = null;
    plazaState.lastRewardedKey = null;
    plazaState.activeMatchKey = null;
    plazaState.usedBattleItems = new Set();
    plazaState.battleDoubleActive = false;
    plazaState.item3SecActivatedQIdx = null;
    plazaState.isUsing3Sec = false;
  }
  if (typeof syncDmNotiBadgeUI === "function") {
    try { syncDmNotiBadgeUI(); } catch (e) {}
  }
  if (typeof stopBattleInviteRuntime === "function") {
    try { stopBattleInviteRuntime(); } catch (e) {}
  }
  const tutOv = document.getElementById("v32TutorialOverlay");
  if (tutOv) tutOv.classList.add("hidden");
  try {
    if (typeof v32TutorialState !== "undefined" && v32TutorialState) {
      v32TutorialState.isOpen = false;
    }
  } catch (e) {}
}

const plazaState = {
  channel: null,
  onlinePlayers: new Map(),
  currentRoom: null,
  roomChannel: null,
  roomPollTimer: null,
  lastRenderedQIndex: null,
  lastRoomId: null,
  pendingRoundToast: null,
  battleToastTimer: null,
  roomPlayersMap: new Map(), // 방 내부 맵 캐릭터 좌표/말풍선 상태
  myRoomX: null,
  myRoomXRatio: null,
  myRoomChat: "",
  myRoomChatExpire: 0,
  roomAnimFrame: null,
  roomFilter: "ALL",
  activeMatchKey: null,
  usedBattleItems: new Set(),
  battleDoubleActive: false,
  item3SecActivatedQIdx: null,
  isUsing3Sec: false,
  battleChoicesByKey: new Map(),
  battlePickedArtist: null,
  battlePickedTitle: null,
  battlePenaltyUntil: 0,
  battlePenaltyTimer: null,
  battleAdvanceTimeoutId: null,
  battleAnswerInFlight: false,
  battleLastRevealHandledKey: null
};

window.isCurrentBattleHardMode = function () {
  return String(plazaState.currentRoom?.game_config?.difficulty || "normal") === "hard";
};

window.selectSignupGender = function (gender) {
  pendingSignupGender = gender === "female" ? "female" : "male";
  document.querySelectorAll("[data-signup-gender]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-signup-gender") === pendingSignupGender);
  });
  const signupPreview = document.getElementById("signupCharPreview");
  if (signupPreview) {
    renderPixelAvatar(signupPreview, { ...DEFAULT_AVATAR_CONFIG, gender: pendingSignupGender });
  }
};

window.openSignupGenderStep = async function () {
  const nickInput = document.getElementById("authNicknameInput").value.trim();
  const pwInput = document.getElementById("authPasswordInput").value.trim();

  if (!nickInput || nickInput.length < 2) {
    gameAlert("가입할 닉네임을 2글자 이상 먼저 입력해주세요.");
    return;
  }
  if (!pwInput || pwInput.length < 6) {
    gameAlert("비밀번호를 6자리 이상 먼저 입력해주세요.");
    return;
  }
  if (sbClient) {
    try {
      const { data: existNick } = await sbClient
        .from("profiles")
        .select("id")
        .eq("nickname", nickInput)
        .maybeSingle();
      if (existNick) {
        gameAlert("이미 사용 중인 닉네임입니다!\n다른 닉네임을 입력하거나 [로그인]을 눌러주세요.");
        return;
      }
    } catch (e) {}
  }

  pendingSignupGender = "male";
  resetUserStateToFreshDefaults();
  document.querySelectorAll("[data-signup-gender]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-signup-gender") === "male");
  });

  openModal("signupGenderModal");
  const signupPreview = document.getElementById("signupCharPreview");
  if (signupPreview) renderPixelAvatar(signupPreview, { ...DEFAULT_AVATAR_CONFIG, gender: "male" });
};

window.confirmSignupWithGender = function () {
  closeModal("signupGenderModal");
  handleAuthSubmit("signup");
};

function updateHeaderUserUI() {
  const cdEl = document.getElementById("headerCdCount");
  if (cdEl) cdEl.textContent = `${userState.cdCoins}`;
  if (typeof syncArcadeBalancesUI === "function") syncArcadeBalancesUI();

  // 왼쪽 상단: 아이콘·도형 없이 닉네임 전체 표기
  const topNickEl = document.getElementById("headerTopMyNick");
  if (topNickEl) {
    topNickEl.textContent = String(userState.nickname || "도전자");
  }

  // 관리자 백엔드 버튼은 아이디가 "관리자"인 경우에만 노출!
  const adminBtn = document.getElementById("settingsAdminMenuBtn");
  if (adminBtn) {
    adminBtn.classList.toggle("hidden", !(userState.isLoggedIn && userState.nickname === "관리자"));
  }

  // 레벨 · 계급 · 경험치 UI 동기화 (21단계 계급)
  if (typeof getLevelInfo === "function") {
    const lv = getLevelInfo(userState.exp);
    const titlePill = document.getElementById("homeCharTitlePill");
    if (titlePill) {
      if (typeof formatMusicRankBadgeHtml === "function") {
        titlePill.innerHTML = formatMusicRankBadgeHtml(userState.exp, { size: 22 });
      } else {
        titlePill.textContent = `Lv.${lv.level} ${lv.title}`;
      }
    }

    const lvLabel = document.getElementById("homeExpLevelLabel");
    if (lvLabel) {
      lvLabel.textContent = lv.isMax
        ? `Lv.${lv.level} MAX (${lv.exp.toLocaleString()} EXP)`
        : `Lv.${lv.level} (${lv.inLevelExp.toLocaleString()} / ${lv.needInLevel.toLocaleString()} EXP)`;
    }
    const pctLabel = document.getElementById("homeExpPercentLabel");
    if (pctLabel) pctLabel.textContent = `${lv.percent.toFixed(1)}%`;

    const barFill = document.getElementById("homeExpBarFill");
    if (barFill) barFill.style.width = `${lv.percent.toFixed(1)}%`;
  }

  const homeCanvas = document.getElementById("homeHeroAvatar");
  if (homeCanvas) renderPixelAvatar(homeCanvas, userState.avatarConfig, { idleAnim: true });

  const logoCanvas = document.getElementById("loginLogoCanvas");
  if (logoCanvas && typeof renderPixelLogo === "function") {
    renderPixelLogo(logoCanvas);
  }

  const signupPreview = document.getElementById("signupCharPreview");
  if (signupPreview) renderPixelAvatar(signupPreview, userState.avatarConfig);

  if (typeof syncAllRewardSparklesUI === "function") {
    try { syncAllRewardSparklesUI(); } catch (e) {}
  }
}

window.openTitlesModal = function () {
  if (typeof EXP_LEVEL_TABLE === "undefined") return;
  const lv = getLevelInfo(userState.exp);
  const summaryEl = document.getElementById("titlesCurrentSummary");
  if (summaryEl) {
    const rankHtml = typeof renderMusicRankIconHtml === "function" ? renderMusicRankIconHtml(lv.level, { size: 20 }) : "";
    summaryEl.innerHTML = lv.isMax
      ? `${rankHtml} 현재 최고 계급 Lv.${lv.level} 달성! (${lv.title})<br/>총 ${lv.exp.toLocaleString()} EXP`
      : `현재 Lv.${lv.level} ${rankHtml} [${lv.title}] · 보유 ${lv.exp.toLocaleString()} EXP<br/>(Lv.${lv.level + 1}까지 ${(lv.nextReq - lv.exp).toLocaleString()} EXP 남음)`;
  }

  const listEl = document.getElementById("titlesTableList");
  if (listEl) {
    listEl.innerHTML = EXP_LEVEL_TABLE.map((row, idx) => {
      const unlocked = userState.exp >= row.reqExp;
      const isCurrent = lv.level === row.level;
      const nextReq = EXP_LEVEL_TABLE[idx + 1] ? EXP_LEVEL_TABLE[idx + 1].reqExp : null;
      const rangeStr = nextReq
        ? `필요 누적 ${row.reqExp.toLocaleString()} EXP (다음 +${(nextReq - row.reqExp).toLocaleString()})`
        : `최종 달성 누적 ${row.reqExp.toLocaleString()} EXP (MAX)`;
      const rowIco = typeof renderMusicRankIconHtml === "function" ? renderMusicRankIconHtml(row.level, { size: 24 }) : "";
      return `
        <div class="pixel-list-item" style="cursor:default; background:${isCurrent ? "#fef9c3" : unlocked ? "#f0fdf4" : "#f8fafc"}; border-color:${isCurrent ? "#f59e0b" : unlocked ? "#86efac" : "#cbd5e1"};">
          <div style="display:flex; align-items:center; gap:9px;">
            ${rowIco}
            <div>
              <div style="font-weight:900; font-size:0.88rem; color:var(--text-main);">Lv.${row.level} ${row.title} ${isCurrent ? "⭐(현재)" : ""}</div>
              <div style="font-size:0.73rem; color:var(--text-sub);">${rangeStr}</div>
            </div>
          </div>
          <span class="badge ${unlocked ? "accent" : ""}">${unlocked ? "✅ 달성" : "🔒 잠금"}</span>
        </div>
      `;
    }).join("");
  }
  openModal("titlesModal");
};

// ============================================================================
// 아이디 저장 / 자동로그인 설정 관리
// ============================================================================
window.initAuthPreferences = function () {
  const saveIdBox = document.getElementById("saveIdCheckbox");
  const autoLoginBox = document.getElementById("autoLoginCheckbox");
  const nickInput = document.getElementById("authNicknameInput");

  const saveIdPref = localStorage.getItem("mk_save_id") !== "false";
  const autoLoginPref = localStorage.getItem("mk_auto_login") !== "false";
  const savedNick = localStorage.getItem("mk_saved_nick") || "";

  if (saveIdBox) saveIdBox.checked = saveIdPref;
  if (autoLoginBox) autoLoginBox.checked = autoLoginPref;
  if (nickInput && saveIdPref && savedNick) {
    nickInput.value = savedNick;
  }
};

window.saveAuthPreferences = function (nickToSave = null) {
  const saveIdBox = document.getElementById("saveIdCheckbox");
  const autoLoginBox = document.getElementById("autoLoginCheckbox");
  const nickInput = document.getElementById("authNicknameInput");

  const saveId = saveIdBox ? saveIdBox.checked : true;
  const autoLogin = autoLoginBox ? autoLoginBox.checked : true;

  localStorage.setItem("mk_save_id", saveId ? "true" : "false");
  localStorage.setItem("mk_auto_login", autoLogin ? "true" : "false");

  const targetNick = nickToSave !== null ? nickToSave : (nickInput ? nickInput.value.trim() : "");
  if (saveId && targetNick) {
    localStorage.setItem("mk_saved_nick", targetNick);
  } else if (!saveId) {
    localStorage.removeItem("mk_saved_nick");
  }
};

function nicknameToEmail(nick) {
  const hex = Array.from(nick.trim())
    .map(c => c.charCodeAt(0).toString(16))
    .join("");
  return `u_${hex.slice(0, 36)}@musicking.com`;
}

// ============================================================================
// Supabase 글로벌 설정 & 세션 복원
// ============================================================================
// ============================================================================
// [V2.2] 글로벌 금칙어 필터 & 채팅 도배 방지 시스템
// ============================================================================
const DEFAULT_BANNED_WORDS = [
  "씨발", "시발", "ㅆㅂ", "ㅅㅂ", "병신", "ㅂㅅ", "개새끼", "새끼", "존나", "ㅈㄴ",
  "지랄", "ㅈㄹ", "좆", "창녀", "보지", "자지", "느금마", "애미", "미친놈", "미친년",
  "호로", "개년", "개놈", "쌍놈", "쌍년", "fuck", "shit", "bitch"
];
let globalBannedWordsList = [...DEFAULT_BANNED_WORDS];
let serverHasCustomBannedWords = false;

window.applyServerBannedWords = function (words) {
  if (!Array.isArray(words)) return;
  serverHasCustomBannedWords = true;
  const cleaned = [];
  const seen = new Set();
  words.forEach(w => {
    const t = String(w || "").trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(t);
    }
  });
  globalBannedWordsList = cleaned;
};

window.getActiveBannedWordsList = function () {
  return [...globalBannedWordsList];
};

function _normalizeModerationText(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[\s\.\,\-\_\!\?\~\*·•\/\\\|\^\+`'"]+/g, "");
}

function findMatchedBannedWord(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const compact = _normalizeModerationText(raw);
  for (const w of globalBannedWordsList) {
    const cleanRaw = String(w || "").trim().toLowerCase();
    if (!cleanRaw) continue;
    if (lower.includes(cleanRaw)) return w;
    const cleanCompact = _normalizeModerationText(cleanRaw);
    if (cleanCompact.length >= 2 && compact.includes(cleanCompact)) {
      return w;
    }
  }
  return "";
}

const chatAntiSpamState = {
  channels: {}
};

window.validateCleanUserText = function (text, opts = {}) {
  const {
    fieldLabel = "채팅",
    spamChannel = null,
    ignoreBannedCheck = false
  } = opts;
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return { ok: false, reason: "empty", message: "" };
  }

  if (!ignoreBannedCheck) {
    const bad = findMatchedBannedWord(trimmed);
    if (bad) {
      return {
        ok: false,
        reason: "banned",
        matched: bad,
        message: `🚫 [${fieldLabel}]에 부적절한 표현(금칙어)이 포함되어 사용할 수 없습니다.\n바른 고운 말을 사용해 주세요!`
      };
    }
  }

  if (spamChannel) {
    const now = Date.now();
    if (!chatAntiSpamState.channels[spamChannel]) {
      chatAntiSpamState.channels[spamChannel] = {
        lastSentAt: 0,
        lastNorm: "",
        sameCount: 0,
        lastSameAt: 0,
        recentTimes: []
      };
    }
    const st = chatAntiSpamState.channels[spamChannel];
    const minCooldownMs = spamChannel === "dm" ? 650 : 1200;
    if (now - st.lastSentAt < minCooldownMs) {
      return {
        ok: false,
        reason: "spam_cooldown",
        message: "⏳ 도배 방지를 위해 너무 빠르게 연속 전송할 수 없습니다. 잠시 후 다시 보내주세요!"
      };
    }

    const burstWindowMs = 4000;
    const repeatWindowMs = 8000;

    st.recentTimes = st.recentTimes.filter(ts => now - ts <= burstWindowMs);
    const maxBurst = spamChannel === "dm" ? 6 : 4;
    if (st.recentTimes.length >= maxBurst) {
      return {
        ok: false,
        reason: "spam_burst",
        message: "⏳ 짧은 시간에 너무 많은 메시지를 보냈습니다. 잠시 후 다시 시도해 주세요!"
      };
    }

    const normMsg = trimmed.toLowerCase().replace(/\s+/g, "");
    const isSameRecent = normMsg === st.lastNorm && now - st.lastSameAt <= repeatWindowMs;
    if (isSameRecent && st.sameCount >= 2) {
      return {
        ok: false,
        reason: "spam_repeat",
        message: "🚫 동일한 내용 반복 도배는 제한됩니다. 잠시 후 다른 메시지를 입력해 주세요!"
      };
    }

    st.lastSentAt = now;
    st.recentTimes.push(now);
    if (isSameRecent) {
      st.sameCount += 1;
      st.lastSameAt = now;
    } else {
      st.lastNorm = normMsg;
      st.sameCount = 1;
      st.lastSameAt = now;
    }
  }

  return { ok: true, reason: "", message: "" };
};

let cachedServerSongsOverride = null;

async function loadServerGlobalConfigs() {
  if (!sbClient) return;
  try {
    const { data } = await sbClient
      .from("profiles")
      .select("avatar_config, owned_items")
      .eq("nickname", "__ADMIN_CONFIG__")
      .maybeSingle();

    if (data) {
      if (data.avatar_config && data.avatar_config.shopCatalog) {
        applyServerShopCatalog(data.avatar_config.shopCatalog, data.avatar_config.catalogVersion || 0);
      }
      if (data.avatar_config && Array.isArray(data.avatar_config.bannedWords)) {
        applyServerBannedWords(data.avatar_config.bannedWords);
      }
      if (Array.isArray(data.owned_items) && data.owned_items.length > 0) {
        cachedServerSongsOverride = data.owned_items;
        applyServerSongsOverride(data.owned_items);
      }
    }
  } catch (e) {}
}

window.__reapplyServerSongsOverride = function () {
  if (Array.isArray(cachedServerSongsOverride) && cachedServerSongsOverride.length > 0) {
    applyServerSongsOverride(cachedServerSongsOverride);
  }
};

function applyServerSongsOverride(serverSongs) {
  if (!Array.isArray(serverSongs)) return;
  serverSongs.forEach(sq => {
    if (!sq || !sq.id) return;
    if (sq._deleted) {
      const i = QUESTIONS_DB.findIndex(item => item.id === sq.id);
      if (i !== -1) QUESTIONS_DB.splice(i, 1);
      return;
    }
    const idx = QUESTIONS_DB.findIndex(item => item.id === sq.id);
    if (idx !== -1) {
      QUESTIONS_DB[idx] = { ...QUESTIONS_DB[idx], ...sq };
    } else {
      QUESTIONS_DB.push(sq);
    }
  });
  if (typeof updateLobbyCounts === "function") updateLobbyCounts();
}

function getRequestedLegalAction() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const page = (params.get("page") || params.get("action") || "").toLowerCase();
    const hash = (window.location.hash || "").toLowerCase();
    if (page === "privacy" || hash === "#privacy") return "privacy";
    if (page === "delete" || hash === "#delete" || hash === "#delete-account") return "delete";
  } catch (e) {}
  return "";
}

window.openPrivacyPolicyModal = function () {
  if (typeof openModal === "function") openModal("privacyPolicyModal");
};

window.openExternalDeleteAccountModal = function () {
  const nickInput = document.getElementById("extDeleteNickInput");
  const pwInput = document.getElementById("extDeletePwInput");
  const authNick = document.getElementById("authNicknameInput")?.value?.trim() || "";
  if (nickInput) {
    nickInput.value = (userState.isLoggedIn ? userState.nickname : authNick) || localStorage.getItem("mk_saved_nick") || "";
  }
  if (pwInput) pwInput.value = "";
  if (typeof openModal === "function") openModal("externalDeleteModal");
};

function applyProfileRowToUserState(uid, prof, fallbackNick = "도전자") {
  resetUserStateToFreshDefaults();
  const rawCfg = prof?.avatar_config || {};
  userState.id = uid;
  userState.nickname = prof?.nickname || fallbackNick;
  userState.bio = prof?.bio || "안녕하세요! 음악왕 도전자입니다.";
  userState.cdCoins = prof?.cd_coins ?? 100;
  userState.exp = Number(rawCfg._exp) || 0;
  userState.claimedTopRanks = rawCfg._claimedTopRanks || {};
  userState.battleStats = normalizeBattleStats(rawCfg._battleStats);
  userState.fishingDaily =
    rawCfg._fishingDaily && typeof rawCfg._fishingDaily === "object"
      ? { ...rawCfg._fishingDaily }
      : null;
  userState.fishingLive =
    rawCfg._fishingLive && typeof rawCfg._fishingLive === "object"
      ? { ...rawCfg._fishingLive }
      : null;
  userState.fishBag = Array.isArray(prof?.fish_bag)
    ? prof.fish_bag.filter(f => f && f.fishId).slice(0, 50)
    : [];
  userState.fishDex =
    prof?.fish_dex && typeof prof.fish_dex === "object" && !Array.isArray(prof.fish_dex)
      ? { ...prof.fish_dex }
      : {};
  userState.inventory =
    rawCfg._inventory && typeof rawCfg._inventory === "object"
      ? { ...rawCfg._inventory }
      : {};
  userState.equippedItems = Array.isArray(rawCfg._equippedItems)
    ? rawCfg._equippedItems.filter(Boolean).slice(0, 6)
    : [];
  userState.dailyState =
    rawCfg._dailyState && typeof rawCfg._dailyState === "object"
      ? { ...rawCfg._dailyState }
      : createFreshDailyState();
  userState.v2BaitMigrated = Boolean(rawCfg._v2BaitMigrated);
  userState.v32WelcomeGranted = Boolean(rawCfg._v32WelcomeGranted);
  userState.v32WelcomeOpened = Boolean(rawCfg._v32WelcomeOpened);
  userState.v32TutorialDone = Boolean(rawCfg._v32TutorialDone);
  userState.newBagItems = Array.isArray(rawCfg._newBagItems) ? rawCfg._newBagItems.filter(Boolean) : [];
  const mig = typeof migrateLegacyHairHatIds === "function" ? migrateLegacyHairHatIds(rawCfg) : { cfg: rawCfg, migrated: false };
  userState.avatarConfig = sanitizeAvatarConfigShape(mig.cfg);
  userState.ownedItems = Array.isArray(prof?.owned_items)
    ? [...prof.owned_items]
    : ["meadow", "default", "none", "basic", "mic_silver"];
  userState.arcadeCoins = Math.max(0, Number(prof?.arcade_coins) || 0);
  userState.goldenCoins = Math.max(0, Number(prof?.golden_coins) || 0);
  userState.ownedEffects = Array.isArray(prof?.owned_effects) ? [...prof.owned_effects] : [];
  if (userState.avatarConfig.effect && userState.avatarConfig.effect !== "none" && !userState.ownedEffects.includes(userState.avatarConfig.effect)) {
    userState.avatarConfig.effect = "none";
  }
  userState.isLoggedIn = true;

  let needsProfileSync = Boolean(mig.migrated);

  // [V3.2] 신규 & 기존 유저 모두 1회 🎁 웰컴 패키지 상자 가방 지급 (개봉 전까지 유지)
  if (!userState.v32WelcomeGranted && !userState.v32WelcomeOpened) {
    userState.v32WelcomeGranted = true;
    userState.inventory.welcome_box = Math.max(1, Number(userState.inventory.welcome_box) || 0);
    if (!userState.newBagItems.includes("welcome_box")) {
      userState.newBagItems.push("welcome_box");
    }
    needsProfileSync = true;
  } else if (userState.v32WelcomeOpened && userState.inventory && userState.inventory.welcome_box) {
    delete userState.inventory.welcome_box;
    userState.newBagItems = userState.newBagItems.filter(id => id !== "welcome_box");
  }

  // [V2.0] 기존 영구 미끼 보유 유저 -> 황금 떡밥(bait_s) 소모품 2개 자동 전환
  if (!userState.v2BaitMigrated) {
    const legacyBaitIds = ["bait_c", "bait_b", "bait_a", "bait_s"];
    const hasLegacyBait =
      legacyBaitIds.some(bid => userState.ownedItems.includes(bid)) ||
      legacyBaitIds.includes(userState.avatarConfig.fishingBait);
    if (hasLegacyBait) {
      userState.inventory.bait_s = Math.max(0, Number(userState.inventory.bait_s) || 0) + 2;
      userState.ownedItems = userState.ownedItems.filter(id => !legacyBaitIds.includes(id));
      userState.avatarConfig.fishingBait = "bait_s";
    }
    userState.v2BaitMigrated = true;
    needsProfileSync = true;
  }
  if (needsProfileSync) {
    setTimeout(() => { try { syncProfileToServer(); } catch (e) {} }, 250);
  }
  ensureV2DailyState();

  shopPreviewState.config = { ...userState.avatarConfig };
  shopPreviewState.selectedItem = null;
  loadBlockedUsersFromStorage(rawCfg._blockedUsers);
  loadHiddenDmPeersFromStorage(rawCfg._hiddenDmPeers);
}

async function restoreSupabaseSession() {
  await loadServerGlobalConfigs();
  const reqAction = getRequestedLegalAction();
  if (reqAction === "delete") {
    openExternalDeleteAccountModal();
    return;
  }

  if (!sbClient) {
    if (reqAction === "privacy") openPrivacyPolicyModal();
    return;
  }
  if (localStorage.getItem("mk_auto_login") === "false") {
    if (reqAction === "privacy") openPrivacyPolicyModal();
    return;
  }
  try {
    const { data } = await sbClient.auth.getSession();
    window.mkSupabaseAccessToken = data?.session?.access_token || "";
    const sessionUser = data?.session?.user;
    if (sessionUser) {
      const { data: prof } = await sbClient
        .from("profiles")
        .select("*")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (prof && prof.nickname !== "__ADMIN_CONFIG__") {
        applyProfileRowToUserState(sessionUser.id, prof, prof.nickname);
        updateHeaderUserUI();
        if (typeof startGlobalDmNotiListener === "function") startGlobalDmNotiListener();
        if (typeof startGlobalOnlinePresence === "function") startGlobalOnlinePresence();

        let savedFishingSession = null;
        try {
          const rawSess = sessionStorage.getItem("mk_fishing_session");
          if (rawSess) savedFishingSession = JSON.parse(rawSess);
        } catch (e) {}

        if (
          savedFishingSession &&
          savedFishingSession.uid === sessionUser.id &&
          typeof enterFishingRoom === "function"
        ) {
          // 폰 홈버튼 전환 후 브라우저 탭 재로드 시에도 낚시터 유지 + 백그라운드 경과시간 자동 정산!
          enterFishingRoom(savedFishingSession.channelId, {
            skipLoading: true,
            restorePos: savedFishingSession.pos,
            restoreFromAt: Number(savedFishingSession.savedAt) || 0
          });
        } else {
          // 강제종료(스와이프 종료) 후 새 앱 실행이면 기존 잔류 접속 상태 정리 후 홈으로 이동
          if (userState.fishingLive && userState.fishingLive.active) {
            userState.fishingLive = { active: false, leftAt: Date.now() };
            syncProfileToServer();
          }
          if (typeof runBootWarmupToHome === "function") {
            await runBootWarmupToHome({ replaceHistory: true, durationMs: 650 });
          } else if (typeof showHome === "function") {
            showHome({ replaceHistory: true });
          }
        }
      }
    }
  } catch (e) {}

  if (reqAction === "privacy") {
    openPrivacyPolicyModal();
  }
}

async function addCdCoins(amount) {
  userState.cdCoins = Math.max(0, userState.cdCoins + amount);
  updateHeaderUserUI();
  await syncProfileToServer();
}

function buildProfilePayloadConfig() {
  const cleanAvatar = { ...userState.avatarConfig };
  delete cleanAvatar._exp;
  delete cleanAvatar._claimedTopRanks;
  delete cleanAvatar._battleStats;
  delete cleanAvatar._blockedUsers;
  delete cleanAvatar._hiddenDmPeers;
  delete cleanAvatar._fishingDaily;
  delete cleanAvatar._fishingLive;
  delete cleanAvatar._inventory;
  delete cleanAvatar._equippedItems;
  delete cleanAvatar._dailyState;
  delete cleanAvatar._v2BaitMigrated;
  delete cleanAvatar._v32WelcomeGranted;
  delete cleanAvatar._v32WelcomeOpened;
  delete cleanAvatar._v32TutorialDone;
  delete cleanAvatar._newBagItems;
  return {
    ...cleanAvatar,
    _exp: userState.exp,
    _claimedTopRanks: userState.claimedTopRanks || {},
    _battleStats: normalizeBattleStats(userState.battleStats),
    _blockedUsers: userState.blockedUsers || [],
    _hiddenDmPeers: userState.hiddenDmPeers || {},
    _fishingDaily: userState.fishingDaily || null,
    _fishingLive: userState.fishingLive || null,
    _inventory: userState.inventory || {},
    _equippedItems: userState.equippedItems || [],
    _dailyState: userState.dailyState || null,
    _v2BaitMigrated: Boolean(userState.v2BaitMigrated),
    _v32WelcomeGranted: Boolean(userState.v32WelcomeGranted),
    _v32WelcomeOpened: Boolean(userState.v32WelcomeOpened),
    _v32TutorialDone: Boolean(userState.v32TutorialDone),
    _newBagItems: Array.isArray(userState.newBagItems) ? userState.newBagItems : []
  };
}

window.sendProfileKeepalivePatch = function () {
  if (!userState.isLoggedIn || !userState.id || !window.mkSupabaseAccessToken) return;
  try {
    fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userState.id)}`, {
      method: "PATCH",
      keepalive: true,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${window.mkSupabaseAccessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        cd_coins: userState.cdCoins,
        avatar_config: buildProfilePayloadConfig(),
        fish_bag: Array.isArray(userState.fishBag) ? userState.fishBag : [],
        fish_dex: userState.fishDex && typeof userState.fishDex === "object" ? userState.fishDex : {},
        updated_at: new Date().toISOString()
      })
    }).catch(() => {});
  } catch (e) {}
};

async function syncProfileToServer() {
  updateHeaderUserUI();
  if (!sbClient || !userState.isLoggedIn || !userState.id) return;
  try {
    const payloadConfig = buildProfilePayloadConfig();
    const basePayload = {
      id: userState.id,
      nickname: userState.nickname,
      bio: userState.bio,
      cd_coins: userState.cdCoins,
      avatar_config: payloadConfig,
      owned_items: userState.ownedItems,
      updated_at: new Date().toISOString()
    };
    const { error } = await sbClient.from("profiles").upsert({
      ...basePayload,
      fish_bag: Array.isArray(userState.fishBag) ? userState.fishBag : [],
      fish_dex: userState.fishDex && typeof userState.fishDex === "object" ? userState.fishDex : {}
    });
    if (error && /fish_bag|fish_dex|column/i.test(String(error.message || ""))) {
      await sbClient.from("profiles").upsert(basePayload);
    }
    if (typeof syncGlobalOnlineActivity === "function") {
      syncGlobalOnlineActivity();
    }
  } catch (e) {}
}

// ============================================================================
// 1. 회원가입 / 로그인 / 로그아웃
// ============================================================================
window.handleAuthSubmit = async function (mode) {
  const nickInput = document.getElementById("authNicknameInput").value.trim();
  const pwInput = document.getElementById("authPasswordInput").value.trim();

  if (!nickInput || nickInput.length < 2) {
    gameAlert("닉네임을 2글자 이상 입력해주세요.");
    return;
  }
  if (!pwInput || pwInput.length < 6) {
    gameAlert("비밀번호는 6자리 이상 입력해주세요.");
    return;
  }
  if (!sbClient) {
    gameAlert("서버 연결을 초기화할 수 없습니다.");
    return;
  }

  if (mode === "signup") {
    const nickCheck = validateCleanUserText(nickInput, { fieldLabel: "닉네임" });
    if (!nickCheck.ok) {
      gameAlert(nickCheck.message, "🚫 닉네임 제한");
      return;
    }
  }

  const email = nicknameToEmail(nickInput);

  try {
    if (mode === "signup") {
      const { data: existNick } = await sbClient
        .from("profiles")
        .select("id")
        .eq("nickname", nickInput)
        .maybeSingle();

      if (existNick) {
        gameAlert("이미 사용 중인 닉네임입니다!\n다른 닉네임을 입력하거나 [로그인]을 눌러주세요.");
        return;
      }

      const chosenGender = pendingSignupGender === "female" ? "female" : "male";
      // 이전 계정의 인메모리 상태가 신규 가입 프로필로 절대 넘어가지 않도록 완전 초기화 후 가입!
      resetUserStateToFreshDefaults();

      const { data, error } = await sbClient.auth.signUp({
        email,
        password: pwInput
      });

      if (error) {
        gameAlert(`회원가입 오류: ${error.message}`);
        return;
      }

      const uid = data?.user?.id;
      if (!uid) {
        gameAlert("회원가입 처리 중 문제가 발생했습니다.");
        return;
      }
      window.mkSupabaseAccessToken = data?.session?.access_token || "";
      try { sessionStorage.removeItem("mk_fishing_session"); } catch (e) {}

      const starterAvatar = { ...DEFAULT_AVATAR_CONFIG, gender: chosenGender };
      const starterOwned = ["meadow", "default", "none", "basic", "mic_silver"];
      const starterBio = "안녕하세요! 음악왕 도전자입니다.";

      userState.id = uid;
      userState.nickname = nickInput;
      userState.bio = starterBio;
      userState.cdCoins = 100;
      userState.exp = 0;
      userState.claimedTopRanks = {};
      userState.battleStats = normalizeBattleStats(DEFAULT_BATTLE_STATS);
      userState.blockedUsers = [];
      userState.avatarConfig = starterAvatar;
      userState.ownedItems = starterOwned;
      userState.isLoggedIn = true;
      shopPreviewState.config = { ...starterAvatar };
      shopPreviewState.selectedItem = null;
      loadBlockedUsersFromStorage([]);
      saveAuthPreferences(nickInput);

      const { error: upsertErr } = await sbClient.from("profiles").upsert({
        id: uid,
        nickname: nickInput,
        bio: starterBio,
        cd_coins: 100,
        avatar_config: {
          ...starterAvatar,
          _exp: 0,
          _claimedTopRanks: {},
          _battleStats: normalizeBattleStats(DEFAULT_BATTLE_STATS),
          _blockedUsers: []
        },
        owned_items: starterOwned
      });

      if (upsertErr) {
        gameAlert(`프로필 생성 중 오류가 발생했습니다: ${upsertErr.message}`);
        return;
      }

      updateHeaderUserUI();
      if (typeof startGlobalDmNotiListener === "function") startGlobalDmNotiListener();
      if (typeof startGlobalOnlinePresence === "function") startGlobalOnlinePresence();
      if (typeof runBootWarmupToHome === "function") {
        await runBootWarmupToHome({ replaceHistory: true, durationMs: 650 });
      } else {
        showHome({ replaceHistory: true });
      }
      if (typeof armAppBackGuard === "function") armAppBackGuard(true);
      gameAlert(`환영합니다, [${nickInput}]님!\n웰컴 보너스 💿 100 CD가 지급되었습니다!`, "🎉 가입 완료");
    } else {
      resetUserStateToFreshDefaults();
      const { data, error } = await sbClient.auth.signInWithPassword({
        email,
        password: pwInput
      });

      if (error) {
        gameAlert("닉네임 또는 비밀번호가 일치하지 않습니다.\n처음 오셨다면 [회원가입] 버튼을 눌러주세요!");
        return;
      }

      const uid = data.user.id;
      window.mkSupabaseAccessToken = data?.session?.access_token || "";
      try { sessionStorage.removeItem("mk_fishing_session"); } catch (e) {}
      const { data: prof } = await sbClient
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      applyProfileRowToUserState(uid, prof, nickInput);
      if (userState.fishingLive && userState.fishingLive.active) {
        userState.fishingLive = { active: false, leftAt: Date.now() };
        syncProfileToServer();
      }
      saveAuthPreferences(userState.nickname);

      updateHeaderUserUI();
      if (typeof startGlobalDmNotiListener === "function") startGlobalDmNotiListener();
      if (typeof startGlobalOnlinePresence === "function") startGlobalOnlinePresence();
      if (typeof runBootWarmupToHome === "function") {
        await runBootWarmupToHome({ replaceHistory: true, durationMs: 650 });
      } else {
        showHome({ replaceHistory: true });
      }
      if (typeof armAppBackGuard === "function") armAppBackGuard(true);
    }
  } catch (err) {
    gameAlert("서버 통신 중 오류가 발생했습니다.");
  }
};

window.handleLogout = async function () {
  gameConfirm("정말 로그아웃 하시겠습니까?", async () => {
    if (typeof cleanupFishingRuntime === "function") cleanupFishingRuntime(true);
    if (typeof stopGlobalOnlinePresence === "function") stopGlobalOnlinePresence();
    if (typeof stopGlobalDmNotiListener === "function") stopGlobalDmNotiListener();
    if (typeof stopDmRealtime === "function") stopDmRealtime();
    if (sbClient) {
      try {
        if (plazaState.channel) {
          sbClient.removeChannel(plazaState.channel);
          plazaState.channel = null;
        }
        if (plazaState.roomChannel) {
          sbClient.removeChannel(plazaState.roomChannel);
          plazaState.roomChannel = null;
        }
        await sbClient.auth.signOut();
      } catch (e) {}
    }
    window.mkSupabaseAccessToken = "";
    try { sessionStorage.removeItem("mk_fishing_session"); } catch (e) {}
    resetUserStateToFreshDefaults();
    const pwInput = document.getElementById("authPasswordInput");
    if (pwInput) pwInput.value = "";
    updateHeaderUserUI();
    closeAllModals();
    showLoginScreen({ replaceHistory: true });
    if (typeof resetHistoryToExitBase === "function") resetHistoryToExitBase();
    if (typeof initAuthPreferences === "function") initAuthPreferences();
  }, "🚪 로그아웃");
};

async function finalizeAccountDeletionSession(targetUid, targetNick) {
  if (typeof stopGlobalOnlinePresence === "function") stopGlobalOnlinePresence();
  if (typeof stopGlobalDmNotiListener === "function") stopGlobalDmNotiListener();
  if (typeof stopDmRealtime === "function") stopDmRealtime();
  try {
    if (plazaState.channel && sbClient) {
      sbClient.removeChannel(plazaState.channel);
      plazaState.channel = null;
    }
    if (plazaState.roomChannel && sbClient) {
      sbClient.removeChannel(plazaState.roomChannel);
      plazaState.roomChannel = null;
    }
    await sbClient.auth.signOut();
  } catch (e) {}

  try {
    if (targetUid) {
      localStorage.removeItem(getBlockedStorageKey(targetUid));
      localStorage.removeItem(`mk_dm_seen_map_${targetUid}`);
    }
    if (targetNick && localStorage.getItem("mk_saved_nick") === targetNick) {
      localStorage.removeItem("mk_saved_nick");
    }
  } catch (e) {}

  resetUserStateToFreshDefaults();

  const nickInput = document.getElementById("authNicknameInput");
  const pwInput = document.getElementById("authPasswordInput");
  if (nickInput && nickInput.value.trim() === targetNick) nickInput.value = "";
  if (pwInput) pwInput.value = "";

  updateHeaderUserUI();
  if (typeof closeAllModals === "function") closeAllModals();
  if (typeof showLoginScreen === "function") showLoginScreen({ replaceHistory: true });
  if (typeof resetHistoryToExitBase === "function") resetHistoryToExitBase();
  if (typeof initAuthPreferences === "function") initAuthPreferences();
}

window.handleDeleteAccount = function () {
  if (!userState.isLoggedIn || !userState.id || !sbClient) {
    gameAlert("로그인 상태에서만 회원탈퇴를 진행할 수 있습니다.");
    return;
  }

  gameConfirm(
    `정말 회원탈퇴 하시겠습니까?\n탈퇴 시 [${userState.nickname}] 계정의 캐릭터·CD·경험치·랭킹·친구·DM 기록 및 로그인 계정이 모두 영구 삭제되며 복구할 수 없습니다.`,
    async () => {
      const targetUid = userState.id;
      const targetNick = userState.nickname;

      if (typeof cleanupFishingRuntime === "function") cleanupFishingRuntime(false);
      if (typeof stopAllAppAudio === "function") stopAllAppAudio(false);
      if (typeof stopGlobalOnlinePresence === "function") stopGlobalOnlinePresence();
      if (typeof stopGlobalDmNotiListener === "function") stopGlobalDmNotiListener();
      if (typeof stopDmRealtime === "function") stopDmRealtime();

      try {
        if (plazaState.currentRoom && typeof leaveBattleRoom === "function") {
          await leaveBattleRoom();
        }
      } catch (e) {}

      try {
        const { error } = await sbClient.rpc("delete_my_account");
        if (error) {
          gameAlert(`회원탈퇴 처리 중 오류가 발생했습니다.\n(${error.message || "서버 오류"})`);
          return;
        }
      } catch (err) {
        gameAlert("회원탈퇴 요청 중 네트워크 오류가 발생했습니다.");
        return;
      }

      await finalizeAccountDeletionSession(targetUid, targetNick);
      gameAlert("회원탈퇴가 완료되었으며 모든 계정 및 게임 데이터가 영구 삭제되었습니다.", "👋 회원탈퇴 완료");
    },
    "⚠️ 회원탈퇴 (영구 삭제)"
  );
};

window.submitExternalDeleteAccount = function () {
  const nick = document.getElementById("extDeleteNickInput")?.value?.trim() || "";
  const pw = document.getElementById("extDeletePwInput")?.value?.trim() || "";

  if (!nick || nick.length < 2) {
    gameAlert("삭제할 계정의 닉네임을 2글자 이상 입력해주세요.");
    return;
  }
  if (!pw || pw.length < 6) {
    gameAlert("본인 확인을 위해 비밀번호 6자리 이상을 입력해주세요.");
    return;
  }
  if (!sbClient) {
    gameAlert("서버 연결을 초기화할 수 없습니다.");
    return;
  }

  gameConfirm(
    `[${nick}] 계정을 영구 삭제하시겠습니까?\n본인 확인 후 캐릭터·CD·랭킹·친구·DM 및 로그인 계정이 즉시 파기되며 복구할 수 없습니다.`,
    async () => {
      if (typeof cleanupFishingRuntime === "function") cleanupFishingRuntime(false);
      if (typeof stopAllAppAudio === "function") stopAllAppAudio(false);
      if (typeof stopGlobalOnlinePresence === "function") stopGlobalOnlinePresence();
      if (typeof stopGlobalDmNotiListener === "function") stopGlobalDmNotiListener();
      if (typeof stopDmRealtime === "function") stopDmRealtime();

      try {
        const email = nicknameToEmail(nick);
        const { data: authData, error: signInErr } = await sbClient.auth.signInWithPassword({
          email,
          password: pw
        });
        if (signInErr || !authData?.user) {
          gameAlert("닉네임 또는 비밀번호가 일치하지 않습니다.\n본인 계정의 정보를 정확히 입력해주세요.");
          return;
        }

        const verifiedUid = authData.user.id;
        const { error: delErr } = await sbClient.rpc("delete_my_account");
        if (delErr) {
          await sbClient.auth.signOut().catch(() => {});
          gameAlert(`계정 삭제 처리 중 오류가 발생했습니다.\n(${delErr.message || "서버 오류"})`);
          return;
        }

        await finalizeAccountDeletionSession(verifiedUid, nick);
        gameAlert(`[${nick}] 계정 및 모든 서버 데이터가 영구 삭제되었습니다.`, "👋 계정 삭제 완료");
      } catch (err) {
        gameAlert("계정 삭제 요청 중 네트워크 오류가 발생했습니다.");
      }
    },
    "⚠️ 외부 계정 영구 삭제 확인"
  );
};

// ============================================================================
// 2. 점수 랭킹 시스템 (전용 전체화면 #rankingScreen & 커스텀 게임 필터 칩)
// ============================================================================
const rankFilterState = {
  mode: "ALL",
  stage: "ALL"
};

window.setRankFilter = function (type, val) {
  rankFilterState[type] = val;
  document.querySelectorAll(`[data-rank-${type}]`).forEach(el => {
    el.classList.toggle("active", el.getAttribute(`data-rank-${type}`) === String(val));
  });
  loadRankingsList();
};

async function submitScoreToRanking(record) {
  if (!sbClient || !userState.isLoggedIn || !userState.id) return null;
  try {
    const { data, error } = await sbClient
      .from("rankings")
      .insert({
        user_id: userState.id,
        nickname: userState.nickname,
        avatar_config: userState.avatarConfig,
        decade_filter: record.decadeFilter,
        game_mode: record.mode,
        stage: record.stage,
        question_limit: String(record.limit),
        time_attack: Boolean(record.timeAttack),
        score: record.score,
        accuracy: record.accuracy
      })
      .select("id")
      .maybeSingle();
    if (error) return null;
    return data ? data.id : null;
  } catch (e) {
    return null;
  }
}

// 게임 종료 시 기본 경험치/CD + 점수제 TOP 3 내 기존 본인 최고점 +1점 이상 갱신 시(동점 제외) 1위×5 / 2위×3 / 3위×2 배율 보너스 지급
async function checkAndProcessGameRewards(score, mode, stage, baseCd = 0, opts = {}) {
  const safeBaseCd = Math.max(0, Math.floor(Number(baseCd) || 0));
  const baseExp =
    opts && opts.baseExpOverride !== undefined
      ? Math.max(0, Math.round(Number(opts.baseExpOverride) || 0))
      : Math.max(0, Math.round((Number(score) || 0) * 0.1));
  const expBefore = Number(userState.exp) || 0;
  let multiplier = 1;
  let achievedTopRank = null; // 1, 2, 3 (없으면 null)

  if (sbClient && userState.isLoggedIn && userState.id && score > 0) {
    try {
      const insertedId = opts ? opts.insertedRankRowId : null;
      let prevQuery = sbClient
        .from("rankings")
        .select("score")
        .eq("game_mode", mode)
        .eq("stage", Number(stage))
        .eq("user_id", userState.id)
        .order("score", { ascending: false })
        .limit(insertedId ? 1 : 2);
      if (insertedId) {
        prevQuery = prevQuery.neq("id", insertedId);
      }

      const [{ data: topRows }, { data: prevMyRows }] = await Promise.all([
        sbClient
          .from("rankings")
          .select("id, user_id, score, created_at")
          .eq("game_mode", mode)
          .eq("stage", Number(stage))
          .order("score", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(3),
        prevQuery
      ]);

      let isStrictNewBest = false;
      if (!Array.isArray(prevMyRows) || prevMyRows.length === 0) {
        isStrictNewBest = true;
      } else if (insertedId) {
        const prevMax = Math.max(...prevMyRows.map(r => Number(r.score) || 0));
        isStrictNewBest = Number(score) > prevMax;
      } else {
        const sameScoreCount = prevMyRows.filter(r => Number(r.score) === Number(score)).length;
        const maxRowScore = Math.max(...prevMyRows.map(r => Number(r.score) || 0));
        isStrictNewBest = Number(score) > maxRowScore || (Number(score) === maxRowScore && sameScoreCount <= 1);
      }

      if (isStrictNewBest && Array.isArray(topRows) && topRows.length > 0) {
        const myIdx = insertedId
          ? topRows.findIndex(r => r.id === insertedId)
          : topRows.findIndex(r => r.user_id === userState.id && Number(r.score) === Number(score));
        if (myIdx !== -1 && myIdx < 3) {
          const currentRank = myIdx + 1;
          const rankKey = `${mode}_${stage}`;
          achievedTopRank = currentRank;
          multiplier = currentRank === 1 ? 5 : currentRank === 2 ? 3 : 2;
          userState.claimedTopRanks = { ...(userState.claimedTopRanks || {}), [rankKey]: currentRank };
        }
      }
    } catch (e) {}
  }

  const finalExp = baseExp * multiplier;
  const finalCd = safeBaseCd * multiplier;
  userState.exp = expBefore + finalExp;
  if (finalCd > 0) {
    userState.cdCoins = (Number(userState.cdCoins) || 0) + finalCd;
  }
  await syncProfileToServer();

  return {
    baseExp,
    finalExp,
    baseCd: safeBaseCd,
    earnedCd: finalCd,
    finalCd,
    multiplier,
    achievedTopRank,
    expBefore,
    expAfter: userState.exp
  };
}

function dedupeRankingRows(rows, maxCount = 20) {
  const uniqueRows = [];
  const seenUsers = new Set();
  for (const row of rows || []) {
    if (!row) continue;
    if (isUserBlocked(row.user_id, row.nickname)) continue;
    const key = row.user_id ? `id:${row.user_id}` : `nick:${row.nickname || ""}`;
    if (seenUsers.has(key)) continue;
    seenUsers.add(key);
    uniqueRows.push(row);
    if (uniqueRows.length >= maxCount) break;
  }
  return uniqueRows;
}

async function computeUserUniqueRank(targetId, bestScore) {
  if (!sbClient || !(bestScore > 0)) return "기록 없음";
  try {
    const { data: higherRows } = await sbClient
      .from("rankings")
      .select("user_id, nickname")
      .gt("score", bestScore)
      .limit(1000);

    const higherUsers = new Set();
    (higherRows || []).forEach(r => {
      if (!r) return;
      if (targetId && r.user_id === targetId) return;
      const key = r.user_id ? `id:${r.user_id}` : `nick:${r.nickname || ""}`;
      if (key) higherUsers.add(key);
    });
    return `전체 ${higherUsers.size + 1}위`;
  } catch (e) {
    return "-";
  }
}

window.loadRankingsList = async function () {
  const listEl = document.getElementById("rankingListContainer");
  const podiumEl = document.getElementById("rankingTop3Podium");
  const myRankBannerEl = document.getElementById("rankingMyCurrentRankBanner");
  if (!listEl) return;

  const modeFilter = rankFilterState.mode;
  const stageFilter = rankFilterState.stage;
  const modeTitleMap = { ALL: "전체 모드", behind: "비하인드", lyrics: "가사", onesec: "1초듣기" };
  const stageTitleMap = { ALL: "전체 단계", 1: "1단계(노래)", 2: "2단계(가수)", 3: "3단계(모두)" };
  const filterTitle = `${modeTitleMap[modeFilter] || modeFilter} · ${stageTitleMap[stageFilter] || stageFilter}`;

  if (myRankBannerEl) myRankBannerEl.textContent = `📊 [${filterTitle}] 내 현재 순위 조회 중...`;
  if (podiumEl) podiumEl.innerHTML = "";
  listEl.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub); font-weight:700;">🏆 랭킹 데이터를 불러오는 중...</div>`;

  if (!sbClient) return;

  try {
    let query = sbClient
      .from("rankings")
      .select("*")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1000);

    if (modeFilter !== "ALL") query = query.eq("game_mode", modeFilter);
    if (stageFilter !== "ALL") query = query.eq("stage", Number(stageFilter));

    const { data, error } = await query;
    // 점수제(동일 유저 중복 기록 허용, 차단 유저만 제외) 상위 10위까지 표시
    const allRows = (data || []).filter(r => r && !isUserBlocked(r.user_id, r.nickname));
    const rows = allRows.slice(0, 10);

    if (myRankBannerEl) {
      if (error) {
        myRankBannerEl.textContent = `⚠️ [${filterTitle}] 순위를 불러오지 못했습니다.`;
      } else if (!userState.isLoggedIn || !userState.id) {
        myRankBannerEl.textContent = `🏅 [${filterTitle}] 로그인 후 내 순위를 확인할 수 있습니다.`;
      } else {
        const myRankIdx = allRows.findIndex(r => r.user_id === userState.id);
        if (myRankIdx !== -1) {
          const myRow = allRows[myRankIdx];
          const myPlace = myRankIdx + 1;
          const placeBadge = myPlace === 1 ? "👑 1위" : myPlace === 2 ? "🥈 2위" : myPlace === 3 ? "🥉 3위" : `${myPlace}위`;
          myRankBannerEl.textContent = `🏅 [${filterTitle}] 내 최고 순위: ${placeBadge} / 총 ${allRows.length}건 (${Number(myRow.score || 0).toLocaleString()}점)`;
        } else {
          myRankBannerEl.textContent = `📌 [${filterTitle}] 내 최고 순위: 기록 없음 (총 ${allRows.length}건 도전 중)`;
        }
      }
    }

    if (error || rows.length === 0) {
      if (podiumEl) podiumEl.innerHTML = "";
      listEl.innerHTML = `<div style="text-align:center; padding:32px; color:var(--text-sub); font-weight:700;">아직 해당 조건에 등록된 랭킹 기록이 없습니다.<br/>첫 번째 1등 주인공이 되어보세요!</div>`;
      return;
    }

    const modeLabel = { behind: "📖비하인드", lyrics: "📝가사", onesec: "⚡1초듣기" };

    // 중앙 상단 대형 TOP 3 포디엄 (시각적 시상대 배치: 2위 - 1위 - 3위)
    if (podiumEl) {
      const podiumOrder = [
        { rank: 2, row: rows[1] || null, badge: "🥈 2위" },
        { rank: 1, row: rows[0] || null, badge: "👑 1위" },
        { rank: 3, row: rows[2] || null, badge: "🥉 3위" }
      ];
      podiumEl.innerHTML = podiumOrder
        .map(({ rank, row, badge }) => {
          if (!row) {
            return `
              <div class="rank-podium-card is-rank-${rank} is-empty">
                <div class="rank-podium-place">${badge}</div>
                <div style="font-size:1.35rem; margin:6px 0;">🎵</div>
                <div class="rank-podium-nick">도전 대기</div>
                <div class="rank-podium-sub">-</div>
              </div>
            `;
          }
          const safeId = escapeJsSingleArg(row.user_id);
          const safeNick = escapeJsSingleArg(row.nickname);
          const isMe = userState.id && row.user_id === userState.id;
          const rankIco = typeof renderMusicRankIconHtml === "function" ? renderMusicRankIconHtml(row.avatar_config?._exp || 0, { isExp: true, size: 15 }) : "";
          return `
            <div class="rank-podium-card is-rank-${rank}" onclick="inspectOtherUser('${safeId}', '${safeNick}')">
              <div class="rank-podium-place">${badge}</div>
              <canvas class="rank-podium-canvas" width="480" height="480" data-avatar='${JSON.stringify(row.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
              <div class="rank-podium-nick">${rankIco}${rankIco ? " " : ""}${isMe ? "⭐ " : ""}${row.nickname}</div>
              <div class="rank-podium-score">${Number(row.score || 0).toLocaleString()}점</div>
              <div class="rank-podium-sub">${modeLabel[row.game_mode] || row.game_mode}·${row.stage}단계</div>
            </div>
          `;
        })
        .join("");

      podiumEl.querySelectorAll(".rank-podium-canvas").forEach(cv => {
        try {
          renderPixelAvatar(cv, JSON.parse(cv.getAttribute("data-avatar")));
        } catch (e) {}
      });
    }

    const tailRows = rows.slice(3);
    if (tailRows.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-sub); font-weight:700; font-size:0.82rem;">4위 ~ 10위 랭킹 도전자를 기다리고 있습니다!</div>`;
    } else {
      listEl.innerHTML = tailRows
        .map((row, idx) => {
          const realRank = idx + 4;
          const safeId = escapeJsSingleArg(row.user_id);
          const safeNick = escapeJsSingleArg(row.nickname);
          const isMe = userState.id && row.user_id === userState.id;
          const rankIco = typeof renderMusicRankIconHtml === "function" ? renderMusicRankIconHtml(row.avatar_config?._exp || 0, { isExp: true, size: 16 }) : "";
          return `
          <div class="pixel-list-item" onclick="inspectOtherUser('${safeId}', '${safeNick}')">
            <div style="display:flex; align-items:center; gap:9px;">
              <span style="font-weight:900; min-width:32px; font-size:0.92rem; color:var(--primary-dark);">#${realRank}</span>
              <canvas class="rank-mini-canvas" width="480" height="480" style="width:42px; height:42px; border-radius:10px; border:2px solid #1e1b18;" data-avatar='${JSON.stringify(row.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
              <div>
                <div style="font-weight:900; font-size:0.88rem; display:flex; align-items:center; gap:4px;">${rankIco}<span>${isMe ? "⭐ " : ""}${row.nickname} ${row.time_attack ? "⏱️" : ""}</span></div>
                <div style="font-size:0.72rem; font-weight:700; color:var(--text-sub);">${modeLabel[row.game_mode] || row.game_mode} · ${row.stage}단계 · 정답률 ${row.accuracy}%</div>
              </div>
            </div>
            <div style="font-weight:900; color:#b45309; font-size:0.95rem;">${Number(row.score || 0).toLocaleString()}점</div>
          </div>
        `;
        })
        .join("");

      listEl.querySelectorAll(".rank-mini-canvas").forEach(cv => {
        try {
          renderPixelAvatar(cv, JSON.parse(cv.getAttribute("data-avatar")));
        } catch (e) {}
      });
    }
  } catch (err) {
    if (myRankBannerEl) myRankBannerEl.textContent = `⚠️ [${filterTitle}] 순위 조회 오류`;
    listEl.innerHTML = `<div style="text-align:center; padding:20px;">랭킹 조회 중 오류가 발생했습니다.</div>`;
  }
};

// ============================================================================
// 3. 전용 전체화면 상점 (#shopScreen)
// - 성별은 회원가입 시 설정하며, 이후 변경은 [성별 변경권 10,000 CD] 아이템으로만 가능!
// - [닉네임 변경권 5,000 CD] 아이템 판매
// ============================================================================
window.openShopHubScreen = function () {
  const cdEl = document.getElementById("shopHubCdBalance");
  if (cdEl) cdEl.textContent = (Number(userState?.cdCoins) || 0).toLocaleString();
  const bag = Array.isArray(userState?.fishBag) ? userState.fishBag : [];
  const bagTag = document.getElementById("shopHubFishCount");
  if (bagTag) bagTag.textContent = `🐟 내 어망: ${bag.length}/50마리`;
  switchScreen("shopHubScreen");
  if (typeof window.drawShopHubBannerArt === "function") {
    requestAnimationFrame(() => window.drawShopHubBannerArt());
  }
};

window.openShopModal = function (initialCat = null) {
  shopPreviewState.config = sanitizeAvatarConfigShape(userState.avatarConfig);
  if (
    shopPreviewState.config.fishingBait &&
    shopPreviewState.config.fishingBait !== "none" &&
    getConsumableCount(shopPreviewState.config.fishingBait) <= 0
  ) {
    shopPreviewState.config.fishingBait = "none";
  }
  let targetCat = initialCat || shopPreviewState.selectedCat || "hair";
  if (targetCat === "fishing_rod" || targetCat === "fishing_bait") {
    targetCat = "hair";
  }
  shopPreviewState.selectedCat = targetCat;
  if (targetCat === "game_item") {
    const firstGameItem = (typeof GAME_ITEMS_CATALOG !== "undefined" && GAME_ITEMS_CATALOG[0]) || null;
    shopPreviewState.selectedItem = firstGameItem ? { cat: "game_item", ...firstGameItem } : null;
  } else {
    const initItem = getItemById(targetCat, shopPreviewState.config[getShopCatConfigKey(targetCat)] || "default");
    shopPreviewState.selectedItem = { cat: targetCat, ...initItem };
  }
  switchScreen("shopScreen");
  syncShopMainTabsUI(targetCat);
  renderShopCategory(targetCat);
  updateShopPreviewCanvas();
  requestAnimationFrame(() => {
    const scr = document.getElementById("shopScreen");
    if (scr && !scr.classList.contains("hidden")) updateShopPreviewCanvas();
  });
  if (typeof updateShopFreeCdAdButton === "function") updateShopFreeCdAdButton();
};

const SHOP_GROUP_MAP = {
  fashion: ["face", "hair", "hat", "outfit"],
  etc: ["acc", "wing", "bg", "effect"],
  item: ["game_item"],
  special: ["special"]
};

function getShopMainGroupForCat(cat) {
  for (const [grp, cats] of Object.entries(SHOP_GROUP_MAP)) {
    if (cats.includes(cat)) return grp;
  }
  return "fashion";
}

function syncShopMainTabsUI(cat) {
  const grp = getShopMainGroupForCat(cat);
  document.querySelectorAll("[data-shop-group]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-shop-group") === grp);
  });
  const fashionSub = document.getElementById("shopSubTabsFashion");
  const etcSub = document.getElementById("shopSubTabsEtc");
  const featureSub = document.getElementById("shopSubTabsFeature");
  if (fashionSub) fashionSub.classList.toggle("hidden", grp !== "fashion");
  if (etcSub) etcSub.classList.toggle("hidden", grp !== "etc");
  if (featureSub) featureSub.classList.toggle("hidden", grp !== "feature");
}

window.switchShopMainGroup = function (grp) {
  const cats = SHOP_GROUP_MAP[grp] || ["hair"];
  const nextCat = cats.includes(shopPreviewState.selectedCat) ? shopPreviewState.selectedCat : cats[0];
  syncShopMainTabsUI(nextCat);
  renderShopCategory(nextCat);
  const list = nextCat === "game_item"
    ? (typeof GAME_ITEMS_CATALOG !== "undefined" ? GAME_ITEMS_CATALOG : [])
    : (AVATAR_SHOP_ITEMS[nextCat] || []);
  const cfgId = nextCat !== "game_item" && nextCat !== "special"
    ? shopPreviewState.config[getShopCatConfigKey(nextCat)]
    : null;
  const targetItem = (cfgId && list.find(x => x.id === cfgId)) || list[0];
  if (targetItem) {
    previewShopItem(nextCat, targetItem.id);
  }
};

function getShopCatConfigKey(cat) {
  return (typeof AVATAR_CONFIG_KEY_BY_CAT !== "undefined" && AVATAR_CONFIG_KEY_BY_CAT[cat]) || cat;
}

function getEquippableShopCatsList() {
  return typeof EQUIPPABLE_SHOP_CATS !== "undefined"
    ? EQUIPPABLE_SHOP_CATS
    : ["bg", "hair", "hat", "face", "outfit", "acc", "wing", "effect", "fishing_rod", "fishing_bait"];
}

function getConsumableCount(id) {
  if (!id || id === "none") return 0;
  return Math.max(0, Number((userState.inventory && userState.inventory[id]) || 0));
}

window.renderShopInventorySlots = function () {
  const rodSlot = document.getElementById("shopInvRodSlot");
  const rodCanvas = document.getElementById("shopInvRodCanvas");
  const rodBadge = document.getElementById("shopInvRodBadge");
  const rodName = document.getElementById("shopInvRodName");

  const baitSlot = document.getElementById("shopInvBaitSlot");
  const baitCanvas = document.getElementById("shopInvBaitCanvas");
  const baitBadge = document.getElementById("shopInvBaitBadge");
  const baitName = document.getElementById("shopInvBaitName");

  const cfg = userState.avatarConfig || DEFAULT_AVATAR_CONFIG;

  const rodId = cfg.fishingRod || "none";
  const rodItem = getItemById("fishing_rod", rodId);
  const rodEquipped = rodId !== "none" && rodItem && rodItem.id !== "none";
  if (rodSlot) rodSlot.classList.toggle("is-equipped", rodEquipped);
  if (rodBadge) {
    const pct = rodEquipped ? Math.round(((Number(rodItem.expMultiplier) || 1) - 1) * 100) : 0;
    rodBadge.textContent = rodEquipped ? `EXP+${pct}%` : "미착용";
  }
  if (rodName) rodName.textContent = rodEquipped ? rodItem.name : "낚싯대";
  if (rodCanvas && typeof renderItemThumbnail === "function") {
    renderItemThumbnail(rodCanvas, "fishing_rod", rodItem);
  }

  const baitId = cfg.fishingBait || "none";
  const baitItem = getItemById("fishing_bait", baitId);
  const baitCount = getConsumableCount(baitId);
  const baitEquipped = baitId !== "none" && baitItem && baitItem.id !== "none" && baitCount > 0;
  if (baitSlot) baitSlot.classList.toggle("is-equipped", baitEquipped);
  if (baitBadge) {
    const pct = baitEquipped ? Math.round(((Number(baitItem.cdMultiplier) || 1) - 1) * 100) : 0;
    baitBadge.textContent = baitEquipped ? `CD+${pct}% (${baitCount}개)` : "미착용";
  }
  if (baitName) baitName.textContent = baitEquipped ? baitItem.name : "미끼";
  if (baitCanvas && typeof renderItemThumbnail === "function") {
    renderItemThumbnail(baitCanvas, "fishing_bait", baitItem);
  }
};

window.inspectShopFishingSlot = function (cat) {
  const cfgKey = getShopCatConfigKey(cat);
  const equippedId = (userState.avatarConfig && userState.avatarConfig[cfgKey]) || "none";
  const list = AVATAR_SHOP_ITEMS[cat] || [];
  const target = (equippedId !== "none" && list.find(x => x.id === equippedId)) || list[0];
  if (target) {
    shopPreviewState.selectedItem = { cat, ...target };
    shopPreviewState.config[cfgKey] = target.id;
  }
  renderShopCategory(cat);
  updateShopPreviewCanvas();
};

async function equipOwnedFishingGear(sel) {
  if (!sel || !sel.cat || !sel.id) return;
  const cfgKey = getShopCatConfigKey(sel.cat);
  userState.avatarConfig[cfgKey] = sel.id;
  shopPreviewState.config[cfgKey] = sel.id;
  await syncProfileToServer();
  renderShopCategory(shopPreviewState.selectedCat);
  updateShopPreviewCanvas();
  gameAlert(`[${sel.name}] 아이템을 장착했습니다!\n상점 캐릭터 왼쪽 아래 슬롯에서 착용 여부를 확인할 수 있습니다.`, "🎣 장착 완료");
}

window.unequipFishingGear = async function (cat) {
  const cfgKey = getShopCatConfigKey(cat);
  userState.avatarConfig[cfgKey] = "none";
  shopPreviewState.config[cfgKey] = "none";
  await syncProfileToServer();
  renderShopCategory(shopPreviewState.selectedCat);
  updateShopPreviewCanvas();
  const label = cat === "fishing_rod" ? "낚싯대" : "미끼";
  gameAlert(`[${label}] 장착이 해제되어 미착용 상태로 변경되었습니다.`);
};

function updateShopPreviewCanvas() {
  shopPreviewState.config = sanitizeAvatarConfigShape(shopPreviewState.config);
  const cv = document.getElementById("shopAvatarCanvas");
  if (cv) {
    renderPixelAvatar(cv, shopPreviewState.config, { transparentBg: true });
  }
  renderShopInventorySlots();

  // 선택한 배경(bg) 고디테일 풀 일러스트 & 컬러를 상점 상단 스테이지에도 실시간 반영!
  const topBackdrop = document.getElementById("shopTopBackdrop");
  const bgItem = getItemById("bg", shopPreviewState.config.bg);
  if (topBackdrop) {
    const c = (bgItem && bgItem.colors) || ["#5ec8f8", "#aee4ff", "#76d32d", "#58b018"];
    topBackdrop.style.background = `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 58%, ${c[2]} 58%, ${c[3]} 100%)`;
  }
  const bgCanvas = document.getElementById("shopBgCanvas");
  if (bgCanvas && topBackdrop && typeof renderApfWideBackground === "function") {
    const w = Math.max(640, Math.round((topBackdrop.clientWidth || 380) * 2));
    const h = Math.max(360, Math.round((topBackdrop.clientHeight || 200) * 2));
    if (Math.abs(bgCanvas.width - w) > 8 || Math.abs(bgCanvas.height - h) > 8) {
      bgCanvas.width = w;
      bgCanvas.height = h;
    }
    const bgCtx = bgCanvas.getContext("2d");
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    renderApfWideBackground(bgCtx, bgCanvas.width, bgCanvas.height, bgItem);
  }

  const cdSpan = document.getElementById("shopCdBalance");
  if (cdSpan) cdSpan.textContent = `${userState.cdCoins}`;
  const goldSpan = document.getElementById("shopGoldenBalance");
  if (goldSpan) goldSpan.textContent = `${userState.goldenCoins || 0}`;

  const titleEl = document.getElementById("shopBoardTitle");
  const priceBadgeEl = document.getElementById("shopBoardPriceBadge");
  const descEl = document.getElementById("shopBoardDesc");
  const confirmBtn = document.getElementById("shopConfirmActionBtn");
  if (!titleEl || !descEl || !confirmBtn) return;

  const sel = shopPreviewState.selectedItem || getItemById("hair", shopPreviewState.config.hair);
  titleEl.textContent = sel.name || "기본 스타일";
  descEl.textContent = sel.desc || "아이템을 눌러 먼저 입어보세요!";
  const scopeBadgeEl = document.getElementById("shopBoardScopeBadge");
  if (scopeBadgeEl) {
    if (sel.cat === "game_item" && sel.scopeLabel) {
      scopeBadgeEl.textContent = sel.scopeLabel;
      scopeBadgeEl.classList.remove("hidden");
    } else {
      scopeBadgeEl.classList.add("hidden");
    }
  }

  if (sel.cat === "special" && (sel.id === "nickname_ticket" || sel.id === "gender_ticket")) {
    const ownedCnt = getConsumableCount(sel.id);
    if (priceBadgeEl) {
      priceBadgeEl.textContent = `💿 ${sel.price.toLocaleString()} CD · 보유 ${ownedCnt}개`;
    }
    descEl.textContent = "구매하면 🎒가방 인벤토리에 보관됩니다.\n가방에서 원할 때 언제든 사용할 수 있어요!";
    confirmBtn.textContent = "🛍️ 구매 (가방 보관)";
    confirmBtn.className = "btn btn-gold";
    confirmBtn.onclick = () => purchaseSpecialTicketToBag(sel.id);
    return;
  }

  if (sel.cat === "game_item") {
    const cnt = getConsumableCount(sel.id);
    if (priceBadgeEl) priceBadgeEl.textContent = `💿 ${sel.price.toLocaleString()} CD · 보유 ${cnt}개`;
    confirmBtn.textContent = "🛍️ 수량 선택 구매";
    confirmBtn.className = "btn btn-gold";
    confirmBtn.onclick = () => purchaseConsumableShopItem("game_item", sel);
    return;
  }

  if (sel.cat === "fishing_bait") {
    const cnt = getConsumableCount(sel.id);
    const isEquipped = userState.avatarConfig && userState.avatarConfig.fishingBait === sel.id && cnt > 0;
    if (priceBadgeEl) priceBadgeEl.textContent = `💿 ${sel.price.toLocaleString()} CD · 보유 ${cnt}개`;
    confirmBtn.textContent = cnt > 0 && !isEquipped ? "✅ 장착 · 추가 구매" : "🛍️ 수량 선택 구매";
    confirmBtn.className = "btn btn-gold";
    confirmBtn.onclick = () => {
      if (cnt > 0 && !isEquipped) {
        gameConfirm(`[${sel.name}] (보유 ${cnt}개)\n장착하시겠습니까, 아니면 더 구매하시겠습니까?`, async () => {
          await equipOwnedFishingGear(sel);
        }, "🪱 미끼 선택", () => purchaseConsumableShopItem("fishing_bait", sel));
        const okBtn = document.getElementById("dialogConfirmBtn");
        const cancelBtn = document.getElementById("dialogCancelBtn");
        if (okBtn) okBtn.textContent = "✅ 장착하기";
        if (cancelBtn) cancelBtn.textContent = "🛍️ 수량 구매";
      } else {
        purchaseConsumableShopItem("fishing_bait", sel);
      }
    };
    return;
  }

  if (sel.cat === "effect") {
    const ownedEff =
      sel.id === "none" ||
      (Array.isArray(userState.ownedEffects) && userState.ownedEffects.includes(sel.id));
    if (!ownedEff) {
      if (priceBadgeEl) priceBadgeEl.textContent = `🪙 ${sel.price.toLocaleString()} 황금주화`;
      confirmBtn.textContent = `🪙 황금주화 ${sel.price} 구매`;
      confirmBtn.className = "btn btn-gold";
      confirmBtn.onclick = () => purchaseAvatarEffectWithGoldenCoins(sel);
      return;
    }
  }

  if (sel.purchasable === false && !userState.ownedItems.includes(sel.id)) {
    if (priceBadgeEl) priceBadgeEl.textContent = "🎁 28일 출석 한정판";
    confirmBtn.textContent = "🔒 구매 불가 (출석 보상)";
    confirmBtn.className = "btn";
    confirmBtn.onclick = () => gameAlert("이 아이템은 상점에서 구매할 수 없는 28일차 출석체크 한정판입니다!\n우측 📅 출첵 보드에서 28일 출석을 달성해 획득하세요.");
    return;
  }

  const isOwned = !sel.price || sel.price === 0 || userState.ownedItems.includes(sel.id);
  const unownedPreviewList = getUnownedPreviewItems();
  const hasAnyUnownedPreview = unownedPreviewList.length > 0;

  if (sel.cat === "fishing_rod" || sel.cat === "fishing_bait") {
    const cfgKey = getShopCatConfigKey(sel.cat);
    const isEquipped = userState.avatarConfig && userState.avatarConfig[cfgKey] === sel.id;
    if (hasAnyUnownedPreview) {
      if (priceBadgeEl) {
        priceBadgeEl.textContent = !isOwned
          ? `💿 ${sel.price.toLocaleString()} CD`
          : `🛍️ 미구매 ${unownedPreviewList.length}개 착용`;
      }
      confirmBtn.textContent =
        unownedPreviewList.length > 1 ? `🛍️ 구매하기 (${unownedPreviewList.length}개)` : "🛍️ 구매하기";
      confirmBtn.className = "btn btn-gold";
      confirmBtn.onclick = () => purchaseAndEquipPreviewItem(sel);
    } else if (!isOwned) {
      if (priceBadgeEl) priceBadgeEl.textContent = `💿 ${sel.price.toLocaleString()} CD`;
      confirmBtn.textContent = "🛍️ 구매하기";
      confirmBtn.className = "btn btn-gold";
      confirmBtn.onclick = () => purchaseAndEquipPreviewItem(sel);
    } else if (isEquipped) {
      if (priceBadgeEl) priceBadgeEl.textContent = "✅ 착용중";
      confirmBtn.textContent = "❎ 착용 해제";
      confirmBtn.className = "btn";
      confirmBtn.onclick = () => unequipFishingGear(sel.cat);
    } else {
      if (priceBadgeEl) priceBadgeEl.textContent = "✅ 보유중";
      confirmBtn.textContent = "✅ 장착하기";
      confirmBtn.className = "btn btn-primary";
      confirmBtn.onclick = () => equipOwnedFishingGear(sel);
    }
    return;
  }

  if (hasAnyUnownedPreview) {
    if (priceBadgeEl) {
      priceBadgeEl.textContent = !isOwned
        ? `💿 ${sel.price.toLocaleString()} CD`
        : `✅ 보유중 (미구매 ${unownedPreviewList.length}개 착용)`;
    }
    confirmBtn.textContent =
      unownedPreviewList.length > 1 ? `🛍️ 구매하기 (${unownedPreviewList.length}개)` : "🛍️ 구매하기";
    confirmBtn.className = "btn btn-gold";
    confirmBtn.onclick = () => purchaseAndEquipPreviewItem(sel);
  } else {
    if (priceBadgeEl) priceBadgeEl.textContent = "✅ 보유중";
    confirmBtn.textContent = "✅ 장착 저장";
    confirmBtn.className = "btn btn-primary";
    confirmBtn.onclick = saveCurrentPreviewLook;
  }
}

window.resetShopPreview = function () {
  shopPreviewState.config = { ...userState.avatarConfig };
  const curCat = shopPreviewState.selectedCat || "hair";
  if (curCat !== "special" && curCat !== "game_item") {
    const curItem = getItemById(curCat, userState.avatarConfig[getShopCatConfigKey(curCat)] || "default");
    shopPreviewState.selectedItem = { cat: curCat, ...curItem };
  } else {
    const curHair = getItemById("hair", userState.avatarConfig.hair);
    shopPreviewState.selectedItem = { cat: "hair", ...curHair };
  }
  renderShopCategory(curCat);
  updateShopPreviewCanvas();
};

async function purchaseAvatarEffectWithGoldenCoins(sel) {
  if (!sel || !sel.id || sel.id === "none") return;
  if (!userState.isLoggedIn || !sbClient || !userState.id) {
    gameAlert("로그인이 필요한 기능입니다!");
    return;
  }
  const curCoins = Math.max(0, Number(userState.goldenCoins) || 0);
  if (curCoins < sel.price) {
    gameAlert(
      `🪙 황금주화가 부족합니다!\n(보유: ${curCoins.toLocaleString()}개 / 필요: ${sel.price.toLocaleString()}개)\n놀러가기 > 오락실 주간 랭킹 보상으로 황금주화를 획득할 수 있어요!`,
      "🪙 황금주화 부족"
    );
    return;
  }
  gameConfirm(
    `[${sel.name}] 이펙트를 🪙 ${sel.price.toLocaleString()} 황금주화로 구매하고 장착할까요?`,
    async () => {
      try {
        const { error } = await sbClient.rpc("buy_avatar_effect", {
          p_effect_id: sel.id,
          p_equip: true
        });
        if (error) {
          gameAlert(`이펙트 구매 중 오류가 발생했습니다.\n(${error.message || "서버 오류"})`);
          return;
        }
        const { data: freshProf } = await sbClient
          .from("profiles")
          .select("golden_coins, owned_effects, avatar_config")
          .eq("id", userState.id)
          .maybeSingle();

        if (freshProf) {
          userState.goldenCoins = Math.max(0, Number(freshProf.golden_coins) || 0);
          userState.ownedEffects = Array.isArray(freshProf.owned_effects)
            ? [...freshProf.owned_effects]
            : [sel.id];
          userState.avatarConfig.effect = (freshProf.avatar_config && freshProf.avatar_config.effect) || sel.id;
        } else {
          userState.goldenCoins = Math.max(0, curCoins - sel.price);
          if (!userState.ownedEffects.includes(sel.id)) userState.ownedEffects.push(sel.id);
          userState.avatarConfig.effect = sel.id;
        }
        shopPreviewState.config.effect = userState.avatarConfig.effect;
        if (typeof AvatarRenderEngine !== "undefined") {
          AvatarRenderEngine.warmupAvatar(userState.avatarConfig);
        }
        renderShopCategory(shopPreviewState.selectedCat);
        updateShopPreviewCanvas();
        gameAlert(
          `✨ [${sel.name}] 이펙트 구매 및 장착 완료!\n(보유 황금주화: 🪙 ${userState.goldenCoins.toLocaleString()}개)`,
          "🛍️ 이펙트 획득"
        );
      } catch (err) {
        gameAlert("서버 통신 중 오류가 발생했습니다.");
      }
    },
    "🪙 이펙트 구매"
  );
}

async function saveCurrentPreviewLook() {
  for (const cat of getEquippableShopCatsList()) {
    const cfgKey = getShopCatConfigKey(cat);
    const id = shopPreviewState.config[cfgKey];
    if (!id || id === "none") continue;
    if (cat === "fishing_bait") {
      // 미끼는 소모품(inventory)으로 관리되므로 보유 수량이 없으면 자동 해제하고 코스튬 장착은 막지 않음
      if (getConsumableCount(id) <= 0) {
        shopPreviewState.config[cfgKey] = "none";
      }
      continue;
    }
    const item = getItemById(cat, id);
    if (cat === "effect") {
      if (!Array.isArray(userState.ownedEffects) || !userState.ownedEffects.includes(id)) {
        gameAlert(
          `[${item ? item.name : id}] 이펙트는 황금주화로 먼저 구매해야 장착할 수 있습니다!\n[✨ ETC > ✨ 이펙트] 탭에서 황금주화로 구매해 주세요.`
        );
        return;
      }
      continue;
    }
    if (item && (item.purchasable === false || item.price > 0) && !userState.ownedItems.includes(id)) {
      gameAlert(
        item.purchasable === false
          ? `[${item.name}] 아이템은 출석체크 한정판 보상이라 구매·획득 전에는 장착할 수 없습니다!`
          : `[${item.name}] 아이템은 아직 구매하지 않았습니다!\n우측 보드의 [구매하기] 버튼을 먼저 눌러주세요.`
      );
      return;
    }
  }
  // 성별은 성별 변경권 구매를 통해서만 바꿀 수 있도록 미리보기 성별 저장 차단
  userState.avatarConfig = {
    ...shopPreviewState.config,
    gender: (userState.avatarConfig && userState.avatarConfig.gender) || "male"
  };
  shopPreviewState.config.gender = userState.avatarConfig.gender;
  if (typeof AvatarRenderEngine !== "undefined") {
    AvatarRenderEngine.warmupAvatar(userState.avatarConfig);
  }
  await syncProfileToServer();
  renderShopCategory(shopPreviewState.selectedCat);
  updateShopPreviewCanvas();
  gameAlert("캐릭터 코스튬 장착이 저장되었습니다!", "👗 장착 완료");
}

const SHOP_CAT_LABELS = {
  bg: "배경",
  hair: "헤어",
  hat: "모자",
  face: "얼굴",
  outfit: "의상",
  acc: "소품",
  wing: "날개",
  effect: "이펙트",
  game_item: "아이템",
  fishing_rod: "낚싯대",
  fishing_bait: "미끼"
};

function getUnownedPreviewItems() {
  const list = [];
  for (const cat of getEquippableShopCatsList()) {
    if (cat === "fishing_bait" || cat === "effect") continue;
    const cfgKey = getShopCatConfigKey(cat);
    const id = shopPreviewState.config[cfgKey];
    if (!id || id === "none") continue;
    const item = getItemById(cat, id);
    if (item && item.purchasable !== false && item.price > 0 && !userState.ownedItems.includes(item.id)) {
      list.push({ cat, ...item });
    }
  }
  return list;
}

function sanitizeAvatarConfigToOwned(previewCfg) {
  const safe = sanitizeAvatarConfigShape(userState.avatarConfig);
  const cleanPreview = sanitizeAvatarConfigShape(previewCfg);
  safe.gender = (userState.avatarConfig && userState.avatarConfig.gender) || safe.gender;
  for (const cat of getEquippableShopCatsList()) {
    const cfgKey = getShopCatConfigKey(cat);
    const id = cleanPreview[cfgKey];
    if (id === "none") {
      safe[cfgKey] = "none";
      continue;
    }
    if (cat === "fishing_bait") {
      if (getConsumableCount(id) > 0) safe[cfgKey] = id;
      continue;
    }
    if (cat === "effect") {
      if (Array.isArray(userState.ownedEffects) && userState.ownedEffects.includes(id)) {
        safe.effect = id;
      }
      continue;
    }
    const item = getItemById(cat, id);
    if (item && (((!item.price || item.price === 0) && item.purchasable !== false) || userState.ownedItems.includes(item.id))) {
      safe[cfgKey] = id;
    }
  }
  return safe;
}

let pendingMultiBuyList = [];

window.updateShopMultiBuyTotal = function () {
  const checks = Array.from(document.querySelectorAll("#shopMultiBuyList input[type='checkbox']:checked"));
  const total = checks.reduce((sum, el) => sum + (Number(el.dataset.price) || 0), 0);
  const totalEl = document.getElementById("shopMultiBuyTotal");
  const btn = document.getElementById("shopMultiBuyConfirmBtn");
  if (totalEl) totalEl.textContent = `💿 ${total.toLocaleString()} CD`;
  if (btn) {
    btn.disabled = checks.length === 0;
    btn.textContent = checks.length > 0 ? `🛍️ ${checks.length}개 구매 · 장착` : "구매할 아이템을 선택하세요";
  }
};

window.confirmMultiBuyShopItems = async function () {
  const checks = Array.from(document.querySelectorAll("#shopMultiBuyList input[type='checkbox']:checked"));
  if (checks.length === 0) return;

  const selected = checks.map(el => ({
    cat: el.dataset.cat,
    id: el.dataset.id,
    name: el.dataset.name,
    price: Number(el.dataset.price) || 0
  }));

  const totalCost = selected.reduce((sum, item) => sum + item.price, 0);
  if (userState.cdCoins < totalCost) {
    gameAlert(`💿 CD가 부족합니다!\n(보유: ${userState.cdCoins.toLocaleString()} CD / 필요: ${totalCost.toLocaleString()} CD)`);
    return;
  }

  userState.cdCoins -= totalCost;
  for (const item of selected) {
    if (!userState.ownedItems.includes(item.id)) {
      userState.ownedItems.push(item.id);
    }
  }
  // 선택한 아이템 + 기존 보유 아이템만 실제 장착(미구매 미리보기는 자동 제외)
  userState.avatarConfig = sanitizeAvatarConfigToOwned(shopPreviewState.config);
  shopPreviewState.config = { ...userState.avatarConfig };

  closeModal("shopMultiBuyModal");
  await syncProfileToServer();
  renderShopCategory(shopPreviewState.selectedCat);
  updateShopPreviewCanvas();

  const names = selected.map(s => s.name).join(", ");
  gameAlert(`🎉 [${names}] 구매 및 장착 완료!\n(총 💿 ${totalCost.toLocaleString()} CD 사용)`, "🛍️ 구매 성공");
};

async function purchaseAndEquipPreviewItem(sel) {
  if (sel && sel.cat === "effect") {
    const ownedEff = sel.id === "none" || (Array.isArray(userState.ownedEffects) && userState.ownedEffects.includes(sel.id));
    if (!ownedEff) {
      await purchaseAvatarEffectWithGoldenCoins(sel);
      return;
    }
  }
  const unownedList = getUnownedPreviewItems();
  if (
    sel &&
    sel.id &&
    sel.cat !== "effect" &&
    sel.price > 0 &&
    !userState.ownedItems.includes(sel.id) &&
    !unownedList.some(x => x.cat === sel.cat && x.id === sel.id)
  ) {
    unownedList.push({ cat: sel.cat, ...sel });
  }

  if (unownedList.length === 0) {
    saveCurrentPreviewLook();
    return;
  }

  // 입어보고 있는 미구매 아이템이 2개 이상이면 각각 가격/총합 팝업으로 선택 구매 제공
  if (unownedList.length > 1) {
    pendingMultiBuyList = unownedList;
    const listEl = document.getElementById("shopMultiBuyList");
    const balEl = document.getElementById("shopMultiBuyBalance");
    if (balEl) balEl.textContent = `${userState.cdCoins.toLocaleString()} CD`;
    if (listEl) {
      listEl.innerHTML = unownedList
        .map(
          item => `
        <label class="shop-multibuy-item">
          <div style="display:flex; align-items:center; gap:8px; min-width:0;">
            <input type="checkbox" checked data-cat="${item.cat}" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" onchange="updateShopMultiBuyTotal()" />
            <div style="min-width:0;">
              <div style="font-size:0.84rem; font-weight:900; color:var(--text-main);">[${SHOP_CAT_LABELS[item.cat] || item.cat}] ${item.name}</div>
              <div style="font-size:0.72rem; color:var(--text-sub);">${sel && item.id === sel.id ? "현재 선택한 아이템" : "입어보기 중인 아이템"}</div>
            </div>
          </div>
          <strong style="color:#b45309; font-size:0.86rem; white-space:nowrap;">💿 ${item.price.toLocaleString()}</strong>
        </label>
      `
        )
        .join("");
    }
    updateShopMultiBuyTotal();
    openModal("shopMultiBuyModal");
    return;
  }

  const targetItem = unownedList[0];
  if (userState.cdCoins < targetItem.price) {
    gameAlert(`💿 CD가 부족합니다!\n(보유: ${userState.cdCoins.toLocaleString()} CD / 필요: ${targetItem.price.toLocaleString()} CD)\n문제를 풀고 점수를 얻으면 CD가 지급됩니다!`);
    return;
  }

  const buyTitle =
    targetItem.cat === "fishing_rod"
      ? "🎣 낚싯대 구매"
      : targetItem.cat === "fishing_bait"
      ? "🪱 미끼 구매"
      : "🛍️ 코스튬 구매";
  gameConfirm(`[${targetItem.name}] 아이템을 💿 ${targetItem.price.toLocaleString()} CD에 구매하고 장착할까요?`, async () => {
    userState.cdCoins -= targetItem.price;
    if (!userState.ownedItems.includes(targetItem.id)) {
      userState.ownedItems.push(targetItem.id);
    }
    userState.avatarConfig = sanitizeAvatarConfigToOwned(shopPreviewState.config);
    shopPreviewState.config = { ...userState.avatarConfig };
    await syncProfileToServer();
    renderShopCategory(shopPreviewState.selectedCat);
    updateShopPreviewCanvas();
    gameAlert(`🎉 [${targetItem.name}] 구매 및 장착 완료!`, "🛍️ 구매 성공");
  }, buyTitle);
}

function purchaseSpecialTicketToBag(ticketId) {
  const item = getItemById("special", ticketId);
  const defaultPrice = ticketId === "nickname_ticket" ? 22000 : 22000;
  const price = Number(item?.price) || defaultPrice;
  const label = item?.name || (ticketId === "nickname_ticket" ? "✨ 닉네임 변경권" : "⚧️ 성별 변경권");

  if (!userState.isLoggedIn) {
    gameAlert("변경권 구매는 로그인 후 이용할 수 있습니다!");
    return;
  }
  if (userState.cdCoins < price) {
    gameAlert(`💿 CD가 부족합니다! (보유: ${userState.cdCoins.toLocaleString()} CD / 필요: ${price.toLocaleString()} CD)`);
    return;
  }

  const curCnt = getConsumableCount(ticketId);
  gameConfirm(
    `[${label}]을(를) ${price.toLocaleString()} CD로 구매하시겠습니까?\n구매 후 🎒가방(인벤토리)에 보관되어 원할 때 사용할 수 있습니다. (현재 보유: ${curCnt}개)`,
    async () => {
      userState.cdCoins -= price;
      if (!userState.inventory || typeof userState.inventory !== "object") userState.inventory = {};
      userState.inventory[ticketId] = getConsumableCount(ticketId) + 1;
      if (typeof markBagItemNew === "function") markBagItemNew(ticketId);
      await syncProfileToServer();
      renderShopCategory(shopPreviewState.selectedCat);
      updateShopPreviewCanvas();
      if (typeof syncAllRewardSparklesUI === "function") syncAllRewardSparklesUI();
      gameConfirm(
        `🎉 [${label}] 구매 완료!\n🎒 가방에 보관되었습니다. (현재 보유: ${userState.inventory[ticketId]}개)\n\n지금 바로 가방에서 사용하시겠습니까?`,
        () => openBagScreen(ticketId),
        "🎒 가방 보관 완료"
      );
      const okBtn = document.getElementById("dialogConfirmBtn");
      const cancelBtn = document.getElementById("dialogCancelBtn");
      if (okBtn) okBtn.textContent = "🎒 가방에서 쓰기";
      if (cancelBtn) cancelBtn.textContent = "🛍️ 쇼핑 계속하기";
    },
    "🛍️ 변경권 구매"
  );
}

function purchaseNicknameTicket() {
  purchaseSpecialTicketToBag("nickname_ticket");
}

function purchaseGenderTicket() {
  purchaseSpecialTicketToBag("gender_ticket");
}

const MAX_CONSUMABLE_BUY_QTY = 99;
let pendingQtyBuyTarget = null;

window.updateShopQtyBuySummary = function () {
  if (!pendingQtyBuyTarget) return;
  const { item } = pendingQtyBuyTarget;
  const unitPrice = Math.max(0, Number(item.price) || 0);
  const inputEl = document.getElementById("shopQtyBuyInput");
  let qty = Math.floor(Number(inputEl ? inputEl.value : 1) || 1);
  if (qty < 1) qty = 1;
  if (qty > MAX_CONSUMABLE_BUY_QTY) {
    qty = MAX_CONSUMABLE_BUY_QTY;
    if (inputEl) inputEl.value = String(qty);
  }

  const curCd = Math.max(0, Math.floor(Number(userState.cdCoins) || 0));
  const curCnt = getConsumableCount(item.id);
  const totalCost = unitPrice * qty;
  const canAfford = curCd >= totalCost;

  const totalEl = document.getElementById("shopQtyBuyTotal");
  const balEl = document.getElementById("shopQtyBuyBalance");
  const afterCntEl = document.getElementById("shopQtyBuyAfterCount");
  const warnEl = document.getElementById("shopQtyBuyWarn");
  const confirmBtn = document.getElementById("shopQtyBuyConfirmBtn");

  if (totalEl) totalEl.textContent = `💿 ${totalCost.toLocaleString()} CD`;
  if (balEl) balEl.textContent = `${curCd.toLocaleString()} CD`;
  if (afterCntEl) afterCntEl.textContent = `${curCnt}개 → ${(curCnt + qty).toLocaleString()}개`;
  if (warnEl) {
    warnEl.classList.toggle("hidden", canAfford);
    warnEl.textContent = canAfford
      ? ""
      : `💿 CD가 ${(totalCost - curCd).toLocaleString()} CD 부족합니다!`;
  }
  if (confirmBtn) {
    confirmBtn.disabled = !canAfford;
    confirmBtn.textContent = canAfford
      ? `🛍️ ${qty}개 구매하기 (💿 ${totalCost.toLocaleString()} CD)`
      : "💿 CD 부족";
  }
};

window.adjustShopQtyBuy = function (delta) {
  const inputEl = document.getElementById("shopQtyBuyInput");
  if (!inputEl) return;
  const cur = Math.max(1, Math.floor(Number(inputEl.value) || 1));
  const next = Math.max(1, Math.min(MAX_CONSUMABLE_BUY_QTY, cur + Number(delta || 0)));
  inputEl.value = String(next);
  updateShopQtyBuySummary();
};

window.setShopQtyBuyMax = function () {
  if (!pendingQtyBuyTarget) return;
  const unitPrice = Math.max(1, Number(pendingQtyBuyTarget.item.price) || 1);
  const curCd = Math.max(0, Math.floor(Number(userState.cdCoins) || 0));
  const maxByCd = Math.floor(curCd / unitPrice);
  const next = Math.max(1, Math.min(MAX_CONSUMABLE_BUY_QTY, maxByCd));
  const inputEl = document.getElementById("shopQtyBuyInput");
  if (inputEl) inputEl.value = String(next);
  updateShopQtyBuySummary();
};

window.confirmShopQtyBuy = async function () {
  if (!pendingQtyBuyTarget) return;
  const { cat, item } = pendingQtyBuyTarget;
  const inputEl = document.getElementById("shopQtyBuyInput");
  const qty = Math.max(1, Math.min(MAX_CONSUMABLE_BUY_QTY, Math.floor(Number(inputEl ? inputEl.value : 1) || 1)));
  const unitPrice = Math.max(0, Number(item.price) || 0);
  const totalCost = unitPrice * qty;

  if ((Number(userState.cdCoins) || 0) < totalCost) {
    gameAlert(`💿 CD가 부족합니다!\n(보유: ${(userState.cdCoins || 0).toLocaleString()} CD / 필요: ${totalCost.toLocaleString()} CD)`);
    return;
  }

  userState.cdCoins -= totalCost;
  if (!userState.inventory || typeof userState.inventory !== "object") userState.inventory = {};
  userState.inventory[item.id] = getConsumableCount(item.id) + qty;
  if (cat === "game_item" && typeof markBagItemNew === "function") {
    markBagItemNew(item.id);
  }
  if (cat === "fishing_bait") {
    userState.avatarConfig.fishingBait = item.id;
    shopPreviewState.config.fishingBait = item.id;
  }
  closeModal("shopQtyBuyModal");
  await syncProfileToServer();
  renderShopCategory(shopPreviewState.selectedCat);
  updateShopPreviewCanvas();
  if (typeof renderFishingHud === "function") renderFishingHud();
  if (typeof syncManualFishingHud === "function") syncManualFishingHud();
  if (typeof refreshFishingShopModalIfOpen === "function") refreshFishingShopModalIfOpen();
  if (typeof syncAllRewardSparklesUI === "function") syncAllRewardSparklesUI();
  gameAlert(
    `🎉 [${item.name}] ×${qty}개를 구매했습니다!\n(사용: 💿 ${totalCost.toLocaleString()} CD · 현재 보유: ${userState.inventory[item.id]}개)`,
    "🛍️ 구매 완료"
  );
};

async function purchaseConsumableShopItem(cat, item) {
  if (!item || !item.id) return;
  pendingQtyBuyTarget = { cat, item };

  const modal = document.getElementById("shopQtyBuyModal");
  if (!modal) {
    const price = Number(item.price) || 0;
    if (userState.cdCoins < price) {
      gameAlert(`💿 CD가 부족합니다!\n(보유: ${userState.cdCoins.toLocaleString()} CD / 필요: ${price.toLocaleString()} CD)`);
      return;
    }
    return;
  }

  const titleEl = document.getElementById("shopQtyBuyTitle");
  const unitEl = document.getElementById("shopQtyBuyUnitPrice");
  const inputEl = document.getElementById("shopQtyBuyInput");
  if (titleEl) titleEl.textContent = item.name;
  if (unitEl) unitEl.textContent = `개당 💿 ${(Number(item.price) || 0).toLocaleString()} CD (최대 ${MAX_CONSUMABLE_BUY_QTY}개)`;
  if (inputEl) inputEl.value = "1";

  updateShopQtyBuySummary();
  openModal("shopQtyBuyModal");
}

window.renderShopCategory = function (cat) {
  shopPreviewState.selectedCat = cat;
  syncShopMainTabsUI(cat);
  document.querySelectorAll("[data-shop-cat]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-shop-cat") === cat);
  });

  const grid = document.getElementById("shopItemsGrid");
  if (!grid) return;

  const cfgKey = getShopCatConfigKey(cat);
  const isFishingGearCat = cat === "fishing_rod" || cat === "fishing_bait";
  const isGameItemCat = cat === "game_item";
  const isEffectCat = cat === "effect";
  const items = isGameItemCat
    ? (typeof GAME_ITEMS_CATALOG !== "undefined" ? GAME_ITEMS_CATALOG : [])
    : (AVATAR_SHOP_ITEMS[cat] || []);

  grid.innerHTML = items
    .map((item, idx) => {
      const cnt = getConsumableCount(item.id);
      const isConsumable = cat === "fishing_bait" || isGameItemCat;
      const owned = isConsumable
        ? cnt > 0
        : isEffectCat
        ? item.id === "none" || (Array.isArray(userState.ownedEffects) && userState.ownedEffects.includes(item.id))
        : (item.purchasable !== false && item.price === 0) || userState.ownedItems.includes(item.id);
      const isEquipped =
        (isFishingGearCat &&
          userState.avatarConfig &&
          userState.avatarConfig[cfgKey] === item.id &&
          (cat !== "fishing_bait" || cnt > 0)) ||
        (isEffectCat &&
          item.id !== "none" &&
          userState.avatarConfig &&
          (userState.avatarConfig.effect || "none") === item.id);
      const previewing =
        cat === "special" || isGameItemCat
          ? shopPreviewState.selectedItem?.id === item.id
          : shopPreviewState.config[cfgKey] === item.id;
      const grade = item.grade || "C";
      const gradeClass = `grade-${String(grade).replace(/\+/g, "-plus")}`;
      const priceText =
        cat === "special" || isGameItemCat
          ? `💿${item.price.toLocaleString()}`
          : isEffectCat
          ? isEquipped
            ? "착용중"
            : owned
            ? "보유"
            : `🪙${item.price.toLocaleString()}`
          : item.purchasable === false && !owned
          ? "출석한정"
          : isEquipped
          ? `착용(${cat === "fishing_bait" ? `${cnt}개` : "중"})`
          : cat === "fishing_bait"
          ? `💿${item.price.toLocaleString()}${cnt > 0 ? `(${cnt})` : ""}`
          : owned
          ? "보유"
          : `💿${item.price.toLocaleString()}`;

      let buffHtml = "";
      if (cat === "fishing_rod" && Number(item.expMultiplier) > 1) {
        const pct = Math.round((Number(item.expMultiplier) - 1) * 100);
        buffHtml = `<span class="apf-tile-buff">EXP +${pct}%</span>`;
      } else if (cat === "fishing_bait" && Number(item.cdMultiplier) > 1) {
        const pct = Math.round((Number(item.cdMultiplier) - 1) * 100);
        buffHtml = `<span class="apf-tile-buff is-cd">CD +${pct}%</span>`;
      }
      const thumbSize = isFishingGearCat ? 40 : 52;
      const iconEmoji = isGameItemCat ? (item.name.split(" ")[0] || "🎒") : "";

      return `
      <div class="apf-tile ${owned && cat !== "special" && !isGameItemCat ? "owned-tile" : ""} ${previewing ? "preview-selected" : ""}" onclick="previewShopItem('${cat}', '${item.id}')">
        <span class="apf-tile-price ${isEquipped ? "is-equipped" : owned && cat !== "special" && !isGameItemCat ? "is-owned" : isEffectCat && !owned ? "is-golden" : ""}">${priceText}</span>
        ${previewing ? `<div class="apf-tile-check">✔</div>` : `<div class="apf-tile-grade ${gradeClass}">${grade}</div>`}
        ${isGameItemCat
          ? `<div style="font-size:2rem; line-height:52px; height:52px; margin-top:7px;">${iconEmoji}</div>`
          : `<canvas id="shopThumb_${cat}_${idx}" width="480" height="480" style="width:${thumbSize}px; height:${thumbSize}px; margin-top:7px;"></canvas>`}
        ${buffHtml}
        <span class="apf-tile-name">${item.name}</span>
      </div>
    `;
    })
    .join("");

  if (!isGameItemCat) {
    items.forEach((item, idx) => {
      const cv = document.getElementById(`shopThumb_${cat}_${idx}`);
      if (cv) renderItemThumbnail(cv, cat, item);
    });
  }
};

window.previewShopItem = function (cat, itemId) {
  const item = cat === "game_item"
    ? (typeof getGameItemById === "function" ? getGameItemById(itemId) : null)
    : getItemById(cat, itemId);
  if (!item) return;
  shopPreviewState.selectedItem = { cat, ...item };
  if (cat !== "special" && cat !== "game_item") {
    shopPreviewState.config.gender = (userState.avatarConfig && userState.avatarConfig.gender) || "male";
    shopPreviewState.config[getShopCatConfigKey(cat)] = itemId;
  } else if (itemId === "gender_ticket") {
    // 성별 변경권 선택 시 피팅룸에서 반대 성별 미리보기 제공
    shopPreviewState.config.gender = userState.avatarConfig.gender === "female" ? "male" : "female";
  } else {
    shopPreviewState.config.gender = (userState.avatarConfig && userState.avatarConfig.gender) || "male";
  }
  renderShopCategory(cat);
  updateShopPreviewCanvas();
};

// ============================================================================
// 4. 좌측 상단 클릭 -> 내 프로필 & 전적/랭킹 팝업 + 타 유저 프로필
// ============================================================================
window.openMyProfileModal = async function () {
  if (!userState.isLoggedIn) {
    gameConfirm("로그인이 필요한 기능입니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }
  openModal("profileModal");
  const cv = document.getElementById("profileAvatarCanvas");
  if (cv) {
    renderPixelAvatar(cv, userState.avatarConfig);
    requestAnimationFrame(() => {
      const m = document.getElementById("profileModal");
      if (m && !m.classList.contains("hidden")) renderPixelAvatar(cv, userState.avatarConfig);
    });
  }

  document.getElementById("profileNickDisplay").textContent = userState.nickname;
  document.getElementById("profileCdDisplay").textContent = `💿 ${userState.cdCoins.toLocaleString()} CD`;
  document.getElementById("profileBioInput").value = userState.bio;

  const b1 = document.getElementById("profileBattle1v1");
  const b4 = document.getElementById("profileBattle4p");
  if (b1) b1.textContent = formatBattleStatText(userState.battleStats["1v1"]);
  if (b4) b4.textContent = formatBattleStatText(userState.battleStats["4p"]);

  if (typeof getLevelInfo === "function") {
    const lv = getLevelInfo(userState.exp);
    const pTitle = document.getElementById("profileTitleDisplay");
    if (pTitle) {
      pTitle.innerHTML = typeof formatMusicRankBadgeHtml === "function"
        ? formatMusicRankBadgeHtml(userState.exp, { size: 18 })
        : `Lv.${lv.level} ${lv.title}`;
    }
    const pExpText = document.getElementById("profileExpText");
    if (pExpText) {
      pExpText.textContent = lv.isMax
        ? `MAX (${lv.exp.toLocaleString()} EXP)`
        : `${lv.inLevelExp.toLocaleString()} / ${lv.needInLevel.toLocaleString()} EXP (총 ${lv.exp.toLocaleString()})`;
    }
    const pExpPct = document.getElementById("profileExpPercent");
    if (pExpPct) pExpPct.textContent = `${lv.percent.toFixed(1)}%`;
    const pExpFill = document.getElementById("profileExpFill");
    if (pExpFill) pExpFill.style.width = `${lv.percent.toFixed(1)}%`;
  }

  // 수파베이스에서 내 통산 전적 및 랭킹 순위 계산
  document.getElementById("statPlayCount").textContent = "조회중...";
  document.getElementById("statBestScore").textContent = "-";
  document.getElementById("statAvgAcc").textContent = "-";
  document.getElementById("statMyRank").textContent = "-";

  if (sbClient && userState.id) {
    try {
      const { data: myRecords } = await sbClient
        .from("rankings")
        .select("score, accuracy")
        .eq("user_id", userState.id);

      const playCount = myRecords ? myRecords.length : 0;
      const bestScore = playCount > 0 ? Math.max(...myRecords.map(r => r.score || 0)) : 0;
      const avgAcc =
        playCount > 0
          ? Math.round(myRecords.reduce((acc, r) => acc + (r.accuracy || 0), 0) / playCount)
          : 0;

      document.getElementById("statPlayCount").textContent = `${playCount}회`;
      document.getElementById("statBestScore").textContent = `${bestScore}점`;
      document.getElementById("statAvgAcc").textContent = `${avgAcc}%`;

      document.getElementById("statMyRank").textContent = await computeUserUniqueRank(userState.id, bestScore);
    } catch (e) {}
  }
};

window.saveMyBio = async function () {
  const newBio = document.getElementById("profileBioInput").value.trim();
  if (newBio) {
    const bioCheck = validateCleanUserText(newBio, { fieldLabel: "프로필 소개글" });
    if (!bioCheck.ok) {
      gameAlert(bioCheck.message, "🚫 소개글 제한");
      return;
    }
  }
  userState.bio = newBio || "안녕하세요! 음악왕 도전자입니다.";
  await syncProfileToServer();
  gameAlert("프로필 소개글이 저장되었습니다!");
};

window.inspectOtherUser = async function (targetId, fallbackNick) {
  if (!targetId || targetId === "undefined") return;
  openModal("userInspectModal");
  document.getElementById("inspectNick").textContent = fallbackNick || "유저";
  document.getElementById("inspectBio").textContent = "프로필 불러오는 중...";
  document.getElementById("inspectTargetId").value = targetId;

  document.getElementById("inspectPlayCount").textContent = "조회중...";
  document.getElementById("inspectBestScore").textContent = "-";
  document.getElementById("inspectAvgAcc").textContent = "-";
  document.getElementById("inspectUserRank").textContent = "-";
  document.getElementById("inspectBattle1v1").textContent = "0전 0승 0패 (0%)";
  document.getElementById("inspectBattle4p").textContent = "0전 0승 0패 (0%)";

  const actionRow = document.getElementById("inspectActionRow");
  const friendBtn = document.getElementById("inspectFriendBtn");
  const dmBtn = document.getElementById("inspectDmBtn");
  const battleBtn = document.getElementById("inspectBattleBtn");
  const isSelf = userState.id && targetId === userState.id;

  if (actionRow) actionRow.classList.toggle("hidden", !!isSelf);
  if (friendBtn) {
    friendBtn.classList.remove("hidden");
    friendBtn.disabled = false;
    friendBtn.textContent = "➕ 친구 신청";
    friendBtn.onclick = () => sendFriendRequestByNick(document.getElementById("inspectNick").textContent);
  }
  if (dmBtn) {
    dmBtn.textContent = "💬 1:1 채팅";
    dmBtn.onclick = () => {
      closeModal("userInspectModal");
      prepareDmTo(targetId, document.getElementById("inspectNick").textContent);
    };
  }
  if (battleBtn) {
    battleBtn.disabled = false;
    battleBtn.textContent = "⚔️ 대결 요청";
    battleBtn.onclick = () => {
      const nick = document.getElementById("inspectNick").textContent;
      closeModal("userInspectModal");
      if (typeof sendBattleInviteToUser === "function") {
        sendBattleInviteToUser(targetId, nick, "direct_duel");
      }
    };
  }

  if (sbClient) {
    try {
      const { data } = await sbClient.from("profiles").select("*").eq("id", targetId).maybeSingle();
      if (data) {
        document.getElementById("inspectNick").textContent = data.nickname;
        document.getElementById("inspectBio").textContent = data.bio || "소개가 없습니다.";
        document.getElementById("inspectCdDisplay").textContent = `💿 ${(data.cd_coins ?? 0).toLocaleString()} CD`;
        const rawCfg = data.avatar_config || DEFAULT_AVATAR_CONFIG;
        const cv = document.getElementById("inspectAvatarCanvas");
        if (cv) {
          renderPixelAvatar(cv, rawCfg);
          requestAnimationFrame(() => {
            const m = document.getElementById("userInspectModal");
            if (m && !m.classList.contains("hidden")) renderPixelAvatar(cv, rawCfg);
          });
        }

        const targetExp = Number(rawCfg._exp) || 0;
        if (typeof getLevelInfo === "function") {
          const lv = getLevelInfo(targetExp);
          const iTitle = document.getElementById("inspectTitleDisplay");
          if (iTitle) {
            iTitle.innerHTML = typeof formatMusicRankBadgeHtml === "function"
              ? formatMusicRankBadgeHtml(targetExp, { size: 18 })
              : `Lv.${lv.level} ${lv.title}`;
          }
          document.getElementById("inspectExpText").textContent = lv.isMax
            ? `MAX (${lv.exp.toLocaleString()} EXP)`
            : `${lv.inLevelExp.toLocaleString()} / ${lv.needInLevel.toLocaleString()} EXP (총 ${lv.exp.toLocaleString()})`;
          document.getElementById("inspectExpPercent").textContent = `${lv.percent.toFixed(1)}%`;
          document.getElementById("inspectExpFill").style.width = `${lv.percent.toFixed(1)}%`;
        }

        const bStats = normalizeBattleStats(rawCfg._battleStats);
        document.getElementById("inspectBattle1v1").textContent = formatBattleStatText(bStats["1v1"]);
        document.getElementById("inspectBattle4p").textContent = formatBattleStatText(bStats["4p"]);
      }

      const { data: recs } = await sbClient.from("rankings").select("score, accuracy").eq("user_id", targetId);
      const playCount = recs ? recs.length : 0;
      const bestScore = playCount > 0 ? Math.max(...recs.map(r => r.score || 0)) : 0;
      const avgAcc =
        playCount > 0
          ? Math.round(recs.reduce((acc, r) => acc + (r.accuracy || 0), 0) / playCount)
          : 0;
      document.getElementById("inspectPlayCount").textContent = `${playCount}회`;
      document.getElementById("inspectBestScore").textContent = `${bestScore}점`;
      document.getElementById("inspectAvgAcc").textContent = `${avgAcc}%`;

      document.getElementById("inspectUserRank").textContent = await computeUserUniqueRank(targetId, bestScore);

      // 친구 여부 확인: 이미 친구면 친구추가 버튼 비활성화(숨김) + DM보내기 버튼으로 전환!
      if (!isSelf && userState.id && friendBtn && dmBtn) {
        const { data: rel } = await sbClient
          .from("friendships")
          .select("status")
          .or(`and(requester_id.eq.${userState.id},receiver_id.eq.${targetId}),and(requester_id.eq.${targetId},receiver_id.eq.${userState.id})`)
          .maybeSingle();

        if (rel && rel.status === "accepted") {
          friendBtn.classList.add("hidden");
          dmBtn.textContent = "💬 DM 보내기";
        } else if (rel && rel.status === "pending") {
          friendBtn.disabled = true;
          friendBtn.textContent = "⏳ 친구 대기중";
        }
      }
    } catch (e) {}
  }
};

window.openReportBlockDialog = function (targetId, targetNick) {
  if (!userState.isLoggedIn || !userState.id) {
    gameAlert("신고 및 차단 기능은 로그인 후 이용할 수 있습니다.");
    return;
  }
  const cleanId = targetId && targetId !== "undefined" ? String(targetId) : "";
  const cleanNick = String(targetNick || "유저").trim() || "유저";
  if (cleanId && cleanId === userState.id) {
    gameAlert("자기 자신은 신고 또는 차단할 수 없습니다.");
    return;
  }

  gamePrompt(
    `[${cleanNick}]님을 신고 및 차단하시겠습니까?\n차단 시 친구 목록·1:1 DM·알림에서 즉시 숨겨집니다.\n\n신고 사유를 입력해 주세요:`,
    "부적절한 언어 / 비매너 행동",
    async reasonInput => {
      const reason = String(reasonInput || "").trim() || "부적절한 행동/비매너";
      if (!isUserBlocked(cleanId, cleanNick)) {
        userState.blockedUsers = [
          ...(userState.blockedUsers || []),
          { id: cleanId, nickname: cleanNick, blockedAt: new Date().toISOString() }
        ];
        saveBlockedUsersToStorage();
      }

      if (cleanId) {
        dmNotiState.unreadList = dmNotiState.unreadList.filter(m => m.sender_id !== cleanId);
        syncDmNotiBadgeUI();
      }

      if (sbClient && userState.id) {
        try {
          await syncProfileToServer();
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (cleanId && uuidRegex.test(cleanId)) {
            await sbClient.from("user_reports").insert({
              reporter_id: userState.id,
              target_id: cleanId,
              target_nickname: cleanNick,
              reason
            });
          }
        } catch (e) {}
      }

      closeModal("userInspectModal");
      if (typeof state !== "undefined" && state.currentScreen === "dmChatScreen" && dmState.peerId === cleanId) {
        if (typeof stopDmRealtime === "function") stopDmRealtime();
        switchScreen("socialScreen");
      }

      if (typeof loadFriendsData === "function") loadFriendsData();
      if (typeof state !== "undefined" && state.currentScreen === "rankingScreen") loadRankingsList();
      if (typeof state !== "undefined" && state.currentScreen === "plazaScreen") renderLobbyOnlineUsers();

      gameAlert(`[${cleanNick}]님이 신고 및 차단 처리되었습니다.\n내 화면의 친구·DM·알림·대기실 목록에서 즉시 숨겨집니다.`, "🚨 신고/차단 완료");
    },
    "🚨 유저 신고 및 차단"
  );
};

window.unblockUserById = async function (targetId, targetNick = "") {
  userState.blockedUsers = (userState.blockedUsers || []).filter(b => {
    if (targetId && b.id) return String(b.id) !== String(targetId);
    return b.nickname !== targetNick;
  });
  saveBlockedUsersToStorage();
  await syncProfileToServer();
  openBlockedUsersModal();
  if (typeof loadFriendsData === "function") loadFriendsData();
};

window.openBlockedUsersModal = function () {
  const box = document.getElementById("blockedUsersListBox");
  if (!box) return;
  const list = userState.blockedUsers || [];
  if (list.length === 0) {
    box.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub); font-size:0.84rem;">현재 차단된 유저가 없습니다.</div>`;
  } else {
    box.innerHTML = list
      .map(b => {
        const safeId = escapeJsSingleArg(b.id);
        const safeNick = escapeJsSingleArg(b.nickname || "유저");
        const dateStr = b.blockedAt ? new Date(b.blockedAt).toLocaleDateString() : "";
        return `
          <div class="pixel-list-item" style="cursor:default;">
            <div>
              <strong style="font-size:0.88rem;">🚫 ${b.nickname || "알 수 없는 유저"}</strong>
              ${dateStr ? `<div style="font-size:0.72rem; color:var(--text-sub);">차단일: ${dateStr}</div>` : ""}
            </div>
            <button type="button" class="btn" style="padding:5px 10px; font-size:0.76rem;" onclick="unblockUserById('${safeId}', '${safeNick}')">차단 해제</button>
          </div>
        `;
      })
      .join("");
  }
  openModal("blockedUsersModal");
};

// ============================================================================
// 5. 카카오톡 스타일 전체화면 친구 목록(#socialScreen) & 1:1 DM 채팅방(#dmChatScreen)
// ============================================================================
const dmState = {
  peerId: null,
  peerNick: "",
  peerAvatar: { ...DEFAULT_AVATAR_CONFIG },
  channel: null,
  pollTimer: null
};

const dmNotiState = {
  unreadList: [],
  profileMap: new Map(),
  channel: null,
  pollTimer: null
};

const adminGiftState = {
  unclaimedList: [],
  shownPopupIds: new Set(),
  channel: null,
  isClaiming: false
};

function escapeOnlineHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getSeenDmMap() {
  if (!userState.id) return {};
  try {
    return JSON.parse(localStorage.getItem(`mk_dm_seen_map_${userState.id}`) || "{}");
  } catch (e) {
    return {};
  }
}

window.markPeerDmRead = function (peerId, newestIso = null) {
  if (!userState.id || !peerId) return;
  const map = getSeenDmMap();
  map[peerId] = newestIso || new Date().toISOString();
  localStorage.setItem(`mk_dm_seen_map_${userState.id}`, JSON.stringify(map));
  dmNotiState.unreadList = dmNotiState.unreadList.filter(m => m.sender_id !== peerId);
  syncDmNotiBadgeUI();
};

window.markAllDmNotiRead = function () {
  if (!userState.id) return;
  const map = getSeenDmMap();
  const nowIso = new Date().toISOString();
  dmNotiState.unreadList.forEach(m => {
    map[m.sender_id] = m.created_at > nowIso ? m.created_at : nowIso;
  });
  localStorage.setItem(`mk_dm_seen_map_${userState.id}`, JSON.stringify(map));
  dmNotiState.unreadList = [];
  syncDmNotiBadgeUI();
};

window.syncDmNotiBadgeUI = function () {
  const btn = document.getElementById("floatingDmNotiBtn");
  const badge = document.getElementById("dmNotiBadgeCount");
  const homeBtn = document.getElementById("homeDmNotiBtn");
  const homeBadge = document.getElementById("homeDmNotiBadgeCount");
  const chatsTabBadge = document.getElementById("socialChatsUnreadBadge");
  const dmUnreadCount = dmNotiState.unreadList.length;
  const dmUnreadText = dmUnreadCount > 99 ? "99+" : String(dmUnreadCount);
  if (chatsTabBadge) {
    chatsTabBadge.classList.toggle("hidden", dmUnreadCount <= 0);
    chatsTabBadge.textContent = dmUnreadText;
  }

  const count = dmUnreadCount + adminGiftState.unclaimedList.length;
  const countText = count > 99 ? "99+" : String(count);
  if (homeBadge) {
    homeBadge.classList.toggle("hidden", count <= 0);
    homeBadge.textContent = countText;
  }
  if (homeBtn) {
    homeBtn.classList.toggle("has-noti-alert", userState.isLoggedIn && count > 0);
  }
  if (!btn || !badge) return;
  const curScreen = typeof state !== "undefined" ? state.currentScreen : "homeScreen";
  const allowScreen = ["setupScreen", "plazaScreen", "rankingScreen", "socialScreen"].includes(curScreen);
  const shouldShowBtn = userState.isLoggedIn && count > 0 && allowScreen;
  btn.classList.toggle("hidden", !shouldShowBtn);
  btn.classList.toggle("has-noti-alert", shouldShowBtn);
  badge.classList.toggle("hidden", count <= 0);
  badge.textContent = countText;
};

function buildAdminGiftRewardChipsHtml(gift) {
  const chips = [];
  const cd = Math.max(0, Math.floor(Number(gift?.reward_cd) || 0));
  const exp = Math.max(0, Math.floor(Number(gift?.reward_exp) || 0));
  const arcadeCoins = Math.max(0, Math.floor(Number(gift?.reward_arcade_coins) || 0));
  const goldenCoins = Math.max(0, Math.floor(Number(gift?.reward_golden_coins) || 0));
  const items = Array.isArray(gift?.reward_items) ? gift.reward_items : [];
  if (cd > 0) {
    chips.push(`<span class="admin-gift-chip is-cd">💿 +${cd.toLocaleString()} CD</span>`);
  }
  if (exp > 0) {
    chips.push(`<span class="admin-gift-chip is-exp">✨ +${exp.toLocaleString()} EXP</span>`);
  }
  if (arcadeCoins > 0) {
    chips.push(`<span class="admin-gift-chip" style="background:#dbeafe; border-color:#60a5fa; color:#1e40af;">🎟️ +${arcadeCoins.toLocaleString()} 동전</span>`);
  }
  if (goldenCoins > 0) {
    chips.push(`<span class="admin-gift-chip" style="background:#fef3c7; border-color:#f59e0b; color:#b45309;">🪙 +${goldenCoins.toLocaleString()} 황금주화</span>`);
  }
  items.forEach(it => {
    if (!it || !it.id) return;
    const qty = Math.max(1, Math.floor(Number(it.qty) || 1));
    const nm = escapeOnlineHtml(it.name || it.id);
    const ico = it.kind === "effect" ? "✨ " : "";
    chips.push(`<span class="admin-gift-chip">${ico}${nm}${qty > 1 ? ` ×${qty}` : ""}</span>`);
  });
  return chips.join("");
}

function renderAdminGiftsInNotiModal() {
  const sec = document.getElementById("adminGiftsNotiSection");
  const listEl = document.getElementById("adminGiftsNotiList");
  const claimAllBtn = document.getElementById("adminGiftsClaimAllBtn");
  if (!sec || !listEl) return;

  const list = adminGiftState.unclaimedList || [];
  sec.classList.toggle("hidden", list.length === 0);
  if (claimAllBtn) {
    claimAllBtn.classList.toggle("hidden", list.length <= 1);
    claimAllBtn.textContent = `🎁 ${list.length}개 모두 받기`;
  }
  if (list.length === 0) {
    listEl.innerHTML = "";
    return;
  }

  listEl.innerHTML = list
    .map(g => {
      const dStr = g.created_at ? new Date(g.created_at).toLocaleDateString() : "";
      return `
        <div class="admin-gift-card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
            <div style="min-width:0; flex:1;">
              <div style="font-size:0.86rem; font-weight:900; color:#b45309;">🎁 ${escapeOnlineHtml(g.title || "운영자 선물")}</div>
              ${dStr ? `<div style="font-size:0.68rem; color:var(--text-sub);">보낸이: ${escapeOnlineHtml(g.sender_nickname || "관리자")} · ${dStr}</div>` : ""}
            </div>
            <button type="button" class="btn btn-gold" style="padding:5px 10px; font-size:0.74rem; flex-shrink:0;" onclick="claimAdminGiftById(${Number(g.id)})">받기</button>
          </div>
          ${g.message ? `<div style="font-size:0.78rem; color:var(--text-main); margin-top:5px; line-height:1.4; word-break:keep-all;">${escapeOnlineHtml(g.message)}</div>` : ""}
          <div class="admin-gift-rewards-row">${buildAdminGiftRewardChipsHtml(g)}</div>
        </div>
      `;
    })
    .join("");
}

function canPopAdminGiftArrivalNow() {
  if (typeof userState === "undefined" || !userState.isLoggedIn || !userState.id) return false;
  const curScreen = typeof state !== "undefined" ? state.currentScreen : "loginScreen";
  if (["loginScreen", "gameScreen", "judgeScreen", "battlePlayScreen"].includes(curScreen)) return false;
  if (document.hidden || window.__onestorePaused) return false;
  const openModalEl = document.querySelector(".modal-backdrop:not(.hidden)");
  if (openModalEl) return false;
  return true;
}

window.tryShowPendingAdminGiftPopup = function () {
  if (!canPopAdminGiftArrivalNow()) return;
  const unshown = (adminGiftState.unclaimedList || []).filter(g => !adminGiftState.shownPopupIds.has(g.id));
  if (unshown.length === 0) return;

  const targetGift = unshown[0];
  adminGiftState.unclaimedList.forEach(g => adminGiftState.shownPopupIds.add(g.id));

  const totalCount = adminGiftState.unclaimedList.length;
  const titleEl = document.getElementById("adminGiftPopupTitle");
  const msgEl = document.getElementById("adminGiftPopupMsg");
  const rewardsEl = document.getElementById("adminGiftPopupRewards");
  const claimBtn = document.getElementById("adminGiftPopupClaimBtn");

  if (titleEl) {
    titleEl.textContent =
      totalCount > 1
        ? `👑 ${targetGift.title || "운영자 선물"} 외 ${totalCount - 1}건 도착!`
        : `👑 ${targetGift.title || "운영자 선물이 도착했습니다!"}`;
  }
  if (msgEl) {
    msgEl.textContent = targetGift.message || `${targetGift.sender_nickname || "관리자"}님이 특별한 선물을 보냈습니다.`;
  }
  if (rewardsEl) {
    if (totalCount === 1) {
      rewardsEl.innerHTML = buildAdminGiftRewardChipsHtml(targetGift);
    } else {
      rewardsEl.innerHTML = `${buildAdminGiftRewardChipsHtml(targetGift)}<span class="admin-gift-chip">+ 외 ${totalCount - 1}건</span>`;
    }
  }
  if (claimBtn) {
    claimBtn.disabled = false;
    claimBtn.textContent = totalCount > 1 ? `🎁 선물 ${totalCount}건 모두 받기!` : "🎁 지금 선물 받기!";
    claimBtn.onclick = () => {
      if (totalCount > 1) claimAllAdminGifts();
      else claimAdminGiftById(Number(targetGift.id));
    };
  }

  if (typeof playRandomBoxFanfare === "function") {
    playRandomBoxFanfare("burst");
    if (typeof window.triggerGameHaptic === "function") window.triggerGameHaptic("medium");
  }
  openModal("adminGiftPopupModal");
};

window.refreshAdminGifts = async function (allowPopup = false) {
  if (!sbClient || !userState.isLoggedIn || !userState.id) {
    adminGiftState.unclaimedList = [];
    syncDmNotiBadgeUI();
    return;
  }

  try {
    const { data, error } = await sbClient
      .from("admin_gifts")
      .select("*")
      .eq("target_user_id", userState.id)
      .is("claimed_at", null)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) return;
    adminGiftState.unclaimedList = Array.isArray(data) ? data : [];
    syncDmNotiBadgeUI();

    const notiModal = document.getElementById("dmNotiModal");
    if (notiModal && !notiModal.classList.contains("hidden")) {
      renderAdminGiftsInNotiModal();
    }

    if (allowPopup && adminGiftState.unclaimedList.some(g => !adminGiftState.shownPopupIds.has(g.id))) {
      tryShowPendingAdminGiftPopup();
    }
  } catch (e) {}
};

async function processClaimedAdminGiftRows(claimedRows, opts = {}) {
  if (!Array.isArray(claimedRows) || claimedRows.length === 0) return;

  let totalCd = 0;
  let totalExp = 0;
  let totalArcadeCoins = 0;
  let totalGoldenCoins = 0;
  const itemSummaryMap = new Map();
  const expBefore = Number(userState.exp) || 0;

  claimedRows.forEach(g => {
    totalCd += Math.max(0, Math.floor(Number(g.reward_cd) || 0));
    totalExp += Math.max(0, Math.floor(Number(g.reward_exp) || 0));
    totalArcadeCoins += Math.max(0, Math.floor(Number(g.reward_arcade_coins) || 0));
    totalGoldenCoins += Math.max(0, Math.floor(Number(g.reward_golden_coins) || 0));
    const items = Array.isArray(g.reward_items) ? g.reward_items : [];
    items.forEach(it => {
      if (!it || !it.id) return;
      const qty = Math.max(1, Math.floor(Number(it.qty) || 1));
      const isConsumable = it.kind === "consumable";
      const isEffect = it.kind === "effect" || it.category === "effect";
      if (isConsumable) {
        userState.inventory[it.id] = getConsumableCount(it.id) + qty;
        if (typeof markBagItemNew === "function") markBagItemNew(it.id);
      } else if (isEffect) {
        if (!Array.isArray(userState.ownedEffects)) userState.ownedEffects = [];
        if (!userState.ownedEffects.includes(it.id)) {
          userState.ownedEffects.push(it.id);
        }
      } else {
        if (!Array.isArray(userState.ownedItems)) userState.ownedItems = [];
        if (!userState.ownedItems.includes(it.id)) {
          userState.ownedItems.push(it.id);
        }
      }
      const key = `${isEffect ? "eff" : "item"}_${it.id}`;
      const prev = itemSummaryMap.get(key) || { name: it.name || it.id, qty: 0, isConsumable, isEffect };
      prev.qty += isConsumable ? qty : 1;
      itemSummaryMap.set(key, prev);
    });
  });

  if (totalCd > 0) userState.cdCoins = (Number(userState.cdCoins) || 0) + totalCd;
  if (totalExp > 0) userState.exp = expBefore + totalExp;
  if (totalArcadeCoins > 0) userState.arcadeCoins = (Number(userState.arcadeCoins) || 0) + totalArcadeCoins;
  if (totalGoldenCoins > 0) userState.goldenCoins = (Number(userState.goldenCoins) || 0) + totalGoldenCoins;

  if (opts.refreshV3FromServer && sbClient && userState.id) {
    try {
      const { data: freshV3 } = await sbClient
        .from("profiles")
        .select("arcade_coins, golden_coins, owned_effects")
        .eq("id", userState.id)
        .maybeSingle();
      if (freshV3) {
        userState.arcadeCoins = Math.max(0, Number(freshV3.arcade_coins) || 0);
        userState.goldenCoins = Math.max(0, Number(freshV3.golden_coins) || 0);
        if (Array.isArray(freshV3.owned_effects)) {
          userState.ownedEffects = [...freshV3.owned_effects];
        }
      }
    } catch (e) {}
  }

  const claimedIds = new Set(claimedRows.map(r => r.id));
  adminGiftState.unclaimedList = adminGiftState.unclaimedList.filter(g => !claimedIds.has(g.id));
  claimedIds.forEach(id => adminGiftState.shownPopupIds.add(id));
  syncDmNotiBadgeUI();

  await syncProfileToServer();
  if (typeof renderBagScreen === "function" && typeof state !== "undefined" && state.currentScreen === "bagScreen") {
    renderBagScreen();
  }
  if (typeof updateShopPreviewCanvas === "function" && typeof state !== "undefined" && state.currentScreen === "shopScreen") {
    renderShopCategory(shopPreviewState.selectedCat);
    updateShopPreviewCanvas();
  }
  if (typeof renderFishingHud === "function" && typeof state !== "undefined" && state.currentScreen === "fishingScreen") {
    renderFishingHud();
  }
  if (typeof refreshArcadeLobbyBalances === "function" && typeof state !== "undefined" && state.currentScreen === "arcadeScreen") {
    refreshArcadeLobbyBalances();
  }

  const notiModal = document.getElementById("dmNotiModal");
  if (notiModal && !notiModal.classList.contains("hidden")) {
    renderAdminGiftsInNotiModal();
  }

  if (typeof playRandomBoxFanfare === "function") {
    playRandomBoxFanfare("burst");
    if (typeof window.triggerGameHaptic === "function") window.triggerGameHaptic("medium");
  }

  const lines = [];
  if (totalCd > 0) lines.push(`💿 +${totalCd.toLocaleString()} CD`);
  if (totalExp > 0) lines.push(`✨ +${totalExp.toLocaleString()} EXP`);
  if (totalArcadeCoins > 0) lines.push(`🎟️ +${totalArcadeCoins.toLocaleString()} 오락실 동전`);
  if (totalGoldenCoins > 0) lines.push(`🪙 +${totalGoldenCoins.toLocaleString()} 황금주화`);
  itemSummaryMap.forEach(v => {
    lines.push(`${v.isEffect ? "✨" : "🎁"} ${v.name}${v.isConsumable && v.qty > 1 ? ` ×${v.qty}` : ""}`);
  });
  const beforeLv = typeof getLevelInfo === "function" ? getLevelInfo(expBefore).level : 1;
  const afterLv = typeof getLevelInfo === "function" ? getLevelInfo(userState.exp).level : beforeLv;
  if (afterLv > beforeLv) {
    lines.push(`🎉 LEVEL UP! (Lv.${beforeLv} → Lv.${afterLv})`);
  }

  const reasons = [...new Set(claimedRows.map(r => r.title || "운영자 선물"))].join(", ");
  gameAlert(`[${reasons}]\n${lines.join("\n")}`, "🎁 운영자 선물 수령 완료!");
}

async function claimAdminGiftIds(ids) {
  if (!sbClient || !userState.isLoggedIn || !userState.id) return;
  if (adminGiftState.isClaiming) return;
  const cleanIds = (ids || []).map(Number).filter(n => Number.isFinite(n) && n > 0);
  if (cleanIds.length === 0) return;

  adminGiftState.isClaiming = true;
  try {
    const selectedGifts = (adminGiftState.unclaimedList || []).filter(g => cleanIds.includes(Number(g.id)));
    const needsV3Rpc = selectedGifts.some(
      g =>
        Number(g.reward_arcade_coins) > 0 ||
        Number(g.reward_golden_coins) > 0 ||
        (Array.isArray(g.reward_items) && g.reward_items.some(it => it && (it.kind === "effect" || it.category === "effect")))
    );

    const { data: rpcRows, error: rpcErr } = await sbClient.rpc("claim_admin_gifts", { p_gift_ids: cleanIds });
    if (!rpcErr) {
      const popupEl = document.getElementById("adminGiftPopupModal");
      if (popupEl && !popupEl.classList.contains("hidden")) {
        popupEl.classList.add("hidden");
      }
      if (!rpcRows || rpcRows.length === 0) {
        await refreshAdminGifts(false);
        gameAlert("이미 수령 완료된 선물입니다.");
        return;
      }
      await processClaimedAdminGiftRows(rpcRows, { refreshV3FromServer: true });
      return;
    }

    // 아직 Supabase SQL에 claim_admin_gifts RPC가 등록되지 않은 경우:
    // 일반 보상(CD/EXP/아이템)은 기존 방식 폴백, V3(동전/황금주화/이펙트)는 SQL 등록 안내
    const missingRpc = /claim_admin_gifts|function/i.test(String(rpcErr.message || "")) || rpcErr.code === "PGRST202";
    if (needsV3Rpc || !missingRpc) {
      gameAlert("동전·황금주화·이펙트 선물 수령을 위해 Supabase SQL(claim_admin_gifts) 반영이 필요합니다.");
      return;
    }

    const { data: claimedRows, error } = await sbClient
      .from("admin_gifts")
      .update({ claimed_at: new Date().toISOString() })
      .in("id", cleanIds)
      .eq("target_user_id", userState.id)
      .is("claimed_at", null)
      .select("*");

    if (error) {
      gameAlert("선물 수령 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    const popupEl = document.getElementById("adminGiftPopupModal");
    if (popupEl && !popupEl.classList.contains("hidden")) {
      popupEl.classList.add("hidden");
    }
    if (!claimedRows || claimedRows.length === 0) {
      await refreshAdminGifts(false);
      gameAlert("이미 수령 완료된 선물입니다.");
      return;
    }
    await processClaimedAdminGiftRows(claimedRows, { refreshV3FromServer: false });
  } finally {
    adminGiftState.isClaiming = false;
  }
}

window.claimAdminGiftById = function (giftId) {
  claimAdminGiftIds([giftId]);
};

window.claimAllAdminGifts = function () {
  const ids = (adminGiftState.unclaimedList || []).map(g => g.id);
  claimAdminGiftIds(ids);
};

window.refreshUnreadDmNotis = async function () {
  if (!sbClient || !userState.isLoggedIn || !userState.id) {
    dmNotiState.unreadList = [];
    syncDmNotiBadgeUI();
    return;
  }

  try {
    const sinceIso = new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString();
    const { data: msgs } = await sbClient
      .from("direct_messages")
      .select("*")
      .eq("receiver_id", userState.id)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(40);

    const seenMap = getSeenDmMap();
    const curScreen = typeof state !== "undefined" ? state.currentScreen : "";

    // 현재 해당 상대와 카톡 채팅방에 이미 들어가 있거나 차단/대화삭제 시점 이전이면 알림 제외
    const unread = (msgs || []).filter(m => {
      if (isUserBlocked(m.sender_id)) return false;
      const hiddenCut = getHiddenDmCutoffMs(m.sender_id);
      if (hiddenCut > 0 && new Date(m.created_at).getTime() <= hiddenCut) return false;
      if (curScreen === "dmChatScreen" && dmState.peerId === m.sender_id) {
        return false;
      }
      const seenAt = seenMap[m.sender_id] || "";
      return !seenAt || new Date(m.created_at).getTime() > new Date(seenAt).getTime();
    });

    dmNotiState.unreadList = unread;

    const senderIds = [...new Set(unread.map(m => m.sender_id))];
    if (senderIds.length > 0) {
      const { data: profs } = await sbClient.from("profiles").select("id, nickname, avatar_config").in("id", senderIds);
      (profs || []).forEach(p => dmNotiState.profileMap.set(p.id, p));
    }

    syncDmNotiBadgeUI();
  } catch (e) {}
};

window.startGlobalDmNotiListener = function () {
  stopGlobalDmNotiListener();
  if (!sbClient || !userState.isLoggedIn || !userState.id) return;

  refreshUnreadDmNotis();
  refreshAdminGifts(true);

  dmNotiState.channel = sbClient
    .channel(`global_dm_noti_${userState.id}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, payload => {
      const row = payload.new;
      if (row && row.receiver_id === userState.id) {
        refreshUnreadDmNotis();
        if (typeof state !== "undefined" && state.currentScreen === "socialScreen" && socialUiState.activeTab === "chats") {
          loadDmConversationsList();
        }
      }
    })
    .subscribe();

  adminGiftState.channel = sbClient
    .channel(`global_admin_gift_${userState.id}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_gifts" }, payload => {
      const row = payload.new;
      if (row && row.target_user_id === userState.id && !row.claimed_at) {
        refreshAdminGifts(true);
      }
    })
    .subscribe();

  dmNotiState.pollTimer = setInterval(() => {
    refreshUnreadDmNotis();
    refreshAdminGifts(true);
  }, 8000);
};

window.stopGlobalDmNotiListener = function () {
  if (dmNotiState.channel && sbClient) {
    try { sbClient.removeChannel(dmNotiState.channel); } catch (e) {}
    dmNotiState.channel = null;
  }
  if (adminGiftState.channel && sbClient) {
    try { sbClient.removeChannel(adminGiftState.channel); } catch (e) {}
    adminGiftState.channel = null;
  }
  if (dmNotiState.pollTimer) {
    clearInterval(dmNotiState.pollTimer);
    dmNotiState.pollTimer = null;
  }
  dmNotiState.unreadList = [];
  adminGiftState.unclaimedList = [];
  adminGiftState.shownPopupIds.clear();
  syncDmNotiBadgeUI();
};

const DM_STAMP_EMOTICONS = [
  { id: "music_cut", ico: "⚡", label: "1초 컷!", bg: "#eff6ff", border: "#60a5fa" },
  { id: "king", ico: "👑", label: "역시 음악왕!", bg: "#fefce8", border: "#facc15" },
  { id: "clap", ico: "👏", label: "짝짝짝 최고!", bg: "#f0fdf4", border: "#4ade80" },
  { id: "fishing", ico: "🎣", label: "낚시 잠수중~", bg: "#e0f2fe", border: "#38bdf8" },
  { id: "love", ico: "❤️", label: "고마워요!", bg: "#fff1f2", border: "#fb7185" },
  { id: "laugh", ico: "🤣", label: "빵 터졌다ㅋㅋ", bg: "#fffbeb", border: "#fbbf24" },
  { id: "cry", ico: "😭", label: "아쉽다ㅠㅠ", bg: "#f1f5f9", border: "#94a3b8" },
  { id: "cheer", ico: "🔥", label: "가보자고!!", bg: "#fff7ed", border: "#fb923c" },
  { id: "question", ico: "🤔", label: "어라? 이거 뭐지?", bg: "#faf5ff", border: "#c084fc" },
  { id: "ok", ico: "🙆‍♂️", label: "오케이 콜!", bg: "#ecfdf5", border: "#34d399" },
  { id: "sorry", ico: "🙏", label: "죄송해요!", bg: "#fef2f2", border: "#f87171" },
  { id: "party", ico: "🎉", label: "축하축하!!", bg: "#fdf2f8", border: "#f472b6" },
  { id: "sleep", ico: "💤", label: "졸려요...", bg: "#eff6ff", border: "#93c5fd" },
  { id: "singer", ico: "🎤", label: "열창 중!", bg: "#f5f3ff", border: "#a78bfa" },
  { id: "headset", ico: "🎧", label: "노래 듣는 중", bg: "#ecfeff", border: "#22d3ee" },
  { id: "gift", ico: "🎁", label: "선물 고마워!", bg: "#fef3c7", border: "#f59e0b" }
];

const DM_INLINE_EMOJIS = [
  "😀", "😁", "😂", "🤣", "🥰", "😍", "🥳", "😎", "🤩", "😭",
  "😡", "😱", "🤔", "🙏", "👍", "👎", "👏", "🙌", "❤️", "💖",
  "🔥", "✨", "🎵", "🎶", "🎤", "🎧", "🎸", "👑", "🎣", "🎉"
];

const dmEmojiUiState = {
  isOpen: false,
  tab: "stamps"
};

function parseDmStampMessage(content) {
  const m = String(content || "").trim().match(/^\[EMOJI:([a-z0-9_]+)\]$/i);
  if (!m) return null;
  const id = m[1].toLowerCase();
  return DM_STAMP_EMOTICONS.find(s => s.id === id) || null;
}

function formatDmNotiPreviewText(content) {
  const stamp = parseDmStampMessage(content);
  if (stamp) return `[이모티콘] ${stamp.ico} ${stamp.label}`;
  return String(content || "");
}

window.openDmNotiModal = async function () {
  await Promise.all([refreshUnreadDmNotis(), refreshAdminGifts(false)]);
  renderAdminGiftsInNotiModal();
  const listEl = document.getElementById("dmNotiPreviewList");
  if (!listEl) return;

  if (dmNotiState.unreadList.length === 0) {
    listEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub); font-size:0.82rem;">새로 도착한 1:1 메시지가 없습니다.</div>`;
  } else {
    listEl.innerHTML = dmNotiState.unreadList
      .map(m => {
        const prof = dmNotiState.profileMap.get(m.sender_id) || { nickname: "친구", avatar_config: DEFAULT_AVATAR_CONFIG };
        const safeNick = String(prof.nickname || "친구").replace(/'/g, "\\'");
        const d = new Date(m.created_at);
        const timeStr = `${d.getHours() >= 12 ? "오후" : "오전"} ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
        const previewTxt = formatDmNotiPreviewText(m.content);
        return `
          <div class="pixel-list-item" onclick="closeModal('dmNotiModal'); prepareDmTo('${m.sender_id}', '${safeNick}')">
            <div style="display:flex; align-items:center; gap:9px; min-width:0; flex:1;">
              <canvas class="noti-mini-cv kakao-avatar-sq" width="480" height="480" style="width:40px; height:40px;" data-avatar='${JSON.stringify(prof.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
              <div style="min-width:0; flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="font-size:0.88rem;">${escapeOnlineHtml(prof.nickname)}</strong>
                  <span style="font-size:0.68rem; color:var(--text-sub);">${timeStr}</span>
                </div>
                <div style="font-size:0.78rem; color:var(--primary-dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeOnlineHtml(previewTxt)}</div>
              </div>
            </div>
            <span class="badge primary">답장 ➔</span>
          </div>
        `;
      })
      .join("");

    listEl.querySelectorAll(".noti-mini-cv").forEach(cv => {
      try { renderPixelAvatar(cv, JSON.parse(cv.getAttribute("data-avatar"))); } catch (e) {}
    });
  }

  openModal("dmNotiModal");
};

window.stopDmRealtime = function () {
  if (dmState.channel && sbClient) {
    try { sbClient.removeChannel(dmState.channel); } catch (e) {}
    dmState.channel = null;
  }
  if (dmState.pollTimer) {
    clearInterval(dmState.pollTimer);
    dmState.pollTimer = null;
  }
};

const socialUiState = {
  activeTab: "friends"
};

window.returnFromDmChatScreen = function () {
  switchScreen("socialScreen");
  switchSocialTab(socialUiState.activeTab || "friends");
};

window.openSocialModal = async function (tab = "friends") {
  if (!userState.isLoggedIn) {
    gameConfirm("친구 및 DM 기능은 로그인 후 이용하실 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }

  switchScreen("socialScreen");

  // 상단 내 카톡 프로필 업데이트
  const myNickEl = document.getElementById("socialMyNickDisplay");
  const myBioEl = document.getElementById("socialMyBioDisplay");
  const myCv = document.getElementById("socialMyAvatarCanvas");
  if (myNickEl) myNickEl.textContent = userState.nickname;
  if (myBioEl) myBioEl.textContent = userState.bio || "상태 메시지가 없습니다.";
  if (myCv) renderPixelAvatar(myCv, userState.avatarConfig);

  const normalizedTab = tab === "dm" || tab === "chats" ? "chats" : tab === "requests" ? "requests" : "friends";
  switchSocialTab(normalizedTab);
};

window.switchSocialTab = async function (tab) {
  const normalizedTab = tab === "dm" || tab === "chats" ? "chats" : tab === "requests" ? "requests" : "friends";
  socialUiState.activeTab = normalizedTab;

  const fBtn = document.getElementById("socialTab_friends");
  const cBtn = document.getElementById("socialTab_chats");
  const rBtn = document.getElementById("socialTab_requests");
  const fPane = document.getElementById("socialPane_friends");
  const cPane = document.getElementById("socialPane_chats");
  const rPane = document.getElementById("socialPane_requests");

  if (fBtn) fBtn.style.background = normalizedTab === "friends" ? "#fef08a" : "#ffffff";
  if (cBtn) cBtn.style.background = normalizedTab === "chats" ? "#fef08a" : "#ffffff";
  if (rBtn) rBtn.style.background = normalizedTab === "requests" ? "#fef08a" : "#ffffff";
  if (fPane) fPane.classList.toggle("hidden", normalizedTab !== "friends");
  if (cPane) cPane.classList.toggle("hidden", normalizedTab !== "chats");
  if (rPane) rPane.classList.toggle("hidden", normalizedTab !== "requests");

  if (normalizedTab === "chats") {
    await loadDmConversationsList();
  } else {
    await loadFriendsData();
  }
};

function formatDmConvTimeLabel(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h >= 12 ? "오후" : "오전"} ${h % 12 || 12}:${m}`;
  }
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) {
    return "어제";
  }
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

window.loadDmConversationsList = async function () {
  const container = document.getElementById("dmConversationsContainer");
  const countLabel = document.getElementById("kakaoChatsCountLabel");
  if (!container || !sbClient || !userState.id) return;

  container.innerHTML = `<div style="text-align:center; padding:32px 16px; color:var(--text-sub); font-size:0.84rem;">대화 목록을 불러오는 중...</div>`;

  try {
    const [dmRes] = await Promise.all([
      sbClient
        .from("direct_messages")
        .select("id, sender_id, receiver_id, content, created_at")
        .or(`sender_id.eq.${userState.id},receiver_id.eq.${userState.id}`)
        .order("created_at", { ascending: false })
        .limit(400),
      typeof refreshOnlineUsersFriendships === "function" && (!globalOnlineState?.friendStatusMap || globalOnlineState.friendStatusMap.size === 0)
        ? refreshOnlineUsersFriendships()
        : Promise.resolve()
    ]);

    if (dmRes.error) {
      if (countLabel) countLabel.textContent = "대화 목록 0";
      container.innerHTML = `<div style="text-align:center; padding:32px 16px; color:var(--danger); font-size:0.84rem;">대화 목록을 불러오지 못했습니다.</div>`;
      return;
    }

    const myId = String(userState.id);
    const seenMap = getSeenDmMap();
    const convMap = new Map();

    (dmRes.data || []).forEach(m => {
      const sId = String(m.sender_id || "");
      const rId = String(m.receiver_id || "");
      const peerId = sId === myId ? rId : sId;
      if (!peerId || peerId === myId || isUserBlocked(peerId)) return;

      const hiddenCut = getHiddenDmCutoffMs(peerId);
      const msgMs = new Date(m.created_at).getTime();
      if (hiddenCut > 0 && msgMs <= hiddenCut) return;

      if (!convMap.has(peerId)) {
        convMap.set(peerId, {
          peerId,
          lastMsg: m,
          unreadCount: 0
        });
      }

      if (sId === peerId) {
        const seenAt = seenMap[peerId] || "";
        if (!seenAt || msgMs > new Date(seenAt).getTime()) {
          convMap.get(peerId).unreadCount += 1;
        }
      }
    });

    const convs = Array.from(convMap.values());
    const peerIds = convs.map(c => c.peerId);
    const profMap = new Map();

    if (peerIds.length > 0) {
      const { data: profs } = await sbClient
        .from("profiles")
        .select("id, nickname, bio, avatar_config")
        .in("id", peerIds);
      const nowTs = Date.now();
      (profs || []).forEach(p => {
        profMap.set(String(p.id), p);
        if (typeof syncSingleProfileFishingBgEntry === "function") {
          syncSingleProfileFishingBgEntry(p, nowTs);
        }
      });
    }

    const visibleConvs = convs.filter(c => {
      const prof = profMap.get(c.peerId);
      return !isUserBlocked(c.peerId, prof?.nickname || "");
    });

    if (countLabel) countLabel.textContent = `대화 목록 ${visibleConvs.length}`;

    if (visibleConvs.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:38px 16px; color:var(--text-sub); font-size:0.85rem; line-height:1.55;">아직 나눈 1:1 대화가 없습니다.<br/>친구나 낚시터·대기실·실시간 접속 목록에서<br/><strong>💬 1:1 채팅</strong>을 보내면 이곳에 대화방이 유지됩니다!</div>`;
      return;
    }

    container.innerHTML = visibleConvs
      .map(c => {
        const prof = profMap.get(c.peerId) || { nickname: "알 수 없는 유저", bio: "", avatar_config: DEFAULT_AVATAR_CONFIG };
        const rawNick = prof.nickname || "유저";
        const safeId = escapeJsSingleArg(c.peerId);
        const safeNick = escapeJsSingleArg(rawNick);
        const isFriend = globalOnlineState?.friendStatusMap?.get(c.peerId) === "accepted";
        const pres =
          typeof getUserPresenceState === "function"
            ? getUserPresenceState(c.peerId)
            : { status: "offline", activity: "오프라인" };
        const dotCls =
          pres.status === "online" ? "is-online" : pres.status === "fishing_afk" ? "is-fishing-afk" : "";
        const pillCls =
          pres.status === "fishing_afk" ? "is-fishing-afk" : pres.status === "offline" ? "hidden" : "";
        const previewRaw = formatDmNotiPreviewText(c.lastMsg?.content || "");
        const timeStr = formatDmConvTimeLabel(c.lastMsg?.created_at);
        const rankIco = typeof renderMusicRankIconHtml === "function" ? renderMusicRankIconHtml(prof.avatar_config?._exp || 0, { isExp: true, size: 15 }) : "";
        const unreadHtml =
          c.unreadCount > 0
            ? `<span class="dm-unread-pill">${c.unreadCount > 99 ? "99+" : c.unreadCount}</span>`
            : "";

        return `
          <div class="kakao-friend-row" onclick="prepareDmTo('${safeId}', '${safeNick}')">
            <div class="kakao-friend-main">
              <div class="kakao-avatar-wrap avatar-clickable-trigger" onclick="event.stopPropagation(); inspectOtherUser('${safeId}', '${safeNick}')" title="프로필 보기">
                <canvas class="conv-mini-cv kakao-avatar-sq" width="480" height="480" data-avatar='${JSON.stringify(prof.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
                <span class="online-status-dot ${dotCls}" data-online-uid="${c.peerId}" title="${String(pres.activity || "오프라인").replace(/"/g, "&quot;")}"></span>
              </div>
              <div style="flex:1; min-width:0;">
                <div class="kakao-friend-nick" style="display:flex; align-items:center; gap:5px;">
                  ${rankIco}
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeOnlineHtml(rawNick)}</span>
                  ${!isFriend ? `<span class="dm-nonfriend-tag">대화 상대</span>` : ""}
                  <span class="friend-online-pill ${pillCls}" data-online-pill-uid="${c.peerId}">${pres.status === "offline" ? "" : escapeOnlineHtml(pres.activity)}</span>
                </div>
                <div class="kakao-friend-bio" style="${c.unreadCount > 0 ? "color:#1e1b18; font-weight:800;" : ""}">${escapeOnlineHtml(previewRaw)}</div>
              </div>
            </div>
            <div class="dm-conv-right">
              <span class="dm-conv-time">${escapeOnlineHtml(timeStr)}</span>
              <div style="display:flex; align-items:center; gap:5px;">
                ${unreadHtml}
                <button type="button" class="header-btn dm-conv-del-btn" onclick="event.stopPropagation(); deleteDmConversationFromList('${safeId}', '${safeNick}')" title="대화목록 삭제">🗑️</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    container.querySelectorAll(".conv-mini-cv").forEach(cv => {
      try {
        renderPixelAvatar(cv, JSON.parse(cv.getAttribute("data-avatar")));
      } catch (e) {}
    });
  } catch (e) {
    if (countLabel) countLabel.textContent = "대화 목록 0";
    container.innerHTML = `<div style="text-align:center; padding:32px 16px; color:var(--danger); font-size:0.84rem;">대화 목록 조회 중 오류가 발생했습니다.</div>`;
  }
};

window.deleteDmConversationFromList = function (peerId, peerNick) {
  if (!peerId || !userState.id) return;
  gameConfirm(
    `[${peerNick || "상대방"}]과의 대화방을 내 목록에서 삭제할까요?\n(상대방의 대화 내역은 유지되며, 이후 새 메시지를 주고받으면 새 대화로 다시 열립니다.)`,
    async () => {
      if (!userState.hiddenDmPeers || typeof userState.hiddenDmPeers !== "object") {
        userState.hiddenDmPeers = {};
      }
      userState.hiddenDmPeers[String(peerId)] = new Date().toISOString();
      saveHiddenDmPeersToStorage();
      markPeerDmRead(String(peerId));
      await syncProfileToServer();
      await loadDmConversationsList();
    },
    "🗑️ 대화방 삭제"
  );
};

window.sendFriendRequestByNick = async function (targetNickParam) {
  if (!userState.isLoggedIn) {
    showLoginScreen();
    return;
  }
  const searchEl = document.getElementById("friendSearchInput");
  const nick = targetNickParam || (searchEl ? searchEl.value.trim() : "");
  if (!nick) {
    gameAlert("친구 추가할 닉네임을 입력해주세요.");
    return;
  }
  if (nick === userState.nickname) {
    gameAlert("자기 자신에게는 친구 신청을 보낼 수 없습니다.");
    return;
  }

  const { data: targetProf } = await sbClient
    .from("profiles")
    .select("id, nickname")
    .eq("nickname", nick)
    .maybeSingle();

  if (!targetProf) {
    gameAlert(`[${nick}] 닉네임을 가진 유저를 찾을 수 없습니다.`);
    return;
  }

  const { error } = await sbClient.from("friendships").insert({
    requester_id: userState.id,
    receiver_id: targetProf.id,
    status: "pending"
  });

  if (error) {
    gameAlert("이미 친구 신청을 보냈거나 친구로 등록되어 있습니다.");
    return;
  }

  if (searchEl) searchEl.value = "";
  gameAlert(`💌 [${targetProf.nickname}]님에게 친구 신청을 보냈습니다!`);
  await loadFriendsData();
  if (typeof renderOnlineUsersModalList === "function") {
    const m = document.getElementById("onlineUsersModal");
    if (m && !m.classList.contains("hidden")) renderOnlineUsersModalList();
  }
};

async function loadFriendsData() {
  const acceptedBox = document.getElementById("friendsListContainer");
  const pendingBox = document.getElementById("friendRequestsContainer");
  const countLabel = document.getElementById("kakaoFriendsCountLabel");
  if (!acceptedBox || !pendingBox || !sbClient || !userState.id) return;

  const { data: rels } = await sbClient
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${userState.id},receiver_id.eq.${userState.id}`);

  if (typeof globalOnlineState !== "undefined" && globalOnlineState.friendStatusMap) {
    globalOnlineState.friendStatusMap.clear();
    (rels || []).forEach(r => {
      const otherId = r.requester_id === userState.id ? r.receiver_id : r.requester_id;
      if (otherId) globalOnlineState.friendStatusMap.set(String(otherId), r.status);
    });
  }

  if (!rels || rels.length === 0) {
    if (countLabel) countLabel.textContent = "친구 0";
    acceptedBox.innerHTML = `<div style="text-align:center; padding:36px 16px; color:var(--text-sub); font-size:0.86rem;">아직 등록된 친구가 없습니다.<br/>우측 상단 <strong>[➕ 추가]</strong> 버튼으로 친구를 추가해보세요!</div>`;
    pendingBox.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub);">대기 중인 친구 요청이 없습니다.</div>`;
    return;
  }

  const otherIds = rels.map(r => (r.requester_id === userState.id ? r.receiver_id : r.requester_id));
  const { data: profs } = await sbClient.from("profiles").select("*").in("id", otherIds);
  const nowTs = Date.now();
  (profs || []).forEach(p => {
    if (typeof syncSingleProfileFishingBgEntry === "function") {
      syncSingleProfileFishingBgEntry(p, nowTs);
    }
  });
  const profMap = new Map((profs || []).map(p => [p.id, p]));

  const acceptedRels = rels.filter(r => {
    if (r.status !== "accepted") return false;
    const otherId = r.requester_id === userState.id ? r.receiver_id : r.requester_id;
    const prof = profMap.get(otherId);
    return !isUserBlocked(otherId, prof?.nickname || "");
  });
  acceptedRels.sort((a, b) => {
    const aid = a.requester_id === userState.id ? a.receiver_id : a.requester_id;
    const bid = b.requester_id === userState.id ? b.receiver_id : b.requester_id;
    const aInfo = typeof getUserPresenceState === "function" ? getUserPresenceState(aid) : { status: "offline" };
    const bInfo = typeof getUserPresenceState === "function" ? getUserPresenceState(bid) : { status: "offline" };
    const rankMap = { online: 2, fishing_afk: 1, offline: 0 };
    return (rankMap[bInfo.status] || 0) - (rankMap[aInfo.status] || 0);
  });
  const pendingRels = rels.filter(r => {
    if (r.status !== "pending") return false;
    const otherId = r.requester_id === userState.id ? r.receiver_id : r.requester_id;
    const prof = profMap.get(otherId);
    return !isUserBlocked(otherId, prof?.nickname || "");
  });

  if (countLabel) countLabel.textContent = `친구 ${acceptedRels.length}`;

  // 1) 카카오톡 스타일 친구 목록 (행 클릭 -> 즉시 카톡 1:1 DM 채팅방 전체화면 오픈! + 실시간/잠수 상태 점·활동 배지)
  if (acceptedRels.length === 0) {
    acceptedBox.innerHTML = `<div style="text-align:center; padding:36px 16px; color:var(--text-sub); font-size:0.86rem;">아직 수락된 친구가 없습니다.<br/>우측 상단 <strong>[➕ 추가]</strong> 탭에서 요청을 확인해보세요!</div>`;
  } else {
    acceptedBox.innerHTML = acceptedRels
      .map(r => {
        const otherId = r.requester_id === userState.id ? r.receiver_id : r.requester_id;
        const p = profMap.get(otherId) || { nickname: "유저", bio: "", avatar_config: DEFAULT_AVATAR_CONFIG };
        const safeNick = escapeJsSingleArg(p.nickname || "유저");
        const pres =
          typeof getUserPresenceState === "function"
            ? getUserPresenceState(otherId)
            : { status: "offline", activity: "오프라인" };
        const dotCls =
          pres.status === "online" ? "is-online" : pres.status === "fishing_afk" ? "is-fishing-afk" : "";
        const pillCls =
          pres.status === "fishing_afk" ? "is-fishing-afk" : pres.status === "offline" ? "hidden" : "";
        return `
        <div class="kakao-friend-row" onclick="prepareDmTo('${otherId}', '${safeNick}')">
          <div class="kakao-friend-main">
            <div class="kakao-avatar-wrap avatar-clickable-trigger" onclick="event.stopPropagation(); inspectOtherUser('${otherId}', '${safeNick}')" title="프로필 보기">
              <canvas class="friend-mini-cv kakao-avatar-sq" width="480" height="480" data-avatar='${JSON.stringify(p.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
              <span class="online-status-dot ${dotCls}" data-online-uid="${otherId}" title="${String(pres.activity || "오프라인").replace(/"/g, "&quot;")}"></span>
            </div>
            <div style="flex:1; min-width:0;">
              <div class="kakao-friend-nick" style="display:flex; align-items:center; gap:5px;">
                ${typeof renderMusicRankIconHtml === "function" ? renderMusicRankIconHtml(p.avatar_config?._exp || 0, { isExp: true, size: 15 }) : ""}
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.nickname}</span>
                <span class="friend-online-pill ${pillCls}" data-online-pill-uid="${otherId}">${pres.status === "offline" ? "" : pres.activity}</span>
              </div>
              <div class="kakao-friend-bio">${p.bio || "상태 메시지가 없습니다."}</div>
            </div>
          </div>
          <div style="display:flex; gap:5px; flex-shrink:0;" onclick="event.stopPropagation()">
            <button type="button" class="header-btn" onclick="sendBattleInviteToUser('${otherId}', '${safeNick}', 'direct_duel')" title="1:1 대결 요청" style="background:#fef9c3; border-color:#f59e0b;">⚔️</button>
            <button class="header-btn" style="color:var(--danger);" onclick="removeFriendship(${r.id}, '${safeNick}')" title="친구 삭제">✕</button>
          </div>
        </div>
      `;
      })
      .join("");
  }

  // 2) 받은/보낸 친구 요청 목록
  if (pendingRels.length === 0) {
    pendingBox.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub);">받은 친구 요청이 없습니다.</div>`;
  } else {
    pendingBox.innerHTML = pendingRels
      .map(r => {
        const isIncoming = r.receiver_id === userState.id;
        const otherId = isIncoming ? r.requester_id : r.receiver_id;
        const p = profMap.get(otherId) || { nickname: "유저" };
        const safeNick = String(p.nickname || "유저").replace(/'/g, "\\'");
        return `
        <div class="pixel-list-item">
          <div style="display:flex; align-items:center; gap:9px;">
            <canvas class="friend-mini-cv kakao-avatar-sq" width="480" height="480" style="width:40px; height:40px;" data-avatar='${JSON.stringify(p.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
            <div>
              <strong>${p.nickname}</strong>
              <div style="font-size:0.72rem; color:var(--primary);">${isIncoming ? "📩 나를 친구 추가하고 싶어합니다" : "⏳ 상대방의 수락 대기중"}</div>
            </div>
          </div>
          <div style="display:flex; gap:4px;">
            ${
              isIncoming
                ? `<button class="btn btn-primary" style="padding:5px 10px; font-size:0.75rem;" onclick="acceptFriendRequest(${r.id})">수락</button>`
                : ""
            }
            <button class="btn" style="padding:5px 8px; font-size:0.75rem;" onclick="removeFriendship(${r.id}, '${safeNick}')">거절/취소</button>
          </div>
        </div>
      `;
      })
      .join("");
  }

  document.querySelectorAll(".friend-mini-cv").forEach(cv => {
    try {
      renderPixelAvatar(cv, JSON.parse(cv.getAttribute("data-avatar")));
    } catch (e) {}
  });
}

window.acceptFriendRequest = async function (friendshipId) {
  await sbClient.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
  loadFriendsData();
};

window.removeFriendship = function (friendshipId, nick) {
  gameConfirm(`[${nick}]님과의 친구(또는 요청)를 삭제할까요?`, async () => {
    await sbClient.from("friendships").delete().eq("id", friendshipId);
    loadFriendsData();
  });
};

// 친구 클릭 -> 카카오톡 스타일 1:1 채팅방 전체화면(#dmChatScreen) 입장!
window.prepareDmTo = async function (receiverId, receiverNick) {
  if (!userState.isLoggedIn) {
    gameConfirm("1:1 채팅은 로그인 후 이용할 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }
  if (isUserBlocked(receiverId, receiverNick)) {
    gameAlert("차단한 유저와는 1:1 대화를 이용할 수 없습니다.\n(환경설정 > 차단한 유저 목록 관리에서 해제 가능)");
    return;
  }
  closeModal("userInspectModal");
  if (typeof closeDmEmojiDrawer === "function") closeDmEmojiDrawer();
  const curScreen = typeof state !== "undefined" ? state.currentScreen : "";
  if (curScreen !== "socialScreen") {
    socialUiState.activeTab = "chats";
  }
  dmState.peerId = receiverId;
  dmState.peerNick = receiverNick || "친구";
  dmState.peerAvatar = { ...DEFAULT_AVATAR_CONFIG };

  document.getElementById("dmTargetId").value = dmState.peerId;
  document.getElementById("dmTargetNick").value = dmState.peerNick;
  document.getElementById("dmPeerNickTitle").textContent = dmState.peerNick;

  switchScreen("dmChatScreen");

  // 상대 프로필 아바타 불러오기
  if (sbClient && dmState.peerId) {
    try {
      const { data: peerProf } = await sbClient
        .from("profiles")
        .select("nickname, avatar_config")
        .eq("id", dmState.peerId)
        .maybeSingle();
      if (peerProf) {
        dmState.peerNick = peerProf.nickname || dmState.peerNick;
        dmState.peerAvatar = peerProf.avatar_config || DEFAULT_AVATAR_CONFIG;
        document.getElementById("dmPeerNickTitle").textContent = dmState.peerNick;
        const peerCv = document.getElementById("dmPeerAvatarCanvas");
        if (peerCv) renderPixelAvatar(peerCv, dmState.peerAvatar);
      }
    } catch (e) {}
  }

  await loadCurrentDmConversation();
  markPeerDmRead(dmState.peerId);
  startDmRealtime();
};

function startDmRealtime() {
  stopDmRealtime();
  if (!sbClient || !userState.id || !dmState.peerId) return;

  const pairKey = [userState.id, dmState.peerId].sort().join("_");
  dmState.channel = sbClient
    .channel(`dm_${pairKey}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, payload => {
      const row = payload.new;
      if (
        row &&
        ((row.sender_id === userState.id && row.receiver_id === dmState.peerId) ||
          (row.sender_id === dmState.peerId && row.receiver_id === userState.id))
      ) {
        loadCurrentDmConversation();
      }
    })
    .subscribe();

  // 폴백 폴링 (Realtime 미활성 테이블 환경 대비 4초 간격)
  dmState.pollTimer = setInterval(() => {
    if (typeof state !== "undefined" && state.currentScreen === "dmChatScreen") {
      loadCurrentDmConversation();
    }
  }, 4000);
}

window.loadCurrentDmConversation = async function () {
  const box = document.getElementById("dmChatMessages");
  if (!box || !sbClient || !userState.id || !dmState.peerId) return;

  const { data: rawMsgs } = await sbClient
    .from("direct_messages")
    .select("*")
    .or(
      `and(sender_id.eq.${userState.id},receiver_id.eq.${dmState.peerId}),and(sender_id.eq.${dmState.peerId},receiver_id.eq.${userState.id})`
    )
    .order("created_at", { ascending: true })
    .limit(60);

  const hiddenCut = getHiddenDmCutoffMs(dmState.peerId);
  const msgs = (rawMsgs || []).filter(m => !hiddenCut || new Date(m.created_at).getTime() > hiddenCut);

  if (!msgs || msgs.length === 0) {
    box.innerHTML = `<div style="margin:auto; text-align:center; background:rgba(15,23,42,0.18); color:#ffffff; padding:8px 14px; border-radius:999px; font-size:0.78rem; font-weight:700;">💬 [${escapeOnlineHtml(dmState.peerNick)}]님과의 1:1 대화를 시작해보세요!</div>`;
    return;
  }

  const fmtTime = iso => {
    if (!iso) return "";
    const d = new Date(iso);
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h >= 12 ? "오후" : "오전"} ${h % 12 || 12}:${m}`;
  };

  const escapeHtml = str =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const renderDmBubbleBody = rawContent => {
    const stamp = parseDmStampMessage(rawContent);
    if (stamp) {
      return `
        <div class="kakao-stamp-card" style="background:${stamp.bg}; border-color:${stamp.border};">
          <div class="kakao-stamp-ico">${stamp.ico}</div>
          <div class="kakao-stamp-lbl">${escapeHtml(stamp.label)}</div>
        </div>
      `;
    }
    return null;
  };

  box.innerHTML = msgs
    .map(m => {
      const isMine = m.sender_id === userState.id;
      const t = fmtTime(m.created_at);
      const stampHtml = renderDmBubbleBody(m.content);
      if (isMine) {
        return `
          <div class="kakao-msg-row mine">
            <span class="kakao-msg-time">${t}</span>
            ${stampHtml || `<div class="kakao-bubble mine">${escapeHtml(m.content)}</div>`}
          </div>
        `;
      }
      const safePeerIdArg = escapeJsSingleArg(dmState.peerId);
      const safePeerNickArg = escapeJsSingleArg(dmState.peerNick);
      return `
        <div class="kakao-msg-row theirs">
          <canvas class="dm-bubble-avatar kakao-avatar-sq avatar-clickable-trigger" width="480" height="480" style="width:34px; height:34px; border-radius:11px;" onclick="inspectOtherUser('${safePeerIdArg}', '${safePeerNickArg}')" title="프로필 보기"></canvas>
          <div class="kakao-bubble-wrap">
            <div style="font-size:0.72rem; font-weight:800; color:#334155; margin-bottom:3px; cursor:pointer;" onclick="inspectOtherUser('${safePeerIdArg}', '${safePeerNickArg}')">${escapeHtml(dmState.peerNick)}</div>
            <div style="display:flex; align-items:flex-end; gap:5px;">
              ${stampHtml || `<div class="kakao-bubble theirs">${escapeHtml(m.content)}</div>`}
              <span class="kakao-msg-time">${t}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  box.querySelectorAll(".dm-bubble-avatar").forEach(cv => {
    renderPixelAvatar(cv, dmState.peerAvatar);
  });
  box.scrollTop = box.scrollHeight;
  markPeerDmRead(dmState.peerId);
};

function renderDmEmojiDrawerGrid() {
  const grid = document.getElementById("dmEmojiGrid");
  const tabStamps = document.getElementById("dmEmojiTabStamps");
  const tabInline = document.getElementById("dmEmojiTabInline");
  if (!grid) return;

  if (tabStamps) tabStamps.classList.toggle("active", dmEmojiUiState.tab === "stamps");
  if (tabInline) tabInline.classList.toggle("active", dmEmojiUiState.tab === "inline");

  if (dmEmojiUiState.tab === "stamps") {
    grid.classList.remove("is-inline-mode");
    grid.innerHTML = DM_STAMP_EMOTICONS.map(
      s => `
      <button type="button" class="dm-stamp-pick-btn" style="background:${s.bg}; border-color:${s.border};" onclick="sendDmStampEmoticon('${s.id}')">
        <span class="dm-stamp-pick-ico">${s.ico}</span>
        <span class="dm-stamp-pick-lbl">${s.label}</span>
      </button>
    `
    ).join("");
  } else {
    grid.classList.add("is-inline-mode");
    grid.innerHTML = DM_INLINE_EMOJIS.map(
      em => `<button type="button" class="dm-inline-emoji-btn" onclick="insertInlineDmEmoji('${em}')">${em}</button>`
    ).join("");
  }
}

window.closeDmEmojiDrawer = function () {
  dmEmojiUiState.isOpen = false;
  const drawer = document.getElementById("dmEmojiDrawer");
  const btn = document.getElementById("dmEmojiToggleBtn");
  if (drawer) drawer.classList.add("hidden");
  if (btn) btn.classList.remove("is-active");
};

window.toggleDmEmojiDrawer = function () {
  const drawer = document.getElementById("dmEmojiDrawer");
  const btn = document.getElementById("dmEmojiToggleBtn");
  const input = document.getElementById("dmContentInput");
  if (!drawer) return;

  dmEmojiUiState.isOpen = !dmEmojiUiState.isOpen;
  if (dmEmojiUiState.isOpen) {
    if (input) input.blur();
    renderDmEmojiDrawerGrid();
    drawer.classList.remove("hidden");
    if (btn) btn.classList.add("is-active");
    const msgBox = document.getElementById("dmChatMessages");
    if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
  } else {
    drawer.classList.add("hidden");
    if (btn) btn.classList.remove("is-active");
  }
};

window.switchDmEmojiTab = function (tab) {
  dmEmojiUiState.tab = tab === "inline" ? "inline" : "stamps";
  renderDmEmojiDrawerGrid();
};

window.insertInlineDmEmoji = function (emojiStr) {
  const input = document.getElementById("dmContentInput");
  if (!input) return;
  const start = typeof input.selectionStart === "number" ? input.selectionStart : input.value.length;
  const end = typeof input.selectionEnd === "number" ? input.selectionEnd : input.value.length;
  const before = input.value.slice(0, start);
  const after = input.value.slice(end);
  input.value = `${before}${emojiStr}${after}`;
};

window.sendDmStampEmoticon = async function (stampId) {
  const stamp = DM_STAMP_EMOTICONS.find(s => s.id === stampId);
  const targetId = document.getElementById("dmTargetId")?.value || dmState.peerId;
  if (!stamp || !targetId) return;

  const token = `[EMOJI:${stamp.id}]`;
  const spamCheck = validateCleanUserText(token, {
    fieldLabel: "이모티콘",
    spamChannel: "dm",
    ignoreBannedCheck: true
  });
  if (!spamCheck.ok) {
    gameAlert(spamCheck.message, "⏳ 전송 제한");
    return;
  }

  closeDmEmojiDrawer();
  await sbClient.from("direct_messages").insert({
    sender_id: userState.id,
    receiver_id: targetId,
    content: token
  });
  await loadCurrentDmConversation();
};

window.sendDirectMessage = async function () {
  const input = document.getElementById("dmContentInput");
  const content = input ? input.value.trim() : "";
  const targetId = document.getElementById("dmTargetId")?.value || dmState.peerId;

  if (!content || !targetId) return;
  const check = validateCleanUserText(content, { fieldLabel: "1:1 메시지", spamChannel: "dm" });
  if (!check.ok) {
    if (check.reason === "banned" && input) input.value = "";
    if (input) input.blur();
    gameAlert(check.message, "🚫 채팅 안내");
    return;
  }

  input.value = "";
  closeDmEmojiDrawer();

  await sbClient.from("direct_messages").insert({
    sender_id: userState.id,
    receiver_id: targetId,
    content
  });

  await loadCurrentDmConversation();
};

// ============================================================================
// 6. 대기실 로비 (방 목록 + 접속 유저 아이콘 리스트) vs 방 내부 (맵 캐릭터 + 방 채팅 + 방 삭제)
// ============================================================================
function syncPlazaRoomFilterUI() {
  const filter = plazaState.roomFilter || "ALL";
  document.querySelectorAll("[data-plaza-filter]").forEach(el => {
    el.classList.toggle("active", el.getAttribute("data-plaza-filter") === filter);
  });
  const labelEl = document.getElementById("plazaRoomListLabel");
  if (labelEl) {
    labelEl.textContent =
      filter === "1v1"
        ? "⚡ 입장 가능한 1:1 대전 방 목록"
        : filter === "4p"
        ? "🏆 입장 가능한 4인 대전 방 목록"
        : "⚔️ 입장 가능한 대전 방 목록";
  }
}

window.setPlazaRoomFilter = function (filterType = "ALL") {
  plazaState.roomFilter = ["1v1", "4p", "ALL"].includes(filterType) ? filterType : "ALL";
  syncPlazaRoomFilterUI();
  refreshRoomsList();
};

window.enterMultiPlazaWithMode = function (modeType = "ALL") {
  plazaState.roomFilter = modeType || "ALL";
  enterPlazaScreen();
};

window.enterPlazaScreen = async function () {
  switchScreen("plazaScreen");
  syncPlazaRoomFilterUI();
  await refreshRoomsList();
  renderLobbyOnlineUsers();

  if (sbClient && !plazaState.channel) {
    const myKey = userState.id || `guest_${Math.floor(Math.random() * 9999)}`;
    plazaState.channel = sbClient.channel("music_king_plaza", {
      config: { presence: { key: myKey } }
    });

    plazaState.channel
      .on("presence", { event: "sync" }, () => {
        const stateObj = plazaState.channel.presenceState();
        plazaState.onlinePlayers.clear();
        Object.values(stateObj).forEach(arr => {
          const p = arr[0];
          if (p) plazaState.onlinePlayers.set(p.key, p);
        });
        renderLobbyOnlineUsers();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        refreshRoomsList();
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") {
          await trackLobbyPresence();
        }
      });
  } else {
    trackLobbyPresence();
  }
};

async function trackLobbyPresence() {
  const myKey = userState.id || "guest_me";
  const payload = {
    key: myKey,
    userId: userState.id,
    nickname: userState.nickname,
    avatarConfig: userState.avatarConfig
  };
  plazaState.onlinePlayers.set(myKey, payload);
  renderLobbyOnlineUsers();

  if (plazaState.channel) {
    try {
      await plazaState.channel.track(payload);
    } catch (e) {}
  }
}

// 대기실에서는 맵 대신 접속 유저 리스트(닉네임 왼쪽에 480x480 캐릭터 아이콘) 표시!
function renderLobbyOnlineUsers() {
  const countEl = document.getElementById("plazaOnlineCount");
  const listEl = document.getElementById("plazaUsersList");
  if (!listEl) return;

  const players = Array.from(plazaState.onlinePlayers.values()).filter(
    p => !isUserBlocked(p.userId, p.nickname)
  );
  if (players.length === 0) {
    players.push({
      key: "me",
      userId: userState.id,
      nickname: userState.nickname,
      avatarConfig: userState.avatarConfig
    });
  }

  if (countEl) countEl.textContent = `대기실 유저 ${players.length}명`;

  listEl.innerHTML = players
    .map(
      p => `
      <div class="pixel-list-item" style="padding:6px 9px;" onclick="inspectOtherUser('${escapeJsSingleArg(p.userId || "")}', '${escapeJsSingleArg(p.nickname)}')">
        <div style="display:flex; align-items:center; gap:8px;">
          <canvas class="lobby-user-cv" width="480" height="480" style="width:36px; height:36px; border-radius:9px; border:1.5px solid #334155;" data-avatar='${JSON.stringify(p.avatarConfig || DEFAULT_AVATAR_CONFIG)}'></canvas>
          <strong style="font-size:0.86rem;">${p.nickname}</strong>
        </div>
        <span class="badge primary">대기중</span>
      </div>
    `
    )
    .join("");

  listEl.querySelectorAll(".lobby-user-cv").forEach(cv => {
    try {
      renderPixelAvatar(cv, JSON.parse(cv.getAttribute("data-avatar")));
    } catch (e) {}
  });
}

window.refreshRoomsList = async function () {
  const box = document.getElementById("plazaRoomsList");
  if (!box || !sbClient) return;

  const { data: rooms } = await sbClient
    .from("rooms")
    .select("*")
    .eq("status", "waiting")
    .order("created_at", { ascending: false })
    .limit(15);

  // 인원이 0명인 유령 방 제외 + 선택된 1:1 / 4인 모드 필터 적용
  const filter = plazaState.roomFilter || "ALL";
  const validRooms = (rooms || []).filter(r => {
    if (!Array.isArray(r.players) || r.players.length === 0) return false;
    if (filter !== "ALL" && r.room_type !== filter) return false;
    return true;
  });

  if (validRooms.length === 0) {
    const modeEmptyLabel = filter === "1v1" ? "1:1" : filter === "4p" ? "4인" : "대기 중인";
    box.innerHTML = `<div style="text-align:center; padding:22px; color:var(--text-sub); font-size:0.84rem;">현재 ${modeEmptyLabel} 방이 없습니다.<br/>하단 <strong>[방 만들기]</strong> 버튼으로 새 방을 열어보세요!</div>`;
    return;
  }

  box.innerHTML = validRooms
    .map(room => {
      const maxP = room.room_type === "1v1" ? 2 : 4;
      const curP = room.players.length;
      const cfg = room.game_config || { mode: "behind", stage: 1, decade: "ALL", itemMode: "notem", difficulty: "normal" };
      const modeName = { behind: "비하인드", lyrics: "가사", onesec: "1초듣기" }[cfg.mode] || "비하인드";
      const itemTag = cfg.itemMode === "item" ? "🎒아이템전" : "🚫노템전";
      const diffTag = cfg.difficulty === "hard" ? "🔥고수" : "😊일반";
      return `
      <div class="pixel-list-item">
        <div>
          <span class="badge primary" style="margin-right:4px;">${room.room_type === "1v1" ? "1:1" : "4인"}</span>
          <span class="badge ${cfg.difficulty === "hard" ? "is-hard-badge" : "is-normal-badge"}" style="margin-right:4px;">${diffTag}</span>
          <span class="badge accent" style="margin-right:4px;">${modeName}·${cfg.stage || 1}단계</span>
          <span class="badge ${cfg.itemMode === "item" ? "gold" : ""}" style="margin-right:4px;">${itemTag}</span>
          <strong>${room.title}</strong>
          <span style="font-size:0.76rem; color:var(--text-sub);">(${curP}/${maxP}명)</span>
        </div>
        <button class="btn btn-primary" style="padding:5px 10px; font-size:0.78rem;" onclick="joinOnlineRoom('${room.id}')">입장 ➔</button>
      </div>
    `;
    })
    .join("");
};

const createRoomState = {
  roomType: "1v1",
  decade: "ALL",
  mode: "behind",
  stage: 1,
  itemMode: "notem",
  difficulty: "normal"
};

window.openCreateRoomModal = function (defaultType = "1v1") {
  if (!userState.isLoggedIn) {
    gameConfirm("온라인 방 만들기는 로그인 후 가능합니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }
  createRoomState.roomType = defaultType;
  document.getElementById("createRoomModalTitle").textContent =
    defaultType === "1v1" ? "⚡ 1:1 선착순 대전 방 만들기" : "🏆 4인 점수제 대전 방 만들기";
  document.getElementById("createRoomTitleInput").value = `${userState.nickname}님의 대결방!`;
  selectRoomConfig("decade", createRoomState.decade);
  selectRoomConfig("mode", createRoomState.mode);
  selectRoomConfig("stage", createRoomState.stage);
  selectRoomConfig("itemMode", createRoomState.itemMode || "notem");
  selectRoomConfig("difficulty", createRoomState.difficulty || "normal");
  openModal("createRoomModal");
};

window.selectRoomConfig = function (key, val) {
  createRoomState[key] = key === "stage" ? Number(val) : val;
  document.querySelectorAll(`[data-room-${key}]`).forEach(el => {
    el.classList.toggle("active", el.getAttribute(`data-room-${key}`) === String(val));
  });
  if (key === "difficulty") {
    const tog = document.getElementById("createRoomDiffToggle");
    if (tog) {
      tog.dataset.quizDiff = String(val);
      tog.querySelectorAll(".diff-toggle-btn").forEach(btn => {
        const match = btn.getAttribute("data-diff") === String(val);
        btn.classList.toggle("active", match);
        btn.classList.toggle("is-selected", match);
      });
    }
  }
};

window.confirmCreateOnlineRoom = async function () {
  const title = document.getElementById("createRoomTitleInput").value.trim();
  if (!title) {
    gameAlert("방 제목을 입력해주세요!");
    return;
  }

  let pool =
    createRoomState.decade === "ALL"
      ? QUESTIONS_DB
      : QUESTIONS_DB.filter(q => q.decade === createRoomState.decade);
  if (pool.length < 10) pool = QUESTIONS_DB;
  const shuffledIds = shuffleArray(pool).slice(0, 10).map(q => q.id);

  const initialPlayers = [
    {
      id: userState.id,
      nickname: userState.nickname,
      exp: Number(userState.exp) || 0,
      avatarConfig: userState.avatarConfig,
      score: 0
    }
  ];

  const { data, error } = await sbClient
    .from("rooms")
    .insert({
      title,
      host_id: userState.id,
      room_type: createRoomState.roomType,
      game_config: {
        decade: createRoomState.decade,
        mode: createRoomState.mode,
        stage: createRoomState.stage,
        itemMode: createRoomState.itemMode || "notem",
        difficulty: createRoomState.difficulty || "normal"
      },
      status: "waiting",
      players: initialPlayers,
      current_q_index: 0,
      question_ids: shuffledIds
    })
    .select()
    .single();

  if (error || !data) {
    gameAlert("방 생성 중 오류가 발생했습니다.");
    return;
  }

  closeModal("createRoomModal");
  joinOnlineRoom(data.id);
};

window.joinOnlineRoom = async function (roomId) {
  if (!userState.isLoggedIn) {
    gameConfirm("온라인 대전은 로그인 후 입장하실 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }

  const { data: room } = await sbClient.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (!room) {
    gameAlert("존재하지 않거나 이미 삭제된 방입니다.");
    refreshRoomsList();
    return;
  }

  const maxP = room.room_type === "1v1" ? 2 : 4;
  let players = Array.isArray(room.players) ? [...room.players] : [];
  if (!players.some(p => p.id === userState.id)) {
    if (players.length >= maxP) {
      gameAlert("방 인원이 가득 찼습니다!");
      return;
    }
    players.push({
      id: userState.id,
      nickname: userState.nickname,
      exp: Number(userState.exp) || 0,
      avatarConfig: userState.avatarConfig,
      score: 0
    });
    await sbClient.from("rooms").update({ players }).eq("id", roomId);
    room.players = players;
  }

  plazaState.currentRoom = room;
  plazaState.activeMatchKey = null;
  plazaState.usedBattleItems = new Set();
  plazaState.battleDoubleActive = false;
  plazaState.item3SecActivatedQIdx = null;
  plazaState.isUsing3Sec = false;
  plazaState.myRoomX = null;
  plazaState.myRoomXRatio = null;
  plazaState.roomPlayersMap.clear();
  document.getElementById("roomChatLog").innerHTML = "";
  subscribeToBattleRoom(room);
};

function showBattleRoundToast(msg, isError = false) {
  const toastEl = document.getElementById("battleRoundToast");
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.background = isError
    ? "linear-gradient(90deg, #e11d48, #be123c)"
    : "linear-gradient(90deg, #0ea5e9, #6366f1)";
  toastEl.classList.remove("hidden");
  if (plazaState.battleToastTimer) clearTimeout(plazaState.battleToastTimer);
  plazaState.battleToastTimer = setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 2600);
}

function triggerBattleCardTransitionEffect(toastMsg) {
  const card = document.getElementById("battleQuestionCard");
  if (card) {
    card.classList.remove("battle-card-flash");
    void card.offsetWidth;
    card.classList.add("battle-card-flash");
  }
  if (typeof playUiClickSound === "function") {
    playUiClickSound();
  }
  if (toastMsg) {
    showBattleRoundToast(toastMsg, false);
  }
}

// 방 내부 입장: 팝업이 아닌 전용 전체화면(#battleRoomScreen)으로 전환!
function subscribeToBattleRoom(room) {
  if (plazaState.roomChannel) {
    sbClient.removeChannel(plazaState.roomChannel);
  }
  if (plazaState.roomPollTimer) {
    clearInterval(plazaState.roomPollTimer);
    plazaState.roomPollTimer = null;
  }

  plazaState.lastRoomId = room.id;
  plazaState.lastRenderedQIndex = null;

  switchScreen("battleRoomScreen");
  renderBattleRoomState(room);
  startRoomStageCanvasLoop();

  plazaState.roomChannel = sbClient
    .channel(`room_${room.id}`)
    .on("broadcast", { event: "room_update" }, ({ payload }) => {
      if (payload) {
        if (payload._lastEventText) {
          plazaState.pendingRoundToast = payload._lastEventText;
        }
        plazaState.currentRoom = payload;
        renderBattleRoomState(payload);
      }
    })
    .on("broadcast", { event: "room_char_sync" }, ({ payload }) => {
      if (payload && payload.id) {
        if (isUserBlocked(payload.id, payload.nickname)) return;
        plazaState.roomPlayersMap.set(payload.id, payload);
        if (payload.newChatLine) {
          appendRoomChatLine(payload.nickname, payload.newChatLine);
        }
      }
    })
    .subscribe(status => {
      if (status === "SUBSCRIBED") {
        broadcastMyRoomCharacter("");
        plazaState.roomChannel.send({
          type: "broadcast",
          event: "room_update",
          payload: plazaState.currentRoom || room
        });
      }
    });

  // 무제한 대기 중 WebSocket이 일시 끊겨도 방이 꺼지거나 멈추지 않도록 5초 간격 DB 동기화 유지
  plazaState.roomPollTimer = setInterval(async () => {
    if (!plazaState.currentRoom || !sbClient) return;
    try {
      const latest = await sbClient
        .from("rooms")
        .select("*")
        .eq("id", plazaState.currentRoom.id)
        .maybeSingle()
        .then(res => res && res.data);
      if (!latest) return;
      const cur = plazaState.currentRoom;
      const sameMatch = JSON.stringify(latest.question_ids || []) === JSON.stringify(cur.question_ids || []);
      if (sameMatch && cur.status === "playing") {
        const curQ = Number(cur.current_q_index || 0);
        const latestQ = Number(latest.current_q_index || 0);
        if (latestQ < curQ && latest.status === "playing") return;
        const curRev = cur.game_config?._activeReveal;
        const latRev = latest.game_config?._activeReveal;
        if (latestQ === curQ && curRev && Number(curRev.qIdx) === curQ && !latRev && Date.now() - Number(curRev.at || 0) < 4000) {
          return;
        }
      }
      const changed =
        latest.status !== cur.status ||
        latest.current_q_index !== cur.current_q_index ||
        JSON.stringify(latest.game_config) !== JSON.stringify(cur.game_config) ||
        JSON.stringify(latest.players) !== JSON.stringify(cur.players);
      if (changed) {
        plazaState.currentRoom = latest;
        renderBattleRoomState(latest);
      }
    } catch (e) {}
  }, 5000);
}

function broadcastMyRoomCharacter(newChatLine = "") {
  if (!plazaState.currentRoom) return;
  const payload = {
    id: userState.id || "me",
    nickname: userState.nickname,
    exp: Number(userState.exp) || 0,
    avatarConfig: userState.avatarConfig,
    x: plazaState.myRoomX,
    xRatio: plazaState.myRoomXRatio,
    chatMsg: Date.now() < plazaState.myRoomChatExpire ? plazaState.myRoomChat : "",
    newChatLine
  };
  plazaState.roomPlayersMap.set(payload.id, payload);

  if (plazaState.roomChannel) {
    plazaState.roomChannel.send({
      type: "broadcast",
      event: "room_char_sync",
      payload
    });
  }
}

window.sendRoomChat = function () {
  const input = document.getElementById("roomChatInput");
  const msg = input.value.trim();
  if (!msg) return;

  if (typeof validateCleanUserText === "function") {
    const check = validateCleanUserText(msg, { fieldLabel: "대기방 채팅", spamChannel: "room" });
    if (!check.ok) {
      if (check.reason === "banned") input.value = "";
      gameAlert(check.message, "🚫 채팅 안내");
      return;
    }
  }

  input.value = "";
  plazaState.myRoomChat = msg;
  plazaState.myRoomChatExpire = Date.now() + 5000;
  appendRoomChatLine(userState.nickname, msg);
  broadcastMyRoomCharacter(msg);
};

function appendRoomChatLine(nick, msg) {
  const log = document.getElementById("roomChatLog");
  if (!log) return;
  const div = document.createElement("div");
  div.style.fontSize = "0.78rem";
  div.innerHTML = `<strong style="color:var(--primary);">${escapeOnlineHtml(nick)}:</strong> ${escapeOnlineHtml(msg)}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

// 방 내부 전용 맵 캔버스 (1:1 정배율 · 상점과 동일한 비율의 대형 고화질 캐릭터)
function startRoomStageCanvasLoop() {
  const canvas = document.getElementById("roomStageCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  canvas.onclick = e => {
    const rect = canvas.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = Math.max(0.12, Math.min(0.88, (e.clientX - rect.left) / rect.width));
    plazaState.myRoomXRatio = ratio;
    plazaState.myRoomX = Math.round(ratio * rect.width);
    broadcastMyRoomCharacter("");
  };

  const offscreenMap = new Map();
  const displayXMap = new Map();

  const loop = () => {
    const roomScreen = document.getElementById("battleRoomScreen");
    if (!roomScreen || roomScreen.classList.contains("hidden")) {
      return;
    }

    const rectW = Math.max(240, Math.round(canvas.clientWidth || 340));
    const rectH = Math.max(170, Math.round(canvas.clientHeight || 200));
    const dpr = Math.min(2.5, window.devicePixelRatio || 2);
    const bufW = Math.round(rectW * dpr);
    const bufH = Math.round(rectH * dpr);
    if (canvas.width !== bufW || canvas.height !== bufH) {
      canvas.width = bufW;
      canvas.height = bufH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = rectW;
    const H = rectH;
    const groundY = H - 36;
    ctx.clearRect(0, 0, W, H);

    // 방 내부 스테이지 배경 (하늘 · 구름 · 잔디 바닥)
    const grad = ctx.createLinearGradient(0, 0, 0, groundY);
    grad.addColorStop(0, "#7dd3fc");
    grad.addColorStop(1, "#e0f2fe");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, groundY);

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(W * 0.22, 34, 16, 0, Math.PI * 2);
    ctx.arc(W * 0.27, 29, 20, 0, Math.PI * 2);
    ctx.arc(W * 0.33, 35, 15, 0, Math.PI * 2);
    ctx.arc(W * 0.74, 42, 14, 0, Math.PI * 2);
    ctx.arc(W * 0.79, 37, 18, 0, Math.PI * 2);
    ctx.arc(W * 0.84, 43, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4ade80";
    ctx.fillRect(0, groundY, W, 12);
    ctx.fillStyle = "#16a34a";
    ctx.fillRect(0, groundY + 12, W, H - groundY - 12);
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    const room = plazaState.currentRoom;
    const roomPlayers = room && Array.isArray(room.players) ? room.players : [];
    const total = Math.max(1, roomPlayers.length);
    const isDense = (room && room.room_type === "4p") || total > 2;
    const charSize = isDense
      ? Math.min(118, Math.max(88, Math.round(H * 0.6)))
      : Math.min(144, Math.max(106, Math.round(H * 0.7)));
    const charTop = groundY - Math.round(charSize * 0.84);
    const nowSec = performance.now() / 1000;

    roomPlayers.forEach((rp, idx) => {
      const pid = String(rp.id || idx);
      let off = offscreenMap.get(pid);
      if (!off) {
        off = document.createElement("canvas");
        off.width = 480;
        off.height = 480;
        offscreenMap.set(pid, off);
      }

      const live = plazaState.roomPlayersMap.get(rp.id) || {};
      const cfg = live.avatarConfig || rp.avatarConfig || DEFAULT_AVATAR_CONFIG;
      renderPixelAvatar(off, cfg, {
        transparentBg: true,
        matchCssAspect: false,
        skipEffectLoop: true,
        staticEffectPhase: nowSec
      });

      const defaultRatio =
        total === 1 ? 0.5 : total === 2 ? (idx === 0 ? 0.3 : 0.7) : (idx + 0.65) / (total + 0.3);
      let targetX = W * defaultRatio;
      if (typeof live.xRatio === "number" && Number.isFinite(live.xRatio)) {
        targetX = Math.max(36, Math.min(W - 36, live.xRatio * W));
      } else if (typeof live.x === "number" && Number.isFinite(live.x)) {
        targetX = Math.max(36, Math.min(W - 36, live.x));
      }

      const prevX = displayXMap.has(pid) ? displayXMap.get(pid) : targetX;
      const drawX = prevX + (targetX - prevX) * 0.25;
      displayXMap.set(pid, drawX);

      // 1:1 정사각 비율 유지로 찌부짜부 없이 크게 렌더링
      ctx.drawImage(off, Math.round(drawX - charSize / 2), charTop, charSize, charSize);

      // 닉네임 태그 + 계급 아이콘
      ctx.font = "900 11.5px sans-serif";
      ctx.textBaseline = "middle";
      const rpExp = rp.id === userState.id ? (Number(userState.exp) || 0) : (Number(live.exp ?? rp.exp) || 0);
      const rpLv = typeof getLevelInfo === "function" ? getLevelInfo(rpExp).level : 1;
      const rankCv = typeof getMusicRankIconCanvas === "function" ? getMusicRankIconCanvas(rpLv) : null;
      const icoGap = rankCv ? 18 : 0;
      const nickStr = rp.id === (room && room.host_id) ? `👑 ${rp.nickname}` : String(rp.nickname || "");
      const textW = ctx.measureText(nickStr).width;
      const tagW = textW + 14 + icoGap;
      const tagX = Math.max(4, Math.min(W - tagW - 4, drawX - tagW / 2));
      const tagY = groundY + 7;
      ctx.fillStyle = rp.id === userState.id ? "rgba(22, 101, 52, 0.9)" : "rgba(15, 23, 42, 0.84)";
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(tagX, tagY, tagW, 19, 9);
      else ctx.rect(tagX, tagY, tagW, 19);
      ctx.fill();
      if (rankCv) {
        ctx.drawImage(rankCv, tagX + 6, tagY + 2.5, 14, 14);
      }
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText(nickStr, tagX + 7 + icoGap, tagY + 10);
      ctx.textAlign = "center";

      // 말풍선
      if (live.chatMsg) {
        const txt = String(live.chatMsg).slice(0, 16);
        ctx.font = "900 11.5px sans-serif";
        const msgW = Math.min(176, ctx.measureText(txt).width + 16);
        const bx = Math.max(6, Math.min(W - msgW - 6, drawX - msgW / 2));
        const by = Math.max(8, charTop - 16);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#1e1b18";
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") ctx.roundRect(bx, by, msgW, 22, 10);
        else ctx.rect(bx, by, msgW, 22);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#0f172a";
        ctx.fillText(txt, bx + msgW / 2, by + 11.5);
      }
    });

    plazaState.roomAnimFrame = requestAnimationFrame(loop);
  };

  if (plazaState.roomAnimFrame) cancelAnimationFrame(plazaState.roomAnimFrame);
  plazaState.roomAnimFrame = requestAnimationFrame(loop);
}

const roomSettingsModalDraft = {
  decade: "ALL",
  mode: "behind",
  stage: 1,
  itemMode: "notem",
  difficulty: "normal"
};

window.openRoomSettingsModal = function () {
  const room = plazaState.currentRoom;
  if (!room || room.host_id !== userState.id || room.status !== "waiting") return;
  const cfg = room.game_config || {};
  roomSettingsModalDraft.decade = cfg.decade || "ALL";
  roomSettingsModalDraft.mode = cfg.mode || "behind";
  roomSettingsModalDraft.stage = Number(cfg.stage || 1);
  roomSettingsModalDraft.itemMode = cfg.itemMode || "notem";
  roomSettingsModalDraft.difficulty = cfg.difficulty === "hard" ? "hard" : "normal";

  selectEditRoomConfig("decade", roomSettingsModalDraft.decade);
  selectEditRoomConfig("mode", roomSettingsModalDraft.mode);
  selectEditRoomConfig("stage", roomSettingsModalDraft.stage);
  selectEditRoomConfig("itemMode", roomSettingsModalDraft.itemMode);
  selectEditRoomConfig("difficulty", roomSettingsModalDraft.difficulty);
  openModal("roomSettingsModal");
};

window.selectEditRoomConfig = function (key, val) {
  roomSettingsModalDraft[key] = key === "stage" ? Number(val) : val;
  document.querySelectorAll(`[data-edit-room-${key}]`).forEach(el => {
    el.classList.toggle("active", el.getAttribute(`data-edit-room-${key}`) === String(val));
  });
  if (key === "difficulty") {
    const tog = document.getElementById("editRoomDiffToggle");
    if (tog) {
      tog.dataset.quizDiff = String(val);
      tog.querySelectorAll(".diff-toggle-btn").forEach(btn => {
        const match = btn.getAttribute("data-diff") === String(val);
        btn.classList.toggle("active", match);
        btn.classList.toggle("is-selected", match);
      });
    }
  }
};

window.applyRoomSettingsModal = async function () {
  closeModal("roomSettingsModal");
  await updateBattleRoomSettingsByHost({ ...roomSettingsModalDraft });
};

window.setBattleRoomDifficultyByHost = async function (diff) {
  const room = plazaState.currentRoom;
  if (!room || room.status !== "waiting") return;
  if (room.host_id !== userState.id) {
    showGlobalQuickNoticeToast("방장만 난이도를 변경할 수 있습니다!", "info");
    return;
  }
  const nextDiff = diff === "hard" ? "hard" : "normal";
  if ((room.game_config?.difficulty || "normal") === nextDiff) return;
  await updateBattleRoomSettingsByHost({ difficulty: nextDiff });
};

function clearBattlePenaltyLock() {
  plazaState.battlePenaltyUntil = 0;
  if (plazaState.battlePenaltyTimer) {
    clearInterval(plazaState.battlePenaltyTimer);
    plazaState.battlePenaltyTimer = null;
  }
  const ban = document.getElementById("battlePenaltyBanner");
  if (ban) ban.classList.add("hidden");
  document.querySelectorAll("#battleChoiceGrid .quiz-choice-btn").forEach(btn => {
    btn.classList.remove("is-penalty-locked");
    if (!btn.classList.contains("is-eliminated")) {
      btn.disabled = false;
    }
  });
}

function clearBattleAdvanceTimeout() {
  if (plazaState.battleAdvanceTimeoutId) {
    clearTimeout(plazaState.battleAdvanceTimeoutId);
    plazaState.battleAdvanceTimeoutId = null;
  }
}

function startBattlePenaltyLock(durationMs = 5000) {
  clearBattlePenaltyLock();
  plazaState.battlePenaltyUntil = Date.now() + durationMs;
  const syncBanner = () => {
    const remMs = Math.max(0, (Number(plazaState.battlePenaltyUntil) || 0) - Date.now());
    const ban = document.getElementById("battlePenaltyBanner");
    const secEl = document.getElementById("battlePenaltySec");
    if (remMs <= 0) {
      clearBattlePenaltyLock();
      const room = plazaState.currentRoom;
      if (room && room.status === "playing") renderBattlePlayScreen(room);
      return;
    }
    if (ban) ban.classList.remove("hidden");
    if (secEl) secEl.textContent = String(Math.ceil(remMs / 1000));
    document.querySelectorAll("#battleChoiceGrid .quiz-choice-btn").forEach(btn => {
      btn.classList.add("is-penalty-locked");
      btn.disabled = true;
    });
  };
  syncBanner();
  plazaState.battlePenaltyTimer = setInterval(syncBanner, 200);
}

function getBattleChoiceStateForRound(room, q, curIdx, stage) {
  const cfg = room.game_config || {};
  const cacheKey = `${room.id}_${plazaState.activeMatchKey || ""}_${curIdx}_${q.id}_${stage}`;
  if (!plazaState.battleChoicesByKey) plazaState.battleChoicesByKey = new Map();
  if (plazaState.battleChoicesByKey.has(cacheKey)) {
    return plazaState.battleChoicesByKey.get(cacheKey);
  }
  let choiceData = null;
  const compactList = Array.isArray(cfg._roundChoices) ? cfg._roundChoices : null;
  const compact = compactList && compactList[curIdx] ? compactList[curIdx] : null;
  if (compact && typeof window.buildChoiceStateFromCompact === "function") {
    choiceData = window.buildChoiceStateFromCompact(compact, q, stage);
  } else if (typeof window.buildQuizChoicesForQuestion === "function") {
    const dec = cfg.decade && cfg.decade !== "ALL" ? cfg.decade : null;
    const prefPool = dec ? QUESTIONS_DB.filter(item => item.decade === dec) : QUESTIONS_DB;
    choiceData = window.buildQuizChoicesForQuestion(q, stage, prefPool, `${room.id}_${q.id}_${curIdx}_${stage}`);
  }
  if (choiceData) {
    plazaState.battleChoicesByKey.set(cacheKey, choiceData);
  }
  return choiceData;
}

async function advanceOnlineBattleAfterReveal(expectedRoomId, expectedMatchKey, expectedCurIdx, toastText) {
  const room = plazaState.currentRoom;
  if (!room || room.id !== expectedRoomId || room.status !== "playing") return;
  if (plazaState.activeMatchKey !== expectedMatchKey) return;
  if ((room.current_q_index || 0) !== expectedCurIdx) return;

  const isLast = expectedCurIdx + 1 >= (room.question_ids || []).length;
  room.game_config = { ...(room.game_config || {}), _activeReveal: null };
  if (isLast) {
    room.status = "finished";
  } else {
    room.current_q_index = expectedCurIdx + 1;
  }
  plazaState.pendingRoundToast = toastText;

  await sbClient
    .from("rooms")
    .update({
      current_q_index: room.current_q_index,
      status: room.status,
      game_config: room.game_config
    })
    .eq("id", room.id);

  if (plazaState.roomChannel) {
    plazaState.roomChannel.send({
      type: "broadcast",
      event: "room_update",
      payload: { ...room, _lastEventText: toastText }
    });
  }
  renderBattleRoomState(room);
}

function renderOnlineBattleChoices(room, q, curIdx, stage) {
  const cfg = room.game_config || {};
  const isHardDiff = String(cfg.difficulty || "normal") === "hard";
  const playScreenEl = document.getElementById("battlePlayScreen");
  const inputBox = document.getElementById("battlePlayInputBox");
  const choiceWrap = document.getElementById("battleChoiceWrap");
  const choiceGrid = document.getElementById("battleChoiceGrid");
  const choiceGuide = document.getElementById("battleChoiceGuide");
  const typingRow = document.getElementById("battleTypingInputRow");
  const submitBtn = document.getElementById("battleSubmitBtn");
  const winnerBanner = document.getElementById("battleWinnerRevealBanner");
  const penaltyBanner = document.getElementById("battlePenaltyBanner");

  if (playScreenEl) {
    playScreenEl.classList.toggle("is-choice-mode", !isHardDiff);
    playScreenEl.classList.toggle("has-3stage-choices", !isHardDiff && stage === 3);
  }
  if (inputBox) inputBox.classList.toggle("is-choice-mode", !isHardDiff);

  const diffBadge = document.getElementById("battlePlayDiffBadge");
  if (diffBadge) {
    diffBadge.textContent = isHardDiff ? "🔥 고수×2" : "😊 일반";
    diffBadge.classList.toggle("is-hard-badge", isHardDiff);
    diffBadge.classList.toggle("is-normal-badge", !isHardDiff);
  }

  if (isHardDiff) {
    if (choiceWrap) choiceWrap.classList.add("hidden");
    if (typingRow) typingRow.classList.remove("hidden");
    if (submitBtn) submitBtn.classList.remove("hidden");
    if (winnerBanner) winnerBanner.classList.add("hidden");
    if (penaltyBanner) penaltyBanner.classList.add("hidden");
    return;
  }

  if (choiceWrap) choiceWrap.classList.remove("hidden");
  if (typingRow) typingRow.classList.add("hidden");
  if (submitBtn) submitBtn.classList.add("hidden");

  const activeRev =
    cfg._activeReveal && Number(cfg._activeReveal.qIdx) === curIdx ? cfg._activeReveal : null;

  if (activeRev) {
    clearBattlePenaltyLock();
    if (winnerBanner) {
      winnerBanner.classList.remove("hidden");
      winnerBanner.textContent = `🎉 [${activeRev.winnerNick || "도전자"}] 정답! (${activeRev.songLabel || `${q.artist} - ${q.title}`} · +${activeRev.points || 100}점)`;
    }
    const matchKey = `${room.id}_${(room.question_ids || []).join(",")}`;
    const revealKey = `${room.id}_${matchKey}_${curIdx}`;
    const isSelfWinner = String(activeRev.winnerId || "") === String(userState.id || "");
    const ageMs = Date.now() - (Number(activeRev.at) || Date.now());
    const canHostFailsafe = room.host_id === userState.id && ageMs >= 2600;
    if ((isSelfWinner || canHostFailsafe) && plazaState.battleLastRevealHandledKey !== revealKey) {
      plazaState.battleLastRevealHandledKey = revealKey;
      clearBattleAdvanceTimeout();
      const delayMs = canHostFailsafe ? 80 : 1350;
      const toastMsg = `🎉 [${activeRev.winnerNick || "도전자"}] 정답! (${q.artist} - ${q.title})`;
      plazaState.battleAdvanceTimeoutId = setTimeout(() => {
        advanceOnlineBattleAfterReveal(room.id, matchKey, curIdx, toastMsg);
      }, delayMs);
    }
  } else {
    if (winnerBanner) winnerBanner.classList.add("hidden");
  }

  const penaltyLocked = !activeRev && Date.now() < (Number(plazaState.battlePenaltyUntil) || 0);
  if (penaltyBanner) penaltyBanner.classList.toggle("hidden", !penaltyLocked);

  const choiceData = getBattleChoiceStateForRound(room, q, curIdx, stage);
  if (choiceGrid && choiceData && typeof window.renderQuizChoiceGrid === "function") {
    window.renderQuizChoiceGrid({
      containerEl: choiceGrid,
      guideEl: choiceGuide,
      choiceData,
      stage,
      pickedArtist: plazaState.battlePickedArtist,
      pickedTitle: plazaState.battlePickedTitle,
      winnerReveal: activeRev,
      penaltyLocked,
      onSelectSingle: label => {
        submitOnlineBattleChoice({ singleChoiceVal: label });
      },
      onSelectStage3Artist: label => {
        if (Date.now() < (Number(plazaState.battlePenaltyUntil) || 0)) return;
        if (plazaState.battlePickedTitle) {
          const pickedA = label;
          const pickedT = plazaState.battlePickedTitle;
          plazaState.battlePickedArtist = pickedA;
          submitOnlineBattleChoice({ artistVal: pickedA, titleVal: pickedT });
          return;
        }
        plazaState.battlePickedArtist = plazaState.battlePickedArtist === label ? null : label;
        renderOnlineBattleChoices(room, q, curIdx, stage);
      },
      onSelectStage3Title: label => {
        if (Date.now() < (Number(plazaState.battlePenaltyUntil) || 0)) return;
        if (plazaState.battlePickedArtist) {
          const pickedA = plazaState.battlePickedArtist;
          const pickedT = label;
          plazaState.battlePickedTitle = pickedT;
          submitOnlineBattleChoice({ artistVal: pickedA, titleVal: pickedT });
          return;
        }
        plazaState.battlePickedTitle = plazaState.battlePickedTitle === label ? null : label;
        renderOnlineBattleChoices(room, q, curIdx, stage);
      }
    });
  }
}

function renderBattleRoomState(room) {
  document.getElementById("battleRoomTitle").textContent = `[${room.room_type === "1v1" ? "1:1 선착순" : "4인 점수제"}] ${room.title}`;

  const cfg = room.game_config || { decade: "ALL", mode: "behind", stage: 1, itemMode: "notem", difficulty: "normal" };
  const diff = cfg.difficulty === "hard" ? "hard" : "normal";
  const decLabel = cfg.decade === "ALL" ? "전연대" : String(cfg.decade).replace("s", "년대");
  const modeLabel = { behind: "📖 비하인드", lyrics: "📝 가사", onesec: "⚡ 1초듣기" }[cfg.mode] || "📖 비하인드";
  const stageLabel = `${cfg.stage || 1}단계(${cfg.stage === 2 ? "가수" : cfg.stage === 3 ? "가수+노래" : "노래"})`;
  const itemModeLabel = cfg.itemMode === "item" ? "🎒 아이템전" : "🚫 노템전";
  const isHost = room.host_id === userState.id;
  const maxP = room.room_type === "1v1" ? 2 : 4;
  const curP = Array.isArray(room.players) ? room.players.length : 0;

  const diffTogEl = document.getElementById("battleRoomDiffToggle");
  if (diffTogEl) {
    diffTogEl.dataset.quizDiff = diff;
    diffTogEl.classList.toggle("is-readonly", !isHost || room.status !== "waiting");
    diffTogEl.querySelectorAll(".diff-toggle-btn").forEach(btn => {
      const match = btn.getAttribute("data-diff") === diff;
      btn.classList.toggle("active", match);
      btn.classList.toggle("is-selected", match);
    });
  }

  const configBar = document.getElementById("battleRoomConfigBar");
  if (configBar) {
    configBar.innerHTML = `
      <span class="badge ${diff === "hard" ? "is-hard-badge" : "is-normal-badge"}">${diff === "hard" ? "🔥 고수×2" : "😊 일반"}</span>
      <span class="badge">${decLabel}</span>
      <span class="badge primary">${modeLabel}</span>
      <span class="badge accent">${stageLabel}</span>
      <span class="badge ${cfg.itemMode === "item" ? "gold" : ""}">${itemModeLabel}</span>
    `;
  }

  const hostEditBox = document.getElementById("battleHostConfigEditor");
  const hostSettingsBtn = document.getElementById("battleHostSettingsBtn");
  const inviteBtn = document.getElementById("battleRoomInviteBtn");
  if (hostEditBox) {
    hostEditBox.classList.toggle("hidden", room.status !== "waiting");
  }
  if (hostSettingsBtn) {
    hostSettingsBtn.classList.toggle("hidden", !isHost || room.status !== "waiting");
  }
  if (inviteBtn) {
    inviteBtn.classList.toggle("hidden", room.status !== "waiting" || curP >= maxP);
  }

  const playersEl = document.getElementById("battlePlayersBoard");
  playersEl.innerHTML = (room.players || [])
    .map(p => {
      const pExp = p.id === userState.id ? (Number(userState.exp) || 0) : (Number(p.exp) || 0);
      const rankIco = typeof renderMusicRankIconHtml === "function" ? renderMusicRankIconHtml(pExp, { isExp: true, size: 16 }) : "";
      return `
      <div class="score-rule-item">
        <span style="display:inline-flex; align-items:center; gap:4px;">${p.id === room.host_id ? "👑" : "👤"} ${rankIco} ${escapeOnlineHtml(p.nickname || "")}</span>
        <strong class="score-plus">${p.score || 0}점</strong>
      </div>
    `;
    })
    .join("");

  const startBtn = document.getElementById("battleHostStartBtn");
  const waitBanner = document.getElementById("battleGuestWaitBanner");

  if (room.status === "waiting") {
    plazaState.lastRenderedQIndex = null;
    plazaState.activeMatchKey = null;
    plazaState.usedBattleItems = new Set();
    plazaState.battleDoubleActive = false;
    plazaState.item3SecActivatedQIdx = null;
    plazaState.isUsing3Sec = false;
    plazaState.battleChoicesByKey = new Map();
    plazaState.battlePickedArtist = null;
    plazaState.battlePickedTitle = null;
    plazaState.battleLastRevealHandledKey = null;
    clearBattlePenaltyLock();
    clearBattleAdvanceTimeout();
    if (startBtn) startBtn.classList.toggle("hidden", !isHost);
    if (waitBanner) waitBanner.classList.toggle("hidden", isHost);
    if (typeof state !== "undefined" && state.currentScreen === "battlePlayScreen") {
      switchScreen("battleRoomScreen");
      startRoomStageCanvasLoop();
    }
  } else if (room.status === "playing" || room.status === "finished") {
    if (typeof closeModal === "function") {
      closeModal("roomSettingsModal");
      closeModal("battleInviteModal");
    }
    if (typeof state !== "undefined" && state.currentScreen !== "battlePlayScreen") {
      switchScreen("battlePlayScreen");
    } else if (typeof syncGlobalOnlineActivity === "function") {
      syncGlobalOnlineActivity("battlePlayScreen");
    }
    renderBattlePlayScreen(room);
  }
}

function renderBattlePlayScreen(room) {
  const cfg = room.game_config || { decade: "ALL", mode: "behind", stage: 1 };
  const mode = cfg.mode || "behind";
  const stage = Number(cfg.stage || 1);
  const curIdx = room.current_q_index || 0;

  // 라운드 전환 & 새 게임 시작 감지 (방장·게스트 모두 아이템 사용 내역/더블어택 초기화 보장)
  if (plazaState.lastRoomId !== room.id) {
    plazaState.lastRoomId = room.id;
    plazaState.lastRenderedQIndex = null;
  }

  const matchKey = `${room.id}_${(room.question_ids || []).join(",")}`;
  if (room.status === "playing" && plazaState.activeMatchKey !== matchKey) {
    plazaState.activeMatchKey = matchKey;
    plazaState.usedBattleItems = new Set();
    plazaState.battleDoubleActive = false;
    plazaState.item3SecActivatedQIdx = null;
    plazaState.isUsing3Sec = false;
    plazaState.battleChoicesByKey = new Map();
    plazaState.battlePickedArtist = null;
    plazaState.battlePickedTitle = null;
    plazaState.battleLastRevealHandledKey = null;
    clearBattlePenaltyLock();
    clearBattleAdvanceTimeout();
  }

  const prevIdx = plazaState.lastRenderedQIndex;
  const roundChanged = prevIdx !== null && prevIdx !== curIdx;
  const shouldAutoPlayOneSec =
    room.status === "playing" && mode === "onesec" && (prevIdx === null || roundChanged);
  if (roundChanged || (prevIdx === null && room.status === "playing")) {
    const aInp = document.getElementById("battleArtistInput");
    const tInp = document.getElementById("battleTitleInput");
    if (aInp) aInp.value = "";
    if (tInp) tInp.value = "";
    plazaState.battlePickedArtist = null;
    plazaState.battlePickedTitle = null;
    plazaState.battleLastRevealHandledKey = null;
    clearBattlePenaltyLock();
    clearBattleAdvanceTimeout();
  }

  if (roundChanged && room.status === "playing") {
    const prevQId = (room.question_ids || [])[prevIdx];
    const prevQ = QUESTIONS_DB.find(item => item.id === prevQId);
    const defaultMsg = prevQ
      ? `✨ 다음 문제! (이전 정답: ${prevQ.artist} - ${prevQ.title})`
      : "✨ 다음 문제로 넘어갔습니다!";
    const toastMsg = plazaState.pendingRoundToast || defaultMsg;
    plazaState.pendingRoundToast = null;
    triggerBattleCardTransitionEffect(toastMsg);
  }
  plazaState.lastRenderedQIndex = room.status === "playing" ? curIdx : null;

  const hudEl = document.getElementById("battlePlayPlayersHud");
  if (hudEl) {
    hudEl.innerHTML = (room.players || [])
      .map(p => {
        const pExp = p.id === userState.id ? (Number(userState.exp) || 0) : (Number(p.exp) || 0);
        const rankIco = typeof renderMusicRankIconHtml === "function" ? renderMusicRankIconHtml(pExp, { isExp: true, size: 15 }) : "";
        return `
        <div class="score-rule-item">
          <span style="display:inline-flex; align-items:center; gap:4px;">${p.id === room.host_id ? "👑" : "👤"} ${rankIco} ${escapeOnlineHtml(p.nickname || "")}</span>
          <strong class="score-plus">${p.score || 0}점</strong>
        </div>
      `;
      })
      .join("");
  }

  const inputBox = document.getElementById("battlePlayInputBox");
  const finishedBox = document.getElementById("battleFinishedActions");
  const vsBox = document.getElementById("battle1v1ResultBox");
  const shareBtn = document.getElementById("battleShareResultBtn");
  const qTextEl = document.getElementById("battlePlayQuestionText");
  const oneSecBox = document.getElementById("battleOneSecBox");
  const artistGroup = document.getElementById("battleArtistInputGroup");
  const titleGroup = document.getElementById("battleTitleInputGroup");

  const playScreenEl = document.getElementById("battlePlayScreen");
  const diffBadgeTop = document.getElementById("battlePlayDiffBadge");
  const isHardDiffBanner = String(cfg.difficulty || "normal") === "hard";
  if (diffBadgeTop) {
    diffBadgeTop.textContent = isHardDiffBanner ? "🔥 고수×2" : "😊 일반";
    diffBadgeTop.classList.toggle("is-hard-badge", isHardDiffBanner);
    diffBadgeTop.classList.toggle("is-normal-badge", !isHardDiffBanner);
  }

  if (room.status === "finished") {
    clearBattlePenaltyLock();
    clearBattleAdvanceTimeout();
    if (playScreenEl) {
      playScreenEl.classList.remove("is-choice-mode", "has-3stage-choices");
    }
    if (typeof stopAudio === "function") stopAudio();
    if (inputBox) inputBox.classList.add("hidden");
    if (finishedBox) finishedBox.classList.remove("hidden");
    if (oneSecBox) oneSecBox.classList.add("hidden");
    const players = Array.isArray(room.players) ? room.players : [];
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const winner = sorted[0];
    document.getElementById("battleWinnerBanner").textContent =
      `🏆 최종 우승: ${winner ? winner.nickname : "없음"} (${winner ? winner.score : 0}점)`;

    const is1v1Mode = room.room_type === "1v1" && players.length >= 2;
    if (is1v1Mode && vsBox) {
      if (qTextEl) {
        qTextEl.innerHTML = `<div style="text-align:center; padding:6px 0;"><strong>⚔️ 1:1 대결이 종료되었습니다!</strong></div>`;
      }
      const leftP = players.find(p => p.id === userState.id) || players[0];
      const rightP = players.find(p => p.id !== leftP.id) || players[1];
      const historyList = Array.isArray(room.game_config?._roundHistory) ? room.game_config._roundHistory : [];
      const totalRounds = Math.max((room.question_ids || []).length, historyList.length, 10);
      const histByIdx = new Map();
      historyList.forEach(h => {
        if (h && h.qIdx !== undefined) histByIdx.set(Number(h.qIdx), h);
      });

      let leftWins = 0;
      let rightWins = 0;
      const rowsHtml = [];
      for (let i = 0; i < totalRounds; i++) {
        const rec = histByIdx.get(i);
        const qId = (room.question_ids || [])[i];
        const qObj = typeof QUESTIONS_DB !== "undefined" ? QUESTIONS_DB.find(item => item.id === qId) : null;
        const songText = rec?.songLabel || (qObj ? `${qObj.artist} - ${qObj.title}` : `ROUND ${i + 1}`);
        const wId = rec?.winnerId ? String(rec.winnerId) : "";
        const pts = Number(rec?.points) || 100;
        let cls = "";
        let leftPtText = "0";
        let rightPtText = "0";
        let leftPtCls = "";
        let rightPtCls = "";
        if (wId && wId === String(leftP.id)) {
          cls = "is-me-win";
          leftPtText = `+${pts}`;
          leftPtCls = "is-win";
          rightPtCls = "is-lose";
          leftWins += 1;
        } else if (wId && wId === String(rightP.id)) {
          cls = "is-opp-win";
          rightPtText = `+${pts}`;
          leftPtCls = "is-lose";
          rightPtCls = "is-win";
          rightWins += 1;
        }
        rowsHtml.push(`
          <div class="battle-round-pill ${cls}">
            <span class="battle-round-pt ${leftPtCls}">${leftPtText}</span>
            <span class="battle-round-song">${i + 1}. ${escapeOnlineHtml(songText)}</span>
            <span class="battle-round-pt ${rightPtCls}">${rightPtText}</span>
          </div>
        `);
      }

      const leftExp = leftP.id === userState.id ? (Number(userState.exp) || 0) : (Number(leftP.exp) || 0);
      const rightExp = rightP.id === userState.id ? (Number(userState.exp) || 0) : (Number(rightP.exp) || 0);
      const leftRankIco = typeof renderMusicRankIconHtml === "function" ? renderMusicRankIconHtml(leftExp, { isExp: true, size: 15 }) : "";
      const rightRankIco = typeof renderMusicRankIconHtml === "function" ? renderMusicRankIconHtml(rightExp, { isExp: true, size: 15 }) : "";
      const leftIsTop = (Number(leftP.score) || 0) > (Number(rightP.score) || 0);
      const rightIsTop = (Number(rightP.score) || 0) > (Number(leftP.score) || 0);

      vsBox.innerHTML = `
        <div class="battle-vs-header">
          <div class="battle-vs-player ${leftIsTop ? "is-winner" : ""}">
            <canvas id="battleVsLeftCv" width="480" height="480"></canvas>
            <div class="battle-vs-nick">${leftRankIco}<span>${escapeOnlineHtml(leftP.nickname || "나")}</span></div>
            <div class="battle-vs-score">${Number(leftP.score || 0).toLocaleString()}점 (${leftWins}/${totalRounds})</div>
          </div>
          <div class="battle-vs-badge">VS</div>
          <div class="battle-vs-player ${rightIsTop ? "is-winner" : ""}">
            <canvas id="battleVsRightCv" width="480" height="480"></canvas>
            <div class="battle-vs-nick">${rightRankIco}<span>${escapeOnlineHtml(rightP.nickname || "상대")}</span></div>
            <div class="battle-vs-score">${Number(rightP.score || 0).toLocaleString()}점 (${rightWins}/${totalRounds})</div>
          </div>
        </div>
        <div class="battle-vs-rounds">${rowsHtml.join("")}</div>
      `;
      vsBox.classList.remove("hidden");
      if (shareBtn) shareBtn.classList.remove("hidden");

      const leftCv = document.getElementById("battleVsLeftCv");
      const rightCv = document.getElementById("battleVsRightCv");
      if (leftCv && typeof renderPixelAvatar === "function") {
        renderPixelAvatar(leftCv, leftP.avatarConfig || DEFAULT_AVATAR_CONFIG, { skipEffectLoop: true });
      }
      if (rightCv && typeof renderPixelAvatar === "function") {
        renderPixelAvatar(rightCv, rightP.avatarConfig || DEFAULT_AVATAR_CONFIG, { skipEffectLoop: true });
      }
    } else {
      if (vsBox) vsBox.classList.add("hidden");
      if (shareBtn) shareBtn.classList.add("hidden");
      if (qTextEl) {
        qTextEl.classList.remove("hidden");
        const rankList = sorted
          .map((p, i) => `${i + 1}위. ${p.nickname} (${p.score || 0}점)`)
          .join("<br/>");
        qTextEl.innerHTML = `<div style="text-align:center; padding:8px 0;"><strong>🎹 대결 최종 순위</strong><br/><br/>${rankList}</div>`;
      }
    }

    const roundRewardKey = `${room.id}_${(room.question_ids || []).join(",")}`;
    if (plazaState.lastRewardedKey !== roundRewardKey) {
      plazaState.lastRewardedKey = roundRewardKey;
      const aInp = document.getElementById("battleArtistInput");
      const tInp = document.getElementById("battleTitleInput");
      if (aInp) aInp.value = "";
      if (tInp) tInp.value = "";
      triggerBattleCardTransitionEffect(plazaState.pendingRoundToast || "🏁 대결이 종료되었습니다!");
      plazaState.pendingRoundToast = null;

      const me = (room.players || []).find(p => p.id === userState.id);
      const myScore = me ? Number(me.score) || 0 : 0;
      const isWinner = !!(winner && winner.id === userState.id && myScore > 0);
      const isHardDiff = String(cfg.difficulty || "normal") === "hard";
      const diffMult = isHardDiff ? 2 : 1;
      const baseEarnedCd = isWinner ? 450 : myScore > 0 ? 150 : 0;
      const doubleMult = plazaState.battleDoubleActive ? 2 : 1;
      const earnedCd = baseEarnedCd * diffMult * doubleMult;
      const expBefore = Number(userState.exp) || 0;
      // myScore는 고수 난이도에서 문제당 ×2 점수(200점)가 이미 반영되어 있음
      const gainExp = (Math.round(myScore * 0.3) + (isWinner ? 100 : 0)) * doubleMult;
      userState.exp = expBefore + gainExp;
      if (earnedCd > 0) userState.cdCoins += earnedCd;

      // 1:1 / 4인 대결 승패 기록 업데이트
      const statKey = room.room_type === "1v1" ? "1v1" : "4p";
      if (!userState.battleStats) userState.battleStats = normalizeBattleStats(DEFAULT_BATTLE_STATS);
      if (isWinner) {
        userState.battleStats[statKey].wins += 1;
      } else {
        userState.battleStats[statKey].losses += 1;
      }

      if (typeof window.recordDailyQuestProgress === "function") {
        try { window.recordDailyQuestProgress("quiz", 1); } catch (e) {}
      }
      syncProfileToServer();
      if (typeof showRewardSummaryModal === "function") {
        showRewardSummaryModal({
          earnedCd,
          baseExp: gainExp,
          finalExp: gainExp,
          multiplier: 1,
          achievedTopRank: null,
          expBefore,
          expAfter: userState.exp
        });
      }
    }
    return;
  }

  if (vsBox) vsBox.classList.add("hidden");
  if (shareBtn) shareBtn.classList.add("hidden");
  if (inputBox) inputBox.classList.remove("hidden");
  if (finishedBox) finishedBox.classList.add("hidden");

  // 패스 버튼 및 카운트 배지 업데이트
  const passBtn = document.getElementById("battlePassBtn");
  const passBadge = document.getElementById("battlePassBadge");
  const players = room.players || [];
  const passCount = players.filter(p => Number(p.passQ) === curIdx).length;
  const myPassed = players.some(p => p.id === userState.id && Number(p.passQ) === curIdx);

  if (passBtn) {
    passBtn.classList.toggle("is-passed", myPassed);
    const labelNode = passBtn.childNodes[0];
    if (labelNode && labelNode.nodeType === 3) {
      labelNode.textContent = myPassed ? "✅ 패스함 " : "⏭️ 패스 ";
    }
  }
  if (passBadge) {
    passBadge.textContent = String(passCount);
    passBadge.classList.toggle("hidden", passCount <= 0);
  }

  const qId = (room.question_ids || [])[curIdx];
  const q = QUESTIONS_DB.find(item => item.id === qId) || QUESTIONS_DB[0];

  document.getElementById("battlePlayProgress").textContent = `ROUND ${curIdx + 1} / ${(room.question_ids || []).length}`;
  document.getElementById("battlePlayModeBadge").textContent =
    { behind: "📖 비하인드", lyrics: "📝 가사", onesec: "⚡ 1초듣기" }[mode] || "📖 비하인드";
  document.getElementById("battlePlayYearTag").textContent = `${q.year}년`;

  const hintTextEl = document.getElementById("battlePlayHintText");
  const battleArtistEl = document.getElementById("battleArtistInput");
  const battleTitleEl = document.getElementById("battleTitleInput");
  if (battleArtistEl) battleArtistEl.enterKeyHint = stage === 3 ? "next" : "send";
  if (battleTitleEl) battleTitleEl.enterKeyHint = "send";
  if (stage === 1) {
    hintTextEl.textContent = `🎤 가수 힌트: ${q.artist}`;
    artistGroup.classList.add("hidden");
    titleGroup.classList.remove("hidden");
    document.querySelector("#battleTitleInputGroup label").textContent = "🎵 노래 제목 입력";
    document.getElementById("battleTitleInput").placeholder = "노래 제목을 입력하세요!";
  } else if (stage === 2) {
    hintTextEl.textContent = `🎵 노래 힌트: ${q.title}`;
    artistGroup.classList.remove("hidden");
    titleGroup.classList.add("hidden");
  } else {
    const isHardMode = String(cfg.difficulty || "normal") === "hard";
    hintTextEl.textContent = isHardMode ? "🔥 가수 + 노래 모두 맞히기!" : "🔥 가수 + 노래 차례로 터치 (2번째 즉시 판정!)";
    artistGroup.classList.remove("hidden");
    titleGroup.classList.remove("hidden");
    document.querySelector("#battleTitleInputGroup label").textContent = "🎵 노래 제목";
    document.getElementById("battleTitleInput").placeholder = "노래 제목 입력";
  }

  if (mode === "behind") {
    document.getElementById("battlePlayTypeTag").textContent = "🎹 음악왕 라이브 · 비하인드 퀴즈";
    qTextEl.className = "question-content";
    qTextEl.textContent = q.behindQuestion;
    qTextEl.classList.remove("hidden");
    oneSecBox.classList.add("hidden");
  } else if (mode === "lyrics") {
    document.getElementById("battlePlayTypeTag").textContent = "🎶 음악왕 라이브 · 하이라이트 가사";
    qTextEl.className = "question-content lyrics-style";
    qTextEl.innerHTML = `" ${q.lyricsQuestion.replace(/\//g, "<br>")} "`;
    qTextEl.classList.remove("hidden");
    oneSecBox.classList.add("hidden");
  } else {
    document.getElementById("battlePlayTypeTag").textContent = "⚡ 음악왕 라이브 · 1초 듣기";
    qTextEl.classList.add("hidden");
    oneSecBox.classList.remove("hidden");
    if (shouldAutoPlayOneSec) {
      playOnlineBattleAudio(0, true);
    }
  }
  renderOnlineBattleChoices(room, q, curIdx, stage);
  if (typeof renderBattlePlayItemBar === "function") {
    renderBattlePlayItemBar(room);
  }
}

window.playOnlineBattleAudio = function (offsetIdx = 0, isAutoPlay = false) {
  const room = plazaState.currentRoom;
  if (!room) return;
  const qId = (room.question_ids || [])[room.current_q_index || 0];
  const q = QUESTIONS_DB.find(item => item.id === qId) || QUESTIONS_DB[0];
  if (typeof playAudioSnippet === "function") {
    playAudioSnippet(
      1.2,
      offsetIdx === 1 ? 15 : 6,
      q,
      document.getElementById("battleVinylDisc"),
      document.getElementById("battleAudioStatusText"),
      { isAutoPlay: Boolean(isAutoPlay) }
    );
  }
};

window.hostStartOnlineBattle = async function () {
  const room = plazaState.currentRoom;
  if (!room) return;
  if (typeof unlockQuizAudio === "function") unlockQuizAudio();
  const cfg = room.game_config || { decade: "ALL", mode: "behind", stage: 1, difficulty: "normal" };
  const diff = String(cfg.difficulty || "normal") === "hard" ? "hard" : "normal";
  const stage = Number(cfg.stage || 1);
  let pool = cfg.decade && cfg.decade !== "ALL" ? QUESTIONS_DB.filter(q => q.decade === cfg.decade) : QUESTIONS_DB;
  if (pool.length < 10) pool = QUESTIONS_DB;
  const nextIds = shuffleArray(pool).slice(0, 10).map(q => q.id);

  let roundChoices = null;
  if (diff !== "hard" && typeof window.buildQuizChoicesForQuestion === "function" && typeof window.toCompactChoiceData === "function") {
    const seedSalt = Date.now();
    roundChoices = nextIds.map((qid, i) => {
      const qObj = QUESTIONS_DB.find(item => item.id === qid) || QUESTIONS_DB[0];
      const built = window.buildQuizChoicesForQuestion(qObj, stage, pool, `${room.id}_${qid}_${i}_${seedSalt}`);
      return window.toCompactChoiceData(built);
    });
  }

  room.status = "playing";
  room.current_q_index = 0;
  room.question_ids = nextIds;
  room.game_config = {
    ...(room.game_config || {}),
    difficulty: diff,
    _roundHistory: [],
    _activeReveal: null,
    _roundChoices: roundChoices
  };
  room.players = (room.players || []).map(p => ({ ...p, score: 0, passQ: -1 }));
  plazaState.lastRenderedQIndex = null;
  plazaState.activeMatchKey = `${room.id}_${nextIds.join(",")}`;
  plazaState.usedBattleItems = new Set();
  plazaState.battleDoubleActive = false;
  plazaState.item3SecActivatedQIdx = null;
  plazaState.isUsing3Sec = false;
  plazaState.battleChoicesByKey = new Map();
  plazaState.battlePickedArtist = null;
  plazaState.battlePickedTitle = null;
  plazaState.battleLastRevealHandledKey = null;
  clearBattlePenaltyLock();
  clearBattleAdvanceTimeout();
  plazaState.myRoomX = null;
  plazaState.myRoomXRatio = null;

  await sbClient
    .from("rooms")
    .update({ status: "playing", current_q_index: 0, question_ids: nextIds, players: room.players, game_config: room.game_config })
    .eq("id", room.id);

  plazaState.roomChannel.send({ type: "broadcast", event: "room_update", payload: room });
  renderBattleRoomState(room);
};

window.passOnlineBattleQuestion = async function () {
  const room = plazaState.currentRoom;
  if (!room || room.status !== "playing") return;
  const curIdx = room.current_q_index || 0;

  // 이미 내가 이번 라운드에 패스 눌렀다면 중복 처리 방지
  const me = (room.players || []).find(p => p.id === userState.id);
  if (me && Number(me.passQ) === curIdx) return;

  room.players = (room.players || []).map(p =>
    p.id === userState.id ? { ...p, passQ: curIdx } : p
  );

  const passCount = room.players.filter(p => Number(p.passQ) === curIdx).length;
  const allPassed = passCount >= room.players.length;
  let eventText = "";

  if (allPassed) {
    const qId = (room.question_ids || [])[curIdx];
    const q = QUESTIONS_DB.find(item => item.id === qId);
    eventText = q
      ? `⏭️ 전원 패스! (정답: ${q.artist} - ${q.title})`
      : "⏭️ 전원 패스! 다음 문제로 이동합니다.";

    const prevHist = Array.isArray(room.game_config?._roundHistory)
      ? room.game_config._roundHistory.filter(h => Number(h?.qIdx) !== curIdx)
      : [];
    prevHist.push({
      qIdx: curIdx,
      songLabel: q ? `${q.artist} - ${q.title}` : `ROUND ${curIdx + 1}`,
      winnerId: null,
      winnerNick: "",
      points: 0
    });
    room.game_config = { ...(room.game_config || {}), _roundHistory: prevHist, _activeReveal: null };

    if (curIdx + 1 >= (room.question_ids || []).length) {
      room.status = "finished";
    } else {
      room.current_q_index = curIdx + 1;
    }
    plazaState.pendingRoundToast = eventText;
    clearBattlePenaltyLock();
    clearBattleAdvanceTimeout();
  }

  await sbClient
    .from("rooms")
    .update({
      players: room.players,
      current_q_index: room.current_q_index,
      status: room.status,
      game_config: room.game_config
    })
    .eq("id", room.id);

  if (plazaState.roomChannel) {
    plazaState.roomChannel.send({
      type: "broadcast",
      event: "room_update",
      payload: allPassed ? { ...room, _lastEventText: eventText } : room
    });
  }
  renderBattleRoomState(room);
};

window.handleOnlineBattleInputEnter = function (e, field) {
  if (!e || e.key !== "Enter" || e.isComposing) return;
  e.preventDefault();
  const stage = Number(plazaState.currentRoom?.game_config?.stage || 1);
  if (field === "artist" && stage === 3) {
    const titleEl = document.getElementById("battleTitleInput");
    if (titleEl && !titleEl.value.trim()) {
      titleEl.focus();
      return;
    }
  }
  submitOnlineBattleAnswer();
};

async function executeOnlineBattleSubmission({ artistVal = "", titleVal = "", singleChoiceVal = "", fromChoice = false }) {
  const room = plazaState.currentRoom;
  if (!room || room.status !== "playing" || plazaState.battleAnswerInFlight) return;

  const cfg = room.game_config || { mode: "behind", stage: 1, difficulty: "normal" };
  const isHard = String(cfg.difficulty || "normal") === "hard";
  const stage = Number(cfg.stage || 1);
  const curIdx = room.current_q_index || 0;

  if (cfg._activeReveal && Number(cfg._activeReveal.qIdx) === curIdx) return;
  if (!isHard && Date.now() < (Number(plazaState.battlePenaltyUntil) || 0)) return;

  const qId = (room.question_ids || [])[curIdx];
  const q = QUESTIONS_DB.find(item => item.id === qId) || QUESTIONS_DB[0];

  const isCorrect = !isHard && stage !== 3
    ? (stage === 2 ? isArtistMatch(singleChoiceVal, q) : isTitleMatch(singleChoiceVal, q))
    : (stage === 1
        ? isTitleMatch(titleVal, q)
        : stage === 2
        ? isArtistMatch(artistVal, q)
        : isArtistMatch(artistVal, q) && isTitleMatch(titleVal, q));

  plazaState.battleAnswerInFlight = true;
  try {
    if (isCorrect) {
      if (typeof window.triggerGameHaptic === "function") window.triggerGameHaptic("success");
      const artistInput = document.getElementById("battleArtistInput");
      const titleInput = document.getElementById("battleTitleInput");
      if (artistInput) artistInput.value = "";
      if (titleInput) titleInput.value = "";
      plazaState.battlePickedArtist = null;
      plazaState.battlePickedTitle = null;
      clearBattlePenaltyLock();

      const roundPts = isHard ? 200 : 100;
      room.players = (room.players || []).map(p =>
        p.id === userState.id ? { ...p, score: (p.score || 0) + roundPts, passQ: -1 } : { ...p, passQ: -1 }
      );

      const prevHist = Array.isArray(room.game_config?._roundHistory)
        ? room.game_config._roundHistory.filter(h => Number(h?.qIdx) !== curIdx)
        : [];
      prevHist.push({
        qIdx: curIdx,
        songLabel: `${q.artist} - ${q.title}`,
        winnerId: userState.id,
        winnerNick: userState.nickname || "도전자",
        points: roundPts
      });

      const eventText = `🎉 [${userState.nickname}] 정답! (${q.artist} - ${q.title}${isHard ? " · 고수×2" : ""})`;

      if (!isHard && fromChoice) {
        // 일반 난이도(4지선다): 누가 어떤 보기를 눌러 맞췄는지 방 안의 모든 유저에게 1.35초 공개 후 다음 문제 이동
        room.game_config = {
          ...(room.game_config || {}),
          _roundHistory: prevHist,
          _activeReveal: {
            qIdx: curIdx,
            winnerId: userState.id,
            winnerNick: userState.nickname || "도전자",
            singleChoice: stage !== 3 ? singleChoiceVal : "",
            pickedArtist: stage === 3 ? artistVal : "",
            pickedTitle: stage === 3 ? titleVal : "",
            points: roundPts,
            songLabel: `${q.artist} - ${q.title}`,
            at: Date.now()
          }
        };

        await sbClient
          .from("rooms")
          .update({
            players: room.players,
            current_q_index: room.current_q_index,
            status: room.status,
            game_config: room.game_config
          })
          .eq("id", room.id);

        if (plazaState.roomChannel) {
          plazaState.roomChannel.send({
            type: "broadcast",
            event: "room_update",
            payload: room
          });
        }
        renderBattleRoomState(room);
      } else {
        plazaState.pendingRoundToast = eventText;
        room.game_config = { ...(room.game_config || {}), _roundHistory: prevHist, _activeReveal: null };

        if (curIdx + 1 >= (room.question_ids || []).length) {
          room.status = "finished";
        } else {
          room.current_q_index = curIdx + 1;
        }

        await sbClient
          .from("rooms")
          .update({
            players: room.players,
            current_q_index: room.current_q_index,
            status: room.status,
            game_config: room.game_config
          })
          .eq("id", room.id);

        if (plazaState.roomChannel) {
          plazaState.roomChannel.send({
            type: "broadcast",
            event: "room_update",
            payload: { ...room, _lastEventText: eventText }
          });
        }
        renderBattleRoomState(room);
      }
    } else {
      if (typeof window.triggerGameHaptic === "function") window.triggerGameHaptic("error");
      if (!isHard && fromChoice) {
        plazaState.battlePickedArtist = null;
        plazaState.battlePickedTitle = null;
        startBattlePenaltyLock(5000);
        renderOnlineBattleChoices(room, q, curIdx, stage);
        showBattleRoundToast("❌ 오답! 5초 동안 선택할 수 없습니다!", true);
      } else {
        showBattleRoundToast("❌ 오답입니다! 다시 생각해보세요!", true);
      }
    }
  } finally {
    plazaState.battleAnswerInFlight = false;
  }
}

window.submitOnlineBattleChoice = function (payload) {
  return executeOnlineBattleSubmission({ ...(payload || {}), fromChoice: true });
};

window.submitOnlineBattleAnswer = async function () {
  const room = plazaState.currentRoom;
  if (!room || room.status !== "playing") return;

  const cfg = room.game_config || { mode: "behind", stage: 1 };
  const stage = Number(cfg.stage || 1);
  const artistInput = document.getElementById("battleArtistInput");
  const titleInput = document.getElementById("battleTitleInput");
  const artistVal = artistInput ? artistInput.value.trim() : "";
  const titleVal = titleInput ? titleInput.value.trim() : "";

  if (stage === 1 && !titleVal) return;
  if (stage === 2 && !artistVal) return;
  if (stage === 3 && (!artistVal || !titleVal)) {
    showBattleRoundToast("3단계는 가수와 노래 제목을 모두 입력해주세요!", true);
    return;
  }

  return executeOnlineBattleSubmission({ artistVal, titleVal, fromChoice: false });
};

window.returnToWaitingRoomFromBattle = async function () {
  const room = plazaState.currentRoom;
  if (!room) {
    switchScreen("plazaScreen");
    return;
  }
  if (room.host_id === userState.id && sbClient) {
    room.status = "waiting";
    await sbClient.from("rooms").update({ status: "waiting" }).eq("id", room.id);
    if (plazaState.roomChannel) {
      plazaState.roomChannel.send({ type: "broadcast", event: "room_update", payload: room });
    }
  }
  switchScreen("battleRoomScreen");
  startRoomStageCanvasLoop();
  renderBattleRoomState(room);
};

window.confirmExitOnlineBattle = function () {
  gameConfirm(
    "진행 중인 온라인 대전에서 나가면 현재 점수가 초기화됩니다.\n정말 나가시겠습니까?",
    () => {
      leaveBattleRoom();
    },
    "⚠️ 대전 나가기 확인"
  );
};

// 혼자 있는데 방 나가면(또는 마지막 남은 사람이 나가면) 방 즉시 삭제!
window.leaveBattleRoom = async function (opts = {}) {
  const skipNavigate = Boolean(opts && opts.skipNavigate);
  if (plazaState.roomPollTimer) {
    clearInterval(plazaState.roomPollTimer);
    plazaState.roomPollTimer = null;
  }
  plazaState.lastRenderedQIndex = null;
  plazaState.lastRoomId = null;
  plazaState.activeMatchKey = null;
  plazaState.usedBattleItems = new Set();
  plazaState.battleDoubleActive = false;
  plazaState.item3SecActivatedQIdx = null;
  plazaState.isUsing3Sec = false;
  plazaState.battleChoicesByKey = new Map();
  plazaState.battlePickedArtist = null;
  plazaState.battlePickedTitle = null;
  plazaState.battleLastRevealHandledKey = null;
  clearBattlePenaltyLock();
  clearBattleAdvanceTimeout();
  plazaState.myRoomX = null;
  plazaState.myRoomXRatio = null;

  const room = plazaState.currentRoom;
  if (room && sbClient) {
    try {
      const remaining = (room.players || []).filter(p => p.id !== userState.id);
      if (remaining.length === 0) {
        // 남은 사람이 0명이면 방을 DB에서 완전 삭제!
        await sbClient.from("rooms").delete().eq("id", room.id);
      } else {
        const nextHost = room.host_id === userState.id ? remaining[0].id : room.host_id;
        const updatedRoom = { ...room, players: remaining, host_id: nextHost };
        await sbClient
          .from("rooms")
          .update({ players: remaining, host_id: nextHost })
          .eq("id", room.id);
        if (plazaState.roomChannel) {
          plazaState.roomChannel.send({
            type: "broadcast",
            event: "room_update",
            payload: updatedRoom
          });
        }
      }
    } catch (e) {}
  }

  if (plazaState.roomChannel && sbClient) {
    sbClient.removeChannel(plazaState.roomChannel);
    plazaState.roomChannel = null;
  }
  plazaState.currentRoom = null;
  if (!skipNavigate) {
    switchScreen("plazaScreen");
    refreshRoomsList();
  }
};

// ============================================================================
// [V2.0] 방장 대기방 설정 변경 & 멀티 아이템전
// ============================================================================
window.updateBattleRoomSettingsByHost = async function (overrideCfg = null) {
  const room = plazaState.currentRoom;
  if (!room || room.host_id !== userState.id || room.status !== "waiting" || !sbClient) return;
  const decade = (overrideCfg && overrideCfg.decade) || document.getElementById("roomEditDecade")?.value || room.game_config?.decade || "ALL";
  const mode = (overrideCfg && overrideCfg.mode) || document.getElementById("roomEditMode")?.value || room.game_config?.mode || "behind";
  const stage = Number((overrideCfg && overrideCfg.stage) || document.getElementById("roomEditStage")?.value || room.game_config?.stage || 1);
  const itemMode = (overrideCfg && overrideCfg.itemMode) || document.getElementById("roomEditItemMode")?.value || room.game_config?.itemMode || "notem";
  const difficulty = (overrideCfg && overrideCfg.difficulty) || room.game_config?.difficulty || "normal";

  room.game_config = { decade, mode, stage, itemMode, difficulty };
  const decLabel = decade === "ALL" ? "전연대" : decade.replace("s", "년대");
  const modeLabel = { behind: "비하인드", lyrics: "가사", onesec: "1초듣기" }[mode] || mode;
  const itemLabel = itemMode === "item" ? "아이템전" : "노템전";
  const diffLabel = difficulty === "hard" ? "🔥고수×2" : "😊일반";
  const sysText = `⚙️ 방장이 설정을 변경했습니다: [${diffLabel} · ${decLabel} · ${modeLabel} · ${stage}단계 · ${itemLabel}]`;

  await sbClient.from("rooms").update({ game_config: room.game_config }).eq("id", room.id);
  appendRoomChatLine("시스템", sysText);
  broadcastMyRoomCharacter(sysText);
  if (plazaState.roomChannel) {
    plazaState.roomChannel.send({ type: "broadcast", event: "room_update", payload: room });
  }
  renderBattleRoomState(room);
};

window.renderBattlePlayItemBar = function (room) {
  const bar = document.getElementById("battleItemSlotsBar");
  if (!bar) return;
  const cfg = room?.game_config || {};
  if (room?.status !== "playing" || cfg.itemMode !== "item") {
    bar.classList.add("hidden");
    return;
  }
  bar.classList.remove("hidden");
  const curIdx = room.current_q_index || 0;
  const isHard = String(cfg.difficulty || "normal") === "hard";
  // 멀티 일반모드에서는 오답지우기(초성힌트) 미제공 — 3초듣기·더블어택만 허용
  const allowedIds = isHard ? ["item_3sec", "item_chosung", "item_double"] : ["item_3sec", "item_double"];
  const equipped = (userState.equippedItems || []).filter(id => allowedIds.includes(id));
  if (equipped.length === 0) {
    bar.innerHTML = `<span style="font-size:0.75rem; color:#94a3b8;">${isHard ? "장착한 공용 아이템이 없습니다 (가방에서 장착 가능)" : "일반 난이도에서는 3초 듣기 · 더블어택만 사용 가능"}</span>`;
    return;
  }
  const used = plazaState.usedBattleItems || new Set();
  bar.innerHTML = equipped
    .map(id => {
      const meta = typeof getGameItemById === "function" ? getGameItemById(id) : null;
      if (!meta) return "";
      const cnt = getConsumableCount(id);
      const isSameQ3Sec = id === "item_3sec" && plazaState.item3SecActivatedQIdx === curIdx;
      const isUsed = used.has(id) && !isSameQ3Sec;
      const disabled = isUsed || (!isSameQ3Sec && cnt <= 0);
      const label = isSameQ3Sec ? "🎧 3초 다시듣기 (무료)" : `${meta.name} (${cnt})`;
      return `<button type="button" class="quick-item-btn ${isUsed ? "is-used" : ""}" ${disabled ? "disabled" : ""} onclick="useBattleGameItem('${id}')">${label}</button>`;
    })
    .join("");
};

window.useBattleGameItem = async function (itemId) {
  const room = plazaState.currentRoom;
  if (!room || room.status !== "playing") return;
  const cfg = room.game_config || {};
  if (cfg.itemMode !== "item") return;
  const isHard = String(cfg.difficulty || "normal") === "hard";
  if (itemId === "item_chosung" && !isHard) {
    showBattleRoundToast("멀티 일반 난이도에서는 오답지우기/초성 힌트를 사용할 수 없습니다!", true);
    return;
  }
  if (!["item_3sec", "item_chosung", "item_double"].includes(itemId)) return;

  if (!plazaState.usedBattleItems) plazaState.usedBattleItems = new Set();
  const curIdx = room.current_q_index || 0;
  const qId = (room.question_ids || [])[curIdx];
  const q = QUESTIONS_DB.find(item => item.id === qId) || QUESTIONS_DB[0];

  if (itemId === "item_3sec" && plazaState.item3SecActivatedQIdx === curIdx) {
    if (plazaState.isUsing3Sec) return;
    plazaState.isUsing3Sec = true;
    try {
      if (typeof playAudioSnippet === "function") {
        await playAudioSnippet(
          3.0,
          6,
          q,
          document.getElementById("battleVinylDisc"),
          document.getElementById("battleAudioStatusText"),
          { isAutoPlay: false }
        );
      }
    } finally {
      plazaState.isUsing3Sec = false;
    }
    return;
  }

  if (plazaState.usedBattleItems.has(itemId)) {
    showBattleRoundToast("이번 판에서 이미 사용한 아이템입니다!", true);
    return;
  }
  const cnt = getConsumableCount(itemId);
  if (cnt <= 0) {
    showBattleRoundToast("보유 수량이 부족합니다!", true);
    return;
  }

  if (itemId === "item_3sec") {
    if (plazaState.isUsing3Sec) return;
    plazaState.isUsing3Sec = true;
    let playedOk = false;
    try {
      if (typeof playAudioSnippet === "function") {
        playedOk = await playAudioSnippet(
          3.0,
          6,
          q,
          document.getElementById("battleVinylDisc"),
          document.getElementById("battleAudioStatusText"),
          { isAutoPlay: false }
        );
      }
    } finally {
      plazaState.isUsing3Sec = false;
    }
    if (!playedOk) {
      showBattleRoundToast("⚠️ 음원 재생에 실패하여 아이템이 차감되지 않았습니다.", true);
      return;
    }
    const latestRoom = plazaState.currentRoom;
    const latestIdx = latestRoom ? latestRoom.current_q_index || 0 : curIdx;
    const latestCnt = getConsumableCount(itemId);
    userState.inventory[itemId] = Math.max(0, latestCnt - 1);
    plazaState.usedBattleItems.add(itemId);
    plazaState.item3SecActivatedQIdx = latestIdx;
    await syncProfileToServer();
    showBattleRoundToast("🎧 3초 듣기 아이템 발동! (이 문제에서는 재재생 무료)", false);
    renderBattlePlayItemBar(latestRoom || room);
    return;
  }

  userState.inventory[itemId] = cnt - 1;
  plazaState.usedBattleItems.add(itemId);
  await syncProfileToServer();

  if (itemId === "item_chosung") {
    const stage = Number(cfg.stage || 1);
    const toCho = typeof getChosungString === "function" ? getChosungString : (s => String(s || ""));
    const hintStr =
      stage === 1
        ? `노래 초성: ${toCho(q.title)}`
        : stage === 2
        ? `가수 초성: ${toCho(q.artist)}`
        : `가수: ${toCho(q.artist)} / 노래: ${toCho(q.title)}`;
    showBattleRoundToast(`🔤 ${hintStr}`, false);
  } else if (itemId === "item_double") {
    plazaState.battleDoubleActive = true;
    showBattleRoundToast("⚡ 더블어택 발동! 대결 종료 후 최종 EXP·CD 보상 2배!", false);
  }
  renderBattlePlayItemBar(room);
};

// ============================================================================
// [V2.0] 플랫폼별 광고 어댑터 (AdMob / ONE AdMax / 자체 광고 15초)
// ============================================================================
const AD_CONFIG = {
  ADMOB_BANNER_ID: "",
  ADMOB_REWARD_ID: "",
  ONESTORE_ADMAX_ID: ""
};

window.getCurrentPlatformEnv = function () {
  if (window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform()) {
    return "capacitor";
  }
  if (window.onestoreCtx) {
    return "onestore";
  }
  return "web";
};

window.isPlayNoAdMode = function () {
  return (
    getCurrentPlatformEnv() === "capacitor" &&
    !AD_CONFIG.ADMOB_BANNER_ID &&
    !AD_CONFIG.ADMOB_REWARD_ID
  );
};

window.updateHomeAdBannerPlatform = function () {
  const env = getCurrentPlatformEnv();
  const bannerSlot = document.getElementById("homeAdBannerSlot");
  const coupangWrap = document.getElementById("homeCoupangFrameWrap");
  const coupangDisc = document.querySelector("#homeAdBannerSlot .coupang-disclosure");
  const admobSlot = document.getElementById("homeAdmobBannerSlot");
  if (env === "capacitor") {
    if (coupangWrap) coupangWrap.classList.add("hidden");
    if (coupangDisc) coupangDisc.classList.add("hidden");
    if (AD_CONFIG.ADMOB_BANNER_ID) {
      if (bannerSlot) bannerSlot.classList.remove("hidden");
      if (admobSlot) admobSlot.classList.remove("hidden");
    } else {
      if (admobSlot) admobSlot.classList.add("hidden");
      if (bannerSlot) bannerSlot.classList.add("hidden");
    }
  } else {
    if (bannerSlot) bannerSlot.classList.remove("hidden");
    if (coupangWrap) coupangWrap.classList.remove("hidden");
    if (coupangDisc) coupangDisc.classList.remove("hidden");
    if (admobSlot) admobSlot.classList.add("hidden");
  }
};

let selfAdTimerId = null;
window.stopSelfAdCountdownTimer = function () {
  if (selfAdTimerId) {
    clearInterval(selfAdTimerId);
    selfAdTimerId = null;
  }
};
window.showRewardedAd = function (reasonLabel, onRewardCallback) {
  const env = getCurrentPlatformEnv();
  // Capacitor AdMob 실키가 등록된 경우에만 네이티브 호출, 미등록 시 자체 모달 폴백
  if (env === "capacitor" && AD_CONFIG.ADMOB_REWARD_ID && window.Capacitor?.Plugins?.AdMob) {
    try {
      window.Capacitor.Plugins.AdMob.prepareRewardVideoAd({ adId: AD_CONFIG.ADMOB_REWARD_ID })
        .then(() => window.Capacitor.Plugins.AdMob.showRewardVideoAd())
        .then(() => { if (typeof onRewardCallback === "function") onRewardCallback(); })
        .catch(() => gameAlert("광고를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."));
      return;
    } catch (e) {}
  }
  // ONE AdMax 실키가 등록된 경우 호출, 미등록 시 자체 광고 폴백
  if (env === "onestore" && AD_CONFIG.ONESTORE_ADMAX_ID && window.onestoreSdk?.showRewardedAd) {
    try {
      window.onestoreSdk.showRewardedAd({ placementId: AD_CONFIG.ONESTORE_ADMAX_ID })
        .then(() => { if (typeof onRewardCallback === "function") onRewardCallback(); })
        .catch(() => gameAlert("원스토어 광고를 불러오지 못했습니다."));
      return;
    } catch (e) {}
  }

  // 자체 15초 대기 보너스 모달 (웹/원스토어: myad/ad1.png · 구글플레이 무광고 심사 빌드: 순수 보너스 대기 카드)
  const modal = document.getElementById("selfAdModal");
  const modalTitleEl = document.getElementById("selfAdModalTitle");
  const titleEl = document.getElementById("selfAdRewardLabel");
  const timerEl = document.getElementById("selfAdCountdownText");
  const barEl = document.getElementById("selfAdProgressFill");
  const claimBtn = document.getElementById("selfAdClaimBtn");
  const imgEl = document.getElementById("selfAdImage");
  const fallbackBox = document.getElementById("selfAdFallbackBox");
  if (!modal) {
    if (typeof onRewardCallback === "function") onRewardCallback();
    return;
  }

  const noAdMode = isPlayNoAdMode();
  if (modalTitleEl) {
    modalTitleEl.textContent = noAdMode ? "🎁 궁디스튜디오 보너스 충전" : "📺 스폰서 · 제작자 추천 도서";
  }
  if (noAdMode) {
    if (imgEl) {
      imgEl.removeAttribute("src");
      imgEl.style.display = "none";
    }
    if (fallbackBox) fallbackBox.classList.remove("hidden");
  } else {
    if (imgEl) {
      imgEl.style.display = "block";
      imgEl.src = "myad/ad1.png?v=20.0";
    }
    if (fallbackBox) fallbackBox.classList.add("hidden");
  }
  if (titleEl) {
    titleEl.textContent = reasonLabel || (noAdMode ? "15초 대기 후 무료 보상이 지급됩니다!" : "15초 시청 시 보상이 지급됩니다!");
  }
  if (selfAdTimerId) clearInterval(selfAdTimerId);

  let remain = 15;
  const updateTimerUi = () => {
    if (timerEl) {
      const doneMsg = noAdMode
        ? "✅ 대기 완료! 아래 버튼을 눌러 보상을 받으세요!"
        : "✅ 시청 완료! 아래 버튼을 눌러 보상을 받으세요!";
      timerEl.textContent = remain > 0 ? `⏳ ${remain}초 후 보상 받기 가능` : doneMsg;
    }
    if (barEl) {
      barEl.style.width = `${Math.round(((15 - remain) / 15) * 100)}%`;
    }
    if (claimBtn) {
      claimBtn.disabled = remain > 0;
      claimBtn.textContent = remain > 0 ? `⏳ 대기 중 (${remain}s)` : "🎁 보상 받기!";
    }
  };

  if (claimBtn) {
    claimBtn.onclick = () => {
      if (remain > 0) return;
      if (selfAdTimerId) { clearInterval(selfAdTimerId); selfAdTimerId = null; }
      closeModal("selfAdModal");
      if (typeof onRewardCallback === "function") onRewardCallback();
    };
  }

  updateTimerUi();
  openModal("selfAdModal");

  selfAdTimerId = setInterval(() => {
    remain = Math.max(0, remain - 1);
    updateTimerUi();
    if (remain <= 0 && selfAdTimerId) {
      clearInterval(selfAdTimerId);
      selfAdTimerId = null;
    }
  }, 1000);
};

window.closeSelfAdModal = function () {
  window.stopSelfAdCountdownTimer();
  closeModal("selfAdModal");
};

// ============================================================================
// [V2.0/V3.2] 가방 (인벤토리 · 착용 슬롯 6칸 · 광고 충전 · 웰컴 상자 · 변경권 보관)
// ============================================================================
let bagSelectedItemId = "item_3sec";
let welcomeBoxOpeningInFlight = false;

window.markBagItemNew = function (itemId) {
  if (!itemId) return;
  if (!Array.isArray(userState.newBagItems)) userState.newBagItems = [];
  if (!userState.newBagItems.includes(itemId)) {
    userState.newBagItems.push(itemId);
  }
  if (typeof syncAllRewardSparklesUI === "function") {
    try { syncAllRewardSparklesUI(); } catch (e) {}
  }
};

window.clearBagItemNew = function (itemId, shouldSync = false) {
  if (!itemId || !Array.isArray(userState.newBagItems)) return;
  const before = userState.newBagItems.length;
  userState.newBagItems = userState.newBagItems.filter(id => id !== itemId);
  if (before !== userState.newBagItems.length && shouldSync) {
    syncProfileToServer();
  }
  if (typeof syncAllRewardSparklesUI === "function") {
    try { syncAllRewardSparklesUI(); } catch (e) {}
  }
};

function getDisplayBagCatalogItems() {
  const list = [];
  if (getConsumableCount("welcome_box") > 0 && typeof getBagItemMeta === "function") {
    const wb = getBagItemMeta("welcome_box");
    if (wb) list.push(wb);
  }
  if (typeof BAG_SPECIAL_ITEMS_CATALOG !== "undefined") {
    BAG_SPECIAL_ITEMS_CATALOG.forEach(item => {
      if (item.id !== "welcome_box" && getConsumableCount(item.id) > 0) {
        list.push(item);
      }
    });
  }
  if (typeof GAME_ITEMS_CATALOG !== "undefined") {
    GAME_ITEMS_CATALOG.forEach(item => list.push(item));
  }
  return list;
}

window.openBagScreen = function (initialItemId = null) {
  ensureV2DailyState();
  const catalog = getDisplayBagCatalogItems();
  if (initialItemId && initialItemId !== "fish" && catalog.some(it => it.id === initialItemId)) {
    bagSelectedItemId = initialItemId;
  } else if (getConsumableCount("welcome_box") > 0) {
    bagSelectedItemId = "welcome_box";
  } else if (Array.isArray(userState.newBagItems) && userState.newBagItems.length > 0) {
    const match = catalog.find(it => userState.newBagItems.includes(it.id));
    if (match) bagSelectedItemId = match.id;
  } else if (!catalog.some(it => it.id === bagSelectedItemId) && catalog[0]) {
    bagSelectedItemId = catalog[0].id;
  }
  switchScreen("bagScreen");
  renderBagScreen();
  if (typeof switchBagMainTab === "function") {
    switchBagMainTab(initialItemId === "fish" ? "fish" : "items");
  }
  requestAnimationFrame(() => {
    const avCv = document.getElementById("bagAvatarCanvas");
    if (avCv && typeof renderPixelAvatar === "function") {
      renderPixelAvatar(avCv, userState.avatarConfig);
    }
  });
};

window.renderBagScreen = function () {
  ensureV2DailyState();
  const avCv = document.getElementById("bagAvatarCanvas");
  if (avCv && typeof renderPixelAvatar === "function") {
    renderPixelAvatar(avCv, userState.avatarConfig);
  }

  const equipped = userState.equippedItems || [];
  const slotsEl = document.getElementById("bagEquipSlotsRow");
  if (slotsEl) {
    const html = [];
    for (let i = 0; i < 6; i++) {
      const id = equipped[i];
      const meta = id && typeof getGameItemById === "function" ? getGameItemById(id) : null;
      const cnt = id ? getConsumableCount(id) : 0;
      if (meta) {
        const emoji = meta.name.split(" ")[0] || "🎒";
        html.push(`
          <button type="button" class="bag-slot-card is-filled" onclick="toggleEquipBagItem('${id}')" title="터치하여 장착 해제">
            <span class="bag-slot-emoji">${emoji}</span>
            <span class="bag-slot-count">x${cnt}</span>
          </button>
        `);
      } else {
        html.push(`<div class="bag-slot-card is-empty"><span>빈 슬롯</span></div>`);
      }
    }
    slotsEl.innerHTML = html.join("");
  }

  const listEl = document.getElementById("bagItemsGrid");
  const displayItems = getDisplayBagCatalogItems();
  if (listEl) {
    const newSet = new Set(Array.isArray(userState.newBagItems) ? userState.newBagItems : []);
    const itemCards = displayItems.map(item => {
      const cnt = getConsumableCount(item.id);
      const isEquipped = equipped.includes(item.id);
      const isSelected = bagSelectedItemId === item.id;
      const isNew = item.id === "welcome_box" ? cnt > 0 : newSet.has(item.id) && cnt > 0;
      const emoji = item.name.split(" ")[0] || "🎒";
      return `
        <div class="bag-item-tile ${isEquipped ? "is-equipped" : ""} ${isSelected ? "is-selected" : ""} ${isNew ? "is-new-item" : ""}" onclick="selectBagItem('${item.id}')">
          ${isEquipped ? `<span class="bag-item-equipped-tag">장착</span>` : ""}
          ${isNew ? `<span class="bag-new-badge">NEW</span>` : ""}
          <span class="bag-item-cnt-pill">x${cnt}</span>
          <div style="font-size:1.85rem; line-height:1.1; margin-top:4px;">${emoji}</div>
          <div class="bag-item-name">${item.name.replace(/^[^\s]+\s/, "")}</div>
        </div>
      `;
    });
    const minGridSlots = Math.max(9, Math.ceil(displayItems.length / 3) * 3);
    for (let i = displayItems.length; i < minGridSlots; i++) {
      itemCards.push(`
        <div class="bag-item-tile is-empty-slot">
          <div style="font-size:1.25rem; opacity:0.35;">🔒</div>
          <div style="font-size:0.66rem; font-weight:800; color:#94a3b8;">빈 칸</div>
        </div>
      `);
    }
    listEl.innerHTML = itemCards.join("");
  }

  renderBagSelectedDetail();
  if (typeof syncAllRewardSparklesUI === "function") syncAllRewardSparklesUI();
};

window.selectBagItem = function (itemId) {
  bagSelectedItemId = itemId;
  if (itemId !== "welcome_box") {
    clearBagItemNew(itemId, true);
  }
  renderBagScreen();
};

function renderBagSelectedDetail() {
  const catalog = getDisplayBagCatalogItems();
  let item = typeof getBagItemMeta === "function" ? getBagItemMeta(bagSelectedItemId) : null;
  if (!item || (item.id === "welcome_box" && getConsumableCount("welcome_box") <= 0)) {
    item = catalog[0] || (typeof getGameItemById === "function" ? getGameItemById("item_3sec") : null);
    if (item) bagSelectedItemId = item.id;
  }
  if (!item) return;

  const titleEl = document.getElementById("bagDetailTitle");
  const scopeEl = document.getElementById("bagDetailScope");
  const descEl = document.getElementById("bagDetailDesc");
  const equipBtn = document.getElementById("bagToggleEquipBtn");
  const adBtn = document.getElementById("bagAdRechargeBtn");

  const cnt = getConsumableCount(item.id);
  const isEquipped = (userState.equippedItems || []).includes(item.id);

  if (titleEl) titleEl.textContent = `${item.name} (보유 ${cnt}개)`;
  if (scopeEl) scopeEl.textContent = item.id === "welcome_box" || item.isConsumableTicket ? item.scopeLabel : `사용 가능: ${item.scopeLabel}`;
  if (descEl) descEl.textContent = item.desc;

  if (item.id === "welcome_box") {
    if (equipBtn) {
      equipBtn.textContent = "🎁 상자 열어보기!";
      equipBtn.className = "btn btn-gold is-reward-sparkle";
      equipBtn.onclick = () => openWelcomePackageBox();
    }
    if (adBtn) {
      adBtn.disabled = true;
      adBtn.classList.remove("is-reward-sparkle");
      adBtn.textContent = "🎁 환영 특별 선물";
    }
    return;
  }

  if (item.isConsumableTicket) {
    if (equipBtn) {
      equipBtn.disabled = cnt <= 0;
      equipBtn.textContent = item.id === "nickname_ticket" ? "🎫 사용하기 (닉네임 변경)" : "⚧️ 사용하기 (성별 변경)";
      equipBtn.className = cnt > 0 ? "btn btn-primary" : "btn";
      equipBtn.onclick = () => useBagTicketItem(item.id);
    }
    if (adBtn) {
      adBtn.disabled = true;
      adBtn.classList.remove("is-reward-sparkle");
      adBtn.textContent = "🛍️ 상점 변경권 탭 추가구매";
    }
    return;
  }

  if (equipBtn) {
    equipBtn.disabled = false;
    equipBtn.textContent = isEquipped ? "❎ 장착 해제" : "✅ 슬롯에 장착";
    equipBtn.className = isEquipped ? "btn" : "btn btn-primary";
    equipBtn.onclick = () => toggleEquipBagItem(item.id);
  }

  if (adBtn) {
    const noAdMode = typeof isPlayNoAdMode === "function" && isPlayNoAdMode();
    if (!item.adRechargeable) {
      adBtn.disabled = true;
      adBtn.classList.remove("is-reward-sparkle");
      adBtn.textContent = noAdMode ? "🚫 무료 충전 불가" : "🚫 광고 충전 불가";
    } else {
      const ds = ensureV2DailyState();
      const used = Number(ds.itemAdCounts[item.id] || 0);
      const max = item.maxAdPerDay || 3;
      const canWatch = used < max;
      adBtn.disabled = !canWatch;
      adBtn.classList.toggle("is-reward-sparkle", canWatch);
      adBtn.textContent = !canWatch
        ? `✅ 충전 완료 (${used}/${max})`
        : noAdMode
        ? `🎁 무료 충전 받기 (${used}/${max})`
        : `📺 광고 보고 충전 (${used}/${max})`;
      adBtn.onclick = () => rechargeBagItemWithAd(item.id);
    }
  }
}

window.openWelcomePackageBox = async function () {
  if (welcomeBoxOpeningInFlight) return;
  if (!userState.isLoggedIn || !sbClient) {
    gameAlert("웰컴 패키지 개봉은 로그인 후 이용할 수 있습니다.");
    return;
  }
  if (userState.v32WelcomeOpened || getConsumableCount("welcome_box") <= 0) {
    gameAlert("이미 웰컴 패키지 상자를 개봉하셨습니다!");
    renderBagScreen();
    return;
  }

  welcomeBoxOpeningInFlight = true;
  try {
    const { data, error } = await sbClient.rpc("claim_welcome_package");
    if (error) {
      const msg = String(error.message || "");
      if (error.code === "PGRST202" || msg.includes("claim_welcome_package")) {
        gameAlert("서버 DB 업데이트(supabase_v3_2_update.sql 실행) 후 웰컴 상자를 열 수 있습니다!", "⚠️ DB 반영 필요");
      } else {
        gameAlert(`웰컴 상자 개봉 중 오류가 발생했습니다.\n(${msg || "서버 오류"})`);
      }
      return;
    }

    if (data && data.ok) {
      if (typeof data.cd_coins === "number") userState.cdCoins = Math.max(0, data.cd_coins);
      else userState.cdCoins = (Number(userState.cdCoins) || 0) + 1000;
      if (typeof data.arcade_coins === "number") userState.arcadeCoins = Math.max(0, data.arcade_coins);
      else userState.arcadeCoins = (Number(userState.arcadeCoins) || 0) + 2;

      userState.inventory.item_3sec = getConsumableCount("item_3sec") + 1;
      userState.inventory.item_chosung = getConsumableCount("item_chosung") + 1;
      userState.v32WelcomeOpened = true;
      userState.v32WelcomeGranted = true;
      delete userState.inventory.welcome_box;
      userState.newBagItems = (Array.isArray(userState.newBagItems) ? userState.newBagItems : []).filter(id => id !== "welcome_box");
      markBagItemNew("item_3sec");
      markBagItemNew("item_chosung");
      bagSelectedItemId = "item_3sec";

      await syncProfileToServer();
      updateHeaderUserUI();
      renderBagScreen();
      if (typeof window.triggerGameHaptic === "function") window.triggerGameHaptic("success");
      if (typeof playRandomBoxFanfare === "function") playRandomBoxFanfare("burst");
      openModal("welcomeBoxModal");
    } else if (data && data.already_claimed) {
      userState.v32WelcomeOpened = true;
      delete userState.inventory.welcome_box;
      clearBagItemNew("welcome_box", true);
      await syncProfileToServer();
      renderBagScreen();
      gameAlert("이미 웰컴 패키지 보상을 수령하셨습니다!");
    }
  } finally {
    welcomeBoxOpeningInFlight = false;
  }
};

window.useBagTicketItem = function (ticketId) {
  if (!userState.isLoggedIn) {
    gameAlert("변경권 사용은 로그인 후 이용할 수 있습니다!");
    return;
  }
  const cnt = getConsumableCount(ticketId);
  if (cnt <= 0) {
    gameAlert("보유한 변경권이 없습니다. 상점 [🎫 변경권]에서 구매해주세요!");
    return;
  }

  if (ticketId === "nickname_ticket") {
    gamePrompt(
      `🎫 닉네임 변경권 사용 (보유 ${cnt}개 · 확인 시 1개 소모)\n새 닉네임을 입력해주세요 (2~12자):`,
      userState.nickname,
      async newNick => {
        const trimmed = String(newNick || "").trim();
        if (!trimmed || trimmed.length < 2) {
          gameAlert("닉네임은 2글자 이상이어야 합니다.");
          return;
        }
        const nickCheck = validateCleanUserText(trimmed, { fieldLabel: "닉네임" });
        if (!nickCheck.ok) {
          gameAlert(nickCheck.message, "🚫 닉네임 제한");
          return;
        }
        if (trimmed === userState.nickname) {
          gameAlert("현재 닉네임과 동일합니다.");
          return;
        }
        const { data: exist } = await sbClient
          .from("profiles")
          .select("id")
          .eq("nickname", trimmed)
          .maybeSingle();
        if (exist) {
          gameAlert("이미 다른 유저가 사용 중인 닉네임입니다!");
          return;
        }

        const latestCnt = getConsumableCount("nickname_ticket");
        if (latestCnt <= 0) return;
        userState.inventory.nickname_ticket = Math.max(0, latestCnt - 1);
        if (userState.inventory.nickname_ticket <= 0) clearBagItemNew("nickname_ticket", false);
        userState.nickname = trimmed;
        await syncProfileToServer();
        renderBagScreen();
        gameAlert(`✨ 닉네임이 [${trimmed}](으)로 변경되었습니다!`, "🎫 닉네임 변경 완료");
      },
      "🎫 닉네임 변경권 사용"
    );
    return;
  }

  if (ticketId === "gender_ticket") {
    const nextGender = userState.avatarConfig.gender === "female" ? "male" : "female";
    const nextLabel = nextGender === "female" ? "👧 여자 캐릭터" : "👦 남자 캐릭터";
    gameConfirm(
      `⚧️ 성별 변경권 사용 (보유 ${cnt}개 · 확인 시 1개 소모)\n내 기본 캐릭터를 [${nextLabel}]로 변경하시겠습니까?`,
      async () => {
        const latestCnt = getConsumableCount("gender_ticket");
        if (latestCnt <= 0) return;
        userState.inventory.gender_ticket = Math.max(0, latestCnt - 1);
        if (userState.inventory.gender_ticket <= 0) clearBagItemNew("gender_ticket", false);
        userState.avatarConfig.gender = nextGender;
        shopPreviewState.config.gender = nextGender;
        await syncProfileToServer();
        renderBagScreen();
        gameAlert(`✨ 캐릭터 성별이 [${nextLabel}]로 변경되었습니다!`, "⚧️ 성별 변경 완료");
      },
      "⚧️ 성별 변경권 사용"
    );
  }
};

window.toggleEquipBagItem = async function (itemId) {
  if (!userState.equippedItems) userState.equippedItems = [];
  const idx = userState.equippedItems.indexOf(itemId);
  if (idx !== -1) {
    userState.equippedItems.splice(idx, 1);
  } else {
    if (userState.equippedItems.length >= 6) {
      gameAlert("착용 슬롯 6칸이 모두 찼습니다! 기존 아이템을 먼저 해제해주세요.");
      return;
    }
    userState.equippedItems.push(itemId);
  }
  await syncProfileToServer();
  renderBagScreen();
};

window.rechargeBagItemWithAd = function (itemId) {
  const item = typeof getGameItemById === "function" ? getGameItemById(itemId) : null;
  if (!item || !item.adRechargeable) return;
  const noAdMode = typeof isPlayNoAdMode === "function" && isPlayNoAdMode();
  const ds = ensureV2DailyState();
  const used = Number(ds.itemAdCounts[itemId] || 0);
  if (used >= (item.maxAdPerDay || 3)) {
    gameAlert(
      noAdMode
        ? "오늘 이 아이템의 무료 충전 횟수(3회)를 모두 사용했습니다.\n매일 오전 6시에 초기화됩니다."
        : "오늘 이 아이템의 광고 충전 횟수(3회)를 모두 사용했습니다.\n매일 오전 6시에 초기화됩니다."
    );
    return;
  }
  showRewardedAd(`[${item.name}] 1개 무료 충전`, async () => {
    const fresh = ensureV2DailyState();
    fresh.itemAdCounts[itemId] = Number(fresh.itemAdCounts[itemId] || 0) + 1;
    userState.inventory[itemId] = getConsumableCount(itemId) + 1;
    markBagItemNew(itemId);
    await syncProfileToServer();
    renderBagScreen();
    gameAlert(`🎉 [${item.name}] 1개가 가방에 충전되었습니다!`, "🎒 충전 완료");
  });
};

// ============================================================================
// [V2.0] 상점 무료 CD 광고 (일 3회 · 200 CD)
// ============================================================================
window.updateShopFreeCdAdButton = function () {
  const btn = document.getElementById("shopFreeCdAdBtn");
  if (!btn) return;
  const noAdMode = typeof isPlayNoAdMode === "function" && isPlayNoAdMode();
  const ds = ensureV2DailyState();
  const used = Number(ds.shopAdCount || 0);
  const canWatch = used < 3;
  btn.disabled = !canWatch;
  btn.classList.toggle("is-reward-sparkle", canWatch);
  btn.textContent = !canWatch
    ? "✅ 무료CD 완료 (3/3)"
    : noAdMode
    ? `🎁 무료CD +200 (${used}/3)`
    : `📺 무료CD +200 (${used}/3)`;
};

window.claimShopFreeCdAd = function () {
  const noAdMode = typeof isPlayNoAdMode === "function" && isPlayNoAdMode();
  const ds = ensureV2DailyState();
  if (Number(ds.shopAdCount || 0) >= 3) {
    gameAlert("오늘 상점 무료CD 충전(3회)을 모두 완료했습니다!\n매일 오전 6시에 초기화됩니다.");
    return;
  }
  showRewardedAd("상점 무료CD +200 충전", async () => {
    const fresh = ensureV2DailyState();
    fresh.shopAdCount = Number(fresh.shopAdCount || 0) + 1;
    userState.cdCoins += 200;
    await syncProfileToServer();
    updateShopFreeCdAdButton();
    updateShopPreviewCanvas();
    gameAlert("💿 +200 CD가 지급되었습니다!", noAdMode ? "🎁 상점 무료CD 충전" : "📺 상점 무료CD 충전");
  });
};

// ============================================================================
// [V2.0] 홈 일일 CD · 오늘의 랜덤상자 · 28일 출석체크 · 이벤트 팝업
// ============================================================================
function playDingSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.18, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.46);
    });
  } catch (e) {}
}

window.syncHomeV2BadgesUI = function () {
  const ds = ensureV2DailyState();
  const cdDot = document.getElementById("dailyCdNotiDot");
  const boxDot = document.getElementById("dailyBoxNotiDot");
  const attDot = document.getElementById("dailyAttendanceNotiDot");
  if (cdDot) cdDot.classList.toggle("hidden", Boolean(ds.dailyCdClaimed));
  if (boxDot) boxDot.classList.toggle("hidden", Boolean(ds.randomBoxClaimed));
  if (attDot) attDot.classList.toggle("hidden", Boolean(ds.attendanceClaimedToday));
  if (typeof syncAllRewardSparklesUI === "function") syncAllRewardSparklesUI();
};

window.syncAllRewardSparklesUI = function () {
  const ds = ensureV2DailyState();
  const cdBtn = document.getElementById("homeDailyCdBtn");
  const boxBtn = document.getElementById("homeRandomBoxBtn");
  const attBtn = document.getElementById("homeAttendanceBtn");
  if (cdBtn) cdBtn.classList.toggle("is-reward-sparkle", !ds.dailyCdClaimed);
  if (boxBtn) boxBtn.classList.toggle("is-reward-sparkle", !ds.randomBoxClaimed);
  if (attBtn) attBtn.classList.toggle("is-reward-sparkle", !ds.attendanceClaimedToday);

  const quests = Array.isArray(ds.dailyQuests?.items) ? ds.dailyQuests.items : [];
  const claimedCnt = quests.filter(q => q.claimed).length;
  const readyCnt = quests.filter(q => !q.claimed && q.progress >= q.target).length;
  const allDone = quests.length > 0 && claimedCnt >= quests.length;

  const questBtn = document.getElementById("homeDailyQuestBtn");
  const questCountEl = document.getElementById("homeDailyQuestCount");
  if (questCountEl) {
    questCountEl.textContent = allDone ? "완료" : readyCnt > 0 ? "보상!" : `${claimedCnt}/${quests.length}`;
  }
  if (questBtn) {
    questBtn.classList.toggle("is-quest-done", allDone);
    questBtn.classList.toggle("is-reward-sparkle", !allDone && readyCnt > 0);
    questBtn.setAttribute("aria-disabled", allDone ? "true" : "false");
  }

  const hasWelcomeBox = getConsumableCount("welcome_box") > 0;
  const hasNewItems = Array.isArray(userState.newBagItems) && userState.newBagItems.some(id => id === "welcome_box" || getConsumableCount(id) > 0);
  const bagHighlight = Boolean(hasWelcomeBox || hasNewItems);
  const bagBtn = document.getElementById("enterBagBtn");
  const bagBadge = document.getElementById("enterBagNewBadge");
  if (bagBadge) bagBadge.classList.toggle("hidden", !bagHighlight);
  if (bagBtn) bagBtn.classList.toggle("is-reward-sparkle", bagHighlight);
};

window.claimDailyCd = async function () {
  if (!userState.isLoggedIn) {
    gameConfirm("로그인 후 매일 일일 무료CD (+100 CD)를 받을 수 있습니다.", () => showLoginScreen());
    return;
  }
  const ds = ensureV2DailyState();
  if (ds.dailyCdClaimed) {
    gameAlert("오늘의 일일 무료CD (+100 CD)를 이미 받았습니다!\n매일 오전 6시에 초기화됩니다.", "💿 일일 무료CD");
    return;
  }
  ds.dailyCdClaimed = true;
  userState.cdCoins += 100;
  playDingSound();
  await syncProfileToServer();
  syncHomeV2BadgesUI();
  gameAlert("🎉 오늘의 일일 무료CD 보너스 💿 +100 CD가 지급되었습니다!", "💿 일일 무료CD 수령");
};

const randomBoxState = { isOpening: false };

function playRandomBoxFanfare(phase = "burst") {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes =
      phase === "charge"
        ? [
            { f: 440, t: 0, d: 0.08, type: "triangle" },
            { f: 523.25, t: 0.16, d: 0.08, type: "triangle" },
            { f: 659.25, t: 0.32, d: 0.09, type: "triangle" },
            { f: 783.99, t: 0.48, d: 0.1, type: "triangle" }
          ]
        : [
            { f: 523.25, t: 0, d: 0.14, type: "sine" },
            { f: 659.25, t: 0.07, d: 0.14, type: "sine" },
            { f: 783.99, t: 0.14, d: 0.18, type: "sine" },
            { f: 1046.5, t: 0.22, d: 0.48, type: "sine" }
          ];
    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.f, now + n.t);
      gain.gain.setValueAtTime(0.16, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.02);
    });
  } catch (e) {}
}

function spawnRandomBoxParticles(layerEl) {
  if (!layerEl) return;
  const glyphs = ["✨", "🎉", "⭐", "💿", "🌟", "🎊", "💫", "✨", "🎵", "⚡", "✨", "🎉"];
  layerEl.innerHTML = glyphs
    .map((g, idx) => {
      const angle = (idx / glyphs.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const dist = 54 + Math.round(Math.random() * 44);
      const tx = Math.round(Math.cos(angle) * dist);
      const ty = Math.round(Math.sin(angle) * dist - 14);
      const rot = Math.round((Math.random() - 0.5) * 320);
      const dur = 760 + Math.round(Math.random() * 340);
      return `<span class="rb-particle" style="--tx:${tx}px; --ty:${ty}px; --rot:${rot}deg; --dur:${dur}ms;">${g}</span>`;
    })
    .join("");
}

window.openRandomBoxModal = function () {
  if (!userState.isLoggedIn) {
    gameConfirm("로그인 후 오늘의 랜덤상자를 열 수 있습니다.", () => showLoginScreen());
    return;
  }
  randomBoxState.isOpening = false;
  const ds = ensureV2DailyState();
  const btn = document.getElementById("openRandomBoxBtn");
  const resEl = document.getElementById("randomBoxResultText");
  const boxVisual = document.getElementById("randomBoxVisual");
  const burstLayer = document.getElementById("randomBoxBurstLayer");
  const prizePop = document.getElementById("randomBoxPrizePop");

  if (burstLayer) burstLayer.innerHTML = "";
  if (prizePop) {
    prizePop.classList.add("hidden");
    prizePop.textContent = "";
  }
  if (boxVisual) {
    boxVisual.classList.remove("is-opening", "is-opened");
    if (ds.randomBoxClaimed) boxVisual.classList.add("is-opened");
  }
  if (ds.randomBoxClaimed) {
    if (btn) { btn.disabled = true; btn.textContent = "✅ 오늘 수령 완료 (06시 초기화)"; }
    if (resEl) resEl.textContent = "오늘의 선물상자를 이미 열어보셨습니다!";
  } else {
    if (btn) { btn.disabled = false; btn.textContent = "🎁 상자 열어보기!"; }
    if (resEl) resEl.textContent = "반짝이는 선물상자를 터치해 오늘의 행운을 확인하세요!";
  }
  openModal("randomBoxModal");
};

window.claimDailyRandomBox = function () {
  const ds = ensureV2DailyState();
  if (ds.randomBoxClaimed || randomBoxState.isOpening) return;
  randomBoxState.isOpening = true;

  const pool = [
    { label: "💿 +100 CD", type: "cd", amount: 100 },
    { label: "💿 +200 CD", type: "cd", amount: 200 },
    { label: "🪱 지렁이 미끼 +1개", type: "inv", id: "bait_c", amount: 1 },
    { label: "🎧 3초 듣기 +1개", type: "inv", id: "item_3sec", amount: 1 },
    { label: "🔤 초성힌트 +1개", type: "inv", id: "item_chosung", amount: 1 },
    { label: "⏳ 모래시계 +1개", type: "inv", id: "item_hourglass", amount: 1 },
    { label: "💖 하트요정 +1개", type: "inv", id: "item_heart", amount: 1 }
  ];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  ds.randomBoxClaimed = true;
  if (pick.type === "cd") {
    userState.cdCoins += pick.amount;
  } else {
    userState.inventory[pick.id] = getConsumableCount(pick.id) + pick.amount;
    if (pick.id !== "bait_c" && typeof markBagItemNew === "function") markBagItemNew(pick.id);
  }
  syncProfileToServer();
  syncHomeV2BadgesUI();

  const boxVisual = document.getElementById("randomBoxVisual");
  const burstLayer = document.getElementById("randomBoxBurstLayer");
  const prizePop = document.getElementById("randomBoxPrizePop");
  const btn = document.getElementById("openRandomBoxBtn");
  const resEl = document.getElementById("randomBoxResultText");

  if (btn) {
    btn.disabled = true;
    btn.textContent = "🎲 두근두근 개봉 중...";
  }
  if (resEl) {
    resEl.innerHTML = `<strong style="color:#b45309;">✨ 선물상자가 열리고 있어요...!</strong>`;
  }
  if (boxVisual) {
    boxVisual.classList.remove("is-opened");
    boxVisual.classList.add("is-opening");
  }
  playRandomBoxFanfare("charge");

  setTimeout(() => {
    randomBoxState.isOpening = false;
    if (boxVisual) {
      boxVisual.classList.remove("is-opening");
      boxVisual.classList.add("is-opened");
    }
    spawnRandomBoxParticles(burstLayer);
    if (prizePop) {
      prizePop.textContent = `✨ ${pick.label}`;
      prizePop.classList.remove("hidden");
    }
    playRandomBoxFanfare("burst");
    if (typeof window.triggerGameHaptic === "function") window.triggerGameHaptic("medium");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "✅ 오늘 수령 완료!";
    }
    if (resEl) {
      resEl.innerHTML = `<strong style="color:#d97706; font-size:1.04rem;">🎉 축하합니다! [${pick.label}] 획득!</strong>`;
    }
  }, 760);
};

const ATTENDANCE_REWARDS_28 = (() => {
  const arr = [];
  for (let day = 1; day <= 28; day++) {
    if (day === 28) {
      arr.push({ day, ico: "🧚", short: "요정날개 (S+ 한정)", label: "🧚 요정날개(S+)", type: "wing", id: "wing_fairy" });
    } else if (day === 14) {
      arr.push({ day, ico: "⚡", short: "더블어택 +1", label: "⚡ 더블어택 +1", type: "inv", id: "item_double", amount: 1 });
    } else {
      const mod = ((day - 1) % 14) + 1;
      if (mod === 2 || mod === 9) arr.push({ day, ico: "🪱", short: "지렁이미끼+2", label: "🪱 지렁이미끼+2", type: "inv", id: "bait_c", amount: 2 });
      else if (mod === 4) arr.push({ day, ico: "🎧", short: "3초듣기+2", label: "🎧 3초듣기+2", type: "inv", id: "item_3sec", amount: 2 });
      else if (mod === 6) arr.push({ day, ico: "🔤", short: "초성힌트+2", label: "🔤 초성힌트+2", type: "inv", id: "item_chosung", amount: 2 });
      else if (mod === 11) arr.push({ day, ico: "⏳", short: "모래시계+2", label: "⏳ 모래시계+2", type: "inv", id: "item_hourglass", amount: 2 });
      else if (mod === 13) arr.push({ day, ico: "💖", short: "하트요정+2", label: "💖 하트요정+2", type: "inv", id: "item_heart", amount: 2 });
      else if (mod === 7 || mod === 14) arr.push({ day, ico: "💿", short: "+500 CD", label: "💿 +500 CD", type: "cd", amount: 500 });
      else arr.push({ day, ico: "💿", short: "+200 CD", label: "💿 +200 CD", type: "cd", amount: 200 });
    }
  }
  return arr;
})();

window.openAttendanceModal = function () {
  if (!userState.isLoggedIn) {
    gameConfirm("로그인 후 출석체크 보상을 받을 수 있습니다.", () => showLoginScreen());
    return;
  }
  renderAttendanceBoard();
  openModal("attendanceModal");
};

function renderAttendanceBoard() {
  const ds = ensureV2DailyState();
  const streak = Math.max(0, Math.min(28, Number(ds.attendanceStreak) || 0));
  const claimedToday = Boolean(ds.attendanceClaimedToday);
  const nextDay = claimedToday ? streak : streak + 1;

  const summaryEl = document.getElementById("attendanceStreakSummary");
  const fillEl = document.getElementById("attendanceProgressFill");
  if (summaryEl) {
    summaryEl.textContent = `✨ 연속 출석: ${streak} / 28일 (${Math.round((streak / 28) * 100)}%)`;
  }
  if (fillEl) {
    fillEl.style.width = `${Math.min(100, Math.max(0, (streak / 28) * 100)).toFixed(1)}%`;
  }

  const grid = document.getElementById("attendanceBoardGrid");
  if (grid) {
    grid.innerHTML = ATTENDANCE_REWARDS_28.map(r => {
      const isDone = r.day <= streak;
      const isTodayTarget = !claimedToday && r.day === nextDay;
      const is14 = r.day === 14;
      const is28 = r.day === 28;
      const isWeekly = r.day === 7 || r.day === 21;
      const spanCls = is28 ? "span-12" : is14 || isWeekly ? "span-6" : r.day >= 22 ? "span-4" : "span-3";
      const tierCls = is28 ? "is-special-28" : is14 ? "is-special-14" : isWeekly ? "is-weekly" : "";

      if (is28) {
        return `
          <div class="att-day-cell ${spanCls} ${tierCls} ${isDone ? "is-done" : ""} ${isTodayTarget ? "is-today" : ""}">
            <div style="display:flex; align-items:center; gap:10px; min-width:0;">
              <div class="att-day-ico">${r.ico}</div>
              <div>
                <div style="display:flex; align-items:center; gap:5px; margin-bottom:2px;">
                  <span class="att-day-tag is-28-tag">👑 28일 완주 전설 한정</span>
                  ${isTodayTarget ? `<span class="att-day-tag is-today-tag">오늘!</span>` : ""}
                </div>
                <div class="att-day-reward">Day 28 · ${r.short}</div>
              </div>
            </div>
            ${isDone ? `<span class="att-done-mark">완료 ✔</span>` : `<span style="font-size:0.72rem; font-weight:900; color:#9d174d;">FINAL</span>`}
          </div>
        `;
      }

      const tagHtml = isTodayTarget
        ? `<span class="att-day-tag is-today-tag">오늘!</span>`
        : is14
        ? `<span class="att-day-tag is-14-tag">⚡ 14일 특전</span>`
        : isWeekly
        ? `<span class="att-day-tag" style="background:#f59e0b; color:#fff;">보너스</span>`
        : "";

      return `
        <div class="att-day-cell ${spanCls} ${tierCls} ${isDone ? "is-done" : ""} ${isTodayTarget ? "is-today" : ""}">
          ${tagHtml}
          <div class="att-day-num">Day ${r.day}</div>
          <div class="att-day-ico">${r.ico}</div>
          <div class="att-day-reward">${r.short}</div>
          ${isDone ? `<span class="att-done-mark">✔</span>` : ""}
        </div>
      `;
    }).join("");
  }

  const btn = document.getElementById("claimAttendanceBtn");
  if (btn) {
    btn.disabled = claimedToday;
    btn.textContent = claimedToday ? "✅ 오늘 출석 완료 (내일 06시 초기화)" : `📅 Day ${nextDay} 출석 보상 받기!`;
  }
}

window.claimAttendanceDay = async function () {
  const ds = ensureV2DailyState();
  if (ds.attendanceClaimedToday) return;
  const nextDay = Math.min(28, (Number(ds.attendanceStreak) || 0) + 1);
  const reward = ATTENDANCE_REWARDS_28[nextDay - 1];
  if (!reward) return;

  ds.attendanceStreak = nextDay;
  ds.attendanceClaimedToday = true;

  if (reward.type === "cd") {
    userState.cdCoins += reward.amount;
  } else if (reward.type === "inv") {
    userState.inventory[reward.id] = getConsumableCount(reward.id) + reward.amount;
    if (reward.id !== "bait_c" && typeof markBagItemNew === "function") markBagItemNew(reward.id);
  } else if (reward.type === "wing") {
    if (!userState.ownedItems.includes(reward.id)) userState.ownedItems.push(reward.id);
    userState.avatarConfig.wing = reward.id;
  }

  if (nextDay === 14 || nextDay === 28) {
    playRandomBoxFanfare("burst");
    if (typeof window.triggerGameHaptic === "function") window.triggerGameHaptic("medium");
  } else {
    playDingSound();
  }
  await syncProfileToServer();
  renderAttendanceBoard();
  syncHomeV2BadgesUI();
  gameAlert(`🎉 Day ${nextDay} 출석 완료!\n[${reward.label}] 보상이 지급되었습니다!`, "📅 출석체크 완료");
};

// ============================================================================
// [V2.0] 이벤트 팝업 (최대 5개 현수막 배너 크기 + 백엔드 연동)
// ============================================================================
const DEFAULT_FALLBACK_EVENTS = [
  {
    id: 1,
    title: "제보하고 보상받자!",
    content:
      "제보만해도 보상해드립니다! 이용해주셔서 감사합니다.\n이용하시다가 음악이나 가사, 1초 듣기 등에 오류가 있거나 잘못되어 있는 부분을 '관리자'에게 1:1 DM으로 제보(신고)해주시면 내용 반영 후 건마다 1,000CD 드리겠습니다!",
    banner_url: "",
    is_published: true
  }
];
let cachedPublishedEvents = [...DEFAULT_FALLBACK_EVENTS];
let selectedEventIndex = 0;

window.openEventModal = async function () {
  openModal("eventModal");
  const bannersEl = document.getElementById("eventBannersList");
  if (bannersEl) bannersEl.innerHTML = `<div style="text-align:center; padding:14px; font-size:0.82rem; color:var(--text-sub);">이벤트 불러오는 중...</div>`;

  if (sbClient) {
    try {
      const { data, error } = await sbClient
        .from("events")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true })
        .limit(5);
      if (!error && Array.isArray(data) && data.length > 0) {
        cachedPublishedEvents = data.map(ev => {
          if (ev && /제보|신고/.test(ev.title || "") && !String(ev.content || "").trim()) {
            return { ...ev, content: DEFAULT_FALLBACK_EVENTS[0].content };
          }
          return ev;
        });
      } else {
        cachedPublishedEvents = [...DEFAULT_FALLBACK_EVENTS];
      }
    } catch (e) {
      cachedPublishedEvents = [...DEFAULT_FALLBACK_EVENTS];
    }
  }

  selectedEventIndex = 0;
  renderEventModalContent();
};

window.selectEventBanner = function (idx) {
  selectedEventIndex = idx;
  renderEventModalContent();
};

function renderEventModalContent() {
  const bannersEl = document.getElementById("eventBannersList");
  const titleEl = document.getElementById("eventDetailTitle");
  const bodyEl = document.getElementById("eventDetailBody");
  if (!bannersEl || !titleEl || !bodyEl) return;

  if (!cachedPublishedEvents || cachedPublishedEvents.length === 0) {
    bannersEl.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-sub); font-size:0.84rem;">현재 진행 중인 이벤트가 없습니다.</div>`;
    titleEl.textContent = "진행 중인 이벤트 없음";
    bodyEl.textContent = "새로운 이벤트가 등록되면 이곳에서 확인하실 수 있습니다.";
    return;
  }

  bannersEl.innerHTML = cachedPublishedEvents
    .slice(0, 5)
    .map((ev, idx) => {
      const active = idx === selectedEventIndex;
      const safeBannerUrl = String(ev.banner_url || "").replace(/'/g, "%27");
      const bgStyle = safeBannerUrl
        ? `background-image:linear-gradient(90deg, rgba(15,23,42,0.72), rgba(15,23,42,0.35)), url('${safeBannerUrl}'); background-size:cover; background-position:center; color:#ffffff;`
        : "";
      return `
        <button type="button" class="event-banner-pill ${active ? "active" : ""}" style="${bgStyle}" onclick="selectEventBanner(${idx})">
          <span class="event-banner-badge">EVENT ${idx + 1}</span>
          <span class="event-banner-title">${escapeOnlineHtml(ev.title || "이벤트")}</span>
        </button>
      `;
    })
    .join("");

  const cur = cachedPublishedEvents[selectedEventIndex] || cachedPublishedEvents[0];
  titleEl.textContent = cur.title || "이벤트";
  bodyEl.innerHTML = escapeOnlineHtml(cur.content || "").replace(/\n/g, "<br/>");
}

// ============================================================================
// [V2.1] 글로벌 실시간 유저 접속 상태 · 낚시 잠수(하늘색) · 세부 활동 · 포그라운드 헬스체크
// ============================================================================
const FISHING_ONLINE_AFK_MAX_MS = 6 * 60 * 60 * 1000;

const globalOnlineState = {
  channel: null,
  usersMap: new Map(),
  fishingBgMap: new Map(),
  friendStatusMap: new Map(),
  reconnectTimer: null,
  pollTimer: null,
  bgTickCounter: 0,
  lastActivitySignature: "",
  lastBgSyncAt: 0,
  bgSyncInFlight: false
};

const SCREEN_ACTIVITY_LABELS = {
  homeScreen: "🏠 홈 대기",
  playHubScreen: "🎮 모드 선택",
  outingHubScreen: "🏘️ 놀러가기",
  arcadeScreen: "🕹️ 오락실 대기",
  arcadePlayScreen: "🕹️ 오락실 플레이중",
  quizPlazaScreen: "🎪 퀴즈광장 대기",
  quizPlazaPlayScreen: "🎪 퀴즈광장 플레이중",
  shopHubScreen: "🛍️ 상점 선택",
  setupScreen: "⚙️ 게임 설정",
  gameScreen: "🎵 퀴즈 도전중",
  judgeScreen: "🎵 퀴즈 도전중",
  resultScreen: "🏆 결과 확인",
  plazaScreen: "🏟️ 멀티 대기실",
  battleRoomScreen: "⚔️ 대전 대기방",
  battlePlayScreen: "⚔️ 실시간 대전중",
  fishingScreen: "🎣 낚시중",
  shopScreen: "👗 상점",
  bagScreen: "🎒 가방",
  rankingScreen: "🏆 랭킹",
  socialScreen: "💬 친구목록",
  dmChatScreen: "💬 1:1 대화"
};

function isSelfCurrentlyFishingBg() {
  return Boolean(
    typeof state !== "undefined" &&
      state.currentScreen === "fishingScreen" &&
      (document.hidden ||
        Boolean(window.__onestorePaused) ||
        (typeof userState !== "undefined" &&
          userState.fishingLive &&
          userState.fishingLive.active &&
          userState.fishingLive.mode === "bg"))
  );
}

function getGlobalOnlineActivityLabel(screenId) {
  if (screenId === "fishingScreen") {
    if (isSelfCurrentlyFishingBg()) return "💤 낚시 잠수중";
    if (typeof isManualFishingOverlayOpen === "function" && isManualFishingOverlayOpen()) return "🎣 손낚시중";
    return "🎣 낚시중";
  }
  const room = typeof plazaState !== "undefined" ? plazaState.currentRoom : null;
  if (screenId === "battleRoomScreen") {
    if (room && room.room_type === "1v1") return "⚔️ 1:1 대기중";
    if (room && room.room_type === "4p") return "⚔️ 4인 대기중";
    return "⚔️ 대전 대기방";
  }
  if (screenId === "battlePlayScreen") {
    if (room && room.status === "finished") {
      if (room.room_type === "1v1") return "🏁 1:1 결과";
      if (room.room_type === "4p") return "🏁 4인 결과";
      return "🏁 대결 결과";
    }
    if (room && room.room_type === "1v1") return "⚔️ 1:1 경기중";
    if (room && room.room_type === "4p") return "⚔️ 4인 경기중";
    return "⚔️ 실시간 대전중";
  }
  return SCREEN_ACTIVITY_LABELS[screenId] || "🎵 접속중";
}

function buildGlobalPresencePayload(screenIdOverride = null) {
  const scr = screenIdOverride || (typeof state !== "undefined" ? state.currentScreen : "homeScreen");
  const isFishingBg = scr === "fishingScreen" && isSelfCurrentlyFishingBg();
  return {
    userId: userState.id,
    nickname: userState.nickname || "도전자",
    avatarConfig:
      typeof sanitizeAvatarConfigShape === "function"
        ? sanitizeAvatarConfigShape(userState.avatarConfig)
        : userState.avatarConfig,
    exp: Number(userState.exp) || 0,
    screen: scr,
    activity: getGlobalOnlineActivityLabel(scr),
    isFishingBg,
    joinedAt: Date.now()
  };
}

function buildFishingBgSignature(map) {
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([uid, v]) => `${uid}:${v.nickname || ""}:${Math.floor((Number(v.exp) || 0) / 100)}`)
    .join("|");
}

function parseFishingBgEntryFromProfileRow(row, nowTs = Date.now()) {
  if (!row || !row.id) return null;
  const uid = String(row.id);
  const cfg = row.avatar_config || {};
  const live = cfg._fishingLive;
  const hbAge = live ? nowTs - (Number(live.heartbeatAt) || 0) : Infinity;
  const isValidBg =
    Boolean(live && live.active && live.mode === "bg") && hbAge >= -60000 && hbAge <= FISHING_ONLINE_AFK_MAX_MS;
  if (!isValidBg) return null;
  return {
    userId: uid,
    nickname: row.nickname || "도전자",
    avatarConfig:
      typeof sanitizeAvatarConfigShape === "function"
        ? sanitizeAvatarConfigShape(cfg)
        : cfg,
    exp: Number(cfg._exp) || 0,
    screen: "fishingScreen",
    activity: "💤 낚시 잠수중",
    isFishingBg: true,
    heartbeatAt: Number(live.heartbeatAt) || nowTs
  };
}

window.syncSingleProfileFishingBgEntry = function (row, nowTs = Date.now()) {
  if (!row || !row.id) return;
  const uid = String(row.id);
  const entry = parseFishingBgEntryFromProfileRow(row, nowTs);
  if (entry) {
    globalOnlineState.fishingBgMap.set(uid, entry);
  } else {
    globalOnlineState.fishingBgMap.delete(uid);
  }
};

window.refreshFishingBgRosterForPresence = async function (force = false) {
  if (!sbClient || !userState.isLoggedIn || !userState.id) return;
  const now = Date.now();
  if (!force && (globalOnlineState.bgSyncInFlight || now - globalOnlineState.lastBgSyncAt < 3500)) return;
  if (globalOnlineState.bgSyncInFlight) return;

  globalOnlineState.bgSyncInFlight = true;
  globalOnlineState.lastBgSyncAt = now;
  try {
    const { data: rows, error } = await sbClient
      .from("profiles")
      .select("id, nickname, avatar_config")
      .neq("nickname", "__ADMIN_CONFIG__")
      .order("updated_at", { ascending: false })
      .limit(250);
    if (error || !Array.isArray(rows)) return;

    const myUid = String(userState.id);
    const nextMap = new Map();
    const checkNow = Date.now();
    rows.forEach(r => {
      if (!r || !r.id || String(r.id) === myUid) return;
      const entry = parseFishingBgEntryFromProfileRow(r, checkNow);
      if (entry) nextMap.set(entry.userId, entry);
    });

    const prevSig = buildFishingBgSignature(globalOnlineState.fishingBgMap);
    const nextSig = buildFishingBgSignature(nextMap);
    globalOnlineState.fishingBgMap = nextMap;
    if (prevSig !== nextSig || force) {
      syncAllOnlinePresenceUIs();
    }
  } catch (e) {
  } finally {
    globalOnlineState.bgSyncInFlight = false;
  }
};

window.getUserPresenceState = function (targetUserId) {
  if (!targetUserId) {
    return { status: "offline", activity: "오프라인", isOnline: false, isFishingAfk: false, user: null };
  }
  const uid = String(targetUserId);

  if (userState.isLoggedIn && userState.id && uid === String(userState.id)) {
    const me = buildGlobalPresencePayload();
    if (me.isFishingBg) {
      return { status: "fishing_afk", activity: "💤 낚시 잠수중", isOnline: false, isFishingAfk: true, user: me };
    }
    return { status: "online", activity: me.activity, isOnline: true, isFishingAfk: false, user: me };
  }

  const liveUser = globalOnlineState.usersMap.get(uid);
  if (liveUser) {
    if (liveUser.isFishingBg) {
      return {
        status: "fishing_afk",
        activity: "💤 낚시 잠수중",
        isOnline: false,
        isFishingAfk: true,
        user: liveUser
      };
    }
    return {
      status: "online",
      activity: liveUser.activity || getGlobalOnlineActivityLabel(liveUser.screen),
      isOnline: true,
      isFishingAfk: false,
      user: liveUser
    };
  }

  const bgUser = globalOnlineState.fishingBgMap.get(uid);
  if (bgUser) {
    const hbAge = Date.now() - (Number(bgUser.heartbeatAt) || 0);
    if (hbAge <= FISHING_ONLINE_AFK_MAX_MS) {
      return {
        status: "fishing_afk",
        activity: "💤 낚시 잠수중",
        isOnline: false,
        isFishingAfk: true,
        user: bgUser
      };
    }
    globalOnlineState.fishingBgMap.delete(uid);
  }

  return { status: "offline", activity: "오프라인", isOnline: false, isFishingAfk: false, user: null };
};

window.isUserOnlineGlobally = function (targetUserId) {
  return window.getUserPresenceState(targetUserId).status !== "offline";
};

function getOnlineUsersSummary() {
  const merged = new Map();
  const now = Date.now();

  globalOnlineState.fishingBgMap.forEach((u, uid) => {
    if (!u || !u.userId || isUserBlocked(u.userId, u.nickname)) return;
    if (now - (Number(u.heartbeatAt) || 0) > FISHING_ONLINE_AFK_MAX_MS) return;
    merged.set(String(uid), {
      ...u,
      userId: String(uid),
      _presence: { status: "fishing_afk", activity: "💤 낚시 잠수중", isOnline: false, isFishingAfk: true }
    });
  });

  globalOnlineState.usersMap.forEach((u, uid) => {
    if (!u || !u.userId || isUserBlocked(u.userId, u.nickname)) return;
    const isAfk = Boolean(u.isFishingBg);
    const activity = isAfk ? "💤 낚시 잠수중" : u.activity || getGlobalOnlineActivityLabel(u.screen);
    merged.set(String(uid), {
      ...u,
      userId: String(uid),
      activity,
      _presence: {
        status: isAfk ? "fishing_afk" : "online",
        activity,
        isOnline: !isAfk,
        isFishingAfk: isAfk
      }
    });
  });

  if (userState.isLoggedIn && userState.id) {
    const myUid = String(userState.id);
    const me = buildGlobalPresencePayload();
    const isAfk = Boolean(me.isFishingBg);
    merged.set(myUid, {
      ...me,
      userId: myUid,
      _presence: {
        status: isAfk ? "fishing_afk" : "online",
        activity: me.activity,
        isOnline: !isAfk,
        isFishingAfk: isAfk
      }
    });
  }

  const list = Array.from(merged.values());
  let liveCount = 0;
  let afkCount = 0;
  list.forEach(u => {
    if (u._presence.status === "fishing_afk") afkCount += 1;
    else liveCount += 1;
  });

  list.sort((a, b) => {
    const aMe = userState.id && String(a.userId) === String(userState.id) ? 1 : 0;
    const bMe = userState.id && String(b.userId) === String(userState.id) ? 1 : 0;
    if (aMe !== bMe) return bMe - aMe;
    const aAfk = a._presence.status === "fishing_afk" ? 1 : 0;
    const bAfk = b._presence.status === "fishing_afk" ? 1 : 0;
    if (aAfk !== bAfk) return aAfk - bAfk;
    const aFriend = globalOnlineState.friendStatusMap.get(String(a.userId)) === "accepted" ? 1 : 0;
    const bFriend = globalOnlineState.friendStatusMap.get(String(b.userId)) === "accepted" ? 1 : 0;
    if (aFriend !== bFriend) return bFriend - aFriend;
    return (Number(b.exp) || 0) - (Number(a.exp) || 0);
  });

  return { list, totalCount: list.length, liveCount, afkCount };
}

window.syncHomeOnlineUsersBtn = function () {
  const btn = document.getElementById("homeOnlineUsersBtn");
  const cntEl = document.getElementById("homeOnlineUsersCount");
  if (!btn && !cntEl) return;
  const summary = getOnlineUsersSummary();
  if (cntEl) cntEl.textContent = String(summary.totalCount);
  if (btn) {
    btn.title = `실시간 접속 · 낚시 잠수 (총 ${summary.totalCount}명 · 접속 ${summary.liveCount} · 잠수 ${summary.afkCount})`;
  }
};

window.syncFriendOnlineIndicators = function () {
  document.querySelectorAll("[data-online-uid]").forEach(dot => {
    const uid = dot.getAttribute("data-online-uid");
    const pres = window.getUserPresenceState(uid);
    dot.classList.toggle("is-online", pres.status === "online");
    dot.classList.toggle("is-fishing-afk", pres.status === "fishing_afk");
    dot.title = pres.activity;
  });
  document.querySelectorAll("[data-online-pill-uid]").forEach(pill => {
    const uid = pill.getAttribute("data-online-pill-uid");
    const pres = window.getUserPresenceState(uid);
    pill.classList.toggle("hidden", pres.status === "offline");
    pill.classList.toggle("is-fishing-afk", pres.status === "fishing_afk");
    if (pres.status !== "offline") {
      pill.textContent = pres.activity;
    }
  });
};

function syncAllOnlinePresenceUIs() {
  syncHomeOnlineUsersBtn();
  syncFriendOnlineIndicators();
  const modal = document.getElementById("onlineUsersModal");
  if (modal && !modal.classList.contains("hidden")) {
    renderOnlineUsersModalList();
  }
}

function startGlobalOnlineRefreshLoop() {
  if (globalOnlineState.pollTimer) {
    clearInterval(globalOnlineState.pollTimer);
    globalOnlineState.pollTimer = null;
  }
  globalOnlineState.bgTickCounter = 0;
  globalOnlineState.pollTimer = setInterval(() => {
    if (!userState.isLoggedIn || !userState.id || document.hidden || window.__onestorePaused) return;
    globalOnlineState.bgTickCounter += 1;
    const modal = document.getElementById("onlineUsersModal");
    const isModalOpen = Boolean(modal && !modal.classList.contains("hidden"));
    const isSocialOpen = typeof state !== "undefined" && state.currentScreen === "socialScreen";
    const isHomeOpen = typeof state !== "undefined" && state.currentScreen === "homeScreen";
    if (isModalOpen || isSocialOpen) {
      refreshFishingBgRosterForPresence(false);
    } else if (isHomeOpen && globalOnlineState.bgTickCounter % 5 === 0) {
      refreshFishingBgRosterForPresence(false);
    }
  }, 5000);
}

function scheduleGlobalOnlineReconnect() {
  if (!sbClient || !userState.isLoggedIn || !userState.id || document.hidden || window.__onestorePaused) return;
  if (globalOnlineState.reconnectTimer) return;
  globalOnlineState.reconnectTimer = setTimeout(() => {
    globalOnlineState.reconnectTimer = null;
    if (!sbClient || !userState.isLoggedIn || !userState.id || document.hidden || window.__onestorePaused) return;
    try {
      if (sbClient.realtime && !sbClient.realtime.isConnected()) {
        sbClient.realtime.connect();
      }
    } catch (e) {}
    if (globalOnlineState.channel) {
      try {
        sbClient.removeChannel(globalOnlineState.channel);
      } catch (e) {}
      globalOnlineState.channel = null;
    }
    window.startGlobalOnlinePresence();
  }, 1500);
}

window.ensureGlobalOnlinePresenceHealthy = function (refreshBg = false) {
  if (!sbClient || !userState.isLoggedIn || !userState.id) return;
  try {
    if (sbClient.realtime && !sbClient.realtime.isConnected()) {
      sbClient.realtime.connect();
    }
  } catch (e) {}

  const st = globalOnlineState.channel && globalOnlineState.channel.state;
  if (!globalOnlineState.channel || st !== "joined") {
    if (globalOnlineState.channel) {
      try {
        sbClient.removeChannel(globalOnlineState.channel);
      } catch (e) {}
      globalOnlineState.channel = null;
    }
    window.startGlobalOnlinePresence();
  } else {
    window.syncGlobalOnlineActivity(null, true);
  }

  if (refreshBg) {
    window.refreshFishingBgRosterForPresence(true);
  }
};

window.startGlobalOnlinePresence = function () {
  if (!sbClient || !userState.isLoggedIn || !userState.id) return;
  if (globalOnlineState.channel && globalOnlineState.channel.state === "joined") {
    syncGlobalOnlineActivity(null, true);
    return;
  }
  if (globalOnlineState.channel) {
    try {
      sbClient.removeChannel(globalOnlineState.channel);
    } catch (e) {}
    globalOnlineState.channel = null;
  }

  const myUid = String(userState.id);
  const myPayload = buildGlobalPresencePayload();
  globalOnlineState.usersMap.set(myUid, myPayload);
  globalOnlineState.lastActivitySignature = `${myPayload.screen}|${myPayload.activity}|${myPayload.isFishingBg ? 1 : 0}`;
  syncAllOnlinePresenceUIs();
  startGlobalOnlineRefreshLoop();
  refreshFishingBgRosterForPresence(false);

  const ch = sbClient.channel("music_king_global_online", {
    config: { presence: { key: myUid } }
  });
  globalOnlineState.channel = ch;

  const rebuildUsersMap = () => {
    const pState = ch.presenceState() || {};
    const nextMap = new Map();
    Object.entries(pState).forEach(([k, entries]) => {
      if (!Array.isArray(entries) || entries.length === 0) return;
      const latest = entries[entries.length - 1];
      if (!latest) return;
      const uid = String(latest.userId || k);
      nextMap.set(uid, { ...latest, userId: uid });
    });
    if (userState.isLoggedIn && userState.id && !nextMap.has(String(userState.id))) {
      nextMap.set(String(userState.id), buildGlobalPresencePayload());
    }
    globalOnlineState.usersMap = nextMap;
    syncAllOnlinePresenceUIs();
  };

  ch.on("presence", { event: "sync" }, rebuildUsersMap)
    .on("presence", { event: "join" }, rebuildUsersMap)
    .on("presence", { event: "leave" }, rebuildUsersMap)
    .on("broadcast", { event: "battle_invite" }, ({ payload }) => {
      if (typeof handleIncomingBattleInvite === "function") handleIncomingBattleInvite(payload);
    })
    .on("broadcast", { event: "battle_invite_reply" }, ({ payload }) => {
      if (typeof handleIncomingBattleInviteReply === "function") handleIncomingBattleInviteReply(payload);
    })
    .on("broadcast", { event: "battle_direct_room_ready" }, ({ payload }) => {
      if (typeof handleIncomingDirectRoomReady === "function") handleIncomingDirectRoomReady(payload);
    })
    .subscribe(async status => {
      if (status === "SUBSCRIBED") {
        try {
          await ch.track(buildGlobalPresencePayload());
        } catch (e) {}
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        scheduleGlobalOnlineReconnect();
      }
    });
};

window.syncGlobalOnlineActivity = async function (screenId = null, forceTrack = false) {
  if (!userState.isLoggedIn || !userState.id) return;
  const scr = screenId || (typeof state !== "undefined" ? state.currentScreen : "homeScreen");
  if (scr === "loginScreen") return;
  const payload = buildGlobalPresencePayload(scr);
  const sig = `${payload.screen}|${payload.activity}|${payload.isFishingBg ? 1 : 0}`;
  const changed = sig !== globalOnlineState.lastActivitySignature;
  globalOnlineState.lastActivitySignature = sig;
  globalOnlineState.usersMap.set(String(userState.id), payload);
  syncAllOnlinePresenceUIs();
  if (globalOnlineState.channel && (changed || forceTrack)) {
    try {
      await globalOnlineState.channel.track(payload);
    } catch (e) {}
  }
};

window.stopGlobalOnlinePresence = function () {
  if (globalOnlineState.reconnectTimer) {
    clearTimeout(globalOnlineState.reconnectTimer);
    globalOnlineState.reconnectTimer = null;
  }
  if (globalOnlineState.pollTimer) {
    clearInterval(globalOnlineState.pollTimer);
    globalOnlineState.pollTimer = null;
  }
  const ch = globalOnlineState.channel;
  globalOnlineState.channel = null;
  globalOnlineState.usersMap.clear();
  globalOnlineState.fishingBgMap.clear();
  globalOnlineState.friendStatusMap.clear();
  globalOnlineState.lastActivitySignature = "";
  if (ch) {
    try { ch.untrack(); } catch (e) {}
    if (sbClient) {
      try { sbClient.removeChannel(ch); } catch (e) {}
    }
  }
  syncAllOnlinePresenceUIs();
};

window.refreshOnlineUsersFriendships = async function () {
  if (!sbClient || !userState.isLoggedIn || !userState.id) return;
  try {
    const { data: rels } = await sbClient
      .from("friendships")
      .select("requester_id, receiver_id, status")
      .or(`requester_id.eq.${userState.id},receiver_id.eq.${userState.id}`);
    globalOnlineState.friendStatusMap.clear();
    (rels || []).forEach(r => {
      const otherId = r.requester_id === userState.id ? r.receiver_id : r.requester_id;
      if (otherId) globalOnlineState.friendStatusMap.set(String(otherId), r.status);
    });
  } catch (e) {}
};

// ============================================================================
// [V3.2] 참여형 일일 퀘스트 · 1:1 결과 공유 · 스포트라이트 튜토리얼
// ============================================================================
let dailyQuestClaimInFlight = false;

window.recordDailyQuestProgress = function (kind, payload = 1) {
  if (typeof userState === "undefined" || !userState.isLoggedIn) return;
  const ds = ensureV2DailyState();
  const items = ds.dailyQuests && Array.isArray(ds.dailyQuests.items) ? ds.dailyQuests.items : [];
  let changed = false;

  items.forEach(q => {
    if (!q || q.claimed || q.progress >= q.target) return;
    if (kind === "quiz" && q.type === "quiz") {
      q.progress = Math.min(q.target, (Number(q.progress) || 0) + Math.max(1, Number(payload) || 1));
      changed = true;
    } else if (kind === "fishing_sec" && q.type === "fishing") {
      const addSec = Math.max(0, Number(payload) || 0);
      if (addSec <= 0) return;
      q.secAccum = (Number(q.secAccum) || 0) + addSec;
      const newMin = Math.min(q.target, Math.floor(q.secAccum / 60));
      if (newMin > (Number(q.progress) || 0)) {
        q.progress = newMin;
        changed = true;
      }
    } else if (kind === "arcade" && q.type === "arcade") {
      const playedGameId = String(payload || "");
      if (q.gameId === "any" || (playedGameId && q.gameId === playedGameId)) {
        q.progress = Math.min(q.target, (Number(q.progress) || 0) + 1);
        changed = true;
      }
    }
  });

  if (changed) {
    syncAllRewardSparklesUI();
    syncProfileToServer();
    const modal = document.getElementById("dailyQuestModal");
    if (modal && !modal.classList.contains("hidden")) {
      renderDailyQuestModal();
    }
  }
};

window.openDailyQuestModal = function () {
  if (!userState.isLoggedIn) {
    gameConfirm("일일 퀘스트는 로그인 후 참여할 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }
  const ds = ensureV2DailyState();
  const items = Array.isArray(ds.dailyQuests?.items) ? ds.dailyQuests.items : [];
  if (items.length > 0 && items.every(q => q.claimed)) {
    gameAlert(
      "오늘의 일일 퀘스트를 모두 완료했습니다!\n내일 오전 6시 초기화 후 다시 도전해보세요!",
      "📋 오늘 일퀘 완료"
    );
    return;
  }
  renderDailyQuestModal();
  openModal("dailyQuestModal");
};

window.renderDailyQuestModal = function () {
  const listEl = document.getElementById("dailyQuestList");
  const sumEl = document.getElementById("dailyQuestModalSummary");
  if (!listEl) return;

  const ds = ensureV2DailyState();
  const items = Array.isArray(ds.dailyQuests?.items) ? ds.dailyQuests.items : [];
  const claimedCnt = items.filter(q => q.claimed).length;
  if (sumEl) sumEl.textContent = `${claimedCnt} / ${items.length} 완료`;

  listEl.innerHTML = items
    .map((q, idx) => {
      const pct = Math.min(100, Math.round(((Number(q.progress) || 0) / Math.max(1, q.target)) * 100));
      const isComplete = (Number(q.progress) || 0) >= q.target;
      const isClaimed = Boolean(q.claimed);
      const cardCls = isClaimed ? "is-claimed" : isComplete ? "is-ready" : "";
      let progressLabel = `${q.progress} / ${q.target}${q.unit || ""}`;
      if (q.type === "fishing" && !isComplete) {
        const remMin = Math.max(0, (q.target * 60 - (Number(q.secAccum) || 0)));
        const rm = Math.floor(remMin / 60);
        const rs = Math.floor(remMin % 60);
        progressLabel = `${q.progress}/${q.target}분 (${rm}:${String(rs).padStart(2, "0")} 남음)`;
      }

      const btnHtml = isClaimed
        ? `<button type="button" class="btn" disabled style="padding:6px 10px; font-size:0.75rem;">✅ 수령완료</button>`
        : isComplete
        ? `<button type="button" class="btn btn-gold is-reward-sparkle" onclick="claimDailyQuestReward(${idx})" style="padding:6px 11px; font-size:0.76rem;">🎁 받기</button>`
        : `<button type="button" class="btn" disabled style="padding:6px 10px; font-size:0.74rem;">진행중</button>`;

      return `
        <div class="daily-quest-card ${cardCls}">
          <div class="dq-top-row">
            <span class="dq-title">${escapeOnlineHtml(q.label)}</span>
            <span class="dq-reward-pill">${escapeOnlineHtml(q.reward?.label || "보상")}</span>
          </div>
          <div class="dq-bottom-row">
            <div class="dq-progress-track">
              <div class="dq-progress-fill" style="width:${pct}%;"></div>
            </div>
            <span class="dq-progress-text">${escapeOnlineHtml(progressLabel)}</span>
            ${btnHtml}
          </div>
        </div>
      `;
    })
    .join("");
};

window.claimDailyQuestReward = async function (idx) {
  if (dailyQuestClaimInFlight) return;
  if (!userState.isLoggedIn || !sbClient) return;
  const ds = ensureV2DailyState();
  const items = Array.isArray(ds.dailyQuests?.items) ? ds.dailyQuests.items : [];
  const q = items[idx];
  if (!q || q.claimed || q.progress < q.target) return;

  dailyQuestClaimInFlight = true;
  try {
    const { data, error } = await sbClient.rpc("claim_daily_quest_reward", {
      p_day_key: ds.kstDate,
      p_quest_idx: idx,
      p_reward_type: q.reward?.type || "cd",
      p_reward_amount: Number(q.reward?.amount) || 100
    });
    if (error) {
      const msg = String(error.message || "");
      if (error.code === "PGRST202" || msg.includes("claim_daily_quest_reward")) {
        gameAlert("서버 DB 업데이트(supabase_v3_2_update.sql 실행) 후 일일 퀘스트 보상을 수령할 수 있습니다!", "⚠️ DB 반영 필요");
      } else {
        gameAlert(`일일 퀘스트 보상 수령 중 오류가 발생했습니다.\n(${msg || "서버 오류"})`);
      }
      return;
    }

    if (data && data.ok) {
      if (typeof data.cd_coins === "number") userState.cdCoins = Math.max(0, data.cd_coins);
      if (typeof data.arcade_coins === "number") userState.arcadeCoins = Math.max(0, data.arcade_coins);
      if (typeof data.golden_coins === "number") userState.goldenCoins = Math.max(0, data.golden_coins);
      if (typeof data.exp === "number") userState.exp = Math.max(0, data.exp);
      q.claimed = true;

      if (typeof playDingSound === "function") playDingSound();
      await syncProfileToServer();
      updateHeaderUserUI();
      syncAllRewardSparklesUI();
      renderDailyQuestModal();
      if (items.every(it => it.claimed)) {
        closeModal("dailyQuestModal");
      }
      gameAlert(`🎉 [${q.label}] 완료!\n보상 [${q.reward?.label}]이(가) 지급되었습니다!`, "📋 일일 퀘스트 보상");
    } else if (data && data.already_claimed) {
      q.claimed = true;
      await syncProfileToServer();
      syncAllRewardSparklesUI();
      renderDailyQuestModal();
      gameAlert("이미 오늘 수령 완료된 퀘스트입니다.");
    } else if (data && data.error === "DAY_MISMATCH") {
      ensureV2DailyState();
      syncAllRewardSparklesUI();
      renderDailyQuestModal();
      gameAlert("오전 6시가 지나 일일 퀘스트가 새로 갱신되었습니다!");
    }
  } finally {
    dailyQuestClaimInFlight = false;
  }
};

window.shareBattle1v1ResultImage = async function () {
  const target = document.getElementById("battle1v1ResultBox");
  if (!target || typeof html2canvas === "undefined") {
    gameAlert("결과 이미지 생성 모듈을 불러오는 중입니다.");
    return;
  }
  const origMaxH = target.querySelector(".battle-vs-rounds")?.style.maxHeight || "";
  const roundsBox = target.querySelector(".battle-vs-rounds");
  try {
    if (roundsBox) roundsBox.style.maxHeight = "none";
    const canvas = await html2canvas(target, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    if (roundsBox) roundsBox.style.maxHeight = origMaxH;
    const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
    if (blob && navigator.canShare) {
      const file = new File([blob], `musicking_1v1_${Date.now()}.png`, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "음악왕 1:1 대결 결과!",
          text: "음악왕 1:1 실시간 대결 결과를 확인해보세요!",
          files: [file]
        });
        return;
      }
    }
    if (blob && navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        gameAlert("📸 1:1 대결 결과 이미지가 클립보드에 복사되었습니다!\n채팅창에 바로 붙여넣기 해보세요.");
        return;
      } catch (clipErr) {}
    }
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `musicking_1v1_${Date.now()}.png`;
    a.click();
    gameAlert("📸 1:1 대결 결과 이미지가 저장되었습니다!");
  } catch (e) {
    if (roundsBox) roundsBox.style.maxHeight = origMaxH;
  }
};

const V32_TUTORIAL_STEPS = [
  {
    selector: "#homeCharTitlePill",
    title: "🎖️ 나의 계급 & 경험치",
    desc: "퀴즈와 낚시로 경험치를 모아 Lv.1 해골부터 Lv.21 별왕관까지 21단계 계급을 올려보세요!"
  },
  {
    selector: "#homeDailyQuestBtn",
    title: "📋 오늘의 일일 퀘스트",
    desc: "매일 오전 6시에 새로 열리는 미션 3개를 완료하고 CD·동전·황금주화·EXP를 받아보세요!"
  },
  {
    selector: "#enterBagBtn",
    title: "🎒 내 가방 & 웰컴 패키지",
    desc: "가방에 🎁 웰컴 패키지 상자가 지급되었어요!\n게임 아이템 장착과 변경권 사용도 가방에서 할 수 있습니다."
  },
  {
    selector: "#enterOutingBtn",
    title: "🏘️ 낚시터 & 황금오락실",
    desc: "낚시터에서 경험치와 CD를 모으고, 황금오락실 오늘의 핫 게임에서 황금주화 2배에 도전하세요!"
  },
  {
    selector: "#enterPlayHubBtn",
    title: "🎮 음악 퀴즈 & 실시간 대결",
    desc: "싱글 퀴즈는 물론 친구와의 1:1 · 4인 실시간 대결로 음악 실력을 겨뤄보세요!"
  }
];

const v32TutorialState = {
  isOpen: false,
  stepIdx: 0
};

function positionV32TutorialStep() {
  const overlay = document.getElementById("v32TutorialOverlay");
  const box = document.getElementById("v32TutorialSpotlightBox");
  const card = document.getElementById("v32TutorialCard");
  if (!overlay || !box || !card || !v32TutorialState.isOpen) return;

  const step = V32_TUTORIAL_STEPS[v32TutorialState.stepIdx];
  const targetEl = step ? document.querySelector(step.selector) : null;
  if (!targetEl) return;

  const r = targetEl.getBoundingClientRect();
  const pad = 6;
  const top = Math.max(4, r.top - pad);
  const left = Math.max(4, r.left - pad);
  const width = Math.min(window.innerWidth - 8, r.width + pad * 2);
  const height = r.height + pad * 2;

  box.style.top = `${top}px`;
  box.style.left = `${left}px`;
  box.style.width = `${width}px`;
  box.style.height = `${height}px`;

  const cardH = card.offsetHeight || 190;
  const viewH = window.innerHeight || 720;
  let cardTop = top + height + 14;
  if (cardTop + cardH > viewH - 18) {
    cardTop = Math.max(58, top - cardH - 14);
  }
  card.style.top = `${cardTop}px`;
}

function renderV32TutorialStep() {
  const step = V32_TUTORIAL_STEPS[v32TutorialState.stepIdx];
  if (!step) return;
  const badgeEl = document.getElementById("v32TutorialStepBadge");
  const titleEl = document.getElementById("v32TutorialTitle");
  const descEl = document.getElementById("v32TutorialDesc");
  const prevBtn = document.getElementById("v32TutorialPrevBtn");
  const nextBtn = document.getElementById("v32TutorialNextBtn");

  if (badgeEl) badgeEl.textContent = `튜토리얼 ${v32TutorialState.stepIdx + 1} / ${V32_TUTORIAL_STEPS.length}`;
  if (titleEl) titleEl.textContent = step.title;
  if (descEl) descEl.textContent = step.desc;
  if (prevBtn) prevBtn.classList.toggle("hidden", v32TutorialState.stepIdx === 0);
  if (nextBtn) {
    const isLast = v32TutorialState.stepIdx >= V32_TUTORIAL_STEPS.length - 1;
    nextBtn.textContent = isLast ? "🎉 시작하기! (가방 상자 열기)" : "다음 ➔";
  }

  requestAnimationFrame(positionV32TutorialStep);
}

window.maybeStartV32Tutorial = function () {
  if (v32TutorialState.isOpen) return;
  if (typeof userState === "undefined" || !userState.isLoggedIn || userState.v32TutorialDone) return;
  if (typeof state !== "undefined" && state.currentScreen !== "homeScreen") return;
  if (document.querySelector(".modal-backdrop:not(.hidden)")) return;

  v32TutorialState.isOpen = true;
  v32TutorialState.stepIdx = 0;
  const overlay = document.getElementById("v32TutorialOverlay");
  if (overlay) overlay.classList.remove("hidden");
  renderV32TutorialStep();
};

window.stepV32Tutorial = function (delta) {
  if (!v32TutorialState.isOpen) return;
  const nextIdx = v32TutorialState.stepIdx + Number(delta || 0);
  if (nextIdx < 0) return;
  if (nextIdx >= V32_TUTORIAL_STEPS.length) {
    finishV32Tutorial(false);
    return;
  }
  v32TutorialState.stepIdx = nextIdx;
  renderV32TutorialStep();
};

window.finishV32Tutorial = async function (skipped = false) {
  v32TutorialState.isOpen = false;
  const overlay = document.getElementById("v32TutorialOverlay");
  if (overlay) overlay.classList.add("hidden");
  userState.v32TutorialDone = true;
  await syncProfileToServer();
  syncAllRewardSparklesUI();
  if (!skipped && getConsumableCount("welcome_box") > 0) {
    openBagScreen("welcome_box");
  }
};

window.addEventListener("resize", () => {
  if (v32TutorialState.isOpen) positionV32TutorialStep();
});

window.openOnlineUsersModal = async function () {
  if (!userState.isLoggedIn) {
    gameConfirm("접속 중인 유저 목록은 로그인 후 이용할 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }
  if (!globalOnlineState.channel || globalOnlineState.channel.state !== "joined") {
    ensureGlobalOnlinePresenceHealthy(false);
  } else {
    syncGlobalOnlineActivity();
  }
  openModal("onlineUsersModal");
  renderOnlineUsersModalList();
  await Promise.all([refreshOnlineUsersFriendships(), refreshFishingBgRosterForPresence(true)]);
  const modal = document.getElementById("onlineUsersModal");
  if (modal && !modal.classList.contains("hidden")) {
    renderOnlineUsersModalList();
  }
};

window.sendFriendRequestFromOnlineModal = async function (targetId, targetNick) {
  if (!userState.isLoggedIn || !userState.id || !sbClient) return;
  const cleanId = String(targetId || "");
  if (!cleanId || cleanId === String(userState.id)) return;
  const curStatus = globalOnlineState.friendStatusMap.get(cleanId);
  if (curStatus === "accepted") {
    gameAlert(`[${targetNick}]님과는 이미 친구입니다!`);
    return;
  }
  if (curStatus === "pending") {
    gameAlert(`[${targetNick}]님에게 이미 친구 요청이 대기 중입니다.`);
    return;
  }

  const { error } = await sbClient.from("friendships").insert({
    requester_id: userState.id,
    receiver_id: cleanId,
    status: "pending"
  });
  if (error) {
    gameAlert("이미 친구 신청을 보냈거나 친구로 등록되어 있습니다.");
    await refreshOnlineUsersFriendships();
    renderOnlineUsersModalList();
    return;
  }
  globalOnlineState.friendStatusMap.set(cleanId, "pending");
  renderOnlineUsersModalList();
  gameAlert(`💌 [${targetNick}]님에게 친구 신청을 보냈습니다!`);
};

window.renderOnlineUsersModalList = function () {
  const listEl = document.getElementById("onlineUsersModalList");
  const countBadge = document.getElementById("onlineUsersModalCount");
  if (!listEl) return;

  const summary = getOnlineUsersSummary();
  const users = summary.list;
  if (countBadge) {
    countBadge.textContent = `총 ${summary.totalCount}명 (접속 ${summary.liveCount} · 잠수 ${summary.afkCount})`;
  }

  if (users.length === 0) {
    listEl.innerHTML = `<div style="text-align:center; padding:26px; color:var(--text-sub); font-size:0.84rem;">현재 접속 또는 낚시 잠수 중인 유저가 없습니다.</div>`;
    return;
  }

  listEl.innerHTML = users
    .map(u => {
      const uid = String(u.userId);
      const isMe = userState.id && uid === String(userState.id);
      const safeId = escapeJsSingleArg(uid);
      const safeNick = escapeJsSingleArg(u.nickname || "도전자");
      const lvNum = typeof getLevelInfo === "function" ? getLevelInfo(Number(u.exp) || 0).level : 1;
      const relStatus = globalOnlineState.friendStatusMap.get(uid) || "";
      const isAfk = u._presence && u._presence.status === "fishing_afk";
      const isPlaying = isScreenBusyInGameplay(u.screen);
      const canChallenge = !isMe && !isAfk && !isPlaying;
      const actText = (u._presence && u._presence.activity) || u.activity || getGlobalOnlineActivityLabel(u.screen);
      const friendBtnHtml = isMe
        ? `<span class="badge primary">⭐ 나</span>`
        : relStatus === "accepted"
        ? `<span class="badge" style="background:#dcfce7; color:#15803d; border-color:#22c55e;">친구</span>`
        : relStatus === "pending"
        ? `<button type="button" class="header-btn" disabled style="opacity:0.65;">⏳ 대기</button>`
        : `<button type="button" class="header-btn" onclick="sendFriendRequestFromOnlineModal('${safeId}', '${safeNick}')" title="친구 추가">➕</button>`;

      return `
        <div class="pixel-list-item online-user-row" onclick="inspectOtherUser('${safeId}', '${safeNick}')">
          <div style="display:flex; align-items:center; gap:9px; min-width:0; flex:1;">
            <div class="kakao-avatar-wrap avatar-clickable-trigger" title="프로필 보기">
              <canvas class="online-modal-mini-cv kakao-avatar-sq" width="480" height="480" style="width:40px; height:40px; border-radius:12px;" data-avatar='${JSON.stringify(u.avatarConfig || DEFAULT_AVATAR_CONFIG)}'></canvas>
              <span class="online-status-dot ${isAfk ? "is-fishing-afk" : "is-online"}"></span>
            </div>
            <div style="min-width:0; flex:1;">
              <div style="display:flex; align-items:center; gap:5px;">
                ${typeof renderMusicRankIconHtml === "function" ? renderMusicRankIconHtml(lvNum, { size: 16 }) : ""}
                <strong style="font-size:0.86rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer;" title="프로필 보기">${isMe ? "⭐ " : ""}${escapeOnlineHtml(u.nickname || "도전자")}</strong>
                <span style="font-size:0.66rem; font-weight:900; color:var(--primary-dark); background:#eff6ff; border:1px solid #93c5fd; border-radius:6px; padding:0 4px; flex-shrink:0;">Lv.${lvNum}</span>
              </div>
              <div style="font-size:0.72rem; color:${isAfk ? "#0284c7" : "#15803d"}; font-weight:800;">● ${escapeOnlineHtml(actText)}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;" onclick="event.stopPropagation()">
            ${friendBtnHtml}
            ${isMe ? "" : `<button type="button" class="header-btn" onclick="closeModal('onlineUsersModal'); sendBattleInviteToUser('${safeId}', '${safeNick}', 'direct_duel')" title="${isAfk ? "잠수중 요청 불가" : isPlaying ? "게임중 요청 불가" : "1:1 대결 요청"}" style="background:${canChallenge ? "#fef9c3" : "#f1f5f9"}; border-color:${canChallenge ? "#f59e0b" : "#cbd5e1"}; ${canChallenge ? "" : "opacity:0.55;"}">⚔️</button>`}
            ${isMe ? "" : `<button type="button" class="header-btn" onclick="closeModal('onlineUsersModal'); prepareDmTo('${safeId}', '${safeNick}')" title="1:1 DM">💬</button>`}
          </div>
        </div>
      `;
    })
    .join("");

  listEl.querySelectorAll(".online-modal-mini-cv").forEach(cv => {
    try {
      renderPixelAvatar(cv, JSON.parse(cv.getAttribute("data-avatar")));
    } catch (e) {}
  });
};

// ============================================================================
// [V3.1] 실시간 대결 요청 · 방 초대 (상단 20초 타이머 바 토스트 · 접속자/친구 선택)
// ============================================================================
const BATTLE_INVITE_DURATION_MS = 20000;
const GAMEPLAY_BUSY_SCREENS = new Set(["gameScreen", "judgeScreen", "arcadePlayScreen", "battlePlayScreen", "quizPlazaPlayScreen"]);

const battleInviteState = {
  activeIncoming: null,
  queue: [],
  timerRaf: null,
  waitRoomReadyTimer: null,
  isWaitingRoomReady: false,
  cooldownMap: new Map(),
  outgoingMap: new Map(),
  inviteTab: "online"
};

function isScreenBusyInGameplay(screenId) {
  return Boolean(screenId && GAMEPLAY_BUSY_SCREENS.has(String(screenId)));
}

function isSelfBusyInGameplay() {
  const scr = typeof state !== "undefined" ? state.currentScreen : "homeScreen";
  return isScreenBusyInGameplay(scr);
}

let _quickNoticeTimer = null;
function showGlobalQuickNoticeToast(msg, tone = "info") {
  let el = document.getElementById("globalQuickNoticePill");
  if (!el) {
    el = document.createElement("div");
    el.id = "globalQuickNoticePill";
    el.style.cssText =
      "position:fixed; bottom:max(24px, calc(env(safe-area-inset-bottom, 0px) + 18px)); left:50%; transform:translateX(-50%); max-width:min(92vw,380px); z-index:9940; padding:9px 14px; border-radius:999px; border:2.5px solid #1e1b18; font-size:0.8rem; font-weight:900; box-shadow:0 4px 0 #1e1b18; text-align:center; pointer-events:none; word-break:keep-all;";
    document.body.appendChild(el);
  }
  el.style.background =
    tone === "error" ? "#ffe4e6" : tone === "success" ? "#dcfce7" : "#fef9c3";
  el.style.color =
    tone === "error" ? "#be123c" : tone === "success" ? "#166534" : "#1e1b18";
  el.textContent = msg;
  el.classList.remove("hidden");
  if (_quickNoticeTimer) clearTimeout(_quickNoticeTimer);
  _quickNoticeTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 2800);
}

window.stopBattleInviteRuntime = function () {
  if (battleInviteState.timerRaf) {
    cancelAnimationFrame(battleInviteState.timerRaf);
    battleInviteState.timerRaf = null;
  }
  if (battleInviteState.waitRoomReadyTimer) {
    clearTimeout(battleInviteState.waitRoomReadyTimer);
    battleInviteState.waitRoomReadyTimer = null;
  }
  battleInviteState.activeIncoming = null;
  battleInviteState.queue = [];
  battleInviteState.isWaitingRoomReady = false;
  battleInviteState.outgoingMap.clear();
  const toastEl = document.getElementById("battleInviteToast");
  if (toastEl) toastEl.classList.add("hidden");
};

function canUserReceiveBattleInvite(targetId) {
  if (!targetId) return { ok: false, reason: "invalid", message: "대상 유저를 찾을 수 없습니다." };
  const uid = String(targetId);
  if (userState.id && uid === String(userState.id)) {
    return { ok: false, reason: "self", message: "자기 자신에게는 대결 요청을 보낼 수 없습니다." };
  }
  if (isUserBlocked(uid)) {
    return { ok: false, reason: "blocked", message: "차단한 유저에게는 대결 요청을 보낼 수 없습니다." };
  }
  const pres = window.getUserPresenceState(uid);
  if (pres.status === "fishing_afk") {
    return { ok: false, reason: "afk", message: "💤 낚시 잠수중인 유저에게는 대결 요청을 보낼 수 없습니다." };
  }
  if (pres.status !== "online") {
    return { ok: false, reason: "offline", message: "현재 오프라인 상태인 유저에게는 대결 요청을 보낼 수 없습니다." };
  }
  const targetScreen = pres.user && pres.user.screen ? pres.user.screen : "";
  if (isScreenBusyInGameplay(targetScreen)) {
    return {
      ok: false,
      reason: "playing",
      message: `🎮 상대방이 현재 게임 플레이 중(${pres.activity || "진행중"})이라 대결 요청을 보낼 수 없습니다.`
    };
  }
  return { ok: true, pres };
}

async function prepareLeaveCurrentActivityForBattle() {
  if (typeof closeAllModals === "function") closeAllModals();
  if (typeof fishingState !== "undefined" && fishingState.isInside) {
    if (typeof cleanupFishingRuntime === "function") {
      cleanupFishingRuntime(true);
    }
  }
  if (typeof cleanupArcadeRuntime === "function") {
    try { cleanupArcadeRuntime(); } catch (e) {}
  }
  if (typeof plazaState !== "undefined" && plazaState.currentRoom) {
    await leaveBattleRoom({ skipNavigate: true });
  }
}

function sendBattleChannelBroadcast(event, payload) {
  if (!globalOnlineState.channel || globalOnlineState.channel.state !== "joined") {
    return false;
  }
  try {
    globalOnlineState.channel.send({
      type: "broadcast",
      event,
      payload
    });
    return true;
  } catch (e) {
    return false;
  }
}

window.sendBattleInviteFromProfile = function () {
  const tid = document.getElementById("inspectTargetId")?.value || "";
  const tnick = document.getElementById("inspectNick")?.textContent || "유저";
  if (!tid) return;
  closeModal("userInspectModal");
  sendBattleInviteToUser(tid, tnick, "direct_duel");
};

window.sendBattleInviteToUser = async function (targetId, targetNick, kindOverride = "auto") {
  if (!userState.isLoggedIn || !userState.id) {
    gameConfirm("대결 요청은 로그인 후 이용할 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }
  if (isSelfBusyInGameplay()) {
    gameAlert("게임 플레이 중에는 대결 요청을 보낼 수 없습니다.");
    return;
  }
  if (!globalOnlineState.channel || globalOnlineState.channel.state !== "joined") {
    ensureGlobalOnlinePresenceHealthy(false);
    gameAlert("실시간 네트워크 연결 중입니다. 잠시 후 다시 시도해주세요.");
    return;
  }

  const uid = String(targetId || "");
  const check = canUserReceiveBattleInvite(uid);
  if (!check.ok) {
    gameAlert(check.message, "⚔️ 대결 요청 불가");
    return;
  }

  const inWaitingRoom =
    typeof state !== "undefined" &&
    state.currentScreen === "battleRoomScreen" &&
    plazaState.currentRoom &&
    plazaState.currentRoom.status === "waiting";
  const kind = kindOverride === "auto" ? (inWaitingRoom ? "room_invite" : "direct_duel") : kindOverride;

  if (kind === "room_invite") {
    const room = plazaState.currentRoom;
    const maxP = room && room.room_type === "1v1" ? 2 : 4;
    const curP = room && Array.isArray(room.players) ? room.players.length : 0;
    if (!room || curP >= maxP) {
      gameAlert("방 인원이 이미 가득 찼습니다!");
      return;
    }
    if ((room.players || []).some(p => String(p.id) === uid)) {
      gameAlert(`[${targetNick}]님은 이미 이 방에 입장해 있습니다!`);
      return;
    }
  }

  const now = Date.now();
  const prevCool = battleInviteState.cooldownMap.get(uid) || 0;
  if (now - prevCool < 8000) {
    const waitSec = Math.ceil((8000 - (now - prevCool)) / 1000);
    showGlobalQuickNoticeToast(`⏳ ${waitSec}초 후 다시 요청할 수 있습니다.`, "info");
    return;
  }
  battleInviteState.cooldownMap.set(uid, now);

  const inviteId = `inv_${userState.id.slice(0, 8)}_${now}_${Math.random().toString(36).slice(2, 6)}`;
  const room = kind === "room_invite" ? plazaState.currentRoom : null;
  const payload = {
    inviteId,
    kind,
    fromId: String(userState.id),
    fromNick: userState.nickname || "도전자",
    fromAvatar:
      typeof sanitizeAvatarConfigShape === "function"
        ? sanitizeAvatarConfigShape(userState.avatarConfig)
        : userState.avatarConfig,
    fromExp: Number(userState.exp) || 0,
    toId: uid,
    toNick: targetNick || "유저",
    roomId: room ? room.id : null,
    roomTitle: room ? room.title : "",
    roomType: room ? room.room_type : "1v1",
    gameConfig: room
      ? room.game_config
      : { decade: "ALL", mode: "behind", stage: 1, itemMode: "notem", difficulty: "normal" },
    sentAt: now
  };

  battleInviteState.outgoingMap.set(inviteId, payload);
  setTimeout(() => battleInviteState.outgoingMap.delete(inviteId), BATTLE_INVITE_DURATION_MS + 10000);

  const ok = sendBattleChannelBroadcast("battle_invite", payload);
  if (!ok) {
    gameAlert("요청 전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    return;
  }

  showGlobalQuickNoticeToast(
    kind === "room_invite"
      ? `📩 [${targetNick}]님에게 방 초대를 보냈습니다! (20초 대기)`
      : `⚔️ [${targetNick}]님에게 1:1 대결을 요청했습니다! (20초 대기)`,
    "success"
  );
  const invModal = document.getElementById("battleInviteModal");
  if (invModal && !invModal.classList.contains("hidden")) {
    renderBattleInviteModalList(false);
  }
};

function hideBattleInviteToastUI() {
  if (battleInviteState.timerRaf) {
    cancelAnimationFrame(battleInviteState.timerRaf);
    battleInviteState.timerRaf = null;
  }
  if (battleInviteState.waitRoomReadyTimer) {
    clearTimeout(battleInviteState.waitRoomReadyTimer);
    battleInviteState.waitRoomReadyTimer = null;
  }
  battleInviteState.activeIncoming = null;
  battleInviteState.isWaitingRoomReady = false;
  const toastEl = document.getElementById("battleInviteToast");
  if (toastEl) toastEl.classList.add("hidden");
}

function advanceBattleInviteQueue() {
  if (battleInviteState.activeIncoming || battleInviteState.queue.length === 0) return;
  if (isSelfBusyInGameplay()) {
    battleInviteState.queue = [];
    return;
  }
  const next = battleInviteState.queue.shift();
  showBattleInviteToastNow(next);
}

function showBattleInviteToastNow(inv) {
  if (!inv || isSelfBusyInGameplay()) return;
  const toastEl = document.getElementById("battleInviteToast");
  const avCv = document.getElementById("battleInviteAvatarCanvas");
  const titleEl = document.getElementById("battleInviteToastTitle");
  const subEl = document.getElementById("battleInviteToastSub");
  const secEl = document.getElementById("battleInviteTimerSecLabel");
  const barEl = document.getElementById("battleInviteTimerBarFill");
  const acceptBtn = document.getElementById("battleInviteAcceptBtn");
  const declineBtn = document.getElementById("battleInviteDeclineBtn");
  if (!toastEl || !titleEl || !subEl || !barEl) return;

  battleInviteState.activeIncoming = inv;
  battleInviteState.isWaitingRoomReady = false;

  const isRoomInv = inv.kind === "room_invite";
  const cfg = inv.gameConfig || {};
  const decLabel = !cfg.decade || cfg.decade === "ALL" ? "전연대" : String(cfg.decade).replace("s", "년대");
  const modeLabel = { behind: "비하인드", lyrics: "가사", onesec: "1초듣기" }[cfg.mode] || "비하인드";
  const stageLabel = `${cfg.stage || 1}단계`;
  const diffLabel = cfg.difficulty === "hard" ? "🔥고수×2" : "😊일반";
  const itemLabel = cfg.itemMode === "item" ? "아이템전" : "노템전";

  titleEl.textContent = isRoomInv
    ? `📩 ${inv.fromNick}님이 대결방에 초대했습니다!`
    : `⚔️ ${inv.fromNick}님이 1:1 대결을 요청했습니다!`;
  subEl.textContent = isRoomInv
    ? `[${inv.roomType === "4p" ? "4인" : "1:1"}] ${diffLabel} · ${decLabel} · ${modeLabel} · ${stageLabel} · ${itemLabel}`
    : `수락 시 1:1 대결방 생성 후 입장! (방장이 설정 가능)`;

  if (acceptBtn) {
    acceptBtn.disabled = false;
    acceptBtn.textContent = "⚔️ 수락하기";
  }
  if (declineBtn) {
    declineBtn.disabled = false;
  }
  if (avCv && typeof renderPixelAvatar === "function") {
    try {
      renderPixelAvatar(avCv, inv.fromAvatar || DEFAULT_AVATAR_CONFIG, { skipEffectLoop: true });
    } catch (e) {}
  }

  const startedAt = Date.now();
  toastEl.classList.remove("hidden");

  const tick = () => {
    if (!battleInviteState.activeIncoming || battleInviteState.activeIncoming.inviteId !== inv.inviteId) return;
    if (battleInviteState.isWaitingRoomReady) return;
    if (isSelfBusyInGameplay()) {
      sendBattleChannelBroadcast("battle_invite_reply", {
        inviteId: inv.inviteId,
        kind: inv.kind,
        status: "busy",
        fromId: String(userState.id),
        fromNick: userState.nickname || "도전자",
        toId: String(inv.fromId)
      });
      hideBattleInviteToastUI();
      return;
    }

    const elapsed = Date.now() - startedAt;
    const remMs = Math.max(0, BATTLE_INVITE_DURATION_MS - elapsed);
    const pct = (remMs / BATTLE_INVITE_DURATION_MS) * 100;
    const secLeft = Math.ceil(remMs / 1000);

    barEl.style.width = `${pct.toFixed(2)}%`;
    if (secEl) secEl.textContent = `${secLeft}초`;

    if (remMs <= 0) {
      sendBattleChannelBroadcast("battle_invite_reply", {
        inviteId: inv.inviteId,
        kind: inv.kind,
        status: "timeout",
        fromId: String(userState.id),
        fromNick: userState.nickname || "도전자",
        toId: String(inv.fromId)
      });
      hideBattleInviteToastUI();
      advanceBattleInviteQueue();
      return;
    }
    battleInviteState.timerRaf = requestAnimationFrame(tick);
  };
  if (battleInviteState.timerRaf) cancelAnimationFrame(battleInviteState.timerRaf);
  battleInviteState.timerRaf = requestAnimationFrame(tick);
}

function handleIncomingBattleInvite(payload) {
  if (!payload || !userState.isLoggedIn || !userState.id) return;
  if (String(payload.toId) !== String(userState.id)) return;
  if (String(payload.fromId) === String(userState.id)) return;
  if (isUserBlocked(payload.fromId, payload.fromNick)) return;

  if (isSelfBusyInGameplay()) {
    sendBattleChannelBroadcast("battle_invite_reply", {
      inviteId: payload.inviteId,
      kind: payload.kind,
      status: "busy",
      fromId: String(userState.id),
      fromNick: userState.nickname || "도전자",
      toId: String(payload.fromId)
    });
    return;
  }

  if (battleInviteState.activeIncoming) {
    if (battleInviteState.activeIncoming.fromId === payload.fromId) return;
    if (!battleInviteState.queue.some(q => q.fromId === payload.fromId)) {
      battleInviteState.queue.push(payload);
    }
    return;
  }
  showBattleInviteToastNow(payload);
}

window.respondToBattleInvite = async function (accepted) {
  const inv = battleInviteState.activeIncoming;
  if (!inv) return;

  if (!accepted) {
    sendBattleChannelBroadcast("battle_invite_reply", {
      inviteId: inv.inviteId,
      kind: inv.kind,
      status: "declined",
      fromId: String(userState.id),
      fromNick: userState.nickname || "도전자",
      toId: String(inv.fromId)
    });
    hideBattleInviteToastUI();
    advanceBattleInviteQueue();
    return;
  }

  if (isSelfBusyInGameplay()) {
    gameAlert("현재 진행 중인 게임 종료 후 수락할 수 있습니다.");
    hideBattleInviteToastUI();
    return;
  }

  if (inv.kind === "room_invite" && inv.roomId) {
    hideBattleInviteToastUI();
    await prepareLeaveCurrentActivityForBattle();
    sendBattleChannelBroadcast("battle_invite_reply", {
      inviteId: inv.inviteId,
      kind: inv.kind,
      status: "joined",
      fromId: String(userState.id),
      fromNick: userState.nickname || "도전자",
      toId: String(inv.fromId)
    });
    await joinOnlineRoom(inv.roomId);
    return;
  }

  // direct_duel 수락: 요청자가 즉시 1:1 방 생성 후 양쪽 동시 입장
  battleInviteState.isWaitingRoomReady = true;
  if (battleInviteState.timerRaf) {
    cancelAnimationFrame(battleInviteState.timerRaf);
    battleInviteState.timerRaf = null;
  }
  const acceptBtn = document.getElementById("battleInviteAcceptBtn");
  const declineBtn = document.getElementById("battleInviteDeclineBtn");
  if (acceptBtn) {
    acceptBtn.disabled = true;
    acceptBtn.textContent = "⏳ 방 생성중...";
  }
  if (declineBtn) declineBtn.disabled = true;

  sendBattleChannelBroadcast("battle_invite_reply", {
    inviteId: inv.inviteId,
    kind: "direct_duel",
    status: "accepted",
    fromId: String(userState.id),
    fromNick: userState.nickname || "도전자",
    toId: String(inv.fromId)
  });

  if (battleInviteState.waitRoomReadyTimer) clearTimeout(battleInviteState.waitRoomReadyTimer);
  battleInviteState.waitRoomReadyTimer = setTimeout(() => {
    if (battleInviteState.activeIncoming && battleInviteState.activeIncoming.inviteId === inv.inviteId) {
      hideBattleInviteToastUI();
      showGlobalQuickNoticeToast("⚠️ 상대방 응답이 지연되어 방 입장이 취소되었습니다.", "error");
      advanceBattleInviteQueue();
    }
  }, 7000);
};

async function handleIncomingBattleInviteReply(payload) {
  if (!payload || !userState.isLoggedIn || !userState.id) return;
  if (String(payload.toId) !== String(userState.id)) return;
  const orig = battleInviteState.outgoingMap.get(payload.inviteId);

  if (payload.status === "declined") {
    battleInviteState.outgoingMap.delete(payload.inviteId);
    showGlobalQuickNoticeToast(`❌ [${payload.fromNick || "상대방"}]님이 대결 요청을 거절했습니다.`, "error");
    return;
  }
  if (payload.status === "busy") {
    battleInviteState.outgoingMap.delete(payload.inviteId);
    showGlobalQuickNoticeToast(`🎮 [${payload.fromNick || "상대방"}]님이 현재 게임 중이라 요청이 전달되지 않았습니다.`, "info");
    return;
  }
  if (payload.status === "timeout") {
    battleInviteState.outgoingMap.delete(payload.inviteId);
    return;
  }
  if (payload.status === "joined") {
    battleInviteState.outgoingMap.delete(payload.inviteId);
    showGlobalQuickNoticeToast(`🎉 [${payload.fromNick || "상대방"}]님이 초대를 수락했습니다!`, "success");
    return;
  }
  if (payload.status === "sender_busy") {
    if (battleInviteState.activeIncoming && battleInviteState.activeIncoming.inviteId === payload.inviteId) {
      hideBattleInviteToastUI();
      showGlobalQuickNoticeToast(`🎮 [${payload.fromNick || "상대방"}]님이 다른 게임 시작 중이라 취소되었습니다.`, "info");
    }
    return;
  }

  if (payload.status === "accepted" && payload.kind === "direct_duel") {
    battleInviteState.outgoingMap.delete(payload.inviteId);
    if (!orig) return;
    if (isSelfBusyInGameplay()) {
      sendBattleChannelBroadcast("battle_invite_reply", {
        inviteId: payload.inviteId,
        kind: "direct_duel",
        status: "sender_busy",
        fromId: String(userState.id),
        fromNick: userState.nickname || "도전자",
        toId: String(payload.fromId)
      });
      return;
    }

    await prepareLeaveCurrentActivityForBattle();
    const roomTitle = `${userState.nickname || "도전자"} vs ${payload.fromNick || "상대"}`.slice(0, 24);
    const cfg = { decade: "ALL", mode: "behind", stage: 1, itemMode: "notem", difficulty: "normal" };
    const shuffledIds = shuffleArray(QUESTIONS_DB).slice(0, 10).map(q => q.id);
    const initialPlayers = [
      {
        id: userState.id,
        nickname: userState.nickname,
        exp: Number(userState.exp) || 0,
        avatarConfig: userState.avatarConfig,
        score: 0
      }
    ];

    const { data: createdRoom, error } = await sbClient
      .from("rooms")
      .insert({
        title: roomTitle,
        host_id: userState.id,
        room_type: "1v1",
        game_config: cfg,
        status: "waiting",
        players: initialPlayers,
        current_q_index: 0,
        question_ids: shuffledIds
      })
      .select()
      .single();

    if (error || !createdRoom) {
      showGlobalQuickNoticeToast("1:1 대결방 생성 중 오류가 발생했습니다.", "error");
      return;
    }

    sendBattleChannelBroadcast("battle_direct_room_ready", {
      inviteId: payload.inviteId,
      toId: String(payload.fromId),
      fromId: String(userState.id),
      fromNick: userState.nickname || "도전자",
      roomId: createdRoom.id
    });
    await joinOnlineRoom(createdRoom.id);
  }
}

async function handleIncomingDirectRoomReady(payload) {
  if (!payload || !userState.isLoggedIn || !userState.id) return;
  if (String(payload.toId) !== String(userState.id)) return;
  if (!payload.roomId) return;

  hideBattleInviteToastUI();
  if (isSelfBusyInGameplay()) return;
  await prepareLeaveCurrentActivityForBattle();
  await joinOnlineRoom(payload.roomId);
}

window.openBattleInviteModal = async function () {
  if (!userState.isLoggedIn || !userState.id) {
    gameConfirm("대결 초대는 로그인 후 이용할 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }
  const titleEl = document.getElementById("battleInviteModalTitle");
  const inRoom =
    typeof state !== "undefined" &&
    state.currentScreen === "battleRoomScreen" &&
    plazaState.currentRoom &&
    plazaState.currentRoom.status === "waiting";
  if (titleEl) {
    titleEl.textContent = inRoom ? "📩 대결방 초대하기" : "⚔️ 1:1 대결 상대 초대";
  }

  battleInviteState.inviteTab = "online";
  openModal("battleInviteModal");
  switchBattleInviteTab("online");
  await Promise.all([refreshOnlineUsersFriendships(), refreshFishingBgRosterForPresence(true)]);
  const m = document.getElementById("battleInviteModal");
  if (m && !m.classList.contains("hidden")) {
    renderBattleInviteModalList(false);
  }
};

window.switchBattleInviteTab = function (tab) {
  battleInviteState.inviteTab = tab === "friends" ? "friends" : "online";
  const tabOn = document.getElementById("battleInviteTabOnline");
  const tabFr = document.getElementById("battleInviteTabFriends");
  if (tabOn) tabOn.classList.toggle("active", battleInviteState.inviteTab === "online");
  if (tabFr) tabFr.classList.toggle("active", battleInviteState.inviteTab === "friends");
  renderBattleInviteModalList(false);
};

window.renderBattleInviteModalList = async function (refreshBg = false) {
  const listEl = document.getElementById("battleInviteModalList");
  if (!listEl || !userState.id) return;

  if (refreshBg) {
    await Promise.all([refreshOnlineUsersFriendships(), refreshFishingBgRosterForPresence(true)]);
  }

  const inRoom =
    typeof state !== "undefined" &&
    state.currentScreen === "battleRoomScreen" &&
    plazaState.currentRoom &&
    plazaState.currentRoom.status === "waiting";
  const roomMemberIds = new Set(
    inRoom && Array.isArray(plazaState.currentRoom.players)
      ? plazaState.currentRoom.players.map(p => String(p.id))
      : []
  );

  let rowsData = [];
  if (battleInviteState.inviteTab === "online") {
    const summary = getOnlineUsersSummary();
    rowsData = summary.list
      .filter(u => String(u.userId) !== String(userState.id) && !isUserBlocked(u.userId, u.nickname))
      .map(u => ({
        userId: String(u.userId),
        nickname: u.nickname || "도전자",
        avatarConfig: u.avatarConfig || DEFAULT_AVATAR_CONFIG,
        exp: Number(u.exp) || 0,
        screen: u.screen || "",
        pres: u._presence || window.getUserPresenceState(u.userId)
      }));
  } else {
    listEl.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub); font-size:0.82rem;">친구 목록 불러오는 중...</div>`;
    try {
      const { data: rels } = await sbClient
        .from("friendships")
        .select("requester_id, receiver_id, status")
        .or(`requester_id.eq.${userState.id},receiver_id.eq.${userState.id}`)
        .eq("status", "accepted");
      const friendIds = (rels || [])
        .map(r => String(r.requester_id === userState.id ? r.receiver_id : r.requester_id))
        .filter(id => id && !isUserBlocked(id));

      if (friendIds.length > 0) {
        const { data: profs } = await sbClient
          .from("profiles")
          .select("id, nickname, avatar_config")
          .in("id", friendIds);
        rowsData = (profs || []).map(p => {
          const uid = String(p.id);
          const pres = window.getUserPresenceState(uid);
          return {
            userId: uid,
            nickname: p.nickname || "친구",
            avatarConfig: p.avatar_config || DEFAULT_AVATAR_CONFIG,
            exp: Number(p.avatar_config?._exp) || 0,
            screen: pres.user && pres.user.screen ? pres.user.screen : "",
            pres
          };
        });
        rowsData.sort((a, b) => {
          const rank = s => (s.status === "online" && !isScreenBusyInGameplay(s.screen) ? 2 : s.status === "online" ? 1 : 0);
          return rank({ status: b.pres.status, screen: b.screen }) - rank({ status: a.pres.status, screen: a.screen });
        });
      }
    } catch (e) {}
  }

  if (rowsData.length === 0) {
    listEl.innerHTML =
      battleInviteState.inviteTab === "online"
        ? `<div style="text-align:center; padding:28px 14px; color:var(--text-sub); font-size:0.84rem;">현재 접속 중인 다른 유저가 없습니다.</div>`
        : `<div style="text-align:center; padding:28px 14px; color:var(--text-sub); font-size:0.84rem;">등록된 친구가 없습니다.</div>`;
    return;
  }

  const now = Date.now();
  listEl.innerHTML = rowsData
    .map(u => {
      const uid = u.userId;
      const safeId = escapeJsSingleArg(uid);
      const safeNick = escapeJsSingleArg(u.nickname);
      const lvNum = typeof getLevelInfo === "function" ? getLevelInfo(u.exp).level : 1;
      const isAfk = u.pres.status === "fishing_afk";
      const isOffline = u.pres.status === "offline";
      const isPlaying = !isOffline && !isAfk && isScreenBusyInGameplay(u.screen);
      const alreadyInRoom = roomMemberIds.has(uid);
      const inCool = now - (battleInviteState.cooldownMap.get(uid) || 0) < 8000;

      const dotCls = isAfk ? "is-fishing-afk" : !isOffline ? "is-online" : "";
      let rightHtml = "";
      if (alreadyInRoom) {
        rightHtml = `<span class="battle-invite-status-pill">이미 방 참가중</span>`;
      } else if (isAfk) {
        rightHtml = `<span class="battle-invite-status-pill is-afk">💤 잠수중</span>`;
      } else if (isOffline) {
        rightHtml = `<span class="battle-invite-status-pill">오프라인</span>`;
      } else if (isPlaying) {
        rightHtml = `<span class="battle-invite-status-pill is-busy">🎮 게임중</span>`;
      } else if (inCool) {
        rightHtml = `<span class="battle-invite-status-pill">⏳ 요청됨</span>`;
      } else {
        rightHtml = `<button type="button" class="btn btn-gold" style="padding:5px 10px; font-size:0.76rem; flex-shrink:0;" onclick="sendBattleInviteToUser('${safeId}', '${safeNick}', 'auto')">${inRoom ? "📩 초대" : "⚔️ 요청"}</button>`;
      }

      return `
        <div class="pixel-list-item" style="cursor:default;">
          <div style="display:flex; align-items:center; gap:9px; min-width:0; flex:1;">
            <div class="kakao-avatar-wrap avatar-clickable-trigger" onclick="inspectOtherUser('${safeId}', '${safeNick}')" title="프로필 보기">
              <canvas class="battle-inv-mini-cv kakao-avatar-sq" width="480" height="480" style="width:40px; height:40px; border-radius:12px;" data-avatar='${JSON.stringify(u.avatarConfig || DEFAULT_AVATAR_CONFIG)}'></canvas>
              <span class="online-status-dot ${dotCls}"></span>
            </div>
            <div style="min-width:0; flex:1;">
              <div style="display:flex; align-items:center; gap:5px;">
                ${typeof renderMusicRankIconHtml === "function" ? renderMusicRankIconHtml(lvNum, { size: 16 }) : ""}
                <strong style="font-size:0.86rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeOnlineHtml(u.nickname)}</strong>
                <span style="font-size:0.66rem; font-weight:900; color:var(--primary-dark); background:#eff6ff; border:1px solid #93c5fd; border-radius:6px; padding:0 4px; flex-shrink:0;">Lv.${lvNum}</span>
              </div>
              <div style="font-size:0.72rem; color:${isAfk ? "#0284c7" : isOffline ? "#64748b" : "#15803d"}; font-weight:800;">● ${escapeOnlineHtml(u.pres.activity)}</div>
            </div>
          </div>
          ${rightHtml}
        </div>
      `;
    })
    .join("");

  listEl.querySelectorAll(".battle-inv-mini-cv").forEach(cv => {
    try {
      renderPixelAvatar(cv, JSON.parse(cv.getAttribute("data-avatar")));
    } catch (e) {}
  });
};

