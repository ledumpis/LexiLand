EGL_Engine.register({
  id: 'speed-quiz',
  name: 'Speed Quiz',
  icon: '⚡',
  description: '60-second time trial. Build streaks and combo multipliers.',

  init(container, { words, engine }) {
    this.container = container;
    this.words = words;
    this.engine = engine;
    this.duration = 60;
    this.timeLeft = this.duration;
    this.idx = 0;
    this.answered = 0;
    this.streak = 0;
    this.best = 0;
    this.locked = false;
    this.current = null;
    this.active = true;
    this._timers = new Set();
    // Smart Retry for Speed Quiz: missed words resurface after a few others
    // WITHOUT pausing or extending the 60s timer. Retry fixes update mastery
    // but restore score/combo (no point farming under time pressure).
    this.retry = (typeof EGL_Retry !== 'undefined') ? EGL_Retry.create({ gap: 4, maxRetries: 2 }) : null;
    this.retryEntry = null;
    this.isRetry = false;

    const timerPill = document.getElementById('timer-pill');
    if (timerPill) timerPill.style.display = 'flex';
    document.getElementById('game-timer').innerText = `${this.timeLeft}s`;

    // 1 / ← picks the left option, 2 / → the right one
    this._onKey = (e) => {
      if (!this.active || this.locked) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && t.closest && t.closest('input, textarea, select')) return;
      let i = -1;
      if (e.key === '1' || e.key === 'ArrowLeft') i = 0;
      else if (e.key === '2' || e.key === 'ArrowRight') i = 1;
      if (i < 0) return;
      const btn = this.container.querySelectorAll('.sq-opt')[i];
      if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
    };
    document.addEventListener('keydown', this._onKey);
    this._langHandler = () => { if (this.active) this.patchLanguage(); };
    document.addEventListener('egl:language-change', this._langHandler);

    this.timer = setInterval(() => {
      this.timeLeft--;
      document.getElementById('game-timer').innerText = `${Math.max(0, this.timeLeft)}s`;
      if (timerPill) timerPill.classList.toggle('hot', this.timeLeft <= 10);
      this.syncProgress();
      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.engine.endSession();
      }
    }, 1000);

    this.syncProgress();
    this.render();
  },

  later(fn, ms) {
    const t = setTimeout(() => { this._timers.delete(t); if (this.active) fn(); }, ms);
    this._timers.add(t);
  },

  syncProgress() {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const label = i18n ? i18n.t('speedQuiz.progress', { count: this.answered }) : `${this.answered} answered`;
    this.engine.setProgress(this.duration - Math.max(0, this.timeLeft), this.duration, label);
  },

  patchLanguage() {
    if (!this.active) return;
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    const stats = this.container.querySelector('.sq-stats');
    if (stats) {
      const answeredEl = stats.querySelector('#sq-answered');
      const streakEl = stats.querySelector('#sq-streak');
      const bestEl = stats.querySelector('#sq-best');
      const answeredVal = answeredEl ? answeredEl.textContent : String(this.answered);
      const streakVal = streakEl ? streakEl.textContent : String(this.streak);
      const bestVal = bestEl ? bestEl.textContent : String(this.best);
      stats.innerHTML = `
          <span>${tt('speedQuiz.stats.answered')} <strong id="sq-answered">${answeredVal}</strong></span>
          <span>${tt('speedQuiz.stats.streak')} <strong id="sq-streak">${streakVal}</strong></span>
          <span>${tt('speedQuiz.stats.best')} <strong id="sq-best">${bestVal}</strong></span>
      `;
    }
    const hint = this.container.querySelector('.sq-hint');
    if (hint) hint.innerHTML = tt('speedQuiz.hint');
    // progress label
    this.syncProgress();
  },

  render() {
    // Retry first: if a missed word is due, resurface it instead of advancing.
    // Otherwise pick the next word cyclically (timer game has no fixed end).
    let cur = this.words[this.idx % this.words.length];
    if (this.retry && !this.locked) {
      const dueKey = this.retry.due(1000);
      if (dueKey) {
        const entry = this.retry.takeDue(dueKey);
        const w = this.words.find(x => x.word === dueKey);
        if (w && entry) {
          this.retryEntry = entry;
          this.isRetry = true;
          cur = w;
        }
      } else {
        this.retryEntry = null;
        this.isRetry = false;
      }
    }
    const esc = EGL_Utils.escapeHtml;
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    const opts = EGL_Utils.shuffle([cur, ...this.engine.getDistractors(cur, 1)]);
    this.current = { cur, opts };
    this.locked = false;

    this.container.innerHTML = `
      <div class="g-arena sq-arena sq-in">
        <div class="sq-stats">
          <span>${esc(tt('speedQuiz.stats.answered'))} <strong id="sq-answered">${this.answered}</strong></span>
          <span>${esc(tt('speedQuiz.stats.streak'))} <strong id="sq-streak">${this.streak}</strong></span>
          <span>${esc(tt('speedQuiz.stats.best'))} <strong id="sq-best">${this.best}</strong></span>
        </div>

        <div class="g-card sq-card">
          <div class="g-word">${esc(cur.word)}</div>
        </div>

        <div class="sq-grid">
          ${opts.map((o, i) => `
            <button class="btn-choice sq-opt" type="button" data-i="${i}">
              <span class="choice-num">${i + 1}</span>
              <span class="choice-text">${esc(o.meaning)}</span>
            </button>
          `).join('')}
        </div>

        <p class="g-hint sq-hint">${tt('speedQuiz.hint')}</p>
      </div>
    `;

    const btns = this.container.querySelectorAll('.sq-opt');
    btns.forEach(btn => {
      btn.onclick = () => {
        if (this.locked) return;
        this.locked = true;

        const isCorrect = (opts[Number(btn.dataset.i)].word === cur.word);
        btns.forEach((b, i) => {
          b.disabled = true;
          if (opts[i].word === cur.word) b.classList.add('choice-correct');
          else if (b === btn) b.classList.add('choice-wrong');
          else b.classList.add('is-dim');
        });

        this.answered++;
        if (isCorrect) { this.streak++; this.best = Math.max(this.best, this.streak); }
        else this.streak = 0;

        this.answerCurrent(isCorrect, cur);
        this.syncProgress();

        this.later(() => { this.idx++; this.render(); }, isCorrect ? 220 : 480);
      };
    });
  },

  // Retry-aware scoring for the timed game: first-try uses the normal engine
  // path; retry fixes update mastery but restore score/combo. The 60s timer
  // is never touched here.
  answerCurrent(isCorrect, cur) {
    const s = this.engine.activeSession;
    if (!this.retry || !this.isRetry) {
      if (!isCorrect && this.retry) this.retry.schedule(cur.word);
      else if (this.retry) this.retry.noteFirstTryCorrect();
      this.engine.recordAnswer(isCorrect, cur);
      if (!isCorrect && this.retry) this.retryNote();
      return;
    }
    const prevScore = s ? s.score : 0;
    const prevCombo = s ? s.combo : 0;
    this.engine.recordAnswer(isCorrect, cur);
    if (s) { s.score = prevScore; s.combo = isCorrect ? prevCombo : 0; this.engine.updateStatsUI(); }
    this.retry.resolve(cur.word, isCorrect, this.retryEntry);
    // No toast on Speed Quiz: the timer is running; visual feedback is enough.
    this.retryEntry = null;
    this.isRetry = false;
  },

  retryNote() {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    if (i18n) EGL_Utils.toast(i18n.t('retry.toast.soon'));
  },

  cleanup() {
    this.active = false;
    clearInterval(this.timer);
    if (this._timers) { this._timers.forEach(clearTimeout); this._timers.clear(); }
    if (this._onKey) { document.removeEventListener('keydown', this._onKey); this._onKey = null; }
    if (this._langHandler) { document.removeEventListener('egl:language-change', this._langHandler); this._langHandler = null; }
    const timerPill = document.getElementById('timer-pill');
    if (timerPill) {
      timerPill.style.display = 'none';
      timerPill.classList.remove('hot');
    }
  }
});
