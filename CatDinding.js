/* ==================== PUBLIC CHAT (Full Screen) ==================== */

let globalChatListener = null;
let lastSentTime = 0;
let chatTimeTicker = null;
const CHAT_RATE_LIMIT_MS = 1500;
const CHAT_MAX_MESSAGES = 50;
const chatMsgCache = new Map();

/* ==================== BUKA HALAMAN CHAT ==================== */
function openGlobalChat() {
  if (typeof unlockScroll === "function") unlockScroll();
  watchFromTab = currentTab;
  currentTab = "global-chat";
  watchOpen = false;
  if (typeof stopAutoSlide === "function") stopAutoSlide();

  var nav = document.getElementById("bottom-nav");
  var miniHeader = document.getElementById("mini-header");
  if (nav) nav.style.display = "none";
  if (miniHeader) miniHeader.style.display = "none";

  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  document.body.style.height = "100%";

  renderPage();
}

/* ==================== RENDER HALAMAN ==================== */
function renderGlobalChat(main) {
  if (!main) main = document.getElementById("app-main");
  if (!main) return;

  ensureChatStyles();
  main.innerHTML = `
    <div class="chat-page-full">
      <div class="chat-full-header">
        <button class="chat-full-back" onclick="closeGlobalChat()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="chat-full-title">Global Chat</div>
        <div class="chat-full-online">
          <span class="chat-online-dot"></span>
          <span>Online</span>
        </div>
      </div>

      <div class="chat-full-list" id="chat-list">
        <div class="chat-loading">
          <div class="loading-spinner"></div>
          <p>Memuat chat...</p>
        </div>
      </div>

      <div class="chat-sticker-tray" id="chat-sticker-tray"></div>

      <div class="chat-full-input-bar">
        <img class="chat-full-avatar" src="${(userProfile && userProfile.avatar) || 'https://i.pravatar.cc/150'}" alt="">
        <input id="chat-input" class="chat-full-input" placeholder="Ketik pesan..." maxlength="500" onkeydown="if(event.key==='Enter' && !event.isComposing)sendGlobalMessage()">
        <button class="chat-full-sticker-btn" id="chat-sticker-btn" onclick="toggleStickerTray('chat')" title="Stiker">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V9z"/>
            <path d="M15 3v6h6"/>
          </svg>
        </button>
        <button class="chat-full-send" onclick="sendGlobalMessage()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  listenGlobalMessages();
  listenStickers();
  startChatTimeTicker();

  setTimeout(() => {
    const inp = document.getElementById("chat-input");
    if (inp) inp.focus();
  }, 200);
}

/* ==================== TUTUP HALAMAN CHAT ==================== */
function closeGlobalChat() {
  stopGlobalChatListener();
  stopStickersListener();
  stopChatTimeTicker();

  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.width = "";
  document.body.style.height = "";

  switchTab("home");
}

/* ==================== LISTENER FIRESTORE ==================== */
function listenGlobalMessages() {
  if (!firebaseReady || !db) {
    console.warn("Firebase belum ready");
    return;
  }

  stopGlobalChatListener();

  try {
    globalChatListener = db.collection(COLLECTIONS.MESSAGES)
      .orderBy("createdAt", "desc")
      .limit(CHAT_MAX_MESSAGES)
      .onSnapshot({ includeMetadataChanges: true }, (snapshot) => {
        applyChatChanges(snapshot);
      }, (err) => {
        console.error("Chat listener error:", err);
      });
  } catch (e) {
    console.error("Gagal listen chat:", e);
  }
}

function stopGlobalChatListener() {
  if (globalChatListener) {
    try { globalChatListener(); } catch (e) {}
    globalChatListener = null;
  }
}

/* ==================== UPDATE DOM SECARA BERTAHAP ==================== */
// Snapshot pertama: bangun daftar sekali. Snapshot berikutnya: hanya sentuh
// node yang berubah (added, modified, removed). Daftar tidak di-render ulang,
// jadi scroll dan posisi input tidak ikut terlempar.
function applyChatChanges(snapshot) {
  const list = document.getElementById("chat-list");
  if (!list) return;

  if (!list.dataset.ready) {
    const msgs = snapshot.docs.map(buildChatMsg).sort((a, b) => a.time - b.time);
    list.innerHTML = "";
    chatMsgCache.clear();
    msgs.forEach(m => { chatMsgCache.set(m.id, m); list.appendChild(makeChatNode(m)); });
    list.dataset.ready = "1";
    if (msgs.length === 0) showChatEmpty(list);
    list.scrollTop = list.scrollHeight;
    return;
  }

  const isNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 100;
  const added = [];
  let ownAdded = false;

  snapshot.docChanges().forEach(change => {
    if (change.type === "removed") {
      removeChatNode(change.doc.id);
      chatMsgCache.delete(change.doc.id);
      return;
    }
    const msg = buildChatMsg(change.doc);
    if (change.type === "added") {
      added.push(msg);
      chatMsgCache.set(msg.id, msg);
      if (currentUser && msg.uid === currentUser.uid) ownAdded = true;
    } else if (change.type === "modified") {
      chatMsgCache.set(msg.id, msg);
      replaceChatNode(msg);
    }
  });

  if (added.length > 0) {
    clearChatEmpty(list);
    added
      .sort((a, b) => a.time - b.time)
      .forEach(m => {
        if (!getChatNode(m.id)) list.appendChild(makeChatNode(m));
      });
    if (isNearBottom || ownAdded) list.scrollTop = list.scrollHeight;
  }

  if (!list.querySelector("[data-msg-id]")) showChatEmpty(list);
}

function buildChatMsg(docSnap) {
  const data = docSnap.data({ serverTimestamps: "estimate" });
  return {
    ...data,
    id: docSnap.id,
    pending: docSnap.metadata.hasPendingWrites,
    time: chatTimeMs(data.createdAt)
  };
}

function chatTimeMs(v) {
  if (v && typeof v.toMillis === "function") return v.toMillis();
  if (v && typeof v.seconds === "number") return v.seconds * 1000;
  return Date.now();
}

function getChatNode(id) {
  const list = document.getElementById("chat-list");
  if (!list) return null;
  return list.querySelector('[data-msg-id="' + id + '"]');
}

function makeChatNode(msg) {
  const tpl = document.createElement("template");
  tpl.innerHTML = renderChatMessageHTML(msg).trim();
  return tpl.content.firstElementChild;
}

function replaceChatNode(msg) {
  const old = getChatNode(msg.id);
  if (old) old.replaceWith(makeChatNode(msg));
}

function removeChatNode(id) {
  const node = getChatNode(id);
  if (node) node.remove();
}

function showChatEmpty(list) {
  if (list.querySelector(".chat-empty")) return;
  const empty = document.createElement("div");
  empty.className = "chat-empty";
  empty.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    <p>Belum ada pesan. Jadi yang pertama!</p>
  `;
  list.appendChild(empty);
}

