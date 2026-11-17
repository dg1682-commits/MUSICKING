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
  audioRequestSeq: 0,
  audioUnlocked: false,
  audioPending: false,
  itunesCache: new Map(),
  oneSecOffsetIndex: 0,
  resultPlayingIndex: null,
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
      ".question-content, .judge-note-box, .history-scroll-box, .modal-content, .md-preview-scroll, .setup-card, .shop-grid, .apf-tile-grid, .shop-multibuy-list, #roomChatLog, .kakao-friend-list, .kakao-chat-messages, body.keyboard-open #gameScreen, body.keyboard-open #battlePlayScreen, textarea, input[type='range']"
    );
    if (!scrollable) {
      e.preventDefault();
    }
  },
  { passive: false }
);

// 상점 그리드 고스트 스크롤 (스크롤할 때만 얇은 스크롤바 표시)
document.addEventListener("DOMContentLoaded", () => {
  const shopGrid = document.getElementById("shopItemsGrid");
  if (shopGrid) {
    let scrollTimer = null;
    shopGrid.addEventListener("scroll", () => {
      shopGrid.classList.add("is-scrolling");
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => shopGrid.classList.remove("is-scrolling"), 750);
    }, { passive: true });
  }
});

// Standalone/APK 앱 모드인지 판별 (앱 모드 및 일반 터치 시 크롬의 '전체 화면 종료 스와이프 도움말' 토스트가 강제 노출되지 않도록 자동 requestFullscreen 제거)
function isRunningAsApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true ||
    document.referrer.includes("android-app://")
  );
}

