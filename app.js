// ============================================================================
// [음악왕 v4.0] 메인 게임 엔진 (app.js)
// - 기본 폰트: 기본 고딕 적용
// - 모바일 키보드 올라올 때 visualViewport 연동으로 문제 가림 현상 완벽 해결
// - 첫 터치 시 모바일 주소창 자동 숨김(Fullscreen) 트리거
// ============================================================================

const state = {
  decades: new Set(["1990s", "2000s", "2010s", "2020s"]),
  mode: "behind",
  stage: 1,
  questionLimit: 10,
  timeAttack: false,
  hardMode: false,

  pool: [],
  currentIndex: 0,
  score: 0,
  streak: 0,
  hearts: 5,
  history: [],

  currentQ: null,
  usedHintLetter: false,
  usedHintKeyword: false,
  usedHintAudio: false,
  questionEnded: false,

  timerInterval: null,
  timeLeftMs: 15000,
  maxTimeMs: 15000,

  audioEl: new Audio(),
  audioStopTimer: null,
  itunesCache: new Map(),
  oneSecOffsetIndex: 0,
  currentScreen: "loginScreen",
  autoFullscreenTried: false
};

state.audioEl.crossOrigin = "anonymous";
state.audioEl.volume = 0.85;

// 모바일 핀치줌·바디 스크롤 차단
document.addEventListener("gesturestart", e => e.preventDefault(), { passive: false });
document.addEventListener(
  "touchmove",
  e => {
    const scrollable = e.target.closest(
      ".question-content, .judge-note-box, .history-scroll-box, .modal-content, .setup-card, .shop-grid, #roomChatLog, textarea, input[type='range']"
    );
    if (!scrollable) {
      e.preventDefault();
    }
  },
  { passive: false }
);

// 모바일 브라우저 첫 터치 시 기본으로 상단 주소창 숨김(Fullscreen) 유도
function tryAutoHideAddressBar() {
  if (state.autoFullscreenTried) return;
  state.autoFullscreenTried = true;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile && !document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  window.scrollTo(0, 1);
}
document.addEventListener("pointerdown", tryAutoHideAddressBar, { once: true });

// ============================================================================
// 모바일 키보드 올라올 때 문제가 절대 가려지지 않도록 동적 뷰포트 제어
// ============================================================================
function setupMobileKeyboardViewportHandler() {
  const shell = document.querySelector(".app-shell");
  if (!shell) return;

  const updateViewport = () => {
    if (window.visualViewport) {
      const vh = window.visualViewport.height;
      const fullH = window.innerHeight;
      shell.style.height = `${vh}px`;
      // 키보드가 올라와 화면 높이가 줄어든 상태 감지
      if (fullH - vh > 110) {
        document.body.classList.add("keyboard-open");
      } else {
        document.body.classList.remove("keyboard-open");
      }
      window.scrollTo(0, 0);
    }
  };

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateViewport);
    window.visualViewport.addEventListener("scroll", updateViewport);
  }
}

function safeOn(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

window.closeAllModals = function () {
  document.querySelectorAll(".modal-backdrop:not(#customDialogModal)").forEach(m => m.classList.add("hidden"));
};

window.openModal = function (id) {
  window.closeAllModals();
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove("hidden");
    pushAppHistoryState();
  }
};

window.closeModal = function (id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
};

window.openPlayModeSelect = function () {
  openModal("playModeSelectModal");
};

window.selectSinglePlay = function () {
  closeModal("playModeSelectModal");
  showSetup();
};

window.selectMultiPlay = function () {
  closeModal("playModeSelectModal");
  enterPlazaScreen();
};

window.openRankingModal = function () {
  openModal("rankingModal");
  if (typeof loadRankingsList === "function") loadRankingsList();
};

// 기본 폰트: 기본 고딕 (토글 시 도트 폰트와 전환)
window.toggleFontStyle = function () {
  document.body.classList.toggle("use-pixel-font");
  const isPixel = document.body.classList.contains("use-pixel-font");
  const statusEl = document.getElementById("fontStyleStatus");
  if (statusEl) statusEl.textContent = isPixel ? "도트 폰트" : "기본 고딕 (기본)";
};

