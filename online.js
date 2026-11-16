// ============================================================================
// [음악왕 v4.0] Supabase 클라우드 연동 · 대기실/방 분리 · 프로필 전적 · 상용 친구창 (online.js)
// - 대기실: 방 목록 + 접속 유저 리스트(닉네임 왼쪽에 480x480 캐릭터 아이콘)
// - 방 내부: 방에 입장한 유저들의 캐릭터만 맵에 표시 + 방 내부 전용 채팅 + 혼자 나갈 시 방 자동 삭제
// - 좌측 상단 내 닉네임 클릭 시: 통산 전적 & 최고 점수 & 내 랭킹 순위 프로필 팝업 표시
// ============================================================================

const SUPABASE_URL = "https://szafomntmenppcbczrwl.supabase.co";
const SUPABASE_KEY = "sb_publishable_msR49lWjgSJQnMQxSzIaug_XXlJUd4Z";

let sbClient = null;
if (window.supabase && window.supabase.createClient) {
  sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
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

window.gameConfirm = function (message, onConfirm, title = "✨ 확인해주세요") {
  const modal = document.getElementById("customDialogModal");
  if (!modal) return;
  document.getElementById("dialogTitle").textContent = title;
  document.getElementById("dialogMessage").innerHTML = String(message).replace(/\n/g, "<br/>");
  document.getElementById("dialogInputWrap").classList.add("hidden");

  const cancelBtn = document.getElementById("dialogCancelBtn");
  cancelBtn.classList.remove("hidden");
  cancelBtn.textContent = "취소";
  cancelBtn.onclick = () => modal.classList.add("hidden");

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
const userState = {
  id: null,
  nickname: "게스트도전자",
  bio: "안녕하세요! 음악왕 도전자입니다.",
  cdCoins: 100,
  avatarConfig: { ...DEFAULT_AVATAR_CONFIG },
  ownedItems: ["meadow", "default", "none", "basic", "mic_silver"],
  isLoggedIn: false
};

const shopPreviewState = {
  config: { ...DEFAULT_AVATAR_CONFIG },
  selectedCat: "hair",
  selectedItem: null
};

const plazaState = {
  channel: null,
  onlinePlayers: new Map(),
  currentRoom: null,
  roomChannel: null,
  roomPlayersMap: new Map(), // 방 내부 맵 캐릭터 좌표/말풍선 상태
  myRoomX: 130,
  myRoomChat: "",
  myRoomChatExpire: 0,
  roomAnimFrame: null
};

window.selectSignupGender = function (gender) {
  userState.avatarConfig.gender = gender;
  document.querySelectorAll("[data-signup-gender]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-signup-gender") === gender);
  });
  const loginPreview = document.getElementById("loginCharPreview");
  if (loginPreview) renderPixelAvatar(loginPreview, userState.avatarConfig);
};

function updateHeaderUserUI() {
  const cdEl = document.getElementById("headerCdCount");
  if (cdEl) cdEl.textContent = `${userState.cdCoins}`;

  // 왼쪽 상단: 음악왕 대신 내 닉네임 표시
  const topNickEl = document.getElementById("headerTopMyNick");
  if (topNickEl) {
    topNickEl.textContent = userState.isLoggedIn ? userState.nickname : `${userState.nickname} (게스트)`;
  }

  const miniCanvas = document.getElementById("headerMiniAvatar");
  if (miniCanvas) renderPixelAvatar(miniCanvas, userState.avatarConfig);

  const homeCanvas = document.getElementById("homeHeroAvatar");
  if (homeCanvas) renderPixelAvatar(homeCanvas, userState.avatarConfig);

  const loginPreview = document.getElementById("loginCharPreview");
  if (loginPreview) renderPixelAvatar(loginPreview, userState.avatarConfig);
}

function nicknameToEmail(nick) {
  const hex = Array.from(nick.trim())
    .map(c => c.charCodeAt(0).toString(16))
    .join("");
  return `u_${hex.slice(0, 36)}@musicking.com`;
}

// ============================================================================
// Supabase 글로벌 설정 & 세션 복원
// ============================================================================
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
        applyServerShopCatalog(data.avatar_config.shopCatalog);
      }
      if (Array.isArray(data.owned_items) && data.owned_items.length > 0) {
        applyServerSongsOverride(data.owned_items);
      }
    }
  } catch (e) {}
}

function applyServerSongsOverride(serverSongs) {
  if (!Array.isArray(serverSongs)) return;
  const map = new Map(QUESTIONS_DB.map((q, idx) => [q.id, idx]));
  serverSongs.forEach(sq => {
    if (!sq || !sq.id) return;
    if (sq._deleted) {
      const i = QUESTIONS_DB.findIndex(item => item.id === sq.id);
      if (i !== -1) QUESTIONS_DB.splice(i, 1);
      return;
    }
    if (map.has(sq.id)) {
      const idx = QUESTIONS_DB.findIndex(item => item.id === sq.id);
      if (idx !== -1) QUESTIONS_DB[idx] = { ...QUESTIONS_DB[idx], ...sq };
    } else {
      QUESTIONS_DB.push(sq);
    }
  });
  if (typeof updateLobbyCounts === "function") updateLobbyCounts();
}