// ============================================================================
// 모바일 키보드 올라올 때 허공 밀림·찌그러짐 원천 차단 동적 뷰포트 제어
// ============================================================================
function setupMobileKeyboardViewportHandler() {
  const shell = document.querySelector(".app-shell");
  if (!shell) return;

  let baseHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

  const updateViewport = () => {
    if (window.visualViewport) {
      const vv = window.visualViewport;
      if (vv.height > baseHeight) baseHeight = vv.height;

      // 브라우저가 화면을 위로 밀어 올리더라도 offsetTop과 height를 정확히 추적해 빈 허공이 절대 안 생기게 고정!
      shell.style.top = `${vv.offsetTop}px`;
      shell.style.height = `${vv.height}px`;

      const isInputFocused =
        document.activeElement &&
        ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);

      if (baseHeight - vv.height > 110 || (isInputFocused && baseHeight - vv.height > 60)) {
        document.body.classList.add("keyboard-open");
        if (state.currentScreen === "dmChatScreen") {
          const dmList = document.getElementById("dmChatMessages");
          if (dmList) dmList.scrollTop = dmList.scrollHeight;
        } else if (state.currentScreen === "battleRoomScreen") {
          const roomChat = document.getElementById("roomChatLog");
          if (roomChat) roomChat.scrollTop = roomChat.scrollHeight;
        }
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
  document.addEventListener("focusin", () => {
    setTimeout(updateViewport, 80);
    setTimeout(updateViewport, 280);
  });
  document.addEventListener("focusout", () => {
    setTimeout(updateViewport, 100);
  });
}

function safeOn(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

window.closeAllModals = function () {
  document.querySelectorAll(".modal-backdrop:not(#customDialogModal)").forEach(m => m.classList.add("hidden"));
  const confettiCv = document.getElementById("confettiCanvas");
  if (confettiCv) confettiCv.classList.add("hidden");
};

window.openModal = function (id) {
  window.closeAllModals();
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove("hidden");
    armAppBackGuard(false);
  }
};

window.closeModal = function (id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
};

window.openMultiModeSelect = function () {
  openModal("multiModeSelectModal");
};

window.selectSinglePlay = function () {
  closeModal("multiModeSelectModal");
  showSetup();
};

window.selectMultiRoomMode = function (roomType = "ALL") {
  closeModal("multiModeSelectModal");
  if (typeof plazaState !== "undefined") {
    plazaState.roomFilter = ["1v1", "4p", "ALL"].includes(roomType) ? roomType : "ALL";
  }
  if (typeof enterPlazaScreen === "function") {
    enterPlazaScreen();
  }
};

window.openRankingModal = function () {
  switchScreen("rankingScreen");
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
// 모바일 물리 '뒤로가기' 종료 · 로그인 회귀 방지 · 백그라운드 사운드 완전 정지
// ============================================================================
let allowAppExit = false;
let appExited = false;
let hasBackGuardPushed = false;

function resetHistoryToExitBase() {
  hasBackGuardPushed = false;
  try {
    history.replaceState({ mkRole: "exit_base", mkScreen: state.currentScreen, ts: Date.now() }, "");
  } catch (e) {}
}

window.resetHistoryToExitBase = resetHistoryToExitBase;

window.armAppBackGuard = function (forceWithGesture = false) {
  if (appExited || hasBackGuardPushed || state.currentScreen === "loginScreen") return;
  const hasActivation =
    forceWithGesture || (typeof navigator !== "undefined" && navigator.userActivation && navigator.userActivation.hasBeenActive);
  if (!hasActivation) return;
  try {
    history.replaceState({ mkRole: "exit_base", mkScreen: state.currentScreen, ts: Date.now() }, "");
    history.pushState({ mkRole: "app_guard", mkScreen: state.currentScreen, ts: Date.now() }, "");
    hasBackGuardPushed = true;
  } catch (e) {}
};

function stopAllAppAudio(releaseSources = false) {
  stopAudio();
  stopTimeAttackTimer();
  try {
    bgmState.mainAudio.pause();
    bgmState.shopAudio.pause();
    if (releaseSources) {
      bgmState.mainAudio.currentTime = 0;
      bgmState.shopAudio.currentTime = 0;
      bgmState.mainAudio.removeAttribute("src");
      bgmState.shopAudio.removeAttribute("src");
      bgmState.mainAudio.load();
      bgmState.shopAudio.load();
    }
    (bgmState.clickPool || []).forEach(a => {
      try {
        a.pause();
        a.currentTime = 0;
      } catch (e) {}
    });
    if (releaseSources && state.audioEl) {
      state.audioEl.currentTime = 0;
      state.audioEl.removeAttribute("src");
      state.audioEl.load();
    }
  } catch (e) {}
}
window.stopAllAppAudio = stopAllAppAudio;

function performCleanAppExit() {
  appExited = true;
  allowAppExit = true;
  hasBackGuardPushed = false;

  stopAllAppAudio(true);
  try {
    if (typeof stopGlobalDmNotiListener === "function") stopGlobalDmNotiListener();
    if (typeof stopDmRealtime === "function") stopDmRealtime();
  } catch (e) {}

  if (!document.getElementById("appExitedOverlay")) {
    const overlay = document.createElement("div");
    overlay.id = "appExitedOverlay";
    overlay.className = "app-exited-overlay";
    overlay.innerHTML =
      `<div style="font-size:2.4rem;">👑</div><h2 style="font-size:1.18rem; font-weight:900;">음악왕이 종료되었습니다</h2><p style="font-size:0.86rem; color:#94a3b8; line-height:1.5;">모든 사운드와 연결이 정지되었습니다.<br/>앱 또는 브라우저 창을 닫아주세요.</p>`;
    document.body.appendChild(overlay);
  }

  try {
    window.close();
  } catch (e) {}
  try {
    history.back();
  } catch (e) {}
}

window.addEventListener("popstate", () => {
  if (appExited || allowAppExit) {
    stopAllAppAudio(true);
    return;
  }

  hasBackGuardPushed = false;

  const dialog = document.getElementById("customDialogModal");
  if (dialog && !dialog.classList.contains("hidden")) {
    if (dialog.dataset.isExitConfirm === "true") {
      // 종료 확인 창이 열린 상태에서 뒤로가기를 한 번 더 누르면 모달만 닫지 않고 종료를 원할 수 있으므로 확인창 유지/재무장
      dialog.classList.add("hidden");
      delete dialog.dataset.isExitConfirm;
      armAppBackGuard(true);
      return;
    }
    dialog.classList.add("hidden");
    armAppBackGuard(true);
    return;
  }

  const openModals = Array.from(document.querySelectorAll(".modal-backdrop:not(.hidden)"));
  if (openModals.length > 0) {
    window.closeAllModals();
    armAppBackGuard(true);
    return;
  }

  if (state.currentScreen === "battlePlayScreen") {
    if (typeof confirmExitOnlineBattle === "function") confirmExitOnlineBattle();
    armAppBackGuard(true);
    return;
  }

  if (state.currentScreen === "battleRoomScreen") {
    leaveBattleRoom();
    armAppBackGuard(true);
    return;
  }

  if (state.currentScreen === "dmChatScreen") {
    switchScreen("socialScreen");
    if (typeof loadFriendsData === "function") loadFriendsData();
    armAppBackGuard(true);
    return;
  }

  if (["setupScreen", "plazaScreen", "resultScreen", "shopScreen", "rankingScreen", "socialScreen"].includes(state.currentScreen)) {
    showHome();
    armAppBackGuard(true);
    return;
  }

  if (["gameScreen", "judgeScreen"].includes(state.currentScreen)) {
    confirmExitSingleGame();
    armAppBackGuard(true);
    return;
  }

  if (state.currentScreen === "homeScreen") {
    const dlg = document.getElementById("customDialogModal");
    if (dlg) dlg.dataset.isExitConfirm = "true";
    gameConfirm(
      "음악왕을 종료하고 나가시겠습니까?",
      () => {
        if (dlg) delete dlg.dataset.isExitConfirm;
        performCleanAppExit();
      },
      "👑 음악왕 종료",
      () => {
        if (dlg) delete dlg.dataset.isExitConfirm;
        armAppBackGuard(true);
      }
    );
    return;
  }
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
  if (typeof normalizeQuizText === "function") return normalizeQuizText(str);
  return str ? str.toString().toLowerCase().trim() : "";
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
  if (typeof buildQuizLetterHint === "function") return buildQuizLetterHint(text);
  return String(text || "").trim();
}

async function fetchItunesTrack(q) {
  if (state.itunesCache.has(q.id)) {
    return state.itunesCache.get(q.id);
  }
  const info =
    typeof fetchItunesSongMeta === "function"
      ? await fetchItunesSongMeta(q.itunesQuery || `${q.artist} ${q.title}`)
      : { previewUrl: null, artworkUrl: "" };
  state.itunesCache.set(q.id, info);
  return info;
}

const SILENT_AUDIO_URI =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

function syncResultPreviewButtons() {
  document.querySelectorAll(".result-preview-btn").forEach(btn => {
    const idx = Number(btn.dataset.histIdx);
    const active = state.resultPlayingIndex === idx && !appExited;
    btn.classList.toggle("is-playing", active);
    btn.textContent = active ? (state.audioPending ? "⏳..." : "⏹ 정지") : "▶ 듣기";
  });
}

function stopAudio() {
  state.audioRequestSeq = (state.audioRequestSeq || 0) + 1;
  state.audioPending = false;
  state.resultPlayingIndex = null;
  if (state.audioStopTimer) {
    clearTimeout(state.audioStopTimer);
    state.audioStopTimer = null;
  }
  try {
    state.audioEl.pause();
  } catch (e) {}
  ["vinylDisc", "battleVinylDisc"].forEach(id => {
    const disc = document.getElementById(id);
    if (disc) disc.classList.remove("spinning");
  });
  syncResultPreviewButtons();
}

function unlockQuizAudio() {
  if (appExited || state.audioUnlocked || !state.audioEl || state.audioPending) return;
  try {
    if (!state.audioEl.paused) return;
    const seqAtStart = state.audioRequestSeq || 0;
    if (!state.audioEl.src) {
      state.audioEl.src = SILENT_AUDIO_URI;
    }
    const p = state.audioEl.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        state.audioUnlocked = true;
        if (state.audioEl.src === SILENT_AUDIO_URI && (state.audioRequestSeq || 0) === seqAtStart && !state.audioPending) {
          try {
            state.audioEl.pause();
          } catch (e) {}
        }
      }).catch(() => {});
    }
  } catch (e) {}
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

async function startAudioStreamAt(previewUrl, startOffsetSec, durationSec, reqId, onBeforePlay, onFinished) {
  if (appExited || reqId !== state.audioRequestSeq) return false;
  if (state.audioEl.src !== previewUrl) {
    state.audioEl.src = previewUrl;
    await new Promise((resolve, reject) => {
      const cleanup = () => {
        state.audioEl.removeEventListener("loadedmetadata", onLoaded);
        state.audioEl.removeEventListener("error", onError);
      };
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = e => {
        cleanup();
        reject(e);
      };
      state.audioEl.addEventListener("loadedmetadata", onLoaded);
      state.audioEl.addEventListener("error", onError);
      state.audioEl.load();
    });
  }

  if (appExited || reqId !== state.audioRequestSeq) return false;

  const safeOffset = Math.min(startOffsetSec, Math.max(0, (state.audioEl.duration || 29) - durationSec - 1));
  state.audioEl.currentTime = safeOffset;
  if (typeof onBeforePlay === "function") onBeforePlay();

  await state.audioEl.play();
  if (appExited || reqId !== state.audioRequestSeq) {
    try {
      state.audioEl.pause();
    } catch (e) {}
    return false;
  }
  state.audioUnlocked = true;
  state.audioPending = false;

  state.audioStopTimer = setTimeout(() => {
    if (reqId !== state.audioRequestSeq) return;
    state.audioEl.pause();
    if (typeof onFinished === "function") onFinished();
  }, durationSec * 1000);
  return true;
}

async function playAudioSnippet(durationSec, startOffsetSec = 6, customQ = null, customDisc = null, customStatus = null, opts = {}) {
  if (appExited) return;
  stopAudio();
  const reqId = state.audioRequestSeq;
  const isAutoPlay = Boolean(opts && opts.isAutoPlay);
  const q = customQ || state.currentQ;
  if (!q) return;

  const disc = customDisc || document.getElementById("vinylDisc");
  const statusEl = customStatus || document.getElementById("audioStatusText");
  if (statusEl) {
    statusEl.textContent = isAutoPlay ? "🎵 1초 음원 자동재생 준비 중..." : "음원 불러오는 중...";
  }

  state.audioPending = true;
  try {
    const track = await fetchItunesTrack(q);
    if (appExited || reqId !== state.audioRequestSeq) return;
    if (!track || !track.previewUrl) {
      if (statusEl) statusEl.textContent = "⚠️ 미리듣기 음원을 찾을 수 없습니다.";
      if (!isAutoPlay) {
        gameAlert("이 곡의 미리듣기 음원을 불러올 수 없습니다.");
      }
      return;
    }

    const played = await startAudioStreamAt(
      track.previewUrl,
      startOffsetSec,
      durationSec,
      reqId,
      () => {
        if (disc) disc.classList.add("spinning");
        if (statusEl) statusEl.textContent = `🔊 ${durationSec}초 재생 중...`;
      },
      () => {
        if (disc) disc.classList.remove("spinning");
        if (statusEl) statusEl.textContent = `✅ ${durationSec}초 재생 완료! (버튼으로 다시 듣기 가능)`;
      }
    );
    if (!played && disc) disc.classList.remove("spinning");
  } catch (err) {
    if (reqId !== state.audioRequestSeq) return;
    if (disc) disc.classList.remove("spinning");
    if (statusEl) {
      statusEl.textContent = isAutoPlay
        ? "🔇 자동재생이 차단되었습니다. [▶ 1초 듣기]를 눌러주세요!"
        : "⚠️ 오디오 재생 버튼을 다시 눌러주세요.";
    }
  } finally {
    if (reqId === state.audioRequestSeq) {
      state.audioPending = false;
    }
  }
}

window.toggleResultSongPreview = async function (idx) {
  if (appExited) return;
  if (state.resultPlayingIndex === idx && (state.audioPending || (state.audioEl && !state.audioEl.paused))) {
    stopAudio();
    return;
  }

  const item = state.history && state.history[idx];
  if (!item || !item.q) return;

  stopAudio();
  const reqId = state.audioRequestSeq;
  state.resultPlayingIndex = idx;
  state.audioPending = true;
  syncResultPreviewButtons();

  try {
    const track = await fetchItunesTrack(item.q);
    if (appExited || reqId !== state.audioRequestSeq) return;
    if (!track || !track.previewUrl) {
      stopAudio();
      gameAlert("이 곡의 미리듣기 음원을 찾을 수 없습니다.");
      return;
    }

    const started = await startAudioStreamAt(
      track.previewUrl,
      5,
      15,
      reqId,
      () => {
        state.audioPending = false;
        syncResultPreviewButtons();
      },
      () => {
        stopAudio();
      }
    );
    if (!started && reqId === state.audioRequestSeq) {
      stopAudio();
    }
  } catch (err) {
    if (reqId === state.audioRequestSeq) {
      stopAudio();
      gameAlert("미리듣기 재생을 시작할 수 없습니다.");
    }
  }
};

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

window.confirmExitSingleGame = function () {
  gameConfirm(
    "지금 나가면 풀던 문제와 현재 점수가 모두 삭제됩니다.\n정말 게임을 중단하고 나가시겠습니까?",
    () => {
      showSetup();
    },
    "⚠️ 게임 중단 경고"
  );
};

// ============================================================================
// 배경음악(BGM) & 모든 버튼 클릭 효과음(bgm/click.wav) 컨트롤
// ============================================================================
const bgmState = {
  mainAudio: new Audio("./bgm/main.mp3"),
  shopAudio: new Audio("./bgm/shop.mp3"),
  clickPool: Array.from({ length: 4 }, () => {
    const a = new Audio("./bgm/click.wav");
    a.volume = 0.45;
    return a;
  }),
  clickIdx: 0,
  muted: localStorage.getItem("mk_bgm_muted") === "true",
  currentType: "none"
};
bgmState.mainAudio.loop = true;
bgmState.mainAudio.volume = 0.22;
bgmState.shopAudio.loop = true;
bgmState.shopAudio.volume = 0.22;

window.playClickSfx = function () {
  if (appExited || document.hidden || bgmState.muted) return;
  try {
    const sfx = bgmState.clickPool[bgmState.clickIdx];
    bgmState.clickIdx = (bgmState.clickIdx + 1) % bgmState.clickPool.length;
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
  } catch (e) {}
};

function isOnlineOneSecRoomActive() {
  return (
    typeof plazaState !== "undefined" &&
    plazaState.currentRoom &&
    plazaState.currentRoom.game_config &&
    plazaState.currentRoom.game_config.mode === "onesec"
  );
}

function shouldSuppressClickSfx(clickable) {
  if (!clickable) return false;
  // 1초 듣기 모드(싱글/온라인 대전)에서는 재생 충돌 방지를 위해 클릭 효과음(click.wav) 무음 처리
  if (state.mode === "onesec") {
    if (clickable.closest("#gameScreen, #judgeScreen")) return true;
    if (clickable.id === "startGameBtn" || clickable.id === "restartSameBtn") return true;
  }
  if (isOnlineOneSecRoomActive()) {
    if (clickable.closest("#battlePlayScreen")) return true;
    if (clickable.id === "battleHostStartBtn") return true;
  }
  return false;
}

// 모든 버튼·탭·칩·리스트 클릭 시 즉시 bgm/click.wav 재생 (1초 듣기 컨텍스트 제외)
document.addEventListener(
  "click",
  e => {
    const clickable = e.target.closest(
      "button, .btn, .header-btn, .option-chip, .apf-tab, .apf-tile, .apf-back-circle, .rank-chip, .pixel-list-item, .kakao-friend-row, .kakao-send-btn, .toggle-banner, .user-profile-trigger, .home-title-pill, .floating-sound-btn, .hint-btn, .auth-check-label"
    );
    if (clickable && !shouldSuppressClickSfx(clickable)) {
      playClickSfx();
    }
  },
  true
);

function syncFloatingSoundBtn(screenId) {
  const btn = document.getElementById("floatingSoundBtn");
  if (!btn) return;
  const showBtn = ["loginScreen", "homeScreen", "rankingScreen", "shopScreen", "socialScreen"].includes(screenId);
  btn.classList.toggle("hidden", !showBtn);
  btn.textContent = bgmState.muted ? "🔇" : "🔊";
  btn.classList.toggle("is-muted", bgmState.muted);
  if (typeof syncHomeCornerFloatingButtons === "function") {
    syncHomeCornerFloatingButtons();
  }
}

window.toggleBgmMute = function () {
  bgmState.muted = !bgmState.muted;
  localStorage.setItem("mk_bgm_muted", bgmState.muted ? "true" : "false");
  updateBgmForScreen(state.currentScreen);
};

function updateBgmForScreen(screenId) {
  syncFloatingSoundBtn(screenId);

  if (appExited || document.hidden || bgmState.muted) {
    bgmState.mainAudio.pause();
    bgmState.shopAudio.pause();
    bgmState.currentType = "none";
    return;
  }

  // 게임 진행 화면 & 결과 화면만 BGM 정지 (상점=shop.mp3, 친구목록 포함 그 외 모든 화면=main.mp3 끊김 없이 재생!)
  if (["gameScreen", "judgeScreen", "resultScreen", "battlePlayScreen"].includes(screenId)) {
    bgmState.mainAudio.pause();
    bgmState.shopAudio.pause();
    bgmState.currentType = "none";
    return;
  }

  if (screenId === "shopScreen") {
    bgmState.mainAudio.pause();
    bgmState.currentType = "shop";
    if (bgmState.shopAudio.paused) {
      bgmState.shopAudio.play().catch(() => {});
    }
  } else {
    bgmState.shopAudio.pause();
    bgmState.currentType = "main";
    if (bgmState.mainAudio.paused) {
      bgmState.mainAudio.play().catch(() => {});
    }
  }
}

document.addEventListener(
  "pointerdown",
  () => {
    if (appExited || document.hidden) return;
    armAppBackGuard(true);
    unlockQuizAudio();
    if (!bgmState.muted && bgmState.currentType !== "none") {
      const targetAudio = bgmState.currentType === "shop" ? bgmState.shopAudio : bgmState.mainAudio;
      if (targetAudio.paused) {
        targetAudio.play().catch(() => {});
      }
    }
  },
  { passive: true }
);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopAllAppAudio(false);
    if ((state.mode === "onesec" || isOnlineOneSecRoomActive()) && state.currentScreen === "gameScreen") {
      const st = document.getElementById("audioStatusText");
      if (st) st.textContent = "⏸️ 백그라운드 전환으로 정지됨 · [▶ 1초 듣기]를 눌러주세요!";
    }
  } else if (!appExited) {
    updateBgmForScreen(state.currentScreen);
  }
});

