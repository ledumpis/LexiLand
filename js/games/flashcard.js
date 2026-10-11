EGL_Engine.register({
  id: 'flashcard',
  name: 'Flashcard Challenge',
  icon: '🃏',
  description: 'Thẻ từ vựng Quizlet lật 3D hai mặt kèm phát âm và ví dụ.',

  init(container, { words, engine }) {
    this.container = container;
    this.words = words;
    this.engine = engine;
    this.idx = 0;
    this.locked = false;
    this.active = true;
    this._timers = new Set();

    // Space / Enter flips, ← still learning, → got it
    this._onKey = (e) => {
      if (!this.active || this.locked) return;
      const t = e.target;
      if (t && t.closest && t.closest('input, textarea, select, button')) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.flip(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); this.rate(false); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this.rate(true); }
    };
    document.addEventListener('keydown', this._onKey);
    this._langHandler = () => { if (this.active && !this.locked) this.render(); };
    document.addEventListener('egl:language-change', this._langHandler);

    this.render();
  },

  later(fn, ms) {
    const t = setTimeout(() => { this._timers.delete(t); if (this.active) fn(); }, ms);
    this._timers.add(t);
  },

  render() {
    const total = this.words.length;
    if (this.idx >= total) {
      this.engine.setProgress(total, total);
      return this.engine.endSession();
    }

    const cur = this.words[this.idx];
    const esc = EGL_Utils.escapeHtml;
    const icons = EGL_Utils.icons;
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    this.locked = false;
    this.engine.setProgress(this.idx, total, `${this.idx + 1} / ${total}`);

    const sub = [cur.type, cur.phonetic].filter(Boolean).map(esc).join(' · ');
    const example = cur.example
      ? `<div class="fc-example">&ldquo;${esc(cur.example)}&rdquo;${cur.example_vi ? `<small>${esc(cur.example_vi)}</small>` : ''}</div>`
      : '';

    this.container.innerHTML = `
      <div class="g-arena fc-arena g-anim">
        <p class="g-hint">${esc(tt('flashcard.hint'))}</p>

        <div class="fc-deck${this.idx === total - 1 ? ' is-last' : ''}">
          <div class="fc-card" id="fc-card" role="button" tabindex="0" aria-pressed="false" aria-label="${esc(tt('flashcard.aria', { word: cur.word }))}">
            <div class="fc-inner">
              <div class="fc-face fc-front">
                <span class="fc-corner">${esc(tt('flashcard.corner.front'))}</span>
                <span class="tag">${esc(cur.type || 'vocabulary')}</span>
                <h2 class="fc-word">${esc(cur.word)}</h2>
                <div class="fc-phonetic">${esc(cur.phonetic || '')}</div>
                <button class="icon-btn fc-speak" type="button" data-speak="${esc(cur.word)}" aria-label="${esc(tt('flashcard.pronounce', { word: cur.word }))}">${icons.speak}</button>
                <span class="fc-flip-hint">${esc(tt('flashcard.flipHint.front'))}</span>
              </div>
              <div class="fc-face fc-back">
                <span class="fc-corner">${esc(tt('flashcard.corner.back'))}</span>
                <h2 class="fc-meaning">${esc(cur.meaning)}</h2>
                ${sub ? `<div class="fc-sub">${sub}</div>` : ''}
                ${example}
                <span class="fc-flip-hint">${esc(tt('flashcard.flipHint.back'))}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="fc-actions">
          <button class="btn btn-secondary btn-lg" type="button" id="btn-fc-learning">${esc(tt('flashcard.btn.learning'))} <kbd>←</kbd></button>
          <button class="btn btn-primary btn-lg" type="button" id="btn-fc-mastered">${esc(tt('flashcard.btn.mastered'))} <kbd>→</kbd></button>
        </div>
      </div>
    `;

    const card = this.container.querySelector('#fc-card');
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-speak]')) return;
      this.flip();
    });

    this.container.querySelector('#btn-fc-learning').onclick = () => this.rate(false);
    this.container.querySelector('#btn-fc-mastered').onclick = () => this.rate(true);
  },

flip() {
  if (this.locked) return;

  const card = this.container.querySelector('#fc-card');
  const inner = card?.querySelector('.fc-inner');

  if (!card || !inner) return;

  const flipped = !card.classList.contains('flipped');

  card.classList.toggle('flipped', flipped);
  card.setAttribute('aria-pressed', flipped ? 'true' : 'false');

  // Force the 3D transform directly so the flip cannot be overridden.
  inner.style.transform = flipped
    ? 'rotateY(180deg)'
    : 'rotateY(0deg)';
},

  rate(isCorrect) {
    if (this.locked) return;
    this.locked = true;

    const cur = this.words[this.idx];
    this.engine.recordAnswer(isCorrect, cur);

    const card = this.container.querySelector('#fc-card');
    if (card) card.classList.add(isCorrect ? 'leave-right' : 'leave-left');

    this.later(() => {
      this.idx++;
      this.render();
    }, 280);
  },

  cleanup() {
    this.active = false;
    if (this._timers) { this._timers.forEach(clearTimeout); this._timers.clear(); }
    if (this._onKey) { document.removeEventListener('keydown', this._onKey); this._onKey = null; }
    if (this._langHandler) { document.removeEventListener('egl:language-change', this._langHandler); this._langHandler = null; }
  }
});
