/* ==================== SETTINGS PAGE ==================== */

const SETTINGS_KEYS = {
  AUTO_SKIP_INTRO: "miko_setting_auto_skip_intro",
  AUTO_NEXT_EPISODE: "miko_setting_auto_next_episode",
  AUTO_PLAY: "miko_setting_auto_play",
  VIDEO_QUALITY: "miko_setting_video_quality",
  APP_LANGUAGE: "miko_setting_app_language",
  NOTIF_ANIME_NEW: "miko_setting_notif_anime_new",
  NOTIF_COMMENT: "miko_setting_notif_comment",
  NOTIF_CLAN: "miko_setting_notif_clan"
};

const SETTINGS_DEFAULTS = {
  autoSkipIntro: false,
  autoNextEpisode: true,
  autoPlay: true,
  videoQuality: "auto",
  appLanguage: "id",
  notifAnimeNew: true,
  notifComment: true,
  notifClan: false
};

let userSettings = { ...SETTINGS_DEFAULTS };

/* ==================== SVG ICONS ==================== */
const SETTINGS_ICONS = {
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  tag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  hash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
  skipForward: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>`,
  fastForward: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/></svg>`,
  monitor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
};

/* ==================== BORDER & BANNER SYSTEM (FIREBASE) ==================== */
// Fungsi ambil list border dari Firebase
async function getBordersFromFirestore() {
  try {
    const doc = await db.collection((COLLECTIONS && COLLECTIONS.ASSETS) || "assets").doc("borders").get();
    if (doc.exists && doc.data().list) {
      return doc.data().list;
    }
    return [];
  } catch (e) {
    console.warn("Gagal load border:", e);
    return [];
  }
}

// Fungsi ambil list banner dari Firebase
async function getBannersFromFirestore() {
  try {
    const doc = await db.collection((COLLECTIONS && COLLECTIONS.ASSETS) || "assets").doc("banners").get();
    if (doc.exists && doc.data().list) {
      return doc.data().list;
    }
    return [];
  } catch (e) {
    console.warn("Gagal load banner:", e);
    return [];
  }
}

// Fungsi cek akses user ke item (basic/premium/admin)
function canUserUseItem(itemType, user) {
  if (user && user.isAdmin === true) return true;
  if (itemType === "basic") return true;
  if (itemType === "premium") return user.isPremium === true;
  if (itemType === "admin") return user.isAdmin === true;
  return false;
}

// Fungsi pasang border
async function equipBorder(itemId, url) {
  if (!currentUser) { showToast("Belum login"); return; }
  showLoadingToast("Memasang border...");
  try {
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { 
      equippedBorder: itemId,
      borderImgUrl: url 
    });
    userProfile.equippedBorder = itemId;
    userProfile.borderImgUrl = url;
    if (currentUserProfile) { 
      currentUserProfile.equippedBorder = itemId; 
      currentUserProfile.borderImgUrl = url;
    }
    const idx = allUsers.findIndex(function(u) { return u.id === currentUser.uid; });
    if (idx > -1) { allUsers[idx].equippedBorder = itemId; allUsers[idx].borderImgUrl = url; }
    showSuccessToast("Border terpasang!");
    renderPage();
  } catch (e) {
    showErrorToast("Gagal memasang border");
  }
}

// Fungsi pasang banner
async function equipBanner(itemId, url) {
  if (!currentUser) { showToast("Belum login"); return; }
  showLoadingToast("Memasang banner...");
  try {
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { 
      bannerUrl: url,
      bannerType: (typeof isVideoUrl === "function" && isVideoUrl(url)) ? "video" : "image"
    });
    userProfile.bannerUrl = url;
    userProfile.bannerType = (isVideoUrl(url) ? "video" : "image");
    if (currentUserProfile) { currentUserProfile.bannerUrl = url; currentUserProfile.bannerType = (isVideoUrl(url) ? "video" : "image"); }
    const idx = allUsers.findIndex(function(u) { return u.id === currentUser.uid; });
    if (idx > -1) { allUsers[idx].bannerUrl = url; allUsers[idx].bannerType = (isVideoUrl(url) ? "video" : "image"); }
    showSuccessToast("Banner terpasang!");
    renderPage();
  } catch (e) {
    showErrorToast("Gagal memasang banner");
  }
}

/* ==================== LOAD / SAVE SETTINGS ==================== */
function loadSettings() {
  try {
    const saved = localStorage.getItem("miko_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      userSettings = { ...SETTINGS_DEFAULTS, ...parsed };
    } else {
      userSettings = { ...SETTINGS_DEFAULTS };
    }
  } catch (e) {
    userSettings = { ...SETTINGS_DEFAULTS };
  }
  return userSettings;
}

