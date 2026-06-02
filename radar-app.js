/* ============================================================
   Aktieguld Radar — app (tabel + foldbare analyser)
   ============================================================ */
(function () {
  const DATA = window.AKTIEGULD;
  const $ = (s, r = document) => r.querySelector(s);
  const PCOLS = 9;

  const VERDICT = {
    buy:   { label: "Guldkorn", rank: 3, cls: "buy" },
    wait:  { label: "Afvent",   rank: 2, cls: "wait" },
    avoid: { label: "Fravælg",  rank: 1, cls: "avoid" }
  };

  const TIPS = {
    pe: "P/E: kursen delt med indtjening pr. aktie. Lav P/E = du betaler mindre for hver krones overskud.",
    roe: "Egenkapitalforrentning: hvor godt selskabet forrenter aktionærernes penge. Højere er bedre.",
    payout: "Udbytteandel: hvor stor en del af overskuddet der deles ud som udbytte.",
    margin: "Overskudsgrad: hvor stor en del af omsætningen der ender som overskud.",
    debt: "Gæld i forhold til egenkapital. Højere tal = mere gearet selskab.",
    beta: "Beta: hvor meget aktien svinger ift. markedet. Under 1 = roligere end markedet.",
    revg: "Omsætningsvækst seneste år."
  };

  const num = (n, dec = 1) => Number(n).toLocaleString("da-DK", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const pct = (n) => (n >= 0 ? "+" : "") + num(n) + "%";
  const esc = (s) => String(s).replace(/[&<>\"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const parseNum = (s) => parseFloat(String(s).replace(/\./g, "").replace(",", ".")) || 0;

  function tip(text) {
    return `<span class="tip"><span class="q">?</span><span class="tipbox">${esc(text)}</span></span>`;
  }

  /* ---------- coin stack (0-7) ---------- */
  function coins(value) {
    const floor = Math.floor(value), frac = value - floor;
    let h = "";
    for (let i = 0; i < 7; i++) {
      if (i < floor) h += `<div class="coin full"></div>`;
      else if (i === floor && frac > 0.04) h += `<div class="coin part" style="--frac:${(frac * 100).toFixed(0)}%"></div>`;
      else h += `<div class="coin"></div>`;
    }
    return `<div class="coinstack">${h}</div>`;
  }
  function miniCoins(value) {
    const floor = Math.floor(value), frac = value - floor;
    let h = "";
    for (let i = 0; i < 7; i++) {
      if (i < floor) h += `<i class="mc full"></i>`;
      else if (i === floor && frac >= 0.25) h += `<i class="mc half"></i>`;
      else h += `<i class="mc"></i>`;
    }
    return `<span class="mini-coins">${h}</span>`;
  }

  /* ---------- detail builders ---------- */
  function scoreBlock(s) {
    const v = VERDICT[s.score.verdict];
    const crit = `<ul class="crit">${s.score.criteria.map(c => `
      <li><span>${esc(c.name)}</span><span class="cval">${num(c.value, 1)}</span>
      <span class="ctrack"><span class="cfill" style="width:${c.value * 100}%"></span></span></li>`).join("")}</ul>`;
    return `<div class="coinwrap">${coins(s.score.value)}
      <div class="coin-score"><div class="big">${num(s.score.value, 1)}<small>/7</small></div>
      <div class="vlabel ${v.cls}">${v.label} · kvalitet</div></div></div>${crit}`;
  }
  function metricsBlock(s) {
    const m = s.metrics;
    const cell = (k, val, tp) => `<div class="metric"><div class="mk">${k}${tp ? tip(tp) : ""}</div><div class="mv">${val}</div></div>`;
    const peCell = `<div class="metric"><div class="mk">P/E ${tip(TIPS.pe)}</div>
      <div class="mv">${m.pe} <span class="pe-pill ${m.peVerdict.kind}">${m.peVerdict.kind === "good" ? "Fair" : "Dyr"}</span></div></div>`;
    const range = `<div class="metric span2"><div class="mk">52-ugers interval · <span style="color:var(--gold-ink)">${m.rangePct}% fra bunden</span></div>
      <div class="rangebar"><div class="track"><div class="mark" style="left:${Math.max(4, Math.min(96, m.rangePct))}%"></div></div>
      <div class="ends"><span>${m.low52}</span><span>${m.high52}</span></div></div></div>`;
    return `<div class="metrics">${peCell}
      ${cell("Market Cap", m.marketCap)}${cell("EPS", m.eps)}
      ${cell("Udbytteandel", m.payout, TIPS.payout)}${cell("Omsætningsvækst", m.revGrowth, TIPS.revg)}
      ${cell("Overskudsgrad", m.margin, TIPS.margin)}${cell("ROE", m.roe, TIPS.roe)}
      ${cell("Gæld/egenkapital", m.debtEquity, TIPS.debt)}${cell("Beta", m.beta, TIPS.beta)}
      ${range}</div>`;
  }
  function expectedBlock(s) {
    const e = s.expected, neg = e.total < 0;
    let bar;
    if (neg) bar = `<div class="exp-bar"><div class="exp-seg neg" style="flex:1">${pct(e.total)} forventet</div></div>`;
    else {
      const g = Math.max(e.growth, 0), d = Math.max(e.dividend, 0);
      bar = `<div class="exp-bar">
        <div class="exp-seg growth" style="flex:${g}">${g >= 8 ? "Vækst " + num(e.growth) + "%" : ""}</div>
        <div class="exp-seg div" style="flex:${d}">${d >= 6 ? "Udb. " + num(e.dividend) + "%" : ""}</div></div>`;
    }
    return `<div class="expret">${bar}<div class="exp-rows">
      <div class="er"><span class="el">Forventet vækst</span><span class="ev">${pct(e.growth)}</span></div>
      <div class="er"><span class="el">Udbytte</span><span class="ev">${num(e.dividend)}%</span></div>
      <div class="er exp-total ${neg ? "negv" : ""}" style="text-align:right"><span class="el">Forventet årligt afkast</span><span class="ev">${pct(e.total)}</span></div>
    </div></div>`;
  }
  function boldFirst(text) {
    const i = text.indexOf(".");
    if (i > 0 && i < 72) return `<b>${esc(text.slice(0, i + 1))}</b>${esc(text.slice(i + 1))}`;
    return esc(text);
  }
  function technicalBlock(s) {
    const t = s.technical, items = [];
    items.push({ ic: t.trend === "up" ? "up" : "down", sym: t.trend === "up" ? "▲" : "▼", text: t.trendText });
    if (t.cross) items.push({ ic: "cross", sym: "✚", text: t.cross });
    if (t.smaText) items.push({ ic: t.trend === "up" ? "up" : "down", sym: "∿", text: t.smaText });
    items.push({ ic: "rsi", sym: "R", text: t.rsiText });
    items.push({ ic: "range", sym: "↔", text: t.rangeText });
    const list = `<div class="techlist">${items.map(it => `<div class="techitem"><span class="ti-ic ${it.ic}">${it.sym}</span><span>${boldFirst(it.text)}</span></div>`).join("")}</div>`;
    const chips = `<div class="techchips">
      <span class="tchip">SMA 50 <b>${t.sma50}</b></span><span class="tchip">SMA 200 <b>${t.sma200}</b></span>
      <span class="tchip">RSI <b>${t.rsi}</b></span><span class="tchip">Støtte <b>${t.support}</b></span>
      <span class="tchip">Modstand <b>${t.resistance}</b></span></div>`;
    return list + chips;
  }

  /* ---------- News with optional links ---------- */
  function newsBlock(s) {
    const n = s.news;
    if (!n.items || !n.items.length) return `<div class="news-empty">Ingen nyheder denne uge — guldet hviler i ro.</div>`;
    const src = n.source ? `<div class="news-src"><span class="flag"></span>${esc(n.source)}</div>` : "";
    return src + n.items.map(it => {
      const time = esc(it.time);
      const text = esc(it.text);
      if (it.url) {
        return `<div class="newsitem"><span class="nt">${time}</span><a href="${esc(it.url)}" target="_blank" rel="noopener" style="color:var(--text);text-decoration:none">${text} ↗</a></div>`;
      }
      return `<div class="newsitem"><span class="nt">${time}</span><span>${text}</span></div>`;
    }).join("");
  }

  /* ---------- Sparkline chart ---------- */
  function chartBlock(s) {
    const h = s.history;
    if (!h || h.length < 2) return `<div class="news-empty">Ikke nok data til kursgraf.</div>`;
    const prices = h.map(p => p.p);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const w = 600, hh = 180;
    const xStep = h.length > 1 ? w / (h.length - 1) : w;
    const pts = prices.map((p, i) => `${i * xStep},${hh - ((p - min) / range) * (hh - 20) - 10}`).join(" ");
    const last = prices[prices.length - 1];
    const first = prices[0];
    const chg = ((last - first) / first) * 100;
    const color = chg >= 0 ? "var(--pos)" : "var(--neg)";
    return `<div class="chart-wrap">
      <svg viewBox="0 0 ${w} ${hh}" class="sparkline" preserveAspectRatio="none" style="width:100%;height:100%">
        <polyline fill="none" stroke="${color}" stroke-width="2" points="${pts}" />
        <circle cx="${(h.length - 1) * xStep}" cy="${hh - ((last - min) / range) * (hh - 20) - 10}" r="4" fill="${color}" />
      </svg>
      <div class="chart-meta">
        <span>12 uger: ${num(first, 0)} → ${num(last, 0)}</span>
        <span style="color:${color}">${pct(chg)}</span>
      </div>
    </div>`;
  }

  function panel(phase, title, body) {
    const tag = phase ? `<span class="phasetag">FASE ${phase}</span>` : "";
    return `<section class="panel"><div class="panel-head">${tag}<span class="sectitle">${title}</span></div><div class="panel-body">${body}</div></section>`;
  }
  function detailHTML(s) {
    return `<div class="detail-grid">
      ${panel(1, "Nøgletal", metricsBlock(s))}
      ${panel(3, "Kvalitativ score", scoreBlock(s))}
      ${panel(2, "Forventet afkast", expectedBlock(s))}
      ${panel(4, "Teknisk analyse", technicalBlock(s))}
      ${panel(null, "Kursudvikling (12 uger)", chartBlock(s))}
      ${panel(null, "Ugentlige nyheder", newsBlock(s))}
    </div>`;
  }

  /* ---------- row ---------- */
  function chgInline(v) {
    const up = v >= 0;
    return `<span class="cell-chg ${up ? "up" : "down"}"><span class="tri ${up ? "u" : "d"}"></span>${pct(v)}</span>`;
  }
  function rowHTML(s, idx) {
    const v = VERDICT[s.score.verdict];
    const retCls = s.expected.total >= 0 ? "pos" : "neg";
    return `<tr class="srow v-${s.score.verdict}" data-idx="${idx}" tabindex="0" role="button" aria-expanded="false">
      <td class="c-caret"><span class="caret">›</span></td>
      <td class="c-name"><span class="rn">${esc(s.name)}</span><span class="rt">${esc(s.ticker)}</span></td>
      <td class="c-price"><span class="rp">${esc(s.price)}</span> <span class="rcur">${esc(s.currency)}</span></td>
      <td class="c-num hide-sm">${chgInline(s.weekPct)}</td>
      <td class="c-num hide-sm">${chgInline(s.yearPct)}</td>
      <td class="c-num hide-md"><span class="cell-pe">${s.metrics.pe}<span class="pe-dot ${s.metrics.peVerdict.kind}"></span></span></td>
      <td class="c-score"><span class="cell-score">${miniCoins(s.score.value)}<span class="score-num">${num(s.score.value, 1)}<small>/7</small></span></span></td>
      <td class="c-num"><span class="cell-ret ${retCls}">${pct(s.expected.total)}</span></td>
      <td class="c-verdict"><span class="stamp ${v.cls}"><span class="ingot"></span>${v.label}</span></td>
    </tr>
    <tr class="detailrow" data-detail="${idx}"><td colspan="${PCOLS}"><div class="detail-anim"><div class="detail-clip"><div class="detail-inner">${detailHTML(s)}</div></div></div></td></tr>`;
  }

  /* ---------- pending tickers ---------- */
  function getPending() { try { return JSON.parse(localStorage.getItem("ag_pending") || "[]"); } catch (e) { return []; } }
  function setPending(a) { localStorage.setItem("ag_pending", JSON.stringify(a)); }
  function pendingRowHTML(tk) {
    return `<tr class="prow" data-pending="${esc(tk)}">
      <td class="pdot">＋</td>
      <td colspan="${PCOLS - 3}"><span class="pt">${esc(tk)}</span> &nbsp;<span class="pnote">tilføjet — afventer data fra næste søndagskørsel</span></td>
      <td class="pnote" style="text-align:right">på vej</td>
      <td class="premove"><button type="button" data-remove="${esc(tk)}">Fjern</button></td>
    </tr>`;
  }

  /* ---------- state ---------- */
  const state = {
    sort: localStorage.getItem("ag_sort") || "score",
    dir: localStorage.getItem("ag_dir") || "desc",
    filter: localStorage.getItem("ag_filter") || "all",
    theme: localStorage.getItem("ag_theme") || "light",
    open: new Set()
  };

  const VAL = {
    name: s => s.name.toLowerCase(),
    week: s => s.weekPct, year: s => s.yearPct,
    pe: s => parseNum(s.metrics.pe), score: s => s.score.value,
    ret: s => s.expected.total
  };

  function sortedFiltered() {
    let list = DATA.stocks.map((s, i) => ({ s, i }));
    if (state.filter !== "all") list = list.filter(o => o.s.score.verdict === state.filter);
    const get = VAL[state.sort] || VAL.score;
    list.sort((a, b) => {
      let r;
      if (state.sort === "name") r = get(a.s) < get(b.s) ? -1 : get(a.s) > get(b.s) ? 1 : 0;
      else r = get(a.s) - get(b.s);
      return state.dir === "asc" ? r : -r;
    });
    return list;
  }

  function renderTable() {
    const tb = $("#tbody");
    const list = sortedFiltered();
    let html = list.map(o => rowHTML(o.s, o.i)).join("");
    const pend = getPending();
    html += pend.map(pendingRowHTML).join("");
    tb.innerHTML = html;
    state.open.forEach(idx => {
      const row = tb.querySelector(`.srow[data-idx="${idx}"]`);
      const det = tb.querySelector(`.detailrow[data-detail="${idx}"]`);
      if (row && det) { row.classList.add("open"); row.setAttribute("aria-expanded", "true"); det.classList.add("open"); }
    });
    $("#pendingWrap").innerHTML = pend.length
      ? `<span style="font-size:12px;color:var(--text-faint);align-self:center">På vej i næste kørsel:</span>` +
        pend.map(tk => `<span class="pending-chip">${esc(tk)}<button type="button" data-remove="${esc(tk)}" aria-label="Fjern ${esc(tk)}">✕</button></span>`).join("")
      : "";
    const total = DATA.stocks.length;
    const sortNames = { score: "kvalitet", ret: "forventet afkast", week: "ugeændring", year: "årsændring", name: "navn", pe: "P/E" };
    $("#countNote").textContent =
      `${list.length} af ${total} aktier` +
      (state.filter !== "all" ? ` · filter: ${VERDICT[state.filter].label.toLowerCase()}` : "") +
      (pend.length ? ` · ${pend.length} på vej` : "") +
      ` · sorteret efter ${sortNames[state.sort]} (${state.dir === "asc" ? "stigende" : "faldende"})`;
    updateSortHeaders();
  }

  function toggleRow(idx) {
    const row = $(`.srow[data-idx="${idx}"]`);
    const det = $(`.detailrow[data-detail="${idx}"]`);
    if (!row || !det) return;
    const open = !row.classList.contains("open");
    row.classList.toggle("open", open);
    row.setAttribute("aria-expanded", open ? "true" : "false");
    det.classList.toggle("open", open);
    if (open) state.open.add(idx); else state.open.delete(idx);
  }

  function updateSortHeaders() {
    document.querySelectorAll("th.sortable").forEach(th => {
      th.removeAttribute("aria-sort");
      let a = th.querySelector(".arr");
      if (th.dataset.sort === state.sort) {
        th.setAttribute("aria-sort", state.dir === "asc" ? "ascending" : "descending");
        if (a) a.textContent = state.dir === "asc" ? "▲" : "▼";
      } else if (a) a.textContent = "";
    });
  }

  /* ---------- vault ---------- */
  function renderVault() {
    const ss = DATA.stocks;
    const counts = { buy: 0, wait: 0, avoid: 0 };
    ss.forEach(s => counts[s.score.verdict]++);
    const bestWeek = ss.reduce((a, b) => b.weekPct > a.weekPct ? b : a);
    const bestYear = ss.reduce((a, b) => b.yearPct > a.yearPct ? b : a);
    const topScore = ss.reduce((a, b) => b.score.value > a.score.value ? b : a);
    const avgRet = ss.reduce((a, b) => a + b.expected.total, 0) / ss.length;
    $("#vaultGrid").innerHTML = `
      <div class="vstat"><div class="vl">På radaren</div><div class="vv">${ss.length}</div>
        <div class="vbars">${counts.buy ? `<div class="vbar buy" style="flex:${counts.buy}"></div>` : ""}${counts.wait ? `<div class="vbar wait" style="flex:${counts.wait}"></div>` : ""}${counts.avoid ? `<div class="vbar avoid" style="flex:${counts.avoid}"></div>` : ""}</div>
        <div class="vmeta">${counts.buy} guldkorn · ${counts.wait} afvent · ${counts.avoid} fravælg</div></div>
      <div class="vstat"><div class="vl">Højeste kvalitet</div><div class="vv">${num(topScore.score.value, 1)}</div><div class="vmeta">${esc(topScore.name)}</div></div>
      <div class="vstat"><div class="vl">Ugens stiger</div><div class="vv" style="color:var(--pos)">${pct(bestWeek.weekPct)}</div><div class="vmeta">${esc(bestWeek.name)}</div></div>
      <div class="vstat"><div class="vl">Årets stiger</div><div class="vv" style="color:var(--pos)">${pct(bestYear.yearPct)}</div><div class="vmeta">${esc(bestYear.name)}</div></div>
      <div class="vstat"><div class="vl">Gns. forv. afkast</div><div class="vv" style="color:var(--gold-ink)">${pct(avgRet)}</div><div class="vmeta">vækst + udbytte/år</div></div>`;
  }

  function renderPhases() {
    $("#phases").innerHTML = DATA.phases.map(p =>
      `<div class="phase"><div class="pn">FASE ${p.n}</div><div class="pname">${esc(p.name)}</div><div class="pdesc">${esc(p.desc)}</div></div>`).join("");
  }

  /* ---------- theme ---------- */
  const SUN = `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>`;
  const MOON = `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    $("#themeToggle").innerHTML = state.theme === "light" ? `${MOON} Mørk` : `${SUN} Lys`;
  }

  /* ---------- init ---------- */
  function init() {
    applyTheme();
    renderPhases();
    renderVault();
    renderTable();

    $("#tbody").addEventListener("click", (e) => {
      if (e.target.closest("[data-remove]")) return;
      if (e.target.closest(".tip")) return;
      const row = e.target.closest(".srow");
      if (row) toggleRow(parseInt(row.dataset.idx, 10));
    });
    $("#tbody").addEventListener("keydown", (e) => {
      const row = e.target.closest(".srow");
      if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggleRow(parseInt(row.dataset.idx, 10)); }
    });
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove]");
      if (!btn) return;
      const tk = btn.dataset.remove;
      setPending(getPending().filter(x => x !== tk));
      renderTable();
    });
    document.querySelectorAll("th.sortable").forEach(th => {
      th.insertAdjacentHTML("beforeend", ` <span class="arr"></span>`);
      th.addEventListener("click", () => {
        const k = th.dataset.sort;
        if (state.sort === k) state.dir = state.dir === "asc" ? "desc" : "asc";
        else { state.sort = k; state.dir = (k === "name") ? "asc" : "desc"; }
        localStorage.setItem("ag_sort", state.sort);
        localStorage.setItem("ag_dir", state.dir);
        renderTable();
      });
    });
    document.querySelectorAll("[data-filter]").forEach(b => {
      b.addEventListener("click", () => {
        state.filter = b.dataset.filterval;
        localStorage.setItem("ag_filter", state.filter);
        document.querySelectorAll("[data-filter]").forEach(x => x.setAttribute("aria-pressed", x.dataset.filterval === state.filter ? "true" : "false"));
        renderTable();
      });
      b.setAttribute("aria-pressed", b.dataset.filterval === state.filter ? "true" : "false");
    });
    $("#themeToggle").addEventListener("click", () => {
      state.theme = state.theme === "light" ? "dark" : "light";
      localStorage.setItem("ag_theme", state.theme);
      applyTheme();
    });
    $("#addForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = $("#tickerInput");
      let tk = inp.value.trim().toUpperCase().replace(/\s+/g, "");
      if (!tk) return;
      const existing = DATA.stocks.map(s => s.ticker.toUpperCase());
      const pend = getPending();
      if (existing.includes(tk)) { flash(inp, "Den er allerede på radaren"); return; }
      if (pend.includes(tk)) { flash(inp, "Allerede tilføjet"); return; }
      pend.push(tk);
      setPending(pend);
      inp.value = "";
      renderTable();
      inp.focus();
    });
    $("#mWeek").textContent = DATA.meta.week;
    $("#mDate").textContent = DATA.meta.dateLong;
    $("#mUpd").textContent = `Sidst opdateret ${DATA.meta.updated} · ${DATA.meta.cadence}`;
    $("#tagline").textContent = DATA.meta.tagline;
  }

  function flash(input, msg) {
    const old = input.placeholder;
    input.value = "";
    input.placeholder = msg;
    input.style.borderColor = "var(--neg)";
    setTimeout(() => { input.placeholder = old; input.style.borderColor = ""; }, 1800);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
