/* ==================== PUBLIC CHAT (Full Screen) ==================== */

let globalChatListener = null;
let globalChatMessages = [];
let lastSentTime = 0;
const CHAT_RATE_LIMIT_MS = 1500;
const CHAT_MAX_MESSAGES = 50;

/* ==================== BUKA HALAMAN CHAT ==================== */
function openGlobalChat() {
  if (typeof unlockScroll === "function") unlockScroll();
  watchFromTab = currentTab;
  currentTab = "global-chat";
  watchOpen = false;
  if (typeof stopAutoSlide === "function") stopAutoSlide();

  // Sembunyikan bottom nav & mini header
  var nav = document.getElementById("bottom-nav");
  var miniHeader = document.getElementById("mini-header");
  if (nav) nav.style.display = "none";
  if (miniHeader) miniHeader.style.display = "none";

  // Lock scroll body
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

  main.innerHTML = `
    <div class="chat-page-full">
      <!-- Topbar -->
      <div class="chat-full-header">
        <button class="chat-full-back" onclick="closeGlobalChat()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="chat-full-title">Public Diskusi</div>
        <div class="chat-full-online">
          <span class="chat-online-dot"></span>
          <span>Online</span>
        </div>
      </div>

      <!-- List chat -->
      <div class="chat-full-list" id="chat-list">
        <div class="chat-loading">
          <div class="loading-spinner"></div>
          <p>Memuat chat...</p>
        </div>
      </div>

      <!-- Input bar -->
      <div class="chat-full-input-bar">
        <img class="chat-full-avatar" src="${(userProfile && userProfile.avatar) || 'https://i.pravatar.cc/150'}" alt="">
        <input id="chat-input" class="chat-full-input" placeholder="Ketik pesan..." maxlength="500" onkeydown="if(event.key==='Enter')sendGlobalMessage()">
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

  setTimeout(() => {
    const inp = document.getElementById("chat-input");
    if (inp) inp.focus();
  }, 200);
}

/* ==================== TUTUP HALAMAN CHAT ==================== */
function closeGlobalChat() {
  stopGlobalChatListener();

  // Balikin scroll body
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
      .onSnapshot((snapshot) => {
        const messages = [];
        snapshot.forEach(doc => {
          messages.push({ id: doc.id, ...doc.data() });
        });
        messages.reverse();
        globalChatMessages = messages;
        renderChatMessages();
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

/* ==================== RENDER LIST ==================== */
function renderChatMessages() {
  const list = document.getElementById("chat-list");
  if (!list) return;

  if (globalChatMessages.length === 0) {
    list.innerHTML = `
      <div class="chat-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <p>Belum ada pesan. Jadi yang pertama!</p>
      </div>
    `;
    return;
  }

  const isNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 100;

  list.innerHTML = globalChatMessages.map(renderChatMessageHTML).join("");

  if (isNearBottom) {
    setTimeout(() => {
      list.scrollTop = list.scrollHeight;
    }, 50);
  }
}

/* ==================== RENDER 1 PESAN ==================== */
function renderChatMessageHTML(msg) {
  const isOwn = msg.uid === (currentUser && currentUser.uid);
  const clanName = msg.clanName || "";
  const clanColor = msg.clanColor || (clanName && typeof generateClanColor === "function" ? generateClanColor(clanName) : "");
  const level = msg.level || 1;
  const rankInfo = typeof calculateRank === "function" ? calculateRank(level) : { name: "Rookie", color: "#6b7280" };
  const rank = msg.rank || rankInfo.name;
  const safeName = String(msg.user || "").replace(/'/g, "\\'");
  const avatarUrl = msg.avatar || "https://i.pravatar.cc/150";

  return `
    <div class="chat-msg ${isOwn ? "chat-msg-own" : ""}" data-msg-id="${msg.id}">
      <img class="chat-msg-avatar" src="${avatarUrl}" alt="" onclick="openPublicProfile('${safeName}')">
      <div class="chat-msg-body">
        <div class="chat-msg-header">
          <span class="chat-msg-name" onclick="openPublicProfile('${safeName}')">${escapeHtml(msg.user || "Unknown")}</span>
          <span class="chat-msg-id">${escapeHtml(msg.userId || "#?")}</span>
          ${clanName ? `<span class="chat-msg-clan" style="--clan-color:${clanColor};">${escapeHtml(clanName.toUpperCase())}</span>` : ""}
          <span class="chat-msg-level" style="color:${rankInfo.color};">Lvl ${level} • ${rank}</span>
        </div>
        <div class="chat-msg-text">${escapeHtml(msg.text || "")}</div>
        <div class="chat-msg-footer">
          <span class="chat-msg-time">${formatChatTime(msg.createdAt)}</span>
          ${isOwn ? `<button class="chat-msg-del" onclick="deleteChatMessage('${msg.id}')" title="Hapus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>` : ""}
        </div>
      </div>
    </div>
  `;
}

/* ==================== KIRIM ==================== */
async function sendGlobalMessage() {
  const input = document.getElementById("chat-input");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

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

  input.disabled = true;

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
    const rankInfo = typeof calculateRank === "function" ? calculateRank(level) : { name: "Rookie" };

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

    lastSentTime = Date.now();
    input.value = "";
    if (navigator.vibrate) navigator.vibrate(20);

    setTimeout(() => {
      const list = document.getElementById("chat-list");
      if (list) list.scrollTop = list.scrollHeight;
    }, 200);
  } catch (e) {
    console.error("Gagal kirim pesan:", e);
    showErrorToast("Gagal kirim pesan");
  } finally {
    input.disabled = false;
    input.focus();
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

console.log("💬 Public Chat loaded");