/* ==================== AUTH SYSTEM ==================== */
/* Login WAJIB Google. Username & avatar otomatis dari akun Google. */
/* userId urut: #001, #002, #003, ... */

let currentUser = null;
let currentUserProfile = null;
let authReady = false;

/* ==================== INIT AUTH ==================== */
async function initAuth() {
  if (!firebaseReady || !auth) {
    console.error("❌ Firebase belum siap buat auth");
    return false;
  }

  return new Promise((resolve) => {
    let resolved = false;

    auth.onAuthStateChanged(async (user) => {
      if (resolved) {
        if (user) {
          currentUser = user;
          await loadOrCreateUserProfile(user);
        } else {
          currentUser = null;
          currentUserProfile = null;
        }
        if (typeof onAuthChangedRender === "function") onAuthChangedRender();
        return;
      }
      resolved = true;

      if (user) {
        console.log("✅ User login:", user.uid);
        currentUser = user;
        await loadOrCreateUserProfile(user);
        authReady = true;
        resolve(true);
      } else {
        console.log("👤 Belum login — tampilkan halaman login");
        currentUser = null;
        currentUserProfile = null;
        authReady = true;
        resolve(true);
      }
    });
  });
}

/* ==================== LOAD / CREATE USER PROFILE ==================== */
async function loadOrCreateUserProfile(user) {
  try {
    const docRef = db.collection(COLLECTIONS.USERS).doc(user.uid);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      currentUserProfile = { id: user.uid, ...data };

      const googleName = generateUsernameFromGoogle(user);
      const googlePhoto = user.photoURL || "";

      const updates = { lastSeen: new Date().toISOString() };
      let needUpdate = false;

      if (!data.username || data.username.trim() === "") {
        updates.username = googleName;
        currentUserProfile.username = googleName;
        needUpdate = true;
        console.log("🔄 Username auto-set dari Google:", googleName);
      }

      if (googlePhoto && (!data.avatar || data.avatar.includes("pravatar.cc"))) {
        updates.avatar = googlePhoto;
        currentUserProfile.avatar = googlePhoto;
        needUpdate = true;
        console.log("🔄 Avatar auto-sync dari Google");
      }

      if (needUpdate) {
        await docRef.update(updates);
        console.log("🔄 Profile synced dari Google");
      } else {
        docRef.update({ lastSeen: new Date().toISOString() }).catch(() => {});
      }

      console.log("📄 Profile loaded:", currentUserProfile.username, "| ID:", currentUserProfile.userId);
    } else {
      const profile = await createUserProfileFromGoogle(user);
      await docRef.set(profile);
      currentUserProfile = { id: user.uid, ...profile };
      console.log("🆕 Profile created:", profile.username, "| ID:", profile.userId);
    }
  } catch (e) {
    console.error("❌ Gagal load/create user:", e);
    currentUserProfile = await createUserProfileFromGoogle(user);
    currentUserProfile.id = user.uid;
  }
}

/* ==================== GENERATE USERNAME DARI GOOGLE ==================== */
function generateUsernameFromGoogle(user) {
  if (!user) return "User";

  if (user.displayName && user.displayName.trim()) {
    return user.displayName.trim();
  }

  if (user.email) {
    const beforeAt = user.email.split("@")[0];
    return beforeAt.replace(/\./g, " ").replace(/[^a-zA-Z0-9 _]/g, "").trim() || "User";
  }

  return "User";
}

/* ==================== CREATE PROFILE DARI GOOGLE ==================== */
async function createUserProfileFromGoogle(user) {
  // Generate userId urut (#001, #002, ...)
  let userId = "#001";
  try {
    userId = await generateUserId() || ("#" + Math.floor(100000 + Math.random() * 900000));
  } catch (e) {
    console.warn("Gagal generate userId, pakai random:", e);
    userId = "#" + Math.floor(100000 + Math.random() * 900000);
  }

  let username = generateUsernameFromGoogle(user);

  try {
    const dup = await fbQueryWhere(COLLECTIONS.USERS, "username", "==", username, 1);
    if (dup.length > 0 && dup[0].id !== user.uid) {
      username = username + " " + Math.floor(100 + Math.random() * 900);
      console.log("⚠️ Username duplikat, jadi:", username);
    }
  } catch (e) {
    console.warn("Cek duplikat gagal:", e);
  }

  const googlePhoto = user.photoURL || "";

  return {
    userId: userId,
    username: username,
    avatar: googlePhoto || `https://i.pravatar.cc/150?u=${user.uid}`,
    email: user.email || "",
    provider: "google",
    xp: 0,
    level: 1,
    rank: "Rookie",
    rankColor: "#6b7280",
    followers: 0,
    watchMinutes: 0,
    comments: 0,
    historyCount: 0,
    joinedMonths: 1,
    badges: ["Rookie"],
    isDefault: false,
    bannerUrl: "",
    bannerType: "",
    clanId: "",
    clanName: "",
    verified: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSeen: new Date().toISOString()
  };
}

