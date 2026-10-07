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
    const target = String(cur.word);
    const chars = Array.from(target);
    const letterCount = chars.filter(c => c !== ' ').length;
    this.answered = false;
    this.advanced = false;
    this.engine.setProgress(this.idx, total, `${this.idx + 1} / ${total}`);

    const slotsHtml = chars.map((ch, i) =>
      ch === ' ' ? '<span class="ty-gap"></span>' : `<span class="ty-slot" data-i="${i}"></span>`
    ).join('');

    this.container.innerHTML = `
      <div class="g-arena ty-arena g-anim">
        <div class="g-card ty-card">
          <span class="tag tag-lav">${esc(cur.type || 'word')}</span>
          <div class="g-meaning ty-meaning">${esc(cur.meaning)}</div>
          <div class="g-phonetic">${esc(cur.phonetic || '')}</div>
        </div>

        <div class="ty-field" id="ty-field">
          <div class="ty-slots" aria-hidden="true">${slotsHtml}</div>
          <input type="text" class="ty-input" id="type-input-field" maxlength="${chars.length}"
                 autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
                 aria-label="Type the English word">
        </div>
        <p class="g-hint">${letterCount} letters &middot; press <kbd>Enter</kbd> to check</p>

        <div class="ty-actions">
          <button class="btn btn-primary btn-lg" type="button" id="btn-type-submit">Check</button>
          <button class="btn btn-ghost" type="button" id="btn-type-skip">I don't know</button>
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

    const paint = () => {
      const v = input.value;
      const cursorEl = this.answered ? null : slotEls.find(el => Number(el.dataset.i) >= v.length);
      slotEls.forEach(el => {
        const i = Number(el.dataset.i);
        const ch = v[i];
        const has = !!(ch && ch !== ' ');
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
      const val = input.value.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!val && !giveUp) return;

      this.answered = true;
      const isCorrect = !giveUp && val === target.toLowerCase();
      input.disabled = true;
      submit.disabled = true;
      skip.disabled = true;

      slotEls.forEach(el => {
        const i = Number(el.dataset.i);
        const typed = (input.value[i] || '').toLowerCase();
        el.classList.remove('is-cursor');
        el.classList.add(typed === chars[i].toLowerCase() ? 'is-ok' : 'is-bad');
      });

      this.engine.recordAnswer(isCorrect, cur);
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

  finish(foot, isCorrect, giveUp, cur) {
    const icons = EGL_Utils.icons;
    const esc = EGL_Utils.escapeHtml;

    if (isCorrect) {
      foot.innerHTML = `
        <div class="g-feedback is-ok">${icons.check}
          <div class="g-feedback-text"><strong>Correct!</strong><span>Well done.</span></div>
        </div>`;
      this.later(() => this.next(), 950);
    } else {
      foot.innerHTML = `
        <div class="g-feedback is-bad">${icons.cross}
          <div class="g-feedback-text"><strong>${giveUp ? 'No worries.' : 'Not quite.'}</strong><span>The word is <b>${esc(cur.word)}</b></span></div>
          <button class="icon-btn" type="button" data-speak="${esc(cur.word)}" aria-label="Pronounce ${esc(cur.word)}">${icons.speak}</button>
          <button class="btn btn-primary" type="button" id="btn-type-next">Continue ${icons.arrow}</button>
        </div>`;
      const nextBtn = foot.querySelector('#btn-type-next');
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