// ============================================================================
// [음악왕] Supabase 온라인 멀티플레이 · 랭킹 · 친구 · DM · 대기실 시스템 (online.js)
// - Project URL: https://szafomntmenppcbczrwl.supabase.co
// ============================================================================

const SUPABASE_URL = "https://szafomntmenppcbczrwl.supabase.co";
const SUPABASE_KEY = "sb_publishable_msR49lWjgSJQnMQxSzIaug_XXlJUd4Z";

let sbClient = null;
if (window.supabase && window.supabase.createClient) {
  sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

const userState = {
  id: localStorage.getItem("mk_user_id") || null,
  nickname: localStorage.getItem("mk_nickname") || "게스트도전자",
  bio: localStorage.getItem("mk_bio") || "안녕하세요! 음악왕 도전자입니다.",
  cdCoins: Number(localStorage.getItem("mk_cd_coins") || 100), // 초기 웰컴 100 CD 지급
  avatarConfig: JSON.parse(localStorage.getItem("mk_avatar_config") || "null") || { ...DEFAULT_AVATAR_CONFIG },
  ownedItems: JSON.parse(localStorage.getItem("mk_owned_items") || '["meadow","default","none","basic","mic_silver"]'),
  isLoggedIn: Boolean(localStorage.getItem("mk_user_id"))
};

// 대기실 및 온라인 대전 상태
const plazaState = {
  channel: null,
  onlinePlayers: new Map(), // id -> { id, nickname, avatarConfig, x, dir, chatMsg, chatExpire }
  myX: 120,
  myDir: 1,
  myChat: "",
  myChatExpire: 0,
  animFrame: null,
  currentRoom: null,
  roomChannel: null
};

function saveUserStateLocal() {
  if (userState.id) localStorage.setItem("mk_user_id", userState.id);
  localStorage.setItem("mk_nickname", userState.nickname);
  localStorage.setItem("mk_bio", userState.bio);
  localStorage.setItem("mk_cd_coins", String(userState.cdCoins));
  localStorage.setItem("mk_avatar_config", JSON.stringify(userState.avatarConfig));
  localStorage.setItem("mk_owned_items", JSON.stringify(userState.ownedItems));
  updateHeaderUserUI();
}

function updateHeaderUserUI() {
  const cdEl = document.getElementById("headerCdCount");
  if (cdEl) cdEl.textContent = `${userState.cdCoins}`;

  const nickEl = document.getElementById("headerUserNick");
  if (nickEl) {
    nickEl.textContent = userState.isLoggedIn ? userState.nickname : "로그인";
  }

  const miniCanvas = document.getElementById("headerMiniAvatar");
  if (miniCanvas) {
    renderPixelAvatar(miniCanvas, userState.avatarConfig);
  }
  const homeCanvas = document.getElementById("homeHeroAvatar");
  if (homeCanvas) {
    renderPixelAvatar(homeCanvas, userState.avatarConfig);
  }
}

// 닉네임 -> 내부 이메일 변환 (이메일 입력 없이 닉네임+비번으로 가입/로그인 지원)
function nicknameToEmail(nick) {
  const hex = Array.from(nick.trim())
    .map(c => c.charCodeAt(0).toString(16))
    .join("");
  return `u_${hex.slice(0, 36)}@musicking.com`;
}

// CD 코인 추가 및 서버 동기화
async function addCdCoins(amount) {
  userState.cdCoins = Math.max(0, userState.cdCoins + amount);
  saveUserStateLocal();
  if (sbClient && userState.isLoggedIn && userState.id) {
    try {
      await sbClient
        .from("profiles")
        .update({ cd_coins: userState.cdCoins, updated_at: new Date().toISOString() })
        .eq("id", userState.id);
    } catch (e) {}
  }
}

async function syncProfileToServer() {
  saveUserStateLocal();
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
// 1. 회원가입 / 로그인 / 프로필 관리
// ============================================================================
async function handleAuthSubmit(mode) {
  const nickInput = document.getElementById("authNicknameInput").value.trim();
  const pwInput = document.getElementById("authPasswordInput").value.trim();

  if (!nickInput || nickInput.length < 2) {
    alert("닉네임을 2글자 이상 입력해주세요.");
    return;
  }
  if (!pwInput || pwInput.length < 6) {
    alert("비밀번호는 6자리 이상 입력해주세요.");
    return;
  }

  if (!sbClient) {
    alert("서버 연결을 초기화할 수 없습니다.");
    return;
  }

  const email = nicknameToEmail(nickInput);

  try {
    if (mode === "signup") {
      // 중복 닉네임 체크
      const { data: existNick } = await sbClient
        .from("profiles")
        .select("id")
        .eq("nickname", nickInput)
        .maybeSingle();

      if (existNick) {
        alert("이미 사용 중인 닉네임입니다! 다른 닉네임을 선택하거나 로그인을 눌러주세요.");
        return;
      }

      const { data, error } = await sbClient.auth.signUp({
        email,
        password: pwInput
      });

      if (error) {
        alert(`회원가입 오류: ${error.message}`);
        return;
      }

      const uid = data?.user?.id;
      if (!uid) {
        alert("회원가입 처리 중 문제가 발생했습니다.");
        return;
      }

      userState.id = uid;
      userState.nickname = nickInput;
      userState.isLoggedIn = true;

      await sbClient.from("profiles").upsert({
        id: uid,
        nickname: nickInput,
        bio: userState.bio,
        cd_coins: userState.cdCoins,
        avatar_config: userState.avatarConfig,
        owned_items: userState.ownedItems
      });

      saveUserStateLocal();
      alert(`🎉 환영합니다, [${nickInput}]님! 가입 보너스 100 CD가 준비되었습니다.`);
      closeModal("authModal");
    } else {
      // 로그인
      const { data, error } = await sbClient.auth.signInWithPassword({
        email,
        password: pwInput
      });

      if (error) {
        alert("닉네임 또는 비밀번호가 일치하지 않거나, 이메일 확인 설정(Confirm Email)이 켜져 있는지 확인해주세요.");
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
      userState.cdCoins = prof?.cd_coins ?? userState.cdCoins;
      userState.avatarConfig = prof?.avatar_config || userState.avatarConfig;
      userState.ownedItems = prof?.owned_items || userState.ownedItems;
      userState.isLoggedIn = true;

      saveUserStateLocal();
      alert(`👋 반갑습니다, [${userState.nickname}]님!`);
      closeModal("authModal");
    }
  } catch (err) {
    alert("통신 중 오류가 발생했습니다.");
  }
}

async function handleLogout() {
  if (sbClient) {
    try { await sbClient.auth.signOut(); } catch (e) {}
  }
  localStorage.removeItem("mk_user_id");
  userState.id = null;
  userState.isLoggedIn = false;
  userState.nickname = "게스트도전자";
  updateHeaderUserUI();
  closeModal("profileModal");
  alert("로그아웃 되었습니다.");
}

// ============================================================================
// 2. 점수 랭킹 시스템 (난이도/모드별 리더보드)
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

async function loadRankingsList() {
  const listEl = document.getElementById("rankingListContainer");
  if (!listEl) return;
  listEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub);">랭킹 데이터를 불러오는 중...</div>`;

  if (!sbClient) {
    listEl.innerHTML = `<div style="text-align:center; padding:20px;">서버에 연결되어 있지 않습니다.</div>`;
    return;
  }

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
      listEl.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub);">아직 등록된 랭킹 기록이 없습니다.<br/>로그인 후 첫 번째 1등에 도전해보세요!</div>`;
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
            <canvas class="rank-mini-canvas" width="36" height="36" data-avatar='${JSON.stringify(row.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
            <div>
              <div style="font-weight:800; font-size:0.88rem;">${row.nickname} ${row.time_attack ? "⏱️" : ""}</div>
              <div style="font-size:0.72rem; color:var(--text-sub);">${modeLabel[row.game_mode] || row.game_mode} · ${row.stage}단계 · 정답률 ${row.accuracy}%</div>
            </div>
          </div>
          <div style="font-weight:900; color:var(--primary); font-size:0.95rem;">${row.score}점</div>
        </div>
      `;
      })
      .join("");

    listEl.querySelectorAll(".rank-mini-canvas").forEach(cv => {
      try {
        const cfg = JSON.parse(cv.getAttribute("data-avatar"));
        renderPixelAvatar(cv, cfg);
      } catch (e) {}
    });
  } catch (err) {
    listEl.innerHTML = `<div style="text-align:center; padding:20px;">랭킹 조회 중 오류가 발생했습니다.</div>`;
  }
}

// ============================================================================
// 3. 캐릭터 꾸미기 & CD 상점 모달
// ============================================================================
let currentShopCategory = "hair";

function openShopModal() {
  openModal("shopModal");
  renderShopCategory(currentShopCategory);
  updateShopPreview();
}

function updateShopPreview() {
  const cv = document.getElementById("shopAvatarCanvas");
  if (cv) renderPixelAvatar(cv, userState.avatarConfig);
  const cdSpan = document.getElementById("shopCdBalance");
  if (cdSpan) cdSpan.textContent = `${userState.cdCoins} CD`;
  updateHeaderUserUI();
}

function renderShopCategory(cat) {
  currentShopCategory = cat;
  document.querySelectorAll("[data-shop-cat]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-shop-cat") === cat);
  });

  const grid = document.getElementById("shopItemsGrid");
  if (!grid) return;

  const items = AVATAR_SHOP_ITEMS[cat] || [];
  grid.innerHTML = items
    .map(item => {
      const owned = item.price === 0 || userState.ownedItems.includes(item.id);
      const equipped = userState.avatarConfig[cat] === item.id;
      let btnLabel = equipped ? "장착중" : owned ? "장착하기" : `💿 ${item.price} CD`;
      return `
      <div class="shop-item-card ${equipped ? "equipped" : ""}" onclick="handleShopItemClick('${cat}', '${item.id}', ${item.price})">
        <div class="shop-item-name">${item.name}</div>
        <button class="btn ${equipped ? "btn-primary" : ""}" style="width:100%; padding:6px; font-size:0.78rem;">
          ${btnLabel}
        </button>
      </div>
    `;
    })
    .join("");
}

window.handleShopItemClick = async function (cat, itemId, price) {
  const owned = price === 0 || userState.ownedItems.includes(itemId);
  if (!owned) {
    if (userState.cdCoins < price) {
      alert(`💿 CD가 부족합니다! (보유: ${userState.cdCoins} CD / 필요: ${price} CD)\n문제를 풀고 점수를 획득하면 CD가 지급됩니다!`);
      return;
    }
    if (!confirm(`[${getItemById(cat, itemId).name}] 아이템을 ${price} CD에 구매하시겠습니까?`)) {
      return;
    }
    userState.cdCoins -= price;
    userState.ownedItems.push(itemId);
  }

  userState.avatarConfig[cat] = itemId;
  await syncProfileToServer();
  renderShopCategory(cat);
  updateShopPreview();
};

// ============================================================================
// 4. 내 프로필 & 타 유저 프로필 / 친구 추가 / 1:1 DM
// ============================================================================
function openMyProfileModal() {
  if (!userState.isLoggedIn) {
    openModal("authModal");
    return;
  }
  openModal("profileModal");
  const cv = document.getElementById("profileAvatarCanvas");
  if (cv) renderPixelAvatar(cv, userState.avatarConfig);
  document.getElementById("profileNickDisplay").textContent = userState.nickname;
  document.getElementById("profileCdDisplay").textContent = `💿 보유 CD: ${userState.cdCoins}개`;
  document.getElementById("profileBioInput").value = userState.bio;
}

async function saveMyBio() {
  const newBio = document.getElementById("profileBioInput").value.trim();
  userState.bio = newBio || "안녕하세요! 음악왕 도전자입니다.";
  await syncProfileToServer();
  alert("프로필 소개글이 저장되었습니다!");
}

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
  }
};

// 친구 목록 & 친구 신청
async function openSocialModal(tab = "friends") {
  if (!userState.isLoggedIn) {
    alert("친구 추가 및 DM 기능은 로그인 후 이용하실 수 있습니다!");
    openModal("authModal");
    return;
  }
  openModal("socialModal");
  switchSocialTab(tab);
}

async function switchSocialTab(tab) {
  document.getElementById("socialTabFriends").classList.toggle("active", tab === "friends");
  document.getElementById("socialTabDm").classList.toggle("active", tab === "dm");
  document.getElementById("socialFriendsPane").classList.toggle("hidden", tab !== "friends");
  document.getElementById("socialDmPane").classList.toggle("hidden", tab !== "dm");

  if (tab === "friends") {
    await loadFriendsData();
  } else {
    await loadDirectMessages();
  }
}

async function sendFriendRequestByNick(targetNickParam) {
  if (!userState.isLoggedIn) {
    openModal("authModal");
    return;
  }
  const nick = targetNickParam || document.getElementById("friendSearchInput").value.trim();
  if (!nick) {
    alert("친구 추가할 닉네임을 입력해주세요.");
    return;
  }
  if (nick === userState.nickname) {
    alert("자기 자신에게는 친구 신청을 보낼 수 없습니다.");
    return;
  }

  const { data: targetProf } = await sbClient
    .from("profiles")
    .select("id, nickname")
    .eq("nickname", nick)
    .maybeSingle();

  if (!targetProf) {
    alert(`[${nick}] 닉네임을 가진 유저를 찾을 수 없습니다.`);
    return;
  }

  const { error } = await sbClient.from("friendships").insert({
    requester_id: userState.id,
    receiver_id: targetProf.id,
    status: "pending"
  });

  if (error) {
    alert("이미 친구 신청을 보냈거나 친구 상태입니다.");
    return;
  }

  alert(`💌 [${targetProf.nickname}]님에게 친구 신청을 보냈습니다!`);
  loadFriendsData();
}

async function loadFriendsData() {
  const box = document.getElementById("friendsListContainer");
  if (!box || !sbClient || !userState.id) return;
  box.innerHTML = `<div style="text-align:center; padding:12px;">불러오는 중...</div>`;

  const { data: rels } = await sbClient
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${userState.id},receiver_id.eq.${userState.id}`);

  if (!rels || rels.length === 0) {
    box.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-sub);">아직 등록된 친구가 없습니다.<br/>닉네임으로 친구를 추가해보세요!</div>`;
    return;
  }

  const otherIds = rels.map(r => (r.requester_id === userState.id ? r.receiver_id : r.requester_id));
  const { data: profs } = await sbClient.from("profiles").select("*").in("id", otherIds);
  const profMap = new Map((profs || []).map(p => [p.id, p]));

  box.innerHTML = rels
    .map(r => {
      const isIncoming = r.receiver_id === userState.id && r.status === "pending";
      const otherId = r.requester_id === userState.id ? r.receiver_id : r.requester_id;
      const p = profMap.get(otherId) || { nickname: "유저" };

      return `
      <div class="pixel-list-item">
        <div>
          <strong>${p.nickname}</strong>
          <span style="font-size:0.75rem; color:var(--text-sub); margin-left:6px;">
            ${r.status === "accepted" ? "✅ 친구" : isIncoming ? "📩 받은 요청" : "⏳ 수락 대기중"}
          </span>
        </div>
        <div style="display:flex; gap:4px;">
          ${
            isIncoming
              ? `<button class="btn btn-primary" style="padding:4px 8px; font-size:0.74rem;" onclick="acceptFriendRequest(${r.id})">수락</button>`
              : ""
          }
          <button class="btn" style="padding:4px 8px; font-size:0.74rem;" onclick="prepareDmTo('${otherId}', '${p.nickname}')">💬 DM</button>
        </div>
      </div>
    `;
    })
    .join("");
}

