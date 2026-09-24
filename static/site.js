/* MUCSIA - chování webu. Bez cizích knihoven, bez sledování. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hoverable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var narrow = window.matchMedia("(max-width: 820px)");
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var HDR = 68;

  /* ---------- hlavička, plynulé kotvy ---------- */
  var hdr = $("#hdr");
  function onScroll() { hdr.classList.toggle("scrolled", window.scrollY > 24); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var el = document.getElementById(a.getAttribute("href").slice(1));
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", a.getAttribute("href"));
  });

  /* ---------- úvod: oko se otevře a prohřeje ---------- */
  var hero = $("[data-hero]");
  if (hero) requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add("ready"); }); });

  /* ---------- odhalení bloků (jednou) ---------- */
  var reveal = $$("[data-spread]");
  if (reveal.length) {
    if (reduce) reveal.forEach(function (s) { s.classList.add("open"); });
    else {
      var so = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("open"); so.unobserve(e.target); } });
      }, { threshold: .3 });
      reveal.forEach(function (s) { so.observe(s); });
    }
  }

  /* ---------- živá prověrka: stav je funkcí času ---------- */
  var TL = {
    layer: function (i) { return 300 + i * 1350; },
    src: [[100, 0], [3400, 96], [4000, 118], [5400, 131], [7000, 157], [8400, 178], [9800, 199], [11200, 226], [12600, 241], [13400, 248]],
    leads: [[0, 0], [1400, 2], [2300, 4], [3600, 5], [4700, 7], [6300, 8], [7700, 9], [9300, 9], [10800, 10], [12200, 6], [13000, 2], [13400, 0]],
    cards: [[1500, "0"], [3100, "1"], [4600, "s"], [6300, "2"], [7900, "3"], [9500, "4"], [11100, "5"]],
    rounds: [[0, 1], [4200, 2], [7000, 3], [9800, 4], [11800, 5]],
    struck: 5800, sat: 13400, rep: 14200, fly: 14600, closed: 15500, loop: 18000, first: 1600, still: 14000
  };
  function interp(plan, t) {
    if (t <= plan[0][0]) return plan[0][1];
    for (var i = 1; i < plan.length; i++) {
      if (t <= plan[i][0]) { var a = plan[i - 1], b = plan[i]; return Math.round(a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0])); }
    }
    return plan[plan.length - 1][1];
  }
  function step(plan, t) { var v = plan[0][1]; plan.forEach(function (p) { if (t >= p[0]) v = p[1]; }); return v; }

  $$("[data-console]").forEach(function (con) {
    var layers = $$(".con-layers li", con);
    var cS = $("[data-cnt=sources]", con), cL = $("[data-cnt=leads]", con), status = $("[data-status]", con);
    var report = $("[data-report]", con), byId = {};
    $$(".fc", con).forEach(function (c) { byId[c.dataset.card] = c; });
    var flown = false, lastT = -1;
    function maxShown() { return parseInt(getComputedStyle(con).getPropertyValue("--con-max"), 10) || 3; }
    function render(t) {
      if (t === lastT) return; lastT = t;
      // vrstvy se rozsvěcují v tempu nálezů; ta, která se právě prohledává, pulzuje
      var lit = 0;
      layers.forEach(function (l, i) { var on = t >= TL.layer(i); l.classList.toggle("lit", on); if (on) lit = i + 1; });
      layers.forEach(function (l, i) { l.classList.toggle("scan", i === lit && t < TL.sat); });
      cS.textContent = interp(TL.src, t);
      cL.textContent = step(TL.leads, t);
      var round = step(TL.rounds, t);
      status.textContent = t >= TL.rep ? status.dataset.rep : t >= TL.sat ? status.dataset.sat : round >= 2 ? status.dataset.lead : status.dataset.start;
      var vis = TL.cards.filter(function (c) { return c[0] <= t; }).sort(function (a, b) { return b[0] - a[0]; });
      var shown = vis.slice(0, maxShown()).map(function (c) { return byId[c[1]]; });
      Object.keys(byId).forEach(function (k) {
        var el = byId[k], i = shown.indexOf(el);
        el.classList.toggle("in", i >= 0);
        if (i >= 0) el.style.setProperty("--pos", i); else el.style.removeProperty("--pos");
      });
      byId.s.classList.toggle("struck", t >= TL.struck);
      report.classList.toggle("show", t >= TL.rep);
      report.classList.toggle("closed", t >= TL.closed);
      if (t >= TL.fly) {
        if (!flown) {
          flown = true;
          var rr = report.getBoundingClientRect();
          shown.forEach(function (c) {
            var cr = c.getBoundingClientRect();
            c.style.setProperty("--fx", (rr.left + rr.width / 2 - cr.left - cr.width / 2) + "px");
            c.style.setProperty("--fy", (rr.top + rr.height / 2 - cr.top - cr.height / 2) + "px");
          });
        }
        shown.forEach(function (c, i) { c.style.setProperty("--fd", (i * 120) + "ms"); c.classList.add("fly"); });
      } else {
        flown = false;
        Object.keys(byId).forEach(function (k) { byId[k].classList.remove("fly"); });
      }
    }
    if (reduce) { con.classList.add("static"); render(TL.still); return; }
    var t0 = 0, playing = false, offset = 0;
    // smyčka běží od prvního nálezu (TL.first), aby konzole nikdy nebyla prázdná
    var frame = function (now) {
      if (!playing) return;
      render(TL.first + (now - t0 + offset) % (TL.loop - TL.first));
      requestAnimationFrame(frame);
    };
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && !playing) { playing = true; t0 = performance.now(); requestAnimationFrame(frame); }
      if (!es[0].isIntersecting && playing) { playing = false; offset = (performance.now() - t0 + offset) % (TL.loop - TL.first); }
    }, { threshold: .15 });
    io.observe(con);
    render(TL.first);
  });

  /* ---------- report: stoh stránek, stav je funkcí posunu (desktop) ----------
     Každá stránka má úsek L px: nejdřív klid H px (stránka leží, grafika dokreslená), pak otočení.
     pos = spojitá pozice ve stohu (0 .. N-1), --f = průběh grafiky stránky (0 .. 1).
     Po zastavení uprostřed otočení se stránka dorovná na nejbližší klid ve směru posunu. */
  var rep = $("[data-report]:not(.con-report)");
  if (rep && $(".rep-track", rep)) {
    var track = $(".rep-track", rep), sticky = $(".rep-sticky", rep), pages = $$(".rep-page", rep), chapters = $$(".rep-chapters li", rep), N = pages.length;
    var chList = $(".rep-chapters", rep), hint = $("[data-rep-hint]", rep);
    var L = 1, H = 1, on = false, active = -1, lastY = window.scrollY, dir = 1, idle = 0, queued = false, po = null;
    var smooth = function (x) { return x * x * (3 - 2 * x); };
    var total = function () { return (N - 1) * L + H; };
    var scrolled = function () { return HDR - track.getBoundingClientRect().top; };
    var posAt = function (s) {
      if (s <= 0) return 0;
      var seg = Math.floor(s / L);
      if (seg >= N - 1) return N - 1;
      var w = s - seg * L;
      return w <= H ? seg : seg + (w - H) / (L - H);
    };
    var figAt = function (k, s) {
      var a = k === 0 ? -.55 * window.innerHeight : (k - 1) * L + H + .35 * (L - H), b = k * L + .3 * H;
      return clamp((s - a) / (b - a), 0, 1);
    };
    var restTop = function (k) { return track.getBoundingClientRect().top + window.scrollY - HDR + k * L + H / 2; };
    var measure = function () {
      L = Math.round(window.innerHeight * .5); H = Math.round(L * .3);
      track.style.height = (sticky.offsetHeight + total()) + "px";
    };
    var paint = function () {
      queued = false;
      if (!on) return;
      var s = scrolled(), pos = posAt(s), now = clamp(Math.round(pos), 0, N - 1);
      // ležící stránka se během klidu zvolna zvedá o DRIFT px, aby i krok kolečka v klidu něčím pohnul
      var DRIFT = 12, seg = Math.min(Math.floor(Math.max(s, 0) / L), N - 1), rest = s <= 0 ? 0 : clamp((s - seg * L) / H, 0, 1);
      pages.forEach(function (p, k) {
        var d = k - pos, st = p.style;
        if (d <= -1) { st.visibility = "hidden"; return; }
        st.visibility = "";
        st.zIndex = String(100 - k);
        if (d < 0) {
          var o = -d;
          st.transform = "translate3d(0," + (-DRIFT - o * 24).toFixed(1) + "px,0) perspective(1600px) rotateX(" + (-o * 100).toFixed(2) + "deg)";
          st.opacity = (1 - smooth(clamp((o - .5) / .42, 0, 1))).toFixed(3);
          st.setProperty("--shade", (o * .35).toFixed(3));
        } else if (d === 0) {
          st.transform = "translate3d(0," + (-DRIFT * rest).toFixed(1) + "px,0)";
          st.opacity = "1";
          st.setProperty("--shade", "0");
        } else {
          var dep = Math.min(d, 3);
          st.transform = "translate3d(0," + (dep * 22).toFixed(1) + "px,0) scale(" + (1 - dep * .035).toFixed(4) + ")";
          st.opacity = d <= 2 ? "1" : clamp(3 - d, 0, 1).toFixed(3);
          st.setProperty("--shade", (Math.min(d, 2) * .09).toFixed(3));
        }
        st.setProperty("--f", figAt(k, s).toFixed(3));
      });
      if (now !== active) {
        active = now;
        pages.forEach(function (p, k) { p.classList.toggle("on", k === now); p.setAttribute("aria-hidden", k === now ? "false" : "true"); });
        chapters.forEach(function (c, k) { c.classList.toggle("active", k === now); c.classList.toggle("done", k < now); });
      }
      chList.style.setProperty("--rp", (clamp(s / total(), 0, 1) * 100).toFixed(2) + "%");
      if (hint) hint.classList.toggle("done", pos > .15);
    };
    var request = function () { if (!queued) { queued = true; requestAnimationFrame(paint); } };
    var goTo = function (k) { window.scrollTo({ top: restTop(k), behavior: "smooth" }); };
    var settle = function () {
      if (!on) return;
      var s = scrolled();
      if (s <= 0 || s >= total()) return;
      var seg = Math.floor(s / L), w = s - seg * L;
      if (w <= H || seg >= N - 1) return;
      var frac = (w - H) / (L - H);
      goTo(dir > 0 ? (frac > .18 ? seg + 1 : seg) : (frac < .82 ? seg : seg + 1));
    };
    var enable = function () {
      on = true; active = -1;
      if (po) { po.disconnect(); po = null; }
      rep.classList.add("rep-scrolly");
      pages.forEach(function (p) { p.classList.remove("open", "gone"); });
      measure(); paint();
    };
    var disable = function () {
      on = false;
      rep.classList.remove("rep-scrolly");
      track.style.height = "";
      chList.style.removeProperty("--rp");
      pages.forEach(function (p) { p.removeAttribute("style"); p.removeAttribute("aria-hidden"); p.classList.remove("gone"); });
      if (reduce) { pages.forEach(function (p) { p.classList.add("open", "on"); }); return; }
      po = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("open", "on"); po.unobserve(e.target); } });
      }, { threshold: .25 });
      pages.forEach(function (p) { po.observe(p); });
    };
    window.addEventListener("scroll", function () {
      var y = window.scrollY; if (y !== lastY) dir = y > lastY ? 1 : -1; lastY = y;
      if (!on) return;
      request();
      clearTimeout(idle); idle = setTimeout(settle, 150);
    }, { passive: true });
    window.addEventListener("resize", function () { if (on) { measure(); request(); } });
    var pick = function () { if (!reduce && !narrow.matches) { if (!on) enable(); } else if (on || !po) disable(); };
    if (narrow.addEventListener) narrow.addEventListener("change", pick); else narrow.addListener(pick);
    chapters.forEach(function (c, k) {
      c.setAttribute("tabindex", "0"); c.setAttribute("role", "button");
      c.addEventListener("click", function () { if (on) goTo(k); });
      c.addEventListener("keydown", function (e) { if (on && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); goTo(k); } });
    });
    pick();
  }

  /* ---------- formulář ---------- */
  $$("[data-form]").forEach(function (form) {
    var endpoint = document.body.getAttribute("data-endpoint") || "";
    var note = $("[data-note]", form), ok = $("[data-ok]", form), btn = $("[data-send]", form), msgs = {};
    var tpl = $("template[data-i18n]", form); if (tpl) $$("span", tpl.content).forEach(function (s) { msgs[s.dataset.k] = s.textContent; });
    function mark(fld, bad) {
      var wrap = fld.closest(".fld"); wrap.classList.toggle("err", bad);
      var m = $(".msg", wrap);
      if (bad) { if (!m) { m = document.createElement("span"); m.className = "msg"; wrap.appendChild(m); } m.textContent = fld.dataset.msg; }
      else if (m) m.remove();
    }
    function valid() {
      var okAll = true;
      $$("[required]", form).forEach(function (f) {
        var bad = f.type === "checkbox" ? !f.checked : f.type === "email" ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()) : !f.value.trim();
        mark(f, bad); if (bad) okAll = false;
      });
      return okAll;
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault(); note.textContent = "";
      if (!valid()) return;
      if ($(".hp", form).value) return;
      if (!endpoint) { note.textContent = msgs.offline || ""; return; }
      var data = {}; $$("input, textarea", form).forEach(function (f) { if (f.name && !f.classList.contains("hp")) data[f.name] = f.type === "checkbox" ? f.checked : f.value.trim(); });
      btn.classList.add("busy"); var label = btn.textContent; btn.textContent = btn.dataset.sending;
      fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), mode: "cors" })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json().catch(function () { return {}; }); })
        .then(function () {
          form.classList.add("sent"); ok.hidden = false;
          var eye = $(".contact-eye"); if (eye) { eye.classList.add("blink"); setTimeout(function () { eye.classList.remove("blink"); }, 600); }
        })
        .catch(function () { note.textContent = msgs.err || ""; })
        .then(function () { btn.classList.remove("busy"); btn.textContent = label; });
    });
  });

  /* ---------- ukázka: filtry, detail ---------- */
  var filters = $("[data-filters]");
  if (filters) {
    var grid = $("[data-fgrid]"), empty = $("[data-empty]");
    filters.addEventListener("change", function () {
      var f = (filters.querySelector("input[name=find]:checked") || {}).value || "";
      var c = (filters.querySelector("input[name=cat]:checked") || {}).value || "";
      var n = 0;
      $$(".fcard", grid).forEach(function (card) {
        var hide = (f && card.dataset.find !== f) || (c && card.dataset.cat !== c);
        card.classList.toggle("hide", hide); if (!hide) n += 1;
      });
      empty.hidden = n > 0;
    });
  }
  var dlg = $("[data-dialog]");
  if (dlg) {
    var body = $("[data-dialog-body]", dlg);
    var openDetail = function (id) {
      var tpl = $("template[data-detail='" + id + "']"); if (!tpl) return;
      body.innerHTML = ""; body.appendChild(tpl.content.cloneNode(true));
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    };
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-open]"); if (b) { openDetail(b.dataset.open); return; }
      var tag = e.target.closest(".rm-tag[data-fid]"); if (tag) openDetail(tag.dataset.fid);
      if (e.target === dlg) dlg.close();
    });
  }
})();