window.addEventListener("pagehide", () => {
  stopAllAppAudio(false);
});

// 쿠팡 파트너스 동적 배너가 body 루트 등 외부로 떨어졌을 경우 홈 하단 전용 슬롯(#homeCoupangFrameWrap)으로 안전 재배치
function relocateCoupangAdBanner() {
  const wrap = document.getElementById("homeCoupangFrameWrap");
  if (!wrap) return;
  document.querySelectorAll('iframe[src*="coupang.com"], iframe[src*="ads-partners.coupang"]').forEach(el => {
    const hostNode = el.closest("div[id^='coupang'], div[class*='coupang']") || el;
    if (hostNode && hostNode !== wrap && !wrap.contains(hostNode) && !hostNode.contains(wrap)) {
      wrap.innerHTML = "";
      wrap.appendChild(hostNode);
    }
  });
}

// 홈 화면에서 🔔(우측 상단) · 🔊(우측 하단) 버튼을 흰색 메인 카드(.home-hero) 모서리에 정밀 정렬
window.syncHomeCornerFloatingButtons = function () {
  const shell = document.querySelector(".app-shell");
  const hero = document.querySelector("#homeScreen .home-hero");
  const notiBtn = document.getElementById("floatingDmNotiBtn");
  const soundBtn = document.getElementById("floatingSoundBtn");
  if (!shell || (!notiBtn && !soundBtn)) return;

  if (state.currentScreen !== "homeScreen" || !hero) {
    if (notiBtn) {
      notiBtn.style.top = "";
      notiBtn.style.right = "";
    }
    if (soundBtn) {
      soundBtn.style.top = "";
      soundBtn.style.right = "";
      soundBtn.style.bottom = "";
    }
    return;
  }

  const sRect = shell.getBoundingClientRect();
  const hRect = hero.getBoundingClientRect();
  if (hRect.width <= 0 || hRect.height <= 0) return;

  // 좌상단 ? 버튼(top: 10px, left: 10px)과 완벽히 대칭되는 우상단 🔔 위치
  if (notiBtn) {
    notiBtn.style.top = `${Math.round(hRect.top - sRect.top + 13)}px`;
    notiBtn.style.right = `${Math.round(sRect.right - hRect.right + 13)}px`;
  }

  // .home-hero 우측 하단 모서리 안쪽 위로 올려 하단 쿠팡 배너와 터치 영역이 겹치지 않도록 분리
  if (soundBtn) {
    const adSlot = document.getElementById("homeAdBannerSlot");
    let desiredTop = Math.round(hRect.bottom - sRect.top - 46);
    if (adSlot) {
      const adTopInShell = Math.round(adSlot.getBoundingClientRect().top - sRect.top);
      desiredTop = Math.min(desiredTop, adTopInShell - 48);
    }
    soundBtn.style.bottom = "auto";
    soundBtn.style.top = `${Math.max(0, desiredTop)}px`;
    soundBtn.style.right = `${Math.round(sRect.right - hRect.right + 10)}px`;
  }
};

