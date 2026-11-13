// ============================================================================
// [음악왕] 메인 게임 로직 (app.js)
// - iTunes Search API 실시간 연동 (1초 듣기 / 오디오 힌트 / 앨범 아트)
// - 1단계(노래), 2단계(가수), 3단계(가수+노래) 완벽 지원
// - MD 파일 브라우저 직접 업로드 파서 내장
// ============================================================================

const state = {
  decades: new Set(["1990s", "2000s", "2010s", "2020s"]),
  mode: "behind",      // 'behind' | 'lyrics' | 'onesec'
  stage: 1,            // 1: 노래 맞히기 | 2: 가수 맞히기 | 3: 가수+노래 맞히기
  questionLimit: 10,   // 10 | 20 | 50 | 'infinite'

  pool: [],
  currentIndex: 0,
  score: 0,
  streak: 0,
  hearts: 5,
  history: [],

  // 현재 문제 상태
  currentQ: null,
  usedHintLetter: false,
  usedHintKeyword: false,
  usedHintAudio: false,
  artistSolved: false,
  titleSolved: false,
  questionEnded: false,

  // 오디오 상태
  audioEl: new Audio(),
  audioStopTimer: null,
  itunesCache: new Map(),
  oneSecOffsetIndex: 0
};

state.audioEl.crossOrigin = "anonymous";

// 로컬 스토리지에 저장된 사용자 추가 MD 문제 불러오기
function getCustomQuestions() {
  try {
    const raw = localStorage.getItem("music_king_custom_q");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomQuestions(list) {
  try {
    localStorage.setItem("music_king_custom_q", JSON.stringify(list));
  } catch (e) {}
}

function getAllQuestions() {
  return [...QUESTIONS_DB, ...getCustomQuestions()];
}

// 정답 문자열 정규화 (공백, 특수문자, 대소문자 제거)
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

// 글자수 & 빈칸 구조 생성 (예: "난 알아요" -> "□ □□□ (공백 제외 4글자)")
function buildLetterBoxHint(text) {
  const trimmed = text.trim();
  const boxes = Array.from(trimmed)
    .map(ch => (ch === " " ? " " : "□"))
    .join("");
  const charCount = trimmed.replace(/\s+/g, "").length;
  return `${boxes} (${charCount}글자)`;
}

// iTunes Search API로 미리듣기 URL 및 앨범 커버 조회
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
    } catch (err) {
      // 네트워크 오류 시 다음 후보 URL 시도
    }
  }

  const fallback = { previewUrl: null, artworkUrl: "" };
  state.itunesCache.set(q.id, fallback);
  return fallback;
}

// 오디오 정지
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

// 지정 시간(초)만큼만 오디오 재생
async function playAudioSnippet(durationSec, startOffsetSec = 6) {
  stopAudio();
  const q = state.currentQ;
  if (!q) return;

  const statusEl = document.getElementById("audioStatusText");
  if (statusEl) statusEl.textContent = "음원 스트리밍 불러오는 중...";

  const track = await fetchItunesTrack(q);
  if (!track || !track.previewUrl) {
    if (statusEl) {
      statusEl.textContent = "⚠️ 이 곡의 미리듣기 음원을 찾을 수 없습니다. 다른 힌트를 활용해주세요!";
    }
    alert("이 곡의 iTunes 미리듣기 음원을 불러올 수 없습니다.");
    return;
  }

  try {
    if (state.audioEl.src !== track.previewUrl) {
      state.audioEl.src = track.previewUrl;
      await new Promise((resolve, reject) => {
        const onLoaded = () => {
           cleanup();
          resolve();
        };
        const onError = (e) => {
          cleanup();
          reject(e);
        };
        const cleanup = () => {
          state.audioEl.removeEventListener("loadedmetadata", onLoaded);
          state.audioEl.removeEventListener("error", onError);
        };
        state.audioEl.addEventListener("loadedmetadata", onLoaded);
        state.audioEl.addEventListener("error", onError);
        state.audioEl.load();
      });
    }

    const safeOffset = Math.min(startOffsetSec, Math.max(0, (state.audioEl.duration || 29) - durationSec - 1));
    state.audioEl.currentTime = safeOffset;

    const disc = document.getElementById("vinylDisc");
    if (disc) disc.classList.add("spinning");
    if (statusEl) statusEl.textContent = `🔊 ${durationSec}초 재생 중... 집중해서 들어보세요!`;

    await state.audioEl.play();

    state.audioStopTimer = setTimeout(() => {
      state.audioEl.pause();
      if (disc) disc.classList.remove("spinning");
      if (statusEl) statusEl.textContent = `✅ ${durationSec}초 재생 완료! 다시 들으려면 버튼을 누르세요.`;
    }, durationSec * 1000);
  } catch (err) {
    if (statusEl) statusEl.textContent = "⚠️ 브라우저 오디오 재생 권한을 확인해주세요.";
  }
}