async function restoreSupabaseSession() {
  await loadServerGlobalConfigs();
  if (!sbClient) return;
  try {
    const { data } = await sbClient.auth.getSession();
    const sessionUser = data?.session?.user;
    if (sessionUser) {
      const { data: prof } = await sbClient
        .from("profiles")
        .select("*")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (prof && prof.nickname !== "__ADMIN_CONFIG__") {
        userState.id = sessionUser.id;
        userState.nickname = prof.nickname;
        userState.bio = prof.bio || userState.bio;
        userState.cdCoins = prof.cd_coins ?? 100;
        userState.avatarConfig = { ...DEFAULT_AVATAR_CONFIG, ...(prof.avatar_config || {}) };
        userState.ownedItems = Array.isArray(prof.owned_items)
          ? prof.owned_items
          : ["meadow", "default", "none", "basic", "mic_silver"];
        userState.isLoggedIn = true;
        updateHeaderUserUI();
        if (typeof showHome === "function") showHome();
      }
    }
  } catch (e) {}
}

async function addCdCoins(amount) {
  userState.cdCoins = Math.max(0, userState.cdCoins + amount);
  updateHeaderUserUI();
  await syncProfileToServer();
}

async function syncProfileToServer() {
  updateHeaderUserUI();
  if (!sbClient || !userState.isLoggedIn || !userState.id) return;
  try {
    await sbClient.from("profiles").upsert({
      id: userState.id,
      nickname: userState.nickname,
      bio: userState.bio,
      cd_coins: userState.cdCoins,
      avatar_config: userState.avatarConfig,
      owned_items: userState.ownedItems,
      updated_at: new Date().toISOString()
    });
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

      userState.id = uid;
      userState.nickname = nickInput;
      userState.cdCoins = 100;
      userState.isLoggedIn = true;

      await sbClient.from("profiles").upsert({
        id: uid,
        nickname: nickInput,
        bio: userState.bio,
        cd_coins: userState.cdCoins,
        avatar_config: userState.avatarConfig,
        owned_items: userState.ownedItems
      });

      updateHeaderUserUI();
      showHome();
      gameAlert(`환영합니다, [${nickInput}]님!\n웰컴 보너스 💿 100 CD가 지급되었습니다!`, "🎉 가입 완료");
    } else {
      const { data, error } = await sbClient.auth.signInWithPassword({
        email,
        password: pwInput
      });

      if (error) {
        gameAlert("닉네임 또는 비밀번호가 일치하지 않습니다.\n처음 오셨다면 [회원가입] 버튼을 눌러주세요!");
        return;
      }

      const uid = data.user.id;
      const { data: prof } = await sbClient
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      userState.id = uid;
      userState.nickname = prof?.nickname || nickInput;
      userState.bio = prof?.bio || userState.bio;
      userState.cdCoins = prof?.cd_coins ?? 100;
      userState.avatarConfig = { ...DEFAULT_AVATAR_CONFIG, ...(prof?.avatar_config || {}) };
      userState.ownedItems = prof?.owned_items || userState.ownedItems;
      userState.isLoggedIn = true;

      updateHeaderUserUI();
      showHome();
    }
  } catch (err) {
    gameAlert("서버 통신 중 오류가 발생했습니다.");
  }
};

window.continueAsGuest = function () {
  userState.isLoggedIn = false;
  userState.nickname = "게스트도전자";
  updateHeaderUserUI();
  showHome();
};

window.handleLogout = async function () {
  gameConfirm("정말 로그아웃 하시겠습니까?", async () => {
    if (sbClient) {
      try { await sbClient.auth.signOut(); } catch (e) {}
    }
    userState.id = null;
    userState.isLoggedIn = false;
    userState.nickname = "게스트도전자";
    closeAllModals();
    showLoginScreen();
  }, "🚪 로그아웃");
};

// ============================================================================
// 2. 점수 랭킹 시스템
// ============================================================================
async function submitScoreToRanking(record) {
  if (!sbClient || !userState.isLoggedIn || !userState.id) return;
  try {
    await sbClient.from("rankings").insert({
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
    });
  } catch (e) {}
}

window.loadRankingsList = async function () {
  const listEl = document.getElementById("rankingListContainer");
  if (!listEl) return;
  listEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub);">랭킹 데이터를 불러오는 중...</div>`;

  if (!sbClient) return;

  const modeFilter = document.getElementById("rankFilterMode")?.value || "ALL";
  const stageFilter = document.getElementById("rankFilterStage")?.value || "ALL";

  try {
    let query = sbClient
      .from("rankings")
      .select("*")
      .order("score", { ascending: false })
      .limit(50);

    if (modeFilter !== "ALL") query = query.eq("game_mode", modeFilter);
    if (stageFilter !== "ALL") query = query.eq("stage", Number(stageFilter));

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub);">아직 등록된 랭킹 기록이 없습니다.<br/>첫 번째 1등에 도전해보세요!</div>`;
      return;
    }

    const modeLabel = { behind: "비하인드", lyrics: "가사", onesec: "1초듣기" };
    listEl.innerHTML = data
      .map((row, idx) => {
        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
        return `
        <div class="pixel-list-item" onclick="inspectOtherUser('${row.user_id}', '${row.nickname}')">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-weight:900; min-width:28px; color:var(--primary);">${medal}</span>
            <canvas class="rank-mini-canvas" width="480" height="480" style="width:42px; height:42px; border-radius:9px; border:1.5px solid #334155;" data-avatar='${JSON.stringify(row.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
            <div>
              <div style="font-weight:800; font-size:0.88rem;">${row.nickname} ${row.time_attack ? "⏱️" : ""}</div>
              <div style="font-size:0.74rem; color:var(--text-sub);">${modeLabel[row.game_mode] || row.game_mode} · ${row.stage}단계 · 정답률 ${row.accuracy}%</div>
            </div>
          </div>
          <div style="font-weight:900; color:var(--primary); font-size:0.95rem;">${row.score}점</div>
        </div>
      `;
      })
      .join("");

    listEl.querySelectorAll(".rank-mini-canvas").forEach(cv => {
      try {
        renderPixelAvatar(cv, JSON.parse(cv.getAttribute("data-avatar")));
      } catch (e) {}
    });
  } catch (err) {
    listEl.innerHTML = `<div style="text-align:center; padding:20px;">랭킹 조회 중 오류가 발생했습니다.</div>`;
  }
};