// ============================================================================
// 화면 전환
// ============================================================================
window.switchScreen = function (targetId, opts = {}) {
  stopAudio();
  stopTimeAttackTimer();
  window.closeAllModals();

  state.currentScreen = targetId;
  if (opts && opts.replaceHistory) {
    resetHistoryToExitBase();
  } else if (targetId !== "loginScreen") {
    armAppBackGuard(false);
  }

  document.body.classList.toggle("on-home-screen", targetId === "homeScreen");
  // 싱글/멀티 전용 플레이 화면일 때 전자 미디(MIDI) 다크 스튜디오 배경 활성화
  document.body.classList.toggle("midi-play-theme", ["gameScreen", "battlePlayScreen"].includes(targetId));

  if (targetId === "homeScreen") {
    relocateCoupangAdBanner();
  }

  if (targetId !== "dmChatScreen" && typeof stopDmRealtime === "function") {
    stopDmRealtime();
  }

  const headerEl = document.getElementById("topHeader");
  if (headerEl) {
    headerEl.classList.toggle(
      "hidden",
      ["loginScreen", "shopScreen", "battleRoomScreen", "battlePlayScreen", "rankingScreen", "socialScreen", "dmChatScreen"].includes(targetId)
    );
  }

  [
    "loginScreen",
    "homeScreen",
    "setupScreen",
    "gameScreen",
    "judgeScreen",
    "resultScreen",
    "plazaScreen",
    "shopScreen",
    "battleRoomScreen",
    "battlePlayScreen",
    "rankingScreen",
    "socialScreen",
    "dmChatScreen"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", id !== targetId);
  });

  const helpBtn = document.getElementById("floatingHelpBtn");
  if (helpBtn) {
    helpBtn.classList.toggle("hidden", targetId !== "homeScreen");
  }
  if (typeof syncDmNotiBadgeUI === "function") {
    syncDmNotiBadgeUI();
  }

  updateBgmForScreen(targetId);

  // 숨겨져 있던 캔버스가 표시된 직후 실제 CSS 크기에 맞춘 1:1 정배율 렌더링 & 홈 모서리 버튼 정렬!
  requestAnimationFrame(() => {
    if (typeof updateHeaderUserUI === "function") updateHeaderUserUI();
    syncHomeCornerFloatingButtons();
  });
};

