/* ==================== LOGIN PAGE SYSTEM ==================== */
/* Versi: full SVG icon, no emoji */

let loginRenderOverrideReady = false;

/* ==================== SVG ICONS UNTUK LOGIN ==================== */
const LOGIN_ICONS = {
  tv: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  document: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>`
};

/* ==================== RENDER HALAMAN LOGIN ==================== */
function renderLoginPage() {
  const main = document.getElementById("app-main");
  const nav = document.getElementById("bottom-nav");
  const miniHeader = document.getElementById("mini-header");
  
  if (nav) nav.style.display = "none";
  if (miniHeader) miniHeader.style.display = "none";
  if (!main) return;
  
  main.innerHTML = `
    <div class="login-page">
      <div class="login-bg-deco">
        <div class="login-blob login-blob-1"></div>
        <div class="login-blob login-blob-2"></div>
        <div class="login-blob login-blob-3"></div>
      </div>

      <div class="login-content">
        <div class="login-logo-wrap">
          <div class="login-logo-icon">
            ${LOGIN_ICONS.play}
          </div>
          <h1 class="login-title">AnimeKu</h1>
          <p class="login-tagline">Nonton anime sepuasnya, gratis!</p>
        </div>

        <div class="login-section">
          <h2 class="login-section-title">
            <span class="login-section-icon">${LOGIN_ICONS.sparkle}</span>
            Fitur Unggulan
          </h2>
          <div class="login-feature-list">
            <div class="login-feature">
              <div class="login-feature-icon">${LOGIN_ICONS.tv}</div>
              <div class="login-feature-text">
                <div class="login-feature-title">Streaming HD</div>
                <div class="login-feature-sub">Nonton tanpa buffering</div>
              </div>
            </div>
            <div class="login-feature">
              <div class="login-feature-icon">${LOGIN_ICONS.chat}</div>
              <div class="login-feature-text">
                <div class="login-feature-title">Komentar Live</div>
                <div class="login-feature-sub">Ngobrol sama fans lain</div>
              </div>
            </div>
            <div class="login-feature">
              <div class="login-feature-icon">${LOGIN_ICONS.shield}</div>
              <div class="login-feature-text">
                <div class="login-feature-title">Clan & Squad</div>
                <div class="login-feature-sub">Bikin clan, kumpulin XP</div>
              </div>
            </div>
            <div class="login-feature">
              <div class="login-feature-icon">${LOGIN_ICONS.trophy}</div>
              <div class="login-feature-text">
                <div class="login-feature-title">Leaderboard</div>
                <div class="login-feature-sub">Bersaing jadi top rank</div>
              </div>
            </div>
          </div>
        </div>

        <div class="login-section">
          <h2 class="login-section-title">
            <span class="login-section-icon">${LOGIN_ICONS.document}</span>
            Aturan Pakai
          </h2>
          <div class="login-rules">
            <div class="login-rule">
              <span class="login-rule-num">1</span>
              <span>Hormati sesama user, jangan toxic</span>
            </div>
            <div class="login-rule">
              <span class="login-rule-num">2</span>
              <span>Dilarang spam komentar / clan</span>
            </div>
            <div class="login-rule">
              <span class="login-rule-num">3</span>
              <span>Dilarang share link ilegal</span>
            </div>
            <div class="login-rule">
              <span class="login-rule-num">4</span>
              <span>Data kamu aman & gak dijual</span>
            </div>
          </div>
        </div>

        <div class="login-action">
          <button class="login-google-btn" id="login-google-btn" onclick="handleLoginGoogleClick()">
            <svg viewBox="0 0 48 48" width="20" height="20">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z"/>
            </svg>
            <span>Login dengan Google</span>
          </button>
          <div class="login-footer">
            Dengan login, kamu setuju dengan aturan MikoAnime
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ==================== HANDLE KLIK TOMBOL GOOGLE ==================== */
async function handleLoginGoogleClick() {
  const btn = document.getElementById("login-google-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      <div class="login-btn-spinner"></div>
      <span>Menghubungkan...</span>
    `;
  }
  
  const ok = await loginWithGoogle();
  
  if (!ok) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 48 48" width="20" height="20">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z"/>
        </svg>
        <span>Login dengan Google</span>
      `;
    }
    return;
  }
  
  setTimeout(() => {
    location.reload();
  }, 800);
}

/* ==================== AUTO-OVERRIDE renderPage ==================== */
function initLoginOverride() {
  if (typeof renderPage !== "function") {
    setTimeout(initLoginOverride, 100);
    return;
  }
  
  if (loginRenderOverrideReady) return;
  loginRenderOverrideReady = true;
  
  const _origRenderPage = renderPage;
  window.renderPage = function() {
    if (typeof isLoggedIn === "function" && !isLoggedIn()) {
      renderLoginPage();
      return;
    }
    _origRenderPage.apply(this, arguments);
  };
  
  if (typeof switchTab === "function") {
    const _origSwitchTab = switchTab;
    window.switchTab = function(tab) {
      if (typeof isLoggedIn === "function" && !isLoggedIn()) {
        renderLoginPage();
        return;
      }
      _origSwitchTab.apply(this, arguments);
    };
  }
  
  console.log("🔒 Login override aktif");
}

/* ==================== AUTH STATE LISTENER ==================== */
function listenAuthState() {
  if (!auth) {
    setTimeout(listenAuthState, 200);
    return;
  }
  
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      console.log("👤 User aktif:", user.uid);
    } else {
      console.log("👤 Belum login → halaman login");
      setTimeout(() => {
        if (typeof renderLoginPage === "function") renderLoginPage();
      }, 500);
    }
  });
}

/* ==================== BOOT ==================== */
document.addEventListener("DOMContentLoaded", () => {
  initLoginOverride();
  setTimeout(listenAuthState, 300);
});

/* ==================== GENERATE USERNAME DARI GOOGLE ==================== */
function generateUsernameFromGoogle(user) {
  if (!user) return "User" + Math.floor(1000 + Math.random() * 9000);
  
  // Coba dari displayName dulu
  if (user.displayName && user.displayName.trim()) {
    const first = user.displayName.trim().split(" ")[0];
    const clean = first.replace(/[^a-zA-Z0-9_]/g, "");
    if (clean.length >= 3) return clean;
  }
  
  // Fallback: dari email
  if (user.email) {
    const beforeAt = user.email.split("@")[0];
    const clean = beforeAt.replace(/[^a-zA-Z0-9_]/g, "");
    if (clean.length >= 3) return clean;
  }
  
  // Fallback terakhir: random
  return "User" + Math.floor(1000 + Math.random() * 9000);
}