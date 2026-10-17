/* ==================== FORMAT ==================== */
function formatViews(n) {
  n = Number(n) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function formatTime(sec) {
  sec = Math.floor(Number(sec) || 0);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(isoString) {
  if (!isoString) return "-";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "-";
  const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

function getTodayName() {
  const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  return hari[new Date().getDay()];
}

function getVideoUrl(slug, episode) {
  return DUMMY_VIDEOS[(String(slug).length + episode) % DUMMY_VIDEOS.length];
}

function getVideoUrlForEpisode(slug, episode) {
  return `${VIDEO_BASE_URL}${slug}_ep${episode}.mp4`;
}

function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[m]);
}

/* ==================== XP / LEVEL / RANK ==================== */
function calculateLevel(xp) {
  xp = Number(xp) || 0;
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function xpForLevel(level) {
  level = Number(level) || 1;
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * 100;
}

function xpToNextLevel(xp) {
  const currentLevel = calculateLevel(xp);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  const currentLevelXp = xpForLevel(currentLevel);
  const needed = nextLevelXp - currentLevelXp;
  const progress = xp - currentLevelXp;
  return {
    needed,
    progress,
    percent: needed > 0 ? Math.min(100, Math.round((progress / needed) * 100)) : 0
  };
}

function calculateRank(level) {
  level = Number(level) || 1;
  if (level >= 1000) return { name: "Mythic", color: "#ef4444" };
  if (level >= 500) return { name: "Legend", color: "#fbbf24" };
  if (level >= 200) return { name: "Grandmaster", color: "#f97316" };
  if (level >= 100) return { name: "Master", color: "#a855f7" };
  if (level >= 70) return { name: "Diamond", color: "#06b6d4" };
  if (level >= 40) return { name: "Platinum", color: "#10b981" };
  if (level >= 20) return { name: "Gold", color: "#fbbf24" };
  if (level >= 10) return { name: "Silver", color: "#94a3b8" };
  if (level >= 5) return { name: "Bronze", color: "#b45309" };
  return { name: "Rookie", color: "#6b7280" };
}

function formatXP(xp) {
  xp = Number(xp) || 0;
  if (xp >= 1000000) return (xp / 1000000).toFixed(1) + "M";
  if (xp >= 1000) return (xp / 1000).toFixed(1) + "K";
  return xp.toString();
}

/* ==================== LOCALSTORAGE ==================== */
const STORAGE_KEYS = {
  FAVORITES: "miko_favorites",
  HISTORY: "miko_history",
  COMMENTS: "miko_comments",
  NOTIF_READ: "miko_notif_read",
  PROGRESS: "miko_watch_progress",
  PROFILE: "miko_user_profile"
};

function saveToStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    let data = JSON.parse(raw);
    if (key === STORAGE_KEYS.COMMENTS && Array.isArray(data)) {
      data = data.map(c => ({
        ...c,
        animeSlug: c.animeSlug || "unknown-anime",
        episode: Number(c.episode) || 1
      }));
    }
    return data;
  } catch (e) { return fallback; }
}

function saveFavorites() { saveToStorage(STORAGE_KEYS.FAVORITES, favoriteList); }
function saveHistory() { saveToStorage(STORAGE_KEYS.HISTORY, historyList); }
function saveComments() { saveToStorage(STORAGE_KEYS.COMMENTS, dummyComments); }
function saveNotifRead() { saveToStorage(STORAGE_KEYS.NOTIF_READ, window.__notifRead || []); }
function saveProfile() { saveToStorage(STORAGE_KEYS.PROFILE, userProfile); }
function saveWatchProgress() { saveToStorage(STORAGE_KEYS.PROGRESS, window.__watchProgress || {}); }