window.toggleFullscreenMode = function () {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
};

// ============================================================================
// 모바일 물리 '뒤로가기' 버튼 앱 종료 방지 트랩
// ============================================================================
function pushAppHistoryState() {
  try {
    history.pushState({ mkScreen: state.currentScreen, ts: Date.now() }, "");
  } catch (e) {}
}

window.addEventListener("popstate", () => {
  const dialog = document.getElementById("customDialogModal");
  if (dialog && !dialog.classList.contains("hidden")) {
    dialog.classList.add("hidden");
    pushAppHistoryState();
    return;
  }

  const battleModal = document.getElementById("battleRoomModal");
  if (battleModal && !battleModal.classList.contains("hidden")) {
    leaveBattleRoom();
    pushAppHistoryState();
    return;
  }

  const openModals = Array.from(document.querySelectorAll(".modal-backdrop:not(.hidden)"));
  if (openModals.length > 0) {
    window.closeAllModals();
    pushAppHistoryState();
    return;
  }

  if (["setupScreen", "plazaScreen", "resultScreen", "shopScreen"].includes(state.currentScreen)) {
    showHome();
    pushAppHistoryState();
    return;
  }

  if (["gameScreen", "judgeScreen"].includes(state.currentScreen)) {
    gameConfirm("진행 중인 게임을 중단하고 설정 화면으로 나갈까요?", () => {
      showSetup();
    });
    pushAppHistoryState();
    return;
  }

  if (state.currentScreen === "homeScreen") {
    pushAppHistoryState();
    gameConfirm("로그아웃하고 로그인 화면으로 돌아가시겠습니까?", () => {
      showLoginScreen();
    }, "👑 음악왕 종료/로그아웃");
    return;
  }

  pushAppHistoryState();
});

// ============================================================================
// 문제 데이터 및 정답 판정
// ============================================================================
function getAllQuestions() {
  return QUESTIONS_DB;
}

function getFilteredQuestions() {
  return getAllQuestions().filter(q => {
    if (!state.decades.has(q.decade)) return false;
    if (state.hardMode && !q.hardMode) return false;
    return true;
  });
}

function normalizeAnswer(str) {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .replace(/[\s\.\,\!\?\-\_\~\'\"\(\)\[\]\{\}\:\;\/\\&]/g, "");
}

function isArtistMatch(userInput, q) {
  const normUser = normalizeAnswer(userInput);
  if (!normUser) return false;
  const candidates = [q.artist, ...(q.artistAliases || [])];
  return candidates.some(c => normalizeAnswer(c) === normUser);
}

function isTitleMatch(userInput, q) {
  const normUser = normalizeAnswer(userInput);
  if (!normUser) return false;
  const candidates = [q.title, ...(q.titleAliases || [])];
  return candidates.some(c => normalizeAnswer(c) === normUser);
}

function buildLetterBoxHint(text) {
  const trimmed = text.trim();
  const boxes = Array.from(trimmed)
    .map(ch => (ch === " " ? " " : "□"))
    .join("");
  const charCount = trimmed.replace(/\s+/g, "").length;
  return `${boxes}(${charCount}자)`;
}

async function fetchItunesTrack(q) {
  if (state.itunesCache.has(q.id)) {
    return state.itunesCache.get(q.id);
  }

  const query = encodeURIComponent(q.itunesQuery || `${q.artist} ${q.title}`);
  const urls = [
    `https://itunes.apple.com/search?term=${query}&country=KR&entity=song&limit=5`,
    `https://itunes.apple.com/search?term=${query}&country=US&entity=song&limit=5`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const track = data.results.find(r => r.previewUrl) || data.results[0];
        if (track && track.previewUrl) {
          const info = {
            previewUrl: track.previewUrl,
            artworkUrl: (track.artworkUrl100 || "").replace("100x100bb", "300x300bb"),
            trackName: track.trackName,
            artistName: track.artistName
          };
          state.itunesCache.set(q.id, info);
          return info;
        }
      }
    } catch (err) {}
  }

  const fallback = { previewUrl: null, artworkUrl: "" };
  state.itunesCache.set(q.id, fallback);
  return fallback;
}

