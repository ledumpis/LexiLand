EGL_Engine.register({
  id: 'true-false',
  name: 'True or False',
  icon: '⚖️',
  description: 'Đánh giá nhanh tính chính xác giữa từ tiếng Anh và nghĩa hiển thị.',

  init(container, { words, engine }) {
    this.container = container;
    this.words = words;
    this.engine = engine;
    this.idx = 0;
    this.q = null;
    this.active = true;
    this.answered = false;
    this.advanced = false;
    this._timers = new Set();

    // T / ← = true, F / → = false
    this._onKey = (e) => {
      if (!this.active || this.answered) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && t.closest && t.closest('input, textarea, select')) return;
      const k = e.key.toLowerCase();
      if (k === 't' || e.key === 'ArrowLeft') { e.preventDefault(); this.answer(true); }
      else if (k === 'f' || e.key === 'ArrowRight') { e.preventDefault(); this.answer(false); }
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

    let isTrue = (Math.random() > 0.5);
    let shown = cur.meaning;
    if (!isTrue) {
      const d = this.engine.getDistractors(cur, 1)[0];
      if (d && d.meaning !== cur.meaning) shown = d.meaning;
      else isTrue = true; // no usable distractor, fall back to a true statement
    }

    this.q = { cur, isTrue, shown };
    this.answered = false;
    this.advanced = false;
    this.engine.setProgress(this.idx, total, `${this.idx + 1} / ${total}`);

    this.container.innerHTML = `
      <div class="g-arena tf-arena g-anim">
        <div class="g-card tf-card" id="tf-card">
          <span class="tf-stamp" id="tf-stamp" aria-hidden="true"></span>
          <span class="g-eyebrow">Is this statement correct?</span>
          <div class="g-word tf-word">${esc(cur.word)}</div>
          <button class="icon-btn g-speak" type="button" data-speak="${esc(cur.word)}" aria-label="Pronounce ${esc(cur.word)}">${icons.speak}</button>
          <div class="tf-means">means</div>
          <div class="g-meaning tf-meaning">${esc(shown)}</div>
        </div>

        <div class="tf-controls">
          <button class="tf-btn tf-btn-true" type="button" id="btn-tf-true">
            <span class="tf-btn-icon">${icons.check}</span>
            <span>TRUE</span>
            <kbd>T</kbd>
          </button>
          <button class="tf-btn tf-btn-false" type="button" id="btn-tf-false">
            <span class="tf-btn-icon">${icons.cross}</span>
            <span>FALSE</span>
            <kbd>F</kbd>
          </button>
        </div>

        <div class="g-foot" id="tf-foot"></div>
      </div>
    `;

    this.container.querySelector('#btn-tf-true').onclick = () => this.answer(true);
    this.container.querySelector('#btn-tf-false').onclick = () => this.answer(false);
  },

  answer(userChoice) {
    if (this.answered || !this.q) return;
    this.answered = true;

    const { cur, isTrue, shown } = this.q;
    const isCorrect = (userChoice === isTrue);
    const icons = EGL_Utils.icons;
    const esc = EGL_Utils.escapeHtml;

    const card = this.container.querySelector('#tf-card');
    card.classList.add(isCorrect ? 'is-ok' : 'is-bad');
    this.container.querySelector('#tf-stamp').textContent = isCorrect ? 'Correct' : 'Not quite';

    const btnTrue = this.container.querySelector('#btn-tf-true');
    const btnFalse = this.container.querySelector('#btn-tf-false');
    const picked = userChoice ? btnTrue : btnFalse;
    const other = userChoice ? btnFalse : btnTrue;
    btnTrue.disabled = true;
    btnFalse.disabled = true;
    picked.classList.add('is-picked');
    other.classList.add('is-dim');

    this.engine.recordAnswer(isCorrect, cur);

    const foot = this.container.querySelector('#tf-foot');
    const detail = isTrue
      ? `&ldquo;${esc(cur.word)}&rdquo; does mean &ldquo;${esc(cur.meaning)}&rdquo;.`
      : `&ldquo;${esc(cur.word)}&rdquo; means &ldquo;${esc(cur.meaning)}&rdquo;, not &ldquo;${esc(shown)}&rdquo;.`;

    if (isCorrect) {
      foot.innerHTML = `
        <div class="g-feedback is-ok">${icons.check}
          <div class="g-feedback-text"><strong>Correct!</strong><span>${detail}</span></div>
        </div>`;
      this.later(() => this.next(), 1000);
    } else {
      foot.innerHTML = `
        <div class="g-feedback is-bad">${icons.cross}
          <div class="g-feedback-text"><strong>Not quite.</strong><span>${detail}</span></div>
          <button class="btn btn-primary" type="button" id="btn-tf-next">Continue ${icons.arrow}</button>
        </div>`;
      const nextBtn = foot.querySelector('#btn-tf-next');
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
  }
});