// ============================================================================
// 3. 액션퍼즐패밀리 스타일 전용 전체화면 상점 (#shopScreen)
// - 상점 진입 시 팝업이 아닌 전체 화면 전환!
// - 좌측 캐릭터 입어보기 + 우측 나무 보드 설명 + 하단 대형 단품 파츠 타일 그리드
// ============================================================================
window.openShopModal = function () {
  shopPreviewState.config = { ...userState.avatarConfig };
  const initItem = getItemById("hair", shopPreviewState.config.hair);
  shopPreviewState.selectedItem = { cat: "hair", ...initItem };
  switchScreen("shopScreen");
  renderShopCategory(shopPreviewState.selectedCat || "hair");
  updateShopPreviewCanvas();
};

window.changeShopGenderPreview = function (gender) {
  shopPreviewState.config.gender = gender;
  shopPreviewState.selectedItem = {
    cat: "gender",
    id: gender,
    name: gender === "male" ? "남자 아쿠 (기본)" : "여자 아쿠 (기본)",
    grade: "C",
    desc: gender === "male" ? "씩씩하고 귀여운\n음악왕 기본 남자 캐릭터" : "상큼발랄 리본이 매력적인\n음악왕 기본 여자 캐릭터",
    price: 0
  };
  renderShopCategory("gender");
  updateShopPreviewCanvas();
};

function updateShopPreviewCanvas() {
  const cv = document.getElementById("shopAvatarCanvas");
  if (cv) {
    renderPixelAvatar(cv, shopPreviewState.config, { transparentBg: true });
  }

  const cdSpan = document.getElementById("shopCdBalance");
  if (cdSpan) cdSpan.textContent = `${userState.cdCoins}`;

  const titleEl = document.getElementById("shopBoardTitle");
  const descEl = document.getElementById("shopBoardDesc");
  const confirmBtn = document.getElementById("shopConfirmActionBtn");
  if (!titleEl || !descEl || !confirmBtn) return;

  const sel = shopPreviewState.selectedItem || getItemById("hair", shopPreviewState.config.hair);
  titleEl.textContent = sel.name || "기본 스타일";
  descEl.textContent = sel.desc || "아이템을 눌러 먼저 입어보세요!";

  if (sel.cat === "special" && sel.id === "nickname_ticket") {
    confirmBtn.textContent = `🛍️ ${sel.price} CD 구매·닉변`;
    confirmBtn.className = "btn btn-gold";
    confirmBtn.onclick = purchaseNicknameTicket;
    return;
  }

  const isOwned = !sel.price || sel.price === 0 || userState.ownedItems.includes(sel.id);
  if (isOwned) {
    confirmBtn.textContent = "✅ 이 모습 장착 저장";
    confirmBtn.className = "btn btn-primary";
    confirmBtn.onclick = saveCurrentPreviewLook;
  } else {
    confirmBtn.textContent = `🛍️ 구매하기 (${sel.price} CD)`;
    confirmBtn.className = "btn btn-gold";
    confirmBtn.onclick = () => purchaseAndEquipPreviewItem(sel);
  }
}

window.resetShopPreview = function () {
  shopPreviewState.config = { ...userState.avatarConfig };
  const curHair = getItemById("hair", userState.avatarConfig.hair);
  shopPreviewState.selectedItem = { cat: "hair", ...curHair };
  renderShopCategory(shopPreviewState.selectedCat);
  updateShopPreviewCanvas();
};

async function saveCurrentPreviewLook() {
  for (const cat of ["bg", "hair", "hat", "face", "outfit", "acc"]) {
    const id = shopPreviewState.config[cat];
    const item = getItemById(cat, id);
    if (item && item.price > 0 && !userState.ownedItems.includes(id)) {
      gameAlert(`[${item.name}] 아이템은 아직 구매하지 않았습니다!\n우측 보드의 [구매하기] 버튼을 먼저 눌러주세요.`);
      return;
    }
  }
  userState.avatarConfig = { ...shopPreviewState.config };
  await syncProfileToServer();
  renderShopCategory(shopPreviewState.selectedCat);
  updateShopPreviewCanvas();
  gameAlert("캐릭터 코스튬 장착이 저장되었습니다!", "👗 장착 완료");
}

