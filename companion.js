// ============================================================
// companion.js ― 相棒（たまご → ドラゴン）。レベルが上がると進化する。
//   ・script.js の「あと」に読み込みます（index.html に1行足してあります）
//   ・script.js は1文字も変えなくてOK。このファイルが、script.js の updateHud を「ひとまわり大きく」して動きます
//   ・相棒の姿は「いまのレベル」だけで決まるので、新しい保存データはほぼ不要です
// ============================================================
(function () {
  "use strict";

  // ---------- 設定（数字を変えると、進化の速さを変えられます） ----------
  // lv：このレベルになると、この姿に進化する
  const STAGES = [
    { lv: 1,  emoji: "🥚", name: "ふしぎなたまご",   say: "何かが生まれそう…" },
    { lv: 3,  emoji: "🐣", name: "ピヨまる",         say: "たまごから生まれた！" },
    { lv: 8,  emoji: "🐥", name: "かしこピヨ",       say: "少しずつ言葉を覚えてきた" },
    { lv: 15, emoji: "🐔", name: "ものしりコッコ",   say: "いろんなことを知っている" },
    { lv: 25, emoji: "🦅", name: "はかせワシ",       say: "高いところから知識を見渡す" },
    { lv: 40, emoji: "🐉", name: "ことだまドラゴン", say: "伝説の相棒。すべての言葉を操る" }
  ];
  const AVG_XP = 12;        // 1問に正解したときの、経験値の目安（10〜20）。「あと約◯問」の計算に使う
  const NEAR_RATIO = 0.9;   // 経験値バーが、この割合をこえたら「あと少し！」になる

  // ---------- 見た目（CSS） ----------
  const css = document.createElement("style");
  css.textContent = `
#hud .bar.xp { height: 16px; position: relative; }
.comp-xp-label { position: absolute; left: 0; right: 0; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.7); pointer-events: none; white-space: nowrap; }
.comp-xp-label.near { color: #ffe27a; }
#xpFill.comp-near { box-shadow: 0 0 10px #ffcf3f; animation: compGlow 1s ease-in-out infinite; }
.comp-btn { font: inherit; font-size: 22px; line-height: 1; width: 36px; height: 36px; padding: 0; border-radius: 50%; cursor: pointer;
  color: #fff; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.35); flex: none; }
.comp-btn:active { transform: scale(.92); }
.comp-ov { position: fixed; inset: 0; z-index: 45; display: flex; align-items: center; justify-content: center; padding: 16px;
  background: rgba(10,5,25,.9); color: #fff; }
.comp-box { width: 100%; max-width: 420px; text-align: center; display: flex; flex-direction: column; gap: 10px; align-items: center; }
.comp-title { font-size: 18px; font-weight: 800; }
.comp-big { font-size: 110px; line-height: 1.1; }
.comp-big.shake { animation: compShake .35s linear infinite; filter: drop-shadow(0 0 18px #fff); }
.comp-big.pop { animation: compPop .7s ease-out; }
.comp-name { font-size: 20px; font-weight: 800; color: #ffcf3f; }
.comp-say { font-size: 14px; opacity: .85; }
.comp-line { font-size: 13px; opacity: .9; }
.comp-road { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin: 4px 0; }
.comp-step { width: 58px; padding: 6px 2px; border-radius: 12px; border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.06); }
.comp-step.now { border: 2px solid #ffcf3f; background: rgba(255,207,63,.16); }
.comp-step .e { font-size: 26px; line-height: 1.2; }
.comp-step .l { font-size: 10px; opacity: .85; }
.comp-step.lock .e { filter: brightness(0) invert(1); opacity: .22; }
.comp-step.lock.next .e { opacity: .45; }
.comp-close { font: inherit; font-weight: 800; font-size: 16px; color: #1a1033; background: #ffcf3f; border: 0; border-radius: 14px; padding: 12px 26px; cursor: pointer; margin-top: 6px; }
.comp-tap { font-size: 12px; color: #ffcf3f; animation: compBob 1.2s infinite; }
.ui-wide .comp-ov .comp-box { zoom: var(--kf, 1); }
@keyframes compGlow { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.5); } }
@keyframes compShake { 0%,100% { transform: translateX(0) rotate(0); } 25% { transform: translateX(-6px) rotate(-4deg); } 75% { transform: translateX(6px) rotate(4deg); } }
@keyframes compPop { 0% { transform: scale(.2); opacity: 0; } 60% { transform: scale(1.35); opacity: 1; } 100% { transform: scale(1); } }
@keyframes compBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@media (prefers-reduced-motion: reduce) { #xpFill.comp-near, .comp-big.shake, .comp-big.pop, .comp-tap { animation: none; } }`;
  (document.head || document.body).appendChild(css);

  // ---------- 計算 ----------
  function stageIndex(level) {               // いまのレベルで、何番目の姿か
    let idx = 0;
    STAGES.forEach((s, k) => { if (level >= s.lv) idx = k; });
    return idx;
  }
  function questionsLeft() {                 // レベルアップまで、あと何問くらいか
    return Math.max(1, Math.ceil((xpNeeded() - state.xp) / AVG_XP));
  }
  function div(cls, text) {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    if (text !== undefined) d.textContent = text;
    return d;
  }

  // ---------- 画面の部品：HUD の相棒ボタン と、経験値バーの文字 ----------
  const btn = document.createElement("button");
  btn.id = "compBtn";
  btn.type = "button";
  btn.className = "comp-btn";
  btn.setAttribute("aria-label", "相棒を見る");
  const player = document.querySelector("#hud .player");
  const levelEl = document.getElementById("level");
  if (player && levelEl) player.insertBefore(btn, levelEl);
  btn.addEventListener("click", () => showPanel(false));

  const label = div("comp-xp-label", "");
  const xpFill = document.getElementById("xpFill");
  if (xpFill && xpFill.parentNode) xpFill.parentNode.appendChild(label);

  // ---------- 大きな表示（相棒の紹介・進化） ----------
  let overlay = null;        // いま出ている大きな表示
  let locked = false;        // true のあいだは、タップで閉じられない
  let savedFxZ = "";
  function closeOverlay() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    const fx = document.getElementById("fx");
    if (fx) fx.style.zIndex = savedFxZ;
  }
  function openOverlay() {
    closeOverlay();
    overlay = div("comp-ov");
    const box = div("comp-box");
    overlay.appendChild(box);
    overlay.addEventListener("click", () => { if (!locked) closeOverlay(); });
    document.body.appendChild(overlay);
    const fx = document.getElementById("fx");      // 紙ふぶきが、大きな表示の上に出るようにする
    if (fx) { savedFxZ = fx.style.zIndex || ""; fx.style.zIndex = "50"; }
    return box;
  }
  function closeBtn(text) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "comp-close";
    b.textContent = text || "とじる";
    b.addEventListener("click", (e) => { e.stopPropagation(); closeOverlay(); });
    return b;
  }

  // 相棒の紹介（HUD のボタンをタップ／はじめて来たとき）
  function showPanel(intro) {
    locked = false;
    const lv = state.level, i = stageIndex(lv), st = STAGES[i], next = STAGES[i + 1];
    const box = openOverlay();
    box.appendChild(div("comp-title", intro ? "🎁 相棒がやってきた！" : "あなたの相棒"));
    box.appendChild(div("comp-big", st.emoji));
    box.appendChild(div("comp-name", st.name));
    box.appendChild(div("comp-say", st.say));
    box.appendChild(div("comp-line", `Lv.${lv}　進化 ${i + 1}/${STAGES.length}`));
    box.appendChild(div("comp-line", next ? `次の進化：Lv.${next.lv}（あと${next.lv - lv}レベル）` : "✨ 最終形態です！"));
    const road = div("comp-road");
    STAGES.forEach((s, k) => {
      const step = div("comp-step" + (k === i ? " now" : "") + (k > i ? " lock" : "") + (k === i + 1 ? " next" : ""));
      step.appendChild(div("e", s.emoji));
      step.appendChild(div("l", k > i ? `Lv.${s.lv}` : s.name));
      road.appendChild(step);
    });
    box.appendChild(road);
    box.appendChild(div("comp-line", "レベルを上げると、相棒が進化するよ。たくさん解いて育てよう！"));
    box.appendChild(closeBtn(intro ? "よろしくね！" : "とじる"));
  }

  // 進化の演出：「おや？」→ 光る → 新しい姿
  function showEvolution(fromIdx, toIdx) {
    const from = STAGES[fromIdx], to = STAGES[toIdx];
    locked = true;
    const box = openOverlay();
    const mine = overlay;
    const title = div("comp-title", "…おや？ 相棒の様子が…");
    const big = div("comp-big shake", from.emoji);
    const name = div("comp-name", from.name);
    const say = div("comp-say", "");
    const tap = div("comp-tap", "");
    box.appendChild(title); box.appendChild(big); box.appendChild(name); box.appendChild(say); box.appendChild(tap);
    try { beep([392, 440, 494], 0.18); } catch (e) { /* 音は鳴らなくてよい */ }
    setTimeout(() => {
      if (overlay !== mine) return;              // 途中で閉じられたら、何もしない
      title.textContent = "✨ 進化！";
      big.className = "comp-big pop";
      big.textContent = to.emoji;
      name.textContent = to.name;
      say.textContent = `${from.name} は ${to.name} に進化した！`;
      tap.textContent = "タップして閉じる";
      locked = false;
      try { confetti(120); beep([523, 659, 784, 1047, 1319], 0.12); } catch (e) { /* 無視 */ }
    }, 1500);
  }

  // ---------- 画面を最新にする（updateHud のたびに呼ばれる） ----------
  let evoBusy = false;       // 進化の演出の準備中は、二重に出さない
  function refresh() {
    const lv = state.level, i = stageIndex(lv), st = STAGES[i], next = STAGES[i + 1];
    btn.textContent = st.emoji;
    btn.title = `${st.name}（タップで見る）`;

    // あと少しの表示（案2）
    const ratio = Math.min(1, state.xp / xpNeeded());
    const near = ratio >= NEAR_RATIO;
    const evoNext = !!next && lv + 1 >= next.lv;
    label.textContent = (near ? "🔥あと少し！" : `あと約${questionsLeft()}問`) + (evoNext ? " ✨進化" : "");
    label.className = "comp-xp-label" + (near ? " near" : "");
    if (xpFill) xpFill.classList.toggle("comp-near", near);

    // 進化したか調べる（state.compSeen ＝ 最後に見せた姿の番号）
    if (typeof state.compSeen !== "number") {                     // はじめて：相棒の紹介を出す
      state.compSeen = i;
      persist();
      setTimeout(() => { if (!overlay) showPanel(true); }, 900);
    } else if (i < state.compSeen) {                              // 別の端末のデータで、レベルが下がったとき
      state.compSeen = i;
      persist();
    } else if (i > state.compSeen && !evoBusy) {
      const from = state.compSeen;
      state.compSeen = i;
      persist();
      evoBusy = true;
      setTimeout(() => { evoBusy = false; showEvolution(from, i); }, 900);   // レベルアップの演出のあとに出す
    }
  }
  function persist() {
    try { save(); } catch (e) { /* 保存できなくても遊べる */ }
  }

  // ---------- script.js の updateHud を、大きくする ----------
  const baseUpdateHud = updateHud;
  updateHud = function () {
    baseUpdateHud();
    try { refresh(); } catch (e) { /* 相棒でエラーが出ても、ゲームは続ける */ }
  };
  try { refresh(); } catch (e) { /* 無視 */ }   // 起動した直後の1回
})();