function stopAudio() {
  if (state.audioStopTimer) {
    clearTimeout(state.audioStopTimer);
    state.audioStopTimer = null;
  }
  try {
    state.audioEl.pause();
  } catch (e) {}
  const disc = document.getElementById("vinylDisc");
  if (disc) disc.classList.remove("spinning");
}

function stopTimeAttackTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function startTimeAttackTimer() {
  stopTimeAttackTimer();
  const wrap = document.getElementById("timerBarWrap");
  const fill = document.getElementById("timerBarFill");
  if (!state.timeAttack) {
    if (wrap) wrap.classList.add("hidden");
    return;
  }

  wrap.classList.remove("hidden");
  state.timeLeftMs = state.maxTimeMs;
  fill.style.width = "100%";

  state.timerInterval = setInterval(() => {
    if (state.questionEnded) {
      stopTimeAttackTimer();
      return;
    }
    state.timeLeftMs -= 100;
    const pct = Math.max(0, (state.timeLeftMs / state.maxTimeMs) * 100);
    fill.style.width = `${pct}%`;

    if (state.timeLeftMs <= 0) {
      stopTimeAttackTimer();
      finalizeQuestion(false, "⏱️ 시간 초과! (타임어택 15초 경과)");
    }
  }, 100);
}

async function playAudioSnippet(durationSec, startOffsetSec = 6) {
  stopAudio();
  const q = state.currentQ;
  if (!q) return;

  const statusEl = document.getElementById("audioStatusText");
  if (statusEl) statusEl.textContent = "음원 불러오는 중...";

  const track = await fetchItunesTrack(q);
  if (!track || !track.previewUrl) {
    if (statusEl) statusEl.textContent = "⚠️ 미리듣기 음원을 찾을 수 없습니다.";
    gameAlert("이 곡의 미리듣기 음원을 불러올 수 없습니다.");
    return;
  }

  try {
    if (state.audioEl.src !== track.previewUrl) {
      state.audioEl.src = track.previewUrl;
      await new Promise((resolve, reject) => {
        const cleanup = () => {
          state.audioEl.removeEventListener("loadedmetadata", onLoaded);
          state.audioEl.removeEventListener("error", onError);
        };
        const onLoaded = () => { cleanup(); resolve(); };
        const onError = e => { cleanup(); reject(e); };
        state.audioEl.addEventListener("loadedmetadata", onLoaded);
        state.audioEl.addEventListener("error", onError);
        state.audioEl.load();
      });
    }

    const safeOffset = Math.min(startOffsetSec, Math.max(0, (state.audioEl.duration || 29) - durationSec - 1));
    state.audioEl.currentTime = safeOffset;

    const disc = document.getElementById("vinylDisc");
    if (disc) disc.classList.add("spinning");
    if (statusEl) statusEl.textContent = `🔊 ${durationSec}초 재생 중...`;

    await state.audioEl.play();

    state.audioStopTimer = setTimeout(() => {
      state.audioEl.pause();
      if (disc) disc.classList.remove("spinning");
      if (statusEl) statusEl.textContent = `✅ ${durationSec}초 재생 완료!`;
    }, durationSec * 1000);
  } catch (err) {
    if (statusEl) statusEl.textContent = "⚠️ 오디오 재생 버튼을 다시 눌러주세요.";
  }
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ============================================================================
// 화면 전환
// ============================================================================
window.switchScreen = function (targetId) {
  stopAudio();
  stopTimeAttackTimer();
  window.closeAllModals();

  state.currentScreen = targetId;
  pushAppHistoryState();

  const headerEl = document.getElementById("topHeader");
  if (headerEl) {
    headerEl.classList.toggle("hidden", targetId === "loginScreen" || targetId === "shopScreen");
  }

  ["loginScreen", "homeScreen", "setupScreen", "gameScreen", "judgeScreen", "resultScreen", "plazaScreen", "shopScreen"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", id !== targetId);
  });
};

window.showLoginScreen = function () {
  switchScreen("loginScreen");
  updateHeaderUserUI();
};

window.showHome = function () {
  updateHeaderUserUI();
  switchScreen("homeScreen");
};

window.showSetup = function () {
  updateLobbyCounts();
  switchScreen("setupScreen");
};

