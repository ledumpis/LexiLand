EGL_Engine.register({
  id: 'survival',
  name: 'Word Bomb Survival',
  icon: '⏱️',
  description: 'Tháo gỡ quả bom từ vựng trước khi đồng hồ đếm ngược về 0.',

  init(container, { words, engine }) {
    this.container = container;
    this.words = words;
    this.engine = engine;
    this.lives = 3;
    this.idx = 0;
    this.fuseTime = 5000; // ms per round, shrinks as the game goes on
    this.locked = false;
    this.current = null;
    this.countdownInterval = null;
    this.active = true;
    this._timers = new Set();

    const livesPill = document.getElementById('lives-pill');
    if (livesPill) livesPill.style.display = 'flex';
    this.updateLivesDisplay();

    // Keys 1-4 pick the matching option
    this._onKey = (e) => {
      if (!this.active || this.locked) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && t.closest && t.closest('input, textarea, select')) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        const btn = this.container.querySelectorAll('.btn-bomb-option')[Number(e.key) - 1];
        if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
      }
    };
    document.addEventListener('keydown', this._onKey);

    this.nextRound();
  },

  later(fn, ms) {
    const t = setTimeout(() => { this._timers.delete(t); if (this.active) fn(); }, ms);
    this._timers.add(t);
  },

  updateLivesDisplay() {
    const el = document.getElementById('game-lives');
    if (!el) return;
    const heart = '<svg class="life LOST" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 5 6.4 5c2.1 0 3.8 1.2 5.6 3.2C13.8 6.2 15.5 5 17.6 5 21 5 23.1 8.3 21.6 11.7 19.5 16.4 12 21 12 21z"/></svg>';
    el.innerHTML = [0, 1, 2].map(i => heart.replace('LOST', i < this.lives ? '' : 'lost')).join('');
    el.setAttribute('aria-label', `${Math.max(0, this.lives)} lives left`);
  },

  nextRound() {
    if (!this.active) return;
    const total = this.words.length;

    if (this.lives <= 0 || this.idx >= total) {
      this.engine.setProgress(Math.min(this.idx, total), total);
      this.engine.endSession();
      return;
    }

    const esc = EGL_Utils.escapeHtml;
    const cur = this.words[this.idx];
    const opts = EGL_Utils.shuffle([cur, ...this.engine.getDistractors(cur, 3)]);
    this.current = { cur, opts };
    this.locked = false;
    this.engine.setProgress(this.idx, total, `Round ${this.idx + 1} / ${total}`);

    this.container.innerHTML = `
      <div class="g-arena sv-arena g-anim" id="sv-arena">
        <div class="sv-stage-card" id="bomb-card">
          <div class="sv-meta">
            <span>Round ${this.idx + 1} / ${total}</span>
            <span>Fuse ${(this.fuseTime / 1000).toFixed(1)}s</span>
          </div>

          <svg class="sv-bomb" viewBox="0 0 220 200" role="img" aria-label="A bomb with a burning fuse">
            <path class="sv-fuse" id="sv-fuse" d="M112 42 C112 24 136 28 144 14 S170 4 182 18"/>
            <circle class="sv-spark-glow" id="sv-spark-glow" r="10" cx="182" cy="18"/>
            <circle class="sv-spark" id="sv-spark" r="5" cx="182" cy="18"/>
            <rect class="sv-cap" x="97" y="38" width="30" height="20" rx="4"/>
            <circle class="sv-body" cx="110" cy="124" r="68"/>
            <ellipse class="sv-shine" cx="82" cy="98" rx="14" ry="22" transform="rotate(30 82 98)"/>
            <polygon class="sv-burst" points="206,122 183.4,141.7 193.1,170 163.7,175.7 158,205.1 129.7,195.4 110,218 90.3,195.4 62,205.1 56.3,175.7 26.9,170 36.6,141.7 14,122 36.6,102.3 26.9,74 56.3,68.3 62,38.9 90.3,48.6 110,26 129.7,48.6 158,38.9 163.7,68.3 193.1,74 183.4,102.3"/>
            <text class="sv-count" id="bomb-seconds" x="110" y="138" text-anchor="middle">05.0</text>
          </svg>

          <div class="sv-word">${esc(cur.word)}</div>
          <div class="sv-banner" id="sv-banner">Pick the right meaning to defuse it</div>
        </div>

        <div class="sv-grid">
          ${opts.map((o, i) => `<button type="button" class="btn-bomb-option" data-i="${i}"><span class="choice-num">${i + 1}</span><span class="choice-text">${esc(o.meaning)}</span></button>`).join('')}
        </div>
      </div>
    `;

    const arena = this.container.querySelector('#sv-arena');
    const fuse = this.container.querySelector('#sv-fuse');
    const spark = this.container.querySelector('#sv-spark');
    const glow = this.container.querySelector('#sv-spark-glow');
    const count = this.container.querySelector('#bomb-seconds');
    const L = fuse.getTotalLength();
    const startTime = Date.now();

    const tick = () => {
      const remaining = Math.max(0, this.fuseTime - (Date.now() - startTime));
      const pct = remaining / this.fuseTime;

      fuse.style.strokeDasharray = `${L * pct} ${L}`;
      const p = fuse.getPointAtLength(L * pct);
      spark.setAttribute('cx', p.x);
      spark.setAttribute('cy', p.y);
      glow.setAttribute('cx', p.x);
      glow.setAttribute('cy', p.y);
      count.textContent = (remaining / 1000).toFixed(1).padStart(4, '0');

      if (remaining <= 1800) {
        arena.classList.add('is-danger');
        const banner = this.container.querySelector('#sv-banner');
        if (banner) banner.textContent = 'Hurry, the fuse is almost out!';
      }
      if (remaining <= 0) this.resolve(-1);
    };

    tick();
    this.countdownInterval = setInterval(tick, 50);

    this.container.querySelectorAll('.btn-bomb-option').forEach(btn => {
      btn.onclick = () => this.resolve(Number(btn.dataset.i));
    });
  },

  resolve(pickedIndex) {
    if (this.locked || !this.current) return;
    this.locked = true;
    clearInterval(this.countdownInterval);

    const { cur, opts } = this.current;
    const timedOut = pickedIndex < 0;
    const isCorrect = !timedOut && opts[pickedIndex].word === cur.word;

    const arena = this.container.querySelector('#sv-arena');
    const count = this.container.querySelector('#bomb-seconds');
    const banner = this.container.querySelector('#sv-banner');
    arena.classList.remove('is-danger');
    arena.classList.add(isCorrect ? 'is-defused' : 'is-boom');
    count.textContent = isCorrect ? 'SAFE' : 'POP!';
    banner.textContent = isCorrect ? 'Defused!' : (timedOut ? "Time's up! You lost a life." : 'Wrong wire! You lost a life.');

    this.container.querySelectorAll('.btn-bomb-option').forEach((b, i) => {
      b.disabled = true;
      if (opts[i].word === cur.word) b.classList.add('choice-correct');
      else if (i === pickedIndex) b.classList.add('choice-wrong');
      else b.classList.add('is-dim');
    });

    if (!isCorrect) {
      this.lives--;
      this.updateLivesDisplay();
    }

    this.engine.recordAnswer(isCorrect, cur);
    this.idx++;
    this.fuseTime = Math.max(2200, this.fuseTime - 250); // progressively accelerates

    this.later(() => this.nextRound(), isCorrect ? 750 : 1400);
  },

  cleanup() {
    this.active = false;
    clearInterval(this.countdownInterval);
    if (this._timers) { this._timers.forEach(clearTimeout); this._timers.clear(); }
    if (this._onKey) { document.removeEventListener('keydown', this._onKey); this._onKey = null; }
    const livesPill = document.getElementById('lives-pill');
    if (livesPill) livesPill.style.display = 'none';
  }
});