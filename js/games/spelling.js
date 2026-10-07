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
    const letterCount = cur.word.replace(/\s+/g, '').length;
    this.answered = false;
    this.advanced = false;
    this.engine.setProgress(this.idx, total, `${this.idx + 1} / ${total}`);

    this.container.innerHTML = `
      <div class="g-arena sp-arena g-anim">
        <div class="g-card sp-card">
          <button class="sp-play" type="button" id="btn-spk" aria-label="Listen again">${icons.speak}</button>
          <span class="g-eyebrow">Listen, then spell the word</span>
          <div class="sp-meaning">Meaning: <b>${esc(cur.meaning)}</b></div>
          <div class="g-phonetic">${letterCount} letters${cur.type ? ` &middot; ${esc(cur.type)}` : ''}</div>
        </div>

        <input type="text" class="sp-input" id="s-inp" placeholder="Spell the word..."
               autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Spell the word you hear">

        <div class="sp-actions">
          <button class="btn btn-primary btn-lg" type="button" id="btn-sp-check">Check</button>
          <button class="btn btn-ghost" type="button" id="btn-sp-skip">I don't know</button>
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

    if (isCorrect) {
      foot.innerHTML = `
        <div class="g-feedback is-ok">${icons.check}
          <div class="g-feedback-text"><strong>Awesome spelling!</strong><span>${esc(cur.word)}</span></div>
        </div>`;
      this.later(() => this.next(), 1000);
    } else {
      foot.innerHTML = `
        <div class="g-feedback is-bad">${icons.cross}
          <div class="g-feedback-text"><strong>${giveUp ? 'No worries.' : 'Not quite.'}</strong><span>The word is <b>${esc(cur.word)}</b></span></div>
          <button class="icon-btn" type="button" data-speak="${esc(cur.word)}" aria-label="Pronounce ${esc(cur.word)}">${icons.speak}</button>
          <button class="btn btn-primary" type="button" id="btn-sp-next">Continue ${icons.arrow}</button>
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
  }
});