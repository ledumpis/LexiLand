/**
 * Business Vocabulary Lab
 * Five modes over EGL_BVL_DATA. Textbook English is never translated.
 * UI strings go through EGL_I18n. Language changes re-render only.
 */
EGL_Engine.register({
  id: "business-vocabulary-lab",
  name: "Business Vocabulary Lab",
  description: "Practise verified English for Business Studies exercises.",

  init(container, { engine }) {
    this.container = container;
    this.engine = engine;
    this.active = true;
    this.phase = "setup";
    this.unit = this.initialUnit();
    this.mode = null;
    const bank = this.data();
    if (bank && !this.playableModes(bank, this.unit).length) this.unit = null;
    this.queue = [];
    this.idx = 0;
    this.picked = [];
    this.verdict = null;
    this.optionOrder = {};
    this.correctCount = 0;
    if (this._langHandler) document.removeEventListener("egl:language-change", this._langHandler);
    this._langHandler = () => { if (this.active) this.render(); };
    document.addEventListener("egl:language-change", this._langHandler);
    this.render();
  },

  cleanup() {
    this.active = false;
    if (this._langHandler) {
      document.removeEventListener("egl:language-change", this._langHandler);
      this._langHandler = null;
    }
  },

  tt(key, params) {
    const i18n = (typeof EGL_I18n !== "undefined") ? EGL_I18n : null;
    return i18n ? i18n.t(key, params) : key;
  },

  esc(value) {
    return EGL_Utils.escapeHtml(value);
  },

  data() {
    return (typeof window !== "undefined") ? window.EGL_BVL_DATA : null;
  },

  initialUnit() {
    try {
      const id = (typeof EGL_Vocab !== "undefined" && EGL_Vocab.activeDeckId) ? EGL_Vocab.activeDeckId : "";
      const match = /^ebs_unit_(\d+)$/.exec(id);
      const bank = this.data();
      if (match && bank && bank.unitByNumber(Number(match[1]))) return Number(match[1]);
    } catch (e) { /* keep default */ }
    return 1;
  },

  followsDeck() {
    try {
      const id = EGL_Vocab.activeDeckId || "";
      return /^ebs_unit_(\d+)$/.test(id);
    } catch (e) {
      return false;
    }
  },

  modeIds: ["read-fill", "match", "quick", "sort", "mixed"],

  playableModes(bank, unit) {
    if (!bank || unit == null) return [];
    return this.modeIds.filter((mode) => bank.questionsFor(unit, mode).length > 0);
  },

  resetSessionScore() {
    const s = this.engine && this.engine.activeSession;
    if (!s || s.ended) return;
    s.score = 0;
    s.combo = 0;
    s.correctCount = 0;
    s.totalAnswered = 0;
    s.weakWordsLearned = [];
    this.engine.updateStatsUI();
  },

  readBest(unit, mode) {
    try {
      const raw = localStorage.getItem("egl_bvl_progress");
      if (!raw) return null;
      const data = JSON.parse(raw);
      const row = data && data.rounds && data.rounds[unit + "|" + mode];
      return row && typeof row.bestCorrect === "number" ? row : null;
    } catch (e) {
      return null;
    }
  },

  saveRound(unit, mode, correct, total) {
    const key = "egl_bvl_progress";
    let data = {};
    try {
      data = JSON.parse(localStorage.getItem(key) || "{}") || {};
    } catch (e) {
      data = {};
    }
    if (!data.rounds || typeof data.rounds !== "object") data.rounds = {};
    const id = unit + "|" + mode;
    const prev = data.rounds[id] || {};
    const best = prev.total === total ? Math.max(prev.bestCorrect || 0, correct) : correct;
    data.rounds[id] = { correct: correct, total: total, bestCorrect: best, updatedAt: Date.now() };
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* ignore quota */ }
  },

  startRound() {
    const bank = this.data();
    if (!bank) return;
    const list = bank.questionsFor(this.unit, this.mode);
    this.resetSessionScore();
    this.correctCount = 0;
    this.picked = [];
    this.verdict = null;
    this.optionOrder = {};
    this.idx = 0;
    if (!this.mode || !list.length) {
      this.phase = "setup";
      this.mode = null;
      this.queue = [];
      this.render();
      return;
    }
    this.queue = EGL_Utils.shuffle(list);
    this.phase = "play";
    this.render();
  },

  backToSetup() {
    this.resetSessionScore();
    this.phase = "setup";
    this.queue = [];
    this.idx = 0;
    this.picked = [];
    this.verdict = null;
    this.optionOrder = {};
    this.correctCount = 0;
    this.render();
  },

  optionsFor(q) {
    if (!this.optionOrder[q.id]) this.optionOrder[q.id] = EGL_Utils.shuffle(q.options);
    return this.optionOrder[q.id];
  },

  grade(q) {
    if (this.verdict) return;
    const bank = this.data();
    const ok = bank.isCorrect(q, this.picked);
    this.verdict = { ok: ok };
    if (ok) this.correctCount += 1;
    this.engine.recordAnswer(ok, { word: q.term });
    this.render();
  },

  onOption(q, value) {
    if (this.verdict) return;
    if (q.kind === "ordered") {
      const at = this.picked.indexOf(value);
      if (at !== -1) this.picked.splice(at, 1);
      else if (this.picked.length < q.answers.length) this.picked.push(value);
      if (this.picked.length === q.answers.length) this.grade(q);
      else this.render();
      return;
    }
    this.picked = [value];
    this.grade(q);
  },

  continueNext() {
    if (!this.verdict) return;
    this.idx += 1;
    this.picked = [];
    this.verdict = null;
    if (this.idx >= this.queue.length) {
      this.finish();
      return;
    }
    this.render();
  },

  finish() {
    const total = this.queue.length;
    this.saveRound(this.unit, this.mode, this.correctCount, total);
    this.engine.setProgress(total, total, this.tt("bvl.play.progress", { current: total, total: total }));
    this.engine.endSession();
  },

  emptyKey() {
    if (this.mode === "sort") return "bvl.empty.sort";
    if (this.unit === 5) return "bvl.empty.unit5";
    if (this.mode === "mixed") return "bvl.empty.mixed";
    return "bvl.empty.mode";
  },

  setTitle() {
    const title = document.getElementById("current-game-title");
    if (title) title.textContent = this.tt("game.name.business-vocabulary-lab");
  },

  render() {
    if (!this.active || !this.container) return;
    this.setTitle();
    const bank = this.data();
    if (!bank) {
      this.container.innerHTML = `<div class="g-arena bvl-arena"><div class="g-card bvl-empty"><h3>${this.esc(this.tt("bvl.missing"))}</h3></div></div>`;
      return;
    }
    if (this.phase === "play") this.renderPlay(bank);
    else if (this.phase === "empty") this.renderEmpty(bank);
    else this.renderSetup(bank);
    this.bind();
  },

  modeIcon(mode) {
    const paths = {
      "read-fill": '<path d="M5 19V5h9l5 5v9H5z"/><path d="M14 5v5h5"/><path d="M8 13h8M8 16h5"/>',
      "match": '<rect x="3.5" y="6" width="7" height="12" rx="1.5"/><rect x="13.5" y="6" width="7" height="12" rx="1.5"/>',
      "quick": '<path d="M13 2.5L5.5 13H11l-1 8.5L18.5 10H13l0-7.5z"/>',
      "sort": '<path d="M4 7h16M7 12h10M10 17h4"/>',
      "mixed": '<path d="M7 4.5h8.5A2.5 2.5 0 0118 7v12.5H9.5A2.5 2.5 0 017 17V4.5z"/><path d="M7 7H5.5A2.5 2.5 0 003 9.5V18"/>'
    };
    return `<svg class="bvl-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[mode] || paths.mixed}</svg>`;
  },

  renderSetup(bank) {
    const playable = this.playableModes(bank, this.unit);
    const unitReady = playable.length > 0;
    const unit = unitReady ? bank.unitByNumber(this.unit) : null;
    const canStart = unitReady && !!this.mode && playable.indexOf(this.mode) !== -1;
    const reveal = !!this._revealModes;
    this._revealModes = false;
    this.engine.setProgress(0, 1, this.tt("bvl.setup.progress"));
    const note = this.followsDeck() ? "" : `<p class="bvl-note">${this.esc(this.tt("bvl.setup.deckNote"))}</p>`;
    const check = `<span class="bvl-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7.5"/></svg></span>`;
    const modeCards = unitReady ? playable.map((mode) => {
      const count = bank.questionsFor(this.unit, mode).length;
      const on = mode === this.mode;
      const best = this.readBest(this.unit, mode);
      const bestText = best ? `<span class="bvl-best">${this.esc(this.tt("bvl.setup.best", { correct: best.bestCorrect, total: best.total }))}</span>` : "";
      return `<button type="button" class="bvl-mode ${on ? "is-selected" : ""}" data-mode="${mode}" aria-pressed="${on}">
        <span class="bvl-mode-icon">${this.modeIcon(mode)}</span>
        <span class="bvl-mode-copy">
          <span class="bvl-pick-name">${this.esc(this.tt("bvl.mode." + mode))}</span>
          <span class="bvl-hint">${this.esc(this.tt("bvl.modeHint." + mode))}</span>
          ${bestText}
        </span>
        <span class="bvl-count">${this.esc(this.tt("bvl.setup.count", { count: count }))}</span>
        ${on ? check : ""}
      </button>`;
    }).join("") : "";
    this.container.innerHTML = `
      <div class="g-arena bvl-arena">
        <header class="bvl-hero">
          <button type="button" class="bvl-back" data-act="leave">${EGL_Utils.icons.back}<span>${this.esc(this.tt("bvl.setup.back"))}</span></button>
          <div class="bvl-hero-copy">
            <p class="bvl-brand">LexiLand</p>
            <h2 class="bvl-title">${this.esc(this.tt("game.name.business-vocabulary-lab"))}</h2>
            <p class="bvl-lead">${this.esc(this.tt("bvl.setup.subtitle"))}</p>
          </div>
          <span class="bvl-doodle" aria-hidden="true">
            <svg viewBox="0 0 72 72" fill="none">
              <rect x="14" y="18" width="34" height="40" rx="6" fill="#F7DDD1" stroke="#B9533B" stroke-width="1.6"/>
              <path d="M22 30h18M22 38h14M22 46h10" stroke="#8C3A27" stroke-width="1.6" stroke-linecap="round"/>
              <circle cx="52" cy="22" r="8" fill="#F7E9C4" stroke="#A87A1F" stroke-width="1.4"/>
              <path d="M52 18v4l2 2" stroke="#A87A1F" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </span>
        </header>
        ${note}
        <section class="bvl-step">
          <h3 class="bvl-label">${this.esc(this.tt("bvl.setup.stepUnit"))}</h3>
          <div class="bvl-index">
            ${bank.units.map((u) => {
              const modes = this.playableModes(bank, u.number);
              const locked = modes.length === 0;
              const on = unitReady && u.number === this.unit;
              const countKey = modes.length === 1 ? "bvl.setup.playable.one" : "bvl.setup.playable.other";
              const meta = locked ? this.tt("bvl.setup.unavailable") : this.tt(countKey, { count: modes.length });
              return `<button type="button" class="bvl-unit ${on ? "is-selected" : ""} ${locked ? "is-locked" : ""}" data-unit="${u.number}" aria-pressed="${on}" ${locked ? "disabled" : ""}>
                <span class="bvl-unit-num" aria-hidden="true">${u.number}</span>
                <span class="bvl-unit-copy">
                  <span class="bvl-pick-name">${this.esc(u.name)}</span>
                  <span class="bvl-count">${this.esc(meta)}</span>
                </span>
                ${on ? check : ""}
              </button>`;
            }).join("")}
          </div>
          <p class="bvl-aside">${this.esc(this.tt("bvl.setup.unavailableHint"))}</p>
        </section>
        <section class="bvl-step ${reveal ? "is-in" : ""}">
          <h3 class="bvl-label">${this.esc(this.tt("bvl.setup.stepMode"))}</h3>
          ${unit ? `<p class="bvl-now">${this.esc(this.tt("bvl.setup.nowPlaying", { name: unit.name }))}</p>` : ""}
          ${unitReady ? `<div class="bvl-mode-grid">${modeCards}</div>` : `<p class="bvl-aside">${this.esc(this.tt("bvl.setup.pickUnit"))}</p>`}
        </section>
        <div class="bvl-dock">
          <p class="bvl-current">${unit && this.mode ? this.esc(unit.name) + " · " + this.esc(this.tt("bvl.mode." + this.mode)) : this.esc(this.tt(unit ? "bvl.setup.stepMode" : "bvl.setup.pickUnit"))}</p>
          <button type="button" class="btn btn-primary bvl-start" data-act="start" ${canStart ? "" : "disabled"}>${this.esc(this.tt("bvl.setup.start"))}</button>
        </div>
      </div>`;
  },

  renderEmpty() {
    this.container.innerHTML = `
      <div class="g-arena bvl-arena g-anim">
        <div class="g-card bvl-empty">
          <span class="g-eyebrow">${this.esc(this.tt("bvl.mode." + this.mode))}</span>
          <h2 class="bvl-title">${this.esc(this.tt("bvl.empty.title"))}</h2>
          <p class="bvl-lead">${this.esc(this.tt(this.emptyKey()))}</p>
          <div class="bvl-actions">
            <button type="button" class="btn btn-secondary" data-act="setup">${this.esc(this.tt("bvl.empty.back"))}</button>
          </div>
        </div>
      </div>`;
  },

  renderPlay(bank) {
    const q = this.queue[this.idx];
    if (!q) return;
    const unit = bank.unitByNumber(this.unit);
    const total = this.queue.length;
    this.engine.setProgress(this.idx, total, this.tt("bvl.play.progress", { current: this.idx + 1, total: total }));
    const options = this.optionsFor(q);
    const answers = bank.answerList(q);
    const answerText = answers.join(" · ");
    let body = "";
    if (q.kind === "ordered") {
      const slots = answers.map((_, i) => {
        const value = this.picked[i] || "";
        const cls = this.verdict ? (value === answers[i] ? "is-ok" : "is-bad") : "";
        return `<span class="bvl-slot ${cls}">${value ? this.esc(value) : this.esc(this.tt("bvl.play.pick", { n: i + 1, total: answers.length }))}</span>`;
      }).join("");
      body += `<div class="bvl-slots">${slots}</div>`;
    }
    body += `<div class="bvl-options">${options.map((opt) => {
      const picked = this.picked.indexOf(opt) !== -1;
      let cls = "btn-choice bvl-opt";
      if (this.verdict) {
        if (q.kind === "ordered") {
          if (answers.indexOf(opt) !== -1 && this.picked.indexOf(opt) !== -1 && this.verdict.ok) cls += " choice-correct";
          else if (picked && !this.verdict.ok) cls += " choice-wrong";
          else cls += " is-dim";
        } else if (opt === q.answer) cls += " choice-correct";
        else if (picked) cls += " choice-wrong";
        else cls += " is-dim";
      } else if (picked) cls += " is-picked";
      return `<button type="button" class="${cls}" data-opt="${this.esc(opt)}" ${this.verdict ? "disabled" : ""}>${this.esc(opt)}</button>`;
    }).join("")}</div>`;
    let feedback = "";
    if (this.verdict) {
      feedback = `<div class="bvl-feedback ${this.verdict.ok ? "is-ok" : "is-bad"}">
        <strong>${this.esc(this.tt(this.verdict.ok ? "bvl.feedback.correct" : "bvl.feedback.wrong"))}</strong>
        <p>${this.esc(this.tt("bvl.feedback.answer", { answer: answerText }))}</p>
        ${q.resolved ? `<p>${this.esc(this.tt("bvl.feedback.resolved", { text: q.resolved }))}</p>` : ""}
        <button type="button" class="btn btn-primary" data-act="next">${this.esc(this.tt("bvl.play.continue"))}</button>
      </div>`;
    }
    this.container.innerHTML = `
      <div class="g-arena bvl-arena bvl-play">
        <div class="bvl-bar">
          <div>
            <span class="bvl-kicker">${this.esc(this.tt("gamePark.scope.unitLabel", { number: unit.number }))} · ${this.esc(unit.name)}</span>
            <strong class="bvl-mode-name">${this.esc(this.tt("bvl.mode." + this.mode))}</strong>
          </div>
          <button type="button" class="bvl-back" data-act="setup">${this.esc(this.tt("bvl.play.back"))}</button>
        </div>
        <article class="bvl-sheet">
          <p class="bvl-kicker">${this.esc(q.exercise)} · ${this.esc(this.tt("bvl.play.progress", { current: this.idx + 1, total: total }))}</p>
          <p class="bvl-q-label">${this.esc(this.tt(q.labelKey))}</p>
          <p class="bvl-prompt">${this.esc(q.prompt)}</p>
          ${body}
          ${feedback}
        </article>
      </div>`;
  },

  bind() {
    const root = this.container;
    if (!root) return;
    root.onclick = (event) => {
      const el = event.target.closest("[data-unit], [data-mode], [data-act], [data-opt]");
      if (!el || !this.active) return;
      if (el.dataset.unit) {
        if (this.phase !== "setup" || el.disabled) return;
        const next = Number(el.dataset.unit);
        const modes = this.playableModes(this.data(), next);
        if (!modes.length) return;
        this.unit = next;
        if (modes.indexOf(this.mode) === -1) this.mode = null;
        this._revealModes = true;
        this.render();
        return;
      }
      if (el.dataset.mode) {
        if (this.phase !== "setup") return;
        this.mode = el.dataset.mode;
        this.render();
        return;
      }
      if (el.dataset.act === "start") {
        if (el.disabled) return;
        this.startRound();
        return;
      }
      if (el.dataset.act === "leave") {
        const exit = document.getElementById("btn-exit-game");
        if (exit) exit.click();
        return;
      }
      if (el.dataset.act === "setup") { this.backToSetup(); return; }
      if (el.dataset.act === "next") { this.continueNext(); return; }
      if (el.dataset.opt) {
        const q = this.queue[this.idx];
        if (q) this.onOption(q, el.dataset.opt);
      }
    };
  }
});
