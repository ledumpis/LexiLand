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
    this.engine.setProgress(this.duration - Math.max(0, this.timeLeft), this.duration, `${this.answered} answered`);
  },

  render() {
    const cur = this.words[this.idx % this.words.length];
    const esc = EGL_Utils.escapeHtml;
    const opts = EGL_Utils.shuffle([cur, ...this.engine.getDistractors(cur, 1)]);
    this.current = { cur, opts };
    this.locked = false;

    this.container.innerHTML = `
      <div class="g-arena sq-arena sq-in">
        <div class="sq-stats">
          <span>Answered <strong>${this.answered}</strong></span>
          <span>Streak <strong>${this.streak}</strong></span>
          <span>Best <strong>${this.best}</strong></span>
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

        <p class="g-hint"><kbd>1</kbd> <kbd>2</kbd> or <kbd>←</kbd> <kbd>→</kbd> to answer</p>
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

        this.engine.recordAnswer(isCorrect, cur);
        this.syncProgress();

        this.later(() => { this.idx++; this.render(); }, isCorrect ? 220 : 480);
      };
    });
  },

  cleanup() {
    this.active = false;
    clearInterval(this.timer);
    if (this._timers) { this._timers.forEach(clearTimeout); this._timers.clear(); }
    if (this._onKey) { document.removeEventListener('keydown', this._onKey); this._onKey = null; }
    const timerPill = document.getElementById('timer-pill');
    if (timerPill) {
      timerPill.style.display = 'none';
      timerPill.classList.remove('hot');
    }
  }
});