window.acceptFriendRequest = async function (friendshipId) {
  await sbClient.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
  loadFriendsData();
};

window.prepareDmTo = function (receiverId, receiverNick) {
  closeModal("userInspectModal");
  openModal("socialModal");
  switchSocialTab("dm");
  document.getElementById("dmTargetId").value = receiverId;
  document.getElementById("dmTargetNickInput").value = receiverNick;
  document.getElementById("dmContentInput").focus();
};

async function sendDirectMessage() {
  const targetNick = document.getElementById("dmTargetNickInput").value.trim();
  const content = document.getElementById("dmContentInput").value.trim();
  let targetId = document.getElementById("dmTargetId").value;

  if (!targetNick || !content) {
    alert("받는 사람 닉네임과 메시지 내용을 입력해주세요.");
    return;
  }

  if (!targetId) {
    const { data: prof } = await sbClient
      .from("profiles")
      .select("id")
      .eq("nickname", targetNick)
      .maybeSingle();
    if (!prof) {
      alert(`[${targetNick}] 유저를 찾을 수 없습니다.`);
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
}

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
// 5. 대기실(광장) & 실시간 온라인 대전 (1:1 선착순 / 4인 점수제)
// ============================================================================
async function enterPlazaScreen() {
  switchScreen("plazaScreen");
  startPlazaCanvasLoop();
  await refreshRoomsList();

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
        const countEl = document.getElementById("plazaOnlineCount");
        if (countEl) countEl.textContent = `접속 ${plazaState.onlinePlayers.size}명`;
      })
      .on("broadcast", { event: "plaza_move" }, ({ payload }) => {
        if (payload && payload.key) {
          plazaState.onlinePlayers.set(payload.key, payload);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        refreshRoomsList();
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") {
          await broadcastMyPlazaState();
        }
      });
  } else {
    broadcastMyPlazaState();
  }
}