/* ==================== LOADING ==================== */
function showLoading(message = "Memuat data...") {
  let overlay = document.getElementById("loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loading-overlay";
    overlay.className = "loading-overlay";
    overlay.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text" id="loading-text">${escapeHtml(message)}</div>
    `;
    document.body.appendChild(overlay);
  } else {
    const textEl = document.getElementById("loading-text");
    if (textEl) textEl.textContent = message;
  }
  overlay.classList.add("show");
}

function hideLoading() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) overlay.classList.remove("show");
}

/* ==================== TOAST ==================== */
function ensureToast() {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "app-toast";
    document.body.appendChild(toast);
  }
  return toast;
}

function showToast(message, duration = 2000) {
  const toast = ensureToast();
  toast.classList.remove("toast-loading", "toast-success", "toast-error");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

function showLoadingToast(message = "Memproses...") {
  const toast = ensureToast();
  toast.classList.remove("toast-success", "toast-error");
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <div class="toast-spinner"></div>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
  toast.classList.add("show", "toast-loading");
  clearTimeout(window.__toastTimer);
}

function showSuccessToast(message = "Berhasil!") {
  const toast = ensureToast();
  toast.classList.remove("toast-loading", "toast-error");
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="color:#10b981;font-size:16px;font-weight:700;">✓</span>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
  toast.classList.add("show", "toast-success");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show", "toast-success");
  }, 2500);
}

function showErrorToast(message = "Terjadi kesalahan") {
  const toast = ensureToast();
  toast.classList.remove("toast-loading", "toast-success");
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="color:#ef4444;font-size:16px;font-weight:700;">✕</span>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
  toast.classList.add("show", "toast-error");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show", "toast-error");
  }, 3000);
}

/* ==================== MODAL HELPERS ==================== */
function openModal() {
  const m = document.getElementById("modal");
  if (m) m.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const m = document.getElementById("modal");
  if (m) m.style.display = "none";
  document.body.style.overflow = "";
}

/* ==================== ICONS ==================== */
const icons = {
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ico-11"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ico-11"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="currentColor" class="ico-10"><path d="M12 2 15 9l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="ico-11"><path d="M9 18l6-6-6-6"/></svg>`,
  chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="ico-11"><path d="M6 9l6 6 6-6"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  paw: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a2 2 0 0 1-4 0V15a5 5 0 0 1-1-4z"/></svg>`,
  star2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`,
  share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  report: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  heartFill: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  crown: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 18h20l-2-9-5 3-3-8-3 8-5-3z"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  reply: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  exit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  login: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`
};

function iconCrown() { return `<svg viewBox="0 0 24 24" fill="currentColor" class="ico-14"><path d="M2 18h20l-2-9-5 3-3-8-3 8-5-3z"/></svg>`; }
function iconStar() { return `<svg viewBox="0 0 24 24" fill="currentColor" class="ico-14"><path d="M12 2 15 9l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg>`; }
function iconTrophy() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ico-14"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`; }
function iconShield() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ico-14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`; }

/* ==================== CLAN LOGO LIBRARY ==================== */
const CLAN_LOGOS = {
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  sword: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/></svg>`,
  crown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h20l-2-9-5 3-3-8-3 8-5-3z"/></svg>`,
  flame: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  skull: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v2h8v-2"/><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"/></svg>`,
  eagle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8v5a3 3 0 0 0 3 3"/><path d="M3 8l7 1-3-5 5 3 4-3-3 5 6-1-3 5H6L3 8z"/><path d="M6 18l-2 4M18 18l2 4"/></svg>`,
  wolf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3l3 5h10l3-5"/><path d="M17 8l2 4v6l-3 3H8l-3-3v-6l2-4"/><circle cx="9.5" cy="13" r="1"/><circle cx="14.5" cy="13" r="1"/></svg>`,
  tiger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M8 4L6 2M16 4l2-2M4 8L2 6M20 8l2-2"/><circle cx="9" cy="11" r="1"/><circle cx="15" cy="11" r="1"/></svg>`,
  lion: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/></svg>`,
  dragon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l-4-3 2 6-3 3 5-1 2 4 2-4 2 4 2-4 5 1-3-3 2-6-4 3-3-5-3 5z"/></svg>`,
  phoenix: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c2 4 6 6 6 10a6 6 0 0 1-12 0c0-4 4-6 6-10z"/><path d="M12 12v8M8 20h8"/></svg>`
};

const CLAN_COLORS = [
  "#a855f7", "#8b5cf6", "#6366f1", "#3b82f6", "#0ea5e9", "#06b6d4",
  "#14b8a6", "#10b981", "#84cc16", "#eab308", "#f59e0b", "#f97316",
  "#ef4444", "#dc2626", "#ec4899", "#d946ef", "#f43f5e", "#fb7185",
  "#64748b", "#94a3b8"
];

function getClanLogo(key) {
  return CLAN_LOGOS[key] || CLAN_LOGOS.shield;
}

function generateClanColor(name) {
  if (!name) return CLAN_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CLAN_COLORS[Math.abs(hash) % CLAN_COLORS.length];
}

function getClanLevel(totalXp) {
  const xp = Number(totalXp) || 0;
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 1000)) + 1;
}

function xpForClanLevel(level) {
  level = Number(level) || 1;
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * 1000;
}

function clanLevelProgress(totalXp) {
  const currentLevel = getClanLevel(totalXp);
  const nextLevelXp = xpForClanLevel(currentLevel + 1);
  const currentLevelXp = xpForClanLevel(currentLevel);
  const needed = nextLevelXp - currentLevelXp;
  const progress = (Number(totalXp) || 0) - currentLevelXp;
  return {
    level: currentLevel,
    needed,
    progress,
    percent: needed > 0 ? Math.min(100, Math.max(0, Math.round((progress / needed) * 100))) : 0
  };
}

function calculateClanTotalXp(members, allUsersArr) {
  if (!members || !allUsersArr) return 0;
  const userMap = new Map();
  allUsersArr.forEach(u => {
    if (u.userId) userMap.set(u.userId, u);
    if (u.username) userMap.set(u.username, u);
  });
  return members.reduce((sum, m) => {
    const u = userMap.get(m.userId) || userMap.get(m.username);
    return sum + (u?.xp || 0);
  }, 0);
}

