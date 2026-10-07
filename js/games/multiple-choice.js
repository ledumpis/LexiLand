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
    const opts = EGL_Utils.shuffle([cur, ...this.engine.getDistractors(cur, 3)]);
    this.answered = false;
    this.advanced = false;
    this.engine.setProgress(this.idx, total, `${this.idx + 1} / ${total}`);

    // .mc-choice-grid .btn-choice is also targeted by the 1-4 shortcut in app.js
    this.container.innerHTML = `
      <div class="g-arena mc-arena g-anim">
        <div class="g-card mc-question-card">
          <span class="g-eyebrow">What does this word mean?</span>
          <div class="g-word mc-target-word">${esc(cur.word)}</div>
          <div class="g-phonetic mc-phonetic-text">${esc(cur.phonetic || '')}</div>
          <button class="icon-btn g-speak" type="button" data-speak="${esc(cur.word)}" aria-label="Pronounce ${esc(cur.word)}">${icons.speak}</button>
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
  },

  feedback(foot, isCorrect, cur) {
    const icons = EGL_Utils.icons;
    const esc = EGL_Utils.escapeHtml;
    const detail = `${esc(cur.word)} means <b>${esc(cur.meaning)}</b>.`;

    if (isCorrect) {
      foot.innerHTML = `
        <div class="g-feedback is-ok">${icons.check}
          <div class="g-feedback-text"><strong>Correct!</strong><span>${detail}</span></div>
        </div>`;
      this.later(() => this.next(), 900);
    } else {
      foot.innerHTML = `
        <div class="g-feedback is-bad">${icons.cross}
          <div class="g-feedback-text"><strong>Not quite.</strong><span>${detail}</span></div>
          <button class="btn btn-primary" type="button" id="btn-mc-next">Continue ${icons.arrow}</button>
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
  }
});