function saveSettings() {
  try {
    localStorage.setItem("miko_settings", JSON.stringify(userSettings));
    return true;
  } catch (e) {
    console.error("Gagal save settings:", e);
    return false;
  }
}

function updateSetting(key, value) {
  userSettings[key] = value;
  saveSettings();
}

function getSetting(key) {
  return userSettings[key] ?? SETTINGS_DEFAULTS[key];
}

/* ==================== HELPER ==================== */
function getVideoQualityLabel(value) {
  const labels = {
    "auto": "Auto (Otomatis)",
    "720p": "720p (HD)",
    "1080p": "1080p (Full HD)"
  };
  return labels[value] || "Auto";
}

function getLanguageLabel(value) {
  const labels = {
    "id": "Indonesia",
    "en": "English"
  };
  return labels[value] || "Indonesia";
}

function getPremiumStatusLabel(u) {
  if (!u) return "Free";
  if (u.premium === true || u.isPremium === true) return "Premium";
  return "Free";
}

/* ==================== RENDER HALAMAN PENGATURAN ==================== */
function renderSettings(main) {
  loadSettings();

  const u = userProfile || {};
  const rank = typeof calculateRank === "function" ? calculateRank(u.level || 1) : { name: "Rookie" };
  const isMythic = (rank.name || "").toLowerCase() === "mythic";
  const isPremium = u.premium === true || u.isPremium === true;

  main.innerHTML = `
    <div class="settings-page">
      <div class="settings-topbar">
        <button class="settings-back" onclick="switchTab('profil')">
          ${SETTINGS_ICONS.back}
        </button>
        <div class="settings-title">Pengaturan</div>
      </div>

      <div class="settings-body">

        <div class="settings-section">
          <div class="settings-section-title">
            <span class="settings-section-icon">${SETTINGS_ICONS.user}</span>
            <span>Akun</span>
          </div>

          <div class="settings-group">
            

            <div class="settings-item settings-item-static">
              <span class="settings-item-icon">${SETTINGS_ICONS.tag}</span>
              <div class="settings-item-text">
                <div class="settings-item-title">Nama</div>
                <div class="settings-item-sub">${escapeHtml(u.username || "-")}</div>
              </div>
            </div>

            <div class="settings-item settings-item-static">
              <span class="settings-item-icon">${SETTINGS_ICONS.mail}</span>
              <div class="settings-item-text">
                <div class="settings-item-title">Email</div>
                <div class="settings-item-sub">${escapeHtml(u.email || "-")}</div>
              </div>
            </div>

            <div class="settings-item settings-item-static">
              <span class="settings-item-icon">${SETTINGS_ICONS.hash}</span>
              <div class="settings-item-text">
                <div class="settings-item-title">User ID</div>
                <div class="settings-item-sub">${escapeHtml(u.userId || "-")}</div>
              </div>
            </div>

            <div class="settings-item settings-item-static">
              <span class="settings-item-icon">${SETTINGS_ICONS.star}</span>
              <div class="settings-item-text">
                <div class="settings-item-title">Status Premium</div>
                <div class="settings-item-sub" style="color:${isPremium ? "var(--gold)" : "var(--text-mute)"};">${getPremiumStatusLabel(u)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">
            <span class="settings-section-icon">${SETTINGS_ICONS.play}</span>
            <span>Putar</span>
          </div>

          <div class="settings-group">
            <div class="settings-item settings-item-toggle" onclick="toggleSetting('autoSkipIntro')">
              <span class="settings-item-icon">${SETTINGS_ICONS.skipForward}</span>
              <div class="settings-item-text">
                <div class="settings-item-title">Auto Skip Intro</div>
                <div class="settings-item-sub">Otomatis lompat intro</div>
              </div>
              <div class="settings-toggle ${getSetting('autoSkipIntro') ? 'on' : 'off'}">
                <div class="settings-toggle-dot"></div>
              </div>
            </div>

            <div class="settings-item settings-item-toggle" onclick="toggleSetting('autoNextEpisode')">
              <span class="settings-item-icon">${SETTINGS_ICONS.fastForward}</span>
              <div class="settings-item-text">
                <div class="settings-item-title">Auto Next Episode</div>
                <div class="settings-item-sub">Lanjut episode berikutnya</div>
              </div>
              <div class="settings-toggle ${getSetting('autoNextEpisode') ? 'on' : 'off'}">
                <div class="settings-toggle-dot"></div>
              </div>
            </div>

            <div class="settings-item settings-item-toggle" onclick="toggleSetting('autoPlay')">
              <span class="settings-item-icon">${SETTINGS_ICONS.play}</span>
              <div class="settings-item-text">
                <div class="settings-item-title">Auto Play</div>
                <div class="settings-item-sub">Video main otomatis</div>
              </div>
              <div class="settings-toggle ${getSetting('autoPlay') ? 'on' : 'off'}">
                <div class="settings-toggle-dot"></div>
              </div>
            </div>

            <button class="settings-item" onclick="openVideoQualityModal()">
              <span class="settings-item-icon">${SETTINGS_ICONS.monitor}</span>
              <div class="settings-item-text">
                <div class="settings-item-title">Kualitas Video</div>
                <div class="settings-item-sub">${getVideoQualityLabel(getSetting('videoQuality'))}</div>
              </div>
              <span class="settings-item-arrow">${SETTINGS_ICONS.chevronRight}</span>
            </button>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">
            <span class="settings-section-icon">${SETTINGS_ICONS.globe}</span>
            <span>Bahasa</span>
          </div>

          <div class="settings-group">
            <button class="settings-item" onclick="openLanguageModal()">
              <span class="settings-item-icon">${SETTINGS_ICONS.globe}</span>
              <div class="settings-item-text">
                <div class="settings-item-title">Bahasa App</div>
                <div class="settings-item-sub">${getLanguageLabel(getSetting('appLanguage'))}</div>
              </div>
              <span class="settings-item-arrow">${SETTINGS_ICONS.chevronRight}</span>
            </button>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">
            <span class="settings-section-icon">${SETTINGS_ICONS.bell}</span>
            <span>Notifikasi</span>
          </div>

          <div class="settings-group">
            <div class="settings-item settings-item-toggle" onclick="toggleSetting('notifAnimeNew')">
              <span class="settings-item-icon">${SETTINGS_ICONS.bell}</span>
              <div class="settings-item-text">
                <div class="settings-item-title">Anime Baru</div>
                <div class="settings-item-sub">Notif kalau ada anime baru</div>
              </div>
              <div class="settings-toggle ${getSetting('notifAnimeNew') ? 'on' : 'off'}">
                <div class="settings-toggle-dot"></div>
              </div>
            </div>

            <div class="settings-item settings-item-toggle" onclick="toggleSetting('notifComment')">
              <span class="settings-item-icon">${SETTINGS_ICONS.bell}</span>
              <div class="settings-item-text">
                <div class="settings-item-title">Komentar</div>
                <div class="settings-item-sub">Notif kalau ada balasan</div>
              </div>
              <div class="settings-toggle ${getSetting('notifComment') ? 'on' : 'off'}">
                <div class="settings-toggle-dot"></div>
              </div>
            </div>

            <div class="settings-item settings-item-toggle" onclick="toggleSetting('notifClan')">
              <span class="settings-item-icon">${SETTINGS_ICONS.bell}</span>
              <div class="settings-item-text">
                <div class="settings-item-title">Clan</div>
                <div class="settings-item-sub">Notif update clan kamu</div>
              </div>
              <div class="settings-toggle ${getSetting('notifClan') ? 'on' : 'off'}">
                <div class="settings-toggle-dot"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">
            <span class="settings-section-icon">${SETTINGS_ICONS.info}</span>
            <span>Lainnya</span>
          </div>

          <div class="settings-group">
            <button class="settings-item" onclick="confirmClearCache()">
              <span class="settings-item-icon">${SETTINGS_ICONS.trash}</span>
              <div class="settings-item-text">
                <div class="settings-item-title">Hapus Cache</div>
                <div class="settings-item-sub">Favorit, riwayat, progress</div>
              </div>
              <span class="settings-item-arrow">${SETTINGS_ICONS.chevronRight}</span>
            </button>

            <button class="settings-item" onclick="confirmResetSettings()">
              <span class="settings-item-icon">${SETTINGS_ICONS.refresh}</span>
              <div class="settings-item-text">
                <div class="settings-item-title">Reset Pengaturan</div>
                <div class="settings-item-sub">Balik ke default</div>
              </div>
              <span class="settings-item-arrow">${SETTINGS_ICONS.chevronRight}</span>
            </button>

            <button class="settings-item" onclick="openAboutModal()">
              <span class="settings-item-icon">${SETTINGS_ICONS.info}</span>
              <div class="settings-item-text">
                <div class="settings-item-title">Tentang AnimeKu</div>
                <div class="settings-item-sub">Info app & developer</div>
              </div>
              <span class="settings-item-arrow">${SETTINGS_ICONS.chevronRight}</span>
            </button>
          </div>
        </div>

        <button class="settings-logout-btn" onclick="logout()">
          <span class="settings-logout-icon">${SETTINGS_ICONS.logout}</span>
          <span>Logout</span>
        </button>

        <div class="settings-footer">
          AnimeKu v${APP_VERSION}
        </div>
      </div>
    </div>
  `;
}

