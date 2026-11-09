// ============================================================
// companion.js ― 相棒（レベルで進化）＋ レベルアップの宝箱 ＋ 図鑑
//   ・script.js の「あと」に読み込みます（index.html は、前回のまま）
//   ・script.js は1文字も変えなくてOK。updateHud / gainXp を、このファイルが「ひとまわり大きく」して動きます
//   ・保存データは state.comp（相棒・かけら・宝箱）に、まとめて入ります
// ============================================================
(function () {
  "use strict";

  // ---------- 設定（数字を変えると、速さや出やすさを変えられます） ----------
  const STAGE_LV = [1, 3, 8, 15, 25, 40];     // このレベルになると、次の姿に進化する
  const FORM_LABEL = ["ベビー", "ジュニア", "ミドル", "アダルト", "マスター", "レジェンド"];
  const STAGE_SAY = ["まだ小さな姿", "すこし成長した！", "力がついてきた", "立派になってきた", "堂々とした姿", "最強の姿！"];
  const AVG_XP = 12;          // 1問に正解したときの経験値の目安（「あと約◯問」の計算に使う）
  const NEAR_RATIO = 0.9;     // 経験値バーが、この割合をこえたら「あと少し！」
  const BOOST_MIN = 15;       // 経験値2倍券の長さ（分）
  const PITY_R = 10;          // この回数のあいだ、レア以上が出なければ、次は必ずレア以上
  const PITY_SR = 30;         // この回数のあいだ、スーパーレア以上が出なければ、次は必ずスーパーレア以上

  // レア度：w＝出やすさ、shard＝ダブったときにもらえる「かけら」、price＝かけらで交換するのに必要な数
  const RAR = {
    N:  { label: "ノーマル",     stars: "★",     w: 70, shard: 2,  price: 10 },
    R:  { label: "レア",         stars: "★★",    w: 22, shard: 6,  price: 25 },
    SR: { label: "スーパーレア", stars: "★★★",   w: 7,  shard: 15, price: 60 },
    L:  { label: "伝説",         stars: "★★★★",  w: 1,  shard: 40, price: 150 }
  };
  const RAR_ORDER = ["N", "R", "SR", "L"];

  // 相棒たち：forms ＝ 6段階の姿（絵文字）。names があれば、段階ごとの名前になる
  const COMPANIONS = [
    { id: "hiyoko", rar: "N", name: "ことりん", forms: ["🥚", "🐣", "🐥", "🐔", "🦅", "🐉"],
      names: ["ふしぎなたまご", "ピヨまる", "かしこピヨ", "ものしりコッコ", "はかせワシ", "ことだまドラゴン"] },
    { id: "tane",   rar: "N", name: "たねっこ",   forms: ["🌱", "🌿", "🍀", "🌻", "🌳", "🌸"] },
    { id: "sakana", rar: "N", name: "うみっこ",   forms: ["🐟", "🐠", "🐡", "🦈", "🐬", "🐳"] },
    { id: "hoshi",  rar: "N", name: "ほしのこ",   forms: ["⭐", "🌟", "💫", "✨", "🌠", "🌌"] },
    { id: "mushi",  rar: "N", name: "むしっこ",   forms: ["🐛", "🐌", "🐜", "🐝", "🐞", "🦋"] },
    { id: "kitsune", rar: "R", name: "きつねび",     forms: ["🦊", "🦊✨", "🦊💫", "🦊🔥", "🦊🌟", "🦊👑"] },
    { id: "yume",    rar: "R", name: "ゆめうま",     forms: ["🐴", "🐎", "🦄", "🦄✨", "🦄🌈", "🦄👑"] },
    { id: "fukuro",  rar: "R", name: "ふくろう博士", forms: ["🐦", "🦉", "🦉📚", "🦉🎓", "🦉✨", "🦉👑"] },
    { id: "pen",  rar: "SR", name: "こおりペンギン", forms: ["🐧", "🐧💧", "🐧🧊", "🐧💎", "🐧🌟", "🐧👑"] },
    { id: "tora", rar: "SR", name: "ほのおのとら",   forms: ["🐱", "🐯", "🐯🔥", "🐅", "🐅🔥", "🐅👑"] },
    { id: "niji", rar: "L",  name: "にじのりゅう",   forms: ["🥚✨", "🐍✨", "🐲✨", "🐉✨", "🐉🌈", "🐉👑"] }
  ];
  const BY = {};
  COMPANIONS.forEach((c) => { BY[c.id] = c; });

  // ---------- 見た目（CSS） ----------
  const css = document.createElement("style");
  css.textContent = `
#hud .bar.xp { height: 16px; position: relative; }
.comp-xp-label { position: absolute; left: 0; right: 0; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.7); pointer-events: none; white-space: nowrap; }
.comp-xp-label.near { color: #ffe27a; }
#xpFill.comp-near { box-shadow: 0 0 10px #ffcf3f; animation: compGlow 1s ease-in-out infinite; }
.comp-btn { font: inherit; font-size: 22px; line-height: 1; width: 36px; height: 36px; padding: 0; border-radius: 50%; cursor: pointer;
  color: #fff; background: rgba(255,255,255,.14); border: 2px solid rgba(255,255,255,.35); flex: none; white-space: nowrap; overflow: hidden; }
.comp-btn.sm, .comp-step .e.sm { font-size: 14px; }
.comp-btn:active { transform: scale(.92); }
.rar-R  { border-color: #6ea8ff !important; box-shadow: 0 0 8px #6ea8ff; }
.rar-SR { border-color: #ffcf3f !important; box-shadow: 0 0 10px #ffcf3f; }
.rar-L  { border-color: #ff7ad9 !important; animation: compRainbow 2.4s linear infinite; }
.comp-chest { position: fixed; left: 10px; bottom: calc(10px + env(safe-area-inset-bottom, 0px)); z-index: 35; display: none;
  font: inherit; font-size: 13px; font-weight: 800; color: #1a1033; background: #ffcf3f; border: 0; border-radius: 999px; padding: 8px 12px; cursor: pointer;
  animation: compBob 1.2s infinite; box-shadow: 0 0 12px rgba(255,207,63,.8); }
.comp-ov { position: fixed; inset: 0; z-index: 45; display: flex; align-items: center; justify-content: center; padding: 16px;
  background: rgba(10,5,25,.92); color: #fff; overflow: auto; }
.comp-box { width: 100%; max-width: 440px; margin: auto; text-align: center; display: flex; flex-direction: column; gap: 10px; align-items: center; }
.comp-title { font-size: 18px; font-weight: 800; }
.comp-big { font-size: 100px; line-height: 1.15; white-space: nowrap; }
.comp-big.long { font-size: 64px; }
.comp-big.shake { animation: compShake .35s linear infinite; filter: drop-shadow(0 0 18px #fff); }
.comp-big.pop { animation: compPop .7s ease-out; }
.comp-big.g-N  { filter: drop-shadow(0 0 22px #ffffff); }
.comp-big.g-R  { filter: drop-shadow(0 0 26px #6ea8ff); }
.comp-big.g-SR { filter: drop-shadow(0 0 30px #ffcf3f); }
.comp-big.g-L  { animation: compShake .3s linear infinite, compRainbowGlow 1s linear infinite; }
.comp-name { font-size: 20px; font-weight: 800; color: #ffcf3f; }
.comp-stars { font-size: 16px; letter-spacing: 2px; }
.comp-say { font-size: 14px; opacity: .85; }
.comp-line { font-size: 13px; opacity: .92; }
.comp-road, .comp-grid { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin: 4px 0; }
.comp-step, .comp-tile { width: 62px; padding: 6px 2px; border-radius: 12px; border: 2px solid rgba(255,255,255,.2); background: rgba(255,255,255,.06);
  color: #fff; font: inherit; text-align: center; }
.comp-tile { cursor: pointer; width: 70px; }
.comp-step.now, .comp-tile.sel { background: rgba(255,207,63,.18); outline: 2px solid #ffcf3f; }
.comp-step .e, .comp-tile .e { font-size: 26px; line-height: 1.2; white-space: nowrap; }
.comp-tile .e.sm { font-size: 17px; }
.comp-step .l, .comp-tile .l { font-size: 10px; opacity: .9; }
.comp-step.lock .e, .comp-tile.lock .e { filter: brightness(0) invert(1); opacity: .22; }
.comp-step.lock.next .e { opacity: .45; }
.comp-tile.r-R  { border-color: #6ea8ff; } .comp-tile.r-SR { border-color: #ffcf3f; } .comp-tile.r-L { border-color: #ff7ad9; }
.comp-close, .comp-sub { font: inherit; font-weight: 800; font-size: 16px; border: 0; border-radius: 14px; padding: 12px 26px; cursor: pointer; margin-top: 4px; }
.comp-close { color: #1a1033; background: #ffcf3f; }
.comp-sub { color: #fff; background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.3); font-size: 14px; padding: 10px 18px; }
.comp-sub:disabled { opacity: .45; cursor: default; }
.comp-tap { font-size: 12px; color: #ffcf3f; animation: compBob 1.2s infinite; }
.comp-new { color: #ff7ad9; font-weight: 800; }
.ui-wide .comp-ov .comp-box { zoom: var(--kf, 1); }
@keyframes compGlow { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.5); } }
@keyframes compShake { 0%,100% { transform: translateX(0) rotate(0); } 25% { transform: translateX(-6px) rotate(-4deg); } 75% { transform: translateX(6px) rotate(4deg); } }
@keyframes compPop { 0% { transform: scale(.2); opacity: 0; } 60% { transform: scale(1.35); opacity: 1; } 100% { transform: scale(1); } }
@keyframes compBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@keyframes compRainbow { 0% { border-color: #ff5470; box-shadow: 0 0 10px #ff5470; } 33% { border-color: #ffcf3f; box-shadow: 0 0 10px #ffcf3f; }
  66% { border-color: #3ddc84; box-shadow: 0 0 10px #3ddc84; } 100% { border-color: #6ea8ff; box-shadow: 0 0 10px #6ea8ff; } }
@keyframes compRainbowGlow { 0% { filter: drop-shadow(0 0 26px #ff5470); } 33% { filter: drop-shadow(0 0 26px #ffcf3f); }
  66% { filter: drop-shadow(0 0 26px #3ddc84); } 100% { filter: drop-shadow(0 0 26px #6ea8ff); } }
@media (prefers-reduced-motion: reduce) { #xpFill.comp-near, .comp-big.shake, .comp-big.pop, .comp-big.g-L, .comp-tap, .comp-chest, .rar-L { animation: none; } }`;
  (document.head || document.body).appendChild(css);

  // ---------- 保存データ（state.comp） ----------
  function num(v) { return (typeof v === "number" && isFinite(v) && v > 0) ? Math.floor(v) : 0; }
  function cleanComp(x) {                    // 壊れたデータや足りない項目を、きれいに直す
    x = (x && typeof x === "object") ? x : {};
    const owned = {};
    if (x.owned && typeof x.owned === "object") {
      Object.keys(x.owned).forEach((id) => { if (BY[id] && num(x.owned[id]) > 0) owned[id] = num(x.owned[id]); });
    }
    if (!owned.hiyoko) owned.hiyoko = 1;     // ことりん（最初の相棒）は、いつも持っている
    return {
      owned, active: (BY[x.active] && owned[x.active]) ? x.active : "hiyoko",
      shards: num(x.shards), pending: num(x.pending), pityR: num(x.pityR), pitySR: num(x.pitySR),
      boostUntil: num(x.boostUntil), gift: x.gift ? 1 : 0
    };
  }
  function C() {                              // いつでも、正しい state.comp を返す
    if (!state.comp || !state.comp.owned) state.comp = cleanComp(state.comp);
    return state.comp;
  }
  function ownedCount(c) { return Object.keys(c.owned).length; }
  function persist() { try { save(); } catch (e) { /* 保存できなくても遊べる */ } }

  // ---------- 計算 ----------
  function stageIndex(level) {
    let idx = 0;
    STAGE_LV.forEach((lv, k) => { if (level >= lv) idx = k; });
    return idx;
  }
  function questionsLeft() { return Math.max(1, Math.ceil((xpNeeded() - state.xp) / AVG_XP)); }
  function active() { return BY[C().active] || BY.hiyoko; }
  function formOf(comp, i) { return comp.forms[i]; }
  function nameOf(comp, i) { return comp.names ? comp.names[i] : `${comp.name}（${FORM_LABEL[i]}）`; }
  function isLong(s) { return Array.from(s).length >= 2; }
  function boostOn() { return C().boostUntil > Date.now(); }
  function div(cls, text) {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    if (text !== undefined) d.textContent = text;
    return d;
  }
  function button(cls, text, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.textContent = text;
    b.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
    return b;
  }

  // ---------- 宝箱の抽選 ----------
  function pickWeighted(list) {               // [[値, 重み], ...] から、重みに応じて1つ選ぶ
    const total = list.reduce((s, p) => s + p[1], 0);
    let r = Math.random() * total;
    for (let i = 0; i < list.length; i++) { r -= list[i][1]; if (r < 0) return list[i][0]; }
    return list[list.length - 1][0];
  }
  function rollRarity(c) {
    let rar;
    if (c.pitySR >= PITY_SR - 1) rar = pickWeighted([["SR", RAR.SR.w], ["L", RAR.L.w]]);                    // スーパーレア以上が確定
    else if (c.pityR >= PITY_R - 1) rar = pickWeighted([["R", RAR.R.w], ["SR", RAR.SR.w], ["L", RAR.L.w]]);  // レア以上が確定
    else rar = pickWeighted(RAR_ORDER.map((k) => [k, RAR[k].w]));
    const rank = RAR_ORDER.indexOf(rar);
    c.pityR = rank >= 1 ? 0 : c.pityR + 1;
    c.pitySR = rank >= 2 ? 0 : c.pitySR + 1;
    return rar;
  }
  function rollChest() {                      // 抽選して、結果をすぐ state に反映する（ハズレなし）
    const c = C();
    const rar = rollRarity(c);
    let kind = "comp";
    if (rar === "N") kind = pickWeighted([["comp", 45], ["boost", 30], ["shard", 25]]);
    else if (rar === "R") kind = pickWeighted([["comp", 70], ["ticket", 30]]);
    const res = { rar, kind };
    if (kind === "comp") {
      const pool = COMPANIONS.filter((x) => x.rar === rar);
      const fresh = pool.filter((x) => !c.owned[x.id]);
      const list = (fresh.length > 0 && Math.random() < 0.7) ? fresh : pool;   // まだ持っていない相棒が、出やすい
      const comp = list[Math.floor(Math.random() * list.length)];
      res.id = comp.id;
      if (c.owned[comp.id]) { res.dup = true; res.shards = RAR[rar].shard; c.shards += res.shards; c.owned[comp.id]++; }
      else { res.dup = false; c.owned[comp.id] = 1; }
    } else if (kind === "boost") {
      c.boostUntil = Math.max(Date.now(), c.boostUntil) + BOOST_MIN * 60000;
    } else if (kind === "ticket") {
      state.tickets = (state.tickets || 0) + 1;
    } else {                                  // かけら
      res.shards = 2; c.shards += 2;
    }
    return res;
  }

  // ---------- 画面の部品：HUD の相棒ボタン・経験値バーの文字・宝箱ボタン ----------
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

  const chestBtn = document.createElement("button");
  chestBtn.type = "button";
  chestBtn.className = "comp-chest";
  chestBtn.addEventListener("click", () => openChest());
  document.body.appendChild(chestBtn);

  // ---------- 大きな表示（紹介・進化・宝箱・図鑑） ----------
  let overlay = null;
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
    locked = false;
    return box;
  }
  function whenFree(fn) {                          // ほかの大きな表示が出ていたら、閉じるまで待つ
    if (!overlay) fn(); else setTimeout(() => whenFree(fn), 800);
  }
  function bigEmoji(text, extra) {
    return div("comp-big" + (isLong(text) ? " long" : "") + (extra ? " " + extra : ""), text);
  }
  function fire(n, notes) {
    try { confetti(n); beep(notes, 0.12); } catch (e) { /* 無視 */ }
  }

  // 相棒の紹介（HUD のボタンをタップ／はじめて来たとき）
  function showPanel(intro, gift) {
    const c = C(), comp = active(), lv = state.level, i = stageIndex(lv);
    const nextLv = STAGE_LV[i + 1];
    const box = openOverlay();
    box.appendChild(div("comp-title", intro ? "🎁 相棒がやってきた！" : "あなたの相棒"));
    box.appendChild(bigEmoji(formOf(comp, i)));
    box.appendChild(div("comp-name", nameOf(comp, i)));
    box.appendChild(div("comp-stars", RAR[comp.rar].stars + " " + RAR[comp.rar].label));
    box.appendChild(div("comp-say", STAGE_SAY[i]));
    box.appendChild(div("comp-line", `Lv.${lv}　進化 ${i + 1}/${STAGE_LV.length}`));
    box.appendChild(div("comp-line", nextLv ? `次の進化：Lv.${nextLv}（あと${nextLv - lv}レベル）` : "✨ 最終形態です！"));
    const road = div("comp-road");
    STAGE_LV.forEach((slv, k) => {
      const step = div("comp-step" + (k === i ? " now" : "") + (k > i ? " lock" : "") + (k === i + 1 ? " next" : ""));
      step.appendChild(div("e" + (isLong(formOf(comp, k)) ? " sm" : ""), formOf(comp, k)));
      step.appendChild(div("l", k > i ? `Lv.${slv}` : (comp.names ? comp.names[k] : FORM_LABEL[k])));
      road.appendChild(step);
    });
    box.appendChild(road);
    let stock = `🎁 宝箱 ${c.pending}個　💎 かけら ${c.shards}`;
    if (boostOn()) stock += `　⚡2倍 あと${Math.max(1, Math.ceil((c.boostUntil - Date.now()) / 60000))}分`;
    box.appendChild(div("comp-line", stock));
    if (gift) box.appendChild(div("comp-line", "🎁 はじめての宝箱をプレゼント！ 左下のボタンから開けてね"));
    else box.appendChild(div("comp-line", "レベルが上がるたびに、宝箱がもらえるよ"));
    if (c.pending > 0) box.appendChild(button("comp-sub", `🎁 宝箱を開ける（${c.pending}個）`, () => openChest()));
    box.appendChild(button("comp-sub", `📖 図鑑（${ownedCount(c)}/${COMPANIONS.length}）`, () => showDex(c.active)));
    box.appendChild(button("comp-close", intro ? "よろしくね！" : "とじる", closeOverlay));
  }

  // 進化の演出：「おや？」→ 光る → 新しい姿
  function showEvolution(fromIdx, toIdx) {
    const comp = active();
    const box = openOverlay();
    const mine = overlay;
    locked = true;
    const title = div("comp-title", "…おや？ 相棒の様子が…");
    let big = bigEmoji(formOf(comp, fromIdx), "shake");
    const name = div("comp-name", nameOf(comp, fromIdx));
    const say = div("comp-say", "");
    const tap = div("comp-tap", "");
    [title, big, name, say, tap].forEach((x) => box.appendChild(x));
    try { beep([392, 440, 494], 0.18); } catch (e) { /* 音は鳴らなくてよい */ }
    setTimeout(() => {
      if (overlay !== mine) return;
      title.textContent = "✨ 進化！";
      const nb = bigEmoji(formOf(comp, toIdx), "pop");
      box.replaceChild(nb, big);
      big = nb;
      name.textContent = nameOf(comp, toIdx);
      say.textContent = `${formOf(comp, fromIdx)} → ${formOf(comp, toIdx)}　進化した！`;
      tap.textContent = "タップして閉じる";
      locked = false;
      fire(120, [523, 659, 784, 1047, 1319]);
    }, 1500);
  }

  // ---------- 宝箱を開ける ----------
  function openChest() {
    const c = C();
    if (c.pending <= 0) { toast("宝箱がありません"); return; }
    c.pending--;
    const res = rollChest();                  // 先に結果を保存する（途中で閉じても、中身は消えない）
    persist();
    refresh();
    const box = openOverlay();
    const mine = overlay;
    locked = true;
    const title = div("comp-title", "🎁 宝箱を開けている…");
    const big = bigEmoji("🎁", "shake");
    const tap = div("comp-tap", "");
    box.appendChild(title); box.appendChild(big); box.appendChild(tap);
    try { beep([330, 392], 0.15); } catch (e) { /* 無視 */ }
    setTimeout(() => {                         // 中身が見える前に、レア度の色で光る（予感）
      if (overlay !== mine) return;
      big.className = "comp-big g-" + res.rar;
      title.textContent = res.rar === "N" ? "ぴかっ…！" : res.rar === "R" ? "青く光った…！" : res.rar === "SR" ? "金色に光った…！！" : "虹色に光った…！！！";
      try { beep(res.rar === "N" ? [440] : [440, 554, 659], 0.12); } catch (e) { /* 無視 */ }
    }, 1000);
    setTimeout(() => { if (overlay === mine) revealChest(res); }, 2300);
  }
  function revealChest(res) {
    const c = C();
    const box = openOverlay();
    const R = RAR[res.rar];
    box.appendChild(div("comp-title", res.kind === "comp" && !res.dup ? "🎉 新しい相棒！" : "🎁 宝箱の中身"));
    if (res.kind === "comp") {
      const comp = BY[res.id], i = stageIndex(state.level);
      box.appendChild(bigEmoji(formOf(comp, i), "pop g-" + res.rar));
      box.appendChild(div("comp-name", comp.name));
      box.appendChild(div("comp-stars", R.stars + " " + R.label));
      if (res.dup) box.appendChild(div("comp-line", `もう持っていた！ かけら 💎+${res.shards} になりました`));
      else box.appendChild(div("comp-new", "NEW！ 図鑑に登録しました"));
      if (!res.dup) box.appendChild(button("comp-sub", "この相棒を連れていく", () => { c.active = comp.id; persist(); refresh(); closeOverlay(); toast(`${comp.name} を連れていきます`); }));
    } else if (res.kind === "boost") {
      box.appendChild(bigEmoji("⚡"));
      box.appendChild(div("comp-name", `経験値2倍券（${BOOST_MIN}分）`));
      box.appendChild(div("comp-line", "いまから、もらえる経験値が2倍になります！"));
    } else if (res.kind === "ticket") {
      box.appendChild(bigEmoji("🎫"));
      box.appendChild(div("comp-name", "おやすみ券 +1"));
      box.appendChild(div("comp-stars", R.stars + " " + R.label));
      box.appendChild(div("comp-line", "連続記録を守る券です。メニューから使えます"));
    } else {
      box.appendChild(bigEmoji("💎"));
      box.appendChild(div("comp-name", `かけら +${res.shards}`));
      box.appendChild(div("comp-line", "ためると、図鑑で好きな相棒と交換できます"));
    }
    fire({ N: 25, R: 60, SR: 110, L: 200 }[res.rar], res.rar === "N" ? [523, 659] : [523, 659, 784, 1047, 1319]);
    if (c.pending > 0) box.appendChild(button("comp-sub", `🎁 つぎを開ける（残り${c.pending}個）`, () => openChest()));
    box.appendChild(button("comp-close", "とじる", closeOverlay));
  }

  // ---------- 図鑑 ----------
  function showDex(selId) {
    const c = C(), lv = state.level, i = stageIndex(lv);
    const sel = BY[selId] || BY[c.active];
    const box = openOverlay();
    box.appendChild(div("comp-title", `📖 図鑑　${ownedCount(c)}/${COMPANIONS.length}`));
    const grid = div("comp-grid");
    COMPANIONS.forEach((comp) => {
      const has = !!c.owned[comp.id];
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "comp-tile r-" + comp.rar + (has ? "" : " lock") + (comp.id === sel.id ? " sel" : "");
      tile.appendChild(div("e" + (isLong(formOf(comp, i)) ? " sm" : ""), formOf(comp, i)));
      tile.appendChild(div("l", has ? comp.name : "？？？"));
      tile.appendChild(div("l", RAR[comp.rar].stars));
      tile.addEventListener("click", (e) => { e.stopPropagation(); showDex(comp.id); });
      grid.appendChild(tile);
    });
    box.appendChild(grid);

    const has = !!c.owned[sel.id], R = RAR[sel.rar];
    box.appendChild(div("comp-name", has ? sel.name : "？？？"));
    box.appendChild(div("comp-stars", R.stars + " " + R.label));
    if (has) {
      box.appendChild(div("comp-line", `${nameOf(sel, i)}　持っている数 ${c.owned[sel.id]}`));
      if (c.active === sel.id) box.appendChild(div("comp-new", "✔ いま連れている相棒"));
      else box.appendChild(button("comp-sub", "この相棒を連れていく", () => { c.active = sel.id; persist(); refresh(); toast(`${sel.name} を連れていきます`); showDex(sel.id); }));
    } else {
      box.appendChild(div("comp-line", `まだ持っていません　交換：💎${R.price}（いま ${c.shards}）`));
      const ex = button("comp-sub", `💎${R.price} で交換する`, () => {
        if (c.shards < R.price) { toast("かけらが足りません"); return; }
        c.shards -= R.price; c.owned[sel.id] = 1; persist(); refresh();
        fire(80, [523, 659, 784, 1047]); toast(`🎉 ${sel.name} を手に入れた！`); showDex(sel.id);
      });
      if (c.shards < R.price) ex.disabled = true;
      box.appendChild(ex);
    }
    box.appendChild(div("comp-line", `💎 かけら ${c.shards}　／　宝箱 ${c.pending}個`));
    box.appendChild(div("comp-line", `出る割合：${RAR_ORDER.map((k) => `${RAR[k].label} ${RAR[k].w}％`).join("　")}`));
    box.appendChild(div("comp-line", `レア以上は、最大あと${Math.max(1, PITY_R - c.pityR)}回、スーパーレア以上は、最大あと${Math.max(1, PITY_SR - c.pitySR)}回で出ます`));
    box.appendChild(button("comp-close", "とじる", closeOverlay));
  }

  // ---------- 画面を最新にする（updateHud のたびに呼ばれる） ----------
  let evoBusy = false;       // 進化の演出の準備中は、二重に出さない
  let welcomed = false;      // はじめての宝箱のお知らせを、出したか
  function refresh() {
    const c = C(), comp = active();
    const lv = state.level, i = stageIndex(lv), form = formOf(comp, i);
    btn.textContent = form;
    btn.className = "comp-btn rar-" + comp.rar + (isLong(form) ? " sm" : "");
    btn.title = `${nameOf(comp, i)}（タップで見る）`;

    // 宝箱ボタン
    chestBtn.textContent = `🎁 宝箱 ×${c.pending}`;
    chestBtn.style.display = c.pending > 0 ? "block" : "none";

    // あと少しの表示
    const ratio = Math.min(1, state.xp / xpNeeded());
    const near = ratio >= NEAR_RATIO;
    const evoNext = i + 1 < STAGE_LV.length && lv + 1 >= STAGE_LV[i + 1];
    label.textContent = (near ? "🔥あと少し！" : `あと約${questionsLeft()}問`) + (evoNext ? " ✨進化" : "") + (boostOn() ? " ⚡2倍" : "");
    label.className = "comp-xp-label" + (near ? " near" : "");
    if (xpFill) xpFill.classList.toggle("comp-near", near);

    // はじめての宝箱（1回だけ）
    let gifted = false;
    if (!c.gift) { c.gift = 1; c.pending += 1; gifted = true; chestBtn.textContent = `🎁 宝箱 ×${c.pending}`; chestBtn.style.display = "block"; }

    // 進化したか調べる（state.compSeen ＝ 最後に見せた姿の番号）
    if (typeof state.compSeen !== "number") {                     // はじめて：相棒の紹介を出す
      state.compSeen = i;
      persist();
      setTimeout(() => whenFree(() => showPanel(true, true)), 900);
      welcomed = true;
    } else if (i < state.compSeen) {                              // 別の端末のデータで、レベルが下がったとき
      state.compSeen = i;
      persist();
    } else if (i > state.compSeen && !evoBusy) {
      const from = state.compSeen;
      state.compSeen = i;
      persist();
      evoBusy = true;
      setTimeout(() => { evoBusy = false; whenFree(() => showEvolution(from, i)); }, 900);   // レベルアップの演出のあとに出す
    }
    if (gifted) {
      persist();
      if (!welcomed) setTimeout(() => { try { toast("🎁 宝箱をプレゼント！ 左下から開けてね"); } catch (e) { /* 無視 */ } }, 1200);
      welcomed = true;
    }
  }

  // ---------- script.js を、大きくする ----------
  const baseGainXp = gainXp;                       // 経験値2倍券と、レベルアップの宝箱
  gainXp = function (amount) {
    const c = C();
    const before = state.level;
    baseGainXp(boostOn() ? amount * 2 : amount);
    const up = state.level - before;
    if (up > 0) {
      c.pending += up;                             // レベルが1上がるごとに、宝箱が1個
      setTimeout(() => { try { toast(`🎁 宝箱をゲット！（${C().pending}個）`); } catch (e) { /* 無視 */ } }, 1900);
    }
  };
  const baseUpdateHud = updateHud;
  updateHud = function () {
    baseUpdateHud();
    try { refresh(); } catch (e) { /* 相棒でエラーが出ても、ゲームは続ける */ }
  };
  // クラウドから読み込んだとき：相棒のデータは、数が多いほうを使う
  if (window.gameApi && typeof window.gameApi.applySave === "function") {
    const baseApply = window.gameApi.applySave;
    window.gameApi.applySave = function (s) {
      const keep = C();
      baseApply(s);
      if (s && s.comp && typeof s.comp === "object") {
        const cloud = cleanComp(s.comp);
        state.comp = (ownedCount(cloud) >= ownedCount(keep)) ? cloud : keep;
      } else state.comp = keep;
      try { refresh(); } catch (e) { /* 無視 */ }
    };
  }
  state.comp = cleanComp(state.comp);            // 起動したときに、保存データを一度きれいにする
  try { refresh(); } catch (e) { /* 無視 */ }    // 起動した直後の1回
})();