async function purchaseAndEquipPreviewItem(sel) {
  if (userState.cdCoins < sel.price) {
    gameAlert(`💿 CD가 부족합니다!\n(보유: ${userState.cdCoins} CD / 필요: ${sel.price} CD)\n문제를 풀고 점수를 얻으면 CD가 지급됩니다!`);
    return;
  }

  gameConfirm(`[${sel.name}] 코스튬을 💿 ${sel.price} CD에 구매하고 장착할까요?`, async () => {
    userState.cdCoins -= sel.price;
    if (!userState.ownedItems.includes(sel.id)) {
      userState.ownedItems.push(sel.id);
    }
    userState.avatarConfig = { ...shopPreviewState.config };
    await syncProfileToServer();
    renderShopCategory(shopPreviewState.selectedCat);
    updateShopPreviewCanvas();
    gameAlert(`🎉 [${sel.name}] 구매 및 장착 완료!`, "🛍️ 구매 성공");
  }, "🛍️ 코스튬 구매");
}

function purchaseNicknameTicket() {
  const item = getItemById("special", "nickname_ticket");
  const price = item ? item.price : 100;

  if (!userState.isLoggedIn) {
    gameAlert("닉네임 변경권은 로그인한 계정에서 사용할 수 있습니다!");
    return;
  }
  if (userState.cdCoins < price) {
    gameAlert(`💿 CD가 부족합니다! (보유: ${userState.cdCoins} CD / 필요: ${price} CD)`);
    return;
  }

  gamePrompt(`🎫 닉네임 변경권 (${price} CD)\n새 닉네임을 입력해주세요 (2~12자):`, userState.nickname, async newNick => {
    if (!newNick || newNick.length < 2) {
      gameAlert("닉네임은 2글자 이상이어야 합니다.");
      return;
    }
    if (newNick === userState.nickname) {
      gameAlert("현재 닉네임과 동일합니다.");
      return;
    }

    const { data: exist } = await sbClient
      .from("profiles")
      .select("id")
      .eq("nickname", newNick)
      .maybeSingle();

    if (exist) {
      gameAlert("이미 다른 유저가 사용 중인 닉네임입니다!");
      return;
    }

    userState.cdCoins -= price;
    userState.nickname = newNick;
    await syncProfileToServer();
    updateShopPreviewCanvas();
    gameAlert(`✨ 닉네임이 [${newNick}](으)로 변경되었습니다!`, "🎫 닉네임 변경 완료");
  }, "🎫 닉네임 변경권 사용");
}

window.renderShopCategory = function (cat) {
  shopPreviewState.selectedCat = cat;
  document.querySelectorAll("[data-shop-cat]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-shop-cat") === cat);
  });

  const grid = document.getElementById("shopItemsGrid");
  if (!grid) return;

  // 'gender' 탭일 때는 남자 캐릭터 / 여자 캐릭터 선택 타일 표시
  if (cat === "gender") {
    const gList = [
      { id: "male", name: "남자 아쿠", grade: "C" },
      { id: "female", name: "여자 아쿠", grade: "C" }
    ];
    grid.innerHTML = gList
      .map(g => {
        const selected = shopPreviewState.config.gender === g.id;
        return `
        <div class="apf-tile owned-tile ${selected ? "preview-selected" : ""}" onclick="changeShopGenderPreview('${g.id}')">
          ${selected ? `<div class="apf-tile-check">✔</div>` : ""}
          <canvas id="shopGenderThumb_${g.id}" width="240" height="240" style="width:58px; height:58px;"></canvas>
          <span class="apf-tile-name">${g.name}</span>
          <div class="apf-tile-grade grade-C">C</div>
        </div>
      `;
      })
      .join("");

    gList.forEach(g => {
      const cv = document.getElementById(`shopGenderThumb_${g.id}`);
      if (cv) renderPixelAvatar(cv, { ...DEFAULT_AVATAR_CONFIG, gender: g.id }, { transparentBg: true });
    });
    return;
  }

  const items = AVATAR_SHOP_ITEMS[cat] || [];
  grid.innerHTML = items
    .map((item, idx) => {
      const owned = item.price === 0 || userState.ownedItems.includes(item.id);
      const previewing =
        cat === "special"
          ? shopPreviewState.selectedItem?.id === item.id
          : shopPreviewState.config[cat] === item.id;
      const grade = item.grade || "C";

      return `
      <div class="apf-tile ${owned && cat !== "special" ? "owned-tile" : ""} ${previewing ? "preview-selected" : ""}" onclick="previewShopItem('${cat}', '${item.id}')">
        ${previewing ? `<div class="apf-tile-check">✔</div>` : ""}
        <canvas id="shopThumb_${cat}_${idx}" width="240" height="240" style="width:58px; height:58px;"></canvas>
        <span class="apf-tile-name">${item.name} ${!owned || cat === "special" ? `(${item.price})` : ""}</span>
        <div class="apf-tile-grade grade-${grade}">${grade}</div>
      </div>
    `;
    })
    .join("");

  items.forEach((item, idx) => {
    const cv = document.getElementById(`shopThumb_${cat}_${idx}`);
    if (cv) renderItemThumbnail(cv, cat, item);
  });
};