// 배열 셔플
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ============================================================================
// 로비 설정 및 게임 시작
// ============================================================================
function updateLobbyCounts() {
  const all = getAllQuestions();
  const filtered = all.filter(q => state.decades.has(q.decade));
  const countBadge = document.getElementById("availablePoolCount");
  if (countBadge) {
    countBadge.textContent = `선택된 연대 총 ${filtered.length}문제 준비됨`;
  }
}

function initLobbyEvents() {
  // 연대 선택 (복수 선택)
  document.querySelectorAll("[data-decade]").forEach(el => {
    el.addEventListener("click", () => {
      const dec = el.getAttribute("data-decade");
      if (dec === "ALL") {
        const allSelected = state.decades.size === 4;
        if (allSelected) {
          state.decades = new Set(["2010s"]);
        } else {
          state.decades = new Set(["1990s", "2000s", "2010s", "2020s"]);
        }
      } else {
        if (state.decades.has(dec)) {
          if (state.decades.size > 1) state.decades.delete(dec);
        } else {
          state.decades.add(dec);
        }
      }
      syncDecadeChips();
      updateLobbyCounts();
    });
  });

  // 모드 선택
  document.querySelectorAll("[data-mode]").forEach(el => {
    el.addEventListener("click", () => {
      state.mode = el.getAttribute("data-mode");
      document.querySelectorAll("[data-mode]").forEach(c => c.classList.remove("active"));
      el.classList.add("active");
    });
  });

  // 단계(난이도) 선택
  document.querySelectorAll("[data-stage]").forEach(el => {
    el.addEventListener("click", () => {
      state.stage = Number(el.getAttribute("data-stage"));
      document.querySelectorAll("[data-stage]").forEach(c => c.classList.remove("active"));
      el.classList.add("active");
    });
  });

  // 문제 수 선택
  document.querySelectorAll("[data-limit]").forEach(el => {
    el.addEventListener("click", () => {
      const val = el.getAttribute("data-limit");
      state.questionLimit = val === "infinite" ? "infinite" : Number(val);
      document.querySelectorAll("[data-limit]").forEach(c => c.classList.remove("active"));
      el.classList.add("active");
    });
  });

  document.getElementById("startGameBtn").addEventListener("click", startGame);
  document.getElementById("backToLobbyBtn").addEventListener("click", showLobby);
  document.getElementById("restartSameBtn").addEventListener("click", startGame);
  document.getElementById("resultToLobbyBtn").addEventListener("click", showLobby);
  document.getElementById("brandHome").addEventListener("click", showLobby);

  // 인게임 버튼
  document.getElementById("hintLetterBtn").addEventListener("click", useLetterHint);
  document.getElementById("hintKeywordBtn").addEventListener("click", useKeywordHint);
  document.getElementById("hintAudioBtn").addEventListener("click", useAudioHint);
  document.getElementById("submitAnswerBtn").addEventListener("click", checkUserAnswer);
  document.getElementById("skipQuestionBtn").addEventListener("click", skipQuestion);
  document.getElementById("nextQuestionBtn").addEventListener("click", nextQuestion);

  // 엔터키로 정답 제출 / 다음 문제 이동
  ["artistInput", "titleInput"].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (state.questionEnded) {
          nextQuestion();
        } else {
          checkUserAnswer();
        }
      }
    });
  });

  // MD 문제 관리 모달
  document.getElementById("openMdModalBtn").addEventListener("click", () => {
    document.getElementById("mdModal").classList.remove("hidden");
    renderCustomQuestionCount();
  });
  document.getElementById("closeMdModalBtn").addEventListener("click", () => {
    document.getElementById("mdModal").classList.add("hidden");
  });
  document.getElementById("mdFileInput").addEventListener("change", handleMdFileUpload);
  document.getElementById("parseMdTextBtn").addEventListener("click", handleMdTextParse);
  document.getElementById("clearCustomBtn").addEventListener("click", () => {
    if (confirm("추가했던 사용자 커스텀 문제를 초기화할까요? (기본 100문제는 유지됩니다)")) {
      saveCustomQuestions([]);
      renderCustomQuestionCount();
      updateLobbyCounts();
    }
  });

  syncDecadeChips();
  updateLobbyCounts();
}

