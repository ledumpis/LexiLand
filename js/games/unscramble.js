EGL_Engine.register({
  id: 'unscramble',
  name: 'Unscramble',
  icon: '🔤',
  description: 'Sắp xếp các chữ cái xáo trộn thành từ tiếng Anh hoàn chỉnh.',

  init(container, { words, engine }) {
    this.container = container;
    this.words = words;
    this.engine = engine;
    this.idx = 0;
    this.state = null;
    this.active = true;
    this.advanced = false;
    this._timers = new Set();

    // Desktop shortcuts: type letters, Backspace removes the last, Enter checks
    this._onKey = (e) => {
      const s = this.state;
      if (!this.active || !s || s.done) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && t.closest && t.closest('input, textarea, select')) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        this.remove(s.placed.length - 1);
      } else if (e.key === 'Enter') {
        if (t && t.closest && t.closest('button')) return;
        e.preventDefault();
        this.check();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        const ch = e.key.toUpperCase();
        const ti = s.letters.findIndex((l, i) => l === ch && !s.placed.includes(i));
        if (ti >= 0) { e.preventDefault(); this.place(ti); }
      }
    };
    document.addEventListener('keydown', this._onKey);
    this._langHandler = () => { if (this.active) this.patchLanguage(); };
    document.addEventListener('egl:language-change', this._langHandler);

    this.render();
  },

  later(fn, ms) {
    const t = setTimeout(() => { this._timers.delete(t); if (this.active) fn(); }, ms);
    this._timers.add(t);
  },

  patchLanguage() {
    if (!this.active || !this.state) return;
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    const esc = (typeof EGL_Utils !== 'undefined' && EGL_Utils.escapeHtml) ? EGL_Utils.escapeHtml : (s => s);
    const eyebrow = this.container.querySelector('.un-clue .g-eyebrow');
    if (eyebrow) eyebrow.textContent = tt('unscramble.eyebrow');
    const typeHint = this.container.querySelector('.un-clue .g-phonetic');
    if (typeHint && this.state) {
      typeHint.innerHTML = tt('unscramble.hint.typeLetters', { type: esc(this.state.cur.type || 'word'), count: this.state.target.length });
    }
    const labels = this.container.querySelectorAll('.un-label');
    if (labels[0]) labels[0].textContent = tt('unscramble.label.yourWord');
    if (labels[1]) labels[1].textContent = tt('unscramble.label.tapLetters');
    const resetBtn = this.container.querySelector('#btn-u-reset');
    if (resetBtn) resetBtn.textContent = tt('unscramble.btn.reset');
    const checkBtn = this.container.querySelector('#btn-u-check');
    if (checkBtn) checkBtn.textContent = tt('unscramble.btn.check');
    // Feedback, if already shown, will be updated on next action; keep current selection
  },

  render() {
    const total = this.words.length;
    if (this.idx >= total) {
      this.engine.setProgress(total, total);
      return this.engine.endSession();
    }

    const cur = this.words[this.idx];
    const esc = EGL_Utils.escapeHtml;
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    const target = cur.word.replace(/\s+/g, '').toUpperCase();

    let letters = EGL_Utils.shuffle(target.split(''));
    if (target.length > 1) {
      for (let k = 0; k < 6 && letters.join('') === target; k++) letters = EGL_Utils.shuffle(target.split(''));
    }

    this.state = {
      cur, target, letters,
      layout: Array.from(cur.word.toUpperCase()),
      placed: [], done: false, result: null, last: -1
    };
    this.advanced = false;
    this.engine.setProgress(this.idx, total, `${this.idx + 1} / ${total}`);

    this.container.innerHTML = `
      <div class="g-arena un-arena g-anim">
        <div class="g-card un-clue">
          <span class="g-eyebrow">${esc(tt('unscramble.eyebrow'))}</span>
          <div class="g-meaning un-meaning">${esc(cur.meaning)}</div>
          <div class="g-phonetic">${esc(tt('unscramble.hint.typeLetters', { type: cur.type || 'word', count: target.length }))}</div>
        </div>

        <div>
          <div class="un-label">${esc(tt('unscramble.label.yourWord'))}</div>
          <div class="un-answer"><div class="un-slots" id="u-slots-area"></div></div>
        </div>

        <div>
          <div class="un-label">${esc(tt('unscramble.label.tapLetters'))}</div>
          <div class="un-pool" id="u-pool-area">
            ${letters.map((ch, i) => `<button type="button" class="un-tile" data-idx="${i}">${esc(ch)}</button>`).join('')}
          </div>
        </div>

        <div class="un-actions">
          <button class="btn btn-secondary" type="button" id="btn-u-reset">${esc(tt('unscramble.btn.reset'))}</button>
          <button class="btn btn-primary btn-lg" type="button" id="btn-u-check" disabled>${esc(tt('unscramble.btn.check'))}</button>
        </div>

        <div class="g-foot" id="un-foot"></div>
      </div>
    `;

    this.slotsEl = this.container.querySelector('#u-slots-area');
    this.poolTiles = Array.from(this.container.querySelectorAll('#u-pool-area .un-tile'));
    this.checkBtn = this.container.querySelector('#btn-u-check');
    this.foot = this.container.querySelector('#un-foot');

    this.poolTiles.forEach(tile => {
      tile.onclick = () => {
        tile.blur();
        this.place(Number(tile.dataset.idx));
      };
    });

    this.container.querySelector('#btn-u-reset').onclick = () => {
      const s = this.state;
      if (s.done) return;
      s.placed = [];
      s.last = -1;
      this.update();
    };
    this.checkBtn.onclick = () => this.check();

    this.update();
  },

  place(tileIdx) {
    const s = this.state;
    if (!s || s.done || s.placed.includes(tileIdx) || s.placed.length >= s.letters.length) return;
    s.placed.push(tileIdx);
    s.last = s.placed.length - 1;
    this.update();
  },

  remove(slotIdx) {
    const s = this.state;
    if (!s || s.done || slotIdx < 0 || slotIdx >= s.placed.length) return;
    s.placed.splice(slotIdx, 1);
    s.last = -1;
    this.update();
  },

  update() {
    const s = this.state;
    const esc = EGL_Utils.escapeHtml;
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    let k = 0;

    this.slotsEl.innerHTML = s.layout.map(ch => {
      if (/\s/.test(ch)) return '<span class="un-gap"></span>';
      const ti = s.placed[k];
      const filled = ti !== undefined;
      const stateCls = !s.done || !filled ? '' : (s.letters[ti] === s.target[k] ? ' is-ok' : ' is-bad');
      const html = filled
        ? `<button type="button" class="un-slot filled${k === s.last ? ' pop' : ''}${stateCls}" data-slot="${k}" aria-label="${esc(tt('unscramble.aria.remove', { letter: s.letters[ti] }))}">${esc(s.letters[ti])}</button>`
        : '<span class="un-slot"></span>';
      k++;
      return html;
    }).join('');

    this.slotsEl.querySelectorAll('button.un-slot').forEach(b => {
      b.onclick = () => this.remove(Number(b.dataset.slot));
    });

    this.poolTiles.forEach((tile, i) => {
      tile.classList.toggle('tile-used', s.placed.includes(i));
      tile.disabled = s.done;
    });

    this.checkBtn.disabled = s.done || s.placed.length !== s.letters.length;
  },

  check() {
    const s = this.state;
    if (!s || s.done || s.placed.length !== s.letters.length) return;

    s.done = true;
    const assembled = s.placed.map(i => s.letters[i]).join('');
    const isCorrect = (assembled === s.target);
    s.result = isCorrect;
    this.update();

    this.engine.recordAnswer(isCorrect, s.cur);
    this.feedback(isCorrect);
  },

  feedback(isCorrect) {
    const s = this.state;
    const icons = EGL_Utils.icons;
    const esc = EGL_Utils.escapeHtml;
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;

    if (isCorrect) {
      this.foot.innerHTML = `
        <div class="g-feedback is-ok">${icons.check}
          <div class="g-feedback-text"><strong>${esc(tt('unscramble.feedback.correctTitle'))}</strong><span>${tt('unscramble.feedback.detail', { word: esc(s.cur.word), meaning: esc(s.cur.meaning) })}</span></div>
        </div>`;
      this.later(() => this.next(), 1000);
    } else {
      this.foot.innerHTML = `
        <div class="g-feedback is-bad">${icons.cross}
          <div class="g-feedback-text"><strong>${esc(tt('unscramble.feedback.wrongTitle'))}</strong><span>${tt('unscramble.feedback.theWordIs', { word: esc(s.cur.word) })}</span></div>
          <button class="icon-btn" type="button" data-speak="${esc(s.cur.word)}" aria-label="${esc(tt('unscramble.pronounce', { word: s.cur.word }))}">${icons.speak}</button>
          <button class="btn btn-primary" type="button" id="btn-u-next">${esc(tt('unscramble.btn.continue'))} ${icons.arrow}</button>
        </div>`;
      const nextBtn = this.foot.querySelector('#btn-u-next');
      nextBtn.onclick = () => this.next();
      this.later(() => nextBtn.focus(), 80);
    }
  },

  next() {
    if (this.advanced) return;
    this.advanced = true;
    this.idx++;
    this.render();
  },

  cleanup() {
    this.active = false;
    if (this._timers) { this._timers.forEach(clearTimeout); this._timers.clear(); }
    if (this._onKey) { document.removeEventListener('keydown', this._onKey); this._onKey = null; }
    if (this._langHandler) { document.removeEventListener('egl:language-change', this._langHandler); this._langHandler = null; }
  }
});