window.previewShopItem = function (cat, itemId) {
  const item = getItemById(cat, itemId);
  shopPreviewState.selectedItem = { cat, ...item };
  if (cat !== "special") {
    shopPreviewState.config[cat] = itemId;
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
  if (cv) renderPixelAvatar(cv, userState.avatarConfig);

  document.getElementById("profileNickDisplay").textContent = userState.nickname;
  document.getElementById("profileCdDisplay").textContent = `💿 ${userState.cdCoins} CD`;
  document.getElementById("profileBioInput").value = userState.bio;

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

      if (bestScore > 0) {
        const { count } = await sbClient
          .from("rankings")
          .select("*", { count: "exact", head: true })
          .gt("score", bestScore);
        document.getElementById("statMyRank").textContent = `전체 ${(count || 0) + 1}위`;
      } else {
        document.getElementById("statMyRank").textContent = "기록 없음";
      }
    } catch (e) {}
  }
};

window.saveMyBio = async function () {
  const newBio = document.getElementById("profileBioInput").value.trim();
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

  if (sbClient) {
    const { data } = await sbClient.from("profiles").select("*").eq("id", targetId).maybeSingle();
    if (data) {
      document.getElementById("inspectNick").textContent = data.nickname;
      document.getElementById("inspectBio").textContent = data.bio || "소개가 없습니다.";
      const cv = document.getElementById("inspectAvatarCanvas");
      if (cv) renderPixelAvatar(cv, data.avatar_config || DEFAULT_AVATAR_CONFIG);
    }
    const { data: recs } = await sbClient.from("rankings").select("score, accuracy").eq("user_id", targetId);
    const best = recs && recs.length > 0 ? Math.max(...recs.map(r => r.score || 0)) : 0;
    const el = document.getElementById("inspectStatsSummary");
    if (el) el.textContent = `총 플레이 ${recs ? recs.length : 0}회 · 최고 기록 ${best}점`;
  }
};