function syncDecadeChips() {
  document.querySelectorAll("[data-decade]").forEach(el => {
    const dec = el.getAttribute("data-decade");
    if (dec === "ALL") {
      el.classList.toggle("active", state.decades.size === 4);
    } else {
      el.classList.toggle("active", state.decades.has(dec));
    }
  });
}

function showLobby() {
  stopAudio();
  document.getElementById("lobbyScreen").classList.remove("hidden");
  document.getElementById("gameScreen").classList.add("hidden");
  document.getElementById("resultScreen").classList.add("hidden");
  updateLobbyCounts();
}

function startGame() {
  stopAudio();
  const candidates = getAllQuestions().filter(q => state.decades.has(q.decade));
  if (candidates.length === 0) {
    alert("선택한 연대에 해당하는 문제가 없습니다. 연대를 1개 이상 선택해주세요.");
    return;
  }

  const shuffled = shuffleArray(candidates);
  if (state.questionLimit === "infinite") {
    state.pool = shuffled;
  } else {
    state.pool = shuffled.slice(0, Math.min(state.questionLimit, shuffled.length));
  }

  state.currentIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.hearts = 5;
  state.history = [];

  document.getElementById("lobbyScreen").classList.add("hidden");
  document.getElementById("resultScreen").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");

  loadCurrentQuestion();
}