window.showLoginScreen = function (opts = {}) {
  switchScreen("loginScreen", opts);
  updateHeaderUserUI();
};

window.showHome = function (opts = {}) {
  updateHeaderUserUI();
  switchScreen("homeScreen", opts);
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
  resetHistoryToExitBase();
  updateHeaderUserUI();

  safeOn("headerMyProfileTrigger", "click", openMyProfileModal);
  safeOn("headerCdBtn", "click", openShopModal);
  safeOn("openPatchBtn", "click", () => openModal("patchNotesModal"));
  safeOn("openSettingsBtn", "click", () => openModal("settingsModal"));
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
  safeOn("backToLobbyBtn", "click", confirmExitSingleGame);
  safeOn("restartSameBtn", "click", startGame);
  safeOn("resultToLobbyBtn", "click", showHome);
  safeOn("shareResultBtn", "click", shareResultImage);

  safeOn("hintLetterBtn", "click", useLetterHint);
  safeOn("hintKeywordBtn", "click", useKeywordHint);
  safeOn("hintAudioBtn", "click", useAudioHint);
  safeOn("submitAnswerBtn", "click", checkUserAnswer);
  safeOn("skipQuestionBtn", "click", skipQuestion);
  safeOn("nextQuestionBtn", "click", nextQuestion);

  safeOn("artistInput", "keydown", e => {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      const titleEl = document.getElementById("titleInput");
      if (state.stage === 3 && titleEl && !titleEl.value.trim()) {
        titleEl.focus();
        return;
      }
      checkUserAnswer();
    }
  });

  safeOn("titleInput", "keydown", e => {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      checkUserAnswer();
    }
  });

  syncSetupOptionChips();
  updateLobbyCounts();
  window.closeAllModals();
  showLoginScreen();

  if (typeof initAuthPreferences === "function") {
    initAuthPreferences();
  }
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

