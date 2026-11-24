/* ==================== AUTH SYSTEM ==================== */
/* Login lewat Google atau email & password. Data user disimpan di users/{uid}. */
/* Username awal = nama saat daftar (nama akun Google, atau bagian depan email). */
/* signupName tidak pernah berubah. username boleh diganti dari halaman profil. */
/* userId urut: #001, #002, #003, ... */

let currentUser = null;
let currentUserProfile = null;
let authReady = false;

/* ==================== INIT AUTH ==================== */
async function initAuth() {
  if (!firebaseReady || !auth) {
    console.error("Firebase belum siap buat auth");
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
        console.log("User login:", user.uid);
        currentUser = user;
        await loadOrCreateUserProfile(user);
        authReady = true;
        resolve(true);
      } else {
        console.log("Belum login, tampilkan halaman login");
        currentUser = null;
        currentUserProfile = null;
        authReady = true;
        resolve(true);
      }
    });
  });
}

/* ==================== PROVIDER LOGIN ==================== */
// Dari akun Firebase: "google.com" untuk Google, "password" untuk email.
function getLoginProvider(user) {
  const ids = (user && user.providerData ? user.providerData : []).map(p => p.providerId);
  if (ids.includes("google.com")) return "google";
  if (ids.includes("password")) return "email";
  return "other";
}

/* ==================== NAMA AWAL DAFTAR ==================== */
// Ambil nama dari akun Google. Kalau kosong, pakai bagian depan email.
function getSignupName(user) {
  const clean = (s) => String(s || "").replace(/[^a-zA-Z0-9 _#.]/g, "").replace(/\s+/g, " ").trim().slice(0, 30);

  const fromName = clean(user && user.displayName);
  if (fromName.length >= 2) return fromName;

  const fromEmail = clean(String(user && user.email ? user.email : "").split("@")[0]);
  if (fromEmail.length >= 2) return fromEmail;

  return "User " + String(user && user.uid ? user.uid : "").slice(0, 4);
}

// Kalau nama sudah dipakai akun lain, tambahkan angka: "Nama", "Nama 2", "Nama 3", dst.
async function getUniqueUsername(base, uid) {
  let candidate = base;
  let n = 2;
  for (let i = 0; i < 50; i++) {
    let taken = false;
    try {
      const dup = await fbQueryWhere(COLLECTIONS.USERS, "username", "==", candidate, 1);
      taken = dup.length > 0 && dup[0].id !== uid;
    } catch (e) {
      console.warn("Cek username gagal:", e);
    }
    if (!taken) return candidate;
    candidate = base + " " + n;
    n++;
  }
  return base + " " + uid.slice(0, 4);
}

/* ==================== LOAD / CREATE USER PROFILE ==================== */
async function loadOrCreateUserProfile(user) {
  try {
    const docRef = db.collection(COLLECTIONS.USERS).doc(user.uid);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      currentUserProfile = { id: user.uid, ...data };

      const updates = { lastSeen: new Date().toISOString() };

      // Lengkapi data lama yang belum punya nama awal atau provider
      if (!data.signupName) {
        updates.signupName = getSignupName(user);
        currentUserProfile.signupName = updates.signupName;
      }
      if (!data.provider) {
        updates.provider = getLoginProvider(user);
        currentUserProfile.provider = updates.provider;
      }
      if (!data.username || data.username.trim() === "") {
        updates.username = updates.signupName || getSignupName(user);
        currentUserProfile.username = updates.username;
      }
      if (user.email && !data.email) {
        updates.email = user.email;
        currentUserProfile.email = user.email;
      }
      if (user.photoURL && (!data.avatar || data.avatar.includes("pravatar.cc"))) {
        updates.avatar = user.photoURL;
        currentUserProfile.avatar = user.photoURL;
      }

      await docRef.update(updates);
      console.log("Profile loaded:", currentUserProfile.username, "| ID:", currentUserProfile.userId);
    } else {
      const profile = await createUserProfile(user);
      await docRef.set(profile);
      currentUserProfile = { id: user.uid, ...profile };
      console.log("Profile created:", profile.username, "| ID:", profile.userId);
    }
  } catch (e) {
    console.error("Gagal load/create user:", e);
    showErrorToast("Gagal menyimpan data user: " + (e.code || e.message));
    currentUserProfile = await createUserProfile(user);
    currentUserProfile.id = user.uid;
  }
}

/* ==================== CREATE PROFILE ==================== */
async function createUserProfile(user) {
  // userId urut (#001, #002, ...). Kalau gagal, pakai angka acak.
  let userId = "#001";
  try {
    userId = await generateUserId() || ("#" + Math.floor(100000 + Math.random() * 900000));
  } catch (e) {
    console.warn("Gagal generate userId, pakai acak:", e);
    userId = "#" + Math.floor(100000 + Math.random() * 900000);
  }

  const signupName = getSignupName(user);
  const username = await getUniqueUsername(signupName, user.uid);
  const photo = user.photoURL || "";
  const now = new Date().toISOString();

  return {
    userId: userId,
    username: username,
    signupName: signupName,
    email: user.email || "",
    provider: getLoginProvider(user),
    avatar: photo || `https://i.pravatar.cc/150?u=${user.uid}`,
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
    createdAt: now,
    updatedAt: now,
    lastSeen: now
  };
}

/* ==================== LOGIN GOOGLE ==================== */
async function loginWithGoogle() {
  if (!auth) return false;
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await auth.signInWithPopup(provider);
    console.log("Google login:", result.user.uid);
    currentUser = result.user;
    await loadOrCreateUserProfile(result.user);
    showSuccessToast("Berhasil login, " + currentUserProfile.username + "!");
    return true;
  } catch (e) {
    console.error("Google login gagal:", e);
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
    console.error("Logout gagal:", e);
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
    console.error("Gagal set username:", e);
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
  const updates = {};
  if (currentUser.photoURL) updates.avatar = currentUser.photoURL;
  if (currentUser.email) updates.email = currentUser.email;
  if (Object.keys(updates).length === 0) { showToast("Tidak ada data dari Google"); return false; }
  try {
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { ...updates, updatedAt: new Date().toISOString() });
    Object.assign(currentUserProfile, updates);
    showSuccessToast("Data disinkron");
    return true;
  } catch (e) {
    showErrorToast("Gagal sinkron");
    return false;
  }
}
