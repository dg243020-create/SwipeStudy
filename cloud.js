// cloud.js — SwipeStudy のログイン＆セーブデータ同期（Firebase）
// index.html に <script type="module" src="cloud.js"></script> を追加して使います。
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
  collection, query, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ========== ここをFirebaseの設定値に書き換える ==========
const firebaseConfig = {
  apiKey: "AIzaSyBr9tCmLkbZjndUkIb9bxypnDY80oBla04",
  authDomain: "swipes-10446.firebaseapp.com",
  projectId: "swipes-10446",
  appId: "1:1088911275471:web:ba39697e4431938876ceba"
};
// =======================================================

const FIELDS = ["level", "xp", "totalDefeated", "bestCombo", "date", "bossesToday", "studied", "history", "yesterdayDone",
  "streak", "bestStreak", "lastGoalDate", "answeredToday", "answeredDate"];
const configured = !String(firebaseConfig.apiKey).startsWith("ここに");
const LOCAL_KEY = "swipeVocabRPG.v1";        // game.js の STORAGE_KEY と同じ
const LAST_UID_KEY = "swipeStudy.lastUid";     // この端末のデータが、どのアカウントのものか
const FRESH = { level: 1, xp: 0, totalDefeated: 0, bestCombo: 0, bossesToday: 0, studied: [], history: {}, yesterdayDone: "", streak: 0, bestStreak: 0, lastGoalDate: "", answeredToday: 0, answeredDate: "" };
const union = (a, b) => Array.from(new Set([...(a || []), ...(b || [])]));   // 記録した問題は、両方を合わせる
const maxStr = (a, b) => ((a || "") > (b || "") ? (a || "") : (b || ""));   // 新しい日付のほうを残す
// ストリークと、今日の目標は、新しいほうの記録を残す
function mergeDaily(a, b) {
  const t = new Date().toLocaleDateString("sv-SE");
  const la = a.lastGoalDate || "", lb = b.lastGoalDate || "";
  const win = la > lb ? a : lb > la ? b : ((a.streak || 0) >= (b.streak || 0) ? a : b);
  const answered = Math.max(a.answeredDate === t ? (a.answeredToday || 0) : 0, b.answeredDate === t ? (b.answeredToday || 0) : 0);
  return {
    streak: win.streak || 0,
    lastGoalDate: win.lastGoalDate || "",
    bestStreak: Math.max(a.bestStreak || 0, b.bestStreak || 0, win.streak || 0),
    answeredToday: answered,
    answeredDate: t
  };
}
// 「その日に勉強した問題」の記録は、日付ごとに、両方を合わせる
const unionHist = (a, b) => {
  const o = {};
  new Set([...Object.keys(a || {}), ...Object.keys(b || {})]).forEach((k) => { o[k] = union((a || {})[k], (b || {})[k]); });
  return o;
};

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

  // ---------- ランキング用のデータ（みんなに見える） ----------
  let nickname = null;   // ランキングに出す名前（未設定なら Googleの名前の最初の部分）
  let lastLb = "";       // 前回書き込んだ内容（変化がなければ、書き込まない）
  async function pushBoard() {
    try {
      const g = window.gameApi.getSave();
      const data = {
        name: nickname || shortName(),
        level: g.level || 1,
        xp: g.xp || 0,
        levelScore: (g.level || 1) * 1e6 + (g.xp || 0),   // レベル → 経験値の順に並べるための値
        totalDefeated: g.totalDefeated || 0,
        streak: g.streak || 0,                 // 連続日数（途切れているかは、表示するときに lastGoalDate で判定）
        bestStreak: g.bestStreak || 0,
        lastGoalDate: g.lastGoalDate || ""
      };
      const key = JSON.stringify(data);
      if (key === lastLb) return;
      await setDoc(doc(db, "leaderboard", user.uid), Object.assign({}, data, { updatedAt: serverTimestamp() }), { merge: true });
      lastLb = key;
    } catch (e) {
      console.warn("ランキングの更新に失敗", e);   // ランキングが失敗しても、セーブの同期は止めない
    }
  }

  async function push() {
    if (!user || !ready) return;
    try {
      const s = pick(window.gameApi.getSave());
      await setDoc(ref(), Object.assign(s, { updatedAt: serverTimestamp() }), { merge: true });
      await pushBoard();
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
      try {
        const lb = await getDoc(doc(db, "leaderboard", user.uid));
        nickname = (lb.exists() && lb.data().name) ? lb.data().name : null;
      } catch (e) { nickname = null; }
      lastLb = "";
      const local = window.gameApi.getSave();
      const lastUid = localStorage.getItem(LAST_UID_KEY);       // null ＝ ログインしたことのない端末
      const sameOwner = !lastUid || lastUid === user.uid;       // この端末のデータは、このアカウントのもの（またはゲスト）

      if (snap.exists()) {
        const cloud = snap.data();
        if (!sameOwner || score(cloud) > score(local)) {
          // 別のアカウントのデータが残っている場合、または、クラウドのほうが進んでいる場合 → クラウドのデータで再開
          cloud.bestCombo = sameOwner ? Math.max(cloud.bestCombo || 0, local.bestCombo || 0) : (cloud.bestCombo || 0);
          if (sameOwner) {
            cloud.studied = union(cloud.studied, local.studied);
            cloud.history = unionHist(cloud.history, local.history);
            cloud.yesterdayDone = maxStr(cloud.yesterdayDone, local.yesterdayDone);
            Object.assign(cloud, mergeDaily(cloud, local));
          }
          window.gameApi.applySave(pick(cloud));
          toastMsg("☁ セーブデータを読み込みました");
        } else {
          // この端末のほうが進んでいる（または同じ）→ そのまま、クラウドへ上書き
          window.gameApi.applySave({
            level: local.level, xp: local.xp, totalDefeated: local.totalDefeated,
            bestCombo: Math.max(cloud.bestCombo || 0, local.bestCombo || 0),
            date: local.date, bossesToday: local.bossesToday,
            studied: union(local.studied, cloud.studied),
            history: unionHist(local.history, cloud.history),
            yesterdayDone: maxStr(local.yesterdayDone, cloud.yesterdayDone),
            ...mergeDaily(local, cloud)
          });
        }
      } else if (!sameOwner) {
        // 初めてのアカウントなのに、端末には別のアカウントのデータが残っている → レベル1から
        window.gameApi.applySave(FRESH);
        toastMsg("☁ 新しいアカウントで、最初から始めます");
      }
      // （初めてのアカウントで、端末のデータがゲストのものなら、そのまま引き継ぐ）

      localStorage.setItem(LAST_UID_KEY, user.uid);
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
      const choice = prompt("番号を入力してください\n1：ログアウト\n2：このアカウントのデータをリセット（レベル1に戻す）\n3：ランキングの表示名を変える");
      if (choice === "1") {
        clearTimeout(timer);
        await push();                                   // 直前の状態を保存してから
        await signOut(auth);
        try { localStorage.removeItem(LOCAL_KEY); localStorage.removeItem(LAST_UID_KEY); } catch (e) {}
        location.reload();                              // 端末側はまっさらに戻す
      } else if (choice === "3") {
        const v = prompt("ランキングに表示する名前（12文字まで）\n※ほかのログイン中の人にも見えます", nickname || shortName());
        if (v !== null) {
          const nm = v.trim().slice(0, 12);
          if (nm) { nickname = nm; lastLb = ""; clearTimeout(timer); await push(); toastMsg("🏆 表示名を変更しました"); }
        }
      } else if (choice === "2") {
        if (confirm("このアカウントのレベルや記録を、すべて消してレベル1に戻します。よろしいですか？")) {
          window.gameApi.applySave(FRESH);
          await push();
          toastMsg("☁ リセットしました");
        }
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

  // ---------- ランキング画面 ----------
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;padding:16px;";
  const panel = document.createElement("div");
  panel.style.cssText = "background:#1b1433;color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:16px;width:100%;max-width:480px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;";
  const head = document.createElement("div");
  head.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:14px 16px 8px;font-weight:700;font-size:17px;";
  head.appendChild(document.createTextNode("🏆 ランキング"));
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "✕";
  closeBtn.style.cssText = "background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:4px 8px;";
  head.appendChild(closeBtn);
  const tabs = document.createElement("div");
  tabs.style.cssText = "display:flex;gap:8px;padding:0 16px 10px;";
  const list = document.createElement("div");
  list.style.cssText = "overflow:auto;padding:0 16px 16px;font-size:15px;";
  panel.appendChild(head); panel.appendChild(tabs); panel.appendChild(list);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const dayKey = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString("sv-SE"); };
  const TABS = [
    { key: "level", label: "レベル", field: "levelScore", fmt: (d) => "Lv." + d.level },
    { key: "boss", label: "ボス討伐数", field: "totalDefeated", fmt: (d) => (d.totalDefeated || 0) + "体" },
    {
      key: "streak", label: "連続日数", field: "streak", fetch: 100,
      fmt: (d) => "🔥" + d.streak + "日",
      // いま連続中の人だけ（昨日か今日、目標を達成している人）。途切れた人の古い記録は出さない
      valid: (d) => (d.streak || 0) > 0 && (d.lastGoalDate === dayKey(0) || d.lastGoalDate === dayKey(1))
    }
  ];
  const tabBtns = {};
  TABS.forEach((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = t.label;
    b.addEventListener("click", () => loadRanking(t));
    tabs.appendChild(b);
    tabBtns[t.key] = b;
  });
  function styleTabs(activeKey) {
    TABS.forEach((t) => {
      const on = t.key === activeKey;
      tabBtns[t.key].style.cssText = "flex:1;padding:8px;border-radius:10px;font-size:14px;cursor:pointer;color:#fff;border:1px solid rgba(255,255,255,.3);" +
        (on ? "background:#6b4bd6;font-weight:700;" : "background:rgba(255,255,255,.06);");
    });
  }

  async function loadRanking(tab) {
    styleTabs(tab.key);
    list.textContent = "読み込み中…";
    try {
      clearTimeout(timer);
      await push();                                       // 自分の最新の記録を、先に反映
      const snap = await getDocs(query(collection(db, "leaderboard"), orderBy(tab.field, "desc"), limit(tab.fetch || 50)));
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, data: d.data() }));
      const shown = (tab.valid ? rows.filter((x) => tab.valid(x.data)) : rows).slice(0, 50);
      list.textContent = "";
      if (shown.length === 0) { list.textContent = tab.valid ? "いま連続中の人は、まだいません。" : "まだ誰も登録されていません。"; return; }
      let rank = 0, prev = null, i = 0;
      shown.forEach((item) => {
        const data = item.data;
        i++;
        const val = data[tab.field];
        if (val !== prev) { rank = i; prev = val; }       // 同じ値なら、同じ順位
        const row = document.createElement("div");
        const mine = user && item.id === user.uid;
        row.style.cssText = "display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;margin-top:6px;" +
          (mine ? "background:rgba(255,207,63,.18);border:1px solid rgba(255,207,63,.5);" : "background:rgba(255,255,255,.05);");
        const r = document.createElement("div");
        r.style.cssText = "width:2.2em;text-align:center;font-weight:700;";
        r.textContent = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : String(rank);
        const n = document.createElement("div");
        n.style.cssText = "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        n.textContent = (data.name || "名無し") + (mine ? "（あなた）" : "");   // 名前は、textContentで入れる
        const v = document.createElement("div");
        v.style.cssText = "font-weight:700;";
        v.textContent = tab.fmt(data);
        row.appendChild(r); row.appendChild(n); row.appendChild(v);
        list.appendChild(row);
      });
      const note = document.createElement("div");
      note.style.cssText = "margin-top:12px;font-size:12px;opacity:.7;";
      note.textContent = tab.valid ? "いま連続中の人（昨日か今日、目標を達成した人）を表示します。上位50人まで。" : "上位50人まで表示します。";
      list.appendChild(note);
    } catch (e) {
      console.error(e);
      list.textContent = "読み込めませんでした。（" + (e.code || e.message) + "）";
    }
  }

  function openRanking() {
    if (!user) { alert("ランキングを見るには、ログインが必要です。"); return; }
    overlay.style.display = "flex";
    loadRanking(TABS[0]);
  }
  function closeRanking() { overlay.style.display = "none"; }
  window.openRanking = openRanking;           // スタートメニューの「ランキング」から開く
  closeBtn.addEventListener("click", closeRanking);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeRanking(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeRanking(); });
}
