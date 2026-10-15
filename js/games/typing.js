EGL_Engine.register({
  id: 'typing',
  name: 'Typing Challenge',
  icon: '⌨️',
  description: 'Quan sát ý nghĩa tiếng Việt và gõ chính xác từ tiếng Anh.',

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
    this._langHandler = () => { if (this.active) this.patchLanguage(); };
    document.addEventListener('egl:language-change', this._langHandler);
    this.render();
  },

  later(fn, ms) {
    const t = setTimeout(() => { this._timers.delete(t); if (this.active) fn(); }, ms);
    this._timers.add(t);
  },

  patchLanguage() {
    if (!this.active) return;
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    const input = this.container.querySelector('#type-input-field');
    const hint = this.container.querySelector('#typing-hint');
    const submit = this.container.querySelector('#btn-type-submit');
    const skip = this.container.querySelector('#btn-type-skip');
    // Preserve typed value and cursor; only translate chrome
    if (input) input.setAttribute('aria-label', tt('typing.aria'));
    if (hint && this._curLetterCount != null && !this.answered) {
      hint.innerHTML = tt('typing.hint', { count: this._curLetterCount });
    }
    if (submit) submit.textContent = tt('typing.btn.check');
    if (skip) skip.textContent = tt('typing.btn.skip');
    // Feedback already shown stays as-is; next question will use new language
  },

  // Next item: due retry first (after gap), else next unseen word.
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

  render() {
    const total = this.words.length;
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
    this.renderQuestion(cur);
  },

  // Single question render shared by new words and retries (retype from scratch).
  renderQuestion(cur) {
    const total = this.words.length;
    const esc = EGL_Utils.escapeHtml;
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    const target = String(cur.word);
    const chars = Array.from(target);
    // Spaces are visual gaps, not tiles. The hint counts only letters the player types.
    const letters = chars.filter(c => c !== ' ');
    const letterCount = letters.length;
    this._curLetterCount = letterCount;
    this._letters = letters;
    this.answered = false;
    this.advanced = false;
    this.engine.setProgress(this.idx, total, `${this.idx + 1} / ${total}`);

    let letterIndex = 0;
    const slotsHtml = chars.map(ch => {
      if (ch === ' ') return '<span class="ty-gap"></span>';
      const html = `<span class="ty-slot" data-i="${letterIndex}"></span>`;
      letterIndex += 1;
      return html;
    }).join('');

    this.container.innerHTML = `
      <div class="g-arena ty-arena g-anim">
        <div class="g-card ty-card">
          <span class="tag tag-lav">${esc(cur.type || 'word')}</span>
          <div class="g-meaning ty-meaning">${esc(cur.meaning)}</div>
          <div class="g-phonetic">${esc(cur.phonetic || '')}</div>
        </div>

        <div class="ty-field" id="ty-field">
          <div class="ty-slots" aria-hidden="true">${slotsHtml}</div>
          <input type="text" class="ty-input" id="type-input-field" maxlength="${Math.max(letterCount * 3, target.length + 12)}"
                 autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
                 aria-label="${esc(tt('typing.aria'))}">
        </div>
        <p class="g-hint" id="typing-hint">${tt('typing.hint', { count: letterCount })}</p>

        <div class="ty-actions">
          <button class="btn btn-primary btn-lg" type="button" id="btn-type-submit">${esc(tt('typing.btn.check'))}</button>
          <button class="btn btn-ghost" type="button" id="btn-type-skip">${esc(tt('typing.btn.skip'))}</button>
        </div>

        <div class="g-foot" id="type-fb"></div>
      </div>
    `;

    const input = this.container.querySelector('#type-input-field');
    const field = this.container.querySelector('#ty-field');
    const slotEls = Array.from(this.container.querySelectorAll('.ty-slot'));
    const foot = this.container.querySelector('#type-fb');
    const submit = this.container.querySelector('#btn-type-submit');
    const skip = this.container.querySelector('#btn-type-skip');

    const typedLetters = () => input.value.replace(/\s+/g, '').slice(0, letterCount);

    const paint = () => {
      const compact = typedLetters();
      if (compact !== input.value) {
        const caret = input.selectionStart || 0;
        const before = input.value.slice(0, caret).replace(/\s+/g, '').length;
        input.value = compact;
        const next = Math.min(before, compact.length);
        if (input.setSelectionRange) input.setSelectionRange(next, next);
      }
      const v = input.value;
      const cursorEl = this.answered ? null : slotEls.find(el => Number(el.dataset.i) >= v.length);
      slotEls.forEach(el => {
        const i = Number(el.dataset.i);
        const ch = v[i];
        const has = !!ch;
        el.textContent = has ? ch : '';
        el.classList.toggle('filled', has);
        el.classList.toggle('is-cursor', el === cursorEl);
      });
    };

    input.addEventListener('input', paint);
    input.addEventListener('focus', () => field.classList.add('is-focus'));
    input.addEventListener('blur', () => field.classList.remove('is-focus'));

    const check = (giveUp) => {
      if (this.answered) return;
      const val = typedLetters();
      if (!val && !giveUp) return;

      this.answered = true;
      const isCorrect = !giveUp && this.answersMatch(val, target);
      input.disabled = true;
      submit.disabled = true;
      skip.disabled = true;

      slotEls.forEach(el => {
        const i = Number(el.dataset.i);
        const typed = (val[i] || '').toLowerCase();
        el.classList.remove('is-cursor');
        el.classList.add(typed && typed === letters[i].toLowerCase() ? 'is-ok' : 'is-bad');
      });

      this.answerCurrent(isCorrect, cur);
      this.finish(foot, isCorrect, giveUp, cur);
    };

    submit.onclick = () => check(false);
    skip.onclick = () => check(true);
    input.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); check(false); }
    };

    paint();
    input.focus();
  },

  // Retry-aware scoring: first-try uses the normal engine path;
  // retry fixes update mastery but restore score/combo (no point farming).
  answerCurrent(isCorrect, cur) {
    const s = this.engine.activeSession;
    if (!this.retry || !this.isRetry) {
      if (!isCorrect && this.retry) this.retry.schedule(cur.word);
      else if (this.retry) this.retry.noteFirstTryCorrect();
      this.engine.recordAnswer(isCorrect, cur);
      if (!isCorrect && this.retry) this.retryNote();
      return;
    }
    const prevScore = s ? s.score : 0;
    const prevCombo = s ? s.combo : 0;
    this.engine.recordAnswer(isCorrect, cur);
    if (s) { s.score = prevScore; s.combo = isCorrect ? prevCombo : 0; this.engine.updateStatsUI(); }
    this.retry.resolve(cur.word, isCorrect, this.retryEntry);
    if (isCorrect) this.retryToast('retry.toast.fixed');
    else this.retryNote();
  },

  retryNote() {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    if (i18n) EGL_Utils.toast(i18n.t('retry.toast.soon'));
  },

  retryToast(key) {
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    if (i18n) EGL_Utils.toast(i18n.t(key));
  },

  /** Spaces are not tiles. Case and extra spaces are not a different answer. Hyphens stay. */
  answersMatch(typed, expected) {
    const key = (value) => String(value == null ? '' : value).toLowerCase().replace(/\s+/g, '');
    const got = key(typed);
    return got.length > 0 && got === key(expected);
  },

  finish(foot, isCorrect, giveUp, cur) {
    const icons = EGL_Utils.icons;
    const esc = EGL_Utils.escapeHtml;
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;

    if (isCorrect) {
      foot.innerHTML = `
        <div class="g-feedback is-ok">${icons.check}
          <div class="g-feedback-text"><strong>${esc(tt('typing.feedback.correctTitle'))}</strong><span>${esc(tt('typing.feedback.correctSub'))}</span></div>
        </div>`;
      this.later(() => this.advance(), 950);
    } else {
      const titleKey = giveUp ? 'typing.feedback.giveUpTitle' : 'typing.feedback.wrongTitle';
      foot.innerHTML = `
        <div class="g-feedback is-bad">${icons.cross}
          <div class="g-feedback-text"><strong>${esc(tt(titleKey))}</strong><span>${tt('typing.feedback.theWordIs', { word: esc(cur.word) })}</span></div>
          <button class="icon-btn" type="button" data-speak="${esc(cur.word)}" aria-label="${esc(tt('typing.pronounce', { word: cur.word }))}">${icons.speak}</button>
          <button class="btn btn-primary" type="button" id="btn-type-next">${esc(tt('typing.btn.continue'))} ${icons.arrow}</button>
        </div>`;
      const nextBtn = foot.querySelector('#btn-type-next');
      nextBtn.onclick = () => this.advance();
      this.later(() => nextBtn.focus(), 80);
    }
  },

  next() {
    // Back-compat alias.
    return this.advance();
  },

  cleanup() {
    this.active = false;
    if (this._timers) { this._timers.forEach(clearTimeout); this._timers.clear(); }
    if (this._langHandler) { document.removeEventListener('egl:language-change', this._langHandler); this._langHandler = null; }
  }
});