function clearChatEmpty(list) {
  const empty = list.querySelector(".chat-empty");
  if (empty) empty.remove();
}

/* ==================== TIMER LABEL WAKTU ==================== */
function startChatTimeTicker() {
  stopChatTimeTicker();
  chatTimeTicker = setInterval(() => {
    document.querySelectorAll("#chat-list .chat-msg-time[data-time]").forEach(el => {
      el.textContent = formatChatTime(Number(el.dataset.time));
    });
  }, 30000);
}

function stopChatTimeTicker() {
  if (chatTimeTicker) {
    clearInterval(chatTimeTicker);
    chatTimeTicker = null;
  }
}

/* ==================== RENDER 1 PESAN ==================== */
function renderChatMessageHTML(msg) {
  const isOwn = msg.uid === (currentUser && currentUser.uid);
  const clanName = msg.clanName || "";
  const clanColor = msg.clanColor || (clanName && typeof generateClanColor === "function" ? generateClanColor(clanName) : "");
  const level = msg.level || 1;
  const rankInfo = typeof calculateRank === "function" ? calculateRankV2(level) : { name: "Rookie", color: "#6b7280" };
  const rank = msg.rank || rankInfo.name;
  const liveName = (typeof findUserForAuthor === "function" ? (findUserForAuthor(msg.uid, msg.user, msg.userId) || {}).username : null) || msg.user || "";
  const safeName = String(liveName).replace(/'/g, "\\'");
  const liveAvatar = (typeof findUserForAuthor === "function" ? ((findUserForAuthor(msg.uid, msg.user, msg.userId) || {}).avatar) : "") || msg.avatar;
  const avatarUrl = (typeof liveAvatar === "string" && /^https?:\/\//i.test(liveAvatar)) ? liveAvatar : DEFAULT_AVATAR_SRC;
  const uRec = (typeof findUserForAuthor === "function" ? findUserForAuthor(msg.uid, msg.user, msg.userId) : null) || {};
  const verified = uRec.verified || msg.verified || "";
  const isPremiumUser = uRec.isPremium === true;
  const frameUrl = (typeof resolveBorderUrl === "function") ? resolveBorderUrl(uRec.borderImgUrl || msg.borderImgUrl || "") : "";
  const chatAvatarImg = '<img class="chat-msg-avatar" referrerpolicy="no-referrer" style="position:relative;z-index:1;" src="' + avatarUrl + '" onerror="this.onerror=null;this.src=DEFAULT_AVATAR_SRC" alt="" onclick="openPublicProfile(\'' + safeName + '\')">';
  const chatAvatarHTML = frameUrl
    ? '<span style="position:relative;display:inline-flex;flex-shrink:0;align-self:flex-start;line-height:0;">' + chatAvatarImg.replace('style="position:relative;z-index:1;"', 'style="position:relative;z-index:1;border:none;"') +
      '<img src="' + frameUrl + '" alt="" style="position:absolute;z-index:2;left:50%;top:50%;transform:translate(-50%,-50%);width:120%;height:auto;max-width:none;max-height:none;pointer-events:none;-webkit-mask-image:linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 6%, #000 94%, transparent 100%);-webkit-mask-composite:source-in;mask-image:linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 6%, #000 94%, transparent 100%);mask-composite:intersect;">' + (typeof frameShineHTML === "function" ? frameShineHTML() : "") + '</span>'
    : chatAvatarImg;
  const timeText = msg.pending ? "mengirim..." : formatChatTime(msg.createdAt);
  const timeAttr = msg.pending ? "" : ' data-time="' + msg.time + '"';
  const pendingStyle = msg.pending ? "opacity:0.6;" : "";

  return `
    <div class="chat-msg ${isOwn ? "chat-msg-own" : ""}" data-msg-id="${msg.id}" style="${pendingStyle}">
      ${chatAvatarHTML}
      <div class="chat-msg-body">
        <div class="chat-msg-header watch-comment-name-row" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-start;gap:6px;margin:0;min-width:0;">
          <span class="watch-comment-name" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" onclick="openPublicProfile('${safeName}')">${escapeHtml(liveName || "Unknown")}</span>
          ${verified ? `<img class="verified-badge" src="${escapeHtml(verified)}" alt="">` : ""}
          <span class="watch-comment-id">${escapeHtml(msg.userId || "#?")}</span>
          ${roleTagsHTML(uRec)}
        </div>
        <div class="watch-comment-level-row" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:4px 0 0;">
          ${clanName ? `<span class="watch-comment-clan" style="--clan-color:${clanColor};"><span class="clan-badge-shimmer"></span><span class="clan-badge-text">${escapeHtml(clanName.toUpperCase())}</span></span>` : ""}
          <span class="watch-comment-rank" style="color:${rankInfo.color};border-color:${rankInfo.color};margin:0;">${escapeHtml(rank)}</span>
          <span class="watch-comment-level">Lvl ${level}</span>
        </div>
        ${msg.type === "sticker" ? renderStickerBubble(msg) : `<div class="chat-msg-text">${escapeHtml(msg.text || "")}</div>`}
        <div class="chat-msg-footer">
          <span class="chat-msg-time"${timeAttr}>${timeText}</span>
          ${isOwn && !msg.pending ? `<button class="chat-msg-del" onclick="deleteChatMessage('${msg.id}')" title="Hapus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>` : ""}
        </div>
      </div>
    </div>
  `;
}

/* ==================== PERINTAH /stiker ==================== */
// "/stiker" membuka panel stiker. "/stiker nama" langsung mengirim stiker dengan nama itu.
// Nama dicocokkan (tidak peka huruf besar/kecil) dengan label stiker bawaan dan stiker dari Firestore.
function findStickerByName(name) {
  const builtIn = Object.keys(CHAT_STICKERS).find(k =>
    k === name || CHAT_STICKERS[k].label.toLowerCase() === name
  );
  if (builtIn) return builtIn;
  const remote = chatRemoteStickers.find(s =>
    s.label.toLowerCase() === name || s.id === name
  );
  return remote ? remote.id : null;
}

function handleStickerCommand(text, input) {
  const name = text.slice("/stiker".length).trim().toLowerCase();
  input.value = "";

  if (!name) {
    const tray = document.getElementById(stickerIds().tray);
    if (tray && !tray.classList.contains("open")) toggleStickerTray();
    return;
  }

  const key = findStickerByName(name);
  if (!key) {
    showToast("Stiker '" + name + "' tidak ditemukan");
    return;
  }
  sendSticker(key);
}

/* ==================== KIRIM (OPTIMISTIC) ==================== */
// Pesan langsung tampil dari listener (status pending), input langsung dikosongkan.
// Input tidak di-disable, jadi pengguna bisa lanjut mengetik. Jika gagal, teks dikembalikan.
async function sendGlobalMessage() {
  const input = document.getElementById("chat-input");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  if (text.toLowerCase().startsWith("/stiker")) {
    stickerTarget = "chat";
    handleStickerCommand(text, input);
    return;
  }

  if (!currentUser || !currentUserProfile) {
    showToast("Belum login");
    return;
  }

  const now = Date.now();
  if (now - lastSentTime < CHAT_RATE_LIMIT_MS) {
    const wait = Math.ceil((CHAT_RATE_LIMIT_MS - (now - lastSentTime)) / 1000);
    showToast(`Tunggu ${wait} detik lagi`);
    return;
  }

  if (text.length > 500) {
    showToast("Pesan maksimal 500 karakter");
    return;
  }

  lastSentTime = now;
  input.value = "";
  input.focus();
  if (navigator.vibrate) navigator.vibrate(20);

  try {
    let clanColor = "";
    if (currentUserProfile.clanId && typeof clanList !== "undefined") {
      const clan = clanList.find(c => c.id === currentUserProfile.clanId);
      clanColor = clan?.color || "";
    }
    if (!clanColor && currentUserProfile.clanName) {
      clanColor = typeof generateClanColor === "function" ? generateClanColor(currentUserProfile.clanName) : "#a855f7";
    }

    const level = currentUserProfile.level || (typeof calculateLevel === "function" ? calculateLevel(currentUserProfile.xp || 0) : 1);
    const rankInfo = typeof calculateRank === "function" ? calculateRankV2(level) : { name: "Rookie" };

    await db.collection(COLLECTIONS.MESSAGES).add({
      uid: currentUser.uid,
      user: currentUserProfile.username || "User",
      userId: currentUserProfile.userId || "#?",
      avatar: currentUserProfile.avatar || "",
      clanName: currentUserProfile.clanName || "",
      clanColor: clanColor,
      level: level,
      rank: rankInfo.name,
      text: text.slice(0, 500),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error("Gagal kirim pesan:", e);
    if (input.value === "") input.value = text;
    showErrorToast("Gagal kirim pesan");
  }
}

/* ==================== HAPUS ==================== */
async function deleteChatMessage(msgId) {
  if (!msgId || !currentUser) return;
  if (!confirm("Hapus pesan ini?")) return;

  try {
    const msgRef = db.collection(COLLECTIONS.MESSAGES).doc(msgId);
    const msgDoc = await msgRef.get();
    if (!msgDoc.exists) { showToast("Pesan udah gak ada"); return; }
    if (msgDoc.data().uid !== currentUser.uid) {
      showErrorToast("Cuma bisa hapus pesan sendiri");
      return;
    }
    await msgRef.delete();
    showSuccessToast("Pesan dihapus");
  } catch (e) {
    console.error("Gagal hapus pesan:", e);
    showErrorToast("Gagal hapus pesan");
  }
}

/* ==================== FORMAT WAKTU ==================== */
function formatChatTime(createdAt) {
  if (!createdAt) return "baru saja";

  let date = null;
  if (createdAt && typeof createdAt.toDate === "function") {
    try { date = createdAt.toDate(); } catch (e) { date = null; }
  }
  if (!date && createdAt && typeof createdAt.seconds === "number") {
    date = new Date(createdAt.seconds * 1000);
  }
  if (!date && typeof createdAt === "string") {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) date = d;
  }
  if (!date && typeof createdAt === "number") date = new Date(createdAt);
  if (!date && createdAt instanceof Date) date = createdAt;

  if (!date || isNaN(date.getTime())) return "baru saja";

  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  if (sec < 5) return "baru saja";
  if (sec < 60) return sec + " detik lalu";
  if (min < 60) return min + " menit lalu";
  if (hour < 24) return hour + " jam lalu";
  if (day < 7) return day + " hari lalu";

  const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return `${date.getDate()} ${bulan[date.getMonth()]}`;
}


/* ==================== STIKER ==================== */
const CHAT_STICKERS = {
  bintang: { label: "Bintang", tier: "normal", svg: '<svg viewBox="0 0 64 64"><path d="M32 6l7.8 16.6 18.2 2.3-13.4 12.5 3.6 18L32 46.9 15.8 55.4l3.6-18L6 30.9l18.2-2.3z" fill="#facc15" stroke="#a16207" stroke-width="2" stroke-linejoin="round"/></svg>' },
  hati: { label: "Hati", tier: "normal", svg: '<svg viewBox="0 0 64 64"><path d="M32 54C12 40 6 30 10 20c4-9 16-10 22 0 6-10 18-9 22 0 4 10-2 20-22 34z" fill="#f43f5e"/></svg>' },
  centang: { label: "Oke", tier: "normal", svg: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#22c55e"/><path d="M20 33l8 8 16-17" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  bulan: { label: "Bulan", tier: "normal", svg: '<svg viewBox="0 0 64 64"><path d="M40 8a24 24 0 1 0 16 36 20 20 0 0 1-16-36z" fill="#93c5fd"/></svg>' },
  kopi: { label: "Kopi", tier: "premium", svg: '<svg viewBox="0 0 64 64"><path d="M12 22h34v20a14 14 0 0 1-14 14h-6a14 14 0 0 1-14-14z" fill="#a16207"/><path d="M46 26h4a7 7 0 0 1 0 14h-4" fill="none" stroke="#a16207" stroke-width="4"/><path d="M22 6c-3 4 3 6 0 10M32 6c-3 4 3 6 0 10" fill="none" stroke="#9ca3af" stroke-width="3" stroke-linecap="round"/></svg>' },
  api: { label: "Api", tier: "premium", svg: '<svg viewBox="0 0 64 64"><path d="M32 6c8 12 16 18 14 32-2 12-10 18-14 18s-12-5-12-14c0-8 6-12 8-20 4 6 4 10 6 12 3-6 2-14-2-28z" fill="#fb923c"/><path d="M32 34c4 4 6 8 4 12-1 3-3 4-4 4s-4-2-4-5c0-4 2-6 4-11z" fill="#fde047"/></svg>' },
  tidur: { label: "Ngantuk", tier: "premium", svg: '<svg viewBox="0 0 64 64"><circle cx="32" cy="34" r="22" fill="#fcd34d"/><path d="M20 32q4 4 8 0M36 32q4 4 8 0M28 42q4 3 8 0" fill="none" stroke="#78350f" stroke-width="3" stroke-linecap="round"/><text x="46" y="16" font-size="12" font-family="sans-serif" fill="#60a5fa" font-weight="700">z</text></svg>' },
  buku: { label: "Buku", tier: "premium", svg: '<svg viewBox="0 0 64 64"><path d="M8 14q12-4 24 4v34q-12-8-24-4z" fill="#60a5fa"/><path d="M56 14q-12-4-24 4v34q12-8 24-4z" fill="#3b82f6"/></svg>' },
  mahkota: { label: "Mahkota", tier: "admin", svg: '<svg viewBox="0 0 64 64"><path d="M10 48L6 18l16 12 10-18 10 18 16-12-4 30z" fill="#facc15" stroke="#a16207" stroke-width="2" stroke-linejoin="round"/><rect x="10" y="48" width="44" height="7" rx="2" fill="#eab308" stroke="#a16207" stroke-width="2"/><circle cx="32" cy="36" r="4" fill="#ef4444"/><circle cx="16" cy="18" r="3" fill="#60a5fa"/><circle cx="48" cy="18" r="3" fill="#60a5fa"/></svg>' },
  perisai: { label: "Perisai", tier: "admin", svg: '<svg viewBox="0 0 64 64"><path d="M32 6l22 8v16c0 14-10 24-22 28C20 54 10 44 10 30V14z" fill="#7c3aed" stroke="#3b0764" stroke-width="2" stroke-linejoin="round"/><path d="M32 14l14 5v11c0 9-6 16-14 19-8-3-14-10-14-19V19z" fill="#a78bfa"/><path d="M32 22v20M24 30h16" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>' }
};

function ensureChatStyles() {
  if (document.getElementById("chat-sticker-style")) return;
  const st = document.createElement("style");
  st.id = "chat-sticker-style";
  st.textContent = `
    .chat-full-sticker-btn { width: 38px; height: 38px; flex-shrink: 0; border-radius: 50%; border: 1px solid rgba(255,255,255,0.12); background: var(--bg-2, #1f1f27); color: var(--text, #e5e7eb); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background .15s, color .15s; }
    .chat-full-sticker-btn.active { background: var(--accent, #a855f7); color: #fff; border-color: transparent; }
    .chat-full-sticker-btn svg { width: 18px; height: 18px; }
    .chat-sticker-tray { display: none; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 0 12px 8px; padding: 10px; border-radius: 16px; background: var(--bg-2, #1f1f27); border: 1px solid rgba(255,255,255,0.08); }
    .chat-sticker-tray.open { display: grid; }
    .chat-sticker-item { aspect-ratio: 1; border: 0; border-radius: 12px; background: transparent; padding: 6px; cursor: pointer; transition: transform .15s, background .15s; }
    .chat-sticker-item:hover { background: rgba(255,255,255,0.06); }
    .chat-sticker-item:active { transform: scale(0.92); }
    .chat-sticker-item svg, .chat-msg-sticker svg { width: 100%; height: 100%; display: block; }
    .chat-msg-sticker { width: 96px; height: 96px; margin-top: 4px; }
    .chat-sticker-item { position: relative; }
    .chat-sticker-item.locked { opacity: 0.35; filter: grayscale(1); cursor: not-allowed; }
    .chat-sticker-tier { position: absolute; top: 2px; right: 2px; font-size: 8px; font-weight: 700; letter-spacing: 0.4px; padding: 2px 5px; border-radius: 6px; color: #fff; }
    .chat-sticker-tier.tier-premium { background: #ca8a04; }
    .chat-sticker-tier.tier-admin { background: #dc2626; }
    .chat-msg-sticker.tier-premium { filter: drop-shadow(0 0 6px rgba(250,204,21,0.55)); }
    .chat-msg-sticker.tier-admin { filter: drop-shadow(0 0 8px rgba(239,68,68,0.6)); }
    .chat-sticker-item img, .chat-msg-sticker img { width: 100%; height: 100%; object-fit: contain; display: block; }
    .chat-sticker-del { position: absolute; top: 0; left: 0; width: 18px; height: 18px; border-radius: 50%; background: #dc2626; color: #fff; font-size: 11px; font-weight: 700; line-height: 18px; text-align: center; }
    .chat-sticker-add { aspect-ratio: 1; border: 1px dashed rgba(255,255,255,0.25); border-radius: 12px; background: transparent; color: var(--text, #e5e7eb); font-size: 22px; cursor: pointer; }
    .chat-sticker-form { grid-column: 1 / -1; display: grid; gap: 8px; }
    .chat-sticker-form input, .chat-sticker-form select { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: var(--bg, #111); color: var(--text, #e5e7eb); font: inherit; font-size: 13px; }
    .chat-sticker-form-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .chat-sticker-form-actions button { padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: transparent; color: var(--text, #e5e7eb); cursor: pointer; }
    .chat-sticker-form-actions button.primary { background: var(--accent, #a855f7); border-color: transparent; color: #fff; }
    .chat-sticker-tabs { grid-column: 1 / -1; display: flex; gap: 4px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 2px; }
    .chat-sticker-tab { flex: 1; border: 0; background: transparent; color: #9ca3af; padding: 8px 6px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 10px 10px 0 0; }
    .chat-sticker-tab.active { color: #e5e7eb; box-shadow: inset 0 -2px 0 var(--accent, #22d3ee); }
    .chat-sticker-tab.tab-premium.active { color: #facc15; box-shadow: inset 0 -2px 0 #facc15; }
    .chat-sticker-tab.tab-admin.active { color: #f87171; box-shadow: inset 0 -2px 0 #ef4444; }
    .chat-sticker-empty { grid-column: 1 / -1; text-align: center; font-size: 12px; color: #9ca3af; padding: 18px 0; margin: 0; }
  `;
  document.head.appendChild(st);
}

function getStickerProfile() {
  return currentUserProfile || userProfile || {};
}

/* ---------- Stiker dari Firestore (ditambah admin lewat link https) ---------- */
const STICKERS_COLLECTION = (typeof COLLECTIONS !== "undefined" && COLLECTIONS.STICKERS) || "stickers";
const STICKER_TIERS = ["normal", "premium", "admin"];
let chatRemoteStickers = [];
let stickersListener = null;

function getStickerDef(key) {
  if (CHAT_STICKERS[key]) return CHAT_STICKERS[key];
  return chatRemoteStickers.find(s => s.id === key) || null;
}

function isStickerAdmin() {
  return getStickerProfile().isAdmin === true;
}

function safeStickerUrl(u) {
  const s = String(u || "").trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(s) ? s : "";
}

function escapeAttrText(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function listenStickers() {
  stopStickersListener();
  if (!firebaseReady || !db) return;
  try {
    stickersListener = db.collection(STICKERS_COLLECTION).onSnapshot(snapshot => {
      const list = [];
      snapshot.forEach(doc => {
        const d = doc.data() || {};
        const url = safeStickerUrl(d.url);
        if (!url) return;
        list.push({
          id: doc.id,
          label: String(d.label || "Stiker").slice(0, 20),
          tier: STICKER_TIERS.includes(d.tier) ? d.tier : "normal",
          url: url,
          time: chatTimeMs(d.createdAt)
        });
      });
      chatRemoteStickers = list.sort((a, b) => a.time - b.time);
      // Render ulang bubble stiker yang sempat "tidak dikenal" karena daftar stiker belum siap
      chatMsgCache.forEach(m => { if (m.type === "sticker") replaceChatNode(m); });
      if (typeof renderCommentList === "function" && typeof currentComments !== "undefined" && document.getElementById("comment-list")) {
        renderCommentList(currentComments);
      }
      const tray = document.getElementById(stickerIds().tray);
      if (tray && tray.classList.contains("open") && tray.dataset.mode !== "form") renderStickerTray(false);
    }, err => {
      console.error("Gagal listen stiker:", err);
    });
  } catch (e) {
    console.error("Gagal listen stiker:", e);
  }
}

function stopStickersListener() {
  if (stickersListener) {
    try { stickersListener(); } catch (e) {}
    stickersListener = null;
  }
}

function canUseSticker(key) {
  const s = getStickerDef(key);
  if (!s) return false;
  if (s.tier === "normal") return true;
  const p = getStickerProfile();
  const isAdmin = p.isAdmin === true;
  const isPremium = p.isPremium === true;
  if (s.tier === "premium") return isPremium || isAdmin;
  if (s.tier === "admin") return isAdmin;
  return false;
}

function stickerLockMessage(key) {
  const s = getStickerDef(key);
  if (s && s.tier === "admin") return "Stiker ini khusus Admin";
  return "Stiker ini khusus Premium";
}

function stickerVisualHTML(s) {
  if (s.svg) return s.svg;
  return '<img src="' + s.url + '" alt="' + escapeAttrText(s.label) + '" loading="lazy">';
}

function toggleStickerTray(target) {
  if (target) stickerTarget = target;
  ensureChatStyles();
  const ids = stickerIds();
  const tray = document.getElementById(ids.tray);
  const btn = document.getElementById(ids.btn);
  if (!tray) return;
  const open = !tray.classList.contains("open");
  if (open) {
    renderStickerTray(false);
    tray.classList.add("open");
  } else {
    tray.classList.remove("open");
  }
  if (btn) btn.classList.toggle("active", open);
}

let stickerTarget = "chat";
function stickerIds() {
  return stickerTarget === "episode"
    ? { tray: "ep-sticker-tray", btn: "ep-sticker-btn" }
    : { tray: "chat-sticker-tray", btn: "chat-sticker-btn" };
}
function closeStickerTray() {
  const ids = stickerIds();
  const tray = document.getElementById(ids.tray);
  const btn = document.getElementById(ids.btn);
  if (tray) tray.classList.remove("open");
  if (btn) btn.classList.remove("active");
}

let chatStickerTab = "normal";
const STICKER_TAB_LABELS = { normal: "Normal", premium: "Premium", admin: "Admin" };

function setStickerTab(tier) {
  if (!STICKER_TIERS.includes(tier)) return;
  chatStickerTab = tier;
  renderStickerTray(false);
}

function renderStickerTray(showForm) {
  const tray = document.getElementById(stickerIds().tray);
  if (!tray) return;
  const admin = isStickerAdmin();

  if (showForm && admin) {
    tray.dataset.mode = "form";
    tray.innerHTML = stickerFormHTML();
    return;
  }

  tray.dataset.mode = "grid";
  const all = [];
  Object.keys(CHAT_STICKERS).forEach(key => all.push({ key: key, def: CHAT_STICKERS[key], remote: false }));
  chatRemoteStickers.forEach(s => all.push({ key: s.id, def: s, remote: true }));
  const inTab = all.filter(item => item.def.tier === chatStickerTab);

  const tabsHTML = '<div class="chat-sticker-tabs">' + STICKER_TIERS.map(t =>
    '<button class="chat-sticker-tab tab-' + t + (t === chatStickerTab ? " active" : "") + '" onclick="setStickerTab(\'' + t + '\')">' +
    STICKER_TAB_LABELS[t] + '</button>'
  ).join("") + '</div>';

  let itemsHTML = inTab.map(item => {
    const def = item.def;
    const locked = !canUseSticker(item.key);
    const badge = def.tier === "normal" ? "" :
      '<span class="chat-sticker-tier tier-' + def.tier + '">' + (def.tier === "admin" ? "ADMIN" : "PRO") + '</span>';
    const del = (item.remote && admin) ?
      '<span class="chat-sticker-del" title="Hapus" onclick="event.stopPropagation(); deleteRemoteSticker(\'' + item.key + '\')">x</span>' : "";
    return '<button class="chat-sticker-item' + (locked ? " locked" : "") + '" title="' + escapeAttrText(def.label) + (locked ? " (terkunci)" : "") +
      '" onclick="sendSticker(\'' + item.key + '\')">' + stickerVisualHTML(def) + badge + del + '</button>';
  }).join("");

  if (inTab.length === 0) {
    itemsHTML = '<p class="chat-sticker-empty">Belum ada stiker di tab ini</p>';
  }
  if (admin) {
    itemsHTML += '<button class="chat-sticker-add" title="Tambah stiker" onclick="renderStickerTray(true)">+</button>';
  }
  tray.innerHTML = tabsHTML + itemsHTML;
}

function stickerFormHTML() {
  const sel = (t) => (t === chatStickerTab ? " selected" : "");
  return '<div class="chat-sticker-form">' +
    '<input id="sticker-form-label" maxlength="20" placeholder="Nama stiker">' +
    '<input id="sticker-form-url" placeholder="Link gambar (https://...)">' +
    '<select id="sticker-form-tier">' +
      '<option value="normal"' + sel("normal") + '>Normal</option>' +
      '<option value="premium"' + sel("premium") + '>Premium</option>' +
      '<option value="admin"' + sel("admin") + '>Admin</option>' +
    '</select>' +
    '<div class="chat-sticker-form-actions">' +
      '<button onclick="renderStickerTray(false)">Batal</button>' +
      '<button class="primary" onclick="saveRemoteSticker()">Simpan</button>' +
    '</div>' +
  '</div>';
}

async function saveRemoteSticker() {
  if (!isStickerAdmin() || !currentUser) { showErrorToast("Khusus Admin"); return; }
  const label = (document.getElementById("sticker-form-label")?.value || "").trim().slice(0, 20);
  const url = safeStickerUrl(document.getElementById("sticker-form-url")?.value || "");
  const tier = document.getElementById("sticker-form-tier")?.value || "normal";
  if (!label) { showToast("Isi nama stiker dulu"); return; }
  if (!url) { showToast("Link harus diawali https://"); return; }
  if (!STICKER_TIERS.includes(tier)) return;
  if (!db) { showErrorToast("Firebase belum terhubung"); return; }

  try {
    await db.collection(STICKERS_COLLECTION).add({
      label: label,
      url: url,
      tier: tier,
      createdBy: currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showSuccessToast("Stiker ditambahkan");
    chatStickerTab = tier;
    renderStickerTray(false);
  } catch (e) {
    console.error("Gagal simpan stiker:", e);
    showErrorToast("Gagal simpan stiker: " + (e.code || e.message || "error"));
  }
}

async function deleteRemoteSticker(id) {
  if (!isStickerAdmin() || !id) return;
  if (!confirm("Hapus stiker ini?")) return;
  try {
    await db.collection(STICKERS_COLLECTION).doc(id).delete();
    showSuccessToast("Stiker dihapus");
  } catch (e) {
    console.error("Gagal hapus stiker:", e);
    showErrorToast("Gagal hapus stiker");
  }
}

function renderStickerBubble(msg) {
  const s = getStickerDef(msg.sticker);
  if (!s) return '<div class="chat-msg-text">[stiker tidak dikenal]</div>';
  // Pinggiran diblur tipis di keempat sisi, bentuk tetap kotak dengan ukuran asli
  const feather = "linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 6%, #000 94%, transparent 100%)";
  return '<div class="chat-msg-sticker tier-' + s.tier + '" style="-webkit-mask-image:' + feather + ';-webkit-mask-composite:source-in;mask-image:' + feather + ';mask-composite:intersect;">' + stickerVisualHTML(s) + '</div>';
}

function buildChatAuthorPayload() {
  let clanColor = "";
  if (currentUserProfile.clanId && typeof clanList !== "undefined") {
    const clan = clanList.find(c => c.id === currentUserProfile.clanId);
    clanColor = clan?.color || "";
  }
  if (!clanColor && currentUserProfile.clanName) {
    clanColor = typeof generateClanColor === "function" ? generateClanColor(currentUserProfile.clanName) : "#a855f7";
  }
  const level = currentUserProfile.level || (typeof calculateLevel === "function" ? calculateLevel(currentUserProfile.xp || 0) : 1);
  const rankInfo = typeof calculateRank === "function" ? calculateRankV2(level) : { name: "Rookie" };
  return {
    uid: currentUser.uid,
    user: currentUserProfile.username || "User",
    userId: currentUserProfile.userId || "#?",
    avatar: currentUserProfile.avatar || "",
    clanName: currentUserProfile.clanName || "",
    clanColor: clanColor,
    level: level,
    rank: rankInfo.name
  };
}

async function sendSticker(key) {
  if (!getStickerDef(key)) return;
  if (!canUseSticker(key)) {
    showToast(stickerLockMessage(key));
    return;
  }
  if (!currentUser || !currentUserProfile) {
    showToast("Belum login");
    return;
  }

  const now = Date.now();
  if (now - lastSentTime < CHAT_RATE_LIMIT_MS) {
    const wait = Math.ceil((CHAT_RATE_LIMIT_MS - (now - lastSentTime)) / 1000);
    showToast(`Tunggu ${wait} detik lagi`);
    return;
  }
  lastSentTime = now;
  closeStickerTray();
  if (navigator.vibrate) navigator.vibrate(20);

  if (stickerTarget === "episode") {
    await sendEpisodeSticker(key);
    return;
  }

  try {
    await db.collection(COLLECTIONS.MESSAGES).add({
      ...buildChatAuthorPayload(),
      type: "sticker",
      sticker: key,
      text: "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error("Gagal kirim stiker:", e);
    showErrorToast("Gagal kirim stiker");
  }
}

if (document.head) ensureChatStyles();