window.updateLobbyCounts = function () {
  const filtered = getFilteredQuestions();
  const countBadge = document.getElementById("availablePoolCount");
  if (countBadge) {
    countBadge.textContent = `${state.hardMode ? "🔥하드모드 " : ""}총 ${filtered.length}문제`;
  }
};

function initEvents() {
  setupMobileKeyboardViewportHandler();
  pushAppHistoryState();
  updateHeaderUserUI();

  safeOn("headerMyProfileTrigger", "click", openMyProfileModal);
  safeOn("headerCdBtn", "click", openShopModal);
  safeOn("openPatchBtn", "click", () => openModal("patchNotesModal"));
  safeOn("openSettingsBtn", "click", () => openModal("settingsModal"));
  safeOn("enterSetupBtn", "click", openPlayModeSelect);
  safeOn("setupBackHomeBtn", "click", showHome);

  safeOn("volumeSlider", "input", e => {
    state.audioEl.volume = Number(e.target.value);
  });

  document.querySelectorAll("[data-decade]").forEach(el => {
    el.addEventListener("click", () => {
      const dec = el.getAttribute("data-decade");
      if (state.decades.has(dec)) {
        if (state.decades.size > 1) state.decades.delete(dec);
      } else {
        state.decades.add(dec);
      }
      syncDecadeChips();
      updateLobbyCounts();
    });
  });

  document.querySelectorAll("[data-mode]").forEach(el => {
    el.addEventListener("click", () => {
      state.mode = el.getAttribute("data-mode");
      document.querySelectorAll("[data-mode]").forEach(c => c.classList.remove("active"));
      el.classList.add("active");
    });
  });

  document.querySelectorAll("[data-stage]").forEach(el => {
    el.addEventListener("click", () => {
      state.stage = Number(el.getAttribute("data-stage"));
      document.querySelectorAll("[data-stage]").forEach(c => c.classList.remove("active"));
      el.classList.add("active");
    });
  });

  document.querySelectorAll("[data-limit]").forEach(el => {
    el.addEventListener("click", () => {
      const val = el.getAttribute("data-limit");
      state.questionLimit = val === "infinite" ? "infinite" : Number(val);
      document.querySelectorAll("[data-limit]").forEach(c => c.classList.remove("active"));
      el.classList.add("active");
    });
  });

  safeOn("toggleTimeAttackBtn", "click", () => {
    state.timeAttack = !state.timeAttack;
    const btn = document.getElementById("toggleTimeAttackBtn");
    if (btn) btn.classList.toggle("active-time", state.timeAttack);
    const txt = document.getElementById("timeAttackStateText");
    if (txt) txt.textContent = state.timeAttack ? "ON (15초)" : "OFF";
  });

  safeOn("toggleHardModeBtn", "click", () => {
    state.hardMode = !state.hardMode;
    const btn = document.getElementById("toggleHardModeBtn");
    if (btn) btn.classList.toggle("active-hard", state.hardMode);
    const txt = document.getElementById("hardModeStateText");
    if (txt) txt.textContent = state.hardMode ? "ON" : "OFF";
    updateLobbyCounts();
  });

  safeOn("startGameBtn", "click", startGame);
  safeOn("backToLobbyBtn", "click", showSetup);
  safeOn("restartSameBtn", "click", startGame);
  safeOn("resultToLobbyBtn", "click", showHome);
  safeOn("shareResultBtn", "click", shareResultImage);

  safeOn("hintLetterBtn", "click", useLetterHint);
  safeOn("hintKeywordBtn", "click", useKeywordHint);
  safeOn("hintAudioBtn", "click", useAudioHint);
  safeOn("submitAnswerBtn", "click", checkUserAnswer);
  safeOn("skipQuestionBtn", "click", skipQuestion);
  safeOn("nextQuestionBtn", "click", nextQuestion);

  ["artistInput", "titleInput"].forEach(id => {
    safeOn(id, "keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        checkUserAnswer();
      }
    });
  });

  syncDecadeChips();
  updateLobbyCounts();
  window.closeAllModals();
  showLoginScreen();

  if (typeof restoreSupabaseSession === "function") {
    restoreSupabaseSession();
  }
}

