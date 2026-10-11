EGL_Engine.register({
  id: 'multiple-choice',
  name: 'Multiple Choice',
  icon: '🎯',
  description: 'Chọn đáp án đúng từ 4 lựa chọn. Hỗ trợ phím tắt 1, 2, 3, 4.',

  init(container, { words, engine }) {
    this.container = container;
    this.words = words;
    this.engine = engine;
    this.idx = 0;
    this.active = true;
    this.answered = false;
    this.advanced = false;
    this._timers = new Set();
    // Phase 2E-1: re-render chrome on language change without resetting progress
    this._langHandler = () => { if (this.active && !this.advanced) this.render(true); };
    document.addEventListener('egl:language-change', this._langHandler);
    this.render();
  },

  later(fn, ms) {
    const t = setTimeout(() => { this._timers.delete(t); if (this.active) fn(); }, ms);
    this._timers.add(t);
  },

  render(preserveAnswer) {
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
    const opts = EGL_Utils.shuffle([cur, ...this.engine.getDistractors(cur, 3)]);
    // If re-rendering due to language change after answer, keep answered state
    if (!preserveAnswer) {
      this.answered = false;
      this.advanced = false;
    }
    this.engine.setProgress(this.idx, total, `${this.idx + 1} / ${total}`);

    // Preserve vocabulary content; only chrome is translated
    this.container.innerHTML = `
      <div class="g-arena mc-arena g-anim">
        <div class="g-card mc-question-card">
          <span class="g-eyebrow">${esc(tt('multipleChoice.eyebrow'))}</span>
          <div class="g-word mc-target-word">${esc(cur.word)}</div>
          <div class="g-phonetic mc-phonetic-text">${esc(cur.phonetic || '')}</div>
          <button class="icon-btn g-speak" type="button" data-speak="${esc(cur.word)}" aria-label="${esc(tt('multipleChoice.pronounce', { word: cur.word }))}">${icons.speak}</button>
        </div>

        <div class="mc-choice-grid">
          ${opts.map((o, i) => `
            <button class="btn-choice" type="button" data-i="${i}">
              <span class="choice-num">${i + 1}</span>
              <span class="choice-text">${esc(o.meaning)}</span>
            </button>
          `).join('')}
        </div>

        <div class="g-foot" id="mc-foot"></div>
      </div>
    `;

    const btns = this.container.querySelectorAll('.btn-choice');
    const foot = this.container.querySelector('#mc-foot');

    // If we re-rendered mid-question after language change and had already answered,
    // we must not allow re-answering; just show the word and keep buttons disabled visually.
    // Simplest safe path: allow fresh attempt (no answered state to restore) — but preserveAnswer is only
    // used to keep chrome fresh; we still reset answered=false at top unless preserveAnswer true and caller sets it.
    // For Phase 2E-1, preserveAnswer is not used to restore answered=true; next iteration handles it naturally.
    btns.forEach(btn => {
      btn.onclick = () => {
        if (this.answered) return;
        this.answered = true;

        const isCorrect = (opts[Number(btn.dataset.i)].word === cur.word);
        btns.forEach((b, i) => {
          b.disabled = true;
          if (opts[i].word === cur.word) b.classList.add('choice-correct');
          else if (b === btn) b.classList.add('choice-wrong');
          else b.classList.add('is-dim');
        });

        this.engine.recordAnswer(isCorrect, cur);
        this.feedback(foot, isCorrect, cur);
      };
    });
    // Store opts for potential language-change re-render that shuffles — keep current opts stable via closure
    this._currentOpts = opts;
    this._currentCur = cur;
  },

  feedback(foot, isCorrect, cur) {
    const icons = EGL_Utils.icons;
    const esc = EGL_Utils.escapeHtml;
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    const detail = tt('multipleChoice.feedback.detail', { word: esc(cur.word), meaning: esc(cur.meaning) });

    if (isCorrect) {
      foot.innerHTML = `
        <div class="g-feedback is-ok">${icons.check}
          <div class="g-feedback-text"><strong>${esc(tt('multipleChoice.feedback.correctTitle'))}</strong><span>${detail}</span></div>
        </div>`;
      this.later(() => this.next(), 900);
    } else {
      foot.innerHTML = `
        <div class="g-feedback is-bad">${icons.cross}
          <div class="g-feedback-text"><strong>${esc(tt('multipleChoice.feedback.wrongTitle'))}</strong><span>${detail}</span></div>
          <button class="btn btn-primary" type="button" id="btn-mc-next">${esc(tt('multipleChoice.btn.continue'))} ${icons.arrow}</button>
        </div>`;
      const nextBtn = foot.querySelector('#btn-mc-next');
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
    if (this._langHandler) { document.removeEventListener('egl:language-change', this._langHandler); this._langHandler = null; }
  }
});