/* ==================== TOGGLE SETTING ==================== */
function toggleSetting(key) {
  const newValue = !getSetting(key);
  updateSetting(key, newValue);

  const toggle = event.currentTarget.querySelector(".settings-toggle");
  if (toggle) {
    toggle.classList.toggle("on", newValue);
    toggle.classList.toggle("off", !newValue);
  }

  if (navigator.vibrate) navigator.vibrate(20);
}

/* ==================== MODAL: VIDEO QUALITY ==================== */
function openVideoQualityModal() {
  const current = getSetting("videoQuality");
  const options = [
    { value: "auto", label: "Auto (Otomatis)", desc: "Sesuai koneksi kamu" },
    { value: "720p", label: "720p (HD)", desc: "Kualitas bagus" },
    { value: "1080p", label: "1080p (Full HD)", desc: "Kualitas terbaik" }
  ];

  document.getElementById("modal-title").textContent = "Kualitas Video";
  document.getElementById("modal-body").innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${options.map(o => `
        <button class="settings-modal-option ${current === o.value ? "selected" : ""}" onclick="selectVideoQuality('${o.value}')">
          <div style="flex:1;text-align:left;">
            <div class="settings-modal-option-title">${o.label}</div>
            <div class="settings-modal-option-desc">${o.desc}</div>
          </div>
          ${current === o.value ? `<span class="settings-modal-check">${SETTINGS_ICONS.check}</span>` : ""}
        </button>
      `).join("")}
    </div>
  `;
  openModal();
}

function selectVideoQuality(value) {
  updateSetting("videoQuality", value);
  closeModal();
  renderPage();
  showSuccessToast("Kualitas video diset ke " + getVideoQualityLabel(value));
}

/* ==================== MODAL: LANGUAGE ==================== */
function openLanguageModal() {
  const current = getSetting("appLanguage");
  const options = [
    { value: "id", label: "Indonesia" },
    { value: "en", label: "English" }
  ];

  document.getElementById("modal-title").textContent = "Bahasa App";
  document.getElementById("modal-body").innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${options.map(o => `
        <button class="settings-modal-option ${current === o.value ? "selected" : ""}" onclick="selectLanguage('${o.value}')">
          <div style="flex:1;text-align:left;">
            <div class="settings-modal-option-title">${o.label}</div>
          </div>
          ${current === o.value ? `<span class="settings-modal-check">${SETTINGS_ICONS.check}</span>` : ""}
        </button>
      `).join("")}
    </div>
    <div class="form-hint" style="text-align:center;margin-top:10px;">
      Bahasa app masih dalam pengembangan
    </div>
  `;
  openModal();
}