function syncSetupOptionChips() {
  syncDecadeChips();
  document.querySelectorAll("[data-mode]").forEach(el => {
    el.classList.toggle("active", el.getAttribute("data-mode") === state.mode);
  });
  document.querySelectorAll("[data-stage]").forEach(el => {
    el.classList.toggle("active", Number(el.getAttribute("data-stage")) === state.stage);
  });
  document.querySelectorAll("[data-limit]").forEach(el => {
    el.classList.toggle("active", el.getAttribute("data-limit") === String(state.questionLimit));
  });
}

window.startRandomGame = function () {
  unlockQuizAudio();
  const modes = ["behind", "lyrics", "onesec"];
  const stages = [1, 2, 3];
  state.decades = new Set(["1990s", "2000s", "2010s", "2020s"]);
  state.mode = modes[Math.floor(Math.random() * modes.length)];
  state.stage = stages[Math.floor(Math.random() * stages.length)];
  state.questionLimit = 10;
  syncSetupOptionChips();
  updateLobbyCounts();
  startGame();
};

// ============================================================================
// 게임 시작 및 진행
// ============================================================================
window.startGame = function () {
  stopAudio();
  unlockQuizAudio();
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

  if (state.mode !== "onesec") {
    fetchItunesTrack(q);
  }

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
    playAudioSnippet(1.0, 6, q, null, null, { isAutoPlay: true });
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
  artistInput.enterKeyHint = state.stage === 3 ? "next" : "done";
  titleInput.enterKeyHint = "done";

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

  document.getElementById("finalPlayerBadge").textContent = `🎤 도전자: ${userState?.nickname || "도전자"}`;
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
    userState.cdCoins += earnedCd;
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

  let rewardResult = {
    earnedCd,
    baseExp: Math.round(state.score * 0.1),
    finalExp: Math.round(state.score * 0.1),
    multiplier: 1,
    achievedTopRank: null,
    expBefore: userState.exp || 0,
    expAfter: (userState.exp || 0) + Math.round(state.score * 0.1)
  };
  if (typeof checkAndProcessGameRewards === "function") {
    const res = await checkAndProcessGameRewards(state.score, state.mode, state.stage);
    rewardResult = { earnedCd, ...res };
  }

  state.resultPlayingIndex = null;
  const listEl = document.getElementById("historyList");
  listEl.innerHTML = state.history
    .map(
      (item, idx) => `
      <div class="hint-box result-history-row" style="background:${item.correct ? "#ecfdf5" : "#fff1f2"}; border-color:${item.correct ? "#a7f3d0" : "#fecdd3"}; color:var(--text-main);">
        <span class="result-history-title"><strong>#${idx + 1}</strong> [${item.q.year}] ${item.q.artist} - ${item.q.title}</span>
        <span class="result-history-actions">
          <button type="button" class="result-preview-btn" data-hist-idx="${idx}" onclick="toggleResultSongPreview(${idx})">▶ 듣기</button>
          <span style="font-weight:800; color:${item.correct ? "var(--success)" : "var(--danger)"};">${item.correct ? "⭕ 정답" : "❌ 오답"}</span>
        </span>
      </div>
    `
    )
    .join("");

  showRewardSummaryModal(rewardResult);
}

