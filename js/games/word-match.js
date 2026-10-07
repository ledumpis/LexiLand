EGL_Engine.register({
  id: 'word-match',
  name: 'Word Match',
  icon: '🔗',
  description: 'Ghép cặp từ tiếng Anh và nghĩa tiếng Việt bằng màu pastel đồng bộ.',

  init(container, { words, engine }) {
    this.container = container;
    this.engine = engine;
    this.activeWords = words.slice(0, 5);
    this.total = this.activeWords.length;
    this.matchedCount = 0;
    this.misses = 0;
    this.selectedEn = null;
    this.selectedVi = null;
    this.pairs = [];
    this.locked = false;
    this.active = true;
    this._timers = new Set();

    const esc = EGL_Utils.escapeHtml;
    const en = EGL_Utils.shuffle(this.activeWords.map((w, i) => ({ i, text: w.word })));
    const vi = EGL_Utils.shuffle(this.activeWords.map((w, i) => ({ i, text: w.meaning })));

    this.container.innerHTML = `
      <div class="g-arena wm-arena g-anim">
        <p class="g-hint" id="wm-hint">Tap an English word, then tap its Vietnamese meaning.</p>

        <div class="wm-board" id="wm-board">
          <svg class="wm-lines" id="wm-lines" aria-hidden="true"></svg>
          <div class="wm-col" id="col-en">
            <h4 class="wm-col-title">English</h4>
            ${en.map(item => `<button type="button" class="match-card" data-i="${item.i}" data-type="en">${esc(item.text)}</button>`).join('')}
          </div>
          <div class="wm-col" id="col-vi">
            <h4 class="wm-col-title">Tiếng Việt</h4>
            ${vi.map(item => `<button type="button" class="match-card" data-i="${item.i}" data-type="vi">${esc(item.text)}</button>`).join('')}
          </div>
        </div>

        <div class="wm-stats">
          <span>Pairs <strong id="wm-pairs">0 / ${this.total}</strong></span>
          <span>Misses <strong id="wm-miss">0</strong></span>
        </div>
      </div>
    `;

    this.hintEl = this.container.querySelector('#wm-hint');
    this.container.querySelectorAll('.match-card').forEach(card => {
      card.onclick = () => this.handleSelect(card);
    });

    this._onResize = () => this.drawLines(false);
    window.addEventListener('resize', this._onResize);

    this.engine.setProgress(0, this.total, `0 / ${this.total} pairs`);
  },

  later(fn, ms) {
    const t = setTimeout(() => { this._timers.delete(t); if (this.active) fn(); }, ms);
    this._timers.add(t);
  },

  setHint(text, state) {
    if (!this.hintEl) return;
    this.hintEl.textContent = text;
    this.hintEl.classList.toggle('is-bad', state === 'bad');
    this.hintEl.classList.toggle('is-good', state === 'good');
  },

  updateHint() {
    if (this.selectedEn && !this.selectedVi) this.setHint('Now tap the matching meaning on the right.');
    else if (this.selectedVi && !this.selectedEn) this.setHint('Now tap the matching English word on the left.');
    else this.setHint('Tap an English word, then tap its Vietnamese meaning.');
  },

  handleSelect(card) {
    if (this.locked || card.classList.contains('is-matched')) return;

    const isEn = (card.dataset.type === 'en');
    const col = this.container.querySelector(isEn ? '#col-en' : '#col-vi');

    // Tapping the selected card again clears the selection
    if (card.classList.contains('card-selected')) {
      card.classList.remove('card-selected');
      if (isEn) this.selectedEn = null; else this.selectedVi = null;
      this.updateHint();
      return;
    }

    col.querySelectorAll('.match-card:not(.is-matched)').forEach(el => el.classList.remove('card-selected'));
    card.classList.add('card-selected');
    if (isEn) this.selectedEn = card; else this.selectedVi = card;

    if (this.selectedEn && this.selectedVi) this.resolve();
    else this.updateHint();
  },

  resolve() {
    const enEl = this.selectedEn;
    const viEl = this.selectedVi;
    const isMatch = (enEl.dataset.i === viEl.dataset.i);
    const rawWord = this.activeWords[Number(enEl.dataset.i)];

    this.engine.recordAnswer(isMatch, rawWord);
    this.selectedEn = null;
    this.selectedVi = null;

    if (isMatch) {
      const n = this.matchedCount;
      const cls = `pair-${n % 5}`;
      [enEl, viEl].forEach(el => {
        el.classList.remove('card-selected');
        el.classList.add('is-matched', cls);
        el.dataset.pair = String(n + 1);
      });
      this.pairs.push({ enEl, viEl, cls });
      this.matchedCount++;

      this.container.querySelector('#wm-pairs').textContent = `${this.matchedCount} / ${this.total}`;
      this.engine.setProgress(this.matchedCount, this.total, `${this.matchedCount} / ${this.total} pairs`);
      this.drawLines(true);

      if (this.matchedCount === this.total) {
        this.setHint('All pairs matched. Lovely work!', 'good');
        this.later(() => this.engine.endSession(), 900);
      } else {
        this.setHint('Matched! Keep going.', 'good');
        this.later(() => { if (!this.selectedEn && !this.selectedVi) this.updateHint(); }, 900);
      }
    } else {
      this.misses++;
      this.container.querySelector('#wm-miss').textContent = String(this.misses);
      this.locked = true;
      enEl.classList.add('card-wrong');
      viEl.classList.add('card-wrong');
      this.setHint('Not a match. Try again.', 'bad');

      this.later(() => {
        enEl.classList.remove('card-selected', 'card-wrong');
        viEl.classList.remove('card-selected', 'card-wrong');
        this.locked = false;
        this.updateHint();
      }, 520);
    }
  },

  drawLines(animateLast) {
    const board = this.container.querySelector('#wm-board');
    const svg = this.container.querySelector('#wm-lines');
    if (!board || !svg) return;

    const b = board.getBoundingClientRect();
    svg.innerHTML = this.pairs.map((p, n) => {
      const a = p.enEl.getBoundingClientRect();
      const c = p.viEl.getBoundingClientRect();
      const x1 = a.right - b.left;
      const y1 = a.top + a.height / 2 - b.top;
      const x2 = c.left - b.left;
      const y2 = c.top + c.height / 2 - b.top;
      const mid = (x2 - x1) / 2;
      const d = `M${x1.toFixed(1)} ${y1.toFixed(1)} C${(x1 + mid).toFixed(1)} ${y1.toFixed(1)} ${(x2 - mid).toFixed(1)} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      const len = Math.abs(x2 - x1) + Math.abs(y2 - y1) + 10;
      const isNew = animateLast && n === this.pairs.length - 1;
      return `<g class="${p.cls}"><path class="wm-line${isNew ? ' is-new' : ''}" d="${d}" style="--len:${len.toFixed(0)}"/></g>`;
    }).join('');
  },

  cleanup() {
    this.active = false;
    if (this._timers) { this._timers.forEach(clearTimeout); this._timers.clear(); }
    if (this._onResize) { window.removeEventListener('resize', this._onResize); this._onResize = null; }
  }
});