function syncDecadeChips() {
  document.querySelectorAll("[data-decade]").forEach(el => {
    const dec = el.getAttribute("data-decade");
    el.classList.toggle("active", state.decades.has(dec));
  });
}

// ============================================================================
// 게임 시작 및 진행
// ============================================================================
window.startGame = function () {
  stopAudio();
  const candidates = getFilteredQuestions();
  if (candidates.length === 0) {
    gameAlert("선택한 조건에 해당하는 문제가 없습니다.");
    return;
  }

  const shuffled = shuffleArray(candidates);
  state.pool =
    state.questionLimit === "infinite"
      ? shuffled
      : shuffled.slice(0, Math.min(state.questionLimit, shuffled.length));

  state.currentIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.hearts = 5;
  state.history = [];

  loadCurrentQuestion();
};

function loadCurrentQuestion() {
  switchScreen("gameScreen");
  const q = state.pool[state.currentIndex];
  state.currentQ = q;
  state.usedHintLetter = false;
  state.usedHintKeyword = false;
  state.usedHintAudio = false;
  state.questionEnded = false;
  state.oneSecOffsetIndex = 0;

  fetchItunesTrack(q);

  const modeNames = { behind: "비하인드", lyrics: "가사", onesec: "1초듣기" };
  const stageNames = { 1: "1단계·노래", 2: "2단계·가수", 3: "3단계·모두" };

  document.getElementById("badgeDecade").textContent = `${q.year}년`;
  document.getElementById("badgeMode").textContent = modeNames[state.mode];
  document.getElementById("badgeStage").textContent = stageNames[state.stage];
  document.getElementById("badgeTimeAttack").classList.toggle("hidden", !state.timeAttack);

  document.getElementById("progressText").textContent = `${state.currentIndex + 1}/${state.pool.length}`;
  document.getElementById("scoreText").textContent = `${state.score}점`;

  const heartsEl = document.getElementById("heartsDisplay");
  if (state.questionLimit === "infinite") {
    heartsEl.classList.remove("hidden");
    heartsEl.textContent = `❤️${state.hearts}`;
  } else {
    heartsEl.classList.add("hidden");
  }

  const givenBanner = document.getElementById("givenInfoBanner");
  if (state.stage === 1) {
    givenBanner.innerHTML = `<span>🎤 가수 힌트</span><strong>${q.artist}</strong>`;
  } else if (state.stage === 2) {
    givenBanner.innerHTML = `<span>🎯 목표</span><strong>이 곡의 가수를 맞히세요!</strong>`;
  } else {
    givenBanner.innerHTML = `<span>🎯 목표</span><strong>가수와 노래 제목 모두 입력</strong>`;
  }

  const qContent = document.getElementById("questionContent");
  const oneSecBox = document.getElementById("oneSecContainer");
  const qTypeTag = document.getElementById("questionTypeTag");

  if (state.mode === "behind") {
    qTypeTag.textContent = state.hardMode ? "🔥 하드모드 비하인드 퀴즈" : "💡 비하인드 스토리 퀴즈";
    qContent.className = "question-content";
    qContent.textContent = q.behindQuestion;
    qContent.classList.remove("hidden");
    oneSecBox.classList.add("hidden");
  } else if (state.mode === "lyrics") {
    qTypeTag.textContent = "🎶 하이라이트 가사 보고 맞히기";
    qContent.className = "question-content lyrics-style";
    qContent.innerHTML = `" ${q.lyricsQuestion.replace(/\//g, "<br>")} "`;
    qContent.classList.remove("hidden");
    oneSecBox.classList.add("hidden");
  } else {
    qTypeTag.textContent = "⚡ 1초 듣고 맞히기";
    qContent.classList.add("hidden");
    oneSecBox.classList.remove("hidden");
    document.getElementById("audioStatusText").textContent = "아래 [▶ 1초 듣기] 버튼을 눌러주세요!";
  }

  const btnLetter = document.getElementById("hintLetterBtn");
  const btnKeyword = document.getElementById("hintKeywordBtn");
  const btnAudio = document.getElementById("hintAudioBtn");

  btnLetter.disabled = false;
  btnLetter.classList.remove("used");
  btnKeyword.disabled = false;
  btnKeyword.classList.remove("used");

  if (state.mode === "onesec") {
    btnAudio.classList.add("hidden");
  } else {
    btnAudio.classList.remove("hidden");
    btnAudio.disabled = false;
    btnAudio.classList.remove("used");
  }

  document.getElementById("hintsDisplay").innerHTML = "";

  const artistGroup = document.getElementById("artistInputGroup");
  const titleGroup = document.getElementById("titleInputGroup");
  const artistInput = document.getElementById("artistInput");
  const titleInput = document.getElementById("titleInput");

  artistInput.value = "";
  titleInput.value = "";

  if (state.stage === 1) {
    artistGroup.classList.add("hidden");
    titleGroup.classList.remove("hidden");
  } else if (state.stage === 2) {
    artistGroup.classList.remove("hidden");
    titleGroup.classList.add("hidden");
  } else {
    artistGroup.classList.remove("hidden");
    titleGroup.classList.remove("hidden");
  }

  startTimeAttackTimer();
}

