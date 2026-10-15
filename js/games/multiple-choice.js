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
    // Smart Retry: missed words resurface after a few others (no new questions).
    this.retry = (typeof EGL_Retry !== 'undefined') ? EGL_Retry.create({ gap: 4, maxRetries: 2 }) : null;
    this.retryEntry = null;
    this.isRetry = false;
    // Phase 2E-1: re-render chrome on language change without resetting progress.
    // NOTE: render(true) reshuffles options; on a retry question the word stays
    // the same (isRetry/retryEntry preserved), so no progress is lost.
    this._langHandler = () => { if (this.active && !this.advanced) this.render(true); };
    document.addEventListener('egl:language-change', this._langHandler);
    this.render();
  },

  later(fn, ms) {
    const t = setTimeout(() => { this._timers.delete(t); if (this.active) fn(); }, ms);
    this._timers.add(t);
  },

  // Next item: due retry first (after gap), else next unseen word.
  // Returns false when the round is over.
  advance() {
    if (this.advanced) return false;
    this.advanced = true;
    const remaining = this.words.length - (this.idx + 1);
    const dueKey = this.retry ? this.retry.due(Math.max(0, remaining)) : null;
    if (dueKey) {
      const entry = this.retry.takeDue(dueKey);
      const w = this.words.find(x => x.word === dueKey);
      if (w && entry) {
        this.retryEntry = entry;
        this.isRetry = true;
        this.render();
        return true;
      }
    }
    this.retryEntry = null;
    this.isRetry = false;
    this.idx++;
    this.render();
    return true;
  },

  render(preserveAnswer) {
    const total = this.words.length;
    // Retry items reuse renderQuestion; the tail case below only handles
    // retries pending after all unseen words are done.
    if (this.idx >= total) {
      if (this.retry && this.retry.pending.length) {
        const dueKey = this.retry.due(0);
        if (dueKey) {
          const entry = this.retry.takeDue(dueKey);
          const w = this.words.find(x => x.word === dueKey);
          if (w && entry) {
            this.retryEntry = entry;
            this.isRetry = true;
            this.renderQuestion(w);
            return;
          }
        }
      }
      this.engine.setProgress(total, total);
      return this.engine.endSession();
    }

    const cur = this.isRetry && this.retryEntry
      ? this.words.find(x => x.word === this.retryEntry.key) || this.words[this.idx]
      : this.words[this.idx];
    this.renderQuestion(cur, preserveAnswer);
  },

  // Single question render shared by new words and retries.
  // Options are always reshuffled, so retry answers move positions.
  renderQuestion(cur, preserveAnswer) {
    const total = this.words.length;
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

        this.answerCurrent(isCorrect, cur);
        this.feedback(foot, isCorrect, cur);
      };
    });
    // Store opts for potential language-change re-render that shuffles — keep current opts stable via closure
    this._currentOpts = opts;
    this._currentCur = cur;
  },

  // Records the answer with retry-aware scoring, then schedules/fixes retries.
  // First-try answers use the normal engine path (full score/combo/mastery).
  // Retry answers still update mastery via the engine, but score/combo are
  // restored so a fix does not farm points like a new question.
  answerCurrent(isCorrect, cur) {
    const s = this.engine.activeSession;
    if (!this.retry || !this.isRetry) {
      if (!isCorrect && this.retry) this.retry.schedule(cur.word);
      else if (this.retry) this.retry.noteFirstTryCorrect();
      this.engine.recordAnswer(isCorrect, cur);
      if (!isCorrect && this.retry) this.retryNote(cur);
      return;
    }
    const prevScore = s ? s.score : 0;
    const prevCombo = s ? s.combo : 0;
    this.engine.recordAnswer(isCorrect, cur);
    if (s) { s.score = prevScore; s.combo = isCorrect ? prevCombo : 0; this.engine.updateStatsUI(); }
    this.retry.resolve(cur.word, isCorrect, this.retryEntry);
    if (isCorrect) this.retryToast('retry.toast.fixed');
    else this.retryNote(cur);
  },

  retryNote(cur) {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    if (i18n) EGL_Utils.toast(i18n.t('retry.toast.soon'));
  },

  retryToast(key) {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    if (i18n) EGL_Utils.toast(i18n.t(key));
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
      this.later(() => this.advance(), 900);
    } else {
      foot.innerHTML = `
        <div class="g-feedback is-bad">${icons.cross}
          <div class="g-feedback-text"><strong>${esc(tt('multipleChoice.feedback.wrongTitle'))}</strong><span>${detail}</span></div>
          <button class="btn btn-primary" type="button" id="btn-mc-next">${esc(tt('multipleChoice.btn.continue'))} ${icons.arrow}</button>
        </div>`;
      const nextBtn = foot.querySelector('#btn-mc-next');
      nextBtn.onclick = () => this.advance();
      this.later(() => nextBtn.focus(), 80);
    }
  },

  next() {
    // Back-compat alias (keyboard/tests may call next()).
    return this.advance();
  },

  cleanup() {
    this.active = false;
    if (this._timers) { this._timers.forEach(clearTimeout); this._timers.clear(); }
    if (this._langHandler) { document.removeEventListener('egl:language-change', this._langHandler); this._langHandler = null; }
  }
});
