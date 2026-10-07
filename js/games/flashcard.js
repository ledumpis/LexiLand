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
    this.locked = false;
    this.engine.setProgress(this.idx, total, `${this.idx + 1} / ${total}`);

    const sub = [cur.type, cur.phonetic].filter(Boolean).map(esc).join(' · ');
    const example = cur.example
      ? `<div class="fc-example">&ldquo;${esc(cur.example)}&rdquo;${cur.example_vi ? `<small>${esc(cur.example_vi)}</small>` : ''}</div>`
      : '';

    this.container.innerHTML = `
      <div class="g-arena fc-arena g-anim">
        <p class="g-hint">Tap the card to flip it, then rate how well you knew the word.</p>

        <div class="fc-deck${this.idx === total - 1 ? ' is-last' : ''}">
          <div class="fc-card" id="fc-card" role="button" tabindex="0" aria-pressed="false" aria-label="Flashcard: ${esc(cur.word)}. Press to flip.">
            <div class="fc-inner">
              <div class="fc-face fc-front">
                <span class="fc-corner">English</span>
                <span class="tag">${esc(cur.type || 'vocabulary')}</span>
                <h2 class="fc-word">${esc(cur.word)}</h2>
                <div class="fc-phonetic">${esc(cur.phonetic || '')}</div>
                <button class="icon-btn fc-speak" type="button" data-speak="${esc(cur.word)}" aria-label="Pronounce ${esc(cur.word)}">${icons.speak}</button>
                <span class="fc-flip-hint">Tap to flip</span>
              </div>
              <div class="fc-face fc-back">
                <span class="fc-corner">Meaning</span>
                <h2 class="fc-meaning">${esc(cur.meaning)}</h2>
                ${sub ? `<div class="fc-sub">${sub}</div>` : ''}
                ${example}
                <span class="fc-flip-hint">Tap to flip back</span>
              </div>
            </div>
          </div>
        </div>

        <div class="fc-actions">
          <button class="btn btn-secondary btn-lg" type="button" id="btn-fc-learning">Still learning <kbd>←</kbd></button>
          <button class="btn btn-primary btn-lg" type="button" id="btn-fc-mastered">I got this <kbd>→</kbd></button>
        </div>
      </div>
    `;

    const card = this.container.querySelector('#fc-card');
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-speak]')) return; // speak button is handled globally
      this.flip();
    });

    this.container.querySelector('#btn-fc-learning').onclick = () => this.rate(false);
    this.container.querySelector('#btn-fc-mastered').onclick = () => this.rate(true);
  },

  flip() {
    if (this.locked) return;
    const card = this.container.querySelector('#fc-card');
    if (!card) return;
    card.classList.toggle('flipped');
    card.setAttribute('aria-pressed', card.classList.contains('flipped') ? 'true' : 'false');
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
  }
});