function getClanBadgeHTML(clanName, clanColor, size = "sm") {
  if (!clanName) return "";
  const color = clanColor || generateClanColor(clanName);
  const sizeClass = size === "lg" ? "clan-badge-new clan-badge-new-lg" : "clan-badge-new";
  const safeName = escapeHtml(String(clanName).toUpperCase());
  return `<span class="${sizeClass}" style="--clan-color:${color};">
    <span class="clan-badge-shimmer"></span>
    <span class="clan-badge-text">${safeName}</span>
  </span>`;
}

function clanLogoHTML(logoKey, size = 24) {
  const svg = getClanLogo(logoKey);
  return `<span class="clan-logo-wrap" style="width:${size}px;height:${size}px;">${svg}</span>`;
}

/* ==================== ANIME TERKAIT (Franchise Only) ==================== */
/* Cuma nampilin anime yang JUDULNYA punya kata kunci unik yang sama.
   Contoh:
   - "Tensura" ↔ "Tensura S2" ↔ "Tensura OVA" ✅
   - "Suka Makan" ↔ "Suka Makan S2" ↔ "Suka Makan OVA" ✅
   - "Otonari no Tenshi" ↔ "Hyouken no Majutsushi" ❌ (kata kunci beda)

   Aturan:
   - Wajib minimal 1 kata kunci unik (min 4 huruf) yang sama
   - Atau field `franchise` di Firestore sama
   - Kalau gak ada → section Anime Terkait GAK MUNCUL
*/

const RELATED_STOP_WORDS = new Set([
  // English common
  "the", "a", "an", "of", "and", "to", "in", "on", "at", "is", "it",
  "that", "this", "with", "for", "from", "by", "as", "be", "was", "were",
  "i", "me", "my", "you", "your", "we", "our", "they", "their",
  // Season/format
  "season", "part", "chapter", "episode", "specials", "special",
  "movie", "ova", "ona", "tv", "sub", "dub", "indonesia", "subtitle",
  // Indonesia
  "dan", "yang", "di", "ke", "dari", "untuk", "pada", "adalah",
  // Jepang partikel umum
  "ga", "no", "wo", "ni", "wa", "de", "to", "mo", "ka", "yo", "ne",
  "kun", "chan", "san", "sama", "sensei", "senpai", "kouhai",
  // Umum di judul anime
  "shita", "suru", "sare", "koto", "mono", "toki", "koto", "desu",
  "made", "kara", "nado", "toka", "bakari"
]);

/**
 * Ambil kata kunci unik dari judul (min 4 huruf, bukan stop word)
 */
function extractTitleKeywords(title) {
  if (!title) return [];
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 4 && !RELATED_STOP_WORDS.has(w));
}

/**
 * Cari anime terkait (franchise only)
 * @param {Object} currentAnime
 * @param {Number} limit
 * @returns {Array}
 */
function getRelatedAnime(currentAnime, limit = 6) {
  if (!currentAnime) return [];
  if (!Array.isArray(animeList) || animeList.length === 0) return [];

  const curKeywords = extractTitleKeywords(currentAnime.title);
  const curSlug = currentAnime.slug;
  const curFranchise = String(currentAnime.franchise || "").toLowerCase().trim();

  // Kalau gak ada keyword penting & gak ada franchise → langsung kosong
  if (curKeywords.length === 0 && !curFranchise) return [];

  const matched = [];

  for (const anime of animeList) {
    if (!anime || anime.slug === curSlug) continue;

    const otherKeywords = extractTitleKeywords(anime.title);
    const otherFranchise = String(anime.franchise || "").toLowerCase().trim();

    // 1) Franchise explicit sama → PASTI masuk (prioritas tertinggi)
    const sameFranchise = !!(curFranchise && otherFranchise && curFranchise === otherFranchise);

    // 2) Hitung kata kunci unik yang SAMA (exact match)
    let keywordMatch = 0;
    for (const kw of curKeywords) {
      if (otherKeywords.includes(kw)) keywordMatch++;
    }

    // Minimal 1 kata kunci unik (min 4 huruf) yang sama = dianggap 1 franchise
    const titleOk = keywordMatch >= 1;

    if (!sameFranchise && !titleOk) continue;

    // Skor
    let score = 0;
    if (sameFranchise) score += 1000;
    score += keywordMatch * 100;

    // Type sama → bonus kecil
    if (String(currentAnime.type || "TV").toLowerCase() === String(anime.type || "TV").toLowerCase()) {
      score += 20;
    }

    matched.push({ anime, score, keywordMatch });
  }

  matched.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (Number(b.anime.rating) || 0) - (Number(a.anime.rating) || 0);
  });

  return matched.slice(0, limit).map(s => s.anime);
}