/* ==================== LOGIN GOOGLE ==================== */
async function loginWithGoogle() {
  if (!auth) return false;
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await auth.signInWithPopup(provider);
    console.log("✅ Google login:", result.user.uid);
    currentUser = result.user;
    await loadOrCreateUserProfile(result.user);
    showSuccessToast("Berhasil login, " + currentUserProfile.username + "!");
    return true;
  } catch (e) {
    console.error("❌ Google login gagal:", e);
    if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") {
      showToast("Login dibatalkan");
    } else if (e.code === "auth/unauthorized-domain") {
      showErrorToast("Domain belum diizinkan di Firebase Console");
    } else if (e.code === "auth/operation-not-allowed") {
      showErrorToast("Google login belum aktif di Firebase Console");
    } else {
      showErrorToast("Gagal login: " + (e.message || "coba lagi"));
    }
    return false;
  }
}

/* ==================== LOGOUT ==================== */
async function logout() {
  if (!auth) return;
  if (!confirm("Yakin mau logout?")) return;

  try {
    await auth.signOut();
    showToast("Logout berhasil");
    setTimeout(() => location.reload(), 600);
  } catch (e) {
    console.error("❌ Logout gagal:", e);
    showErrorToast("Gagal logout");
  }
}

/* ==================== HELPER ==================== */
function getCurrentUserDoc() { return currentUserProfile; }
function getCurrentFirebaseUser() { return currentUser; }
function isLoggedIn() { return !!currentUser; }

/* ==================== SET USERNAME (dari halaman profil) ==================== */
async function setUsername(newUsername) {
  if (!currentUser || !currentUserProfile) {
    showToast("Belum login");
    return false;
  }

  const clean = String(newUsername).trim();

  if (clean.length < 2) { showToast("Username minimal 2 karakter"); return false; }
  if (clean.length > 30) { showToast("Username maksimal 30 karakter"); return false; }
  if (!/^[a-zA-Z0-9 _#.]+$/.test(clean)) {
    showToast("Username cuma boleh huruf, angka, spasi, _, #, .");
    return false;
  }

  try {
    const dup = await fbQueryWhere(COLLECTIONS.USERS, "username", "==", clean, 1);
    if (dup.length > 0 && dup[0].id !== currentUser.uid) {
      showToast("Username udah dipakai");
      return false;
    }
  } catch (e) {
    console.warn("Cek duplikat gagal:", e);
  }

  try {
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, {
      username: clean,
      updatedAt: new Date().toISOString()
    });
    currentUserProfile.username = clean;
    showSuccessToast("Username disimpan!");
    return true;
  } catch (e) {
    console.error("❌ Gagal set username:", e);
    showErrorToast("Gagal simpan username");
    return false;
  }
}

/* ==================== SYNC MANUAL DARI GOOGLE ==================== */
async function syncFromGoogle() {
  if (!currentUser || !currentUserProfile) {
    showToast("Belum login");
    return false;
  }

  const googleName = generateUsernameFromGoogle(currentUser);
  const googlePhoto = currentUser.photoURL || "";

  try {
    const updates = { updatedAt: new Date().toISOString() };
    if (googleName) updates.username = googleName;
    if (googlePhoto) updates.avatar = googlePhoto;

    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, updates);
    currentUserProfile.username = googleName || currentUserProfile.username;
    currentUserProfile.avatar = googlePhoto || currentUserProfile.avatar;

    showSuccessToast("Profil disync dari Google!");
    return true;
  } catch (e) {
    console.error("❌ Sync gagal:", e);
    showErrorToast("Gagal sync");
    return false;
  }
}