function selectLanguage(value) {
  updateSetting("appLanguage", value);
  closeModal();
  renderPage();
  showSuccessToast("Bahasa diset ke " + getLanguageLabel(value));
}

/* ==================== CLEAR CACHE ==================== */
function confirmClearCache() {
  if (!confirm("Hapus semua data lokal?\n\n- Favorit\n- Riwayat\n- Progress nonton\n- Komentar lokal\n\nData akun (XP, clan) tetap aman.")) return;

  try {
    localStorage.removeItem(STORAGE_KEYS.FAVORITES);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    localStorage.removeItem(STORAGE_KEYS.COMMENTS);
    localStorage.removeItem(STORAGE_KEYS.PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.NOTIF_READ);

    favoriteList = [];
    historyList = [];
    dummyComments = [];
    window.__notifRead = [];
    window.__watchProgress = {};

    showSuccessToast("Cache berhasil dihapus!");
    setTimeout(() => location.reload(), 800);
  } catch (e) {
    console.error("Clear cache error:", e);
    showErrorToast("Gagal hapus cache");
  }
}

/* ==================== RESET SETTINGS ==================== */
function confirmResetSettings() {
  if (!confirm("Reset semua pengaturan ke default?")) return;

  userSettings = { ...SETTINGS_DEFAULTS };
  saveSettings();
  renderPage();
  showSuccessToast("Pengaturan direset ke default");
}