// ============================================================================
// 문제 렌더링 및 힌트/정답 처리
// ============================================================================
function loadCurrentQuestion() {
  stopAudio();
  const q = state.pool[state.currentIndex];
  state.currentQ = q;
  state.usedHintLetter = false;
  state.usedHintKeyword = false;
  state.usedHintAudio = false;
  state.artistSolved = state.stage === 1; // 1단계는 노래만 맞히므로 가수는 이미 해결됨
  state.titleSolved = state.stage === 2;  // 2단계는 가수만 맞히므로 노래는 이미 해결됨
  state.questionEnded = false;
  state.oneSecOffsetIndex = 0;

  // 다음 문제 음원 미리 프리페치
  fetchItunesTrack(q);

  // 상단 상태바 업데이트
  const modeNames = {
    behind: "📖 비하인드 스토리",
    lyrics: "📝 가사 보고 맞히기",
    onesec: "🎧 1초 듣고 맞히기"
  };
  const stageNames = {
    1: "1단계: 노래 맞히기",
    2: "2단계: 가수 맞히기",
    3: "3단계: 가수+노래 맞히기"
  };

  document.getElementById("badgeDecade").textContent = `${q.decade.replace("s", "년대")} (${q.year}년)`;
  document.getElementById("badgeMode").textContent = modeNames[state.mode];
  document.getElementById("badgeStage").textContent = stageNames[state.stage];

  const totalText = state.questionLimit === "infinite" ? `무한도전 (${state.pool.length}곡)` : `${state.pool.length}문제`;
  document.getElementById("progressText").textContent = `문제 ${state.currentIndex + 1} / ${totalText}`;
  document.getElementById("scoreText").textContent = `${state.score}점`;

  const heartsEl = document.getElementById("heartsDisplay");
  if (state.questionLimit === "infinite") {
    heartsEl.classList.remove("hidden");
    heartsEl.textContent = "❤️".repeat(state.hearts) + "🖤".repeat(Math.max(0, 5 - state.hearts));
  } else {
    heartsEl.classList.add("hidden");
  }

  // 기본 제공 정보 배너 (1단계는 가수 이름 공개, 2단계는 노래 힌트 안내)
  const givenBanner = document.getElementById("givenInfoBanner");
  if (state.stage === 1) {
    givenBanner.classList.remove("hidden");
    givenBanner.innerHTML = `<span>🎤 기본 제공 힌트 (가수)</span><strong>${q.artist}</strong>`;
  } else if (state.stage === 2) {
    givenBanner.classList.remove("hidden");
    givenBanner.innerHTML = `<span>🎯 목표: 이 곡을 부른 <strong>가수(그룹)</strong>를 맞혀주세요!</span><strong>발매: ${q.year}년</strong>`;
  } else {
    givenBanner.classList.add("hidden");
  }

  // 문제 본문 렌더링
  const qContent = document.getElementById("questionContent");
  const oneSecBox = document.getElementById("oneSecContainer");
  const qTypeTag = document.getElementById("questionTypeTag");

  if (state.mode === "behind") {
    qTypeTag.textContent = "💡 나무위키 & 방송 검증 비하인드 퀴즈";
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
  } else if (state.mode === "onesec") {
    qTypeTag.textContent = "⚡ 전주/하이라이트 1초 듣고 맞히기";
    qContent.classList.add("hidden");
    oneSecBox.classList.remove("hidden");
    document.getElementById("audioStatusText").textContent = "아래 [▶ 1초 재생] 버튼을 눌러 노래를 들어보세요!";
  }

  // 힌트 버튼 초기화 (1초 듣기 모드에서는 '노래 짧게 듣기 힌트' 제외!)
  const btnLetter = document.getElementById("hintLetterBtn");
  const btnKeyword = document.getElementById("hintKeywordBtn");
  const btnAudio = document.getElementById("hintAudioBtn");

  btnLetter.disabled = false;
  btnLetter.classList.remove("used");
  btnLetter.innerHTML = "🔤 철자 글자 수 힌트";

  btnKeyword.disabled = false;
  btnKeyword.classList.remove("used");
  btnKeyword.innerHTML = "🔑 포인트 단어 힌트";

  if (state.mode === "onesec") {
    btnAudio.classList.add("hidden");
  } else {
    btnAudio.classList.remove("hidden");
    btnAudio.disabled = false;
    btnAudio.classList.remove("used");
    btnAudio.innerHTML = "🎧 노래 짧게 듣기 힌트 (2.5초)";
  }

  document.getElementById("hintsDisplay").innerHTML = "";

  // 입력창 세팅 (1단계: 노래만 / 2단계: 가수만 / 3단계: 가수+노래)
  const artistGroup = document.getElementById("artistInputGroup");
  const titleGroup = document.getElementById("titleInputGroup");
  const artistInput = document.getElementById("artistInput");
  const titleInput = document.getElementById("titleInput");

  artistInput.value = "";
  titleInput.value = "";
  artistInput.disabled = false;
  titleInput.disabled = false;
  artistInput.classList.remove("correct-locked");
  titleInput.classList.remove("correct-locked");

  if (state.stage === 1) {
    artistGroup.classList.add("hidden");
    titleGroup.classList.remove("hidden");
    setTimeout(() => titleInput.focus(), 50);
  } else if (state.stage === 2) {
    artistGroup.classList.remove("hidden");
    titleGroup.classList.add("hidden");
    setTimeout(() => artistInput.focus(), 50);
  } else {
    artistGroup.classList.remove("hidden");
    titleGroup.classList.remove("hidden");
    setTimeout(() => artistInput.focus(), 50);
  }

  document.getElementById("feedbackToast").textContent = "";
  document.getElementById("feedbackToast").className = "feedback-toast";
  document.getElementById("revealPanel").classList.add("hidden");
  document.getElementById("submitAnswerBtn").disabled = false;
  document.getElementById("skipQuestionBtn").disabled = false;
}

// 1초 재생 버튼 핸들러 (HTML onclick 연동)
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