// ============================================================================
// 결과 보상 정산 · 경험치 바 상승(%) 애니메이션 · TOP 3 폭죽 파티클
// ============================================================================
let confettiAnimId = null;

window.launchTop3Confetti = function () {
  const cv = document.getElementById("confettiCanvas");
  if (!cv) return;
  cv.classList.remove("hidden");
  cv.width = window.innerWidth;
  cv.height = window.innerHeight;
  const ctx = cv.getContext("2d");

  const colors = ["#facc15", "#f43f5e", "#38bdf8", "#4ade80", "#a855f7", "#fb923c"];
  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * cv.width,
    y: Math.random() * -cv.height * 0.6 - 20,
    vx: (Math.random() - 0.5) * 6,
    vy: Math.random() * 4 + 3,
    w: Math.random() * 10 + 6,
    h: Math.random() * 6 + 4,
    rot: Math.random() * Math.PI * 2,
    vRot: (Math.random() - 0.5) * 0.25,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));

  if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
  const startTime = Date.now();

  const frame = () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.rot += p.vRot;
      if (p.y < cv.height + 30) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (alive && Date.now() - startTime < 4500) {
      confettiAnimId = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, cv.width, cv.height);
      cv.classList.add("hidden");
    }
  };
  confettiAnimId = requestAnimationFrame(frame);
};