// ============================================================================
// 5. 상용 게임 스타일 친구창 & 1:1 DM 시스템
// ============================================================================
window.openSocialModal = async function (tab = "friends") {
  if (!userState.isLoggedIn) {
    gameConfirm("친구 및 DM 기능은 로그인 후 이용하실 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }
  openModal("socialModal");
  switchSocialTab(tab);
};

window.switchSocialTab = async function (tab) {
  ["friends", "requests", "dm"].forEach(t => {
    const chip = document.getElementById(`socialTab_${t}`);
    const pane = document.getElementById(`socialPane_${t}`);
    if (chip) chip.classList.toggle("active", t === tab);
    if (pane) pane.classList.toggle("hidden", t !== tab);
  });

  if (tab === "friends" || tab === "requests") {
    await loadFriendsData();
  } else {
    await loadDirectMessages();
  }
};

window.sendFriendRequestByNick = async function (targetNickParam) {
  if (!userState.isLoggedIn) {
    showLoginScreen();
    return;
  }
  const nick = targetNickParam || document.getElementById("friendSearchInput").value.trim();
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

  document.getElementById("friendSearchInput").value = "";
  gameAlert(`💌 [${targetProf.nickname}]님에게 친구 신청을 보냈습니다!`);
  loadFriendsData();
};

async function loadFriendsData() {
  const acceptedBox = document.getElementById("friendsListContainer");
  const pendingBox = document.getElementById("friendRequestsContainer");
  if (!acceptedBox || !pendingBox || !sbClient || !userState.id) return;

  const { data: rels } = await sbClient
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${userState.id},receiver_id.eq.${userState.id}`);

  if (!rels || rels.length === 0) {
    acceptedBox.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub);">등록된 친구가 없습니다.<br/>[친구 찾기·요청] 탭에서 친구를 추가해보세요!</div>`;
    pendingBox.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-sub);">대기 중인 친구 요청이 없습니다.</div>`;
    return;
  }

  const otherIds = rels.map(r => (r.requester_id === userState.id ? r.receiver_id : r.requester_id));
  const { data: profs } = await sbClient.from("profiles").select("*").in("id", otherIds);
  const profMap = new Map((profs || []).map(p => [p.id, p]));

  const acceptedRels = rels.filter(r => r.status === "accepted");
  const pendingRels = rels.filter(r => r.status === "pending");

  // 1) 내 친구 목록 (480x480 캐릭터 아이콘 + 닉네임 + 상태메시지 + DM/삭제 버튼)
  if (acceptedRels.length === 0) {
    acceptedBox.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub);">아직 수락된 친구가 없습니다.</div>`;
  } else {
    acceptedBox.innerHTML = acceptedRels
      .map(r => {
        const otherId = r.requester_id === userState.id ? r.receiver_id : r.requester_id;
        const p = profMap.get(otherId) || { nickname: "유저", bio: "" };
        return `
        <div class="pixel-list-item">
          <div style="display:flex; align-items:center; gap:9px;" onclick="inspectOtherUser('${otherId}', '${p.nickname}')">
            <canvas class="friend-mini-cv" width="480" height="480" style="width:42px; height:42px; border-radius:10px; border:1.5px solid #334155;" data-avatar='${JSON.stringify(p.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
            <div>
              <div style="font-weight:900; font-size:0.9rem;">${p.nickname}</div>
              <div style="font-size:0.74rem; color:var(--text-sub);">${(p.bio || "상태 메시지가 없습니다.").slice(0, 22)}</div>
            </div>
          </div>
          <div style="display:flex; gap:4px;">
            <button class="btn btn-primary" style="padding:5px 9px; font-size:0.75rem;" onclick="prepareDmTo('${otherId}', '${p.nickname}')">💬 채팅</button>
            <button class="btn" style="padding:5px 8px; font-size:0.75rem; color:var(--danger);" onclick="removeFriendship(${r.id}, '${p.nickname}')">삭제</button>
          </div>
        </div>
      `;
      })
      .join("");
  }

  // 2) 받은/보낸 요청 목록
  if (pendingRels.length === 0) {
    pendingBox.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-sub);">받은 친구 요청이 없습니다.</div>`;
  } else {
    pendingBox.innerHTML = pendingRels
      .map(r => {
        const isIncoming = r.receiver_id === userState.id;
        const otherId = isIncoming ? r.requester_id : r.receiver_id;
        const p = profMap.get(otherId) || { nickname: "유저" };
        return `
        <div class="pixel-list-item">
          <div style="display:flex; align-items:center; gap:8px;">
            <canvas class="friend-mini-cv" width="480" height="480" style="width:38px; height:38px; border-radius:9px; border:1.5px solid #334155;" data-avatar='${JSON.stringify(p.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
            <div>
              <strong>${p.nickname}</strong>
              <div style="font-size:0.72rem; color:var(--primary);">${isIncoming ? "📩 나를 친구 추가하고 싶어합니다" : "⏳ 상대방의 수락 대기중"}</div>
            </div>
          </div>
          <div style="display:flex; gap:4px;">
            ${
              isIncoming
                ? `<button class="btn btn-primary" style="padding:5px 9px; font-size:0.75rem;" onclick="acceptFriendRequest(${r.id})">수락</button>`
                : ""
            }
            <button class="btn" style="padding:5px 8px; font-size:0.75rem;" onclick="removeFriendship(${r.id}, '${p.nickname}')">거절/취소</button>
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

window.prepareDmTo = function (receiverId, receiverNick) {
  closeModal("userInspectModal");
  openModal("socialModal");
  switchSocialTab("dm");
  document.getElementById("dmTargetId").value = receiverId;
  document.getElementById("dmTargetNickInput").value = receiverNick;
  document.getElementById("dmContentInput").focus();
};

window.sendDirectMessage = async function () {
  const targetNick = document.getElementById("dmTargetNickInput").value.trim();
  const content = document.getElementById("dmContentInput").value.trim();
  let targetId = document.getElementById("dmTargetId").value;

  if (!targetNick || !content) {
    gameAlert("받는 사람 닉네임과 메시지 내용을 입력해주세요.");
    return;
  }

  if (!targetId) {
    const { data: prof } = await sbClient
      .from("profiles")
      .select("id")
      .eq("nickname", targetNick)
      .maybeSingle();
    if (!prof) {
      gameAlert(`[${targetNick}] 유저를 찾을 수 없습니다.`);
      return;
    }
    targetId = prof.id;
  }

  await sbClient.from("direct_messages").insert({
    sender_id: userState.id,
    receiver_id: targetId,
    content
  });

  document.getElementById("dmContentInput").value = "";
  loadDirectMessages();
};

async function loadDirectMessages() {
  const box = document.getElementById("dmListContainer");
  if (!box || !sbClient || !userState.id) return;

  const { data: msgs } = await sbClient
    .from("direct_messages")
    .select("*")
    .or(`sender_id.eq.${userState.id},receiver_id.eq.${userState.id}`)
    .order("created_at", { ascending: false })
    .limit(40);

  if (!msgs || msgs.length === 0) {
    box.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-sub);">주고받은 DM 메시지가 없습니다.</div>`;
    return;
  }

  const uids = [...new Set(msgs.flatMap(m => [m.sender_id, m.receiver_id]))];
  const { data: profs } = await sbClient.from("profiles").select("id, nickname").in("id", uids);
  const nameMap = new Map((profs || []).map(p => [p.id, p.nickname]));

  box.innerHTML = msgs
    .map(m => {
      const isMine = m.sender_id === userState.id;
      const otherId = isMine ? m.receiver_id : m.sender_id;
      const otherNick = nameMap.get(otherId) || "유저";
      return `
      <div class="pixel-list-item" style="flex-direction:column; align-items:flex-start; gap:3px;" onclick="prepareDmTo('${otherId}', '${otherNick}')">
        <div style="font-size:0.74rem; color:var(--primary); font-weight:800;">
          ${isMine ? `📤 나 ➔ ${otherNick}` : `📩 ${otherNick} ➔ 나`}
        </div>
        <div style="font-size:0.86rem; color:var(--text-main);">${m.content}</div>
      </div>
    `;
    })
    .join("");
}

// ============================================================================
// 6. 대기실 로비 (방 목록 + 접속 유저 아이콘 리스트) vs 방 내부 (맵 캐릭터 + 방 채팅 + 방 삭제)
// ============================================================================
window.enterPlazaScreen = async function () {
  switchScreen("plazaScreen");
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

  const players = Array.from(plazaState.onlinePlayers.values());
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
      <div class="pixel-list-item" style="padding:6px 9px;" onclick="inspectOtherUser('${p.userId || ""}', '${p.nickname}')">
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

  // 인원이 0명인 유령 방이 있으면 자동 정리
  const validRooms = (rooms || []).filter(r => Array.isArray(r.players) && r.players.length > 0);

  if (validRooms.length === 0) {
    box.innerHTML = `<div style="text-align:center; padding:22px; color:var(--text-sub); font-size:0.84rem;">현재 생성된 대기 방이 없습니다.<br/>하단 <strong>[방 만들기]</strong> 버튼으로 새 방을 열어보세요!</div>`;
    return;
  }

  box.innerHTML = validRooms
    .map(room => {
      const maxP = room.room_type === "1v1" ? 2 : 4;
      const curP = room.players.length;
      return `
      <div class="pixel-list-item">
        <div>
          <span class="badge primary" style="margin-right:4px;">${room.room_type === "1v1" ? "1:1 선착순" : "4인 점수제"}</span>
          <strong>${room.title}</strong>
          <span style="font-size:0.76rem; color:var(--text-sub);">(${curP}/${maxP}명)</span>
        </div>
        <button class="btn btn-primary" style="padding:5px 10px; font-size:0.78rem;" onclick="joinOnlineRoom('${room.id}')">입장 ➔</button>
      </div>
    `;
    })
    .join("");
};

window.openCreateRoomModal = function (defaultType = "1v1") {
  if (!userState.isLoggedIn) {
    gameConfirm("온라인 방 만들기는 로그인 후 가능합니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }
  gamePrompt(
    `${defaultType === "1v1" ? "⚡ [1:1 선착순 대전]" : "🏆 [4인 점수제 대전]"} 방 제목을 입력해주세요:`,
    `${userState.nickname}님의 대결방!`,
    async title => {
      if (!title) return;
      const shuffledIds = shuffleArray(QUESTIONS_DB).slice(0, 10).map(q => q.id);
      const initialPlayers = [
        {
          id: userState.id,
          nickname: userState.nickname,
          avatarConfig: userState.avatarConfig,
          score: 0
        }
      ];

      const { data, error } = await sbClient
        .from("rooms")
        .insert({
          title,
          host_id: userState.id,
          room_type: defaultType,
          game_config: { mode: "behind", stage: 1 },
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

      joinOnlineRoom(data.id);
    },
    "⚔️ 방 만들기"
  );
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
      avatarConfig: userState.avatarConfig,
      score: 0
    });
    await sbClient.from("rooms").update({ players }).eq("id", roomId);
    room.players = players;
  }

  plazaState.currentRoom = room;
  plazaState.roomPlayersMap.clear();
  document.getElementById("roomChatLog").innerHTML = "";
  subscribeToBattleRoom(room);
};

// 방 내부 입장: 방 안에서만 맵 캐릭터(480x480)가 보이고 방 채팅이 작동!
function subscribeToBattleRoom(room) {
  if (plazaState.roomChannel) {
    sbClient.removeChannel(plazaState.roomChannel);
  }

  openModal("battleRoomModal");
  renderBattleRoomState(room);
  startRoomStageCanvasLoop();

  plazaState.roomChannel = sbClient
    .channel(`room_${room.id}`)
    .on("broadcast", { event: "room_update" }, ({ payload }) => {
      if (payload) {
        plazaState.currentRoom = payload;
        renderBattleRoomState(payload);
      }
    })
    .on("broadcast", { event: "room_char_sync" }, ({ payload }) => {
      if (payload && payload.id) {
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
          payload: room
        });
      }
    });
}