window.playOneSecMain = function () {
  const offsets = [6, 12, 18];
  const offset = offsets[state.oneSecOffsetIndex % offsets.length];
  playAudioSnippet(1.0, offset);
};

window.playOneSecAltOffset = function () {
  state.oneSecOffsetIndex++;
  const offsets = [6, 12, 18];
  const offset = offsets[state.oneSecOffsetIndex % offsets.length];
  playAudioSnippet(1.0, offset);
};

function useLetterHint() {
  if (state.usedHintLetter || state.questionEnded) return;
  state.usedHintLetter = true;
  const q = state.currentQ;

  const btn = document.getElementById("hintLetterBtn");
  btn.classList.add("used");
  btn.disabled = true;

  let text = "";
  if (state.stage === 1) {
    text = `노래: <span class="letter-boxes">${buildLetterBoxHint(q.title)}</span>`;
  } else if (state.stage === 2) {
    text = `가수: <span class="letter-boxes">${buildLetterBoxHint(q.artist)}</span>`;
  } else {
    text = `가수 <span class="letter-boxes">${buildLetterBoxHint(q.artist)}</span> / 노래 <span class="letter-boxes">${buildLetterBoxHint(q.title)}</span>`;
  }

  appendHintBox("🔤 글자수", text);
}

function useKeywordHint() {
  if (state.usedHintKeyword || state.questionEnded) return;
  state.usedHintKeyword = true;
  const q = state.currentQ;

  const btn = document.getElementById("hintKeywordBtn");
  btn.classList.add("used");
  btn.disabled = true;

  appendHintBox("🔑 포인트 단어", `<strong>${q.keywordHint}</strong>`);
}

function useAudioHint() {
  if (state.mode === "onesec" || state.questionEnded) return;
  if (!state.usedHintAudio) {
    state.usedHintAudio = true;
    const btn = document.getElementById("hintAudioBtn");
    btn.classList.add("used");
    appendHintBox("🎧 노래 힌트", "2.5초 하이라이트 재생됨");
  }
  playAudioSnippet(2.5, 8);
}

function appendHintBox(label, htmlContent) {
  const container = document.getElementById("hintsDisplay");
  const box = document.createElement("div");
  box.className = "hint-box";
  box.innerHTML = `<span>${label}</span><span>${htmlContent}</span>`;
  container.appendChild(box);
}

function checkUserAnswer() {
  if (state.questionEnded) return;
  const q = state.currentQ;
  const artistVal = document.getElementById("artistInput").value.trim();
  const titleVal = document.getElementById("titleInput").value.trim();

  if (state.stage === 1 && !titleVal) {
    gameAlert("노래 제목을 입력해주세요!");
    return;
  }
  if (state.stage === 2 && !artistVal) {
    gameAlert("가수 이름을 입력해주세요!");
    return;
  }
  if (state.stage === 3 && (!artistVal || !titleVal)) {
    gameAlert("3단계는 가수 이름과 노래 제목을 모두 입력해야 합니다!");
    return;
  }

  const artistOk = state.stage === 1 ? true : isArtistMatch(artistVal, q);
  const titleOk = state.stage === 2 ? true : isTitleMatch(titleVal, q);
  const isCorrect = artistOk && titleOk;

  let userSubmitSummary = "";
  if (state.stage === 1) userSubmitSummary = `내 입력: ${titleVal}`;
  else if (state.stage === 2) userSubmitSummary = `내 입력: ${artistVal}`;
  else userSubmitSummary = `내 입력: ${artistVal} - ${titleVal}`;

  finalizeQuestion(isCorrect, userSubmitSummary);
}

