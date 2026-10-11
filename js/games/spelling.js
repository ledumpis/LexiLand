EGL_Engine.register({
  id: 'spelling',
  name: 'Spelling Bee',
  icon: '🎧',
  description: 'Listen to native audio pronunciation and spell the term correctly.',

  init(container, { words, engine }) {
    this.container = container;
    this.words = words;
    this.engine = engine;
    this.idx = 0;
    this.active = true;
    this.answered = false;
    this.advanced = false;
    this._timers = new Set();
    this._langHandler = () => { if (this.active) this.patchLanguage(); };
    document.addEventListener('egl:language-change', this._langHandler);
    this.render();
  },

  later(fn, ms) {
    const t = setTimeout(() => { this._timers.delete(t); if (this.active) fn(); }, ms);
    this._timers.add(t);
  },

  patchLanguage() {
    if (!this.active || this.answered) return;
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;
    const inp = this.container.querySelector('#s-inp');
    if (inp) {
      inp.setAttribute('placeholder', tt('spelling.placeholder'));
      inp.setAttribute('aria-label', tt('spelling.aria.input'));
    }
    const play = this.container.querySelector('#btn-spk');
    if (play) play.setAttribute('aria-label', tt('spelling.aria.play'));
    const eyebrow = this.container.querySelector('.sp-card .g-eyebrow');
    if (eyebrow) eyebrow.textContent = tt('spelling.eyebrow');
    const meaning = this.container.querySelector('.sp-meaning');
    if (meaning && this._curMeaning) meaning.innerHTML = `${escPatch(tt('spelling.meaningLabel'))} <b>${this._curMeaning}</b>`;
    const checkBtn = this.container.querySelector('#btn-sp-check');
    if (checkBtn) checkBtn.textContent = tt('spelling.btn.check');
    const skipBtn = this.container.querySelector('#btn-sp-skip');
    if (skipBtn) skipBtn.textContent = tt('spelling.btn.skip');
    function escPatch(s) { return (typeof EGL_Utils !== 'undefined' && EGL_Utils.escapeHtml) ? EGL_Utils.escapeHtml(s) : s; }
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
    const letterCount = cur.word.replace(/\s+/g, '').length;
    this._curMeaning = esc(cur.meaning);
    this.answered = false;
    this.advanced = false;
    this.engine.setProgress(this.idx, total, `${this.idx + 1} / ${total}`);

    this.container.innerHTML = `
      <div class="g-arena sp-arena g-anim">
        <div class="g-card sp-card">
          <button class="sp-play" type="button" id="btn-spk" aria-label="${esc(tt('spelling.aria.play'))}">${icons.speak}</button>
          <span class="g-eyebrow">${esc(tt('spelling.eyebrow'))}</span>
          <div class="sp-meaning">${esc(tt('spelling.meaningLabel'))} <b>${esc(cur.meaning)}</b></div>
          <div class="g-phonetic">${tt('spelling.lettersHint', { count: letterCount })}${cur.type ? ` &middot; ${esc(cur.type)}` : ''}</div>
        </div>

        <input type="text" class="sp-input" id="s-inp" placeholder="${esc(tt('spelling.placeholder'))}"
               autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="${esc(tt('spelling.aria.input'))}">

        <div class="sp-actions">
          <button class="btn btn-primary btn-lg" type="button" id="btn-sp-check">${esc(tt('spelling.btn.check'))}</button>
          <button class="btn btn-ghost" type="button" id="btn-sp-skip">${esc(tt('spelling.btn.skip'))}</button>
        </div>

        <div class="g-foot" id="s-fb"></div>
      </div>
    `;

    const inp = this.container.querySelector('#s-inp');
    const play = this.container.querySelector('#btn-spk');
    const checkBtn = this.container.querySelector('#btn-sp-check');
    const skipBtn = this.container.querySelector('#btn-sp-skip');
    const foot = this.container.querySelector('#s-fb');

    const speakNow = () => {
      EGL_Utils.speak(cur.word);
      play.classList.add('is-playing');
      this.later(() => play.classList.remove('is-playing'), 1300);
    };
    play.onclick = speakNow;
    speakNow();

    const check = (giveUp) => {
      if (this.answered) return;
      const val = inp.value.trim().toLowerCase();
      if (!val && !giveUp) return;

      this.answered = true;
      const isCorrect = !giveUp && val === cur.word.toLowerCase();
      inp.disabled = true;
      checkBtn.disabled = true;
      skipBtn.disabled = true;
      inp.classList.add(isCorrect ? 'is-ok' : 'is-bad');

      this.engine.recordAnswer(isCorrect, cur);
      this.feedback(foot, isCorrect, giveUp, cur);
    };

    checkBtn.onclick = () => check(false);
    skipBtn.onclick = () => check(true);
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); check(false); }
    };

    inp.focus();
  },

  feedback(foot, isCorrect, giveUp, cur) {
    const icons = EGL_Utils.icons;
    const esc = EGL_Utils.escapeHtml;
    const i18n = (typeof EGL_I18n !== 'undefined') ? EGL_I18n : null;
    const tt = (k, p) => i18n ? i18n.t(k, p) : k;

    if (isCorrect) {
      foot.innerHTML = `
        <div class="g-feedback is-ok">${icons.check}
          <div class="g-feedback-text"><strong>${esc(tt('spelling.feedback.correctTitle'))}</strong><span>${esc(cur.word)}</span></div>
        </div>`;
      this.later(() => this.next(), 1000);
    } else {
      const titleKey = giveUp ? 'spelling.feedback.giveUpTitle' : 'spelling.feedback.wrongTitle';
      foot.innerHTML = `
        <div class="g-feedback is-bad">${icons.cross}
          <div class="g-feedback-text"><strong>${esc(tt(titleKey))}</strong><span>${tt('spelling.feedback.theWordIs', { word: esc(cur.word) })}</span></div>
          <button class="icon-btn" type="button" data-speak="${esc(cur.word)}" aria-label="${esc(tt('spelling.pronounce', { word: cur.word }))}">${icons.speak}</button>
          <button class="btn btn-primary" type="button" id="btn-sp-next">${esc(tt('spelling.btn.continue'))} ${icons.arrow}</button>
        </div>`;
      const nextBtn = foot.querySelector('#btn-sp-next');
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