// 힌트 1: 글자 수 / 띄어쓰기 철자 힌트
function useLetterHint() {
  if (state.usedHintLetter || state.questionEnded) return;
  state.usedHintLetter = true;
  const q = state.currentQ;

  const btn = document.getElementById("hintLetterBtn");
  btn.classList.add("used");
  btn.disabled = true;

  let text = "";
  if (state.stage === 1) {
    text = `노래 제목: <span class="letter-boxes">${buildLetterBoxHint(q.title)}</span>`;
  } else if (state.stage === 2) {
    text = `가수 이름: <span class="letter-boxes">${buildLetterBoxHint(q.artist)}</span>`;
  } else {
    text = `가수: <span class="letter-boxes">${buildLetterBoxHint(q.artist)}</span> &nbsp;|&nbsp; 노래: <span class="letter-boxes">${buildLetterBoxHint(q.title)}</span>`;
  }

  appendHintBox("🔤 글자 수 힌트", text);
}

// 힌트 2: 포인트 단어 힌트 (간접 힌트)
function useKeywordHint() {
  if (state.usedHintKeyword || state.questionEnded) return;
  state.usedHintKeyword = true;
  const q = state.currentQ;

  const btn = document.getElementById("hintKeywordBtn");
  btn.classList.add("used");
  btn.disabled = true;

  // 2단계(가수 맞히기)이고 비하인드/가사 모드일 때 노래 제목은 스포가 될 수 있으므로 간접 키워드만 표시
  appendHintBox("🔑 포인트 단어", `<strong>${q.keywordHint}</strong>`);
}