function skipQuestion() {
  if (state.questionEnded) return;
  finalizeQuestion(false, "내 선택: 패스 (모르겠어요)");
}

async function finalizeQuestion(isCorrect, userSubmitSummary) {
  state.questionEnded = true;
  stopAudio();
  stopTimeAttackTimer();
  const q = state.currentQ;

  let gained = 0;
  if (isCorrect) {
    gained = 100;
    if (state.usedHintLetter) gained -= 15;
    if (state.usedHintKeyword) gained -= 15;
    if (state.usedHintAudio) gained -= 20;
    if (state.stage === 3) gained += 20;
    if (state.timeAttack) gained *= 2;
    state.score += gained;
    state.streak++;
  } else {
    state.streak = 0;
    if (state.questionLimit === "infinite") {
      state.hearts--;
    }
  }

  state.history.push({ q, correct: isCorrect, gained });

  const judgeCard = document.getElementById("judgeCard");
  const statusPill = document.getElementById("judgeStatusPill");
  const submitInfo = document.getElementById("judgeUserSubmitInfo");

  judgeCard.classList.toggle("is-correct", isCorrect);
  judgeCard.classList.toggle("is-wrong", !isCorrect);

  if (isCorrect) {
    statusPill.textContent = `⭕ 정답입니다! (+${gained}점${state.timeAttack ? " · 타임어택×2" : ""})`;
  } else {
    statusPill.textContent =
      state.questionLimit === "infinite" && state.hearts <= 0
        ? "💔 오답! 하트를 모두 소진했습니다"
        : "❌ 아쉽네요! 오답입니다";
  }

  submitInfo.textContent = userSubmitSummary;
  document.getElementById("revealTitle").textContent = `${q.artist} - ${q.title}`;
  document.getElementById("revealAliases").textContent =
    q.artistAliases && q.artistAliases.length > 0
      ? `${q.year}년 발매 · 인정 답안: ${[q.artist, ...q.artistAliases].join(", ")}`
      : `${q.year}년 발매 (${q.decade.replace("s", "년대")})`;
  document.getElementById("revealNote").textContent = q.behindAnswerNote || q.behindQuestion;

  const thumb = document.getElementById("revealThumb");
  thumb.src =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%23eef2ff'/><text x='50%' y='54%' font-size='28' text-anchor='middle'>🎵</text></svg>";

  switchScreen("judgeScreen");

  const nextBtn = document.getElementById("nextQuestionBtn");
  const isLast =
    state.currentIndex + 1 >= state.pool.length ||
    (state.questionLimit === "infinite" && state.hearts <= 0);
  nextBtn.textContent = isLast ? "🏆 최종 결과 보기 ➔" : "다음 문제 넘어가기 ➔";

  const track = await fetchItunesTrack(q);
  if (track && track.artworkUrl) {
    thumb.src = track.artworkUrl;
  }
}

window.playFullPreviewInReveal = function () {
  playAudioSnippet(10, 5);
};

function nextQuestion() {
  stopAudio();
  const isGameOver =
    state.currentIndex + 1 >= state.pool.length ||
    (state.questionLimit === "infinite" && state.hearts <= 0);

  if (isGameOver) {
    showFinalResult();
  } else {
    state.currentIndex++;
    loadCurrentQuestion();
  }
}

