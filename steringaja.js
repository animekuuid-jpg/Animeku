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
            ${isMythic ? `
              <button class="settings-item" onclick="changeBanner()">
                <span class="settings-item-icon">${SETTINGS_ICONS.image}</span>
                <div class="settings-item-text">
                  <div class="settings-item-title">Ganti Banner</div>
                  <div class="settings-item-sub">Banner khusus rank Mythic</div>
                </div>
                <span class="settings-item-arrow">${SETTINGS_ICONS.chevronRight}</span>
              </button>
            ` : ""}

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
                <div class="settings-item-title">Tentang MikoAnime</div>
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
          MikoAnime v${APP_VERSION}
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
  document.getElementById("modal-title").textContent = "Tentang MikoAnime";
  document.getElementById("modal-body").innerHTML = `
    <div style="text-align:center;padding:10px 0;">
      <div style="width:70px;height:70px;border-radius:20px;background:var(--grad);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;box-shadow:0 8px 24px rgba(124,58,237,0.4);">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:36px;height:36px;">
          <polygon points="6 3 20 12 6 21 6 3"/>
        </svg>
      </div>
      <div style="font-size:20px;font-weight:800;margin-bottom:4px;">MikoAnime</div>
      <div style="font-size:12px;color:var(--text-mute);margin-bottom:16px;">v${APP_VERSION}</div>
      <div style="font-size:13px;color:var(--text-dim);line-height:1.6;padding:0 10px;margin-bottom:16px;">
        Platform streaming anime gratis dengan sistem sosial lengkap: clan, leaderboard, XP, dan komentar live.
      </div>
      <div style="font-size:11px;color:var(--text-mute);line-height:1.6;">
        Dibuat dengan untuk pecinta anime Indonesia<br>
        &copy; 2026 MikoAnime
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