async function broadcastMyPlazaState() {
  const myKey = userState.id || "guest_me";
  const payload = {
    key: myKey,
    nickname: userState.nickname,
    avatarConfig: userState.avatarConfig,
    x: plazaState.myX,
    dir: plazaState.myDir,
    chatMsg: Date.now() < plazaState.myChatExpire ? plazaState.myChat : ""
  };
  plazaState.onlinePlayers.set(myKey, payload);

  if (plazaState.channel) {
    try {
      await plazaState.channel.track(payload);
      await plazaState.channel.send({
        type: "broadcast",
        event: "plaza_move",
        payload
      });
    } catch (e) {}
  }
}

function sendPlazaChat() {
  const input = document.getElementById("plazaChatInput");
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";
  plazaState.myChat = msg;
  plazaState.myChatExpire = Date.now() + 5000;
  broadcastMyPlazaState();
}

function startPlazaCanvasLoop() {
  const canvas = document.getElementById("plazaStageCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // 캔버스 클릭 시 내 캐릭터 이동
  canvas.onclick = e => {
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    plazaState.myDir = clickX >= plazaState.myX ? 1 : -1;
    plazaState.myX = Math.max(30, Math.min(canvas.width - 30, clickX));
    broadcastMyPlazaState();
  };

  const offscreen = document.createElement("canvas");
  offscreen.width = 48;
  offscreen.height = 48;

  const renderLoop = () => {
    if (document.getElementById("plazaScreen").classList.contains("hidden")) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 메이플풍 광장 배경 그리기
    ctx.fillStyle = "#bfe9ff";
    ctx.fillRect(0, 0, canvas.width, 105);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(35, 18, 52, 16);
    ctx.fillRect(240, 26, 64, 16);
    ctx.fillStyle = "#7ad66c";
    ctx.fillRect(0, 105, canvas.width, 10);
    ctx.fillStyle = "#58b947";
    ctx.fillRect(0, 115, canvas.width, 35);

    const players = Array.from(plazaState.onlinePlayers.values());
    if (players.length === 0) {
      players.push({
        key: "me",
        nickname: userState.nickname,
        avatarConfig: userState.avatarConfig,
        x: plazaState.myX,
        chatMsg: Date.now() < plazaState.myChatExpire ? plazaState.myChat : ""
      });
    }

    players.forEach(p => {
      renderPixelAvatar(offscreen, p.avatarConfig || DEFAULT_AVATAR_CONFIG, { transparentBg: true });
      const drawX = Math.max(20, Math.min(canvas.width - 50, p.x || 120));
      ctx.drawImage(offscreen, drawX - 24, 66, 48, 48);

      // 닉네임 태그
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      const tagW = ctx.measureText(p.nickname).width + 10;
      ctx.fillRect(drawX - tagW / 2, 114, tagW, 16);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(p.nickname, drawX, 126);

      // 머리 위 말풍선
      if (p.chatMsg) {
        ctx.fillStyle = "#ffffff";
        const msgW = Math.min(160, ctx.measureText(p.chatMsg).width + 14);
        ctx.fillRect(drawX - msgW / 2, 42, msgW, 20);
        ctx.strokeStyle = "#4f46e5";
        ctx.strokeRect(drawX - msgW / 2, 42, msgW, 20);
        ctx.fillStyle = "#1e293b";
        ctx.fillText(p.chatMsg.slice(0, 16), drawX, 56);
      }
    });

    plazaState.animFrame = requestAnimationFrame(renderLoop);
  };

  if (plazaState.animFrame) cancelAnimationFrame(plazaState.animFrame);
  plazaState.animFrame = requestAnimationFrame(renderLoop);
}

// 방 목록 불러오기 및 생성/입장
async function refreshRoomsList() {
  const box = document.getElementById("plazaRoomsList");
  if (!box || !sbClient) return;

  const { data: rooms } = await sbClient
    .from("rooms")
    .select("*")
    .eq("status", "waiting")
    .order("created_at", { ascending: false })
    .limit(15);

  if (!rooms || rooms.length === 0) {
    box.innerHTML = `<div style="text-align:center; padding:16px; color:var(--text-sub); font-size:0.84rem;">현재 대기 중인 대전 방이 없습니다.<br/>아래 [⚔️ 방 만들기] 버튼으로 대전을 열어보세요!</div>`;
    return;
  }

  box.innerHTML = rooms
    .map(room => {
      const maxP = room.room_type === "1v1" ? 2 : 4;
      const curP = Array.isArray(room.players) ? room.players.length : 1;
      return `
      <div class="pixel-list-item">
        <div>
          <span class="badge primary" style="margin-right:4px;">${room.room_type === "1v1" ? "1:1 선착순" : "4인 점수제"}</span>
          <strong>${room.title}</strong>
          <span style="font-size:0.76rem; color:var(--text-sub);">(${curP}/${maxP}명)</span>
        </div>
        <button class="btn btn-primary" style="padding:5px 10px; font-size:0.78rem;" onclick="joinOnlineRoom('${room.id}')">입장</button>
      </div>
    `;
    })
    .join("");
}

async function createOnlineRoom(roomType) {
  if (!userState.isLoggedIn) {
    alert("온라인 대전 방 생성은 로그인 후 가능합니다!");
    openModal("authModal");
    return;
  }

  const title = prompt(
    roomType === "1v1" ? "1:1 선착순 대전 방 제목을 입력하세요:" : "4인 점수제 대전 방 제목을 입력하세요:",
    `${userState.nickname}님의 음악왕 대결!`
  );
  if (!title) return;

  const shuffledIds = shuffleArray(QUESTIONS_DB).slice(0, 10).map(q => q.id);
  const initialPlayers = [{ id: userState.id, nickname: userState.nickname, score: 0 }];

  const { data, error } = await sbClient
    .from("rooms")
    .insert({
      title,
      host_id: userState.id,
      room_type: roomType,
      game_config: { mode: "behind", stage: 1 },
      status: "waiting",
      players: initialPlayers,
      current_q_index: 0,
      question_ids: shuffledIds
    })
    .select()
    .single();

  if (error || !data) {
    alert("방 생성 중 오류가 발생했습니다.");
    return;
  }

  joinOnlineRoom(data.id);
}

window.joinOnlineRoom = async function (roomId) {
  if (!userState.isLoggedIn) {
    alert("온라인 대전은 로그인 후 입장하실 수 있습니다!");
    openModal("authModal");
    return;
  }

  const { data: room } = await sbClient.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (!room) {
    alert("존재하지 않거나 이미 종료된 방입니다.");
    refreshRoomsList();
    return;
  }

  const maxP = room.room_type === "1v1" ? 2 : 4;
  let players = Array.isArray(room.players) ? [...room.players] : [];
  if (!players.some(p => p.id === userState.id)) {
    if (players.length >= maxP) {
      alert("방 인원이 가득 찼습니다!");
      return;
    }
    players.push({ id: userState.id, nickname: userState.nickname, score: 0 });
    await sbClient.from("rooms").update({ players }).eq("id", roomId);
    room.players = players;
  }

  plazaState.currentRoom = room;
  subscribeToBattleRoom(room);
};

function subscribeToBattleRoom(room) {
  if (plazaState.roomChannel) {
    sbClient.removeChannel(plazaState.roomChannel);
  }

  openModal("battleRoomModal");
  renderBattleRoomState(room);

  plazaState.roomChannel = sbClient
    .channel(`room_${room.id}`)
    .on("broadcast", { event: "room_update" }, ({ payload }) => {
      if (payload) {
        plazaState.currentRoom = payload;
        renderBattleRoomState(payload);
      }
    })
    .subscribe();

  // 방 입장 알림 브로드캐스트
  setTimeout(() => {
    if (plazaState.roomChannel) {
      plazaState.roomChannel.send({
        type: "broadcast",
        event: "room_update",
        payload: room
      });
    }
  }, 300);
}

function renderBattleRoomState(room) {
  document.getElementById("battleRoomTitle").textContent = `[${room.room_type === "1v1" ? "1:1 선착순" : "4인 점수제"}] ${room.title}`;

  const playersEl = document.getElementById("battlePlayersBoard");
  playersEl.innerHTML = (room.players || [])
    .map(
      p => `
      <div class="score-rule-item">
        <span>👤 ${p.nickname}</span>
        <strong class="score-plus">${p.score || 0}점</strong>
      </div>
    `
    )
    .join("");

  const startBtn = document.getElementById("battleHostStartBtn");
  const playArea = document.getElementById("battlePlayArea");

  if (room.status === "waiting") {
    playArea.classList.add("hidden");
    if (room.host_id === userState.id) {
      startBtn.classList.remove("hidden");
    } else {
      startBtn.classList.add("hidden");
    }
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

async function hostStartOnlineBattle() {
  const room = plazaState.currentRoom;
  if (!room) return;
  room.status = "playing";
  room.current_q_index = 0;
  await sbClient.from("rooms").update({ status: "playing", current_q_index: 0 }).eq("id", room.id);
  plazaState.roomChannel.send({ type: "broadcast", event: "room_update", payload: room });
  renderBattleRoomState(room);
}

async function submitOnlineBattleAnswer() {
  const room = plazaState.currentRoom;
  if (!room || room.status !== "playing") return;

  const input = document.getElementById("battleAnswerInput");
  const val = input.value.trim();
  if (!val) return;

  const qId = (room.question_ids || [])[room.current_q_index || 0];
  const q = QUESTIONS_DB.find(item => item.id === qId) || QUESTIONS_DB[0];

  if (isTitleMatch(val, q) || isArtistMatch(val, q)) {
    input.value = "";
    // 점수 부여 및 다음 라운드 전환
    room.players = (room.players || []).map(p =>
      p.id === userState.id ? { ...p, score: (p.score || 0) + 100 } : p
    );

    if ((room.current_q_index || 0) + 1 >= (room.question_ids || []).length) {
      room.status = "finished";
      addCdCoins(30); // 대전 완주 보너스 30 CD
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
    alert("❌ 오답입니다! 다시 입력해보세요!");
  }
}

function leaveBattleRoom() {
  if (plazaState.roomChannel && sbClient) {
    sbClient.removeChannel(plazaState.roomChannel);
    plazaState.roomChannel = null;
  }
  plazaState.currentRoom = null;
  closeModal("battleRoomModal");
  refreshRoomsList();
}