async function showFinalResult() {
  switchScreen("resultScreen");

  const solvedCount = state.history.filter(h => h.correct).length;
  const totalTried = state.history.length;
  const accuracy = totalTried > 0 ? Math.round((solvedCount / totalTried) * 100) : 0;

  let rankTitle = "🎧 음악 입문자";
  if (accuracy >= 90 && solvedCount >= 8) rankTitle = "👑 전설의 음악왕";
  else if (accuracy >= 75) rankTitle = "🔥 가요계 척척박사";
  else if (accuracy >= 50) rankTitle = "🎶 음악 고수";

  document.getElementById("finalRankTitle").textContent = rankTitle;
  document.getElementById("finalScoreText").textContent = `총점 ${state.score}점 (정답 ${solvedCount}/${totalTried} · ${accuracy}%)`;

  const decadeStr =
    state.decades.size === 4
      ? "전연대(90~20s)"
      : Array.from(state.decades)
          .map(d => d.replace("s", "년대"))
          .join("·");
  const modeStr = { behind: "📖비하인드", lyrics: "📝가사", onesec: "⚡1초듣기" }[state.mode];
  const stageStr = `${state.stage}단계(${state.stage === 1 ? "노래" : state.stage === 2 ? "가수" : "가수+노래"})`;
  const limitStr = state.questionLimit === "infinite" ? "🔥무한도전" : `${state.questionLimit}문제`;

  const specsBar = document.getElementById("clearedSpecsBar");
  specsBar.innerHTML = `
    <span class="badge primary">${decadeStr}</span>
    <span class="badge accent">${modeStr}</span>
    <span class="badge">${stageStr}</span>
    <span class="badge">${limitStr}</span>
    ${state.timeAttack ? `<span class="badge gold">⏱️타임어택×2</span>` : ""}
    ${state.hardMode ? `<span class="badge" style="background:#fff1f2; color:#be123c; border-color:#f43f5e;">🔥하드모드</span>` : ""}
  `;

  const earnedCd = Math.max(solvedCount > 0 ? 5 : 0, Math.floor(state.score / 10));
  document.getElementById("finalCdEarnedText").textContent = `💿 획득 보상: +${earnedCd} CD 지급 완료! (보유: ${userState.cdCoins + earnedCd} CD)`;
  if (earnedCd > 0) {
    await addCdCoins(earnedCd);
  }

  if (state.score > 0 && typeof submitScoreToRanking === "function") {
    await submitScoreToRanking({
      decadeFilter: decadeStr,
      mode: state.mode,
      stage: state.stage,
      limit: state.questionLimit,
      timeAttack: state.timeAttack,
      score: state.score,
      accuracy
    });
  }

  const listEl = document.getElementById("historyList");
  listEl.innerHTML = state.history
    .map(
      (item, idx) => `
      <div class="hint-box" style="background:${item.correct ? "#ecfdf5" : "#fff1f2"}; border-color:${item.correct ? "#a7f3d0" : "#fecdd3"}; color:var(--text-main);">
        <span><strong>#${idx + 1}</strong> [${item.q.year}] ${item.q.artist} - ${item.q.title}</span>
        <span style="font-weight:800; color:${item.correct ? "var(--success)" : "var(--danger)"};">${item.correct ? "⭕ 정답" : "❌ 오답"}</span>
      </div>
    `
    )
    .join("");
}

async function shareResultImage() {
  const target = document.getElementById("resultCaptureTarget");
  const bottomBtns = document.getElementById("resultBottomActions");
  if (!target || typeof html2canvas === "undefined") {
    gameAlert("캡처 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
    return;
  }

  try {
    bottomBtns.classList.add("hidden");
    const canvas = await html2canvas(target, {
      backgroundColor: "#ffffff",
      scale: 2
    });
    bottomBtns.classList.remove("hidden");

    canvas.toBlob(async blob => {
      if (!blob) return;
      const file = new File([blob], "music_king_result.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: "대한민국 음악왕 결과",
            text: document.getElementById("finalScoreText").textContent,
            files: [file]
          });
          return;
        } catch (e) {}
      }

      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        gameAlert("📸 결과 화면이 클립보드에 이미지로 복사되었습니다!\n메신저 채팅창에 바로 붙여넣기(Ctrl+V) 해보세요!");
      } catch (clipErr) {
        const link = document.createElement("a");
        link.download = `음악왕_결과_${Date.now()}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        gameAlert("📸 결과 화면 캡처 이미지가 저장되었습니다!");
      }
    }, "image/png");
  } catch (err) {
    bottomBtns.classList.remove("hidden");
    gameAlert("화면 캡처 중 오류가 발생했습니다.");
  }
}

document.addEventListener("DOMContentLoaded", initEvents);