window.showRewardSummaryModal = function (res) {
  const modal = document.getElementById("rewardSummaryModal");
  if (!modal) return;

  const beforeLv = getLevelInfo(res.expBefore);
  const afterLv = getLevelInfo(res.expAfter);

  const top3Banner = document.getElementById("rewardTop3Banner");
  if (top3Banner) {
    if (res.achievedTopRank && res.achievedTopRank <= 3) {
      const medal = res.achievedTopRank === 1 ? "🥇 1위" : res.achievedTopRank === 2 ? "🥈 2위" : "🥉 3위";
      top3Banner.innerHTML = `🎉 축하합니다! 랭킹 <strong>${medal}</strong> 신규 달성!<br/>보너스 경험치 <strong>×${res.multiplier}배</strong> 적용!`;
      top3Banner.classList.remove("hidden");
      launchTop3Confetti();
    } else {
      top3Banner.classList.add("hidden");
    }
  }

  document.getElementById("rewardCdGain").textContent = `+${res.earnedCd || 0} CD`;
  document.getElementById("rewardExpGain").textContent =
    res.multiplier > 1
      ? `+${res.finalExp.toLocaleString()} EXP (×${res.multiplier}배!)`
      : `+${res.finalExp.toLocaleString()} EXP`;

  document.getElementById("rewardLevelTitle").textContent = `Lv.${afterLv.level} ${afterLv.title}`;
  document.getElementById("rewardLevelUpTag").classList.toggle("hidden", afterLv.level <= beforeLv.level);

  const leveledUp = afterLv.level > beforeLv.level;
  const startPct = leveledUp ? 0 : beforeLv.percent;
  const endPct = afterLv.percent;
  const deltaPct = leveledUp
    ? (100 - beforeLv.percent + endPct)
    : Math.max(0, endPct - beforeLv.percent);

  document.getElementById("rewardExpDetailText").textContent = afterLv.isMax
    ? `MAX (${afterLv.exp.toLocaleString()} EXP)`
    : `${afterLv.inLevelExp.toLocaleString()} / ${afterLv.needInLevel.toLocaleString()} EXP`;
  document.getElementById("rewardPercentDeltaText").textContent = `${endPct.toFixed(1)}% (+${deltaPct.toFixed(1)}% ↑)`;

  const barFill = document.getElementById("rewardExpBarFill");
  barFill.style.transition = "none";
  barFill.style.width = `${startPct.toFixed(1)}%`;

  modal.classList.remove("hidden");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      barFill.style.transition = "width 1.15s cubic-bezier(0.22, 1, 0.36, 1)";
      barFill.style.width = `${endPct.toFixed(1)}%`;
    });
  });
};

window.closeRewardSummaryModal = function () {
  closeModal("rewardSummaryModal");
  const cv = document.getElementById("confettiCanvas");
  if (cv) {
    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
    cv.classList.add("hidden");
  }
};

async function shareResultImage() {
  const target = document.getElementById("resultCaptureTarget");
  const bottomBtns = document.getElementById("resultBottomActions");
  if (!target || typeof html2canvas === "undefined") {
    gameAlert("캡처 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
    return;
  }

  const previewBtns = Array.from(target.querySelectorAll(".result-preview-btn"));
  try {
    bottomBtns.classList.add("hidden");
    previewBtns.forEach(btn => btn.classList.add("hidden"));
    const canvas = await html2canvas(target, {
      backgroundColor: "#ffffff",
      scale: 2
    });
    bottomBtns.classList.remove("hidden");
    previewBtns.forEach(btn => btn.classList.remove("hidden"));

    canvas.toBlob(async blob => {
      if (!blob) return;
      const file = new File([blob], "music_king_result.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `[${userState?.nickname || "도전자"}] 음악왕 결과`,
            text: `[${userState?.nickname || "도전자"}] ${document.getElementById("finalScoreText").textContent}`,
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
    previewBtns.forEach(btn => btn.classList.remove("hidden"));
    gameAlert("화면 캡처 중 오류가 발생했습니다.");
  }
}

window.addEventListener("resize", () => {
  if (["homeScreen", "loginScreen"].includes(state.currentScreen) && typeof updateHeaderUserUI === "function") {
    updateHeaderUserUI();
  }
  syncHomeCornerFloatingButtons();
});

window.addEventListener("load", syncHomeCornerFloatingButtons);

document.addEventListener("DOMContentLoaded", () => {
  initEvents();
  relocateCoupangAdBanner();
  setTimeout(relocateCoupangAdBanner, 450);
  setTimeout(relocateCoupangAdBanner, 1500);
  // PWA & PWABuilder Android APK 필수 조건: Service Worker 등록
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
});