function broadcastMyRoomCharacter(newChatLine = "") {
  if (!plazaState.currentRoom) return;
  const payload = {
    id: userState.id || "me",
    nickname: userState.nickname,
    avatarConfig: userState.avatarConfig,
    x: plazaState.myRoomX,
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
  div.innerHTML = `<strong style="color:var(--primary);">${nick}:</strong> ${msg}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

// 방 내부 전용 맵 캔버스 (방에 들어온 사람들의 480x480 캐릭터가 움직이고 말풍선 표시)
function startRoomStageCanvasLoop() {
  const canvas = document.getElementById("roomStageCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  canvas.onclick = e => {
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    plazaState.myRoomX = Math.max(40, Math.min(canvas.width - 40, clickX));
    broadcastMyRoomCharacter("");
  };

  const offscreen = document.createElement("canvas");
  offscreen.width = 480;
  offscreen.height = 480;

  const loop = () => {
    if (document.getElementById("battleRoomModal").classList.contains("hidden")) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 방 내부 스테이지 배경
    const grad = ctx.createLinearGradient(0, 0, 0, 95);
    grad.addColorStop(0, "#7dd3fc");
    grad.addColorStop(1, "#e0f2fe");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, 95);
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(0, 95, canvas.width, 10);
    ctx.fillStyle = "#16a34a";
    ctx.fillRect(0, 105, canvas.width, 30);

    const room = plazaState.currentRoom;
    const roomPlayers = room && Array.isArray(room.players) ? room.players : [];

    roomPlayers.forEach((rp, idx) => {
      const live = plazaState.roomPlayersMap.get(rp.id) || {};
      const cfg = live.avatarConfig || rp.avatarConfig || DEFAULT_AVATAR_CONFIG;
      renderPixelAvatar(offscreen, cfg, { transparentBg: true });

      const defaultX = 80 + idx * 95;
      const drawX = live.x || defaultX;
      ctx.drawImage(offscreen, drawX - 32, 38, 64, 64);

      // 닉네임 태그
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
      const tagW = ctx.measureText(rp.nickname).width + 12;
      ctx.fillRect(drawX - tagW / 2, 103, tagW, 16);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(rp.nickname, drawX, 115);

      // 말풍선
      if (live.chatMsg) {
        ctx.fillStyle = "#ffffff";
        const msgW = Math.min(160, ctx.measureText(live.chatMsg).width + 14);
        ctx.fillRect(drawX - msgW / 2, 16, msgW, 20);
        ctx.strokeStyle = "#4f46e5";
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX - msgW / 2, 16, msgW, 20);
        ctx.fillStyle = "#0f172a";
        ctx.fillText(live.chatMsg.slice(0, 16), drawX, 30);
      }
    });

    plazaState.roomAnimFrame = requestAnimationFrame(loop);
  };

  if (plazaState.roomAnimFrame) cancelAnimationFrame(plazaState.roomAnimFrame);
  plazaState.roomAnimFrame = requestAnimationFrame(loop);
}

function renderBattleRoomState(room) {
  document.getElementById("battleRoomTitle").textContent = `[${room.room_type === "1v1" ? "1:1 선착순" : "4인 점수제"}] ${room.title}`;

  const playersEl = document.getElementById("battlePlayersBoard");
  playersEl.innerHTML = (room.players || [])
    .map(
      p => `
      <div class="score-rule-item">
        <span>${p.id === room.host_id ? "👑" : "👤"} ${p.nickname}</span>
        <strong class="score-plus">${p.score || 0}점</strong>
      </div>
    `
    )
    .join("");

  const startBtn = document.getElementById("battleHostStartBtn");
  const playArea = document.getElementById("battlePlayArea");

  if (room.status === "waiting") {
    playArea.classList.add("hidden");
    startBtn.classList.toggle("hidden", room.host_id !== userState.id);
  } else if (room.status === "playing") {
    startBtn.classList.add("hidden");
    playArea.classList.remove("hidden");
    const qId = (room.question_ids || [])[room.current_q_index || 0];
    const q = QUESTIONS_DB.find(item => item.id === qId) || QUESTIONS_DB[0];
    document.getElementById("battleQProgress").textContent = `라운드 ${(room.current_q_index || 0) + 1} / ${(room.question_ids || []).length}`;
    document.getElementById("battleArtistHint").textContent = `🎤 가수 힌트: ${q.artist} (${q.year}년)`;
    document.getElementById("battleQuestionText").textContent = q.behindQuestion;
  } else if (room.status === "finished") {
    startBtn.classList.add("hidden");
    playArea.classList.remove("hidden");
    const sorted = [...(room.players || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
    const winner = sorted[0];
    document.getElementById("battleQuestionText").innerHTML = `🏆 <strong>대전 종료! 우승자: ${winner ? winner.nickname : "없음"} (${winner ? winner.score : 0}점)</strong>`;
  }
}

window.hostStartOnlineBattle = async function () {
  const room = plazaState.currentRoom;
  if (!room) return;
  room.status = "playing";
  room.current_q_index = 0;
  await sbClient.from("rooms").update({ status: "playing", current_q_index: 0 }).eq("id", room.id);
  plazaState.roomChannel.send({ type: "broadcast", event: "room_update", payload: room });
  renderBattleRoomState(room);
};

window.submitOnlineBattleAnswer = async function () {
  const room = plazaState.currentRoom;
  if (!room || room.status !== "playing") return;

  const input = document.getElementById("battleAnswerInput");
  const val = input.value.trim();
  if (!val) return;

  const qId = (room.question_ids || [])[room.current_q_index || 0];
  const q = QUESTIONS_DB.find(item => item.id === qId) || QUESTIONS_DB[0];

  if (isTitleMatch(val, q) || isArtistMatch(val, q)) {
    input.value = "";
    room.players = (room.players || []).map(p =>
      p.id === userState.id ? { ...p, score: (p.score || 0) + 100 } : p
    );

    if ((room.current_q_index || 0) + 1 >= (room.question_ids || []).length) {
      room.status = "finished";
      addCdCoins(30);
    } else {
      room.current_q_index = (room.current_q_index || 0) + 1;
    }

    await sbClient
      .from("rooms")
      .update({
        players: room.players,
        current_q_index: room.current_q_index,
        status: room.status
      })
      .eq("id", room.id);

    plazaState.roomChannel.send({ type: "broadcast", event: "room_update", payload: room });
    renderBattleRoomState(room);
  } else {
    gameAlert("❌ 오답입니다! 다시 생각해보세요!");
  }
};

// 혼자 있는데 방 나가면(또는 마지막 남은 사람이 나가면) 방 즉시 삭제!
window.leaveBattleRoom = async function () {
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
  closeModal("battleRoomModal");
  refreshRoomsList();
};
