EGL_Engine.register({
  id: 'memory',
  name: 'Memory Cards',
  icon: '🧩',
  description: 'Lật tìm các cặp thẻ bài tương ứng giữa từ vựng và định nghĩa.',

  init(container, { words, engine }) {
    this.container = container;
    this.engine = engine;

    const selected = words.slice(0, 6);
    this.cards = EGL_Utils.shuffle([
      ...selected.map((w, i) => ({ pair: i, lang: 'en', text: w.word, raw: w })),
      ...selected.map((w, i) => ({ pair: i, lang: 'vi', text: w.meaning, raw: w }))
    ]);
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.totalPairs = selected.length;
    this.isLocked = false;
    this.active = true;
    this._timers = new Set();

    this.render();
  },

  later(fn, ms) {
    const t = setTimeout(() => { this._timers.delete(t); if (this.active) fn(); }, ms);
    this._timers.add(t);
  },

  render() {
    const esc = EGL_Utils.escapeHtml;

    this.container.innerHTML = `
      <div class="g-arena mem-arena g-anim">
        <p class="g-hint">Find the two matching cards: an English word and its meaning.</p>

        <div class="mem-stats">
          <span>Pairs <strong id="mem-pairs">${this.matchedPairs} / ${this.totalPairs}</strong></span>
          <span>Moves <strong id="mem-moves">${this.moves}</strong></span>
        </div>

        <div class="mem-grid">
          ${this.cards.map((c, i) => `
            <div class="mem-card" role="button" tabindex="0" data-index="${i}" aria-label="Hidden card ${i + 1}">
              <div class="mem-inner">
                <div class="mem-face mem-back"><span class="mem-mark">L</span></div>
                <div class="mem-face mem-front mem-${c.lang}">
                  <small>${c.lang === 'en' ? 'EN' : 'VI'}</small>
                  <b>${esc(c.text)}</b>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.container.querySelectorAll('.mem-card').forEach(tile => {
      tile.onclick = () => this.handleFlip(tile);
      tile.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.handleFlip(tile); }
      };
    });

    this.engine.setProgress(this.matchedPairs, this.totalPairs, `${this.matchedPairs} / ${this.totalPairs} pairs`);
  },

  handleFlip(tile) {
    if (this.isLocked) return;
    if (tile.classList.contains('is-open') || tile.classList.contains('is-matched')) return;

    tile.classList.add('is-open');
    this.flippedCards.push(tile);
    if (this.flippedCards.length < 2) return;

    this.moves++;
    this.container.querySelector('#mem-moves').textContent = String(this.moves);

    const [c1, c2] = this.flippedCards;
    const a = this.cards[Number(c1.dataset.index)];
    const b = this.cards[Number(c2.dataset.index)];
    const isMatch = (a.pair === b.pair && a.lang !== b.lang);

    this.engine.recordAnswer(isMatch, a.raw);

    if (isMatch) {
      c1.classList.add('is-matched');
      c2.classList.add('is-matched');
      this.matchedPairs++;
      this.flippedCards = [];
      this.container.querySelector('#mem-pairs').textContent = `${this.matchedPairs} / ${this.totalPairs}`;
      this.engine.setProgress(this.matchedPairs, this.totalPairs, `${this.matchedPairs} / ${this.totalPairs} pairs`);

      if (this.matchedPairs === this.totalPairs) {
        this.later(() => this.engine.endSession(), 800);
      }
    } else {
      this.isLocked = true;
      c1.classList.add('is-wrong');
      c2.classList.add('is-wrong');
      this.later(() => {
        c1.classList.remove('is-open', 'is-wrong');
        c2.classList.remove('is-open', 'is-wrong');
        this.flippedCards = [];
        this.isLocked = false;
      }, 900);
    }
  },

  cleanup() {
    this.active = false;
    if (this._timers) { this._timers.forEach(clearTimeout); this._timers.clear(); }
  }
});