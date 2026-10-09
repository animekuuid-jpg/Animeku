/* ==================== USER ID GENERATOR ==================== */
/* Bikin userId urut: #001, #002, #003, ... (pakai Firestore Transaction) */

const USER_ID_COUNTER_DOC = "user_id_counter";
const USER_ID_COUNTER_COLLECTION = "counters";

/* ==================== AMBIL USER ID BARU ==================== */
async function generateUserId() {
  if (!firebaseReady || !db) {
    console.error("❌ Firebase belum ready");
    return null;
  }
  
  try {
    const counterRef = db.collection(USER_ID_COUNTER_COLLECTION).doc(USER_ID_COUNTER_DOC);
    
    const newNumber = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let currentNumber = 0;
      
      if (counterDoc.exists) {
        currentNumber = counterDoc.data().current || 0;
      } else {
        const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();
        currentNumber = usersSnapshot.size;
      }
      
      const nextNumber = currentNumber + 1;
      
      transaction.set(counterRef, {
        current: nextNumber,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      return nextNumber;
    });
    
    const formatted = "#" + String(newNumber).padStart(3, "0");
    console.log("🎫 User ID baru:", formatted, "(nomor:", newNumber + ")");
    return formatted;
  } catch (e) {
    console.error("❌ Gagal generate userId:", e);
    return "#" + Date.now().toString().slice(-6);
  }
}

/* ==================== INIT COUNTER DARI USER LAMA ==================== */
async function initUserIdCounter() {
  if (!firebaseReady || !db) return false;
  
  try {
    const counterRef = db.collection(USER_ID_COUNTER_COLLECTION).doc(USER_ID_COUNTER_DOC);
    const counterDoc = await counterRef.get();
    
    if (counterDoc.exists) {
      console.log("✅ Counter udah ada:", counterDoc.data().current);
      return true;
    }
    
    const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();
    const count = usersSnapshot.size;
    
    await counterRef.set({
      current: count,
      updatedAt: new Date().toISOString(),
      note: "Auto-initialized from existing users"
    });
    
    console.log("🎫 Counter initialized:", count);
    return true;
  } catch (e) {
    console.error("❌ Gagal init counter:", e);
    return false;
  }
}