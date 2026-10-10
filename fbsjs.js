/* ==================== FIREBASE INIT ==================== */

let db = null;
let auth = null;
let firebaseReady = false;

function initFirebase() {
  if (typeof firebase === "undefined") {
    console.error("❌ Firebase SDK belum ke-load");
    return false;
  }
  try {
    if (firebase.apps.length === 0) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.firestore();
    auth = firebase.auth();
    
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((e) => {
      console.warn("⚠️ Set persistence gagal:", e);
    });
    
    firebaseReady = true;
    console.log("✅ Firebase siap");
    return true;
  } catch (e) {
    console.error("❌ Firebase error:", e);
    firebaseReady = false;
    return false;
  }
}

/* ==================== FIRESTORE CRUD ==================== */

async function fbGetAll(collectionName) {
  if (!firebaseReady) {
    console.warn(`⚠️ Firebase not ready, skip ${collectionName}`);
    return [];
  }
  try {
    const snapshot = await db.collection(collectionName).limit(200).get();
    const data = [];
    snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
    console.log(`✅ ${collectionName}: ${data.length} docs`);
    return data;
  } catch (e) {
    console.warn(`⚠️ Gagal ambil ${collectionName}:`, e.message);
    return [];
  }
}

async function fbGetAllLimited(collectionName, limitCount = 20, orderField = null, orderDir = "desc") {
  if (!firebaseReady) return [];
  try {
    let q = db.collection(collectionName);
    if (orderField) q = q.orderBy(orderField, orderDir);
    if (limitCount) q = q.limit(limitCount);
    const snapshot = await q.get();
    const data = [];
    snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
    return data;
  } catch (e) {
    console.warn(`⚠️ Gagal ambil ${collectionName}:`, e.message);
    return [];
  }
}

async function fbGetOne(collectionName, docId) {
  if (!firebaseReady) return null;
  try {
    const doc = await db.collection(collectionName).doc(docId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  } catch (e) {
    console.warn(`⚠️ Gagal ambil ${collectionName}/${docId}:`, e.message);
    return null;
  }
}

async function fbQueryWhere(collectionName, field, op, value, limitCount = null) {
  if (!firebaseReady) return [];
  try {
    let q = db.collection(collectionName).where(field, op, value);
    if (limitCount) q = q.limit(limitCount);
    const snapshot = await q.get();
    const data = [];
    snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
    return data;
  } catch (e) {
    console.warn(`⚠️ Gagal query ${collectionName} (${field} ${op}):`, e.message);
    return [];
  }
}

async function fbAdd(collectionName, data) {
  if (!firebaseReady) return null;
  try {
    const ref = await db.collection(collectionName).add(data);
    return ref.id;
  } catch (e) {
    console.warn(`⚠️ Gagal tambah ke ${collectionName}:`, e.message);
    return null;
  }
}

async function fbSet(collectionName, docId, data, merge = false) {
  if (!firebaseReady) return false;
  try {
    await db.collection(collectionName).doc(docId).set(data, { merge });
    return true;
  } catch (e) {
    console.warn(`⚠️ Gagal set ${collectionName}/${docId}:`, e.message);
    return false;
  }
}

async function fbUpdate(collectionName, docId, data) {
  if (!firebaseReady) return false;
  try {
    await db.collection(collectionName).doc(docId).update(data);
    return true;
  } catch (e) {
    console.warn(`⚠️ Gagal update ${collectionName}/${docId}:`, e.message);
    return false;
  }
}

async function fbDelete(collectionName, docId) {
  if (!firebaseReady) return false;
  try {
    await db.collection(collectionName).doc(docId).delete();
    return true;
  } catch (e) {
    console.warn(`⚠️ Gagal hapus ${collectionName}/${docId}:`, e.message);
    return false;
  }
}

/* ==================== SUBCOLLECTION ==================== */

async function fbGetSubcollection(parentCol, parentDoc, subCol) {
  if (!firebaseReady) return [];
  try {
    const snapshot = await db.collection(parentCol).doc(parentDoc).collection(subCol).get();
    const data = [];
    snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
    data.sort((a, b) => {
      const na = Number(a.id);
      const nb = Number(b.id);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a.id).localeCompare(String(b.id));
    });
    return data;
  } catch (e) {
    console.warn(`⚠️ Gagal ambil ${parentCol}/${parentDoc}/${subCol}:`, e.message);
    return [];
  }
}

async function fbAddToSubcollection(parentCol, parentDoc, subCol, data) {
  if (!firebaseReady) return null;
  try {
    const ref = await db.collection(parentCol).doc(parentDoc).collection(subCol).add(data);
    return ref.id;
  } catch (e) {
    console.warn(`⚠️ Gagal tambah ke subcollection:`, e.message);
    return null;
  }
}

/* ==================== BATCH / SEED ==================== */

async function fbSeed(collectionName, dataArray, keyField = "id") {
  if (!firebaseReady) return false;
  try {
    const batch = db.batch();
    dataArray.forEach(item => {
      const key = String(item[keyField] || item.id || item.slug);
      const ref = db.collection(collectionName).doc(key);
      batch.set(ref, item, { merge: true });
    });
    await batch.commit();
    console.log(`✅ Seed ${collectionName}: ${dataArray.length} item`);
    return true;
  } catch (e) {
    console.warn(`⚠️ Gagal seed ${collectionName}:`, e.message);
    return false;
  }
}

/* ==================== INIT ==================== */
initFirebase();