// 힌트 3: 노래 짧게 듣기 힌트 (1초 듣기 모드 제외)
function useAudioHint() {
  if (state.mode === "onesec" || state.questionEnded) return;
  if (!state.usedHintAudio) {
    state.usedHintAudio = true;
    const btn = document.getElementById("hintAudioBtn");
    btn.classList.add("used");
    btn.innerHTML = "🎧 힌트 구간 다시 듣기 (2.5초)";
    appendHintBox("🎧 오디오 힌트", "노래 하이라이트 구간 2.5초 미리듣기가 활성화되었습니다.");
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

// 정답 확인
function checkUserAnswer() {
  if (state.questionEnded) return;
  const q = state.currentQ;
  const artistInput = document.getElementById("artistInput");
  const titleInput = document.getElementById("titleInput");
  const toast = document.getElementById("feedbackToast");

  if (!state.artistSolved) {
    if (isArtistMatch(artistInput.value, q)) {
      state.artistSolved = true;
      artistInput.value = `✅ ${q.artist}`;
      artistInput.disabled = true;
      artistInput.classList.add("correct-locked");
    }
  }

  if (!state.titleSolved) {
    if (isTitleMatch(titleInput.value, q)) {
      state.titleSolved = true;
      titleInput.value = `✅ ${q.title}`;
      titleInput.disabled = true;
      titleInput.classList.add("correct-locked");
    }
  }

  // 둘 다 해결되었으면 정답 처리!
  if (state.artistSolved && state.titleSolved) {
    handleQuestionSuccess();
    return;
  }

  // 3단계에서 둘 중 하나만 맞힌 경우 부분 정답 피드백
  if (state.stage === 3 && (state.artistSolved || state.titleSolved)) {
    toast.className = "feedback-toast partial";
    if (state.artistSolved) {
      toast.textContent = "👍 가수는 정답입니다! 이제 노래 제목을 맞혀보세요!";
      titleInput.focus();
    } else {
      toast.textContent = "👍 노래 제목은 정답입니다! 이제 가수를 맞혀보세요!";
      artistInput.focus();
    }
    return;
  }

  // 오답 피드백
  toast.className = "feedback-toast error";
  toast.textContent = "❌ 아쉽네요! 철자나 띄어쓰기 상관없이 다시 한번 생각해보세요.";

  if (state.questionLimit === "infinite") {
    state.hearts--;
    const heartsEl = document.getElementById("heartsDisplay");
    heartsEl.textContent = "❤️".repeat(Math.max(0, state.hearts)) + "🖤".repeat(Math.max(0, 5 - state.hearts));
    if (state.hearts <= 0) {
      toast.textContent = "💔 하트를 모두 소진했습니다! 정답을 확인하세요.";
      revealAnswer(false);
    }
  }
}

function handleQuestionSuccess() {
  // 점수 계산 (기본 100점, 힌트 사용 시 소폭 차감하되 최소 50점 보장)
  let gained = 100;
  if (state.usedHintLetter) gained -= 15;
  if (state.usedHintKeyword) gained -= 15;
  if (state.usedHintAudio) gained -= 20;
  if (state.stage === 3) gained += 20; // 3단계 보너스

  state.score += gained;
  state.streak++;
  document.getElementById("scoreText").textContent = `${state.score}점`;

  const toast = document.getElementById("feedbackToast");
  toast.className = "feedback-toast";
  toast.style.color = "var(--success)";
  toast.textContent = `🎉 정답입니다! (+${gained}점)`;

  state.history.push({
    q: state.currentQ,
    correct: true,
    gained
  });

  revealAnswer(true);
}

function skipQuestion() {
  if (state.questionEnded) return;
  state.streak = 0;
  if (state.questionLimit === "infinite") {
    state.hearts--;
    const heartsEl = document.getElementById("heartsDisplay");
    heartsEl.textContent = "❤️".repeat(Math.max(0, state.hearts)) + "🖤".repeat(Math.max(0, 5 - state.hearts));
  }
  state.history.push({
    q: state.currentQ,
    correct: false,
    gained: 0
  });
  revealAnswer(false);
}

async function revealAnswer(isCorrect) {
  state.questionEnded = true;
  stopAudio();

  document.getElementById("submitAnswerBtn").disabled = true;
  document.getElementById("skipQuestionBtn").disabled = true;

  const q = state.currentQ;
  const panel = document.getElementById("revealPanel");
  panel.classList.remove("hidden");
  panel.classList.toggle("skipped", !isCorrect);

  document.getElementById("revealBadge").textContent = isCorrect ? "🎉 정답!" : "💡 정답 공개";
  document.getElementById("revealTitle").textContent = `${q.artist} - ${q.title} (${q.year})`;
  document.getElementById("revealAliases").textContent =
    q.artistAliases && q.artistAliases.length > 0
      ? `인정 답안: ${[q.artist, ...q.artistAliases].join(", ")}`
      : `발매 연도: ${q.year}년 (${q.decade})`;
  document.getElementById("revealNote").textContent = q.behindAnswerNote || q.behindQuestion;

  const thumb = document.getElementById("revealThumb");
  thumb.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%23232946'/><text x='50%' y='54%' font-size='28' text-anchor='middle' fill='%23fff'>🎵</text></svg>";

  const track = await fetchItunesTrack(q);
  if (track && track.artworkUrl) {
    thumb.src = track.artworkUrl;
  }

  const nextBtn = document.getElementById("nextQuestionBtn");
  const isLast =
    state.currentIndex + 1 >= state.pool.length ||
    (state.questionLimit === "infinite" && state.hearts <= 0);
  nextBtn.textContent = isLast ? "🏆 최종 결과 보기 (Enter)" : "다음 문제로 이동 ➔ (Enter)";
  nextBtn.focus();
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

function showFinalResult() {
  stopAudio();
  document.getElementById("gameScreen").classList.add("hidden");
  document.getElementById("resultScreen").classList.remove("hidden");

  const solvedCount = state.history.filter(h => h.correct).length;
  const totalTried = state.history.length;
  const accuracy = totalTried > 0 ? Math.round((solvedCount / totalTried) * 100) : 0;

  let rankTitle = "🎧 음악 입문자";
  if (accuracy >= 90 && solvedCount >= 8) rankTitle = "👑 전설의 음악왕 (인간 주크박스)";
  else if (accuracy >= 75) rankTitle = "🔥 가요계 척척박사";
  else if (accuracy >= 50) rankTitle = "🎶 음악 좀 들어본 고수";

  document.getElementById("finalRankTitle").textContent = rankTitle;
  document.getElementById("finalScoreText").textContent = `총점 ${state.score}점 (정답 ${solvedCount} / ${totalTried}문제 · 정답률 ${accuracy}%)`;

  const listEl = document.getElementById("historyList");
  listEl.innerHTML = state.history
    .map(
      (item, idx) => `
      <div class="hint-box" style="border-color: ${item.correct ? "rgba(0,214,143,0.4)" : "rgba(255,61,113,0.4)"};">
        <span><strong>#${idx + 1}</strong> [${item.q.year}] ${item.q.artist} - ${item.q.title}</span>
        <span>${item.correct ? `⭕ 정답 (+${item.gained}점)` : "❌ 패스/오답"}</span>
      </div>
    `
    )
    .join("");
}

// ============================================================================
// MD 파일 파서 (사용자가 작성한 .md 파일에서 문제 자동 추출)
// ============================================================================
function parseMarkdownToQuestions(mdText) {
  const blocks = mdText.split(/\n---+\n|\n(?=##\s+)/g);
  const parsed = [];

  blocks.forEach((block, idx) => {
    const getField = (regex) => {
      const m = block.match(regex);
      return m ? m[1].trim() : "";
    };

    const artist = getField(/(?:가수|아티스트|Artist)\s*[:：]\s*(.+)/i);
    const title = getField(/(?:노래|곡명|제목|Title)\s*[:：]\s*(.+)/i);
    if (!artist || !title) return;

    const yearRaw = getField(/(?:연도|발매연도|Year)\s*[:：]\s*(\d{4})/i);
    const year = yearRaw ? Number(yearRaw) : 2010;
    let decade = "2010s";
    if (year < 2000) decade = "1990s";
    else if (year < 2010) decade = "2000s";
    else if (year < 2020) decade = "2010s";
    else decade = "2020s";

    const aliasesRaw = getField(/(?:동의어|복수정답|별칭|Aliases)\s*[:：]\s*(.+)/i);
    const artistAliases = aliasesRaw
      ? aliasesRaw.split(/[,/]/).map(s => s.trim()).filter(Boolean)
      : [];

    let behind = getField(/(?:비하인드|문제|여담|Behind)\s*[:：]\s*([\s\S]+?)(?=\n(?:가사|키워드|힌트|해설|$))/i);
    if (!behind) {
      behind = `${year}년에 발매된 곡으로 많은 사랑을 받은 명곡입니다.`;
    }

    // 비하인드 지문에서 가수명/곡명이 직접 노출되면 자동 마스킹
    const maskedBehind = behind
      .replaceAll(artist, "[이 가수]")
      .replaceAll(title, "[이 곡]");

    const lyrics = getField(/(?:가사|Lyrics)\s*[:：]\s*(.+)/i) || "하이라이트 가사가 등록된 곡입니다.";
    const keyword = getField(/(?:키워드|포인트단어|힌트|Keyword)\s*[:：]\s*(.+)/i) || `${year}년 히트곡, ${decade}`;

    parsed.push({
      id: `custom_${Date.now()}_${idx}`,
      decade,
      year,
      artist,
      artistAliases,
      title,
      titleAliases: [],
      behindQuestion: maskedBehind,
      behindAnswerNote: `${artist} - '${title}' (${year}). ${behind}`,
      lyricsQuestion: lyrics,
      keywordHint: keyword,
      itunesQuery: `${artist} ${title}`
    });
  });

  return parsed;
}

function handleMdFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById("mdRawTextarea").value = reader.result;
    handleMdTextParse();
  };
  reader.readAsText(file, "utf-8");
}

function handleMdTextParse() {
  const raw = document.getElementById("mdRawTextarea").value.trim();
  if (!raw) {
    alert("변환할 MD 텍스트를 입력하거나 파일을 선택해주세요.");
    return;
  }
  const newQs = parseMarkdownToQuestions(raw);
  if (newQs.length === 0) {
    alert("가수: / 노래: 형식을 찾을 수 없습니다. 예시 양식을 참고해주세요!");
    return;
  }
  const existing = getCustomQuestions();
  const merged = [...existing, ...newQs];
  saveCustomQuestions(merged);
  renderCustomQuestionCount();
  updateLobbyCounts();
  alert(`🎉 총 ${newQs.length}개의 문제가 자동으로 마스킹 및 글자수 계산되어 DB에 추가되었습니다!`);
}

function renderCustomQuestionCount() {
  const custom = getCustomQuestions();
  const el = document.getElementById("customQCountText");
  if (el) {
    el.textContent = `기본 DB ${QUESTIONS_DB.length}문제 + 사용자 MD 추가 ${custom.length}문제 (합계 ${QUESTIONS_DB.length + custom.length}문제)`;
  }
}

document.addEventListener("DOMContentLoaded", initLobbyEvents);
