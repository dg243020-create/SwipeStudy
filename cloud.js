// cloud.js — SwipeStudy のログイン＆セーブデータ同期（Firebase）
// index.html に <script type="module" src="cloud.js"></script> を追加して使います。
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ========== ここをFirebaseの設定値に書き換える ==========
const firebaseConfig = {
  apiKey: "AIzaSyBr9tCmLkbZjndUkIb9bxypnDY80oBla04",
  authDomain: "swipes-10446.firebaseapp.com",
  projectId: "swipes-10446",
  appId: "1:1088911275471:web:ba39697e4431938876ceba"
};
// =======================================================

const FIELDS = ["level", "xp", "totalDefeated", "bestCombo", "date", "bossesToday"];
const configured = !String(firebaseConfig.apiKey).startsWith("ここに");

// ---------- 画面（右下の小さなボタン） ----------
const btn = document.createElement("button");
btn.type = "button";
btn.style.cssText = [
  "position:fixed", "left:10px", "bottom:calc(10px + env(safe-area-inset-bottom, 0px))",
  "z-index:50", "padding:8px 12px", "border-radius:999px", "border:1px solid rgba(255,255,255,.35)",
  "background:rgba(20,20,30,.85)", "color:#fff", "font-size:13px", "cursor:pointer",
  "max-width:70vw", "overflow:hidden", "text-overflow:ellipsis", "white-space:nowrap"
].join(";");
document.body.appendChild(btn);
function setStatus(text) { btn.textContent = text; }
setStatus("☁ ログイン");

function toastMsg(msg) {
  // ゲーム側のtoast関数があれば使う（なければ何もしない）
  try { if (typeof toast === "function") toast(msg); } catch (e) { /* 無視 */ }
}

// ---------- ユーティリティ ----------
function pick(s) {
  const o = {};
  FIELDS.forEach((k) => { if (s[k] !== undefined) o[k] = s[k]; });
  return o;
}
// 進み具合の比較（レベル → 経験値の順）
function score(s) { return (s.level || 1) * 1e6 + (s.xp || 0); }

if (!configured) {
  btn.addEventListener("click", () => {
    alert("cloud.js の firebaseConfig に、Firebaseの設定値を入れてください。");
  });
  setStatus("☁ 未設定");
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  let user = null;
  let ready = false;          // 最初の同期が終わるまでは、クラウドへ書き込まない
  let timer = null;

  const ref = () => doc(db, "users", user.uid);

  async function push() {
    if (!user || !ready) return;
    try {
      const s = pick(window.gameApi.getSave());
      await setDoc(ref(), Object.assign(s, { updatedAt: serverTimestamp() }), { merge: true });
      setStatus("☁ " + shortName() + "（同期済み）");
    } catch (e) {
      console.error(e);
      setStatus("☁ 同期エラー");
    }
  }
  function schedulePush() {
    clearTimeout(timer);
    timer = setTimeout(push, 1500);
  }
  function shortName() {
    return (user.displayName || user.email || "ログイン中").split(" ")[0];
  }

  // ゲームが保存するたびに呼ばれる
  window.onGameSaved = () => { if (user && ready) schedulePush(); };
  // タブを閉じる/切り替える直前にも保存
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { clearTimeout(timer); push(); }
  });

  async function firstSync() {
    ready = false;
    setStatus("☁ 同期中…");
    try {
      const snap = await getDoc(ref());
      const local = window.gameApi.getSave();
      if (snap.exists()) {
        const cloud = snap.data();
        if (score(cloud) > score(local)) {
          // クラウドのほうが進んでいる → クラウドのデータで続きから
          cloud.bestCombo = Math.max(cloud.bestCombo || 0, local.bestCombo || 0);
          window.gameApi.applySave(pick(cloud));
          toastMsg("☁ セーブデータを読み込みました");
        } else {
          // この端末のほうが進んでいる（または同じ）→ クラウドへ上書き
          window.gameApi.applySave({
            level: local.level, xp: local.xp, totalDefeated: local.totalDefeated,
            bestCombo: Math.max(cloud.bestCombo || 0, local.bestCombo || 0),
            date: local.date, bossesToday: local.bossesToday
          });
        }
      }
      ready = true;
      await push();
    } catch (e) {
      console.error(e);
      setStatus("☁ 同期エラー");
    }
  }

  onAuthStateChanged(auth, (u) => {
    user = u;
    if (u) { firstSync(); } else { ready = false; setStatus("☁ ログイン"); }
  });

  btn.addEventListener("click", async () => {
    if (user) {
      if (confirm("ログアウトしますか？\n（この端末のデータはそのまま残ります）")) {
        await signOut(auth);
      }
      return;
    }
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      console.error(e);
      if (e && e.code !== "auth/popup-closed-by-user") {
        alert("ログインできませんでした。\n" + (e.code || e.message));
      }
    }
  });
}