/* ==================== ABOUT MODAL ==================== */
function openAboutModal() {
  document.getElementById("modal-title").textContent = "Tentang AnimeKu";
  document.getElementById("modal-body").innerHTML = `
    <div style="text-align:center;padding:10px 0;">
      <div style="width:70px;height:70px;border-radius:20px;background:var(--grad);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;box-shadow:0 8px 24px rgba(124,58,237,0.4);">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:36px;height:36px;">
          <polygon points="6 3 20 12 6 21 6 3"/>
        </svg>
      </div>
      <div style="font-size:20px;font-weight:800;margin-bottom:4px;">AnimeKu</div>
      <div style="font-size:12px;color:var(--text-mute);margin-bottom:16px;">v${APP_VERSION}</div>
      
      <div style="font-size:12.5px;color:var(--text-dim);line-height:1.6;padding:0 10px;margin-bottom:20px;text-align:justify;">
        <b>AnimeKu</b> adalah platform streaming anime gratis yang dilengkapi dengan sistem sosial lengkap. 
        Di sini kamu bisa menonton anime favoritmu, bergabung dengan clan, bersaing di leaderboard, 
        mengumpulkan XP, dan berinteraksi dengan sesama pecinta anime melalui fitur komentar live.
        <br><br>
        Website ini dikembangkan secara independen oleh <b>Developer MikoSenpaii</b> sebagai wadah hiburan 
        dan komunitas anime di Indonesia.
      </div>

      <div style="text-align:left;font-size:12px;font-weight:800;color:var(--text-mute);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;padding:0 4px;">
        Hubungi Kami
      </div>
      
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
        
        <a href="https://tiktok.com/@_anime_" target="_blank" rel="noopener noreferrer" 
           style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--bg-3);border-radius:12px;text-decoration:none;color:var(--text);border:1px solid var(--border);transition:all 0.2s;">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;color:white;">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px;"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
          </div>
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:700;">TikTok</div>
            <div style="font-size:11px;color:var(--text-mute);">@_animeku_</div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;stroke:var(--text-mute);"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>

        <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" 
           style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--bg-3);border-radius:12px;text-decoration:none;color:var(--text);border:1px solid var(--border);transition:all 0.2s;">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(37,211,102,0.15);display:flex;align-items:center;justify-content:center;color:#25D366;">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
          </div>
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:700;">WhatsApp</div>
            <div style="font-size:11px;color:var(--text-mute);">+62 812-3456-7890</div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;stroke:var(--text-mute);"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>

        <a href="mailto:support@animekuu.web.id" 
           style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--bg-3);border-radius:12px;text-decoration:none;color:var(--text);border:1px solid var(--border);transition:all 0.2s;">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(6,182,212,0.15);display:flex;align-items:center;justify-content:center;color:var(--accent-2);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:700;">Email</div>
            <div style="font-size:11px;color:var(--text-mute);">support@animekuu.web.id</div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;stroke:var(--text-mute);"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>

        <a href="https://whatsapp.com/channel/0029Vb6vxfE3wtbDu3DwyK3F" target="_blank" rel="noopener noreferrer" 
           style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--bg-3);border-radius:12px;text-decoration:none;color:var(--text);border:1px solid var(--border);transition:all 0.2s;">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(59,130,246,0.15);display:flex;align-items:center;justify-content:center;color:#3b82f6;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </div>
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:700;">Saluran WhatsApp</div>
            <div style="font-size:11px;color:var(--text-mute);">Klik untuk gabung</div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;stroke:var(--text-mute);"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>

      </div>

      <div style="font-size:11px;color:var(--text-mute);line-height:1.6;">
        Dibuat dengan sepenuh hati untuk pecinta anime Indonesia<br>
        &copy; 2026 AnimeKu. All rights reserved.
      </div>
    </div>
    <div class="form-actions">
      <button class="form-btn form-btn-save" onclick="closeModal()">Tutup</button>
    </div>
  `;
  openModal();
}

/* ==================== AUTO SKIP INTRO HELPERS ==================== */
function shouldAutoSkipIntro() {
  return getSetting("autoSkipIntro") === true;
}

function shouldAutoNextEpisode() {
  return getSetting("autoNextEpisode") === true;
}

function shouldAutoPlay() {
  return getSetting("autoPlay") === true;
}

/* ==================== INIT ==================== */
loadSettings();
console.log("Settings system loaded");